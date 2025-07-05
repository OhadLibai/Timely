import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { favoriteService } from '@/services/favorite.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMutationWithToast } from './useMutationWithToast';
import { QUERY_KEYS } from '@/utils/queryKeys';
// Note: Uses staleTime: Infinity - special case for favorite status that only changes on user click

export const useFavoriteToggle = (productId: string) => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch favorite status from server
  const { data: isFavorite = false, isLoading: isFavoriteLoading } = useQuery(
    ['isFavorite', productId],
    () => favoriteService.isProductFavorited(productId),
    {
      enabled: isAuthenticated, // Only run the query if the user is logged in
      staleTime: Infinity, // The favorite status won't change unless the user clicks
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    }
  );

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutationWithToast({
    mutationFn: async () => {
      // Decide which service method to call based on the current status
      if (isFavorite) {
        await favoriteService.removeFavorite(productId);
      } else {
        await favoriteService.addFavorite(productId);
      }
    },
    successMessage: isFavorite ? 'Removed from favorites' : 'Added to favorites',
    errorMessage: 'Failed to update favorites',
    onSuccess: () => {
      queryClient.invalidateQueries(['isFavorite', productId]);
      queryClient.invalidateQueries(QUERY_KEYS.favorites());
    },
  });

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Please login to save favorites');
      return;
    }

    toggleFavoriteMutation.mutate(undefined);
  };

  return {
    isFavorite,
    isFavoriteLoading,
    isToggling: toggleFavoriteMutation.isLoading,
    handleToggleFavorite,
  };
};