import { useQuery, UseQueryResult } from 'react-query';
import { predictionService } from '@/services/prediction.service';

export const usePredictedBasket = (): UseQueryResult<any> => {
  return useQuery(
    'predicted-basket',
    predictionService.getPredictedBasket,
    {
      staleTime: 1 * 60 * 1000, // 1 minute - predictions can change more frequently
      refetchOnWindowFocus: false,
    }
  );
};