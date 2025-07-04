// frontend/src/pages/Profile.tsx
// FIXED: Removed dateOfBirth and password change functionality

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import {
  User, Mail, Phone, MapPin, Settings,
  Edit3, Save, X, CheckCircle, Shield
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { userService } from '@/services/user.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';

// REMOVED: PasswordFormData interface

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile
  } = useForm<ProfileFormData>({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    }
  });

  const updateProfileMutation = useMutation(userService.updateProfile, {
    onSuccess: (data) => {
      updateUser(data);
      setIsEditing(false);
      queryClient.invalidateQueries(['user-profile']);
      toast.success('Profile updated successfully! 🎉');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      toast.error(errorMessage);
    }
  });

  const onSubmitProfile = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    resetProfile({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  };

  if (!user) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <PageHeader
          title="My Profile"
          description="Manage your account information and preferences"
          icon={User}
        />

        <div className="space-y-8">
          
          {/* Profile Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                    {user.isAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 text-xs font-medium rounded-full mt-1">
                        <Shield size={12} />
                        Administrator
                      </span>
                    )}
                  </div>
                </div>
                
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="primary"
                    icon={Edit3}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="p-6">
              <ResponsiveGrid cols={{ sm: 1, md: 2 }} gap={6}>
                
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      {...registerProfile('firstName', { required: 'First name is required' })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <User size={16} className="text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{user.firstName}</span>
                    </div>
                  )}
                  {profileErrors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{profileErrors.firstName.message}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      {...registerProfile('lastName', { required: 'Last name is required' })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <User size={16} className="text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{user.lastName}</span>
                    </div>
                  )}
                  {profileErrors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{profileErrors.lastName.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <Mail size={16} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{user.email}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Email cannot be changed in demo mode
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      {...registerProfile('phone')}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Optional"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <Phone size={16} className="text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">
                        {user.phone || 'Not provided'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <AnimatePresence>
                {isEditing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
                  >
                    <Button
                      type="button"
                      onClick={handleCancelEdit}
                      variant="outline"
                      icon={X}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isLoading}
                      variant="primary"
                      loading={updateProfileMutation.isLoading}
                      icon={updateProfileMutation.isLoading ? undefined : Save}
                    >
                      {updateProfileMutation.isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Account Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Account Information
            </h3>
            <ResponsiveGrid cols={{ sm: 1, md: 2 }} gap={6}>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Type</p>
                <div className="flex items-center gap-2 mt-1">
                  {user.isAdmin ? (
                    <>
                      <Shield size={16} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">Administrator</span>
                    </>
                  ) : (
                    <>
                      <User size={16} className="text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">Standard User</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Member Since</p>
                <p className="text-gray-900 dark:text-white mt-1">
                  {user.createdAt 
                    ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Unknown'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;