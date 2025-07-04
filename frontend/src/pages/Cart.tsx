// frontend/src/pages/Cart.tsx
// FIXED: Moved confirmation dialog to component level - proper separation of concerns

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Trash2, Plus, Minus, ArrowRight, 
  Package, AlertCircle, CheckCircle, Truck, Info
} from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import ProductImage from '@/components/products/ProductImage';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { formatPrice } from '@/utils/formatters';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    cart, 
    isLoading, 
    isUpdating,
    fetchCart, 
    updateQuantity, 
    removeItem, 
    clearCart,
    getSubtotal,
  } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, []);

  const handleQuantityChange = async (itemId: string, currentQuantity: number, delta: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity < 1) {
      await removeItem(itemId);
    } else {
      await updateQuantity(itemId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    navigate('/checkout');
  };

  // FIXED: Moved confirmation dialog to component level
  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        await clearCart();
      } catch (error) {
        // Error is already handled in the store with toast
        console.error('Failed to clear cart:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Your cart is empty"
        description="Add some products to your cart to get started"
        action={{
          label: "Browse Products",
          onClick: () => navigate('/products')
        }}
      />
    );
  }

  const subtotal = getSubtotal();
  const total = subtotal

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Shopping Cart"
          description={`${cart.items.length} ${cart.items.length === 1 ? 'item' : 'items'} in your cart`}
          icon={ShoppingCart}
        />

        <ResponsiveGrid cols={{ sm: 1, lg: 3 }} gap={8}>
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Items in your cart
                  </h2>
                  <Button
                    onClick={handleClearCart}
                    disabled={isUpdating}
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Clear cart
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence mode="popLayout">
                  {cart.items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 flex-shrink-0">
                          <ProductImage
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                                {item.product.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {item.product.category?.name}
                              </p>
                              
                              {item.product.originalPrice > item.product.price && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm line-through text-gray-400">
                                    {formatPrice(item.product.originalPrice)}
                                  </span>
                                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                    Save {formatPrice(item.product.originalPrice - item.product.price)}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <button
                              onClick={() => removeItem(item.id)}
                              disabled={isUpdating}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                                disabled={isUpdating}
                                className="p-1 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                              >
                                <Minus size={14} />
                              </button>
                              
                              <span className="w-12 text-center text-sm font-medium text-gray-900 dark:text-white">
                                {item.quantity}
                              </span>
                              
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                                disabled={isUpdating}
                                className="p-1 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatPrice(item.total)}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {formatPrice(item.price)} each
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Continue Shopping */}
            <div className="flex justify-center">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >
                <Package size={16} />
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(subtotal)}</span>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-gray-900 dark:text-white">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={isUpdating || cart.items.length === 0}
                variant="primary"
                size="lg"
                icon={ArrowRight}
                fullWidth
                className="mt-6"
              >
                Proceed to Checkout
              </Button>

              {/* Security Notice */}
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <CheckCircle size={12} />
                <span>Secure checkout with 256-bit SSL encryption</span>
              </div>
            </div>
          </div>
        </ResponsiveGrid>
      </div>
    </div>
  );
};

export default Cart;