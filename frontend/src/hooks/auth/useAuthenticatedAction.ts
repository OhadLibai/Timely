import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';

export const useAuthenticatedAction = () => {
  const { isAuthenticated } = useAuthStore();

  const executeWithAuth = useCallback((
    action: () => void | Promise<void>,
    unauthenticatedMessage = 'Please login to continue'
  ) => {
    if (!isAuthenticated) {
      toast.error(unauthenticatedMessage);
      return;
    }

    return action();
  }, [isAuthenticated]);

  const withAuthCheck = useCallback(<T extends any[]>(
    action: (...args: T) => void | Promise<void>,
    unauthenticatedMessage = 'Please login to continue'
  ) => {
    return (...args: T) => {
      if (!isAuthenticated) {
        toast.error(unauthenticatedMessage);
        return;
      }
      return action(...args);
    };
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    executeWithAuth,
    withAuthCheck,
  };
};