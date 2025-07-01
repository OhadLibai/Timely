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

  const withAuthCheck = useCallback((
    action: () => void | Promise<void>,
    unauthenticatedMessage = 'Please login to continue'
  ) => {
    return (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      
      return executeWithAuth(action, unauthenticatedMessage);
    };
  }, [executeWithAuth]);

  return {
    isAuthenticated,
    executeWithAuth,
    withAuthCheck,
  };
};