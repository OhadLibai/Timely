import { useCartStore } from '@/stores/cart.store';
import { useAuthenticatedAction } from '@/hooks/auth/useAuthenticatedAction';
import { Product } from '@/services/product.service';
import { useMutationWithToast } from './useMutationWithToast';

export const useCartOperations = () => {
  const { addToCart: addToCartStore, addMultipleItems, removeItem, updateQuantity, isUpdating } = useCartStore();
  const { withAuthCheck } = useAuthenticatedAction();

  const addToCartMutation = useMutationWithToast({
    mutationFn: ({ product, quantity = 1 }: { product: Product; quantity?: number }) => {
      addToCartStore(product, quantity);
      return Promise.resolve();
    },
    successMessage: 'Added to cart',
    errorMessage: 'Failed to add to cart',
    showSuccessToast: false,
  });

  const addMultipleItemsMutation = useMutationWithToast({
    mutationFn: (items: { product: Product; quantity: number }[]) => {
      addMultipleItems(items);
      return Promise.resolve();
    },
    successMessage: (_, items) => `Added ${items.length} items to cart`,
    errorMessage: 'Failed to add items to cart',
  });

  const removeFromCartMutation = useMutationWithToast({
    mutationFn: (itemId: string) => {
      removeItem(itemId);
      return Promise.resolve();
    },
    successMessage: 'Removed from cart',
    errorMessage: 'Failed to remove from cart',
    showSuccessToast: false,
  });

  const updateQuantityMutation = useMutationWithToast({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      updateQuantity(itemId, quantity);
      return Promise.resolve();
    },
    successMessage: 'Quantity updated',
    errorMessage: 'Failed to update quantity',
    showSuccessToast: false,
  });

  const handleAddToCart = withAuthCheck(
    (product: Product, quantity = 1) => addToCartMutation.mutate({ product, quantity }),
    'Please login to add items to cart'
  );

  const handleAddMultipleItems = withAuthCheck(
    (items: { product: Product; quantity: number }[]) => addMultipleItemsMutation.mutate(items),
    'Please login to add items to cart'
  );

  const handleRemoveFromCart = withAuthCheck(
    (itemId: string) => removeFromCartMutation.mutate(itemId),
    'Please login to manage cart'
  );

  const handleUpdateQuantity = withAuthCheck(
    (itemId: string, quantity: number) => 
      updateQuantityMutation.mutate({ itemId, quantity }),
    'Please login to manage cart'
  );

  return {
    // Actions
    handleAddToCart,
    handleAddMultipleItems,
    handleRemoveFromCart, 
    handleUpdateQuantity,
    
    // Loading states
    isAdding: addToCartMutation.isLoading,
    isAddingMultiple: addMultipleItemsMutation.isLoading,
    isRemoving: removeFromCartMutation.isLoading,
    isUpdatingQuantity: updateQuantityMutation.isLoading,
    isUpdating,
    
    // Raw mutations for advanced usage
    addToCartMutation,
    addMultipleItemsMutation,
    removeFromCartMutation,
    updateQuantityMutation,
  };
};