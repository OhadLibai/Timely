import { useMemo } from 'react';
import { Product } from '@/services/product.service';

export const useProductDisplay = (product: Product) => {
  const discount = useMemo(() => {
    if (!product.compareAtPrice) return 0;
    return Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
  }, [product.compareAtPrice, product.price]);

  const stockStatus = useMemo(() => {
    if (!product.trackInventory) {
      return { status: 'available', message: 'In stock', color: 'green' };
    }

    if (product.stock === 0) {
      return { status: 'out-of-stock', message: 'Out of stock', color: 'red' };
    }

    if (product.stock <= 5) {
      return { 
        status: 'low-stock', 
        message: `Only ${product.stock} left`, 
        color: 'orange' 
      };
    }

    return { status: 'in-stock', message: 'In stock', color: 'green' };
  }, [product.trackInventory, product.stock]);

  const pricing = useMemo(() => ({
    currentPrice: product.price.toFixed(2),
    originalPrice: product.compareAtPrice?.toFixed(2),
    hasDiscount: discount > 0,
    discount,
    savings: product.compareAtPrice ? (product.compareAtPrice - product.price).toFixed(2) : null,
  }), [product.price, product.compareAtPrice, discount]);

  const badges = useMemo(() => {
    const badgeList = [];
    
    if (stockStatus.status === 'low-stock') {
      badgeList.push({
        type: 'low-stock',
        text: 'Low Stock',
        className: 'px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full'
      });
    }

    return badgeList;
  }, [stockStatus.status]);

  const availability = useMemo(() => ({
    isAvailable: product.stock > 0 || !product.trackInventory,
    canAddToCart: (product.stock > 0 || !product.trackInventory),
    stockCount: product.stock,
    trackInventory: product.trackInventory,
  }), [product.stock, product.trackInventory]);

  return {
    pricing,
    stockStatus,
    badges,
    availability,
    discount,
    // Computed display values
    displayPrice: pricing.currentPrice,
    displayOriginalPrice: pricing.originalPrice,
    showDiscount: pricing.hasDiscount,
    stockMessage: stockStatus.message,
    stockColor: stockStatus.color,
    isOutOfStock: stockStatus.status === 'out-of-stock',
    isLowStock: stockStatus.status === 'low-stock',
  };
};