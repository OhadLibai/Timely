// frontend/src/components/common/ListPage.tsx

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Grid, List, LucideIcon } from 'lucide-react';
import { AsyncStateWrapper } from '@/components/common';
import { ProductGrid } from '@/components/layout/ResponsiveGrid';
import Pagination from '@/components/common/Pagination';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';

interface ListPageProps<T> {
  // Header
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  
  // Data and loading
  data?: T[];
  isLoading: boolean;
  error: any;
  onRetry?: () => void;
  
  // Empty state
  emptyState: ReactNode;
  
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  
  // View mode
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  
  // Filters
  showFilters: boolean;
  onToggleFilters: () => void;
  filtersComponent?: ReactNode;
  
  // Sorting
  sortComponent?: ReactNode;
  
  // Pagination
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  
  // Item rendering
  renderGridItem: (item: T, index: number) => ReactNode;
  renderListItem: (item: T, index: number) => ReactNode;
  
  // Additional actions
  additionalActions?: ReactNode;
  
  // Grid configuration
  gridClassName?: string;
}

function ListPage<T>({
  title,
  subtitle,
  icon: Icon,
  data = [],
  isLoading,
  error,
  onRetry,
  emptyState,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  viewMode,
  onViewModeChange,
  showFilters,
  onToggleFilters,
  filtersComponent,
  sortComponent,
  currentPage,
  totalPages,
  onPageChange,
  renderGridItem,
  renderListItem,
  additionalActions,
  gridClassName,
}: ListPageProps<T>) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PageHeader
        title={title}
        description={subtitle}
        icon={Icon}
      />

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center gap-4">
                {/* Filters Toggle */}
                <Button
                  variant="outline"
                  onClick={onToggleFilters}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>

                {/* Sort Component */}
                {sortComponent}

                {/* View Mode Toggle */}
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => onViewModeChange('grid')}
                    className={`p-2 ${
                      viewMode === 'grid'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onViewModeChange('list')}
                    className={`p-2 ${
                      viewMode === 'list'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>

                {/* Additional Actions */}
                {additionalActions}
              </div>
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && filtersComponent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 border-t border-gray-200 mt-6">
                    {filtersComponent}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          <div className="p-6">
            <AsyncStateWrapper
              loading={isLoading}
              error={error}
              data={data}
              onRetry={onRetry}
              isEmpty={!data || data.length === 0}
              emptyState={emptyState}
            >
              {viewMode === 'grid' ? (
                <ProductGrid className={gridClassName}>
                  {data?.map((item, index) => renderGridItem(item, index))}
                </ProductGrid>
              ) : (
                <div className="space-y-4">
                  {data?.map((item, index) => renderListItem(item, index))}
                </div>
              )}
            </AsyncStateWrapper>
          </div>

          {/* Pagination */}
          {currentPage && totalPages && onPageChange && totalPages > 1 && (
            <div className="border-t border-gray-200 px-6 py-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListPage;