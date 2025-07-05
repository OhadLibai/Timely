import { useQuery, UseQueryResult } from 'react-query';
import { productService, Product, ProductsResponse, ProductFilters } from '@/services/product.service';
import { QUERY_CONFIGS } from '@/utils/queryConfig';

export const useProducts = (
  filters: ProductFilters = {}
): UseQueryResult<ProductsResponse> => {
  return useQuery(
    ['products', filters],
    () => productService.getProducts(filters),
    {
      keepPreviousData: true,
      ...QUERY_CONFIGS.FREQUENT_DATA,
    }
  );
};

export const useProduct = (
  productId: string
): UseQueryResult<Product> => {
  return useQuery(
    ['product', productId],
    () => productService.getProduct(productId),
    {
      enabled: !!productId,
      ...QUERY_CONFIGS.STABLE_DATA,
    }
  );
};

export const useCategories = (): UseQueryResult<string[]> => {
  return useQuery(
    'categories',
    productService.getCategories,
    QUERY_CONFIGS.STABLE_DATA // Categories don't change often
  );
};