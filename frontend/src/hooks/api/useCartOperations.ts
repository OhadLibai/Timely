import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { useCartStore } from '@/stores/cart.store';
import { useAuthenticatedAction } from '@/hooks/auth/useAuthenticatedAction';
import { Product } from '@/services/product.service';

export const useCartOperations = () => {
  const { addToCart: addToCartStore, addMultipleItems, removeItem, updateQuantity, isUpdating } = useCartStore();
  const { withAuthCheck } = useAuthenticatedAction();

  const addToCartMutation = useMutation(
    ({ product, quantity = 1 }: { product: Product; quantity?: number }) => {
      addToCartStore(product, quantity);
      return Promise.resolve();
    },
    {
      onError: (error) => {
        console.error('Failed to add to cart:', error);
        toast.error('Failed to add to cart');
      }
    }
  );

  const addMultipleItemsMutation = useMutation(
    (items: { product: Product; quantity: number }[]) => {
      addMultipleItems(items);
      return Promise.resolve();
    },
    {
      onError: (error) => {
        console.error('Failed to add multiple items to cart:', error);
        toast.error('Failed to add items to cart');
      }
    }
  );

  const removeFromCartMutation = useMutation(
    (itemId: string) => {
      removeItem(itemId);
      return Promise.resolve();
    },
    {
      onError: (error) => {
        console.error('Failed to remove from cart:', error);
        toast.error('Failed to remove from cart');
      }
    }
  );

  const updateQuantityMutation = useMutation(
    ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      updateQuantity(itemId, quantity);
      return Promise.resolve();
    },
    {
      onError: (error) => {
        console.error('Failed to update quantity:', error);
        toast.error('Failed to update quantity');
      }
    }
  );

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