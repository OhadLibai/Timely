// frontend/src/pages/Cart.tsx
// CLEANED UP: Removed non-functional promo codes and complex delivery options for demo

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

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      await clearCart();
      toast.success('Cart cleared');
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

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
          {/* Cart Items */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Cart Items
                  </h2>
                  <button
                    onClick={handleClearCart}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {cart.items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="p-6"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ProductImage
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        </div>

                        <div className="ml-6 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-base font-medium text-gray-900 dark:text-white">
                                {item.product.name}
                              </h3>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {item.product.category?.name}
                              </p>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                ${Number(item.product.price).toFixed(2)} each
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Quantity Controls */}
                              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md">
                                <button
                                  onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                                  disabled={isUpdating}
                                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="px-4 py-2 text-gray-900 dark:text-white font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                                  disabled={isUpdating}
                                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>

                              {/* Item Total */}
                              <div className="text-right">
                                <p className="text-lg font-medium text-gray-900 dark:text-white">
                                  ${(Number(item.product.price) * item.quantity).toFixed(2)}
                                </p>
                                {item.product.isOnSale && (
                                  <p className="text-sm text-green-600 dark:text-green-400">
                                    {item.product.salePercentage}% off
                                  </p>
                                )}
                              </div>

                              {/* Remove Button */}
                              <button
                                onClick={() => removeItem(item.id)}
                                disabled={isUpdating}
                                className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                                title="Remove item"
                              >
                                <Trash2 size={18} />
                              </button>
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
            <div className="mt-6">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
              >
                <ArrowRight size={16} className="rotate-180" />
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mt-16 lg:mt-0 lg:col-span-5">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  Order Summary
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between text-base text-gray-900 dark:text-white">
                    <p>Subtotal</p>
                    <p>${subtotal.toFixed(2)}</p>
                  </div>

                  {savings > 0 && (
                    <div className="flex justify-between text-base text-green-600 dark:text-green-400">
                      <p>Savings</p>
                      <p>-${savings.toFixed(2)}</p>
                    </div>
                  )}

                  <div className="flex justify-between text-base text-gray-900 dark:text-white">
                    <p>Estimated Tax</p>
                    <p>${estimatedTax.toFixed(2)}</p>
                  </div>

                  <div className="flex justify-between text-base text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <p>Delivery</p>
                      {deliveryFee === 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                          FREE
                        </span>
                      )}
                    </div>
                    <p>${deliveryFee.toFixed(2)}</p>
                  </div>

                  {subtotal < 50 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Add ${(50 - subtotal).toFixed(2)} more for free delivery!
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between text-lg font-medium text-gray-900 dark:text-white">
                      <p>Total</p>
                      <p>${total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="mt-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Truck className="text-gray-600 dark:text-gray-400" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Standard Delivery
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Estimated delivery: 2-3 business days
                      </p>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isUpdating || cart.items.length === 0}
                  className="w-full mt-6 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isUpdating ? 'Updating...' : 'Proceed to Checkout'}
                </button>

                {/* Security Badge */}
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Secure checkout guaranteed</span>
                </div>
              </div>
            </div>

            {/* Recently Viewed */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                You might also like
              </h3>
              <div className="space-y-3">
                {/* This would normally show recommended products */}
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Product recommendations coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;