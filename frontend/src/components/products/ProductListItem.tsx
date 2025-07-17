// frontend/src/components/products/ProductListItem.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Package } from 'lucide-react';
import { Product } from '@/services/product.service';
import ProductImage from '@/components/products/ProductImage';
import { useCartStore } from '@/stores/cart.store';
import { useFavoriteToggle } from '@/hooks/api/useFavoriteToggle';
import { useProductDisplay } from '@/hooks/ui/useProductDisplay';
import { formatPrice } from '@/utils/formatters';
import { Button } from '@/components/common/Button';

interface ProductListItemProps {
  product: Product;
  variant?: 'default' | 'compact';
  showRating?: boolean;
  className?: string;
}

const ProductListItem: React.FC<ProductListItemProps> = ({ 
  product, 
  variant = 'default',
  className = ''
}) => {
  // Use cart store for cart operations
  const { addToCart, isUpdating } = useCartStore();

  const {
    isFavorite,
    isToggling,
    handleToggleFavorite
  } = useFavoriteToggle(product.id);

  const {
    stockMessage,
    stockColor,
    isOutOfStock
  } = useProductDisplay(product);

  const handleAddToCartClick = () => {
    if (!isOutOfStock && !isUpdating) {
      addToCart(product);
    }
  };

  const isCompact = variant === 'compact';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ${
        isCompact ? 'p-3' : 'p-4'
      } ${className}`}
    >
      <div className={`flex items-center ${isCompact ? 'gap-3' : 'gap-4'}`}>
        {/* Product Image */}
        <Link to={`/products/${product.id}`} className="flex-shrink-0">
          <div className={`relative ${isCompact ? 'w-16 h-16' : 'w-20 h-20'} rounded-lg overflow-hidden`}>
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="text-white text-xs font-medium">Out of Stock</span>
              </div>
            )}
          </div>
        </Link>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <Link to={`/products/${product.id}`} className="block">
            <h3 className={`font-semibold text-gray-900 hover:text-indigo-600 transition-colors ${
              isCompact ? 'text-sm' : 'text-base'
            } line-clamp-2`}>
              {product.name}
            </h3>
            
            {product.description && !isCompact && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                {product.description}
              </p>
            )}
          </Link>

          {/* Price and Rating */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-gray-900 ${
                isCompact ? 'text-sm' : 'text-base'
              }`}>
                {formatPrice(product.price)}
              </span>
            </div>

            {/* Rating commented out - not available in Product type */}
            {/* {showRating && product.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600">
                  {product.rating.toFixed(1)}
                </span>
              </div>
            )} */}
          </div>

          {/* Stock Status */}
          {stockMessage && (
            <div className={`mt-2 ${isCompact ? 'text-xs' : 'text-sm'}`}>
              <span className={`font-medium ${stockColor}`}>
                {stockMessage}
              </span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className={`flex ${isCompact ? 'gap-1' : 'gap-2'} ${isCompact ? 'flex-row' : 'flex-col'}`}>
          {/* Favorite Button */}
          <Button
            variant="ghost"
            size={isCompact ? 'sm' : 'md'}
            onClick={handleToggleFavorite}
            loading={isToggling}
            icon={Heart}
            className={`${
              isFavorite 
                ? 'text-red-600 [&>span>svg]:fill-red-600' 
                : 'text-gray-400 hover:text-red-600'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          />

          {/* Add to Cart Button */}
          <Button
            variant={isOutOfStock ? 'ghost' : 'primary'}
            size={isCompact ? 'sm' : 'md'}
            onClick={handleAddToCartClick}
            loading={isUpdating}
            disabled={isOutOfStock}
            icon={isOutOfStock ? Package : ShoppingCart}
            className={isCompact ? 'px-2' : undefined}
          >
            {!isCompact && (
              <span className="hidden sm:inline">
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </span>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductListItem;