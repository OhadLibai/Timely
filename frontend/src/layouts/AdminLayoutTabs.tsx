// frontend/src/layouts/AdminLayoutTabs.tsx
// Version 2: Top Tab Navigation Layout
// Horizontal tabs with clean, modern design

import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Target, UserPlus, Home, LogOut, Palette,
  Menu, X, CheckCircle, PlayCircle, Settings,
  RefreshCw, Sparkles, Crown, Activity, TrendingUp,
  Zap, Plus, Eye, BarChart3, Users, Clock, Package,
  Trophy, Heart, Diamond, Rocket, Star, ArrowRight,
  ChevronDown, Bell, Search,
  Atom
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useMetricsOverview } from '@/hooks/api/useAdmin';
import TimelyBrandLogo from '@/components/common/TimelyBrandLogo';
import { Button } from '@/components/common/Button';

const AdminLayoutTabs: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const mlMetrics = useMetricsOverview();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Tab configuration
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Home,
      path: '/admin',
      isActive: location.pathname === '/admin',
      gradient: 'from-blue-500 to-indigo-600',
      description: 'Dashboard hub with key metrics'
    },
    {
      id: 'system',
      label: 'System',
      icon: Settings,
      path: '/admin/user-seeding',
      isActive: location.pathname.includes('/admin/user-seeding'),
      gradient: 'from-cyan-500 to-blue-600',
      description: 'User management and system tools',
      subTabs: [
        {
          label: 'Demo User Creation',
          path: '/admin/user-seeding',
          icon: UserPlus,
          isActive: location.pathname === '/admin/user-seeding'
        }
      ]
    },
    {
      id: 'ml-analytics',
      label: 'ML Analytics',
      icon: Brain,
      path: '/admin/model-performance',
      isActive: location.pathname.includes('/admin/model-performance') || location.pathname.includes('/admin/user-prediction'),
      gradient: 'from-purple-500 to-pink-600',
      description: 'Machine learning evaluation tools',
      subTabs: [
        {
          label: 'Model Performance',
          path: '/admin/model-performance',
          icon: BarChart3,
          isActive: location.pathname === '/admin/model-performance'
        },
        {
          label: 'User Prediction Test',
          path: '/admin/user-prediction',
          icon: Atom,
          isActive: location.pathname === '/admin/user-prediction'
        }
      ]
    },
    {
      id: 'experience',
      label: 'Experience',
      icon: Heart,
      path: '/admin/user-experience',
      isActive: location.pathname.includes('/admin/user-experience'),
      gradient: 'from-pink-500 to-rose-600',
      description: 'Frontend quality and user experience',
      subTabs: [
        {
          label: 'Frontend Quality',
          path: '/admin/user-experience',
          icon: Palette,
          isActive: location.pathname === '/admin/user-experience'
        }
      ]
    }
  ];

  const activeTab = tabs.find(tab => tab.isActive);

  const TabButton = ({ tab }: { tab: any }) => (
    <div className="relative">
      <button
        onClick={() => {
          if (tab.subTabs) {
            setActiveDropdown(activeDropdown === tab.id ? null : tab.id);
          } else {
            navigate(tab.path);
          }
        }}
        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
          tab.isActive
            ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        <tab.icon size={18} />
        <span>{tab.label}</span>
        {tab.subTabs && (
          <ChevronDown 
            size={16} 
            className={`transition-transform ${
              activeDropdown === tab.id ? 'rotate-180' : ''
            }`}
          />
        )}
        {tab.isActive && (
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-lg"
            initial={false}
            transition={{ duration: 0.2 }}
          />
        )}
      </button>

      {/* Sub-tabs dropdown */}
      <AnimatePresence>
        {tab.subTabs && activeDropdown === tab.id && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          >
            {tab.subTabs.map((subTab: any) => (
              <Link
                key={subTab.path}
                to={subTab.path}
                onClick={() => setActiveDropdown(null)}
                className={`flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  subTab.isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                }`}
              >
                <subTab.icon size={16} />
                <span>{subTab.label}</span>
                {subTab.isActive && (
                  <CheckCircle size={14} className="text-indigo-500 ml-auto" />
                )}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const QuickActions = () => (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => navigate('/admin/model-performance')}
        variant="ghost"
        size="sm"
        className="hidden md:flex"
      >
        <PlayCircle size={16} />
        <span>Run Eval</span>
      </Button>
      <Button
        onClick={() => navigate('/admin/user-seeding')}
        variant="ghost"
        size="sm"
        className="hidden md:flex"
      >
        <UserPlus size={16} />
        <span>New User</span>
      </Button>
      <Button
        onClick={() => window.location.reload()}
        variant="ghost"
        size="sm"
      >
        <RefreshCw size={16} />
      </Button>
    </div>
  );

  const StatusBar = () => (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-600" />
              <span className="text-sm font-medium text-green-800">All Systems Operational</span>
            </div>
            {mlMetrics && (
              <div className="hidden md:flex items-center gap-4 text-sm text-green-700">
                <span>Precision: {(mlMetrics.PrecisionAt * 100).toFixed(3)}%</span>
                <span>Recall: {(mlMetrics.RecallAt * 100).toFixed(3)}%</span>
                <span>F1 Score: {(mlMetrics.F1ScoreAt * 100).toFixed(3)}%</span>
                <span>NDCG: {(mlMetrics.NDCGAt * 100).toFixed(3)}%</span>
                <span>Jaccard: {(mlMetrics.JaccardSimilarity * 100).toFixed(3)}%</span>
                <span>Last Updated: Just now</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600">Live</span>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3">
                <TimelyBrandLogo size="md" animated={true} glowing={true} />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {tabs.map((tab) => (
                <TabButton key={tab.id} tab={tab} />
              ))}
            </div>

            {/* Quick Actions and User */}
            <div className="flex items-center gap-4">
              <QuickActions />
              
              {/* User Menu */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-xs">
                    {user?.firstName?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={24} />
                </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-gray-200"
            >
              <div className="px-6 py-4 space-y-2">
                {tabs.map((tab) => (
                  <div key={tab.id}>
                    <Link
                      to={tab.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        tab.isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon size={18} />
                      <span className="font-medium">{tab.label}</span>
                      {tab.isActive && <CheckCircle size={16} className="text-indigo-500 ml-auto" />}
                    </Link>
                    {tab.subTabs && tab.isActive && (
                      <div className="ml-6 mt-2 space-y-1">
                        {tab.subTabs.map((subTab: any) => (
                          <Link
                            key={subTab.path}
                            to={subTab.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg transition-colors ${
                              subTab.isActive
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <subTab.icon size={14} />
                            <span>{subTab.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Sub-navigation for active tab */}
      {activeTab?.subTabs && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <activeTab.icon size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-900">{activeTab.label}</span>
              </div>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                {activeTab.subTabs.map((subTab: any) => (
                  <Link
                    key={subTab.path}
                    to={subTab.path}
                    className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                      subTab.isActive
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <subTab.icon size={14} />
                    <span>{subTab.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Content */}
      <main className="max-w-7xl mx-auto">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20">
          <Outlet />
        </div>
      </main>

      {/* Floating Action Button (Mobile) */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/admin/model-performance')}
          className="w-14 h-14 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <Zap size={24} />
        </motion.button>
      </div>
    </div>
  );
};

export default AdminLayoutTabs;