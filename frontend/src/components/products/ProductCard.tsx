// frontend/src/components/products/ProductCard.tsx
// FIXED: Proper favorite status sync with server

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Package, Zap, Eye } from 'lucide-react';
import { Product } from '@/services/product.service';
import { useCartStore } from '@/stores/cart.store';
import ProductImage from '@/components/products/ProductImage';
import { useFavoriteToggle } from '@/hooks/api/useFavoriteToggle';
import { useAuthenticatedAction } from '@/hooks/auth/useAuthenticatedAction';
import { useProductDisplay } from '@/hooks/ui/useProductDisplay';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'detailed';
}

const ProductCard: React.FC<ProductCardProps> = ({ product, variant = 'default' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart, isProductInCart, isUpdating } = useCartStore();
  const { withAuthCheck } = useAuthenticatedAction();
  
  // Use our new hooks
  const { isFavorite, isFavoriteLoading, isToggling, handleToggleFavorite } = useFavoriteToggle(product.id);
  const { pricing, stockStatus, badges, availability } = useProductDisplay(product);

  const isInCart = isProductInCart(product.id);

  const handleAddToCart = withAuthCheck(
    async () => {
      try {
        await addToCart(product.id);
      } catch (error) {
        console.error('Failed to add to cart:', error);
      }
    },
    'Please login to add items to cart'
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      <Link to={`/products/${product.id}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {badges.map((badge) => (
              <span key={badge.type} className={badge.className}>
                {badge.text}
              </span>
            ))}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-3 right-3 flex flex-col gap-2"
          >
            {/* FIXED: Proper favorite button with server sync */}
            <button
              onClick={handleToggleFavorite}
              disabled={isToggling || isFavoriteLoading}
              className={`p-2 rounded-full backdrop-blur-sm transition-all ${
                isFavorite 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-red-500 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            <Link
              to={`/products/${product.id}`}
              className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-full backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-500 hover:text-white transition-all"
            >
              <Eye size={18} />
            </Link>
          </motion.div>

          {/* Stock Indicator */}
          {availability.trackInventory && !availability.isAvailable && (
            <div className="absolute bottom-3 left-3">
              <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                stockStatus.color === 'red' 
                  ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                  : 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400'
              }`}>
                {stockStatus.color === 'red' ? <Package size={12} /> : <Zap size={12} />}
                {stockStatus.message}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Category & Brand */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {product.category?.name}
            </span>
            {product.brand && (
              <>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {product.brand}
                </span>
              </>
            )}
          </div>

          {/* Product Name */}
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {product.name}
          </h3>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1 mb-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < Math.floor(product.avgRating) 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300 dark:text-gray-600'
                    }
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                ({product.reviewCount})
              </span>
            </div>
          )}

          {/* Price Section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                ${pricing.currentPrice}
              </span>
              {pricing.originalPrice && (
                <span className="text-sm text-gray-500 line-through">
                  ${pricing.originalPrice}
                </span>
              )}
            </div>
            {pricing.hasDiscount && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                Save {pricing.discount}%
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddToCart();
            }}
            disabled={isUpdating || !availability.canAddToCart}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
              isInCart
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : !availability.canAddToCart
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ShoppingCart size={18} />
            {isUpdating ? (
              'Adding...'
            ) : isInCart ? (
              'In Cart'
            ) : !availability.canAddToCart ? (
              'Out of Stock'
            ) : (
              'Add to Cart'
            )}
          </button>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;