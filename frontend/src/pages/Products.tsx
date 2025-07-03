// frontend/src/pages/Products.tsx
// CLEANED: Removed "On Sale" filter and sale-related query parameters
// FOCUSED: Core product browsing for ML prediction demonstrations

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Grid, List } from 'lucide-react';
import { useQuery } from 'react-query';
import { productService } from '@/services/product.service';
import ProductCard from '@/components/products/ProductCard';
import ProductListItem from '@/components/products/ProductListItem';
import CategoryFilter from '@/components/products/CategoryFilter';
import PriceRangeFilter from '@/components/products/PriceRangeFilter';
import SortDropdown, { SortOption, parseSortOption } from '@/components/products/SortDropdown';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';

interface FilterState {
  categories: string[];
  priceRange: [number, number];
  inStock: boolean;
}

const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [sortOption, setSortOption] = useState<SortOption>('popularity-desc');
  
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    priceRange: [0, 100],
    inStock: false,
  });

  const itemsPerPage = 24;

  // Parse sort option for API call
  const { sortBy, sortOrder } = parseSortOption(sortOption);

  // Fetch products with clean parameters (no sale filtering)
  const { data, isLoading, error } = useQuery<any>(
    ['products', currentPage, sortBy, sortOrder, filters, searchQuery],
    () => productService.getProducts({
      page: currentPage,
      limit: itemsPerPage,
      sort: sortBy,
      order: sortOrder,
      search: searchQuery,
      categories: filters.categories,
      minPrice: filters.priceRange[0],
      maxPrice: filters.priceRange[1],
      inStock: filters.inStock,
    }),
    { 
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch categories for filter
  const { data: categories } = useQuery(
    'categories',
    () => productService.getCategories(),
    { staleTime: 10 * 60 * 1000 }
  );

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchParams(searchQuery ? { q: searchQuery } : {});
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      categories: [],
      priceRange: [0, 100],
      inStock: false,
    });
    setCurrentPage(1);
  };

  // Update URL when search changes
  useEffect(() => {
    const currentSearch = searchParams.get('q') || '';
    if (currentSearch !== searchQuery) {
      setSearchQuery(currentSearch);
    }
  }, [searchParams]);

  const products = data?.products || [];
  const totalProducts = data?.total || 0;
  const totalPages = Math.ceil(totalProducts / itemsPerPage);

  // Calculate active filter count (excluding sale filter)
  const activeFilterCount = 
    filters.categories.length + 
    (filters.inStock ? 1 : 0) + 
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 100 ? 1 : 0);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error Loading Products
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Products
          </h1>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Search
            </button>
          </form>
          
          {/* Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Filter size={16} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={16} />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <SortDropdown
                value={sortOption}
                onChange={setSortOption}
              />
              
              {/* View Mode Toggle */}
              <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-l-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-r-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-shrink-0 overflow-hidden"
              >
                <div className="w-72 space-y-6">
                  {/* Category Filter */}
                  <CategoryFilter
                    categories={categories || []}
                    selectedCategories={filters.categories}
                    onCategoryChange={(categories) => 
                      handleFilterChange({ categories })
                    }
                  />
                  
                  {/* Price Range Filter */}
                  <PriceRangeFilter
                    minPrice={filters.priceRange[0]}
                    maxPrice={filters.priceRange[1]}
                    onPriceChange={(min, max) => 
                      handleFilterChange({ priceRange: [min, max] })
                    }
                  />
                  
                  {/* Stock Filter */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-3">Availability</h3>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.inStock}
                        onChange={(e) => 
                          handleFilterChange({ inStock: e.target.checked })
                        }
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        In Stock Only
                      </span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product Grid/List */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="large" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No products found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <>
                {/* Products Grid/List */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product: any) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product: any) => (
                      <ProductListItem key={product.id} product={product} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
