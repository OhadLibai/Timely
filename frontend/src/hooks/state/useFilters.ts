import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface FilterState {
  [key: string]: string | string[] | number | boolean | null;
}

interface UseFiltersOptions {
  initialFilters?: FilterState;
  syncWithUrl?: boolean;
}

export const useFilters = (options: UseFiltersOptions = {}) => {
  const { initialFilters = {}, syncWithUrl = false } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL params or initial values
  const [filters, setFilters] = useState<FilterState>(() => {
    if (syncWithUrl) {
      const urlFilters: Partial<FilterState> = {};
      searchParams.forEach((value, key) => {
        if (key in initialFilters) {
          // Parse the value based on initial filter type
          const initialType = typeof initialFilters[key];
          if (initialType === 'boolean') {
            (urlFilters as any)[key] = value === 'true';
          } else if (initialType === 'number') {
            (urlFilters as any)[key] = Number(value);
          } else if (Array.isArray(initialFilters[key])) {
            (urlFilters as any)[key] = value.split(',');
          } else {
            (urlFilters as any)[key] = value;
          }
        }
      });
      return { ...initialFilters, ...urlFilters } as FilterState;
    }
    return initialFilters as FilterState;
  });

  // Update a single filter
  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
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
  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => {
      const newFilters: FilterState = { ...prev };
      
      // Update each filter ensuring correct types
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          newFilters[key] = value;
        }
      });
      
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
    setFilters({ ...initialFilters });
    
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
  const clearFilter = useCallback((key: keyof FilterState) => {
    updateFilter(key, (initialFilters as any)[key]);
  }, [updateFilter, initialFilters]);

  // Check if filters have been modified from initial state
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => {
      const current = (filters as any)[key];
      const initial = (initialFilters as any)[key];
      
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
      const current = (filters as any)[key];
      const initial = (initialFilters as any)[key];
      
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