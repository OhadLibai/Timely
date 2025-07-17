import { UseQueryResult } from 'react-query';
import { favoriteService } from '@/services/favorite.service';
import { useApiQuery } from './useApiQuery';
import { QUERY_KEYS } from '@/utils/queryKeys';

export const useFavorites = (): UseQueryResult<any[]> => {
  return useApiQuery(
    QUERY_KEYS.favorites(),
    favoriteService.getFavorites,
    {
      staleTime: 'stable',
    }
  );
};