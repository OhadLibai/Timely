// frontend/src/pages/Checkout.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  CreditCard, MapPin, Package, CheckCircle, 
  ArrowLeft, User, Lock
} from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { orderService } from '@/services/order.service';
import ProductImage from '@/components/products/ProductImage';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import { formatPrice, calculateItemTotal } from '@/utils/formatters';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import toast from 'react-hot-toast';

interface CheckoutFormData {
  // Contact Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Shipping Address
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Payment Information (for UI display only - not submitted to backend)
  cardNumber: string;
  expiryDate: string;
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { cart, getTotal, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<CheckoutFormData>();

  // Pre-fill user information
  useEffect(() => {
    if (user) {
      setValue('firstName', user.firstName || '');
      setValue('lastName', user.lastName || '');
      setValue('email', user.email || '');
    }
  }, [user, setValue]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      navigate('/cart');
    }
  }, [cart, navigate]);

  // Check authentication before allowing checkout
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Sign in to Continue
            </h2>
            <p className="text-gray-600 mb-6">
              Please sign in to your account to complete your order.
            </p>
            <div className="space-y-3">
              <Link
                to="/login"
                className="w-full inline-flex justify-center py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="w-full inline-flex justify-center py-3 px-4 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Create Account
              </Link>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate('/cart')}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                ← Back to Cart
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  const total = getTotal();

  const onSubmit = async (data: CheckoutFormData) => {
    setIsProcessing(true);
    
    try {
      if (!cart || !cart.id) {
        throw new Error('Cart is missing or invalid');
      }
      
      if (!cart.items || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const orderData = {
        items: cart.items,
        paymentMethod: 'card'
      };

      const order = await orderService.createOrder(orderData);
      
      // Clear cart after successful order
      clearCart();
      
      toast.success('Order placed successfully! 🎉');
      navigate(`/orders/${order.id}`);
      
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error('Failed to process order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    { id: 1, name: 'Contact & Shipping', icon: User },
    { id: 2, name: 'Payment', icon: CreditCard },
    { id: 3, name: 'Review', icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <PageHeader
          title="Checkout"
          description="Complete your order with secure payment"
          icon={CreditCard}
          breadcrumb={
            <Button
              onClick={() => navigate('/cart')}
              variant="ghost"
              icon={ArrowLeft}
              size="sm"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Back to Cart
            </Button>
          }
        />

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= step.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                <step.icon size={16} />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= step.id 
                  ? 'text-indigo-600' 
                  : 'text-gray-500'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`mx-4 h-0.5 w-12 ${
                  currentStep > step.id 
                    ? 'bg-indigo-600' 
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <ResponsiveGrid cols={{ sm: 1, lg: 3 }} gap={8}>
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Contact & Shipping Information */}
              {currentStep >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <User size={20} />
                    Contact & Shipping Information
                  </h2>
                  
                  {/* Contact Information */}
                  <ResponsiveGrid cols={{ sm: 1, md: 2 }} gap={4} className="mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        {...register('firstName')}
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        {...register('lastName')}
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                      )}
                    </div>
                  </ResponsiveGrid>
                  
                  <ResponsiveGrid cols={{ sm: 1, md: 2 }} gap={4} className="mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        {...register('email')}
                        type="email"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        {...register('phone')}
                        type="tel"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                      )}
                    </div>
                  </ResponsiveGrid>
                  
                  {/* Shipping Address */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <MapPin size={16} />
                      Shipping Address
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          {...register('address')}
                          type="text"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {errors.address && (
                          <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                        )}
                      </div>
                      
                      <ResponsiveGrid cols={{ sm: 1, md: 3 }} gap={4}>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            {...register('city')}
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {errors.city && (
                            <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State
                          </label>
                          <input
                            {...register('state')}
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {errors.state && (
                            <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ZIP Code
                          </label>
                          <input
                            {...register('zipCode')}
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {errors.zipCode && (
                            <p className="text-red-500 text-xs mt-1">{errors.zipCode.message}</p>
                          )}
                        </div>
                      </ResponsiveGrid>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-6">
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      variant="primary"
                    >
                      Continue to Payment
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Payment Information */}
              {currentStep >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <CreditCard size={20} />
                    Payment Information
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Card Number
                      </label>
                      <input
                        {...register('cardNumber')}
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.cardNumber && (
                        <p className="text-red-500 text-xs mt-1">{errors.cardNumber.message}</p>
                      )}
                    </div>
                    
                    <ResponsiveGrid cols={{ sm: 2 }} gap={4}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          {...register('expiryDate')}
                          type="text"
                          placeholder="MM/YY"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {errors.expiryDate && (
                          <p className="text-red-500 text-xs mt-1">{errors.expiryDate.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CVV
                        </label>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </ResponsiveGrid>
                  </div>
                  
                  <div className="flex justify-between pt-6">
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      variant="outline"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      variant="primary"
                    >
                      Review Order
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Order Review */}
              {currentStep >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Review Your Order
                  </h2>
                  
                  <div className="text-sm text-gray-600 mb-6">
                    Please review your order details before placing your order.
                  </div>
                  
                  <div className="flex justify-between pt-6">
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      variant="outline"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isProcessing}
                      variant="primary"
                      loading={isProcessing}
                      icon={isProcessing ? undefined : CheckCircle}
                    >
                      {isProcessing ? 'Processing...' : 'Place Order'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package size={20} />
                Order Summary
              </h3>

              {/* Cart Items */}
              <div className="space-y-3 mb-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 flex-shrink-0">
                      <ProductImage
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(calculateItemTotal(item.price, item.quantity))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="space-y-2 text-sm border-t border-gray-200 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </ResponsiveGrid>
      </div>
    </div>
  );
};

export default Checkout;