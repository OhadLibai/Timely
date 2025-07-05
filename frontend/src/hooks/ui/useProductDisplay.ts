// frontend/src/hooks/ui/useProductDisplay.ts

import { useMemo } from 'react';
import { Product } from '@/services/product.service';
import { formatPrice } from '@/utils/formatters';

export const useProductDisplay = (product: Product) => {
  const stockStatus = useMemo(() => {
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
  }, [product.stock]);

  const pricing = useMemo(() => ({
    currentPrice: formatPrice(product.price),
  }), [product.price]);

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
    isAvailable: product.stock > 0,
    canAddToCart: product.stock > 0,
    stockCount: product.stock,
  }), [product.stock]);

  return {
    pricing,
    stockStatus,
    badges,
    availability,
    // Computed display values
    displayPrice: pricing.currentPrice,
    stockMessage: stockStatus.message,
    stockColor: stockStatus.color,
    isOutOfStock: stockStatus.status === 'out-of-stock',
    isLowStock: stockStatus.status === 'low-stock',
  };
};