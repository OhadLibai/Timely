// frontend/src/pages/OrderDetail.tsx

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, ShoppingCart, Calendar, DollarSign
} from 'lucide-react';
import { useOrder } from '@/hooks';
import { StatusIndicator } from '@/components/common';
import { useCartStore } from '@/stores/cart.store';
import { formatOrderNumber, formatPrice } from '@/utils/formatters';
import DetailPage from '@/components/common/DetailPage';
import toast from 'react-hot-toast';
// ✅ ADDED: Import the ProductImage component
import ProductImage from '@/components/products/ProductImage';

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // ✅ FIXED: Use the correct 'addToCart' function from the store
  const { addToCart } = useCartStore();

  const { data: order, isLoading, error, refetch } = useOrder(id!);

  const handleReorder = () => {
    if (!order) return;
    
    // ✅ FIXED: Pass the whole product object to addToCart
    order.items.forEach(item => {
      addToCart(item.product, item.quantity);
    });
    
    toast.success(`${order.items.length} items added to cart from order ${formatOrderNumber(order.orderNumber)}`);
    navigate('/cart');
  };

  const leftColumn = order && (
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
            {/* ✅ FIXED: Replaced raw <img> with the ProductImage component */}
            <ProductImage
              src={item.product.imageUrl}
              alt={item.product.name}
              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
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
  );

  const rightColumn = order && (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Order Summary
        </h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
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
                {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'N/A'}
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

          {/* ML Temporal Information */}
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
    </div>
  );

  const headerActions = order && (
    <div className="flex items-center gap-3">
      <StatusIndicator
        status={order.status as any}
        variant="pill"
        size="md"
        showIcon={true}
      />
      <button
        onClick={handleReorder}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <ShoppingCart size={16} />
        Reorder Items
      </button>
    </div>
  );

  return (
    <DetailPage
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      backLabel="Back to Orders"
      backUrl="/orders"
      title={order ? `Order ${formatOrderNumber(order.orderNumber)}` : ''}
      subtitle={order ? `Placed on ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}` : ''}
      headerActions={headerActions}
      leftColumn={leftColumn}
      rightColumn={rightColumn}
      errorTitle="Order not found"
      errorDescription="The order you're looking for doesn't exist or has been removed."
    />
  );
};

export default OrderDetail;