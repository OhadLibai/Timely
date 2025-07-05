/**
 * Number formatting utilities for consistent display across the application
 */

/**
 * Formats large numbers with K/M suffixes
 */
export const formatLargeNumber = (val: string | number): string => {
  if (typeof val === 'number') {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  }
  return val;
};

/**
 * Formats percentage values with optional decimal places
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Formats confidence scores to percentage with color coding
 */
export const formatConfidenceScore = (score: number): string => {
  return `${(score * 100).toFixed(0)}%`;
};