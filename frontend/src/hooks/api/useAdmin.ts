import { useQuery, UseQueryResult } from 'react-query';
import { adminService } from '@/services/admin.service';

export const useDashboardData = (): UseQueryResult<any> => {
  return useQuery(
    'dashboard',
    adminService.getDashboardStats,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    }
  );
};

export const useModelMetrics = (): UseQueryResult<any> => {
  return useQuery(
    'model-metrics',
    adminService.getModelMetrics,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );
};

export const useMetrics = (timeRange: string): UseQueryResult<any> => {
  return useQuery(
    ['metrics', timeRange],
    () => adminService.getMetrics(timeRange),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    }
  );
};

export const useDemoUserMetadata = (): UseQueryResult<any> => {
  return useQuery(
    'demoUserMetadata',
    adminService.getDemoUserIds,
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );
};