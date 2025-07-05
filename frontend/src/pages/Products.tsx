// frontend/src/pages/Products.tsx
// CLEANED: Removed "On Sale" filter and sale-related query parameters
// CLEANED: Removed price range filtering - no price filters needed
// FOCUSED: Core product browsing for ML prediction demonstrations

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Grid, List, Package } from 'lucide-react';
import { useProducts, useCategories } from '@/hooks';
import { ProductGrid } from '@/components/layout/ResponsiveGrid';
import { AsyncStateWrapper } from '@/components/common';
import ProductCard from '@/components/products/ProductCard';
import ProductListItem from '@/components/products/ProductListItem';
import CategoryFilter from '@/components/products/CategoryFilter';
import SortDropdown, { SortOption, parseSortOption } from '@/components/products/SortDropdown';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';

// CLEANED: Removed priceRange from FilterState
interface FilterState {
  categories: string[];
  inStock: boolean;
}

const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [sortOption, setSortOption] = useState<SortOption>('popularity-desc');
  
  // CLEANED: Removed priceRange from filters state
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    inStock: false,
  });

  const itemsPerPage = 24;

  // Parse sort option for API call
  const { sortBy, sortOrder } = parseSortOption(sortOption);

  // CLEANED: Removed minPrice/maxPrice from API call
  const { data, isLoading, error } = useProducts({
    page: currentPage,
    limit: itemsPerPage,
    sort: sortBy,
    order: sortOrder,
    search: searchQuery,
    categories: filters.categories,
    inStock: filters.inStock,
  });

  // Fetch categories for filter
  const { data: categories } = useCategories();

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

  // CLEANED: Simplified active filter count (no price range)
  const activeFilterCount = filters.categories.length + (filters.inStock ? 1 : 0);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      categories: [],
      inStock: false,
    });
    setCurrentPage(1);
    setSearchParams({});
  };

  // Reset to first page when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortOption]);

  const products = data?.products || [];
  const pagination = data?.pagination || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title="Products"
          description="Discover our collection of fresh groceries and everyday essentials"
          icon={Package}
        />

        {/* Search and Controls */}
        <div className="mb-8 space-y-4">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              icon={Search}
            >
              Search
            </Button>
          </form>
          
          {/* Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                icon={Filter}
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full ml-2">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              
              {activeFilterCount > 0 && (
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  icon={X}
                >
                  Clear Filters
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <SortDropdown
                value={sortOption}
                onChange={setSortOption}
              />
              
              {/* View Mode Toggle */}
              <div className="flex bg-white border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-l-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-r-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar - CLEANED: Removed PriceRangeFilter */}
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
          <AsyncStateWrapper
            loading={isLoading}
            error={error}
            isEmpty={products.length === 0}
            emptyTitle="No products found"
            emptyDescription="No products found matching your criteria."
            emptyState={
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  No products found matching your criteria.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Clear filters to see all products
                </button>
              </div>
            }
            className="flex-1"
          >
              <>
                {/* Results Summary */}
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-gray-600">
                    {pagination.total} products found
                    {searchQuery && (
                      <span className="ml-1">for "{searchQuery}"</span>
                    )}
                  </p>
                </div>

                {/* Product Grid/List */}
                <AnimatePresence mode="wait">
                  {viewMode === 'grid' ? (
                    <ProductGrid
                      key="grid"
                      animated={true}
                    >
                      {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </ProductGrid>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {products.map((product) => (
                        <ProductListItem key={product.id} product={product} variant="compact" showRating={false} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-12 flex justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={pagination.totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
          </AsyncStateWrapper>
        </div>
      </div>
    </div>
  );
};

export default Products;