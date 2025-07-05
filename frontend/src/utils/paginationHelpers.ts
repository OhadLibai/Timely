/**
 * Pagination calculation utilities
 */

/**
 * Calculates visible page numbers for pagination component
 */
export const getVisiblePages = (
  currentPage: number, 
  totalPages: number, 
  maxVisiblePages: number = 5
): number[] => {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisiblePages / 2);
  let start = currentPage - half;
  let end = currentPage + half;

  if (start < 1) {
    end = end + (1 - start);
    start = 1;
  }

  if (end > totalPages) {
    start = start - (end - totalPages);
    end = totalPages;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

/**
 * Calculates pagination metadata
 */
export const getPaginationInfo = (currentPage: number, totalPages: number, totalItems: number, itemsPerPage: number) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return {
    startItem,
    endItem,
    totalItems,
    currentPage,
    totalPages,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages
  };
};