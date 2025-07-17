import { UseQueryResult } from 'react-query';
import { orderService, Order, OrdersResponse, OrderFilters } from '@/services/order.service';
import { useApiQuery } from './useApiQuery';
import { QUERY_KEYS } from '@/utils/queryKeys';

export const useOrders = (
  filters: OrderFilters = {}
): UseQueryResult<OrdersResponse> => {
  return useApiQuery(
    QUERY_KEYS.orders(filters),
    () => orderService.getOrders(filters),
    {
      staleTime: 'stable',
    }
  );
};

export const useOrder = (
  orderId: string
): UseQueryResult<Order> => {
  return useApiQuery(
    QUERY_KEYS.order(orderId),
    () => orderService.getOrder(orderId),
    {
      enabled: !!orderId,
      staleTime: 'stable',
    }
  );
};