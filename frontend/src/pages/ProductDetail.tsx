import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingCart, Heart, Star, Plus, Minus,
  Package, Truck, Shield
} from 'lucide-react';
import { useProduct } from '@/hooks';
import { useCartStore } from '@/stores/cart.store';
import { useAuthenticatedAction } from '@/hooks/auth/useAuthenticatedAction';
import ProductImage from '@/components/products/ProductImage';
import DetailPage from '@/components/common/DetailPage';
import toast from 'react-hot-toast';
import { formatPrice } from '@/utils/formatters';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { withAuthCheck } = useAuthenticatedAction();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading, error } = useProduct(id!);

  const handleAddToCart = withAuthCheck(
    () => {
      if (!product) return;
      
      addToCart(product, quantity);
      
      toast.success(`Added ${quantity} ${product.name} to cart`);
    },
    'Please login to add items to cart'
  );

  const handleBuyNow = withAuthCheck(
    () => {
      if (!product) return;
      
      addToCart(product, quantity);
      
      toast.success(`Added ${quantity} ${product.name} to cart`);
      navigate('/cart');
    },
    'Please login to add items to cart'
  );

  const leftColumn = product && (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="aspect-square rounded-xl overflow-hidden bg-gray-100"
    >
      <ProductImage
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-full object-cover"
      />
    </motion.div>
  );

  const rightColumn = product && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Rating */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={18}
              className={`${
                i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          ))}
          <span className="text-sm text-gray-600 ml-2">
            4.0 (24 reviews)
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-center gap-4">
        <span className="text-3xl font-bold text-gray-900">
          ${product.price}
        </span>
        {product.price > 20 && (
          <span className="text-lg text-gray-500 line-through">
            {formatPrice(product.price * 1.2)}
          </span>
        )}
        <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
          In Stock
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-600 leading-relaxed">
        {product.description || 'High-quality product with excellent value and taste. Perfect for your daily needs.'}
      </p>

      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">
          Quantity:
        </span>
        <div className="flex items-center border border-gray-300 rounded-lg">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2 hover:bg-gray-100 transition-colors"
          >
            <Minus size={16} />
          </button>
          <span className="px-4 py-2 font-medium text-gray-900">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="p-2 hover:bg-gray-100 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleAddToCart}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <ShoppingCart size={20} />
          Add to Cart
        </button>
        <button
          onClick={handleBuyNow}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          Buy Now
        </button>
        <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
          <Heart size={20} />
        </button>
      </div>

      {/* Product Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Truck className="text-indigo-600" size={20} />
          <div>
            <p className="font-medium text-gray-900 text-sm">
              Free Delivery
            </p>
            <p className="text-xs text-gray-600">
              On orders over $35
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Shield className="text-green-600" size={20} />
          <div>
            <p className="font-medium text-gray-900 text-sm">
              Quality Assured
            </p>
            <p className="text-xs text-gray-600">
              Fresh guarantee
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Package className="text-blue-600" size={20} />
          <div>
            <p className="font-medium text-gray-900 text-sm">
              Easy Returns
            </p>
            <p className="text-xs text-gray-600">
              30-day policy
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const bottomContent = product && (
    <div>
      <div className="border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Product Details
        </h3>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Specifications
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Category:</span>
              <span className="text-gray-900">{typeof product.category === 'object' ? product.category.name : product.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Brand:</span>
              <span className="text-gray-900">Premium</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SKU:</span>
              <span className="text-gray-900">PRD-{product.id}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Nutrition Information
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Calories:</span>
              <span className="text-gray-900">Per serving</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Storage:</span>
              <span className="text-gray-900">Cool, dry place</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shelf Life:</span>
              <span className="text-gray-900">12 months</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DetailPage
      isLoading={isLoading}
      error={error}
      backLabel="Back to Products"
      backUrl="/products"
      title={product?.name || ''}
      leftColumn={leftColumn}
      rightColumn={rightColumn}
      bottomContent={bottomContent}
      errorTitle="Product not found"
      errorDescription="The product you're looking for doesn't exist or has been removed."
    />
  );
};

export default ProductDetail;