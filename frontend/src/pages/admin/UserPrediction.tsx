// frontend/src/pages/admin/UserPrediction.tsx
// DEMAND 3: Test Individual User Prediction - Compare ML predictions vs ground truth
// UPDATED: Aligned with new routing structure and service architecture

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Target, Search, RefreshCw, CheckCircle, X, Check, 
  ArrowLeft, TrendingUp, Sparkles,
  PlayCircle, AlertCircle,
  Plane,
  Atom
} from 'lucide-react';
import { TbTargetArrow } from "react-icons/tb";
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
      toast.success(`🎉 Analysis complete for User ${selectedUserId}!`, {
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

    const { predictedBasket, groundTruthBasket } = predictionData;
    
    // Safety check for undefined arrays
    if (!predictedBasket || !groundTruthBasket) {
      return <div className="text-red-500">Error: Missing prediction data</div>;
    }

    // Create aligned product lists
    const createAlignedLists = () => {
      // Find matching products
      const matchingProducts = predictedBasket.filter(predicted => 
        groundTruthBasket.some(actual => actual.id === predicted.id)
      );

      // Get non-matching products from each list
      const predictedOnly = predictedBasket.filter(predicted => 
        !groundTruthBasket.some(actual => actual.id === predicted.id)
      );
      const groundTruthOnly = groundTruthBasket.filter(actual => 
        !predictedBasket.some(predicted => predicted.id === actual.id)
      );

      // Create aligned rows
      const alignedRows = [];
      
      // First, add all matching products (aligned on same rows)
      matchingProducts.forEach(matchedProduct => {
        const predictedItem = predictedBasket.find(p => p.id === matchedProduct.id);
        const groundTruthItem = groundTruthBasket.find(g => g.id === matchedProduct.id);
        
        alignedRows.push({
          predicted: predictedItem,
          groundTruth: groundTruthItem,
          isMatched: true
        });
      });

      // Then add non-matching products at the bottom
      const maxNonMatching = Math.max(predictedOnly.length, groundTruthOnly.length);
      for (let i = 0; i < maxNonMatching; i++) {
        alignedRows.push({
          predicted: predictedOnly[i] || null,
          groundTruth: groundTruthOnly[i] || null,
          isMatched: false
        });
      }

      return alignedRows;
    };

    const alignedRows = createAlignedLists();

    const renderProductCard = (product: any, isMatched: boolean, side: 'predicted' | 'groundTruth') => {
      if (!product) {
        return (
          <div className="flex items-center gap-4 p-4 bg-transparent rounded-lg min-h-[80px]">
            {/* Empty placeholder to maintain alignment */}
          </div>
        );
      }

      return (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
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
            {isMatched ? (
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
      );
    };

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
            {alignedRows.map((row, index) => (
              <div key={`predicted-${index}`}>
                {renderProductCard(row.predicted, row.isMatched, 'predicted')}
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
            {alignedRows.map((row, index) => (
              <div key={`groundtruth-${index}`}>
                {renderProductCard(row.groundTruth, row.isMatched, 'groundTruth')}
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
              size="md"
            >
              Back to the Hub
            </Button>
          }
          actions={
            selectedUserId && (
              <Button
                variant="primary"
                onClick={handleReset}
                icon={Plane}
                size="lg"
              >
                Try More Users!
              </Button>
            )
          }
        />

        {/* User Selection Interface */}
        {!selectedUserId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow-sm p-8 mb-8"
          >
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-block">
                  <motion.div
                    animate={{ 
                      rotate: 360
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="relative"
                  >
                    <motion.div
                      animate={{
                        rotate: -360
                      }}
                      transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <Atom className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                    </motion.div>
                  </motion.div>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Select User for Prediction Analysis
                </h2>
                <p className="text-gray-600">
                  Enter any user ID to compare ML predictions with actual purchase history
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
                    Compare 
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
          </motion.div>
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
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <Button
                variant="primary"
                onClick={handleReset}
                icon={RefreshCw}
                size="xl"
                className="shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Try Others...
              </Button>
            </motion.div>
          </div>
        )}

        {/* Results */}
        {predictionData && !isAnalyzing && (
          <>
            {/* Product Comparison */}
            {renderProductComparison()}
          </>
        )}
      </div>
    </div>
  );
};

export default UserPrediction;