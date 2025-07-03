import { apiClient } from './api.client';

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

export const userService = {
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/user/profile');
    return response.data;
  },

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await apiClient.put('/user/profile', data);
    return response.data;
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/user/account');
  },
};