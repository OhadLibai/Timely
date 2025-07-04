
// This is file is to the garbage of dev dump


/*
// frontend/src/services/cart.service.ts
// CLEANED: Removed coupon methods that backend doesn't support

import { api } from '@/services/api.client';
import { Product } from '@/services/product.service';

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  total: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isActive: boolean;
}

export interface AddToCartData {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemData {
  quantity: number;
}

class CartService {
  
  // ============================================================================
  // CORE CART OPERATIONS (Essential functionality)
  // ============================================================================

  // Get current cart
  async getCart(): Promise<Cart> {
    return api.get<Cart>('/cart');
  }

  // Add item to cart
  async addToCart(data: AddToCartData): Promise<Cart> {
    return api.post<Cart>('/cart/add', data);
  }

  // Update cart item quantity
  async updateCartItem(itemId: string, data: UpdateCartItemData): Promise<Cart> {
    return api.put<Cart>(`/cart/items/${itemId}`, data);
  }

  // Remove item from cart
  async removeFromCart(itemId: string): Promise<Cart> {
    return api.delete<Cart>(`/cart/items/${itemId}`);
  }

  // Clear entire cart
  async clearCart(): Promise<Cart> {
    return api.post<Cart>('/cart/clear');
  }

  // ============================================================================
  // ML INTEGRATION (Supporting core demands)
  // ============================================================================

  // Sync cart with predicted basket
  async syncWithPredictedBasket(basketId: string): Promise<Cart> {
    return api.post<Cart>(`/cart/sync-predicted/${basketId}`);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  // Check if product is in cart
  isProductInCart(cart: Cart, productId: string): boolean {
    return cart.items.some(item => item.productId === productId);
  }
}

export const cartService = new CartService();

*/