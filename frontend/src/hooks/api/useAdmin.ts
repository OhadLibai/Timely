// frontend/src/hooks/api/useAdmin.ts
// UPDATED: Using existing services and direct API calls where needed
// CONSTRAINT: Cannot modify services in services directory

import { useQueryClient, UseQueryResult } from 'react-query';
import { useMutationWithToast } from './useMutationWithToast';
import { adminService } from '@/services/admin.service';
import { metricsService } from '@/services/metrics.service';
import { api } from '@/services/api.client';
import { useApiQuery } from './useApiQuery';
import { QUERY_KEYS } from '@/utils/queryKeys';

// ============================================================================
// DASHBOARD OVERVIEW HUB HOOKS
// ============================================================================

/**
 * Hook for Overview Hub Dashboard - uses existing services + direct API calls
 */
export const useDashboardOverview = (dateRange?: any) => {
  const dashboardStats = useApiQuery(
    QUERY_KEYS.adminDashboardStats(dateRange),
    () => api.get('/admin/dashboard/stats', { params: dateRange }),
    { staleTime: 'frequent' }
  );

  const mlMetrics = useApiQuery(
    QUERY_KEYS.mlMetrics(),
    () => metricsService.getModelPerformance(100),
    { staleTime: 'stable' }
  );

  const demoStats = useApiQuery(
    QUERY_KEYS.adminDemoStats(),
    () => api.get('/admin/demo/user-ids'),
    { staleTime: 'admin' }
  );

  return {
    dashboardStats,
    mlMetrics,
    demoStats,
    isLoading: dashboardStats.isLoading || mlMetrics.isLoading || demoStats.isLoading,
    error: dashboardStats.error || mlMetrics.error || demoStats.error
  };
};

// ============================================================================
// DEMAND 1: DEMO USER CREATION HOOKS
// ============================================================================

/**
 * Hook for demo user seeding functionality - uses existing adminService
 */
export const useDemoUserSeeding = () => {
  const queryClient = useQueryClient();

  const seedUser = useMutationWithToast({
    mutationFn: (instacartUserId: string) => adminService.seedDemoUser(instacartUserId),
    successMessage: 'Demo user seeded successfully',
    errorMessage: 'Failed to seed demo user',
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries(QUERY_KEYS.adminDemoStats());
      queryClient.invalidateQueries(QUERY_KEYS.adminDashboardStats());
    }
  });

  const demoUserStats = useApiQuery(
    QUERY_KEYS.adminDemoStats(),
    () => api.get('/admin/demo/user-ids'),
    { staleTime: 'admin' }
  );

  return {
    seedUser,
    demoUserStats,
    isSeeding: seedUser.isLoading,
    seedingError: seedUser.error
  };
};

// ============================================================================
// DEMAND 2: MODEL PERFORMANCE EVALUATION HOOKS
// ============================================================================

/**
 * Hook for ML model performance metrics - uses existing metricsService
 */
export const useModelPerformance = () => {
  const queryClient = useQueryClient();

  const metrics = useApiQuery(
    QUERY_KEYS.mlMetrics(),
    () => metricsService.getModelPerformance(100),
    { staleTime: 'stable' }
  );

  const runEvaluation = useMutationWithToast({
    mutationFn: (sampleSize?: number) => metricsService.getModelPerformance(sampleSize || 100),
    successMessage: 'Model evaluation completed successfully',
    errorMessage: 'Failed to run model evaluation',
    onSuccess: () => {
      // Invalidate metrics to refresh with new data
      queryClient.invalidateQueries(QUERY_KEYS.mlMetrics());
    }
  });

  return {
    metrics,
    runEvaluation,
    isEvaluating: runEvaluation.isLoading,
    evaluationError: runEvaluation.error
  };
};

// ============================================================================
// DEMAND 3: INDIVIDUAL USER PREDICTION HOOKS
// ============================================================================

/**
 * Hook for individual user prediction analysis - uses existing adminService
 */
export const useUserPredictionAnalysis = (userId?: string) => {
  const prediction = useApiQuery(
    QUERY_KEYS.adminUserPrediction(userId!),
    () => adminService.getUserPredictionComparison(userId!),
    {
      enabled: !!userId,
      staleTime: 'frequent',
    }
  );

  return {
    prediction,
    isAnalyzing: prediction.isLoading,
    analysisError: prediction.error
  };
};

// ============================================================================
// SYSTEM STATUS HOOKS
// ============================================================================

/**
 * Hook for system health monitoring - direct API calls
 */
export const useSystemStatus = () => {
  const systemHealth = useApiQuery(
    QUERY_KEYS.adminSystemHealth(),
    () => api.get('/admin/system/health'),
    { staleTime: 'realtime' }
  );

  const architectureStatus = useApiQuery(
    QUERY_KEYS.adminArchitectureStatus(),
    () => api.get('/admin/architecture/status'),
    { staleTime: 'frequent' }
  );

  return {
    systemHealth,
    architectureStatus,
    isHealthy: systemHealth.data?.status === 'healthy',
    isLoading: systemHealth.isLoading || architectureStatus.isLoading
  };
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for admin data views (products, users, orders) - direct API calls
 */
export const useAdminDataViews = () => {
  const getProducts = (filters?: any) => 
    useApiQuery(
      QUERY_KEYS.adminProducts(filters),
      () => api.get('/admin/products', { params: filters }),
      { enabled: false, staleTime: 'frequent' }
    );

  const getUsers = (filters?: any) =>
    useApiQuery(
      QUERY_KEYS.adminUsers(filters),
      () => api.get('/admin/users', { params: filters }),
      { enabled: false, staleTime: 'admin' }
    );

  const getOrders = (filters?: any) =>
    useApiQuery(
      QUERY_KEYS.adminOrders(filters),
      () => api.get('/admin/orders', { params: filters }),
      { enabled: false, staleTime: 'frequent' }
    );

  return {
    getProducts,
    getUsers,
    getOrders
  };
};