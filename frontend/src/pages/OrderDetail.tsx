// frontend/src/pages/OrderDetail.tsx
// CLEANED: Removed all tracking/delivery UI - Focus on basket prediction demonstration

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Package, CheckCircle, Clock, 
  DollarSign, Calendar, RefreshCcw, ShoppingCart
} from 'lucide-react';
import { useOrder } from '@/hooks';
import { AsyncStateWrapper, StatusIndicator } from '@/components/common';
import toast from 'react-hot-toast';
import { useCartStore } from '@/stores/cart.store';
import { formatOrderNumber, formatPrice } from '@/utils/formatters';

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  const { data: order, isLoading, error, refetch } = useOrder(id!);


  const handleReorder = () => {
    if (!order) return;
    
    // Add all items from this order to cart
    order.items.forEach(item => {
      addItem({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        image: item.product.imageUrl || '/placeholder.jpg'
      }, item.quantity);
    });
    
    toast.success(`${order.items.length} items added to cart from order ${order.orderNumber}`);
    navigate('/cart');
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Order not found
          </h2>
          <p className="text-gray-600 mb-6">
            The order you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 mx-auto bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-500 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Orders
        </button>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order {formatOrderNumber(order.orderNumber)}
            </h1>
            <div className="flex items-center gap-4">
              <StatusIndicator
                status={order.status as any}
                variant="pill"
                size="md"
                showIcon={true}
              />
              <span className="text-gray-500">
                Placed on {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleReorder}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ShoppingCart size={16} />
              Reorder Items
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Order Items ({order.items.length})
            </h3>
            
            <div className="space-y-4">
              {order.items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
                >
                  <img
                    src={item.product.imageUrl || '/placeholder.jpg'}
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {item.product.name}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Qty: {item.quantity}</span>
                      <span>{formatPrice(item.price)} each</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatPrice(item.total)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Order Total */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Order Summary
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(order.subtotal)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">{formatPrice(order.tax)}</span>
              </div>
              
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Order Information
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="text-gray-400" size={16} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Order Date
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <DollarSign className="text-gray-400" size={16} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Payment Method
                  </p>
                  <p className="text-sm text-gray-600 capitalize">
                    {order.paymentMethod}
                  </p>
                </div>
              </div>

              {/* ML Temporal Information - For demonstration purposes */}
              {(order.orderDow !== undefined || order.orderHourOfDay !== undefined) && (
                <div className="flex items-center gap-3">
                  <Package className="text-gray-400" size={16} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Order Timing
                    </p>
                    <p className="text-sm text-gray-600">
                      {order.orderDow !== undefined && `Day ${order.orderDow}`}
                      {order.orderHourOfDay !== undefined && ` at ${order.orderHourOfDay}:00`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Notes */}
          {order.notes && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Notes
              </h3>
              <p className="text-sm text-gray-600">
                {order.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;