// frontend/src/pages/admin/DemoPredictionPage.tsx
// FIXED: Replaced dropdown with free-form input to allow ANY Instacart user ID

import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { adminService, DemoUserPrediction } from '@/services/admin.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ProductImage from '@/components/products/ProductImage';
import { Brain, UserPlus, CheckCircle, AlertCircle, RefreshCw, Search, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const DemoPredictionPage: React.FC = () => {
    const [userIdInput, setUserIdInput] = useState<string>('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // Remove the hardcoded user IDs query since we now accept any ID
    const { data: demoUserMetadata } = useQuery('demoUserMetadata', adminService.getDemoUserIds);

    const { data: demoPredictionData, isLoading: isLoadingPrediction, error: predictionError, refetch } = useQuery(
        ['demoUserPrediction', selectedUserId],
        () => adminService.getDemoUserPrediction(selectedUserId!),
        { enabled: !!selectedUserId }
    );

    const seedUserMutation = useMutation(adminService.seedDemoUser, {
        onSuccess: (data) => {
            toast.success(data.message, { duration: 6000 });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to seed user.', { duration: 6000 });
        }
    });

    const handleUserIdSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userIdInput.trim()) {
            const userId = userIdInput.trim();
            setSelectedUserId(userId);
            refetch();
        } else {
            toast.error("Please enter a valid Instacart user ID.");
        }
    };

    const handleSeedUser = () => {
        if (selectedUserId) {
            seedUserMutation.mutate(selectedUserId);
        } else {
            toast.error("Please enter and submit a user ID first.");
        }
    };

    // Suggested popular user IDs for convenience
    const suggestedUserIds = ['1', '7', '13', '25', '31', '42', '55', '60', '78', '92'];
    
    const renderProductList = (title: string, products: any[], isPredicted = false) => (
        <div className="w-full lg:w-1/2 px-4">
            <h3 className={`text-xl font-semibold mb-4 ${isPredicted ? 'text-blue-800 dark:text-blue-200' : 'text-green-800 dark:text-green-200'}`}>
                {title}
            </h3>
            {products && products.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {products.map((product: any, index: number) => (
                        <div key={product?.id || index} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <ProductImage 
                                src={product?.imageUrl} 
                                alt={product?.name || 'Product'} 
                                className="w-12 h-12 mr-3" 
                            />
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-white">{product?.name || 'Unknown Product'}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{product?.category || 'Uncategorized'}</p>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">${product?.price?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No products found</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Brain className="text-indigo-600" size={32} />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Demo Prediction</h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                        Enter any Instacart user ID to see our AI model's prediction compared to their actual next basket.
                    </p>
                </div>

                {/* Info Box */}
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <Info className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
                        <div>
                            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">How it works:</h3>
                            <p className="text-blue-700 dark:text-blue-300 text-sm">
                                This demo uses the original Instacart dataset. Enter any user ID that exists in the dataset to see a live prediction comparison. 
                                {demoUserMetadata?.message && (
                                    <span className="block mt-1 font-medium">{demoUserMetadata.message}</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* User ID Input Form */}
                <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select Instacart User ID</h2>
                    
                    <form onSubmit={handleUserIdSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="userIdInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Enter Instacart User ID:
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    id="userIdInput"
                                    value={userIdInput}
                                    onChange={(e) => setUserIdInput(e.target.value)}
                                    placeholder="e.g., 1, 7, 123, 456..."
                                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    disabled={isLoadingPrediction}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoadingPrediction || !userIdInput.trim()}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Search size={16} />
                                    {isLoadingPrediction ? 'Loading...' : 'Predict'}
                                </button>
                            </div>
                        </div>

                        {/* Suggested User IDs for convenience */}
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick examples (click to use):</p>
                            <div className="flex flex-wrap gap-2">
                                {suggestedUserIds.map(id => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setUserIdInput(id)}
                                        className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                    >
                                        User {id}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </form>

                    {/* Seed User Section */}
                    {selectedUserId && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Step 2 (Optional): Create a Functional User Account
                            </h3>
                            <button 
                                onClick={handleSeedUser} 
                                disabled={seedUserMutation.isLoading} 
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                <UserPlus size={16} />
                                {seedUserMutation.isLoading ? 'Seeding...' : `Seed User ${selectedUserId} into App`}
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                This creates a real user account in the database with this user's history, allowing you to log in as them (email: demo-user-{selectedUserId}@timely.com, password: password123).
                            </p>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {isLoadingPrediction && selectedUserId && (
                    <LoadingSpinner message={`Fetching prediction for User ${selectedUserId}...`} />
                )}
                
                {/* Error State */}
                {predictionError && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
                            <div>
                                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">Error loading prediction</h3>
                                <p className="text-red-700 dark:text-red-300 text-sm">
                                    {(predictionError as any)?.response?.data?.error || 'An error occurred while fetching the prediction. Please try a different user ID.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Results Section */}
                {demoPredictionData && !isLoadingPrediction && (
                    <>
                        {/* Comparison Metrics */}
                        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                                Prediction vs. Ground Truth for User {demoPredictionData.userId}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {demoPredictionData.comparisonMetrics.predictedCount}
                                    </div>
                                    <div className="text-sm text-blue-800 dark:text-blue-200">Predicted Items</div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {demoPredictionData.comparisonMetrics.actualCount}
                                    </div>
                                    <div className="text-sm text-green-800 dark:text-green-200">Actual Items</div>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        {demoPredictionData.comparisonMetrics.commonItems}
                                    </div>
                                    <div className="text-sm text-purple-800 dark:text-purple-200">Matching Items</div>
                                </div>
                            </div>
                            
                            {/* Accuracy Percentage */}
                            {demoPredictionData.comparisonMetrics.actualCount > 0 && (
                                <div className="mt-4 text-center">
                                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Accuracy: {Math.round((demoPredictionData.comparisonMetrics.commonItems / demoPredictionData.comparisonMetrics.actualCount) * 100)}%
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        ({demoPredictionData.comparisonMetrics.commonItems} out of {demoPredictionData.comparisonMetrics.actualCount} actual items predicted correctly)
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Side-by-Side Baskets */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                            <div className="flex flex-col lg:flex-row gap-6">
                                {renderProductList(
                                    "🤖 AI Predicted Basket", 
                                    demoPredictionData.predictedBasket, 
                                    true
                                )}
                                {renderProductList(
                                    "✅ Actual Next Basket", 
                                    demoPredictionData.trueFutureBasket, 
                                    false
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* No Results State */}
                {!isLoadingPrediction && !demoPredictionData && !predictionError && selectedUserId && (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <RefreshCw size={48} className="mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Prediction Results</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            No prediction data was returned. The user might not exist in the dataset or may not have sufficient purchase history.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DemoPredictionPage;