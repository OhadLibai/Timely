// frontend/src/components/products/ProductListItem.tsx
// CLEANED: Removed all discount, sale, and compareAtPrice display logic
// FOCUSED: Clean product list display for ML prediction demonstrations

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Package, Zap } from 'lucide-react';
import { Product } from '@/services/product.service';
import { useCartStore } from '@/stores/cart.store';
import ProductImage from '@/components/products/ProductImage';
import { useFavoriteToggle } from '@/hooks/api/useFavoriteToggle';
import { useAuthenticatedAction } from '@/hooks/auth/useAuthenticatedAction';
import { useProductDisplay } from '@/hooks/ui/useProductDisplay';
import { formatPrice } from '@/utils/formatters';

interface ProductListItemProps {
  product: Product;
}

const ProductListItem: React.FC<ProductListItemProps> = ({ product }) => {
  const { addItem, cart, isUpdating } = useCartStore();
  
  const {
    pricing,
    stockStatus,
    availability,
    displayPrice,
    stockMessage,
    stockColor,
    isOutOfStock,
    isLowStock
  } = useProductDisplay(product);

  const {
    isFavorite,
    isLoading: isFavoriteLoading,
    toggle: toggleFavorite
  } = useFavoriteToggle(product.id);

  const executeAuthenticatedAction = useAuthenticatedAction();

  // Check if product is in cart
  const isInCart = cart ? cart.items.some(item => item.productId === product.id) : false;

  const handleAddToCart = async () => {
    if (isOutOfStock || isUpdating) return;
    
    try {
      await executeAuthenticatedAction(async () => {
        await addItem(product.id, 1);
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (isFavoriteLoading) return;
    
    try {
      await executeAuthenticatedAction(async () => {
        await toggleFavorite();
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-4"
    >
      <div className="flex items-center gap-4">
        {/* Product Image */}
        <Link to={`/products/${product.id}`} className="flex-shrink-0">
          <div className="w-20 h-20 rounded-lg overflow-hidden">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <Link to={`/products/${product.id}`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
          
          {product.brand && product.category && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {product.brand} • {product.category?.name}
            </p>
          )}
          
          {product.description && (
            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
              {product.description}
            </p>
          )}
          
          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {product.rating.toFixed(1)}
              </span>
              {product.reviewCount && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({product.reviewCount})
                </span>
              )}
            </div>
          )}
          
          {/* Price - Clean, single price display */}
          <div className="flex items-center gap-2 mt-2">
            <span className="font-bold text-gray-900 dark:text-white">
              {formatPrice(product.price)}
            </span>
          </div>

          {/* Stock Status */}
          {availability.trackInventory && (
            <div className="mt-1">
              <span className={`text-xs ${
                stockColor === 'red' ? 'text-red-600 dark:text-red-400' :
                stockColor === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                {stockMessage}
              </span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-2 ml-4">
          {/* Favorite Button */}
          <button
            onClick={handleToggleFavorite}
            disabled={isFavoriteLoading}
            className={`p-2 rounded-full transition-all ${
              isFavorite 
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || isUpdating}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isInCart
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : isOutOfStock
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md'
            }`}
          >
            {isUpdating ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Package size={16} />
              </motion.div>
            ) : isInCart ? (
              <>
                <Zap size={16} />
                <span className="hidden sm:inline">In Cart</span>
              </>
            ) : isOutOfStock ? (
              <span className="hidden sm:inline">Out of Stock</span>
            ) : (
              <>
                <ShoppingCart size={16} />
                <span className="hidden sm:inline">Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductListItem;