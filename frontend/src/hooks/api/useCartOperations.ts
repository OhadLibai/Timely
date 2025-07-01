import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { useCartStore } from '@/stores/cart.store';
import { useAuthenticatedAction } from '@/hooks/auth/useAuthenticatedAction';

export const useCartOperations = () => {
  const { addToCart: addToCartStore, removeFromCart, updateQuantity, isUpdating } = useCartStore();
  const { withAuthCheck } = useAuthenticatedAction();

  const addToCartMutation = useMutation(
    (productId: string) => addToCartStore(productId),
    {
      onSuccess: () => {
        toast.success('Added to cart');
      },
      onError: (error) => {
        console.error('Failed to add to cart:', error);
        toast.error('Failed to add to cart');
      }
    }
  );

  const removeFromCartMutation = useMutation(
    (productId: string) => removeFromCart(productId),
    {
      onSuccess: () => {
        toast.success('Removed from cart');
      },
      onError: (error) => {
        console.error('Failed to remove from cart:', error);
        toast.error('Failed to remove from cart');
      }
    }
  );

  const updateQuantityMutation = useMutation(
    ({ productId, quantity }: { productId: string; quantity: number }) => 
      updateQuantity(productId, quantity),
    {
      onError: (error) => {
        console.error('Failed to update quantity:', error);
        toast.error('Failed to update quantity');
      }
    }
  );

  const handleAddToCart = withAuthCheck(
    (productId: string) => addToCartMutation.mutate(productId),
    'Please login to add items to cart'
  );

  const handleRemoveFromCart = withAuthCheck(
    (productId: string) => removeFromCartMutation.mutate(productId),
    'Please login to manage cart'
  );

  const handleUpdateQuantity = withAuthCheck(
    (productId: string, quantity: number) => 
      updateQuantityMutation.mutate({ productId, quantity }),
    'Please login to manage cart'
  );

  return {
    // Actions
    handleAddToCart,
    handleRemoveFromCart, 
    handleUpdateQuantity,
    
    // Loading states
    isAdding: addToCartMutation.isLoading,
    isRemoving: removeFromCartMutation.isLoading,
    isUpdatingQuantity: updateQuantityMutation.isLoading,
    isUpdating,
    
    // Raw mutations for advanced usage
    addToCartMutation,
    removeFromCartMutation,
    updateQuantityMutation,
  };
};