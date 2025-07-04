import { useQuery, UseQueryResult } from 'react-query';
import { productService, Product, ProductsResponse, ProductFilters } from '@/services/product.service';

export const useProducts = (
  filters: ProductFilters = {}
): UseQueryResult<ProductsResponse> => {
  return useQuery(
    ['products', filters],
    () => productService.getProducts(filters),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
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
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );
};

export const useCategories = (): UseQueryResult<string[]> => {
  return useQuery(
    'categories',
    productService.getCategories,
    {
      staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
      refetchOnWindowFocus: false,
    }
  );
};