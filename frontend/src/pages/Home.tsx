// frontend/src/pages/Home.tsx - Updated with Auto-Generate Basket
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import AutoGenerateBasket from '@/components/predictions/AutoGenerateBasket';
import { 
  ShoppingCart, TrendingUp, Clock, Heart, 
  Package, Truck, Shield, Sparkles, Brain
} from 'lucide-react';
import { ResponsiveGrid, FeatureGrid } from '@/components/layout/ResponsiveGrid';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Predictions',
      description: 'TIFU-KNN algorithm predicts your next basket with 25% accuracy',
      color: 'from-purple-500 to-indigo-600'
    },
    {
      icon: Clock,
      title: 'Save Time Shopping',
      description: 'Auto-generate your weekly basket in seconds',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: TrendingUp,
      title: 'Smart Recommendations',
      description: 'Personalized suggestions based on your history',
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your shopping data is always protected',
      color: 'from-orange-500 to-red-600'
    }
  ];

  const stats = [
    { label: 'Active Users', value: '10K+', icon: Package },
    { label: 'Predictions Made', value: '100K+', icon: Brain },
    { label: 'Time Saved', value: '1000+ hrs', icon: Clock },
    { label: 'Accuracy Rate', value: '25%', icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Smart Grocery Shopping with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                AI Predictions
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Let our TIFU-KNN algorithm predict your next grocery basket based on your shopping patterns. 
              Save time and never forget your essentials again.
            </p>

            {isAuthenticated ? (
              <div className="space-y-6">
                {/* Prominent Auto-Generate Feature */}
                <AutoGenerateBasket 
                  variant="card" 
                  className="max-w-2xl mx-auto"
                  onNavigate={navigate}
                />
                
                {/* Quick Actions */}
                <div className="flex justify-center gap-4 mt-6">
                  <button
                    onClick={() => navigate('/products')}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Browse Products
                  </button>
                  <button
                    onClick={() => navigate('/orders')}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    View Past Orders
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => navigate('/register')}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Get Started
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}
          </motion.div>

          {/* Demo User Hint */}
          {isAuthenticated && user?.metadata?.instacart_user_id && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm">
                <Sparkles size={16} />
                <span>Demo User: Instacart ID {user.metadata.instacart_user_id}</span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              Why Choose Timely?
            </h2>
            
            <FeatureGrid gap={8}>
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity rounded-xl"
                    style={{ 
                      backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
                      '--tw-gradient-from': feature.color.split(' ')[1],
                      '--tw-gradient-to': feature.color.split(' ')[3]
                    } as any}
                  />
                  <div className="relative p-6 bg-gray-50 dark:bg-gray-900 rounded-xl hover:shadow-lg transition-shadow">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.color} mb-4`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-100 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              Powered by Real Data
            </h2>
            
            <ResponsiveGrid cols={{ sm: 2, md: 4 }} gap={8}>
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className="text-center"
                >
                  <div className="inline-flex p-3 bg-white dark:bg-gray-800 rounded-full shadow-md mb-4">
                    <stat.icon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-16 bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Experience AI-Powered Shopping?
            </h2>
            <p className="text-xl text-purple-100 mb-8">
              Join thousands of users who save time with smart predictions
            </p>
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold text-lg hover:bg-purple-50 transition-colors"
            >
              Start Free Today
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;