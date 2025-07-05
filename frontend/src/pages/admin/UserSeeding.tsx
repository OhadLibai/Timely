// frontend/src/pages/admin/UserSeeding.tsx
// DEMAND 1: Demo User Creation - Seed users with Instacart purchase history
// UPDATED: Aligned with new routing structure and service architecture

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, Database, CheckCircle, AlertCircle, 
  Info, Loader2, Mail, Key, Calendar, Package,
  Sparkles, Users, ShoppingCart, Clock, ArrowLeft,
  PlayCircle, Zap, TrendingUp, Activity
} from 'lucide-react';
import { useDemoUserSeeding } from '@/hooks/api/useAdmin';
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

  const { seedUser, demoUserStats, isSeeding, seedingError } = useDemoUserSeeding();

  // Popular Instacart user IDs for quick testing
  const popularUserIds = [
    { id: '1', description: 'Heavy grocery shopper', orderCount: '40+ orders', category: 'Regular' },
    { id: '7', description: 'Frequent organic buyer', orderCount: '35+ orders', category: 'Organic' },
    { id: '13', description: 'Family bulk shopper', orderCount: '50+ orders', category: 'Family' },
    { id: '25', description: 'Health-conscious buyer', orderCount: '30+ orders', category: 'Health' },
    { id: '31', description: 'Weekend bulk buyer', orderCount: '25+ orders', category: 'Bulk' },
    { id: '42', description: 'Diverse preferences', orderCount: '45+ orders', category: 'Diverse' },
    { id: '55', description: 'Premium brand lover', orderCount: '20+ orders', category: 'Premium' },
    { id: '60', description: 'Quick convenience shopper', orderCount: '55+ orders', category: 'Convenience' },
    { id: '78', description: 'International cuisine fan', orderCount: '35+ orders', category: 'International' },
    { id: '92', description: 'Meal prep specialist', orderCount: '30+ orders', category: 'Meal Prep' }
  ];

  const handleSeedUser = async (userId: string) => {
    try {
      const result = await seedUser.mutateAsync(userId);
      setSeedingResults(prev => [result, ...prev]);
      setInstacartUserId('');
      toast.success(`✅ User ${userId} seeded successfully!`, {
        duration: 6000,
        icon: '🎉'
      });
    } catch (error: any) {
      toast.error(`❌ Failed to seed user ${userId}: ${error.message}`, {
        duration: 8000
      });
    }
  };

  const handleQuickSeed = (userId: string) => {
    setInstacartUserId(userId);
    handleSeedUser(userId);
  };

  const handleManualSeed = () => {
    if (instacartUserId.trim()) {
      handleSeedUser(instacartUserId.trim());
    } else {
      toast.error("Please enter a valid Instacart user ID.");
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Regular': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'Organic': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Family': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'Health': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      'Bulk': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'Diverse': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      'Premium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Convenience': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
      'International': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'Meal Prep': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    };
    return colors[category as keyof typeof colors] || colors.Regular;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Demo User Creation"
          description="Seed demo users with Instacart purchase history for testing and demonstration"
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
        />

        {/* Instructions */}
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8"
          >
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  How Demo User Seeding Works
                </h3>
                <div className="text-blue-800 dark:text-blue-200 space-y-2">
                  <p>
                    <strong>Purpose:</strong> Create realistic demo users with authentic purchase histories from the Instacart dataset.
                  </p>
                  <p>
                    <strong>Process:</strong> Select any Instacart user ID → System creates a demo account → Populates purchase history from CSV data → User can log in and experience ML predictions.
                  </p>
                  <p>
                    <strong>Result:</strong> A fully functional demo user with months of purchase history, ready for ML basket generation.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstructions(false)}
                className="text-blue-600 dark:text-blue-400"
              >
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}

        {/* Current Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {demoUserStats?.available_users?.length || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Demo Users Created
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {demoUserStats?.seeded_today || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Seeded Today
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {demoUserStats?.last_seeded || 'None'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Last Seeded User
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Manual User Seeding */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Seed Custom User
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter any Instacart user ID to create a demo account
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter Instacart User ID (e.g., 1, 7, 13, 42...)"
                value={instacartUserId}
                onChange={(e) => setInstacartUserId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSeed()}
                disabled={isSeeding}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
              />
            </div>
            <Button
              variant="primary"
              onClick={handleManualSeed}
              disabled={!instacartUserId.trim() || isSeeding}
              icon={isSeeding ? Loader2 : UserPlus}
            >
              {isSeeding ? 'Seeding...' : 'Seed User'}
            </Button>
          </div>
        </div>

        {/* Popular User IDs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Popular Test Users
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Quick-seed users with diverse shopping patterns
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularUserIds.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        User {user.id}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(user.category)}`}>
                        {user.category}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {user.description}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.orderCount} in dataset
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSeed(user.id)}
                    disabled={isSeeding}
                    icon={isSeeding ? Loader2 : PlayCircle}
                  >
                    {isSeeding ? 'Seeding...' : 'Quick Seed'}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Seeding Results */}
        {seedingResults.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Seeding Results
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Successfully created demo users
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {seedingResults.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div className="flex items-start gap-4">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                          Demo User Created Successfully
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Users className="text-green-600 dark:text-green-400" size={16} />
                            <div>
                              <p className="text-xs text-green-600 dark:text-green-400">Instacart User ID</p>
                              <p className="font-mono text-sm text-green-900 dark:text-green-100">
                                {result.instacartUserId}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="text-green-600 dark:text-green-400" size={16} />
                            <div>
                              <p className="text-xs text-green-600 dark:text-green-400">Email</p>
                              <p className="font-mono text-sm text-green-900 dark:text-green-100">
                                {result.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Key className="text-green-600 dark:text-green-400" size={16} />
                            <div>
                              <p className="text-xs text-green-600 dark:text-green-400">Password</p>
                              <p className="font-mono text-sm text-green-900 dark:text-green-100">
                                demo_password
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="text-green-600 dark:text-green-400" size={16} />
                            <div>
                              <p className="text-xs text-green-600 dark:text-green-400">Created</p>
                              <p className="text-sm text-green-900 dark:text-green-100">
                                {new Date().toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-green-600 dark:text-green-400 mb-4">
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

                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            💡 <strong>Next Step:</strong> This user can now log in and experience ML-powered basket predictions! 
                            Their purchase history has been populated with real Instacart data.
                          </p>
                        </div>
                      </div>
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