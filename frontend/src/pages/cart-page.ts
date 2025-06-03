// frontend/src/pages/Cart.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Trash2, Plus, Minus, ArrowRight, 
  Package, Tag, AlertCircle, CheckCircle, X
} from 'lucide-react';
import { useCartStore } from '../stores/cart.store';
import { useAuthStore } from '../stores/auth.store';
import ProductImage from '../components/products/ProductImage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
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

  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

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

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    setIsApplyingPromo(true);
    try {
      // TODO: Implement promo code application
      toast.success('Promo code applied!');
      setPromoCode('');
    } catch (error) {
      toast.error('Invalid promo code');
    } finally {
      setIsApplyingPromo(false);
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
  const deliveryFee = subtotal > 50 ? 0 : 4.99;
  const total = subtotal + estimatedTax + deliveryFee;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Shopping Cart
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              {/* Free Delivery Banner */}
              {deliveryFee > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-amber-600" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Add ${(50 - subtotal).toFixed(2)} more for free delivery!
                    </p>
                  </div>
                </div>
              )}

              {/* Cart Items List */}
              <AnimatePresence>
                {cart.items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link to={`/products/${item.productId}`}>
                        <ProductImage
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-24 h-24 object-cover rounded-lg hover:scale-105 transition-transform"
                        />
                      </Link>

                      {/* Product Details */}
                      <div className="flex-1">
                        <div className="flex justify-between mb-2">
                          <div>
                            <Link 
                              to={`/products/${item.productId}`}
                              className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              {item.product.name}
                            </Link>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.product.brand} • {item.product.unit}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={isUpdating}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>

                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              ${item.price.toFixed(2)}
                              {item.product.compareAtPrice && item.product.compareAtPrice > item.price && (
                                <span className="ml-2 text-sm text-gray-500 line-through">
                                  ${item.product.compareAtPrice.toFixed(2)}
                                </span>
                              )}
                            </p>
                            {item.product.isOnSale && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <Tag size={12} />
                                Save ${((item.product.compareAtPrice || 0) - item.price).toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                              disabled={isUpdating}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              <Minus size={18} />
                            </button>
                            <span className="w-12 text-center font-semibold text-gray-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                              disabled={isUpdating || (item.product.trackInventory && item.quantity >= item.product.stock)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
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
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h2>

              {/* Promo Code */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={isApplyingPromo}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </div>

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
          {/* TODO: Add product recommendations component */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Placeholder for recommendations */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;