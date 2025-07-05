// API Hooks
export { useFavoriteToggle } from './api/useFavoriteToggle';
export { useCartOperations } from './api/useCartOperations';
export { useMutationWithToast } from './api/useMutationWithToast';
export { useProducts, useProduct, useCategories } from './api/useProducts';
export { useOrders, useOrder } from './api/useOrders';
export { useFavorites } from './api/useFavorites';
export { 
  useDashboardOverview, 
  useDemoUserSeeding, 
  useModelPerformance, 
  useUserPredictionAnalysis, 
  useSystemStatus, 
  useAdminDataViews 
} from './api/useAdmin';
export { usePredictedBasket } from './api/usePredictions';

// Auth Hooks
export { useAuthenticatedAction } from './auth/useAuthenticatedAction';

// UI Hooks
export { useModal } from './ui/useModal';
export { useProductDisplay } from './ui/useProductDisplay';

// State Hooks
export { useLocalStorage } from './state/useLocalStorage';
export { useFilters } from './state/useFilters';

// Search Hooks
export { useSearchWithHistory } from './search/useSearchWithHistory';