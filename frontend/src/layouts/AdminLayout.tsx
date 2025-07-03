// frontend/src/layouts/AdminLayout.tsx
// STREAMLINED: Admin layout focused only on 4 core ML demo demands
// REMOVED: Unnecessary CRUD pages, settings, general business analytics

import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Brain, Target, UserPlus, BarChart3, 
  Home, LogOut, Zap, Database, Sparkles
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
  };

  // STREAMLINED: Only the 4 core demo functionalities
  const demoPages = [
    {
      label: 'ML Demo Overview',
      path: '/admin/dashboard',
      icon: Home,
      description: 'Demo status & quick access',
      category: 'overview'
    },
    {
      label: 'User Seeding',
      path: '/admin/user-seeding',
      icon: UserPlus,
      description: 'Create demo users (Demand 1)',
      category: 'demo',
      highlight: true
    },
    {
      label: 'Model Performance',
      path: '/admin/metrics',
      icon: Brain,
      description: 'ML evaluation metrics (Demand 2)',
      category: 'demo',
      highlight: true
    },
    {
      label: 'Live Prediction Test',
      path: '/admin/demo-prediction',
      icon: Target,
      description: 'Individual user predictions (Demand 3)',
      category: 'demo',
      highlight: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                <Sparkles className="text-white" size={20} />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">Timely Admin</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user?.firstName}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          {/* Logo */}
          <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Timely</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">ML Demo Admin</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-6">
            {/* Demo Overview */}
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Demo Control Center
              </h3>
              <div className="space-y-1">
                {demoPages.filter(item => item.category === 'overview').map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Core Demo Functions */}
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Core ML Demo Functions
              </h3>
              <div className="space-y-1">
                {demoPages.filter(item => item.category === 'demo').map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.highlight && (
                          <Zap className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Demo Info */}
            <div className="px-3">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Database size={16} />
                  <span className="text-sm font-semibold">Instacart Dataset</span>
                </div>
                <p className="text-xs text-purple-100 mb-2">
                  206K+ users, 3M+ orders ready for ML predictions
                </p>
                <div className="text-xs text-purple-200">
                  Development & Testing Mode
                </div>
              </div>
            </div>
          </nav>

          {/* User Profile */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user?.firstName?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 lg:hidden"
            >
              {/* Mobile sidebar content (same as desktop) */}
              <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                    <Sparkles className="text-white" size={20} />
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">Timely Admin</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-lg text-gray-600 dark:text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Same navigation as desktop */}
              <nav className="flex-1 px-4 py-6 space-y-6">
                {/* ... repeat navigation content ... */}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <main className="flex-1 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;