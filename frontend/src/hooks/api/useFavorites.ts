import { useQuery, UseQueryResult } from 'react-query';
import { favoriteService } from '@/services/favorite.service';

export const useFavorites = (): UseQueryResult<any[]> => {
  return useQuery(
    'favorites',
    favoriteService.getFavorites,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );
};