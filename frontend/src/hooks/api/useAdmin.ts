// frontend/src/hooks/api/useAdmin.ts

import { useQueryClient } from 'react-query';
import { useMutationWithToast } from './useMutationWithToast';
import { adminService } from '@/services/admin.service';
import { useApiQuery } from './useApiQuery';
import { QUERY_KEYS } from '@/utils/queryKeys';
import { ModelMetrics } from '@/services/evaluation.service';

// ============================================================================
// DASHBOARD OVERVIEW HUB HOOKS
// ============================================================================

/**
 * Hook for Overview Hub - uses existing services + direct API calls
 * Returns zero defaults until first evaluation is run
 */
export const useMetricsOverview = (): ModelMetrics => {
  try {
    const queryClient = useQueryClient();
    
    const defaultData: ModelMetrics = {
      PrecisionAt: 0.000,
      RecallAt: 0.000,
      F1ScoreAt: 0.000,
      NDCGAt: 0.000,
      JaccardSimilarity: 0.000
    };
    
    const queryKey = QUERY_KEYS.mlMetrics();
    const cachedData = queryClient.getQueryData<ModelMetrics>(queryKey);
    const data = cachedData || defaultData;
    
    return data;
  } catch (error) {
    console.error('useMetricsOverview hook error:', error);
    return {
      PrecisionAt: 0.000,
      RecallAt: 0.000,
      F1ScoreAt: 0.000,
      NDCGAt: 0.000,
      JaccardSimilarity: 0.000
    };
  }
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
    successMessage: (data: any) => {
      return data.success !== false ? 'Demo user seeded successfully' : '';
    },
    warningMessage: (data: any) => {
      return data.success === false ? 'User already exists' : '';
    },
    errorMessage: 'Failed to seed demo user',
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries(QUERY_KEYS.adminDemoStats()); // currently does not really handling the user management system so...
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
      staleTime: 'stable', 
    }
  );

  return {
    prediction,
    isAnalyzing: prediction.isLoading,
    analysisError: prediction.error
  };
};
