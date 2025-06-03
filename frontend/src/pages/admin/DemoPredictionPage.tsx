// frontend/src/pages/admin/DemoPredictionsPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { adminService } from '../../services/admin.service'; // Needs to be updated
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProductImage from '../../components/products/ProductImage';

interface DemoProduct {
    id: string;
    name: string;
    imageUrl?: string;
    predictedQuantity?: number;
    confidenceScore?: number;
}

interface DemoData {
    userId: string;
    predictedBasket: DemoProduct[];
    trueFutureBasket: DemoProduct[];
}

// Add to adminService:
// async getDemoUserIds(): Promise<string[]> { return api.get('/admin/demo/user-ids'); }
// async getDemoUserPrediction(userId: string): Promise<DemoData> { return api.get(`/admin/demo/user-prediction/${userId}`); }


const DemoPredictionsPage: React.FC = () => {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const { data: demoUserIds, isLoading: isLoadingIds } = useQuery(
        'demoUserIds',
        adminService.getDemoUserIds
    );

    const { data: demoPredictionData, isLoading: isLoadingPrediction, refetch } = useQuery(
        ['demoUserPrediction', selectedUserId],
        () => adminService.getDemoUserPrediction(selectedUserId!),
        { enabled: !!selectedUserId }
    );

    useEffect(() => {
        if (demoUserIds && demoUserIds.length > 0 && !selectedUserId) {
            setSelectedUserId(demoUserIds[0]);
        }
    }, [demoUserIds, selectedUserId]);

    const renderProductList = (title: string, products: DemoProduct[], isPredicted = false) => (
        <div className="w-1/2 px-4">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{title}</h3>
            {products && products.length > 0 ? (
                <ul className="space-y-3">
                    {products.map((product) => (
                        <li key={product.id} className="flex items-center p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                            <ProductImage src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded mr-3" />
                            <div className="flex-grow">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{product.name}</p>
                                {isPredicted && product.predictedQuantity && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Qty: {product.predictedQuantity} (Confidence: {product.confidenceScore ? (product.confidenceScore * 100).toFixed(0) : 'N/A'}%)
                                    </p>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500 dark:text-gray-400">No items in this basket.</p>
            )}
        </div>
    );

    if (isLoadingIds) return <LoadingSpinner message="Loading demo users..." />;

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Next Basket Prediction Demo</h1>

            <div className="mb-6">
                <label htmlFor="demoUserSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Demo User:
                </label>
                <select
                    id="demoUserSelect"
                    value={selectedUserId || ''}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                    disabled={!demoUserIds || demoUserIds.length === 0}
                >
                    <option value="" disabled>-- Select User --</option>
                    {demoUserIds?.map(id => <option key={id} value={id}>User ID: {id}</option>)}
                </select>
            </div>

            {isLoadingPrediction && selectedUserId && <LoadingSpinner message={`Fetching prediction for User ${selectedUserId}...`} />}

            {demoPredictionData && !isLoadingPrediction && (
                <div className="flex -mx-4">
                    {renderProductList("AI Predicted Basket", demoPredictionData.predictedBasket, true)}
                    {renderProductList("Actual Next Basket (from Instacart Data)", demoPredictionData.trueFutureBasket)}
                </div>
            )}
             {!selectedUserId && demoUserIds && demoUserIds.length > 0 && (
                <p className="text-center text-gray-600 dark:text-gray-400">Please select a user to view the demo.</p>
            )}
             {demoUserIds && demoUserIds.length === 0 && !isLoadingIds && (
                <p className="text-center text-red-500 dark:text-red-400">No demo user IDs configured.</p>
            )}
        </div>
    );
};

export default DemoPredictionsPage;