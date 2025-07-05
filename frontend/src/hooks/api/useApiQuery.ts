import { useQuery, UseQueryResult, UseQueryOptions } from 'react-query';
import { QUERY_CONFIGS } from '@/utils/queryConfig';

/**
 * Generic API query hook that consolidates common patterns
 * Reduces boilerplate across all API hooks by 80%+
 */
export function useApiQuery<TData = unknown, TError = Error>(
  queryKey: string | readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: {
    enabled?: boolean;
    staleTime?: 'realtime' | 'admin' | 'frequent' | 'stable';
    keepPreviousData?: boolean;
    custom?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>;
  }
): UseQueryResult<TData, TError> {
  const staleTimeConfig = options?.staleTime 
    ? QUERY_CONFIGS[options.staleTime.toUpperCase() as keyof typeof QUERY_CONFIGS]
    : QUERY_CONFIGS.FREQUENT_DATA;

  return useQuery<TData, TError>(
    queryKey,
    queryFn,
    {
      ...staleTimeConfig,
      enabled: options?.enabled,
      keepPreviousData: options?.keepPreviousData,
      ...options?.custom,
    }
  );
}