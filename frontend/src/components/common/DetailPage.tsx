import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Button } from '@/components/common/Button';

interface DetailPageProps {
  // Data and loading
  isLoading: boolean;
  error: any;
  onRetry?: () => void;
  
  // Navigation
  backLabel?: string;
  backUrl?: string;
  onBack?: () => void;
  
  // Content
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  
  // Layout
  leftColumn: ReactNode;
  rightColumn: ReactNode;
  
  // Additional content (optional)
  bottomContent?: ReactNode;
  
  // Error content
  errorTitle?: string;
  errorDescription?: string;
  
  // Custom classes
  containerClassName?: string;
  leftColumnClassName?: string;
  rightColumnClassName?: string;
}

const DetailPage: React.FC<DetailPageProps> = ({
  isLoading,
  error,
  onRetry,
  backLabel = "Back",
  backUrl,
  onBack,
  title,
  subtitle,
  headerActions,
  leftColumn,
  rightColumn,
  bottomContent,
  errorTitle = "Not found",
  errorDescription = "The item you're looking for could not be found.",
  containerClassName = "max-w-7xl",
  leftColumnClassName = "lg:col-span-2",
  rightColumnClassName = "lg:col-span-1",
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (error) {
    return (
      <div className={`${containerClassName} mx-auto px-4 py-8`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {errorTitle}
          </h2>
          <p className="text-gray-600 mb-6">
            {errorDescription}
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </Button>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="primary"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`${containerClassName} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
        {/* Back Button */}
        <motion.button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          whileHover={{ x: -4 }}
        >
          <ArrowLeft className="w-5 h-5" />
          {backLabel}
        </motion.button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-lg text-gray-600 mt-2">{subtitle}</p>
              )}
            </div>
            {headerActions && (
              <div className="flex flex-wrap gap-3">
                {headerActions}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className={leftColumnClassName}>
            {leftColumn}
          </div>

          {/* Right Column */}
          <div className={rightColumnClassName}>
            {rightColumn}
          </div>
        </div>

        {/* Bottom Content */}
        {bottomContent && (
          <div className="mt-12">
            {bottomContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailPage;