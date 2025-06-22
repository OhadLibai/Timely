// frontend/src/pages/Cart.tsx
// CLEANED: Removed non-functional promo code input for cleaner demo experience

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Trash2, Plus, Minus, ArrowRight, 
  Package, AlertCircle, CheckCircle, X
} from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import ProductImage from '@/components/products/ProductImage';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import toast from 'react-hot-toast';

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
    getSavings
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
  const savings = getSavings();
  const estimatedTax = subtotal * 0.08; // 8% tax
  const deliveryFee = subtotal > 50 ? 0 : 5.99; // Free delivery over $50
  const total = subtotal + estimatedTax + deliveryFee - savings;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shopping Cart</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <AnimatePresence>
                {cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <ProductImage
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-20 h-20 rounded-lg"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/products/${item.product.id}`}
                          className="block text-lg font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {item.product.name}
                        </Link>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.product.category?.name}
                        </p>

                        <div className="flex items-center justify-between mt-4">
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            ${item.product.price.toFixed(2)}
                          </p>

                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => removeItem(item.id)}
                              disabled={isUpdating}
                              className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                              title="Remove item"
                            >
                              <Trash2 size={18} />
                            </button>

                            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                                disabled={isUpdating}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                              >
                                <Minus size={18} />
                              </button>
                              <span className="w-12 text-center font-medium text-gray-900 dark:text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                                disabled={isUpdating || (item.product.trackInventory && item.quantity >= item.product.stock)}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                          </div>

                          {/* Stock Warning */}
                          {item.product.trackInventory && item.product.stock <= 5 && (
                            <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                              Only {item.product.stock} left in stock
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Cart Actions */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                <button
                  onClick={clearCart}
                  disabled={isUpdating}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h2>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                {savings > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Savings</span>
                    <span>-${savings.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Estimated Tax</span>
                  <span>${estimatedTax.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}</span>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isUpdating}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight size={20} />
              </button>

              {/* Security Note */}
              <div className="mt-4 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Your payment information is encrypted and secure. We never store your credit card details.
                </p>
              </div>

              {/* Predicted Basket Link */}
              {user && (
                <Link
                  to="/predicted-basket"
                  className="mt-6 flex items-center justify-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                >
                  View AI Predictions
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Related Products or Recommendations */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            You Might Also Like
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <EmptyState
              icon={Package}
              title="Product recommendations coming soon"
              description="We're working on personalized recommendations to enhance your shopping experience"
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;