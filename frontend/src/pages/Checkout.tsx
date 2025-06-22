// frontend/src/pages/Checkout.tsx
// CLEANED UP: Simplified checkout process for demo purposes

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
  
  // Payment Information
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  
  // Preferences
  saveAddress: boolean;
  savePayment: boolean;
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
                  <div className="w-16 h-px bg-gray-200 dark:bg-gray-700 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
            
            {/* Checkout Form */}
            <div className="lg:col-span-7">
              
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

                  <div className="space-y-6">
                    {/* Contact Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Contact Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    {/* Shipping Address */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Shipping Address
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Street Address *
                          </label>
                          <input
                            type="text"
                            {...register('address', { required: 'Address is required' })}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            />
                            {errors.zipCode && (
                              <p className="text-red-500 text-sm mt-1">{errors.zipCode.message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('saveAddress')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Save this address for future orders
                      </label>
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

              {/* Step 2: Payment */}
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cardholder Name *
                      </label>
                      <input
                        type="text"
                        {...register('cardholderName', { required: 'Cardholder name is required' })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.cardholderName && (
                        <p className="text-red-500 text-sm mt-1">{errors.cardholderName.message}</p>
                      )}
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
                          {...register('cvv', { required: 'CVV is required' })}
                          placeholder="123"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {errors.cvv && (
                          <p className="text-red-500 text-sm mt-1">{errors.cvv.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('savePayment')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Save this payment method for future orders
                      </label>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Lock className="text-gray-600 dark:text-gray-400" size={16} />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Your payment information is encrypted and secure
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
                          <CheckCircle size={16} />
                          Place Order
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="mt-10 lg:mt-0 lg:col-span-5">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  Order Summary
                </h2>

                {/* Cart Items */}
                <div className="space-y-4 mb-6">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <ProductImage
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ${(Number(item.product.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
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
                    <span className="text-gray-600 dark:text-gray-400">Tax</span>
                    <span className="text-gray-900 dark:text-white">${estimatedTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Delivery</span>
                    <span className="text-gray-900 dark:text-white">${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-medium border-t border-gray-200 dark:border-gray-700 pt-3">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-gray-900 dark:text-white">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;