/**
 * Centralized React Query keys to avoid typos and ensure consistency
 * Based on actual usage patterns found across the codebase
 */

export const QUERY_KEYS = {
  // Product-related queries
  products: (filters?: any) => ['products', filters],
  product: (id: string) => ['product', id],
  categories: () => ['categories'],
  
  // Order-related queries
  orders: (filters?: any) => ['orders', filters],
  order: (id: string) => ['order', id],
  
  // User-related queries
  favorites: () => ['favorites'],
  cart: () => ['cart'],
  
  // Admin-related queries
  adminDemoStats: () => ['admin', 'demo', 'stats'],
  adminUserPrediction: (userId: string) => ['admin', 'user', 'prediction', userId],
  
  // ML/Prediction queries
  predictions: () => ['predictions'],
  mlMetrics: () => ['ml', 'metrics'],
} as const;

export type QueryKey = ReturnType<typeof QUERY_KEYS[keyof typeof QUERY_KEYS]>;