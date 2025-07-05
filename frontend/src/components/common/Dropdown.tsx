import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useModal } from '@/hooks/ui/useModal';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
  position?: 'left' | 'right' | 'center';
  size?: 'sm' | 'md' | 'lg';
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  title,
  showCloseButton = false,
  className = '',
  contentClassName = '',
  position = 'right',
  size = 'md'
}) => {
  const { isOpen, open, close, handleContentClick } = useModal();

  const positions = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 transform -translate-x-1/2'
  };

  const sizes = {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96'
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <div onClick={open}>
        {trigger}
      </div>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={close}
            />
            
            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`absolute top-full mt-2 ${positions[position]} ${sizes[size]} bg-white rounded-lg shadow-xl border border-gray-200 z-50 ${contentClassName}`}
              onClick={handleContentClick}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  {title && (
                    <h3 className="text-lg font-semibold text-gray-900">
                      {title}
                    </h3>
                  )}
                  {showCloseButton && (
                    <button
                      onClick={close}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}
              
              {/* Content */}
              <div className="max-h-96 overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};