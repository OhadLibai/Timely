// frontend/src/services/order.service.ts

import { api } from '@/services/api.client';
import { useAuthStore } from '@/stores/auth.store';
import { Product } from '@/services/product.service';
import { authService } from './auth.service';

export interface OrderItem {
  id: string;
  orderId: string;
  product: Product;
  quantity: number;
  price: number;
  total: number;

  // ML fields
  addToCartOrder?: number;
  reordered?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  metadata: Record<string, any>;
  createdAt?: string;

  // ML fields for Instacart compatibility
  orderSequence?: number;
  daysSincePriorOrder?: number;
  orderDow?: number;
  orderHourOfDay?: number;
  instacartOrderId?: number;
}

// Simplified order creation
export interface CreateOrderData {
  cartId: string;
  paymentMethod: string;
}

export interface OrderFilters {
  status?: string;
  limit?: number;
  page?: number;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================================================
// ORDER SERVICE CLASS - MINIMAL IMPLEMENTATION
// ============================================================================
class OrderService {

  /**
   * Create order - Backend needs userId to know which user is creating the order
   */
  async createOrder(data: CreateOrderData): Promise<Order> {
    const userId = authService.getUser()?.id;
    return api.post<Order>(`/orders/create/${userId}`, data);
  }

  /**
   * Get user's orders - Backend needs userId to return correct user's orders
   * MINIMAL: No complex filtering logic, components handle filtering
   */
  async getOrders(filters: OrderFilters = {}): Promise<OrdersResponse> {
    const userId = authService.getUser()?.id;
    const params = new URLSearchParams();
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.status) {
      params.append('status', filters.status);
    }
    return api.get<OrdersResponse>(`/orders/user/${userId}?${params.toString()}`);
  }

  /**
   * Get single order - OrderIds are globally unique, no userId needed
   * SIMPLE: Direct order lookup by globally unique orderId
   */
  async getOrder(orderId: string): Promise<Order> {
    return api.get<Order>(`/orders/${orderId}`);
  }
}

export const orderService = new OrderService();