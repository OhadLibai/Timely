// frontend/src/layouts/AdminLayout.tsx
// RESTRUCTURED: Admin navigation aligned with 4 core demands
// ORGANIZED: Navigation grouped by category with proper routing

import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Brain, Target, UserPlus,
  Home, LogOut,
  Palette
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import TimelyLogo from '@/components/common/TimelyLogo';

const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // ============================================================================
  // RESTRUCTURED NAVIGATION - ALIGNED WITH 4 CORE DEMANDS
  // ============================================================================

  const navigationSections = [
    {
      title: 'Overview',
      category: 'overview',
      items: [
        {
          label: 'Dashboard',
          path: '/admin',
          icon: Home,
          description: 'Overview Hub - Real-time metrics & quick actions',
          isActive: location.pathname === '/admin'
        }
      ]
    },
    {
      title: 'ML Analytics',
      category: 'ml-analytics',
      items: [
        {
          label: 'Model Performance Evaluation',
          path: '/admin/model-performance',
          icon: Brain,
          description: 'ML model metrics & evaluation (Demand 2)',
          isActive: location.pathname === '/admin/model-performance',
          highlight: true
        },
        {
          label: 'Test Individual User Prediction',
          path: '/admin/user-prediction',
          icon: Target,
          description: 'Compare predictions vs ground truth (Demand 3)',
          isActive: location.pathname === '/admin/user-prediction',
          highlight: true
        }
      ]
    },
    {
      title: 'Demo Management',
      category: 'demo-management',
      items: [
        {
          label: 'Demo User Creation',
          path: '/admin/user-seeding',
          icon: UserPlus,
          description: 'Create users with Instacart history (Demand 1)',
          isActive: location.pathname === '/admin/user-seeding',
          highlight: true
        }
      ]
    },
    {
      title: 'User Experience',
      category: 'user-experience',
      items: [
        {
          label: 'Frontend Quality Overview',
          path: '/admin/user-experience',
          icon: Palette,
          description: 'Shopping flow & UI quality status (Demand 4)',
          isActive: location.pathname === '/admin/user-experience',
          highlight: true
        }
      ]
    }
  ];

  const renderNavigationItem = (item: any) => (
    <Link
      key={item.path}
      to={item.path}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
        item.isActive
          ? 'bg-indigo-50/30 text-indigo-600 shadow-sm'
          : 'text-gray-700 hover:bg-gray-50/50'
      }`}
    >
      <item.icon 
        size={20} 
        className={`flex-shrink-0 ${
          item.isActive ? 'text-indigo-600' : 'text-gray-500'
        }`} 
      />
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm ${
          item.isActive ? 'text-indigo-600' : 'text-gray-900'
        }`}>
          {item.label}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 truncate">
          {item.description}
        </div>
      </div>
      {item.highlight && (
        <div className="flex-shrink-0">
          <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
        </div>
      )}
    </Link>
  );

  const renderNavigationSection = (section: any) => (
    <div key={section.category} className="space-y-2">
      <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {section.title}
      </h3>
      <div className="space-y-1">
        {section.items.map(renderNavigationItem)}
      </div>
    </div>
  );

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
        <Link to="/" className="flex items-center gap-3">
          <TimelyLogo size="md" animated={false} /> 
        </Link>
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="p-2 rounded-lg text-gray-600 lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {navigationSections.map(renderNavigationSection)}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-medium text-xs">
              {user?.firstName?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {user?.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white lg:hidden"
            >
              <div className="flex flex-col h-full">
                {sidebarContent}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-600"
          >
            <Menu size={20} />
          </button>
          <h1 className="font-semibold text-gray-900">Admin Dashboard</h1>
          <div className="w-10"></div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;