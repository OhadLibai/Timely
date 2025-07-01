// frontend/src/components/products/ProductListItem.tsx
// FIXED: Removed non-existent toggleFavorite, implemented proper favorite logic

import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { Product } from '@/services/product.service';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { useMutation } from 'react-query';
import { toast } from 'react-hot-toast';
import { useFavoriteToggle } from '@/hooks/api/useFavoriteToggle';
import { useProductDisplay } from '@/hooks/ui/useProductDisplay';
import { useAuthenticatedAction } from '@/hooks/auth/useAuthenticatedAction';

interface ProductListItemProps {
  product: Product;
}

const ProductListItem: React.FC<ProductListItemProps> = ({ product }) => {
  const { addToCart } = useCartStore();
  const { withAuthCheck } = useAuthenticatedAction();
  
  // Use our new hooks
  const { isFavorite, isFavoriteLoading, isToggling, handleToggleFavorite } = useFavoriteToggle(product.id);
  const { pricing, stockStatus, availability } = useProductDisplay(product);

  const addToCartMutation = useMutation(
    () => addToCart(product.id),
    {
      onSuccess: () => {
        toast.success('Added to cart');
      },
      onError: () => {
        toast.error('Failed to add to cart');
      }
    }
  );

  const handleAddToCart = withAuthCheck(
    () => addToCartMutation.mutate(),
    'Please login to add items to cart'
  );

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
      <Link to={`/products/${product.id}`} className="block">
        <div className="flex p-4">
          {/* Product Image */}
          <div className="flex-shrink-0 w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            <img
              src={product.imageUrl || 'https://images.pexels.com/photos/264537/pexels-photo-264537.jpeg?auto=compress&cs=tinysrgb&w=400'}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          
          {/* Product Info */}
          <div className="flex-1 ml-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {product.brand} • {product.category?.name}
                </p>
                {product.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                    {product.description}
                  </p>
                )}
                
                {/* Price */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-bold text-gray-900 dark:text-white">
                    ${pricing.currentPrice}
                  </span>
                  {pricing.originalPrice && (
                    <>
                      <span className="text-xs text-gray-500 line-through">
                        ${pricing.originalPrice}
                      </span>
                      {pricing.hasDiscount && (
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                          -{pricing.discount}%
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Stock Status */}
                {availability.trackInventory && (
                  <div className="mt-1">
                    <span className={`text-xs ${
                      stockStatus.color === 'red' ? 'text-red-600 dark:text-red-400' :
                      stockStatus.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                      'text-green-600 dark:text-green-400'
                    }`}>
                      {stockStatus.message}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex flex-col gap-2 ml-4">
                {/* FIXED: Proper favorite button */}
                <button
                  onClick={handleToggleFavorite}
                  disabled={isToggling || isFavoriteLoading}
                  className={`p-2 rounded-full transition-all ${
                    isFavorite 
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
                
                {/* Add to Cart */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddToCart();
                  }}
                  disabled={addToCartMutation.isLoading || !availability.canAddToCart}
                  className={`p-2 rounded-full transition-all ${
                    !availability.canAddToCart
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={!availability.canAddToCart ? 'Out of stock' : 'Add to cart'}
                >
                  <ShoppingCart size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductListItem;