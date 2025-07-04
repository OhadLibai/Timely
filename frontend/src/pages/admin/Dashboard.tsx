// frontend/src/pages/admin/Dashboard.tsx
// REFACTORED: Proper dashboard with overview metrics and navigation
// REMOVED: Embedded features (UserSeeding, DemoPredictionPage)
// ADDED: Clear navigation to dedicated feature pages

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import { 
  TrendingUp, Users, ShoppingCart, Brain, 
  Package, DollarSign, Activity, AlertCircle,
  Calendar, ArrowUp, ArrowDown, BarChart3,
  UserPlus, Target, Zap, Settings, 
  ChevronRight, Clock, Database
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { adminService } from '@/services/admin.service';
import { predictionService } from '@/services/prediction.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MetricCard from '@/components/admin/MetricCard';
import DateRangePicker from '@/components/admin/DateRangePicker';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import { formatPrice } from '@/utils/formatters';
import { ResponsiveGrid, MetricGrid } from '@/components/layout/ResponsiveGrid';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    end: new Date() 
  });

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery(
    ['admin-dashboard', dateRange],
    () => adminService.getDashboardStats(dateRange),
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: modelMetrics, isLoading: isModelLoading } = useQuery(
    'model-metrics',
    predictionService.getModelMetrics,
    { staleTime: 10 * 60 * 1000 }
  );

  const { data: onlineMetrics, isLoading: isOnlineLoading } = useQuery(
    'online-metrics',
    predictionService.getOnlineMetrics,
    { staleTime: 2 * 60 * 1000 }
  );

  // FIXED: Consistent variable naming
  if (isDashboardLoading || isModelLoading || isOnlineLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
    activeUsers: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    revenueGrowth: 0,
    orderGrowth: 0,
    userGrowth: 0
  };

  const chartData = dashboardData?.chartData || {
    salesOverTime: [],
    ordersByStatus: [],
    topProducts: [],
    userActivity: [],
    categoryDistribution: []
  };

  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

  // Quick action cards for main features
  const quickActions = [
    {
      title: "Seed Demo User",
      description: "Create users with Instacart purchase history",
      icon: UserPlus,
      color: "blue" as const,
      path: "/admin/user-seeding",
      stats: `${stats.totalUsers} users seeded`
    },
    {
      title: "Demo Prediction",
      description: "Compare ML predictions vs ground truth",
      icon: Target,
      color: "purple" as const,
      path: "/admin/demo-prediction",
      stats: "Individual user analysis"
    },
    {
      title: "Model Performance",
      description: "Evaluate ML model metrics and scores",
      icon: Brain,
      color: "green" as const,
      path: "/admin/metrics",
      stats: modelMetrics ? `${(modelMetrics.hitRate * 100).toFixed(1)}% hit rate` : "No metrics yet"
    },
    {
      title: "System Health",
      description: "Monitor services and system status",
      icon: Activity,
      color: "orange" as const,
      path: "/admin/system",
      stats: "All services running"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <PageHeader
          title="Admin Dashboard"
          description="Welcome back! Here's what's happening with your ML-powered grocery platform."
          icon={BarChart3}
          actions={<DateRangePicker value={dateRange} onChange={setDateRange} />}
        />

        {/* Key Business Metrics */}
        <MetricGrid className="mb-8">
          <MetricCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            change={stats.revenueGrowth}
            icon={DollarSign}
            color="indigo"
          />
          <MetricCard
            title="Total Orders"
            value={stats.totalOrders.toLocaleString()}
            change={stats.orderGrowth}
            icon={ShoppingCart}
            color="purple"
          />
          <MetricCard
            title="Active Users"
            value={stats.activeUsers.toLocaleString()}
            subtitle={`of ${stats.totalUsers.toLocaleString()} total`}
            change={stats.userGrowth}
            icon={Users}
            color="pink"
          />
          <MetricCard
            title="Avg Order Value"
            value={formatPrice(stats.avgOrderValue)}
            change={stats.conversionRate}
            icon={TrendingUp}
            color="green"
          />
        </MetricGrid>

        {/* ML Model Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-500" />
              ML Model Performance Overview
            </h2>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/metrics')}
              icon={ChevronRight}
              iconPosition="right"
            >
              View Details
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {modelMetrics ? `${(modelMetrics.precisionAt10 * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Precision@10</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {modelMetrics ? `${(modelMetrics.recallAt10 * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Recall@10</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">
                {modelMetrics ? `${(modelMetrics.hitRate * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Hit Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {modelMetrics ? `${(modelMetrics.ndcg * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">NDCG</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {modelMetrics ? `${(modelMetrics.f1Score * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">F1 Score</div>
            </div>
          </div>

          {modelMetrics && (
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {new Date(modelMetrics.lastUpdated).toLocaleString()}
              </span>
            </div>
          )}
        </motion.div>

        {/* Quick Actions Grid - Main Feature Navigation */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            ML Demo Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => navigate(action.path)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    action.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    action.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                    action.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                    'bg-orange-100 dark:bg-orange-900/30'
                  }`}>
                    <action.icon className={`w-6 h-6 ${
                      action.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                      action.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                      action.color === 'green' ? 'text-green-600 dark:text-green-400' :
                      'text-orange-600 dark:text-orange-400'
                    }`} />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </div>
                
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {action.description}
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {action.stats}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Charts Grid - Analytics Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sales Over Time */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Sales Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.salesOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#6366F1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Orders by Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Order Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.ordersByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mt-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {dashboardData?.recentActivity?.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'order' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                    activity.type === 'user' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                    'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                  }`}>
                    {activity.type === 'order' ? <ShoppingCart size={20} /> :
                     activity.type === 'user' ? <Users size={20} /> :
                     <Brain size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{activity.description}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{activity.timestamp}</p>
                  </div>
                </div>
                {activity.value && (
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {activity.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;