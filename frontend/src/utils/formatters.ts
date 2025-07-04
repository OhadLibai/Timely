// frontend/src/utils/formatters.ts

/**
 * Format price for display with currency
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};

/**
 * Format product stock status
 */
export const formatStockStatus = (stock: number): { 
  status: 'in-stock' | 'low-stock' | 'out-of-stock'; 
  text: string;
  className: string;
} => {
  if (stock === 0) {
    return {
      status: 'out-of-stock',
      text: 'Out of Stock',
      className: 'text-red-600 bg-red-50'
    };
  } else if (stock <= 10) {
    return {
      status: 'low-stock', 
      text: `Only ${stock} left`,
      className: 'text-orange-600 bg-orange-50'
    };
  } else {
    return {
      status: 'in-stock',
      text: 'In Stock',
      className: 'text-green-600 bg-green-50'
    };
  }
};

/**
 * Format product weight/size display
 */
export const formatProductSize = (size?: string, unit?: string): string => {
  if (!size) return '';
  return unit ? `${size} ${unit}` : size;
};

/**
 * Format rating display
 */
export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

/**
 * Generate product badge information
 */
export const getProductBadges = (product: {
  isNew?: boolean;
  isOrganic?: boolean;
}): Array<{ type: string; text: string; className: string }> => {
  const badges = [];

  if (product.isNew) {
    badges.push({
      type: 'new',
      text: 'NEW',
      className: 'bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold'
    });
  }

  if (product.isOrganic) {
    badges.push({
      type: 'organic',
      text: 'ORGANIC',
      className: 'bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold'
    });
  }

  return badges;
};


/**
 * Format order number for display
 */
export const formatOrderNumber = (orderNumber: string): string => {
  // If order number is already formatted, return as is
  if (orderNumber.includes('#')) {
    return orderNumber;
  }
  
  // Add # prefix if not present
  return `#${orderNumber}`;
};