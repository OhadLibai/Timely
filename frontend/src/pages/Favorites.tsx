// frontend/src/pages/Favorites.tsx
// FIXED: Removed "Clear All" functionality that backend doesn't support

import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, Package } from 'lucide-react';
import { favoriteService } from '@/services/favorite.service';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import ProductCard from '@/components/products/ProductCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import toast from 'react-hot-toast';

const Favorites: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { addToCart } = useCartStore();
  const queryClient = useQueryClient();

  // Fetch favorites
  const { data: favorites, isLoading, error } = useQuery(
    'favorites',
    () => favoriteService.getFavorites(),
    {
      enabled: isAuthenticated,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Remove from favorites mutation
  const removeFromFavoritesMutation = useMutation(
    (productId: string) => favoriteService.removeFavorite(productId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('favorites');
        toast.success('Removed from favorites');
      },
      onError: () => {
        toast.error('Failed to remove from favorites');
      },
    }
  );

  // Add to cart mutation
  const addToCartMutation = useMutation(
    (productId: string) => addToCart(productId),
    {
      onSuccess: () => {
        toast.success('Added to cart');
      },
      onError: () => {
        toast.error('Failed to add to cart');
      },
    }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <EmptyState
          icon={Heart}
          title="Please Sign In"
          description="You need to sign in to view your favorites."
          action={{
            label: "Sign In",
            href: "/login"
          }}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <EmptyState
          icon={Package}
          title="Error Loading Favorites"
          description="There was an error loading your favorites. Please try again."
        />
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <EmptyState
          icon={Heart}
          title="No Favorites Yet"
          description="Start adding products to your favorites to see them here."
          action={{
            label: "Browse Products",
            href: "/products"
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                My Favorites
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
              </p>
            </div>
          </div>
        </div>

        {/* Favorites Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {favorites.map((favorite) => (
              <motion.div
                key={favorite.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <ProductCard 
                  product={favorite.product} 
                  variant="default"
                />
                
                {/* Custom Favorite Actions Overlay */}
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  {/* Remove from Favorites */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeFromFavoritesMutation.mutate(favorite.product.id)}
                    disabled={removeFromFavoritesMutation.isLoading}
                    className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Remove from favorites"
                  >
                    <Heart className="w-4 h-4 text-red-500 fill-current" />
                  </motion.button>

                  {/* Quick Add to Cart */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => addToCartMutation.mutate(favorite.product.id)}
                    disabled={addToCartMutation.isLoading}
                    className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Add to cart"
                  >
                    <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Tips */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            💡 Tip: Use favorites to quickly add frequently purchased items to your cart
          </p>
        </div>
      </div>
    </div>
  );
};

export default Favorites;