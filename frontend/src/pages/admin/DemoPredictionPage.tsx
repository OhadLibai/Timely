// frontend/src/pages/admin/DemoPredictionPage.tsx
// FIXED: Proper handling of API response structure and types

import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { adminService, DemoUserPrediction, DemoUserIds } from '../../services/admin.service';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProductImage from '../../components/products/ProductImage';

interface DemoProduct {
    id: string;
    name: string;
    imageUrl?: string;
    price: number;
    category?: string;
    predictedQuantity?: number;
    confidenceScore?: number;
}

const DemoPredictionPage: React.FC = () => {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // FIXED: Proper handling of DemoUserIds response structure
    const { data: demoUserIdsResponse, isLoading: isLoadingIds, error: userIdsError } = useQuery(
        'demoUserIds',
        adminService.getDemoUserIds,
        {
            onError: (error) => {
                console.error('Failed to fetch demo user IDs:', error);
            }
        }
    );

    // Extract the actual user IDs array from the response
    const demoUserIds = demoUserIdsResponse?.userIds || [];

    // FIXED: Proper handling of DemoUserPrediction response
    const { 
        data: demoPredictionData, 
        isLoading: isLoadingPrediction, 
        error: predictionError,
        refetch 
    } = useQuery(
        ['demoUserPrediction', selectedUserId],
        () => adminService.getDemoUserPrediction(selectedUserId!),
        { 
            enabled: !!selectedUserId,
            onError: (error) => {
                console.error('Failed to fetch demo prediction:', error);
            }
        }
    );

    // Auto-select first user when data loads
    useEffect(() => {
        if (demoUserIds && demoUserIds.length > 0 && !selectedUserId) {
            setSelectedUserId(demoUserIds[0]);
        }
    }, [demoUserIds, selectedUserId]);

    const renderProductList = (title: string, products: DemoProduct[], isPredicted = false) => (
        <div className="w-1/2 px-4">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                {title}
            </h3>
            {products && products.length > 0 ? (
                <div className="space-y-3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
                        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                            <span>Total Items: <strong>{products.length}</strong></span>
                            {isPredicted && (
                                <span>AI Predictions</span>
                            )}
                        </div>
                    </div>
                    <ul className="space-y-3 max-h-96 overflow-y-auto">
                        {products.map((product) => (
                            <li key={product.id} className="flex items-center p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                <ProductImage 
                                    src={product.imageUrl} 
                                    alt={product.name} 
                                    className="w-12 h-12 rounded mr-3 flex-shrink-0" 
                                />
                                <div className="flex-grow min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate" title={product.name}>
                                        {product.name}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            ${product.price?.toFixed(2) || 'N/A'}
                                        </span>
                                        {product.category && (
                                            <span className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                                                {product.category}
                                            </span>
                                        )}
                                    </div>
                                    {isPredicted && (
                                        <div className="flex items-center justify-between mt-1">
                                            {product.predictedQuantity && (
                                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                                    Qty: {product.predictedQuantity}
                                                </span>
                                            )}
                                            {product.confidenceScore && (
                                                <span className="text-xs text-green-600 dark:text-green-400">
                                                    Confidence: {(product.confidenceScore * 100).toFixed(0)}%
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No items in this basket.</p>
                </div>
            )}
        </div>
    );

    // Handle loading states
    if (isLoadingIds) {
        return <LoadingSpinner message="Loading demo users..." />;
    }

    // Handle errors
    if (userIdsError) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <h3 className="text-red-800 dark:text-red-200 font-semibold">Error Loading Demo Users</h3>
                        <p className="text-red-600 dark:text-red-300 mt-1">
                            Failed to load demo user IDs. Please try refreshing the page.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                        Next Basket Prediction Demo
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Compare AI predictions with actual purchase data from Instacart users
                    </p>
                </div>

                {/* User Selection */}
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <label htmlFor="demoUserSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Demo User:
                    </label>
                    <div className="flex items-center gap-4">
                        <select
                            id="demoUserSelect"
                            value={selectedUserId || ''}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="flex-1 max-w-md p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!demoUserIds || demoUserIds.length === 0}
                        >
                            <option value="" disabled>-- Select User --</option>
                            {demoUserIds?.map(id => (
                                <option key={id} value={id}>
                                    User ID: {id}
                                </option>
                            ))}
                        </select>
                        
                        {demoUserIdsResponse && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {demoUserIdsResponse.count} demo users available
                            </div>
                        )}
                    </div>
                </div>

                {/* Loading State */}
                {isLoadingPrediction && selectedUserId && (
                    <LoadingSpinner message={`Fetching prediction for User ${selectedUserId}...`} />
                )}

                {/* Prediction Error */}
                {predictionError && selectedUserId && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <h3 className="text-red-800 dark:text-red-200 font-semibold">Error Loading Prediction</h3>
                        <p className="text-red-600 dark:text-red-300 mt-1">
                            Failed to load prediction for User {selectedUserId}. Please try again.
                        </p>
                        <button
                            onClick={() => refetch()}
                            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Results Display */}
                {demoPredictionData && !isLoadingPrediction && (
                    <div>
                        {/* Comparison Metrics */}
                        {demoPredictionData.comparisonMetrics && (
                            <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                                    Prediction Accuracy
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {demoPredictionData.comparisonMetrics.predictedCount}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Predicted Items</div>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {demoPredictionData.comparisonMetrics.actualCount}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Actual Items</div>
                                    </div>
                                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                            {demoPredictionData.comparisonMetrics.commonItems}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Correct Predictions</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Side-by-side Baskets */}
                        <div className="flex flex-col lg:flex-row gap-6">
                            {renderProductList("AI Predicted Basket", demoPredictionData.predictedBasket, true)}
                            {renderProductList("Actual Next Basket (from Instacart Data)", demoPredictionData.trueFutureBasket)}
                        </div>
                    </div>
                )}

                {/* No User Selected */}
                {!selectedUserId && demoUserIds && demoUserIds.length > 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-600 dark:text-gray-400">
                            Please select a user to view the demo prediction.
                        </p>
                    </div>
                )}

                {/* No Demo Users Available */}
                {demoUserIds && demoUserIds.length === 0 && !isLoadingIds && (
                    <div className="text-center py-12">
                        <p className="text-red-500 dark:text-red-400">
                            No demo user IDs configured. Please check the backend configuration.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DemoPredictionPage;