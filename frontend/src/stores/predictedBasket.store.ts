// frontend/src/stores/predictedBasket.store.ts
// NEW: Local state manager for predicted basket editing with persistence
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Product } from '@/services/product.service';

// ============================================================================
// INTERFACES - Predicted Basket Local State
// ============================================================================

export interface PredictedBasketItem {
  id: string;
  product: Product;
  quantity: number;
  confidenceScore: number; // Mock value for placard display
  isAccepted: boolean;
  originalRank: number; // Order from ML prediction
  isEdited: boolean; // Track if user modified this item
}

export interface PredictedBasket {
  id: string;
  items: PredictedBasketItem[];
  generatedAt: Date;
  lastEditedAt: Date;
  totalItems: number;
  totalValue: number;
  avgConfidence: number;
  acceptedCount: number;
}

interface PredictedBasketState {
  basket: PredictedBasket | null;
  isLoading: boolean;
  hasUnsavedEdits: boolean;
  
  // Core Actions
  setBasket: (items: { product: Product; quantity: number }[]) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  toggleItemAcceptance: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  addCustomItem: (product: Product, quantity?: number) => void;
  clearBasket: () => void;
  resetEdits: () => void;
  
  // Computed Values
  getAcceptedItems: () => PredictedBasketItem[];
  getStats: () => {
    totalItems: number;
    totalValue: number;
    avgConfidence: number;
    acceptanceRate: number;
  };
  
  // Utility
  markAsGenerated: () => void;
  generateItemId: () => string;
}

// ============================================================================
// PREDICTED BASKET STORE - Local Edits with Persist
// ============================================================================

