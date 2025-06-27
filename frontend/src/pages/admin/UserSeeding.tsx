// frontend/src/pages/admin/UserSeeding.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from 'react-query';
import { 
  UserPlus, Database, CheckCircle, AlertCircle, 
  Info, Loader2, Mail, Key, Calendar, Package,
  Sparkles, Users, ShoppingCart, Clock
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
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
        const suggestion = error.response?.data?.suggestion || '';
        
        toast.error(
          <div>
            <strong>❌ {errorMessage}</strong>
            {suggestion && <p className="mt-1 text-sm">{suggestion}</p>}
          </div>,
          { duration: 8000 }
        );
      }
    }
  );

  const handleSubmit = () => {
    if (instacartUserId.trim()) {
      seedUserMutation.mutate(instacartUserId.trim());
    }
  };

  const handleQuickSeed = (userId: string) => {
    setInstacartUserId(userId);
    seedUserMutation.mutate(userId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && instacartUserId.trim() && !seedUserMutation.isLoading) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="text-indigo-600 dark:text-indigo-400" size={28} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Demo User Seeding
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Create demo users with real Instacart purchase history for testing the ML prediction system.
          </p>
        </motion.div>

        {/* Instructions */}
        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6"
            >
              <div className="flex items-start gap-3">
                <Info className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    How User Seeding Works
                  </h3>
                  <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">1.</span>
                      <span>Enter any Instacart user ID (e.g., 1-206209)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">2.</span>
                      <span>The system creates a new user account and imports their complete order history</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">3.</span>
                      <span>Login credentials are generated automatically (default password: demo_password)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">4.</span>
                      <span>The user can then login and request ML-generated basket predictions</span>
                    </li>
                  </ol>
                </div>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Seeding Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Database className="text-indigo-600" size={20} />
              Seed New User
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Instacart User ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={instacartUserId}
                    onChange={(e) => setInstacartUserId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter any ID (e.g., 1, 42, 100...)"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={seedUserMutation.isLoading}
                  />
                  <Users className="absolute right-3 top-2.5 text-gray-400" size={20} />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Any number from 1 to 206209 (total users in dataset)
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!instacartUserId.trim() || seedUserMutation.isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {seedUserMutation.isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
                <span>{seedUserMutation.isLoading ? 'Seeding User...' : 'Seed User'}</span>
              </button>
            </div>

            {/* Quick Seed Options */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Popular Test Users
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {popularUserIds.slice(0, 6).map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleQuickSeed(user.id)}
                    disabled={seedUserMutation.isLoading}
                    className="p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        User {user.id}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {user.orderCount}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {user.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="text-green-600" size={20} />
              Recent Seeding Results
            </h2>

            {seedingResults.length === 0 ? (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
                <Package className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-600 dark:text-gray-400">
                  No users seeded yet. Start by entering an Instacart user ID.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {seedingResults.map((result, index) => (
                  <motion.div
                    key={`${result.instacartUserId}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="text-green-600" size={20} />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          User {result.instacartUserId} Seeded
                        </h3>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Just now
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="text-gray-400" size={16} />
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Email</p>
                          <p className="font-mono text-gray-900 dark:text-white">
                            {result.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Key className="text-gray-400" size={16} />
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Password</p>
                          <p className="font-mono text-gray-900 dark:text-white">
                            demo_password
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
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
                      💡 Login with these credentials to test ML predictions
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-sm p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Instacart Dataset</h3>
              <p className="text-purple-100 text-sm mb-3">
                Real purchase history from 200,000+ users with 3M+ orders
              </p>
              <div className="flex items-center gap-6 text-sm">
                <span className="flex items-center gap-2">
                  <Users size={16} />
                  206,209 users
                </span>
                <span className="flex items-center gap-2">
                  <Package size={16} />
                  49,688 products
                </span>
                <span className="flex items-center gap-2">
                  <Calendar size={16} />
                  Multiple years of data
                </span>
              </div>
            </div>
            <Sparkles className="text-purple-200" size={48} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UserSeeding;