// frontend/src/services/user.service.ts

import { api } from '@/services/api.client';
import { User } from '@/services/auth.service';
import { authService } from './auth.service';

interface UpdateProfileData {
  firstName: string;
  lastName: string;
}

class UserService {
  
  // ============================================================================
  // USER PROFILE OPERATIONS 
  // ============================================================================

  /**
   * Update user profile
   * UPDATED: Uses userId in URL path for Option B consistency
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const userId = authService.getUser()?.id;
    return api.put<User>(`/user/${userId}/profile`, data);
  }
}

export const userService = new UserService();
