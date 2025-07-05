// frontend/src/stores/cart.store.ts
// REFACTORED: Pure local state with Zustand persist - No backend calls until checkout
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Product } from '@/services/product.service';
import toast from 'react-hot-toast';

// ============================================================================
// INTERFACES - Simplified for local-first approach
// ============================================================================

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  price: number;
  addedAt: Date;
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CartState {
  cart: Cart;
  isUpdating: boolean;
  
  // Core Actions
  addToCart: (product: Product, quantity?: number) => void;
  addMultipleItems: (items: { product: Product; quantity: number }[]) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  
  // Computed Values
  getItemCount: () => number;
  getTotal: () => number;
  isProductInCart: (productId: string) => boolean;
  getCartItem: (productId: string) => CartItem | undefined;
  
  // Utility
  generateCartId: () => string;
}

// ============================================================================
// CART STORE - Pure Local State
// ============================================================================

const generateId = () => `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        cart: {
          id: generateId(),
          items: [],
          itemCount: 0,
          total: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        isUpdating: false,

        // ============================================================================
        // CORE ACTIONS - Pure Local State Updates
        // ============================================================================

        addToCart: (product: Product, quantity = 1) => {
          set({ isUpdating: true });
          
          const currentCart = get().cart;
          const existingItem = currentCart.items.find(item => item.product.id === product.id);

          if (existingItem) {
            // Update existing item quantity
            const updatedItems = currentCart.items.map(item =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            );
            
            const newCart = {
              ...currentCart,
              items: updatedItems,
              itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
              total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
              updatedAt: new Date()
            };
            
            set({ cart: newCart, isUpdating: false });
            toast.success(`Updated ${product.name} quantity`);
          } else {
            // Add new item
            const newItem: CartItem = {
              id: generateId(),
              product,
              quantity,
              price: product.price,
              addedAt: new Date()
            };
            
            const updatedItems = [...currentCart.items, newItem];
            const newCart = {
              ...currentCart,
              items: updatedItems,
              itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
              total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
              updatedAt: new Date()
            };
            
            set({ cart: newCart, isUpdating: false });
            toast.success(`${product.name} added to cart`);
          }
        },

        // NEW: Bulk add for predicted basket integration
        addMultipleItems: (items: { product: Product; quantity: number }[]) => {
          set({ isUpdating: true });
          
          const currentCart = get().cart;
          const newItems: CartItem[] = items.map(item => ({
            id: generateId(),
            product: item.product,
            quantity: item.quantity,
            price: item.product.price,
            addedAt: new Date()
          }));
          
          const updatedItems = [...currentCart.items, ...newItems];
          const newCart = {
            ...currentCart,
            items: updatedItems,
            itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            updatedAt: new Date()
          };
          
          set({ cart: newCart, isUpdating: false });
          toast.success(`Added ${items.length} items to cart`);
        },

        updateQuantity: (itemId: string, quantity: number) => {
          if (quantity < 1) {
            return get().removeItem(itemId);
          }
          
          set({ isUpdating: true });
          
          const currentCart = get().cart;
          const updatedItems = currentCart.items.map(item =>
            item.id === itemId
              ? { ...item, quantity }
              : item
          );
          
          const newCart = {
            ...currentCart,
            items: updatedItems,
            itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            updatedAt: new Date()
          };
          
          set({ cart: newCart, isUpdating: false });
        },

        removeItem: (itemId: string) => {
          set({ isUpdating: true });
          
          const currentCart = get().cart;
          const itemToRemove = currentCart.items.find(item => item.id === itemId);
          const updatedItems = currentCart.items.filter(item => item.id !== itemId);
          
          const newCart = {
            ...currentCart,
            items: updatedItems,
            itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            updatedAt: new Date()
          };
          
          set({ cart: newCart, isUpdating: false });
          
          if (itemToRemove) {
            toast.success(`${itemToRemove.product.name} removed from cart`);
          }
        },

        clearCart: () => {
          set({
            cart: {
              id: generateId(),
              items: [],
              itemCount: 0,
              total: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            isUpdating: false
          });
          toast.success('Cart cleared');
        },

        // ============================================================================
        // COMPUTED VALUES
        // ============================================================================

        getItemCount: () => {
          const { cart } = get();
          return cart.itemCount;
        },

        getTotal: () => {
          const { cart } = get();
          return cart.total;
        },

        isProductInCart: (productId: string) => {
          const { cart } = get();
          return cart.items.some(item => item.product.id === productId);
        },

        getCartItem: (productId: string) => {
          const { cart } = get();
          return cart.items.find(item => item.product.id === productId);
        },

        generateCartId: () => generateId()
      }),
      {
        name: 'timely-cart-store',
        // Only persist cart data, not loading states
        partialize: (state) => ({ cart: state.cart })
      }
    ),
    {
      name: 'cart-store'
    }
  )
);

// ============================================================================
// SIDE EFFECTS - Auto-update cart badge
// ============================================================================

useCartStore.subscribe(
  (state) => state.cart.itemCount,
  (itemCount) => {
    // Update cart badge in UI
    const event = new CustomEvent('cart-updated', { detail: { itemCount } });
    window.dispatchEvent(event);
  }
);

// ============================================================================
// ARCHITECTURE NOTES:
// 
// ✅ PURE LOCAL STATE: No backend calls until checkout
// ✅ ZUSTAND PERSIST: Cart survives page refresh
// ✅ BULK OPERATIONS: addMultipleItems for predicted basket
// ✅ OPTIMISTIC UPDATES: Instant UI feedback
// ✅ DRY PRINCIPLE: Single source of truth for cart logic
// ✅ CODE REUSABILITY: Can be used by any component
// ✅ DEMAND 4: Smooth user experience with instant updates
// 
// The cart store is now a pure local state manager that:
// 1. Handles all cart operations without backend calls
// 2. Persists data across sessions
// 3. Provides bulk operations for predicted basket integration
// 4. Maintains computed values for UI components
// 5. Integrates seamlessly with order.service.ts at checkout
// ============================================================================