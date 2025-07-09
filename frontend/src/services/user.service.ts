// frontend/src/services/user.service.ts
// MINIMAL FIX: Updated for Option B consistency and getCurrentUserId pattern
// CONSISTENCY: Aligned with other services structure and URL patterns

import { api } from '@/services/api.client';
import { useAuthStore } from '@/stores/auth.store';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
}

interface UpdateProfileData {
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
}

class UserService {
  
  // ============================================================================
  // USER PROFILE OPERATIONS 
  // ============================================================================

  /**
   * Get user profile
   * UPDATED: Uses userId in URL path for Option B consistency
   */
  async getProfile(): Promise<UserProfile> {
    const userId = useAuthStore.getState().getCurrentUserId();
    return api.get<UserProfile>(`/user/${userId}/profile`);
  }

  /**
   * Update user profile
   * UPDATED: Uses userId in URL path for Option B consistency
   */
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const userId = useAuthStore.getState().getCurrentUserId();
    return api.put<UserProfile>(`/user/${userId}/profile`, data);
  }

  /**
   * Delete user account
   * UPDATED: Uses userId in URL path for Option B consistency
   */
  async deleteAccount(): Promise<void> {
    const userId = useAuthStore.getState().getCurrentUserId();
    return api.delete(`/user/${userId}/account`);
  }
}

export const userService = new UserService();