const generateId = () => `predicted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Mock confidence score generator (temporary)
const generateMockConfidence = (): number => {
  return Math.random() * 0.3 + 0.7; // Between 0.7 and 1.0
};

export const usePredictedBasketStore = create<PredictedBasketState>()(
  devtools(
    persist(
      (set, get) => ({
        basket: null,
        isLoading: false,
        hasUnsavedEdits: false,

        // ============================================================================
        // CORE ACTIONS - Local State Management
        // ============================================================================

        setBasket: (items: { product: Product; quantity: number }[]) => {
          const basketItems: PredictedBasketItem[] = items.map((item, index) => ({
            id: generateId(),
            product: item.product,
            quantity: item.quantity,
            confidenceScore: generateMockConfidence(),
            isAccepted: true, // Default to accepted
            originalRank: index + 1,
            isEdited: false
          }));

          const basket: PredictedBasket = {
            id: generateId(),
            items: basketItems,
            generatedAt: new Date(),
            lastEditedAt: new Date(),
            totalItems: basketItems.length,
            totalValue: basketItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
            avgConfidence: basketItems.reduce((sum, item) => sum + item.confidenceScore, 0) / basketItems.length,
            acceptedCount: basketItems.filter(item => item.isAccepted).length
          };

          set({ basket, hasUnsavedEdits: false });
        },

        updateItemQuantity: (itemId: string, quantity: number) => {
          const currentBasket = get().basket;
          if (!currentBasket) return;

          if (quantity < 1) {
            return get().removeItem(itemId);
          }

          const updatedItems = currentBasket.items.map(item =>
            item.id === itemId
              ? { ...item, quantity, isEdited: true }
              : item
          );

          const updatedBasket = {
            ...currentBasket,
            items: updatedItems,
            lastEditedAt: new Date(),
            totalItems: updatedItems.filter(item => item.isAccepted).length,
            totalValue: updatedItems
              .filter(item => item.isAccepted)
              .reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
            acceptedCount: updatedItems.filter(item => item.isAccepted).length
          };

          set({ basket: updatedBasket, hasUnsavedEdits: true });
        },

        toggleItemAcceptance: (itemId: string) => {
          const currentBasket = get().basket;
          if (!currentBasket) return;

          const updatedItems = currentBasket.items.map(item =>
            item.id === itemId
              ? { ...item, isAccepted: !item.isAccepted, isEdited: true }
              : item
          );

          const updatedBasket = {
            ...currentBasket,
            items: updatedItems,
            lastEditedAt: new Date(),
            totalItems: updatedItems.filter(item => item.isAccepted).length,
            totalValue: updatedItems
              .filter(item => item.isAccepted)
              .reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
            acceptedCount: updatedItems.filter(item => item.isAccepted).length
          };

          set({ basket: updatedBasket, hasUnsavedEdits: true });
        },

        removeItem: (itemId: string) => {
          const currentBasket = get().basket;
          if (!currentBasket) return;

          const updatedItems = currentBasket.items.filter(item => item.id !== itemId);

          const updatedBasket = {
            ...currentBasket,
            items: updatedItems,
            lastEditedAt: new Date(),
            totalItems: updatedItems.filter(item => item.isAccepted).length,
            totalValue: updatedItems
              .filter(item => item.isAccepted)
              .reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
            acceptedCount: updatedItems.filter(item => item.isAccepted).length
          };

          set({ basket: updatedBasket, hasUnsavedEdits: true });
        },

        addCustomItem: (product: Product, quantity = 1) => {
          const currentBasket = get().basket;
          if (!currentBasket) return;

          const newItem: PredictedBasketItem = {
            id: generateId(),
            product,
            quantity,
            confidenceScore: 0.5, // Lower confidence for manually added items
            isAccepted: true,
            originalRank: currentBasket.items.length + 1,
            isEdited: true
          };

          const updatedItems = [...currentBasket.items, newItem];

          const updatedBasket = {
            ...currentBasket,
            items: updatedItems,
            lastEditedAt: new Date(),
            totalItems: updatedItems.filter(item => item.isAccepted).length,
            totalValue: updatedItems
              .filter(item => item.isAccepted)
              .reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
            acceptedCount: updatedItems.filter(item => item.isAccepted).length
          };

          set({ basket: updatedBasket, hasUnsavedEdits: true });
        },

        clearBasket: () => {
          set({ basket: null, hasUnsavedEdits: false });
        },

        resetEdits: () => {
          set({ hasUnsavedEdits: false });
        },

        // ============================================================================
        // COMPUTED VALUES
        // ============================================================================

        getAcceptedItems: () => {
          const { basket } = get();
          return basket?.items.filter(item => item.isAccepted) || [];
        },

        getStats: () => {
          const { basket } = get();
          if (!basket) {
            return {
              totalItems: 0,
              totalValue: 0,
              avgConfidence: 0,
              acceptanceRate: 0
            };
          }

          const acceptedItems = basket.items.filter(item => item.isAccepted);
          
          return {
            totalItems: acceptedItems.length,
            totalValue: acceptedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
            avgConfidence: basket.items.length > 0 
              ? basket.items.reduce((sum, item) => sum + item.confidenceScore, 0) / basket.items.length
              : 0,
            acceptanceRate: basket.items.length > 0 
              ? (acceptedItems.length / basket.items.length) * 100 
              : 0
          };
        },

        // ============================================================================
        // UTILITY
        // ============================================================================

        markAsGenerated: () => {
          set({ hasUnsavedEdits: false });
        },

        generateItemId: () => generateId()
      }),
      {
        name: 'timely-predicted-basket',
        // Persist basket data and edit state
        partialize: (state) => ({ 
          basket: state.basket, 
          hasUnsavedEdits: state.hasUnsavedEdits 
        })
      }
    ),
    {
      name: 'predicted-basket-store'
    }
  )
);

// ============================================================================
// INTEGRATION HELPERS - Connect to Cart Store
// ============================================================================

import { useCartStore } from '@/stores/cart.store';

export const usePredictedBasketActions = () => {
  const { basket, getAcceptedItems } = usePredictedBasketStore();
  const { addMultipleItems } = useCartStore();

  const addAcceptedToCart = () => {
    if (!basket) return;

    const acceptedItems = getAcceptedItems();
    const cartItems = acceptedItems.map(item => ({
      product: item.product,
      quantity: item.quantity
    }));

    addMultipleItems(cartItems);
    
    // Optionally clear predicted basket after adding to cart
    // usePredictedBasketStore.getState().clearBasket();
  };

  return {
    addAcceptedToCart,
    hasAcceptedItems: getAcceptedItems().length > 0
  };
};

// ============================================================================
// ARCHITECTURE NOTES:
// 
// ✅ ZUSTAND PERSIST: Predicted basket edits survive page refresh
// ✅ LOCAL FIRST: All editing is instant with no API calls
// ✅ CONFIDENCE PLACARDS: Mock values for display (0.6-1.0 range)
// ✅ EDIT TRACKING: Tracks which items user has modified
// ✅ BULK OPERATIONS: Easy integration with cart store
// ✅ COMPUTED VALUES: Real-time stats for UI display
// ✅ SEPARATION OF CONCERNS: Predicted basket ≠ shopping cart
// ✅ DRY PRINCIPLE: Single source of truth for prediction edits
// ✅ CODE REUSABILITY: Can be used across components
// ✅ DEMAND 4: Smooth editing experience
// 
// This store handles the "experimentation" phase where users:
// 1. View AI predictions
// 2. Edit quantities, accept/reject items
// 3. Add custom items
// 4. See real-time stats
// 5. Bulk add accepted items to cart
// 6. All edits are persisted locally
// ============================================================================