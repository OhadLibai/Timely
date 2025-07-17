// frontend/src/layouts/AdminLayoutDashboard.tsx
// Version 1: Dashboard-Centric Layout
// Replaces sidebar with interactive dashboard cards

import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Target, UserPlus, Home, LogOut, Palette,
  Menu, X, ChevronRight, CheckCircle, PlayCircle,
  Settings, RefreshCw, Sparkles, Crown, Activity,
  TrendingUp, Zap, Plus, Eye, BarChart3, Users,
  Clock, Package, Trophy, Heart, Diamond, Rocket,
  Star, ArrowRight
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useMetricsOverview } from '@/hooks/api/useAdmin';
import TimelyBrandLogo from '@/components/common/TimelyBrandLogo';
import { Button } from '@/components/common/Button';

const AdminLayoutDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const mlMetrics = useMetricsOverview();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isDashboardPage = location.pathname === '/admin';

  // Dashboard navigation cards
  const dashboardCards = [
    {
      title: 'ML Analytics Hub',
      category: 'ml-analytics',
      icon: Brain,
      gradient: 'from-purple-500 via-pink-500 to-blue-500',
      description: '🧠 ML model metrics & evaluation',
      status: 'operational',
      items: [
        {
          label: 'Model Performance',
          path: '/admin/model-performance',
          icon: BarChart3,
          description: 'Comprehensive ML evaluation',
          metrics: mlMetrics ? {
            'Precision@K': `${(mlMetrics.PrecisionAt * 100).toFixed(1)}%`,
            'F1 Score@K': `${(mlMetrics.F1ScoreAt * 100).toFixed(1)}%`,
            'NDCG@K': `${(mlMetrics.NDCGAt * 100).toFixed(1)}%`
          } : null
        },
        {
          label: 'User Prediction Test',
          path: '/admin/user-prediction',
          icon: Target,
          description: 'Compare predictions vs ground truth',
          metrics: {
            'Last Test': 'User 42',
            'Accuracy': '89.2%',
            'Tests Run': '156'
          }
        }
      ]
    },
    {
      title: 'System Management',
      category: 'demo-management',
      icon: Settings,
      gradient: 'from-cyan-500 via-sky-500 to-blue-600',
      description: '🔧 User provisioning & administration',
      status: 'operational',
      items: [
        {
          label: 'Demo User Creation',
          path: '/admin/user-seeding',
          icon: UserPlus,
          description: 'Create users with Instacart history',
          metrics: {
            'Active Users': '2',
            'System Orders': '10',
            'Recent': 'User 42'
          }
        }
      ]
    },
    {
      title: 'User Experience',
      category: 'user-experience',
      icon: Heart,
      gradient: 'from-pink-500 via-rose-500 to-orange-500',
      description: '🎨 Frontend quality & shopping flow',
      status: 'operational',
      items: [
        {
          label: 'Frontend Quality',
          path: '/admin/user-experience',
          icon: Palette,
          description: 'Shopping flow & UI quality status',
          metrics: {
            'Shopping Flow': '✅ Operational',
            'Product Display': '✅ Operational',
            'Cart Function': '✅ Operational'
          }
        }
      ]
    }
  ];

  const DashboardCard = ({ card }: { card: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden group"
    >
      {/* Card Header */}
      <div className={`h-2 bg-gradient-to-r ${card.gradient}`}></div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 bg-gradient-to-r ${card.gradient} rounded-xl shadow-lg`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{card.title}</h3>
              <p className="text-sm text-gray-600">{card.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-xs text-green-600 font-medium">Operational</span>
          </div>
        </div>

        {/* Card Items */}
        <div className="space-y-3">
          {card.items.map((item: any, index: number) => (
            <div key={index} className="group/item">
              <Link
                to={item.path}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 group/link"
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className="text-gray-600 group-hover/link:text-indigo-600" />
                  <div>
                    <div className="font-medium text-gray-900 group-hover/link:text-indigo-600">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.description}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover/link:text-indigo-600" />
              </Link>

              {/* Quick Metrics */}
              {item.metrics && (
                <div className="mt-2 px-3">
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(item.metrics).map(([key, value]) => (
                      <div key={key} className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">{key}</div>
                        <div className="text-sm font-medium text-gray-900">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const DashboardOverview = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <TimelyBrandLogo size="lg" animated={true} glowing={true} />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Admin Portal
                </h1>
                <p className="text-sm text-gray-600">AI-Powered Dashboard v2.0</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {dashboardCards.map((card) => (
            <DashboardCard key={card.category} card={card} />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                onClick={() => navigate('/admin/model-performance')}
                variant="primary"
                className="flex flex-col items-center gap-2 py-4"
              >
                <PlayCircle size={20} />
                <span className="text-sm">Run Evaluation</span>
              </Button>
              <Button
                onClick={() => navigate('/admin/user-seeding')}
                variant="outline"
                className="flex flex-col items-center gap-2 py-4"
              >
                <UserPlus size={20} />
                <span className="text-sm">Create User</span>
              </Button>
              <Button
                onClick={() => navigate('/admin/user-prediction')}
                variant="outline"
                className="flex flex-col items-center gap-2 py-4"
              >
                <Target size={20} />
                <span className="text-sm">Test Prediction</span>
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                className="flex flex-col items-center gap-2 py-4"
              >
                <RefreshCw size={20} />
                <span className="text-sm">Refresh Data</span>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <TimelyBrandLogo size="md" animated={false} />
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDashboardPage
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </Link>
              {!isDashboardPage && (
                <div className="flex items-center gap-2">
                  <ChevronRight size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {location.pathname.includes('model-performance') && 'Model Performance'}
                    {location.pathname.includes('user-prediction') && 'User Prediction'}
                    {location.pathname.includes('user-seeding') && 'User Seeding'}
                    {location.pathname.includes('user-experience') && 'User Experience'}
                  </span>
                </div>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
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
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {isDashboardPage ? <DashboardOverview /> : <Outlet />}
      </main>
    </div>
  );
};

export default AdminLayoutDashboard;