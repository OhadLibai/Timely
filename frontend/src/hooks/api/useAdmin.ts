// frontend/src/hooks/api/useAdmin.ts
// UPDATED: Using existing services and direct API calls where needed
// CONSTRAINT: Cannot modify services in services directory

import { useQueryClient } from 'react-query';
import { useMutationWithToast } from './useMutationWithToast';
import { adminService } from '@/services/admin.service';
import { evaluationService } from '@/services/evaluation.service';
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
  const mlMetrics = useApiQuery(
    QUERY_KEYS.mlMetrics(),
    () => evaluationService.getModelMetricsScores(),
    { staleTime: 'stable' }
  );

  return {
    mlMetrics,
    isLoading: mlMetrics.isLoading,
    error: mlMetrics.error
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

  return {
    seedUser,
    isSeeding: seedUser.isLoading,
    seedingError: seedUser.error
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
