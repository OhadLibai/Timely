// frontend/src/pages/admin/DemoPredictionPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService, DemoUserPrediction } from '@/services/admin.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ProductImage from '@/components/products/ProductImage';
import { 
  Brain, CheckCircle, AlertCircle, RefreshCw, Search, 
  Info, TrendingUp, Target, Zap, ArrowRight, Sparkles,
  ShoppingCart, X, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const DemoPredictionPage: React.FC = () => {
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
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userIdInput.trim()) {
      handleUserIdSubmit();
    }
  };

  const resetForm = () => {
    setSelectedUserId(null);
    setUserIdInput('');
    setShowSuggestions(true);
  };

  // Calculate comparison metrics
  const getComparisonMetrics = () => {
    if (!demoPredictionData) return null;

    const metrics = demoPredictionData.metrics;
    const correctItems = metrics.correct_items || 0;
    const totalPredicted = metrics.total_predicted_items || 0;
    const totalActual = metrics.total_actual_items || 0;

    return {
      accuracy: totalPredicted > 0 ? Math.round((correctItems / totalPredicted) * 100) : 0,
      coverage: totalActual > 0 ? Math.round((correctItems / totalActual) * 100) : 0,
      correctItems,
      totalPredicted,
      totalActual
    };
  };

  const comparisonMetrics = getComparisonMetrics();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="text-indigo-600 dark:text-indigo-400" size={28} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Live Demo Prediction
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Test TIFU-KNN predictions against actual user baskets
                </p>
              </div>
            </div>
            {selectedUserId && (
              <button
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw size={18} />
                <span>New Test</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* User Selection */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Search className="text-indigo-600" size={20} />
            Select User for Testing
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instacart User ID
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter any ID (e.g., 1, 42, 100...)"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isLoadingPrediction}
                  />
                  <Brain className="absolute right-3 top-2.5 text-gray-400" size={20} />
                </div>
                <button
                  onClick={handleUserIdSubmit}
                  disabled={!userIdInput.trim() || isLoadingPrediction}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Zap size={18} />
                  <span>Analyze</span>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Any user ID from the Instacart dataset (1-206209)
              </p>
            </div>

            {/* Quick Selection Grid */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-4 border-t border-gray-200 dark:border-gray-700"
                >
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Popular Test Users
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {enhancedSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handleQuickSelect(suggestion.id)}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:scale-105"
                      >
                        <div className="font-semibold text-gray-900 dark:text-white">
                          User {suggestion.id}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {suggestion.description}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {suggestion.orders}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoadingPrediction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <RefreshCw className="animate-spin text-indigo-600" size={24} />
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  Analyzing User {selectedUserId}...
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• Loading user's purchase history</p>
                <p>• Running TIFU-KNN prediction algorithm</p>
                <p>• Comparing with actual basket</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {isError && predictionError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Analysis Failed
                </h3>
                <p className="text-red-800 dark:text-red-200 text-sm">
                  {(predictionError as any)?.response?.data?.detail || 'Unable to analyze this user'}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                  >
                    Try Another User
                  </button>
                  <button
                    onClick={() => refetchPrediction()}
                    className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Prediction Results */}
        {demoPredictionData && !isLoadingPrediction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Success Header */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  Prediction Analysis Complete for User {selectedUserId}!
                </h3>
              </div>
              
              {/* Metrics Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Recall</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(demoPredictionData.metrics.recall * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Items correctly predicted
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Precision</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(demoPredictionData.metrics.precision * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Prediction accuracy
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Correct Items</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {comparisonMetrics?.correctItems}/{comparisonMetrics?.totalActual}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Out of actual basket
                  </p>
                </div>
              </div>
            </div>

            {/* Basket Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Predicted Basket */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Brain className="text-indigo-600" size={20} />
                  ML Predicted Basket
                  <span className="text-sm font-normal text-gray-500">
                    ({demoPredictionData.predicted_basket.length} items)
                  </span>
                </h3>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {demoPredictionData.predicted_basket.map((item, index) => {
                    const isCorrect = demoPredictionData.actual_basket.some(
                      actual => actual.product_id === item.product_id
                    );
                    
                    return (
                      <div
                        key={item.product_id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isCorrect 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">#{index + 1}</span>
                          <span className={`font-medium ${
                            isCorrect 
                              ? 'text-green-800 dark:text-green-200' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {item.product_name}
                          </span>
                        </div>
                        {isCorrect && <Check className="text-green-600" size={18} />}
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Actual Basket */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ShoppingCart className="text-green-600" size={20} />
                  Actual User Basket
                  <span className="text-sm font-normal text-gray-500">
                    ({demoPredictionData.actual_basket.length} items)
                  </span>
                </h3>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {demoPredictionData.actual_basket.map((item, index) => {
                    const wasPredicted = demoPredictionData.predicted_basket.some(
                      pred => pred.product_id === item.product_id
                    );
                    
                    return (
                      <div
                        key={item.product_id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          wasPredicted 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">#{index + 1}</span>
                          <span className={`font-medium ${
                            wasPredicted 
                              ? 'text-green-800 dark:text-green-200' 
                              : 'text-red-800 dark:text-red-200'
                          }`}>
                            {item.product_name}
                          </span>
                        </div>
                        {wasPredicted ? (
                          <Check className="text-green-600" size={18} />
                        ) : (
                          <X className="text-red-600" size={18} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/* Legend */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-200 dark:bg-green-800 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">Correctly Predicted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-200 dark:bg-red-800 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">Missed Item</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">Extra Prediction</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-sm p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">About This Demo</h3>
              <p className="text-indigo-100 text-sm mb-3">
                This tool demonstrates TIFU-KNN's ability to predict what products a user will purchase next
                based on their historical shopping patterns.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Sparkles size={16} />
                  Real-time predictions
                </span>
                <span className="flex items-center gap-1">
                  <Target size={16} />
                  Actual vs predicted comparison
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp size={16} />
                  Performance metrics
                </span>
              </div>
            </div>
            <Brain className="text-indigo-200" size={48} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DemoPredictionPage;