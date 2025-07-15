// frontend/src/layouts/AuthLayout.tsx
import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TimelyLogo from '@/components/common/TimelyLogo';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-20 xl:px-24">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-sm mx-auto"
          >
            <Link to="/" className="flex items-center gap-3 mb-8">
              <TimelyLogo size="md" animated={true} />
            </Link>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              AI-Powered Grocery Shopping
            </h1>
            
            <p className="text-lg text-gray-600 mb-8">
              Let our machine learning algorithms predict your next grocery list based on your 
              shopping patterns and preferences. Save time and never forget an item again.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                <span className="text-gray-700">Personalized predictions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700">Smart shopping recommendations</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
                <span className="text-gray-700">Automated weekly cart generation</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center justify-center gap-2">
              <TimelyLogo size="md" animated={true} />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto w-full max-w-sm lg:w-96"
          >
            <Outlet />
          </motion.div>

          {/* Back to Home Link */}
          <div className="mt-8 text-center">
            <Link
              to="/"
              className="text-sm text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;