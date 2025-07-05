/**
 * Color and styling mapping utilities for consistent theming
 */

/**
 * Maps change values to appropriate colors
 */
export const getChangeColor = (change: number | undefined): string => {
  if (change === undefined) return 'text-gray-500';
  if (change > 0) return 'text-green-600';
  if (change < 0) return 'text-red-600';
  return 'text-gray-600';
};

/**
 * Maps user categories to consistent color schemes
 */
export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Regular': 'bg-blue-100 text-blue-800',
    'Organic': 'bg-green-100 text-green-800',
    'Family': 'bg-purple-100 text-purple-800',
    'Health': 'bg-pink-100 text-pink-800',
    'Bulk': 'bg-orange-100 text-orange-800',
    'Diverse': 'bg-indigo-100 text-indigo-800',
    'Premium': 'bg-yellow-100 text-yellow-800',
    'Convenience': 'bg-teal-100 text-teal-800',
    'International': 'bg-red-100 text-red-800',
    'Meal Prep': 'bg-gray-100 text-gray-800'
  };
  return colors[category] || colors.Regular;
};

/**
 * Maps confidence levels to color schemes
 */
export const getConfidenceColors = (score: number) => {
  if (score >= 0.8) {
    return {
      level: 'High',
      color: 'green',
      bgColor: 'bg-green-100/30',
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      description: 'Very likely to be needed'
    };
  } else if (score >= 0.6) {
    return {
      level: 'Medium',
      color: 'yellow',
      bgColor: 'bg-yellow-100/30',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300',
      description: 'Likely to be needed'
    };
  } else {
    return {
      level: 'Low',
      color: 'orange',
      bgColor: 'bg-orange-100/30',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-300',
      description: 'Possibly needed'
    };
  }
};