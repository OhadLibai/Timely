import { useState, useCallback, useEffect } from 'react';
import { useQuery } from 'react-query';
import { productService } from '@/services/product.service';
// Note: Uses configurable staleTime (default 30s) for search-specific caching needs

interface UseSearchWithHistoryOptions {
  storageKey?: string;
  maxHistoryItems?: number;
  minSearchLength?: number;
  staleTime?: number;
}

export const useSearchWithHistory = (options: UseSearchWithHistoryOptions = {}) => {
  const {
    storageKey = 'recentSearches',
    maxHistoryItems = 5,
    minSearchLength = 3,
    staleTime = 30000, // 30 seconds
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save recent searches to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(recentSearches));
    } catch (error) {
      console.warn('Failed to save recent searches:', error);
    }
  }, [recentSearches, storageKey]);

  // Search query
  const { data: searchResults, isLoading, error } = useQuery(
    ['search', searchTerm],
    () => productService.searchProducts(searchTerm),
    {
      enabled: searchTerm.length >= minSearchLength,
      staleTime,
    }
  );

  // Add search to history
  const addToHistory = useCallback((term: string) => {
    const trimmedTerm = term.trim();
    if (!trimmedTerm) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(item => item !== trimmedTerm);
      return [trimmedTerm, ...filtered].slice(0, maxHistoryItems);
    });
  }, [maxHistoryItems]);

  // Clear search history
  const clearHistory = useCallback(() => {
    setRecentSearches([]);
  }, []);

  // Execute search and add to history
  const executeSearch = useCallback((term: string) => {
    const trimmedTerm = term.trim();
    if (!trimmedTerm) return;

    addToHistory(trimmedTerm);
    // Return the search term for navigation purposes
    return trimmedTerm;
  }, [addToHistory]);

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Handle search submission
  const handleSearchSubmit = useCallback((term?: string) => {
    const searchValue = term || searchTerm;
    return executeSearch(searchValue);
  }, [searchTerm, executeSearch]);

  // Quick search (for suggestions)
  const handleQuickSearch = useCallback((term: string) => {
    setSearchTerm(term);
    return executeSearch(term);
  }, [executeSearch]);

  return {
    // Search state
    searchTerm,
    searchResults,
    isLoading,
    error,
    
    // History state
    recentSearches,
    
    // Actions
    setSearchTerm: handleSearchChange,
    executeSearch: handleSearchSubmit,
    quickSearch: handleQuickSearch,
    addToHistory,
    clearHistory,
    
    // Computed values
    hasResults: searchResults && searchResults.length > 0,
    isSearching: searchTerm.length >= minSearchLength,
  };
};