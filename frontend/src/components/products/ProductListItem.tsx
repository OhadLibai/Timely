import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { Product } from '../../services/product.service';
import { useCartStore } from '../../stores/cart.store';
import { useMutation, useQueryClient } from 'react-query';
import { favoriteService } from '../../services/favorite.service';
import { toast } from 'react-hot-toast';

interface ProductListItemProps {
  product: Product;
}

const ProductListItem: React.FC<ProductListItemProps> = ({ product }) => {
  const { addItem } = useCartStore();
  const queryClient = useQueryClient();

  const toggleFavoriteMutation = useMutation(
    () => favoriteService.toggleFavorite(product.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['favorites']);
        toast.success('Updated favorites');
      },
      onError: () => {
        toast.error('Failed to update favorites');
      }
    }
  );

  const addToCartMutation = useMutation(
    () => addItem(product, 1),
    {
      onSuccess: () => {
        toast.success('Added to cart');
      },
      onError: () => {
        toast.error('Failed to add to cart');
      }
    }
  );

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCartMutation.mutate();
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleFavoriteMutation.mutate();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <Link to={`/products/${product.id}`} className="block">
        <div className="flex p-4">
          {/* Product Image */}
          <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={product.imageUrl || '/images/placeholder-product.png'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Product Info */}
          <div className="flex-1 ml-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 mb-1">
                  {product.brand} • {product.category}
                </p>
                {product.description && (
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>
              
              {/* Price and Actions */}
              <div className="flex flex-col items-end ml-4">
                <div className="text-right mb-2">
                  <span className="text-lg font-bold text-gray-900">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xs text-gray-500 line-through ml-1">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={handleToggleFavorite}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    disabled={toggleFavoriteMutation.isLoading}
                  >
                    <Heart className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </button>
                  
                  <button
                    onClick={handleAddToCart}
                    disabled={addToCartMutation.isLoading}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductListItem;