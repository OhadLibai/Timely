import React from 'react';
import { RefreshCcw } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { Button } from './Button';

interface AsyncStateWrapperProps {
  loading: boolean;
  error: any;
  data?: any;
  onRetry?: () => void;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
  isEmpty?: boolean;
  loadingComponent?: React.ReactNode;
  errorTitle?: string;
  errorDescription?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  retryButtonText?: string;
  showRetryButton?: boolean;
  className?: string;
}

export const AsyncStateWrapper: React.FC<AsyncStateWrapperProps> = ({
  loading,
  error,
  data,
  onRetry,
  children,
  emptyState,
  isEmpty,
  loadingComponent,
  errorTitle = "Something went wrong",
  errorDescription = "An error occurred while loading the data.",
  emptyTitle = "No data available",
  emptyDescription = "There's nothing to show here yet.",
  retryButtonText = "Try Again",
  showRetryButton = true,
  className = ""
}) => {
  // Show loading state
  if (loading) {
    return loadingComponent || <LoadingSpinner fullScreen />;
  }

  // Show error state
  if (error) {
    return (
      <div className={`max-w-4xl mx-auto px-4 py-8 ${className}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {errorTitle}
          </h2>
          <p className="text-gray-600 mb-6">
            {errorDescription}
          </p>
          {showRetryButton && onRetry && (
            <Button
              onClick={onRetry}
              variant="primary"
              icon={RefreshCcw}
              className="mx-auto"
            >
              {retryButtonText}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show empty state if explicitly provided or if data is empty
  const shouldShowEmpty = isEmpty || (emptyState && (!data || (Array.isArray(data) && data.length === 0)));
  
  if (shouldShowEmpty) {
    if (emptyState) {
      return <div className={className}>{emptyState}</div>;
    }
    
    return (
      <div className={`max-w-4xl mx-auto px-4 py-8 text-center ${className}`}>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {emptyTitle}
        </h3>
        <p className="text-gray-600">
          {emptyDescription}
        </p>
      </div>
    );
  }

  // Show children (success state)
  return <div className={className}>{children}</div>;
};