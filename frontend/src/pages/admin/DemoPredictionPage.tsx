// frontend/src/pages/admin/DemoPredictionPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { adminService, DemoUserPrediction, DemoUserIds } from '../../services/admin.service';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProductImage from '../../components/products/ProductImage';
import { Brain, UserPlus, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const DemoPredictionPage: React.FC = () => {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const { data: demoUserIdsResponse, isLoading: isLoadingIds, error: userIdsError } = useQuery('demoUserIds', adminService.getDemoUserIds);
    const demoUserIds = demoUserIdsResponse?.userIds || [];

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
            toast.error(error.response?.data?.message || 'Failed to seed user.', { duration: 6000 });
        }
    });

    useEffect(() => {
        if (demoUserIds.length > 0 && !selectedUserId) {
            setSelectedUserId(demoUserIds[0]);
        }
    }, [demoUserIds, selectedUserId]);

    const handleUserSelection = (userId: string) => {
        setSelectedUserId(userId);
        refetch();
    };

    const handleSeedUser = () => {
        if (selectedUserId) {
            seedUserMutation.mutate(selectedUserId);
        } else {
            toast.error("Please select a user ID to seed.");
        }
    };
    
    const renderProductList = (title: string, products: any[], isPredicted = false) => (
        <div className="w-full lg:w-1/2 px-4">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{title}</h3>
            {products && products.length > 0 ? (
                <div className="space-y-3">
                    <ul className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
                        {products.map((product) => (
                            <li key={product.id} className="flex items-center p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                                <ProductImage src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded mr-3 flex-shrink-0" />
                                <div className="flex-grow min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">${product.price?.toFixed(2)}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center h-full flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">No items in this basket.</p>
                </div>
            )}
        </div>
    );
    
    if (isLoadingIds) return <LoadingSpinner message="Loading demo users..." />;
    if (userIdsError) return <div className="text-red-500 p-4">Error loading demo users.</div>;

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Live Prediction Demo</h1>
                    <p className="text-gray-600 dark:text-gray-400">Compare AI predictions with actual purchase data from the Instacart dataset.</p>
                </div>

                <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-4">
                    <div>
                        <label htmlFor="demoUserSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Step 1: Select an Instacart User ID for Demonstration
                        </label>
                        <select
                            id="demoUserSelect"
                            value={selectedUserId || ''}
                            onChange={(e) => handleUserSelection(e.target.value)}
                            className="w-full max-w-md p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="" disabled>-- Select User --</option>
                            {demoUserIds.map(id => <option key={id} value={id}>User ID: {id}</option>)}
                        </select>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Step 2 (Optional): Create a Functional User Account</h3>
                        <button onClick={handleSeedUser} disabled={seedUserMutation.isLoading} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                            <UserPlus size={16} />
                            {seedUserMutation.isLoading ? 'Seeding...' : 'Seed This User into App'}
                        </button>
                         <p className="text-xs text-gray-500 mt-2">This creates a real user in the database with this history, allowing you to log in as them.</p>
                    </div>
                </div>

                {isLoadingPrediction && <LoadingSpinner message={`Fetching prediction for User ${selectedUserId}...`} />}
                
                {predictionError && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg"><h3 className="text-red-800 dark:text-red-200">Error loading prediction.</h3></div>
                )}
                
                {demoPredictionData && !isLoadingPrediction && (
                    <>
                        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Prediction vs. Ground Truth Comparison</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{demoPredictionData.comparisonMetrics.predictedCount}</div><div className="text-sm text-gray-600 dark:text-gray-400">Predicted Items</div></div>
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"><div className="text-2xl font-bold text-green-600 dark:text-green-400">{demoPredictionData.comparisonMetrics.actualCount}</div><div className="text-sm text-gray-600 dark:text-gray-400">Actual Items</div></div>
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{demoPredictionData.comparisonMetrics.commonItems}</div><div className="text-sm text-gray-600 dark:text-gray-400">Correct Predictions</div></div>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6">
                            {renderProductList("AI Predicted Basket", demoPredictionData.predictedBasket, true)}
                            {renderProductList("Actual Next Basket (Ground Truth)", demoPredictionData.trueFutureBasket)}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DemoPredictionPage;