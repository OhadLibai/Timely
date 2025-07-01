import { useState, useEffect, useCallback } from 'react';

interface UseModalOptions {
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export const useModal = (options: UseModalOptions = {}) => {
  const {
    closeOnEscape = true,
    closeOnOutsideClick = true,
    onOpen,
    onClose
  } = options;

  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, close, closeOnEscape]);

  // Handle outside click (to be used with backdrop)
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === e.currentTarget) {
      close();
    }
  }, [close, closeOnOutsideClick]);

  // Stop propagation for modal content
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    handleBackdropClick,
    handleContentClick,
  };
};