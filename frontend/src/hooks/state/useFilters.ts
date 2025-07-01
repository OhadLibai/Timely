import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface FilterState {
  [key: string]: string | string[] | number | boolean | null;
}

interface UseFiltersOptions {
  initialFilters?: FilterState;
  syncWithUrl?: boolean;
}

export const useFilters = <T extends FilterState>(options: UseFiltersOptions = {}) => {
  const { initialFilters = {} as T, syncWithUrl = false } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL params or initial values
  const [filters, setFilters] = useState<T>(() => {
    if (syncWithUrl) {
      const urlFilters: Partial<T> = {};
      searchParams.forEach((value, key) => {
        if (key in initialFilters) {
          // Parse the value based on initial filter type
          const initialType = typeof initialFilters[key];
          if (initialType === 'boolean') {
            urlFilters[key as keyof T] = value === 'true' as T[keyof T];
          } else if (initialType === 'number') {
            urlFilters[key as keyof T] = Number(value) as T[keyof T];
          } else if (Array.isArray(initialFilters[key])) {
            urlFilters[key as keyof T] = value.split(',') as T[keyof T];
          } else {
            urlFilters[key as keyof T] = value as T[keyof T];
          }
        }
      });
      return { ...initialFilters, ...urlFilters };
    }
    return initialFilters;
  });

  // Update a single filter
  const updateFilter = useCallback((key: keyof T, value: T[keyof T]) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Sync with URL if enabled
      if (syncWithUrl) {
        const newSearchParams = new URLSearchParams(searchParams);
        
        if (value === null || value === undefined || value === '') {
          newSearchParams.delete(key as string);
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            newSearchParams.delete(key as string);
          } else {
            newSearchParams.set(key as string, value.join(','));
          }
        } else {
          newSearchParams.set(key as string, String(value));
        }
        
        setSearchParams(newSearchParams);
      }
      
      return newFilters;
    });
  }, [searchParams, setSearchParams, syncWithUrl]);

  // Update multiple filters at once
  const updateFilters = useCallback((updates: Partial<T>) => {
    setFilters(prev => {
      const newFilters = { ...prev, ...updates };
      
      // Sync with URL if enabled
      if (syncWithUrl) {
        const newSearchParams = new URLSearchParams(searchParams);
        
        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === undefined || value === '') {
            newSearchParams.delete(key);
          } else if (Array.isArray(value)) {
            if (value.length === 0) {
              newSearchParams.delete(key);
            } else {
              newSearchParams.set(key, value.join(','));
            }
          } else {
            newSearchParams.set(key, String(value));
          }
        });
        
        setSearchParams(newSearchParams);
      }
      
      return newFilters;
    });
  }, [searchParams, setSearchParams, syncWithUrl]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    
    if (syncWithUrl) {
      const newSearchParams = new URLSearchParams();
      // Keep non-filter params
      searchParams.forEach((value, key) => {
        if (!(key in initialFilters)) {
          newSearchParams.set(key, value);
        }
      });
      setSearchParams(newSearchParams);
    }
  }, [initialFilters, searchParams, setSearchParams, syncWithUrl]);

  // Clear a specific filter
  const clearFilter = useCallback((key: keyof T) => {
    updateFilter(key, initialFilters[key]);
  }, [updateFilter, initialFilters]);

  // Check if filters have been modified from initial state
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => {
      const current = filters[key as keyof T];
      const initial = initialFilters[key as keyof T];
      
      if (Array.isArray(current) && Array.isArray(initial)) {
        return current.length !== initial.length || 
               current.some((item, index) => item !== initial[index]);
      }
      
      return current !== initial;
    });
  }, [filters, initialFilters]);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).filter(key => {
      const current = filters[key as keyof T];
      const initial = initialFilters[key as keyof T];
      
      if (Array.isArray(current) && Array.isArray(initial)) {
        return current.length > 0 && current.length !== initial.length;
      }
      
      return current !== null && current !== undefined && 
             current !== '' && current !== initial;
    }).length;
  }, [filters, initialFilters]);

  return {
    filters,
    updateFilter,
    updateFilters,
    clearFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
  };
};