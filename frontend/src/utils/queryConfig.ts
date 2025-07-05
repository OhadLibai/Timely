// Common React Query configuration utilities to eliminate duplication
// Replaces 18+ repeated query config objects across the codebase

/**
 * Predefined query configurations for different data types
 * Based on actual usage patterns found across hooks
 */
export const QUERY_CONFIGS = {
  /** 1 minute - for real-time data (predictions, system health) */
  REALTIME: {
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
  },
  
  /** 2 minutes - for admin/demo data that changes moderately */
  ADMIN_DATA: {
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  },
  
  /** 5 minutes - for frequently changing data (orders, products, dashboard) */
  FREQUENT_DATA: {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  },
  
  /** 10 minutes - for stable data (categories, ML metrics) */
  STABLE_DATA: {
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  },
} as const;

/**
 * Create query config with custom options
 */
export const createQueryConfig = (
  baseConfig: typeof QUERY_CONFIGS[keyof typeof QUERY_CONFIGS],
  overrides?: Record<string, any>
) => ({
  ...baseConfig,
  ...overrides,
});