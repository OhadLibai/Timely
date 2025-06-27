// frontend/src/components/predictions/AutoGenerateBasket.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from 'react-query';
import { 
  Brain, Sparkles, ShoppingCart, ArrowRight, 
  Loader2, CheckCircle, AlertCircle, Info
} from 'lucide-react';
import { predictionService } from '@/services/prediction.service';
import { useCartStore } from '@/stores/cart.store';
import toast from 'react-hot-toast';

interface AutoGenerateBasketProps {
  variant?: 'card' | 'banner' | 'button';
  className?: string;
  onNavigate?: (path: string) => void; // Callback for navigation
}

const AutoGenerateBasket: React.FC<AutoGenerateBasketProps> = ({ 
  variant = 'card',
  className = '',
  onNavigate
}) => {
  const [showResult, setShowResult] = useState(false);
  const [generatedBasket, setGeneratedBasket] = useState<any>(null);

  const generateMutation = useMutation(
    () => predictionService.autoGenerateWeeklyBasket(),
    {
      onMutate: () => {
        setShowResult(false);
        toast.loading('🧠 AI is analyzing your shopping patterns...', {
          id: 'generate-basket'
        });
      },
      onSuccess: (data) => {
        toast.dismiss('generate-basket');
        
        if (data.basket?.items?.length > 0) {
          setGeneratedBasket(data.basket);
          setShowResult(true);
          toast.success(`🎉 Generated ${data.basket.totalItems} items for your basket!`, {
            duration: 5000
          });
        } else {
          toast.error('No predictions available yet. Complete a few orders to get personalized recommendations!', {
            duration: 6000
          });
        }
      },
      onError: (error: any) => {
        toast.dismiss('generate-basket');
        toast.error('Failed to generate predictions. Please try again.');
        console.error('Generate basket error:', error);
      }
    }
  );

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleViewBasket = () => {
    if (onNavigate) {
      onNavigate('/predicted-basket');
    }
  };

  const handleAddToCart = async () => {
    if (generatedBasket?.id) {
      try {
        await predictionService.acceptBasket(generatedBasket.id);
        toast.success('Added to cart!');
        if (onNavigate) {
          onNavigate('/cart');
        }
      } catch (error) {
        toast.error('Failed to add to cart');
      }
    }
  };

  // Card variant - for dashboard
  if (variant === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">AI Shopping Assistant</h3>
            </div>
            
            <p className="text-indigo-100 mb-4">
              Let our AI predict your next grocery basket based on your shopping history.
            </p>

            <AnimatePresence mode="wait">
              {!showResult ? (
                <motion.button
                  key="generate"
                  onClick={handleGenerate}
                  disabled={generateMutation.isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {generateMutation.isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Auto-Generate Basket</span>
                    </>
                  )}
                </motion.button>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-white/90">
                    <CheckCircle size={20} />
                    <span className="font-medium">
                      Generated {generatedBasket?.totalItems} items
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleViewBasket}
                      className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                    >
                      <span>View Details</span>
                      <ArrowRight size={16} />
                    </button>
                    <button
                      onClick={handleAddToCart}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                    >
                      <ShoppingCart size={16} />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Sparkles className="w-16 h-16 text-white/20" />
        </div>

        {/* Info tooltip */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex items-start gap-2 text-sm text-indigo-100">
            <Info size={16} className="mt-0.5" />
            <p>
              Powered by TIFU-KNN algorithm trained on millions of shopping patterns
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Banner variant - for top of pages
  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-md p-4 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-white" />
            <div className="text-white">
              <h4 className="font-semibold">Need help with your shopping?</h4>
              <p className="text-sm text-purple-100">
                Let AI predict your next basket in seconds
              </p>
            </div>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors disabled:opacity-50"
          >
            {generateMutation.isLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Sparkles size={18} />
            )}
            <span className="hidden sm:inline">Generate Basket</span>
            <span className="sm:hidden">Generate</span>
          </button>
        </div>
      </motion.div>
    );
  }

  // Button variant - for navigation/header
  return (
    <motion.button
      onClick={handleGenerate}
      disabled={generateMutation.isLoading}
      className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {generateMutation.isLoading ? (
        <Loader2 className="animate-spin" size={18} />
      ) : (
        <Brain size={18} />
      )}
      <span>AI Basket</span>
    </motion.button>
  );
};

export default AutoGenerateBasket;