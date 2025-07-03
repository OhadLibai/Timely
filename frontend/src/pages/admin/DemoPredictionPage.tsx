// frontend/src/pages/admin/DemoPredictionPage.tsx
// UPDATED: Standalone page with proper PageHeader and navigation

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService, DemoUserPrediction } from '@/services/admin.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ProductImage from '@/components/products/ProductImage';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import { 
  Brain, CheckCircle, AlertCircle, RefreshCw, Search, 
  Info, TrendingUp, Target, Zap, ArrowRight, Sparkles,
  ShoppingCart, X, Check, ArrowLeft, Package
} from 'lucide-react';
import toast from 'react-hot-toast';

const DemoPredictionPage: React.FC = () => {
  const navigate = useNavigate();
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Enhanced user ID suggestions with descriptions
  const enhancedSuggestions = [
    { id: '1', description: 'Heavy grocery shopper', orders: '40+ orders' },
    { id: '7', description: 'Organic food enthusiast', orders: '35+ orders' },
    { id: '13', description: 'Family bulk buyer', orders: '50+ orders' },
    { id: '25', description: 'Health-conscious shopper', orders: '30+ orders' },
    { id: '31', description: 'Weekend regular', orders: '25+ orders' },
    { id: '42', description: 'Diverse preferences', orders: '45+ orders' },
    { id: '55', description: 'Premium brand lover', orders: '20+ orders' },
    { id: '60', description: 'Quick convenience shopper', orders: '55+ orders' },
    { id: '78', description: 'International cuisine fan', orders: '35+ orders' },
    { id: '92', description: 'Meal prep specialist', orders: '30+ orders' }
  ];

  // Get demo system metadata
  const { data: demoUserMetadata } = useQuery('demoUserMetadata', adminService.getDemoUserIds);

  // Get prediction data for selected user
  const { 
    data: demoPredictionData, 
    isLoading: isLoadingPrediction, 
    error: predictionError,
    refetch: refetchPrediction,
    isError 
  } = useQuery(
    ['demoUserPrediction', selectedUserId],
    () => adminService.getDemoUserPrediction(selectedUserId!),
    { 
      enabled: !!selectedUserId,
      retry: 1,
      staleTime: 30000
    }
  );

  const handleUserIdSubmit = () => {
    if (userIdInput.trim()) {
      const userId = userIdInput.trim();
      setSelectedUserId(userId);
      setShowSuggestions(false);
      refetchPrediction();
    } else {
      toast.error("Please enter a valid Instacart user ID.");
    }
  };

  const handleQuickSelect = (userId: string) => {
    setUserIdInput(userId);
    setSelectedUserId(userId);
    setShowSuggestions(false);
    refetchPrediction();
  };

  const handleReset = () => {
    setUserIdInput('');
    setSelectedUserId(null);
    setShowSuggestions(true);
  };

  const renderProductComparison = () => {
    if (!demoPredictionData) return null;

    const { predictedProducts, groundTruthProducts, matchingProducts } = demoPredictionData;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Predicted Products */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              ML Model Prediction
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({predictedProducts.length} items)
            </span>
          </div>

          <div className="space-y-3">
            {predictedProducts.map((product, index) => (
              <div
                key={product.product_id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  matchingProducts.includes(product.product_id)
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex-shrink-0">
                  <ProductImage
                    src={product.image_url}
                    alt={product.product_name}
                    className="w-12 h-12 rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
                    {product.product_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Score: {product.score.toFixed(3)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {matchingProducts.includes(product.product_id) ? (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <X className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ground Truth Products */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Actual Next Order
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({groundTruthProducts.length} items)
            </span>
          </div>

          <div className="space-y-3">
            {groundTruthProducts.map((product, index) => (
              <div
                key={product.product_id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  matchingProducts.includes(product.product_id)
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex-shrink-0">
                  <ProductImage
                    src={product.image_url}
                    alt={product.product_name}
                    className="w-12 h-12 rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
                    {product.product_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Quantity: {product.quantity}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {matchingProducts.includes(product.product_id) ? (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <X className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Demo Prediction Analysis"
          description="Compare ML model predictions against ground truth for individual users"
          icon={Target}
          breadcrumb={
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              icon={ArrowLeft}
              size="sm"
            >
              Back to Dashboard
            </Button>
          }
          actions={
            selectedUserId && (
              <Button
                variant="outline"
                onClick={handleReset}
                icon={RefreshCw}
              >
                Reset Analysis
              </Button>
            )
          }
        />

        {/* User Selection Interface */}
        {!selectedUserId && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Search className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Select Instacart User for Analysis
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Manual Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter User ID
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={userIdInput}
                      onChange={(e) => setUserIdInput(e.target.value)}
                      placeholder="e.g., 1, 42, 1337"
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      onKeyPress={(e) => e.key === 'Enter' && handleUserIdSubmit()}
                    />
                    <Button
                      variant="primary"
                      onClick={handleUserIdSubmit}
                      disabled={!userIdInput.trim()}
                      icon={Search}
                    >
                      Analyze
                    </Button>
                  </div>
                </div>

                {/* Quick Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quick Select Popular Users
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {enhancedSuggestions.slice(0, 6).map((user) => (
                      <Button
                        key={user.id}
                        variant="outline"
                        onClick={() => handleQuickSelect(user.id)}
                        size="sm"
                        className="justify-start text-left p-3"
                      >
                        <div>
                          <div className="font-medium">User {user.id}</div>
                          <div className="text-xs text-gray-500">{user.orders}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    How Demo Prediction Works
                  </h3>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p>• Enter any Instacart user ID (1-206,209)</p>
                    <p>• View the user's purchase history and next actual order</p>
                    <p>• See what the ML model predicts for their next basket</p>
                    <p>• Compare predictions vs reality with match indicators</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Loading State */}
        {isLoadingPrediction && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Analyzing user {selectedUserId}...
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Analysis Failed
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200">
                  {predictionError?.message || 'Unable to analyze this user. Please try a different ID.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {demoPredictionData && !isLoadingPrediction && (
          <>
            {/* Performance Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Prediction Performance for User {selectedUserId}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">
                    {demoPredictionData.metrics.precision.toFixed(3)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Precision</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {demoPredictionData.metrics.recall.toFixed(3)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Recall</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {demoPredictionData.metrics.f1_score.toFixed(3)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">F1 Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {demoPredictionData.matchingProducts.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Matches</div>
                </div>
              </div>
            </div>

            {/* Product Comparison */}
            {renderProductComparison()}
          </>
        )}
      </div>
    </div>
  );
};

export default DemoPredictionPage;