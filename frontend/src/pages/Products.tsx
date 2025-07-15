import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { useProducts, useCategories } from '@/hooks';
import ProductCard from '@/components/products/ProductCard';
import ProductListItem from '@/components/products/ProductListItem';
import CategoryFilter from '@/components/products/CategoryFilter';
import SortDropdown, { SortOption, parseSortOption } from '@/components/products/SortDropdown';
import EmptyState from '@/components/common/EmptyState';
import ListPage from '@/components/common/ListPage';

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
  
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    inStock: false,
  });

  const itemsPerPage = 24;
  const { sortBy, sortOrder } = parseSortOption(sortOption);

  const { data, isLoading, error } = useProducts({
    page: currentPage,
    limit: itemsPerPage,
    sort: sortBy,
    order: sortOrder,
    search: searchQuery,
    categories: filters.categories,
    inStock: filters.inStock,
  });

  const { data: categories } = useCategories();

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    setSearchParams(query ? { q: query } : {});
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ categories: [], inStock: false });
    setCurrentPage(1);
    setSearchParams({});
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [sortOption]);

  const products = data?.products || [];
  const pagination = {
    totalPages: data?.totalPages || 1,
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    page: data?.page || 1
  };



  const filtersComponent = (
    <div className="space-y-6">
      <CategoryFilter
        categories={categories || []}
        selectedCategory={filters.categories[0] || ''}
        onCategoryChange={(categoryId) => handleFilterChange({ categories: categoryId ? [categoryId] : [] })}
      />
      
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-700 mb-3">Availability</h3>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => handleFilterChange({ inStock: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="ml-2 text-sm text-gray-600">In Stock Only</span>
        </label>
      </div>
    </div>
  );

  const emptyState = (
    <EmptyState
      icon={Package}
      title="No products found"
      description="No products found matching your criteria."
      action={{
        label: "Clear filters",
        onClick: clearFilters
      }}
    />
  );

  return (
    <ListPage
      title="Products"
      subtitle="Discover our collection of fresh groceries and everyday essentials"
      icon={Package}
      data={products}
      isLoading={isLoading}
      error={error}
      emptyState={emptyState}
      searchQuery={searchQuery}
      onSearchChange={handleSearchChange}
      searchPlaceholder="Search for products..."
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      filtersComponent={filtersComponent}
      sortComponent={
        <SortDropdown value={sortOption} onChange={setSortOption} />
      }
      currentPage={currentPage}
      totalPages={pagination.totalPages || 1}
      onPageChange={setCurrentPage}
      renderGridItem={(product: any) => (
        <ProductCard key={product.id} product={product} />
      )}
      renderListItem={(product: any) => (
        <motion.div key={product.id}>
          <ProductListItem 
            product={product} 
            variant="compact" 
            showRating={false} 
          />
        </motion.div>
      )}
    />
  );
};

export default Products;