// frontend/src/pages/admin/UserSeeding.tsx
// UPDATED: Standalone page with proper PageHeader and navigation

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from 'react-query';
import { 
  UserPlus, Database, CheckCircle, AlertCircle, 
  Info, Loader2, Mail, Key, Calendar, Package,
  Sparkles, Users, ShoppingCart, Clock, ArrowLeft
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';

interface SeedingResult {
  message: string;
  userId: string;
  instacartUserId: string;
  email: string;
  password: string;
  stats: {
    ordersCreated: number;
    orderItemsCreated: number;
    successRate: string;
  };
  loginInstructions: string;
}

const UserSeeding: React.FC = () => {
  const navigate = useNavigate();
  const [instacartUserId, setInstacartUserId] = useState<string>('');
  const [seedingResults, setSeedingResults] = useState<SeedingResult[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const queryClient = useQueryClient();

  // Popular Instacart user IDs for quick testing
  const popularUserIds = [
    { id: '1', description: 'Heavy grocery shopper', orderCount: '40+ orders' },
    { id: '7', description: 'Frequent organic buyer', orderCount: '35+ orders' },
    { id: '13', description: 'Family shopper', orderCount: '50+ orders' },
    { id: '25', description: 'Health-conscious buyer', orderCount: '30+ orders' },
    { id: '31', description: 'Bulk shopper', orderCount: '25+ orders' },
    { id: '42', description: 'Diverse preferences', orderCount: '45+ orders' },
    { id: '55', description: 'Regular schedule', orderCount: '20+ orders' },
    { id: '60', description: 'Weekend shopper', orderCount: '55+ orders' },
    { id: '78', description: 'Premium brands', orderCount: '35+ orders' },
    { id: '92', description: 'Convenience focused', orderCount: '30+ orders' }
  ];

  const seedUserMutation = useMutation(
    (userId: string) => adminService.seedDemoUser(userId),
    {
      onMutate: (userId) => {
        toast.loading(`🌱 Seeding demo user ${userId}... This may take a moment.`, { 
          id: `seed-${userId}`,
          duration: 0
        });
      },
      onSuccess: (data, userId) => {
        toast.dismiss(`seed-${userId}`);
        
        // Add result to the list
        setSeedingResults(prev => [data, ...prev.slice(0, 4)]); // Keep last 5 results
        
        // Clear input
        setInstacartUserId('');
        setShowInstructions(false);
        
        // Invalidate related queries
        queryClient.invalidateQueries(['admin-users']);
        queryClient.invalidateQueries(['dashboard-stats']);
        
        toast.success(`✅ User ${userId} seeded successfully!`, { 
          duration: 6000,
          icon: '🎉'
        });
      },
      onError: (error: any, userId) => {
        toast.dismiss(`seed-${userId}`);
        
        const errorMessage = error.response?.data?.error || 'Failed to seed user';
        const suggestion = error.response?.data?.suggestion || 'Please try a different user ID';
        
        toast.error(`❌ ${errorMessage}. ${suggestion}`, { 
          duration: 8000 
        });
      }
    }
  );

  const handleSeedUser = () => {
    if (!instacartUserId.trim()) {
      toast.error('Please enter an Instacart user ID');
      return;
    }

    const userId = instacartUserId.trim();
    if (!/^\d+$/.test(userId)) {
      toast.error('User ID must be a number');
      return;
    }

    seedUserMutation.mutate(userId);
  };

  const handleQuickSeed = (userId: string) => {
    setInstacartUserId(userId);
    seedUserMutation.mutate(userId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="User Seeding"
          description="Create demo users with realistic Instacart purchase history for ML model testing"
          icon={UserPlus}
          breadcrumb={
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              icon={ArrowLeft}
              size="sm"
            >
              Back to Dashboard
            </Button>
          }
          actions={
            <Button
              variant="outline"
              onClick={() => setShowInstructions(!showInstructions)}
              icon={Info}
            >
              {showInstructions ? 'Hide' : 'Show'} Instructions
            </Button>
          }
        />

        {/* Instructions Panel */}
        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8"
            >
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    How User Seeding Works
                  </h3>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                    <p>1. **Choose an Instacart User ID** - Any valid ID from the dataset (1-206,209)</p>
                    <p>2. **Historical Data Population** - The system pulls all orders for that user from the CSV dataset</p>
                    <p>3. **Demo User Creation** - A new user account is created with realistic purchase history</p>
                    <p>4. **ML Model Ready** - The user can now experience ML-powered basket predictions</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Seeding Interface */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Seed New Demo User
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Manual Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter Instacart User ID
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={instacartUserId}
                  onChange={(e) => setInstacartUserId(e.target.value)}
                  placeholder="e.g., 1, 42, 1337"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  onKeyPress={(e) => e.key === 'Enter' && handleSeedUser()}
                />
                <Button
                  variant="primary"
                  onClick={handleSeedUser}
                  loading={seedUserMutation.isLoading}
                  disabled={!instacartUserId.trim()}
                  icon={seedUserMutation.isLoading ? Loader2 : Sparkles}
                >
                  Seed User
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Seed Popular Users
              </label>
              <div className="grid grid-cols-2 gap-2">
                {popularUserIds.slice(0, 6).map((user) => (
                  <Button
                    key={user.id}
                    variant="outline"
                    onClick={() => handleQuickSeed(user.id)}
                    disabled={seedUserMutation.isLoading}
                    size="sm"
                    className="justify-start text-left"
                  >
                    <div>
                      <div className="font-medium">User {user.id}</div>
                      <div className="text-xs text-gray-500">{user.orderCount}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Seeding Results */}
        {seedingResults.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Seeding Results
              </h2>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {seedingResults.map((result, index) => (
                  <motion.div
                    key={result.userId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Demo User Created Successfully
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Instacart ID: {result.instacartUserId}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Just now
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Mail className="text-gray-400" size={16} />
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Email</p>
                          <p className="font-mono text-sm text-gray-900 dark:text-white">
                            {result.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Key className="text-gray-400" size={16} />
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Password</p>
                          <p className="font-mono text-sm text-gray-900 dark:text-white">
                            demo_password
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="text-gray-400" size={16} />
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Created</p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {new Date().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <ShoppingCart size={14} />
                        {result.stats.ordersCreated} orders
                      </span>
                      <span className="flex items-center gap-1">
                        <Package size={14} />
                        {result.stats.orderItemsCreated} items
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle size={14} />
                        {result.stats.successRate}
                      </span>
                    </div>

                    <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded text-xs text-indigo-700 dark:text-indigo-300">
                      💡 <strong>Next Step:</strong> This user can now log in and experience ML-powered basket predictions!
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSeeding;