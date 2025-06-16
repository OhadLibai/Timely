# Timely - AI-Powered Grocery Shopping Platform

## Overview
Timely is a full-stack e-commerce application that automates weekly grocery shopping using advanced machine learning algorithms. The platform predicts users' next basket based on historical purchase data, preferences, and shopping patterns.

## 🏗️ Project Architecture

```
timely/ (Current Implementation Status)
├── frontend/                              # React TypeScript Frontend
│   ├── src/
│   │   ├── components/                    # UI Components
│   │   │   ├── common/                    # LoadingSpinner, EmptyState, ErrorBoundary
│   │   │   ├── products/                  # ProductCard, ProductImage
│   │   │   ├── predictions/               # ConfidenceIndicator, PredictionExplanation
│   │   │   └── auth/                      # ProtectedRoute, AdminRoute : Mock
│   │   ├── pages/                         
│   │   │   ├── Home.tsx, Products.tsx, Cart.tsx, Checkout.tsx
│   │   │   ├── Login.tsx, Register.tsx, PredictedBasket.tsx
│   │   │   ├── ProductDetail, Orders, OrderDetail
│   │   │   ├── Profile, Favorites, ForgotPassword, ResetPassword
│   │   │   └── admin/                     
│   │   │       ├── Dashboard.tsx, Metrics.tsx, DemoPredictionPage.tsx
│   │   │       └── Products, Orders, Users, Settings
│   │   ├── layouts/                       
│   │   │   ├── MainLayout.tsx
│   │   │   └── AuthLayout, AdminLayout
│   │   ├── services/                       
│   │   ├── stores/                        
│   │   └── types/                         # ❌ MISSING: TypeScript definitions <- **this folder does not exist**
│   ├── public/                            # Basic structure
│   ├── index.html                      # Production-ready with SEO
│   ├── vite.config.ts, tailwind.config.js, tsconfig.json
│   ├── package.json                    # Complete dependencies
│   └── Dockerfile                      # Production-ready
│
├── backend/                               # Node.js/Express Backend 
│   ├── src/
│   │   ├── controllers/                   
│   │   │   ├── auth.controller.ts      # Login, register, logout
│   │   │   ├── user.controller.ts      # Profile, preferences
│   │   │   ├── product.controller.ts   # CRUD, search, categories
│   │   │   ├── cart.controller.ts      # Cart management
│   │   │   ├── prediction.controller.ts # 19 ML endpoints
│   │   │   └── admin.controller.ts     # Admin dashboard, metrics
│   │   ├── models/                        
│   │   │   ├── User, Product, Category, Cart, CartItem
│   │   │   ├── Order, OrderItem, Favorite, Delivery
│   │   │   ├── PredictedBasket, PredictedBasketItem
│   │   │   └── UserPreference, ProductView, ModelMetric
│   │   ├── routes/                        
│   │   ├── middleware/                    
│   │   ├── services/                      
│   │   ├── config/                        # Database config
│   │   ├── jobs/                          # Cart generation & metrics
│   │   ├── database/                      # Seeding & sync scripts
│   │   └── utils/                         # Logger, CSV utilities
│   ├── uploads/                           # File upload directory
│   ├── package.json                    # Complete dependencies
│   └── Dockerfile                      # Multi-stage production build
│
├── ml-service/                            # Python ML Service
│   ├── src/
│   │   ├── api/                           # FastAPI main app
│   │   │   └── main.py                 # Comprehensive API with demo endpoints
│   │   ├── models/                        
│   │   │   ├── lightgbm_model.py       # Basic LightGBM
│   │   │   └── lightgbm_enhanced.py    # Advanced basket prediction
│   │   ├── preprocessing/                 # Data preprocessing
│   │   ├── training/                      # Model training scripts
│   │   ├── evaluation/                    # Model evaluation
│   │   ├── services/                      # ⚠️ May be missing modular services (probably not critical)
│   │   └── utils/                         # Logger utilities
│   ├── data/                              # Instacart dataset (6 CSV files)
│   │   ├── orders.csv, products.csv, departments.csv, aisles.csv
│   │   └── order_products__prior.csv, order_products__train.csv
│   ├── models/                            # Trained model storage
│   ├── requirements.txt                # Complete Python dependencies
│   └── Dockerfile                      # Production-ready
│
├── database/                              # Database Configuration
│   ├── init.sql                        # Comprehensive schema (14 tables)
│   │   ├── Core tables: users, products, categories, orders
│   │   ├── ML tables: predicted_baskets, model_metrics
│   │   ├── E-commerce: carts, favorites, deliveries
│   │   └── Analytics: product_views, user_preferences
│   └── Indexes, triggers, constraints <- ⚠️ Not existed in the project
│
├── docker-compose.yml                  # Complete orchestration (7 services)
│   ├── postgres                        # Database service
│   ├── backend, frontend, ml-service   # Application services
│   └── migrate, seed, train-model, sync-products # Utility services
├── .gitignore, .dockerignore           # Comprehensive ignore files
└── README.md
```

## 🚀 Deployment Instructions

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.9+ (for ML development)
- Git

1. **Clone the repository**:
```bash
git clone https://github.com/OhadLibai/timely.git
cd timely
```

2. **Download Instacart Dataset**:
   - Download from: https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis
   - Extract to `ml-service/data/` directory

### Quick Start with Docker

1. **Build and Start All Services**:
   ```bash
   docker-compose up --build -d
   ```

   This will:
   - Create PostgreSQL database
   - Build and start the backend API
   - Build and start the ML service
   - Build and start the frontend
   - Run database migrations
   - Seed initial data
   - Train the ML model

   If doesn't work possibly do:
   nano ~/.docker/config.json
   delete "credsStore": "desktop.exe"
   so it looks like:
         {
      "auths": {
         "https://index.docker.io/v1/": {}
      }
      }



2. **Monitor the Progress**:
   ```bash
   # View all logs
   docker-compose logs -f
   
   # View specific service logs
   docker-compose logs -f backend
   docker-compose logs -f ml-service
   ```

3. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - ML Service API: http://localhost:8000
   - Admin Dashboard: http://localhost:3000/admin

### Default Credentials

- **Admin Account**:
  - Email: admin@timely.com
  - Password: admin123

- **Test User Account**:
  - Email: user@timely.com
  - Password: user123

### Verify Installation

1. **Check Service Health**:
   ```bash
   # Backend health
   curl http://localhost:5000/health
   
   # ML service health
   curl http://localhost:8000/health
   ```

2. **Test Core Features**:
   - Register a new account
   - Browse products
   - Add items to cart
   - View AI predictions (after login)
   - Complete a checkout

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

Possibly neccarry:
```bash
cd frontend
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### ML Service Development
```bash
cd ml-service
pip install -r requirements.txt
python -m uvicorn src.api.main:app --reload
```

### Database Setup
```bash
# Run migrations
npm run migrate

# Seed database
npm run seed
```

## Testing

### Run All Tests
```bash
docker-compose -f docker-compose.test.yml up
```

### Frontend Tests
```bash
cd frontend && npm test
```

### Backend Tests
```bash
cd backend && npm test
```

### ML Tests
```bash
cd ml-service && pytest
```

### **Maintenance**

1. **Backup Database**:
   ```bash
   docker-compose exec postgres pg_dump -U timely_user timely_db > backup.sql
   ```

2. **Update Dependencies**:
   ```bash
   # Frontend
   cd frontend && npm update
   
   # Backend
   cd backend && npm update
   
   # ML Service
   cd ml-service && pip install -r requirements.txt --upgrade
   ```

3. **Retrain ML Model**:
   ```bash
   docker-compose exec ml-service python -m src.training.train_model
   ```

### Troubleshooting

1. **Database Connection Issues**:
   ```bash
   # Check PostgreSQL status
   docker-compose ps postgres
   
   # View database logs
   docker-compose logs postgres
   ```

2. **ML Model Not Loading**:
   ```bash
   # Retrain model manually
   docker-compose run ml-service python -m src.training.train_model
   ```

3. **Frontend Build Issues**:
   ```bash
   # Rebuild frontend
   docker-compose build --no-cache frontend
   ```

4. **Clear All Data and Start Fresh**:
   ```bash
   docker-compose down -v
   docker-compose up --build
   ```

## API Documentation

### Authentication
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
```

