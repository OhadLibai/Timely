import { useQuery, UseQueryResult } from 'react-query';
import { orderService, Order, OrdersResponse, OrderFilters } from '@/services/order.service';

export const useOrders = (
  filters: OrderFilters = {}
): UseQueryResult<OrdersResponse> => {
  return useQuery(
    ['orders', filters],
    () => orderService.getOrders(filters),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
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
      staleTime: 2 * 60 * 1000, // 2 minutes - order details might change
      refetchOnWindowFocus: false,
    }
  );
};