import { useQuery, UseQueryResult } from 'react-query';
import { orderService, Order, OrdersResponse, OrderFilters } from '@/services/order.service';
import { QUERY_CONFIGS } from '@/utils/queryConfig';

export const useOrders = (
  filters: OrderFilters = {}
): UseQueryResult<OrdersResponse> => {
  return useQuery(
    ['orders', filters],
    () => orderService.getOrders(filters),
    QUERY_CONFIGS.FREQUENT_DATA
  );
};

export const useOrder = (
  orderId: string
): UseQueryResult<Order> => {
  return useQuery(
    ['order', orderId],
    () => orderService.getOrder(orderId),
    {
      enabled: !!orderId,
      ...QUERY_CONFIGS.ADMIN_DATA, // Order details might change
    }
  );
};