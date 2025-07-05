import { useQuery, UseQueryResult } from 'react-query';
import { predictionService } from '@/services/prediction.service';
import { QUERY_CONFIGS } from '@/utils/queryConfig';

export const usePredictedBasket = (): UseQueryResult<any> => {
  return useQuery(
    'predicted-basket',
    predictionService.getPredictedBasket,
    QUERY_CONFIGS.REALTIME // Predictions can change more frequently
  );
};