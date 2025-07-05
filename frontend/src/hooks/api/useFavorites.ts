import { useQuery, UseQueryResult } from 'react-query';
import { favoriteService } from '@/services/favorite.service';
import { QUERY_CONFIGS } from '@/utils/queryConfig';

export const useFavorites = (): UseQueryResult<any[]> => {
  return useQuery(
    'favorites',
    favoriteService.getFavorites,
    QUERY_CONFIGS.FREQUENT_DATA
  );
};