// frontend/src/pages/Checkout.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { 
  CreditCard, MapPin, Calendar, Clock, Package, 
  Check, ChevronRight, Shield, Info, Truck,
  Home, Building, AlertCircle
} from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { orderService } from '@/services/order.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import toast from 'react-hot-toast';

interface CheckoutFormData {
  // Delivery Address
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  addressType: 'home' | 'work' | 'other';
  
  // Delivery Options
  deliveryType: 'standard' | 'express' | 'scheduled';
  scheduledDate?: string;
  scheduledTimeStart?: string;
  scheduledTimeEnd?: string;
  deliveryNotes?: string;
  
  // Payment
  paymentMethod: 'card' | 'paypal' | 'applepay' | 'googlepay';
  cardNumber?: string;
  cardName?: string;
  cardExpiry?: string;
  cardCvc?: string;
  
  // Additional
  saveAddress: boolean;
  savePayment: boolean;
}

const deliveryOptions = [
  {
    type: 'standard',
    name: 'Standard Delivery',
    description: '3-5 business days',
    price: 4.99,
    icon: Truck
  },
  {
    type: 'express',
    name: 'Express Delivery',
    description: 'Next business day',
    price: 12.99,
    icon: Package
  },
  {
    type: 'scheduled',
    name: 'Scheduled Delivery',
    description: 'Pick your date and time',
    price: 7.99,
    icon: Calendar
  }
];

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { cart, isLoading: isCartLoading, fetchCart, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    trigger
  } = useForm<CheckoutFormData>({
    defaultValues: {
      country: 'USA',
      addressType: 'home',
      deliveryType: 'standard',
      paymentMethod: 'card',
      saveAddress: true,
      savePayment: false
    }
  });

  const deliveryType = watch('deliveryType');
  const addressType = watch('addressType');

  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      navigate('/cart');
    }
  }, [cart, navigate]);

  const handleStepSubmit = async () => {
    let fieldsToValidate: (keyof CheckoutFormData)[] = [];
    
    if (currentStep === 1) {
      fieldsToValidate = ['addressLine1', 'city', 'state', 'zipCode'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['deliveryType'];
      if (deliveryType === 'scheduled') {
        fieldsToValidate.push('scheduledDate', 'scheduledTimeStart');
      }
    }
    
    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    setIsProcessing(true);
    
    try {
      // Create order
      const orderData = {
        deliveryAddress: {
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country,
          type: data.addressType
        },
        deliveryOptions: {
          type: data.deliveryType,
          scheduledDate: data.scheduledDate,
          scheduledTimeStart: data.scheduledTimeStart,
          scheduledTimeEnd: data.scheduledTimeEnd,
          notes: data.deliveryNotes
        },
        paymentMethod: data.paymentMethod,
        saveAddress: data.saveAddress,
        savePayment: data.savePayment
      };

      const order = await orderService.createOrder(orderData);
      
      // Clear cart
      await clearCart();
      
      // Show success message
      toast.success('Order placed successfully!');
      
      // Redirect to order confirmation
      navigate(`/orders/${order.id}`, { 
        state: { justCreated: true } 
      });
      
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
      setIsProcessing(false);
    }
  };

  if (isCartLoading) {
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
        description="Add some products to proceed with checkout"
        action={{
          label: "Continue Shopping",
          onClick: () => navigate('/products')
        }}
      />
    );
  }

  const deliveryFee = deliveryOptions.find(opt => opt.type === deliveryType)?.price || 0;
  const subtotal = cart.subtotal;
  const tax = subtotal * 0.08;
  const total = subtotal + tax + deliveryFee;

  const steps = [
    { number: 1, title: 'Delivery Address' },
    { number: 2, title: 'Delivery Options' },
    { number: 3, title: 'Payment' },
    { number: 4, title: 'Review & Confirm' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Checkout
          </h1>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between max-w-3xl">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      step.number <= currentStep
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {step.number < currentStep ? <Check size={20} /> : step.number}
                  </div>
                  <span className={`ml-3 text-sm font-medium ${
                    step.number <= currentStep
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    step.number < currentStep
                      ? 'bg-indigo-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                {/* Step 1: Delivery Address */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Delivery Address
                    </h2>

                    {/* Address Type */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Address Type
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'home', label: 'Home', icon: Home },
                          { value: 'work', label: 'Work', icon: Building },
                          { value: 'other', label: 'Other', icon: MapPin }
                        ].map(({ value, label, icon: Icon }) => (
                          <label
                            key={value}
                            className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              addressType === value
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <input
                              {...register('addressType')}
                              type="radio"
                              value={value}
                              className="sr-only"
                            />
                            <Icon className={`w-6 h-6 mb-2 ${
                              addressType === value ? 'text-indigo-600' : 'text-gray-400'
                            }`} />
                            <span className={`text-sm font-medium ${
                              addressType === value 
                                ? 'text-indigo-600' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Address Fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Street Address
                        </label>
                        <input
                          {...register('addressLine1', { required: 'Address is required' })}
                          type="text"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                            errors.addressLine1 ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                          placeholder="123 Main Street"
                        />
                        {errors.addressLine1 && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.addressLine1.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Apartment, suite, etc. (optional)
                        </label>
                        <input
                          {...register('addressLine2')}
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="Apt 4B"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            City
                          </label>
                          <input
                            {...register('city', { required: 'City is required' })}
                            type="text"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                              errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="New York"
                          />
                          {errors.city && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.city.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            State
                          </label>
                          <input
                            {...register('state', { required: 'State is required' })}
                            type="text"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                              errors.state ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="NY"
                          />
                          {errors.state && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.state.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ZIP Code
                          </label>
                          <input
                            {...register('zipCode', { 
                              required: 'ZIP code is required',
                              pattern: {
                                value: /^\d{5}(-\d{4})?$/,
                                message: 'Invalid ZIP code'
                              }
                            })}
                            type="text"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                              errors.zipCode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="10001"
                          />
                          {errors.zipCode && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.zipCode.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Country
                          </label>
                          <select
                            {...register('country')}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          >
                            <option value="USA">United States</option>
                            <option value="CAN">Canada</option>
                            <option value="MEX">Mexico</option>
                          </select>
                        </div>
                      </div>

                      <label className="flex items-center gap-3">
                        <input
                          {...register('saveAddress')}
                          type="checkbox"
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Save this address for future orders
                        </span>
                      </label>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={handleStepSubmit}
                        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        Continue to Delivery
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Delivery Options */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Delivery Options
                    </h2>

                    <div className="space-y-4">
                      {deliveryOptions.map((option) => (
                        <label
                          key={option.type}
                          className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            deliveryType === option.type
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <input
                            {...register('deliveryType')}
                            type="radio"
                            value={option.type}
                            className="sr-only"
                          />
                          <option.icon className={`w-6 h-6 mr-4 mt-0.5 ${
                            deliveryType === option.type ? 'text-indigo-600' : 'text-gray-400'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className={`font-semibold ${
                                  deliveryType === option.type 
                                    ? 'text-indigo-600' 
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {option.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {option.description}
                                </p>
                              </div>
                              <span className={`font-semibold ${
                                deliveryType === option.type 
                                  ? 'text-indigo-600' 
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                ${option.price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Scheduled Delivery Options */}
                    {deliveryType === 'scheduled' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                          Schedule Your Delivery
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Delivery Date
                            </label>
                            <input
                              {...register('scheduledDate', {
                                required: deliveryType === 'scheduled' ? 'Date is required' : false
                              })}
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Time Window
                            </label>
                            <select
                              {...register('scheduledTimeStart', {
                                required: deliveryType === 'scheduled' ? 'Time is required' : false
                              })}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">Select time</option>
                              <option value="08:00">8:00 AM - 10:00 AM</option>
                              <option value="10:00">10:00 AM - 12:00 PM</option>
                              <option value="12:00">12:00 PM - 2:00 PM</option>
                              <option value="14:00">2:00 PM - 4:00 PM</option>
                              <option value="16:00">4:00 PM - 6:00 PM</option>
                              <option value="18:00">6:00 PM - 8:00 PM</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Delivery Notes */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Delivery Instructions (optional)
                      </label>
                      <textarea
                        {...register('deliveryNotes')}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Leave at door, ring bell, etc."
                      />
                    </div>

                    <div className="mt-6 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleStepSubmit}
                        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        Continue to Payment
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Payment */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Payment Method
                    </h2>

                    <div className="mb-6">
                      <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Shield className="w-6 h-6 text-green-600" />
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Your payment information is encrypted and secure
                        </p>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {[
                        { value: 'card', label: 'Credit/Debit Card' },
                        { value: 'paypal', label: 'PayPal' },
                        { value: 'applepay', label: 'Apple Pay' },
                        { value: 'googlepay', label: 'Google Pay' }
                      ].map((method) => (
                        <label
                          key={method.value}
                          className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            watch('paymentMethod') === method.value
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <input
                            {...register('paymentMethod')}
                            type="radio"
                            value={method.value}
                            className="sr-only"
                          />
                          <span className={`font-medium ${
                            watch('paymentMethod') === method.value
                              ? 'text-indigo-600'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {method.label}
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* Card Details (Demo) */}
                    {watch('paymentMethod') === 'card' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              <p className="font-medium mb-1">Demo Mode</p>
                              <p>Use card number: 4242 4242 4242 4242</p>
                              <p>Any future expiry date and any 3-digit CVC</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Card Number
                          </label>
                          <input
                            {...register('cardNumber')}
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cardholder Name
                          </label>
                          <input
                            {...register('cardName')}
                            type="text"
                            placeholder="John Doe"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Expiry Date
                            </label>
                            <input
                              {...register('cardExpiry')}
                              type="text"
                              placeholder="MM/YY"
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              CVC
                            </label>
                            <input
                              {...register('cardCvc')}
                              type="text"
                              placeholder="123"
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Alternative Payment Messages */}
                    {watch('paymentMethod') !== 'card' && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                        <p className="text-gray-600 dark:text-gray-400">
                          You will be redirected to {
                            watch('paymentMethod') === 'paypal' ? 'PayPal' :
                            watch('paymentMethod') === 'applepay' ? 'Apple Pay' :
                            'Google Pay'
                          } to complete your payment
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        Review Order
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Review & Confirm */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Order Review */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        Review Your Order
                      </h2>

                      {/* Delivery Address Summary */}
                      <div className="mb-6">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                          Delivery Address
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {watch('addressLine1')}<br />
                          {watch('addressLine2') && <>{watch('addressLine2')}<br /></>}
                          {watch('city')}, {watch('state')} {watch('zipCode')}
                        </p>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          Edit
                        </button>
                      </div>

                      {/* Delivery Method Summary */}
                      <div className="mb-6">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                          Delivery Method
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {deliveryOptions.find(opt => opt.type === deliveryType)?.name}
                          {deliveryType === 'scheduled' && watch('scheduledDate') && (
                            <><br />Scheduled for: {new Date(watch('scheduledDate')!).toLocaleDateString()}</>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          Edit
                        </button>
                      </div>

                      {/* Payment Summary */}
                      <div className="mb-6">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                          Payment Method
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {watch('paymentMethod') === 'card' ? 'Credit/Debit Card' :
                           watch('paymentMethod') === 'paypal' ? 'PayPal' :
                           watch('paymentMethod') === 'applepay' ? 'Apple Pay' : 'Google Pay'}
                          {watch('paymentMethod') === 'card' && watch('cardNumber') && (
                            <><br />**** **** **** {watch('cardNumber')!.slice(-4)}</>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          Edit
                        </button>
                      </div>

                      {/* Items Summary */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                          Order Items ({cart.itemCount})
                        </h3>
                        <div className="space-y-3">
                          {cart.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <img
                                src={item.product.imageUrl || '/placeholder.png'}
                                alt={item.product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.product.name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Qty: {item.quantity} × ${item.price.toFixed(2)}
                                </p>
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                ${(item.quantity * item.price).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {cart.items.length > 3 && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              and {cart.items.length - 3} more items...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Place Order Button */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <LoadingSpinner size="small" className="text-white" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard size={20} />
                            Place Order • ${total.toFixed(2)}
                          </>
                        )}
                      </button>

                      <p className="mt-4 text-xs text-center text-gray-600 dark:text-gray-400">
                        By placing this order, you agree to our Terms of Service and Privacy Policy
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h2>

              {/* Items */}
              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.product.imageUrl || '/placeholder.png'}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Qty: {item.quantity}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ${(item.quantity * item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 py-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Delivery</span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="w-4 h-4" />
                <span>Secure checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;