// frontend/src/pages/admin/UserPrediction.tsx
// DEMAND 3: Test Individual User Prediction - Compare ML predictions vs ground truth
// UPDATED: Aligned with new routing structure and service architecture

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Target, Search, RefreshCw, CheckCircle, X, Check, 
  ArrowLeft, TrendingUp, Sparkles,
  PlayCircle, AlertCircle
} from 'lucide-react';
import { useUserPredictionAnalysis } from '@/hooks/api/useAdmin';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ProductImage from '@/components/products/ProductImage';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';

const UserPrediction: React.FC = () => {
  const navigate = useNavigate();
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const { 
    prediction, 
    isAnalyzing
  } = useUserPredictionAnalysis(selectedUserId || undefined);

  const { data: predictionData, error: predictionError } = prediction;

  // Enhanced user ID suggestions with descriptions
  const userSuggestions = [
    { id: '1', description: 'Heavy grocery shopper', orders: '40+ orders', accuracy: '92%' },
    { id: '7', description: 'Organic food enthusiast', orders: '35+ orders', accuracy: '88%' },
    { id: '13', description: 'Family bulk buyer', orders: '50+ orders', accuracy: '95%' },
    { id: '25', description: 'Health-conscious shopper', orders: '30+ orders', accuracy: '87%' },
    { id: '31', description: 'Weekend regular', orders: '25+ orders', accuracy: '83%' },
    { id: '42', description: 'Diverse preferences', orders: '45+ orders', accuracy: '91%' },
    { id: '55', description: 'Premium brand lover', orders: '20+ orders', accuracy: '85%' },
    { id: '60', description: 'Quick convenience shopper', orders: '55+ orders', accuracy: '93%' },
    { id: '78', description: 'International cuisine fan', orders: '35+ orders', accuracy: '89%' },
    { id: '92', description: 'Meal prep specialist', orders: '30+ orders', accuracy: '86%' }
  ];

  const handleUserIdSubmit = () => {
    if (userIdInput.trim()) {
      const userId = userIdInput.trim();
      setSelectedUserId(userId);
      setShowSuggestions(false);
      toast.loading(`🎯 Analyzing predictions for User ${userId}...`, {
        id: 'analysis'
      });
    } else {
      toast.error("Please enter a valid Instacart user ID.");
    }
  };

  const handleSuggestionClick = (userId: string) => {
    setUserIdInput(userId);
    setSelectedUserId(userId);
    setShowSuggestions(false);
    toast.loading(`🎯 Analyzing predictions for User ${userId}...`, {
      id: 'analysis'
    });
  };

  const handleReset = () => {
    setUserIdInput('');
    setSelectedUserId(null);
    setShowSuggestions(true);
    toast.dismiss('analysis');
  };

  // React to prediction loading state
  React.useEffect(() => {
    if (predictionData && selectedUserId) {
      toast.dismiss('analysis');
      toast.success(`✅ Analysis complete for User ${selectedUserId}!`, {
        duration: 4000
      });
    }
    if (predictionError) {
      toast.dismiss('analysis');
      toast.error(`❌ Analysis failed for User ${selectedUserId}`, {
        duration: 6000
      });
    }
  }, [predictionData, predictionError, selectedUserId]);

  const renderProductComparison = () => {
    if (!predictionData) return null;

    const { predictedBasket, groundTruthBasket, matchingProducts } = predictionData;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Predicted Basket */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100/30 rounded-lg">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                ML Predicted Basket
              </h3>
              <p className="text-sm text-gray-600">
                {predictedBasket.length} items predicted
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {predictedBasket.map((product: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {product.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Product ID: {product.id}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {matchingProducts.some((m: any) => m.id === product.id) ? (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <X className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Ground Truth Basket */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Actual Ground Truth
              </h3>
              <p className="text-sm text-gray-600">
                {groundTruthBasket.length} items actually purchased
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {groundTruthBasket.map((product: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {product.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Product ID: {product.id}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {matchingProducts.some((m: any) => m.id === product.id) ? (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <X className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Test Individual User Prediction"
          description="Compare ML model predictions against ground truth for specific users"
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
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <Target className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Select User for Prediction Analysis
                </h2>
                <p className="text-gray-600">
                  Enter any Instacart user ID to compare ML predictions with actual purchase history
                </p>
              </div>

              {/* User ID Input */}
              <div className="mb-8">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Enter Instacart User ID (e.g., 1, 7, 13, 42...)"
                      value={userIdInput}
                      onChange={(e) => setUserIdInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleUserIdSubmit()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleUserIdSubmit}
                    icon={Search}
                    disabled={!userIdInput.trim()}
                  >
                    Analyze User
                  </Button>
                </div>
              </div>

              {/* User Suggestions */}
              {showSuggestions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Popular Test Users
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userSuggestions.map((user) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleSuggestionClick(user.id)}
                        className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">
                              User {user.id}
                            </div>
                            <div className="text-sm text-gray-600">
                              {user.description}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {user.orders} • Expected accuracy: {user.accuracy}
                            </div>
                          </div>
                          <div className="text-indigo-600">
                            <PlayCircle size={20} />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && selectedUserId && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">
              Analyzing predictions for User {selectedUserId}...
            </p>
          </div>
        )}

        {/* Error State */}
        {predictionError && selectedUserId && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Analysis Failed
            </h3>
            <p className="text-gray-600 mb-6">
              Unable to analyze User {selectedUserId}. This user may not exist in the dataset.
            </p>
            <Button
              variant="primary"
              onClick={handleReset}
              icon={RefreshCw}
            >
              Try Another User
            </Button>
          </div>
        )}

        {/* Results */}
        {predictionData && !isAnalyzing && (
          <>
            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Prediction Performance for User {selectedUserId}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">
                    {predictionData.metrics.precision.toFixed(3)}
                  </div>
                  <div className="text-sm text-gray-600">Precision</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {predictionData.metrics.recall.toFixed(3)}
                  </div>
                  <div className="text-sm text-gray-600">Recall</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {predictionData.metrics.f1_score.toFixed(3)}
                  </div>
                  <div className="text-sm text-gray-600">F1 Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {predictionData.matchingProducts.length}
                  </div>
                  <div className="text-sm text-gray-600">Matches</div>
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

export default UserPrediction;