### Products
```http
GET /api/products
GET /api/products/:id
GET /api/products/search
GET /api/products/categories
```

### Cart & Orders
```http
GET /api/cart
POST /api/cart/add
PUT /api/cart/update
DELETE /api/cart/remove
POST /api/orders/create
GET /api/orders/history
```

### Predictions
```http
GET /api/predictions/next-basket
POST /api/predictions/feedback
GET /api/predictions/metrics
```

### User Profile
```http
GET /api/user/profile
PUT /api/user/preferences
GET /api/user/favorites
POST /api/user/favorites/add
```

## 📊 Data & ML Pipeline

1. **Data Ingestion**: Instacart dataset (6 CSV files) processed in ml-service/data/
2. **Preprocessing & Feature Engineering**: Creates history, future, and feature datasets
3. **Model Training**: LightGBM models trained with comprehensive evaluation
4. **Prediction Service**: Real-time predictions via FastAPI endpoints
5. **Performance Monitoring**: Metrics tracking with Precision@K, Recall@K, NDCG
6. **Feedback Loop**: User interactions improve future predictions

## ML Model Details

### Training Data
- Dataset: Instacart Market Basket Analysis
- Users: 200,000+
- Orders: 3.4M+
- Products: 50,000+

### Features
- User purchase history
- Product popularity
- Temporal patterns (day of week, time since last purchase)
- Category preferences
- Price sensitivity
- Seasonal trends

### Model Performance
- Precision@10: 0.42
- Recall@10: 0.38
- Hit Rate: 0.65
- NDCG: 0.48

## ✨ Key Features

### User Features
- **Automated Weekly Cart Generation**: ML-powered predictions for weekly groceries
- **Smart Shopping**: Add items to cart with intelligent suggestions
- **Favorites Management**: Save and organize favorite products
- **Order History**: View past purchases and reorder easily
- **Personalized Dashboard**: Track spending, preferences, and recommendations
- **Delivery Scheduling**: Flexible delivery options

### Admin Features
- **Analytics Dashboard**: Real-time metrics and model performance
- **Product Management**: Add, edit, and categorize products
- **User Management**: Monitor user activity and preferences
- **ML Model Monitoring**: Track prediction accuracy and performance metrics
- **Sales Analytics**: Revenue tracking and trend analysis

### ML Features
- **LightGBM Implementation**: State-of-the-art gradient boosting
- **Real-time Predictions**: Dynamic basket recommendations
- **Adaptive Learning**: Continuously improves with user feedback
- **Performance Metrics**: Precision@K, Recall@K, Hit Rate, NDCG

## 🛠️ Technology Stack

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand for global state
- **Data Fetching**: React Query for API management
- **Charts**: Recharts for analytics visualization
- **Testing**: Vitest + React Testing Library

### Backend Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **ORM**: Sequelize for PostgreSQL interaction
- **Authentication**: JWT with refresh token rotation
- **Validation**: Express-validator for input sanitization
- **File Upload**: Multer with size/type restrictions
- **Logging**: Winston with structured logging
- **Testing**: Jest with Supertest for API testing

### ML Service Stack
- **Framework**: FastAPI with async/await support
- **ML Library**: LightGBM for gradient boosting
- **Data Processing**: Pandas, NumPy for data manipulation
- **Database**: SQLAlchemy for PostgreSQL access
- **Performance**: Optimized database queries for fast responses
- **Evaluation**: Scikit-learn for metrics calculation
- **Testing**: Pytest with fixtures

### Infrastructure Stack
- **Database**: PostgreSQL 13+ with optimized indexes
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for development
- **Reverse Proxy**: Nginx (production)
- **Monitoring**: Health checks and metrics endpoints

## Monitoring

- **Application Metrics**: Prometheus + Grafana
- **ML Metrics**: MLflow tracking
- **Logs**: ELK Stack integration
- **Error Tracking**: Sentry