// frontend/src/components/common/PageHeader.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { IconType } from 'react-icons';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon | IconType;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
  animated?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  actions,
  breadcrumb,
  className = '',
  animated = true
}) => {
  const content = (
    <div className={`flex items-center justify-between gap-6 ${className}`}>
      <div className="flex-1 text-center">
        {breadcrumb && (
          <div className="mb-2">
            {breadcrumb}
          </div>
        )}
        
        <div className="flex items-center justify-center gap-3 mb-2">
          {Icon && (
            <div className="p-2 bg-primary-100/30 rounded-lg">
              <Icon className="w-6 h-6 text-primary-600" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900">
            {title}
          </h1>
        </div>
        
        {description && (
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {description}
          </p>
        )}
      </div>
      
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        {content}
      </motion.div>
    );
  }

  return <div className="mb-8">{content}</div>;
};

export default PageHeader;