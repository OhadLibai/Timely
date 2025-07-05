import { useMutation, UseMutationOptions, UseMutationResult } from 'react-query';
import toast from 'react-hot-toast';

interface MutationWithToastOptions<TData, TVariables, TError = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string | ((error: TError, variables: TVariables) => string);
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  mutationOptions?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>;
}

export const useMutationWithToast = <TData, TVariables, TError = unknown>({
  mutationFn,
  successMessage,
  errorMessage = 'Operation failed',
  onSuccess,
  onError,
  showSuccessToast = true,
  showErrorToast = true,
  mutationOptions = {}
}: MutationWithToastOptions<TData, TVariables, TError>): UseMutationResult<TData, TError, TVariables> => {
  return useMutation(mutationFn, {
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      // Show success toast
      if (showSuccessToast && successMessage) {
        const message = typeof successMessage === 'function' 
          ? successMessage(data, variables)
          : successMessage;
        toast.success(message);
      }
      
      // Call custom onSuccess handler
      onSuccess?.(data, variables);
      
      // Call original onSuccess from mutationOptions
      if (mutationOptions && 'onSuccess' in mutationOptions) {
        mutationOptions.onSuccess?.(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      // Show error toast
      if (showErrorToast) {
        const message = typeof errorMessage === 'function' 
          ? errorMessage(error, variables)
          : errorMessage;
        toast.error(message);
      }
      
      // Call custom onError handler
      onError?.(error, variables);
      
      // Call original onError from mutationOptions
      if (mutationOptions && 'onError' in mutationOptions) {
        mutationOptions.onError?.(error, variables, context);
      }
    }
  });
};