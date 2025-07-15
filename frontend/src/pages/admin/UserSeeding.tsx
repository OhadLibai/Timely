// frontend/src/pages/admin/UserSeeding.tsx
// DEMAND 1: Demo User Creation - Seed users with Instacart purchase history
// UPDATED: Aligned with new routing structure and service architecture

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, Database, CheckCircle,
  Info, Loader2, Mail, Key, Calendar, Package,
  Sparkles, Users, ShoppingCart, Clock, ArrowLeft,
  PlayCircle, TrendingUp
} from 'lucide-react';
import { useDemoUserSeeding } from '@/hooks/api/useAdmin';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';

interface SeedingResult {
  success?: boolean;
  message: string;
  userId: string;
  ordersImportedNumber?: string;
  itemsImportNumber?: string;
  credentials?: {
    email: string;
    password: string;
  };
}

const UserSeeding: React.FC = () => {
  const navigate = useNavigate();
  const [instacartUserId, setInstacartUserId] = useState<string>('');
  const [seedingResults, setSeedingResults] = useState<SeedingResult[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { seedUser, isSeeding } = useDemoUserSeeding();

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

  const handleSeedUser = (userId: string) => {
    seedUser.mutate(userId, {
      onSuccess: (result) => {
        setSeedingResults(prev => [result, ...prev]);
        setInstacartUserId('');
        // Scroll to results section after a short delay
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 300);
      }
    });
  };

  const handleQuickSeed = (userId: string) => {
    setInstacartUserId(userId);
    handleSeedUser(userId);
  };

  const handleManualSeed = () => {
    if (instacartUserId.trim()) {
      handleSeedUser(instacartUserId.trim());
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Regular': 'bg-blue-100 text-blue-800/30',
      'Organic': 'bg-green-100 text-green-800/30',
      'Family': 'bg-purple-100 text-purple-800/30',
      'Health': 'bg-pink-100 text-pink-800/30',
      'Bulk': 'bg-orange-100 text-orange-800/30',
      'Diverse': 'bg-indigo-100 text-indigo-800/30',
      'Premium': 'bg-yellow-100 text-yellow-800/30',
      'Convenience': 'bg-teal-100 text-teal-800/30',
      'International': 'bg-red-100 text-red-800/30',
      'Meal Prep': 'bg-gray-100 text-gray-800/30'
    };
    return colors[category as keyof typeof colors] || colors.Regular;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
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
            className="bg-blue-50/20 border border-blue-200 rounded-lg p-6 mb-8"
          >
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  How Demo User Seeding Works
                </h3>
                <div className="text-blue-800 space-y-2">
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
                className="text-blue-600"
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
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100/30 rounded-lg">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {2}
                </div>
                <div className="text-sm text-gray-600">
                  Demo Users Created
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {3}
                </div>
                <div className="text-sm text-gray-600">
                  Seeded Today
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100/30 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {'None'}
                </div>
                <div className="text-sm text-gray-600">
                  Last Seeded User
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Manual User Seeding */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100/30 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Seed Custom User
              </h2>
              <p className="text-sm text-gray-600">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100/30 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Popular Test Users
              </h2>
              <p className="text-sm text-gray-600">
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
                className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-semibold text-gray-900">
                        User {user.id}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(user.category)}`}>
                        {user.category}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {user.description}
                    </div>
                    <div className="text-xs text-gray-500">
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
          <div ref={resultsRef} className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-green-100/30 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Seeding Results
                </h2>
                <p className="text-base text-gray-600">
                  Demo user creation attempts
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <AnimatePresence>
                {seedingResults.map((result, index) => {
                  const isSuccess = result.success !== false;
                  const bgColor = isSuccess ? "bg-green-50/30 border-green-200" : "bg-yellow-50/30 border-yellow-200";
                  const iconColor = isSuccess ? "text-green-600" : "text-yellow-600";
                  const textColor = isSuccess ? "text-green-900" : "text-yellow-900";
                  const Icon = isSuccess ? CheckCircle : Info;
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`p-8 border-2 rounded-xl shadow-sm ${bgColor}`}
                    >
                      <div className="flex items-start gap-5">
                        <Icon className={`w-8 h-8 ${iconColor} flex-shrink-0 mt-1`} />
                        <div className="flex-1">
                          <h3 className={`text-xl font-bold ${textColor} mb-4`}>
                            {isSuccess ? 'Demo User Created Successfully' : 'User Already Exists'}
                          </h3>
                          
                          {isSuccess ? (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="flex items-center gap-3">
                                  <Users className={iconColor} size={20} />
                                  <div>
                                    <p className={`text-sm font-medium ${iconColor}`}>User ID</p>
                                    <p className={`font-mono text-lg font-semibold ${textColor}`}>
                                      {result.userId}
                                    </p>
                                  </div>
                                </div>
                                {result.credentials && (
                                  <>
                                    <div className="flex items-center gap-3">
                                      <Mail className={iconColor} size={20} />
                                      <div>
                                        <p className={`text-sm font-medium ${iconColor}`}>Email</p>
                                        <p className={`font-mono text-base ${textColor}`}>
                                          {result.credentials.email}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Key className={iconColor} size={20} />
                                      <div>
                                        <p className={`text-sm font-medium ${iconColor}`}>Password</p>
                                        <p className={`font-mono text-base ${textColor}`}>
                                          {result.credentials.password}
                                        </p>
                                      </div>
                                    </div>
                                  </>
                                )}
                                <div className="flex items-center gap-3">
                                  <Calendar className={iconColor} size={20} />
                                  <div>
                                    <p className={`text-sm font-medium ${iconColor}`}>Created</p>
                                    <p className={`text-base ${textColor}`}>
                                      {new Date().toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className={`flex items-center gap-6 text-sm font-medium ${iconColor} mb-5`}>
                                <span className="flex items-center gap-2">
                                  <ShoppingCart size={18} />
                                  {result.ordersImportedNumber} orders
                                </span>
                                <span className="flex items-center gap-2">
                                  <Package size={18} />
                                  {result.itemsImportNumber} items
                                </span>
                                <span className="flex items-center gap-2">
                                  <CheckCircle size={18} />
                                  Success
                                </span>
                              </div>

                              <div className="p-4 bg-green-100/40 rounded-xl">
                                <p className="text-base text-green-800">
                                  💡 <strong>Next Step:</strong> This user can now log in and experience ML-powered basket predictions! 
                                  Their purchase history has been populated with real Instacart data.
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="flex items-center gap-3">
                                  <Users className={iconColor} size={20} />
                                  <div>
                                    <p className={`text-sm font-medium ${iconColor}`}>User ID</p>
                                    <p className={`font-mono text-lg font-semibold ${textColor}`}>
                                      {result.userId}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Calendar className={iconColor} size={20} />
                                  <div>
                                    <p className={`text-sm font-medium ${iconColor}`}>Attempted</p>
                                    <p className={`text-base ${textColor}`}>
                                      {new Date().toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-4 bg-yellow-100/40 rounded-xl">
                                <p className="text-base text-yellow-800">
                                  ⚠️ <strong>{result.message}</strong>
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSeeding;