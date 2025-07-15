// frontend/src/components/products/ProductCard.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedContainer } from '@/components/common/AnimatedContainer';
import { ShoppingCart, Heart, Package, Zap, Eye } from 'lucide-react';
import { Product } from '@/services/product.service';
import { useCartStore } from '@/stores/cart.store';
import ProductImage from '@/components/products/ProductImage';
import { useFavoriteToggle } from '@/hooks/api/useFavoriteToggle';
import { useAuthenticatedAction } from '@/hooks/auth/useAuthenticatedAction';
import { formatPrice, getProductBadges } from '@/utils/formatters';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'detailed';
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart, isProductInCart, isUpdating } = useCartStore();
  const { withAuthCheck } = useAuthenticatedAction();
  
  // Use our hooks for state management
  const { isFavorite, isToggling, handleToggleFavorite } = useFavoriteToggle(product.id);

  const isInCart = isProductInCart(product.id);

  // UPDATED: Use utility functions for formatting
  const badges = getProductBadges({
    isNew: false, // This would come from product data
    isOrganic: false // This would come from product data if available
  });

  const handleAddToCart = withAuthCheck(
    async () => {
      try {
        await addToCart(product);
      } catch (error) {
        console.error('Failed to add to cart:', error);
      }
    },
    'Please login to add items to cart'
  );

  return (
    <AnimatedContainer
      preset="fadeInUp"
      duration={0.3}
      className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/products/${product.id}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          
          {/* Badges - Using utility function */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {badges.map((badge, index) => (
              <span key={`${badge.type}-${index}`} className={badge.className}>
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
            <button
              onClick={handleToggleFavorite}
              disabled={isToggling}
              className={`p-2 rounded-full backdrop-blur-sm transition-all ${
                isFavorite
                  ? 'bg-red-500 text-white'
                  : 'bg-white/80 text-gray-600 hover:bg-red-50 hover:text-red-500'
              }`}
            >
              <Heart size={16} className={isFavorite ? 'fill-current' : ''} />
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                // Quick view functionality could go here
              }}
              className="p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-blue-50 hover:text-blue-500 transition-all"
            >
              <Eye size={16} />
            </button>
          </motion.div>

          {/* Stock Status Overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
              <span className="bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-900">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4">
        <Link to={`/products/${product.id}`}>
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        
        {product.brand && (
          <p className="text-sm text-gray-500 mb-2">
            {product.brand}
          </p>
        )}

        {/* Price - Using utility function */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0 || isUpdating}
          className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-all ${
            isInCart
              ? 'bg-green-100/30 text-green-700'
              : product.stock === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
              <span>In Cart</span>
            </>
          ) : product.stock === 0 ? (
            <span>Out of Stock</span>
          ) : (
            <>
              <ShoppingCart size={16} />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </AnimatedContainer>
  );
};

export default ProductCard;