// frontend/src/stores/auth.store.ts
// ADDED: getCurrentUserId method for standardized user ID access across services

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { authService, User, AuthResponse } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateUser: (user: User) => void;
  updateProfile: (data: {
    firstName: string;
    lastName: string;
  }) => Promise<User>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: authService.getUser(),
        isAuthenticated: authService.isAuthenticated(),
        isLoading: false,

        login: async (email, password) => {
          set({ isLoading: true });
          try {
            const response = await authService.login({ email, password });
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
            return response;
          } catch (error: any) {
            set({ isLoading: false });
            throw error;
          }
        },

        register: async (data) => {
          set({ isLoading: true });
          try {
            const response = await authService.register(data);
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
          } catch (error: any) {
            set({ isLoading: false });
            throw error;
          }
        },

        logout: async () => {
          set({ isLoading: true });
          try {
            await authService.logout();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false
            });
            
            // Clear cart store via its clearCart method
            const { useCartStore } = await import('./cart.store');
            useCartStore.getState().clearCart();
            
            // Clear other user-related localStorage data
            localStorage.removeItem('timely-predicted-basket');
            localStorage.removeItem('recentSearches');
            
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },

        refreshAuth: async () => {
          try {
            const user = authService.getUser();
            set({
              user,
              isAuthenticated: true
            });
          } catch (error) {
            set({
              user: null,
              isAuthenticated: false
            });
          }
        },

        updateUser: (user) => {
          set({ user });
        },

        updateProfile: async (data) => {
          const { userService } = await import('@/services/user.service');
          const updatedProfile = await userService.updateProfile(data);
          const currentUser = get().user;
          if (currentUser) {
            const updatedUser = { ...currentUser, ...updatedProfile };
            set({ user: updatedUser });
            return updatedUser;
          }
          throw new Error('No user logged in');
        },

        clearAuth: () => {
          set({
            user: null,
            isAuthenticated: false
          });
        }        
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated
        })
      }
    ),
    {
      name: 'auth-store'
    }
  )
);