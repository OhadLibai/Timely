import { UseQueryResult } from 'react-query';
import { predictionService } from '@/services/prediction.service';
import { useApiQuery } from './useApiQuery';
import { QUERY_KEYS } from '@/utils/queryKeys';

export const usePredictedBasket = (): UseQueryResult<any> => {
  return useApiQuery(
    QUERY_KEYS.predictions(),
    predictionService.getPredictedBasket,
    {
      staleTime: 'stable',
    }
  );
};