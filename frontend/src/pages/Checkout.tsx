// frontend/src/pages/Checkout.tsx
// FIXED: Simplified checkout process - removed unused fields

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  CreditCard, MapPin, Package, CheckCircle, 
  ArrowLeft, User, Mail, Phone, Lock, Calendar
} from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { orderService } from '@/services/order.service';
import ProductImage from '@/components/products/ProductImage';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';

// FIXED: Simplified form data - removed unused fields
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
  const { user } = useAuthStore();
  const { cart, getSubtotal, getSavings, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
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

  if (!cart || cart.items.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  const subtotal = getSubtotal();
  const savings = getSavings();
  const estimatedTax = subtotal * 0.08;
  const deliveryFee = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + estimatedTax + deliveryFee - savings;

  // FIXED: Simplified onSubmit - only using fields the backend actually expects
  const onSubmit = async (data: CheckoutFormData) => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const orderData = {
        cartId: cart.id,
        paymentMethod: 'credit_card',
        deliveryAddress: {
          firstName: data.firstName,
          lastName: data.lastName,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          phone: data.phone
        },
        notes: 'Demo order from Timely checkout'
      };

      const order = await orderService.createOrder(orderData);
      
      // Clear cart after successful order
      await clearCart();
      
      toast.success('Order placed successfully! 🎉');
      navigate(`/orders/${order.id}`);
      
    } catch (error) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/cart')}
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Back to Cart
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Checkout</h1>
          
          {/* Progress Steps */}
          <div className="mt-6 flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= step.id 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  <step.icon size={16} />
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id 
                    ? 'text-indigo-600 dark:text-indigo-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {step.name}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-px mx-4 ${
                    currentStep > step.id ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Step 1: Contact & Shipping */}
              {currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <User className="text-indigo-600 dark:text-indigo-400" size={24} />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Contact & Shipping Information
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        {...register('firstName', { required: 'First name is required' })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        {...register('lastName', { required: 'Last name is required' })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        {...register('email', { 
                          required: 'Email is required',
                          pattern: {
                            value: /^\S+@\S+$/i,
                            message: 'Invalid email address'
                          }
                        })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        {...register('phone', { required: 'Phone number is required' })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 space-y-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <MapPin size={20} />
                      Shipping Address
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        {...register('address', { required: 'Address is required' })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="123 Main Street"
                      />
                      {errors.address && (
                        <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          {...register('city', { required: 'City is required' })}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {errors.city && (
                          <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          {...register('state', { required: 'State is required' })}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="CA"
                        />
                        {errors.state && (
                          <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          {...register('zipCode', { required: 'ZIP code is required' })}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="12345"
                        />
                        {errors.zipCode && (
                          <p className="text-red-500 text-sm mt-1">{errors.zipCode.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Payment (Simplified - UI only) */}
              {currentStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <CreditCard className="text-indigo-600 dark:text-indigo-400" size={24} />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Payment Information
                    </h2>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        💳 <strong>Demo Mode:</strong> Payment fields are for display only. 
                        No actual payment processing occurs.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Card Number *
                      </label>
                      <input
                        type="text"
                        {...register('cardNumber', { required: 'Card number is required' })}
                        placeholder="1234 5678 9012 3456"
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.cardNumber && (
                        <p className="text-red-500 text-sm mt-1">{errors.cardNumber.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Expiry Date *
                        </label>
                        <input
                          type="text"
                          {...register('expiryDate', { required: 'Expiry date is required' })}
                          placeholder="MM/YY"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {errors.expiryDate && (
                          <p className="text-red-500 text-sm mt-1">{errors.expiryDate.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          CVV *
                        </label>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Any 3 digits (demo only)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Review Order
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Review */}
              {currentStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle className="text-indigo-600 dark:text-indigo-400" size={24} />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Review Your Order
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {/* Contact Info Summary */}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Contact Information</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {watch('firstName')} {watch('lastName')} • {watch('email')} • {watch('phone')}
                      </p>
                    </div>

                    {/* Shipping Address Summary */}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Shipping Address</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {watch('address')}<br />
                        {watch('city')}, {watch('state')} {watch('zipCode')}
                      </p>
                    </div>

                    {/* Payment Method Summary */}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Payment Method</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Credit Card ending in {watch('cardNumber')?.slice(-4) || '****'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <LoadingSpinner size="small" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          Place Order
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Package size={20} />
                Order Summary
              </h3>

              {/* Cart Items */}
              <div className="space-y-3 mb-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <ProductImage
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Qty: {item.quantity} × ${item.product.price.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ${(item.quantity * item.product.price).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">${subtotal.toFixed(2)}</span>
                </div>
                
                {savings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Savings</span>
                    <span className="text-green-600 dark:text-green-400">-${savings.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Delivery</span>
                  <span className="text-gray-900 dark:text-white">
                    {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="text-gray-900 dark:text-white">${estimatedTax.toFixed(2)}</span>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-semibold">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white text-lg">${total.toFixed(2)}</span>
                </div>
              </div>

              {deliveryFee > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    💡 Add ${(50 - subtotal).toFixed(2)} more for free delivery!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;