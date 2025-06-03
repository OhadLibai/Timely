// frontend/src/services/cart.service.ts
import { api } from './api.client';
import { Product } from './product.service';

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  estimatedTax: number;
  estimatedTotal: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartData {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemData {
  quantity: number;
}

class CartService {
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

  // Apply coupon code
  async applyCoupon(code: string): Promise<Cart> {
    return api.post<Cart>('/cart/coupon', { code });
  }

  // Remove coupon
  async removeCoupon(): Promise<Cart> {
    return api.delete<Cart>('/cart/coupon');
  }

  // Sync cart with predicted basket
  async syncWithPredictedBasket(basketId: string): Promise<Cart> {
    return api.post<Cart>(`/cart/sync-predicted/${basketId}`);
  }

  // Get cart count (for header badge)
  async getCartCount(): Promise<number> {
    try {
      const cart = await this.getCart();
      return cart.itemCount;
    } catch {
      return 0;
    }
  }

  // Check if product is in cart
  isProductInCart(cart: Cart, productId: string): boolean {
    return cart.items.some(item => item.productId === productId);
  }

  // Get cart item by product ID
  getCartItem(cart: Cart, productId: string): CartItem | undefined {
    return cart.items.find(item => item.productId === productId);
  }

  // Calculate cart savings
  calculateSavings(cart: Cart): number {
    return cart.items.reduce((total, item) => {
      if (item.product.compareAtPrice && item.product.compareAtPrice > item.price) {
        return total + ((item.product.compareAtPrice - item.price) * item.quantity);
      }
      return total;
    }, 0);
  }

  // Validate cart stock
  async validateCartStock(): Promise<{ valid: boolean; invalidItems: string[] }> {
    return api.post<{ valid: boolean; invalidItems: string[] }>('/cart/validate');
  }

  // Local storage backup (for guest users)
  private readonly GUEST_CART_KEY = 'timely_guest_cart';

  saveGuestCart(items: Array<{ productId: string; quantity: number }>): void {
    localStorage.setItem(this.GUEST_CART_KEY, JSON.stringify(items));
  }

  getGuestCart(): Array<{ productId: string; quantity: number }> {
    const cartStr = localStorage.getItem(this.GUEST_CART_KEY);
    return cartStr ? JSON.parse(cartStr) : [];
  }

  clearGuestCart(): void {
    localStorage.removeItem(this.GUEST_CART_KEY);
  }

  // Merge guest cart with user cart after login
  async mergeGuestCart(): Promise<Cart> {
    const guestItems = this.getGuestCart();
    if (guestItems.length === 0) {
      return this.getCart();
    }

    const cart = await api.post<Cart>('/cart/merge', { items: guestItems });
    this.clearGuestCart();
    return cart;
  }
}

export const cartService = new CartService();