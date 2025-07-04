// frontend/src/services/order.service.ts
// CLEANED: Removed all tracking/delivery functionality - Focus on ML basket prediction

import { api } from '@/services/api.client';
import { Product } from '@/services/product.service';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;

  // ML fields
  addToCartOrder?: number;
  reordered?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'; // Simplified statuses
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  metadata: Record<string, any>;

  // ML fields for Instacart compatibility
  orderSequence?: number;
  daysSincePriorOrder?: number;
  orderDow?: number;
  orderHourOfDay?: number;
  instacartOrderId?: number;
}


// Simplified order creation - no delivery address needed
export interface CreateOrderData {
  cartId: string;
  paymentMethod: string;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
}

// --- SERVICE CLASS (API communication only) ---
class OrderService {
  async createOrder(data: CreateOrderData): Promise<Order> {
    return api.post<Order>('/orders/create', data);
  }

  async getOrders(filters: OrderFilters = {}): Promise<OrdersResponse> {
    const params = new URLSearchParams(/* ... */);
    return api.get<OrdersResponse>(`/orders?${params.toString()}`);
  }

  async getOrder(orderId: string): Promise<Order> {
    return api.get<Order>(`/orders/${orderId}`);
  }
}

export const orderService = new OrderService();
