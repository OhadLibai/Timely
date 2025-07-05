import { UseQueryResult } from 'react-query';
import { productService, Product, Category } from '@/services/product.service';
import type { ProductsResponse, ProductFilters } from '@/services/product.service';
import { useApiQuery } from './useApiQuery';
import { QUERY_KEYS } from '@/utils/queryKeys';

export const useProducts = (
  filters: ProductFilters = {}
): UseQueryResult<ProductsResponse> => {
  return useApiQuery(
    QUERY_KEYS.products(filters),
    () => productService.getProducts(filters),
    {
      staleTime: 'frequent',
      keepPreviousData: true,
    }
  );
};

export const useProduct = (
  productId: string
): UseQueryResult<Product> => {
  return useApiQuery(
    QUERY_KEYS.product(productId),
    () => productService.getProduct(productId),
    {
      enabled: !!productId,
      staleTime: 'stable',
    }
  );
};

export const useCategories = (): UseQueryResult<Category[]> => {
  return useApiQuery(
    QUERY_KEYS.categories(),
    productService.getCategories,
    {
      staleTime: 'stable',
    }
  );
};