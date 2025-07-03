// frontend/src/pages/PredictedBasket.tsx
// CLEANED: Removed model metrics query (belongs in admin pages)
// CLEANED: Removed all sale-related functionality (salePrice, compareAtPrice, sale badges)
// FOCUSED: Core user experience for predicted basket management

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Brain, ShoppingCart, TrendingUp, Info, Check, X, 
  RefreshCw, Calendar, Clock, Sparkles, AlertCircle,
  ChevronRight, Plus, Minus, Trash2
} from 'lucide-react';
import { predictionService } from '@/services/prediction.service';
import { cartService } from '@/services/cart.service';
import { useCartStore } from '@/stores/cart.store';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ProductImage from '@/components/products/ProductImage';
import ConfidenceIndicator from '@/components/predictions/ConfidenceIndicator';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const PredictedBasket: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { syncWithPredictedBasket } = useCartStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Fetch current predicted basket
  const { data: basket, isLoading, error, refetch } = useQuery(
    'predicted-basket',
    predictionService.getCurrentPredictedBasket,
    {
      staleTime: 5 * 60 * 1000,
      retry: 1
    }
  );

  // REMOVED: Model metrics query - belongs in admin pages, not user experience

  // Generate new prediction mutation
  const generateMutation = useMutation(
    () => predictionService.generatePrediction({ forceRegenerate: true }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('predicted-basket');
        toast.success('New predictions generated!');
      },
      onError: () => {
        toast.error('Failed to generate predictions');
      }
    }
  );

  // Update item mutation
  const updateItemMutation = useMutation(
    ({ itemId, data }: { itemId: string; data: any }) => 
      predictionService.updateBasketItem(basket!.id, itemId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('predicted-basket');
      }
    }
  );

  // Remove item mutation
  const removeItemMutation = useMutation(
    (itemId: string) => predictionService.removeBasketItem(basket!.id, itemId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('predicted-basket');
        toast.success('Item removed from prediction');
      }
    }
  );

  // Accept basket mutation
  const acceptBasketMutation = useMutation(
    () => predictionService.acceptBasket(basket!.id),
    {
      onSuccess: async (data) => {
        await syncWithPredictedBasket(basket!.id);
        toast.success('Basket accepted! Redirecting to cart...');
        setTimeout(() => navigate('/cart'), 1500);
      },
      onError: () => {
        toast.error('Failed to accept basket');
      }
    }
  );

  // Calculate statistics - CLEANED: Using regular price instead of salePrice
  const stats = basket ? {
    totalItems: basket.items.filter(item => item.isAccepted).length,
    totalValue: basket.items
      .filter(item => item.isAccepted)
      .reduce((sum, item) => sum + (item.product.price * item.quantity), 0), // FIXED: price instead of salePrice
    avgConfidence: basket.items.length > 0
      ? basket.items.reduce((sum, item) => sum + item.confidenceScore, 0) / basket.items.length
      : 0,
    acceptanceRate: basket.items.length > 0
      ? (basket.items.filter(item => item.isAccepted).length / basket.items.length) * 100
      : 0
  } : null;

  const handleQuantityChange = (itemId: string, currentQuantity: number, delta: number) => {
    const newQuantity = Math.max(1, currentQuantity + delta);
    updateItemMutation.mutate({
      itemId,
      data: { quantity: newQuantity }
    });
  };

  const handleToggleItem = (itemId: string, currentAccepted: boolean) => {
    updateItemMutation.mutate({
      itemId,
      data: { isAccepted: !currentAccepted }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !basket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <Brain className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Predictions Available
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We need more data to generate accurate predictions for you.
            </p>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isLoading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {generateMutation.isLoading ? 'Generating...' : 'Generate Predictions'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Your Predicted Basket
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                AI-powered recommendations based on your shopping patterns
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isLoading}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={`inline mr-2 ${generateMutation.isLoading ? 'animate-spin' : ''}`} />
                Generate New
              </button>
            </div>
          </div>

          {/* Prediction Statistics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalItems}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Items Selected</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${stats.totalValue.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Value</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(stats.avgConfidence * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.acceptanceRate.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Acceptance Rate</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Predicted Items */}
        <div className="space-y-4 mb-8">
          <AnimatePresence>
            {basket.items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all duration-300 ${
                  item.isAccepted
                    ? 'border-green-200 dark:border-green-800'
                    : 'border-gray-200 dark:border-gray-700'
                } ${!item.isAccepted ? 'opacity-60' : ''}`}
              >
                <div className="p-4">
                  <div className="flex gap-4">
                    {/* Product Image - CLEANED: Removed sale badge */}
                    <div className="relative">
                      <ProductImage
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      {/* REMOVED: Sale badge logic */}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {item.product.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.product.brand} • {item.product.unit}
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleItem(item.id, item.isAccepted)}
                          className={`p-2 rounded-lg transition-colors ${
                            item.isAccepted
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                          }`}
                        >
                          {item.isAccepted ? <Check size={20} /> : <X size={20} />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          {/* CLEANED: Using regular price, removed compareAtPrice */}
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ${item.product.price.toFixed(2)}
                          </p>
                          <ConfidenceIndicator score={item.confidenceScore} compact />
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                            disabled={!item.isAccepted}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                            disabled={!item.isAccepted}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => removeItemMutation.mutate(item.id)}
                            className="ml-2 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        {basket.items.some(item => item.isAccepted) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Ready to shop?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Add your selected items to cart and continue shopping
            </p>
            <button
              onClick={() => acceptBasketMutation.mutate()}
              disabled={acceptBasketMutation.isLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-semibold"
            >
              <ShoppingCart size={20} className="inline mr-2" />
              {acceptBasketMutation.isLoading ? 'Adding to Cart...' : 'Accept & Add to Cart'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PredictedBasket;