import request from 'supertest';
import app from '../backend-server'; // Your main Express app instance
import { sequelize } from '../config/database';
import { User, UserRole } from '../models/user.model';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Mock the mlApiClient to avoid actual HTTP calls during these E2E tests
// This is crucial for isolating backend tests from ML service availability/correctness.
jest.mock('../services/ml.service', () => ({
    mlApiClient: {
        post: jest.fn(),
        get: jest.fn(),
    },
}));
import { mlApiClient } from '../services/ml.service'; // Import the mocked version

const mockedMlApiClient = mlApiClient as jest.Mocked<typeof mlApiClient>;

// Helper to generate admin token for testing
const generateTestAdminToken = (adminUser: User): string => {
    return jwt.sign(
        { userId: adminUser.id, email: adminUser.email, role: adminUser.role },
        process.env.JWT_SECRET!, // Ensure JWT_SECRET is loaded in test environment
        { expiresIn: '15min' }
    );
};

describe('Admin Demo Prediction Routes (/api/admin/demo)', () => {
    let adminUser: User;
    let adminToken: string;
    const DEMO_USER_IDS_FROM_CONTROLLER = ['1', '7', '13', '25', '31', '42', '55', '60', '78', '92']; // Must match AdminController

    beforeAll(async () => {
        // Fallback for JWT_SECRET if not in process.env for tests
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
        process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key';
        
        await sequelize.sync(); // Use sync (or migrations) for test DB setup

        [adminUser] = await User.findOrCreate({
            where: { email: 'adm_demo_test@timely.com', role: UserRole.ADMIN },
            defaults: {
                id: uuidv4(),
                email: 'adm_demo_test@timely.com',
                password: 'password123', // Will be hashed by model hook
                firstName: 'Admin',
                lastName: 'DemoTester',
                role: UserRole.ADMIN,
            },
        });
        adminToken = generateTestAdminToken(adminUser);

        // Seed some categories and products that demo might try to look up via SKU
        const [cat1] = await Category.findOrCreate({ where: { name: 'Test Demo Category' }, defaults: { id: uuidv4(), name: 'Test Demo Category'} });
        
        // Create products with SKUs that match what the demo controller would generate
        // for Instacart IDs 196 and 46149 (example IDs used in mocked ML response)
        await Product.findOrCreate({
            where: { sku: 'PROD-0000196' },
            defaults: {id: uuidv4(), sku: 'PROD-0000196', name: 'Demo Soda', price: 1.99, categoryId: cat1.id, stock:100, isActive: true }
        });
        await Product.findOrCreate({
            where: { sku: 'PROD-0046149' },
            defaults: {id: uuidv4(), sku: 'PROD-0046149', name: 'Demo Organic Strawberries', price: 4.99, categoryId: cat1.id, stock: 50, isActive: true }
        });
         await Product.findOrCreate({
            where: { sku: 'PROD-0027856'}, // For User 7
            defaults: {id: uuidv4(), sku: 'PROD-0027856', name: 'Demo Large Lemon', price: 0.79, categoryId: cat1.id, stock: 200, isActive: true }
        });
    });

    afterEach(() => {
        // Clear all mocks after each test
        mockedMlApiClient.post.mockClear();
        mockedMlApiClient.get.mockClear();
    });

    afterAll(async () => {
        await User.destroy({ where: { email: 'adm_demo_test@timely.com' } });
        await Product.destroy({where: {sku: ['PROD-0000196', 'PROD-0046149', 'PROD-0027856'] }});
        await Category.destroy({where: {name: 'Test Demo Category'}});
        await sequelize.close();
    });

    describe('GET /api/admin/demo/user-ids', () => {
        it('should require admin authentication', async () => {
            await request(app).get('/api/admin/demo/user-ids').expect(401);
        });

        it('should return an array of demo user IDs for admin', async () => {
            const response = await request(app)
                .get('/api/admin/demo/user-ids')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toEqual(DEMO_USER_IDS_FROM_CONTROLLER);
        });
    });

    describe('GET /api/admin/demo/user-prediction/:userId', () => {
        const testInstacartUserId = DEMO_USER_IDS_FROM_CONTROLLER[0]; // e.g., '1'

        beforeEach(() => {
            // Mock successful ML service responses
            mockedMlApiClient.post.mockResolvedValueOnce({ // For /predict/for-user-history
                data: {
                    predictions: [
                        { productId: 196, quantity: 2, score: 0.9 }, // Instacart ID for "Soda"
                        { productId: 99999, quantity: 1, score: 0.8 } // An unknown product ID
                    ],
                },
            });
            mockedMlApiClient.get.mockResolvedValueOnce({ // For /debug/user-future-basket
                data: {
                    user_id: parseInt(testInstacartUserId),
                    products: [46149, 196], // Instacart IDs for "Organic Strawberries", "Soda"
                },
            });
        });

        it('should require admin authentication', async () => {
            await request(app).get(`/api/admin/demo/user-prediction/${testInstacartUserId}`).expect(401);
        });

        it('should return predicted and true future baskets for a valid demo user ID', async () => {
            const response = await request(app)
                .get(`/api/admin/demo/user-prediction/${testInstacartUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('userId', testInstacartUserId);
            expect(response.body).toHaveProperty('predictedBasket');
            expect(response.body).toHaveProperty('trueFutureBasket');

            const { predictedBasket, trueFutureBasket } = response.body;
            expect(Array.isArray(predictedBasket)).toBe(true);
            expect(Array.isArray(trueFutureBasket)).toBe(true);

            // Check predicted basket items
            expect(predictedBasket.length).toBe(2);
            const predictedSoda = predictedBasket.find((p: any) => p.sku === 'PROD-0000196'); // SKU for Instacart ID 196
            expect(predictedSoda).toBeDefined();
            expect(predictedSoda.name).toBe('Demo Soda');
            expect(predictedSoda.predictedQuantity).toBe(2);
            expect(predictedSoda.confidenceScore).toBe(0.9);

            const unknownPredicted = predictedBasket.find((p: any) => p.name.includes('Unknown Product'));
            expect(unknownPredicted).toBeDefined();
            expect(unknownPredicted.sku).toBe('PROD-0099999');


            // Check true future basket items
            expect(trueFutureBasket.length).toBe(2);
            const trueSoda = trueFutureBasket.find((p: any) => p.sku === 'PROD-0000196');
            const trueStrawberries = trueFutureBasket.find((p: any) => p.sku === 'PROD-0046149');
            expect(trueSoda).toBeDefined();
            expect(trueSoda.name).toBe('Demo Soda');
            expect(trueStrawberries).toBeDefined();
            expect(trueStrawberries.name).toBe('Demo Organic Strawberries');

            // Verify ML client calls
            expect(mockedMlApiClient.post).toHaveBeenCalledWith('/predict/for-user-history', { user_id: testInstacartUserId });
            expect(mockedMlApiClient.get).toHaveBeenCalledWith(`/debug/user-future-basket/${testInstacartUserId}`);
        });

        it('should return 404 for a non-configured demo user ID', async () => {
            const invalidDemoUserId = '999999';
            await request(app)
                .get(`/api/admin/demo/user-prediction/${invalidDemoUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });

        it('should handle ML service errors gracefully for prediction call', async () => {
            mockedMlApiClient.post.mockRejectedValueOnce(new Error('ML service prediction failed'));
            // GET for future basket still needs a mock, or the test might hang/fail differently
             mockedMlApiClient.get.mockResolvedValueOnce({ 
                data: { user_id: parseInt(testInstacartUserId), products: [] }
            });


            const response = await request(app)
                .get(`/api/admin/demo/user-prediction/${testInstacartUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(500); // Or whatever your global error handler returns for next(error)
            
            expect(response.body).toHaveProperty('error');
        });
    });
});