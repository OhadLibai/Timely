// frontend/src/pages/Orders.tsx
// CLEANED: Removed all tracking/shipping UI - Focus on order history for ML demonstrations

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye, Calendar, DollarSign, Package, ShoppingCart, Filter
} from 'lucide-react';
import { useOrders } from '@/hooks';
import { AsyncStateWrapper, StatusIndicator } from '@/components/common';
import EmptyState from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import { AnimatedContainer } from '@/components/common/AnimatedContainer';
import { formatOrderNumber, formatPrice } from '@/utils/formatters';

const Orders: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  const { data: ordersResponse, isLoading, error, refetch } = useOrders();

  const orders = ordersResponse?.orders || [];

  const filteredOrders = orders.filter(order => 
    filter === 'all' || order.status === filter
  );

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);



  return (
    <AsyncStateWrapper
      loading={isLoading}
      error={error}
      onRetry={refetch}
      isEmpty={!orders || orders.length === 0}
      emptyState={
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Start shopping to see your order history here."
          action={{
            label: "Browse Products",
            href: "/products"
          }}
        />
      }
      errorTitle="Failed to load orders"
      errorDescription="Something went wrong while fetching your orders."
      className="max-w-6xl mx-auto px-4 py-8"
    >
      <PageHeader
        title="Order History"
        description="View your past orders and reorder your favorite items"
        icon={Package}
        actions={
          orders.length > 0 && (
            <Button variant="outline" icon={Filter}>
              Filter Orders
            </Button>
          )
        }
      />

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Orders', count: orders.length },
            { key: 'pending', label: 'Pending', count: statusCounts.pending || 0 },
            { key: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed || 0 },
            { key: 'completed', label: 'Completed', count: statusCounts.completed || 0 },
            { key: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled || 0 }
          ].map(({ key, label, count }) => (
            <Button
              key={key}
              onClick={() => setFilter(key as any)}
              variant={filter === key ? 'primary' : 'outline'}
              size="sm"
            >
              {label} ({count})
            </Button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order, index) => (
          <AnimatedContainer
            key={order.id}
            preset="fadeInUp"
            delay={index * 0.1}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Order {formatOrderNumber(order.orderNumber)}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar size={14} />
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{order.items.length} items</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <StatusIndicator
                  status={order.status as any}
                  variant="pill"
                  size="sm"
                />
                
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatPrice(order.total)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {order.paymentStatus === 'completed' ? 'Paid' : 'Pending Payment'}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items Preview */}
            <div className="mb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {order.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2 min-w-max">
                    <img
                      src={item.product.imageUrl || '/placeholder.jpg'}
                      alt={item.product.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-white truncate max-w-32">
                        {item.product.name}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Qty: {item.quantity}
                      </div>
                    </div>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 px-2">
                    +{order.items.length - 3} more
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <DollarSign size={14} />
                <span>Payment: {order.paymentMethod}</span>
              </div>
              
              <div className="flex gap-2">
                <Link
                  to={`/orders/${order.id}`}
                  className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  <Eye size={16} />
                  View Details
                </Link>
                
                {order.status === 'completed' && (
                  <Link
                    to={`/orders/${order.id}`}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    <ShoppingCart size={16} />
                    Reorder
                  </Link>
                )}
              </div>
            </div>
          </AnimatedContainer>
        ))}
      </div>

      {filteredOrders.length === 0 && filter !== 'all' && (
        <div className="text-center py-12">
          <Package className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No {filter} orders
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have any orders with this status.
          </p>
        </div>
      )}
    </AsyncStateWrapper>
  );
};

export default Orders;