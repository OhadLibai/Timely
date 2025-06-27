// frontend/src/pages/admin/Metrics.tsx
import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, BarChart3, Activity, RefreshCw,
  CheckCircle, AlertCircle, Info, Zap, Target, Users
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts';
import { adminService } from '@/services/admin.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const Metrics: React.FC = () => {
  const [sampleSize, setSampleSize] = useState(100);
  
  // Fetch existing metrics
  const { 
    data: metricsData, 
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics 
  } = useQuery(
    'modelPerformanceMetrics',
    adminService.getModelPerformanceMetrics,
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 30 * 60 * 1000
    }
  );

  // Trigger new evaluation
  const evaluationMutation = useMutation(
    (size: number) => adminService.triggerModelEvaluation(size),
    {
      onMutate: () => {
        toast.loading('🧠 Running model evaluation... This may take a minute.', {
          id: 'evaluation'
        });
      },
      onSuccess: (data) => {
        toast.dismiss('evaluation');
        toast.success('✅ Model evaluation completed!', {
          duration: 6000,
          icon: '🎉'
        });
        refetchMetrics();
      },
      onError: (error: any) => {
        toast.dismiss('evaluation');
        toast.error('❌ Evaluation failed: ' + (error.response?.data?.detail || 'Unknown error'));
      }
    }
  );

  // Format metrics for visualization
  const formatMetricsForCharts = () => {
    if (!metricsData || !metricsData.metrics) return null;

    const metrics = metricsData.metrics;
    
    // Recall/Precision/F1 chart data
    const performanceData = [
      {
        k: '5',
        recall: (metrics['recall@5'] || 0) * 100,
        precision: (metrics['precision@5'] || 0) * 100,
        f1: (metrics['f1@5'] || 0) * 100
      },
      {
        k: '10',
        recall: (metrics['recall@10'] || 0) * 100,
        precision: (metrics['precision@10'] || 0) * 100,
        f1: (metrics['f1@10'] || 0) * 100
      },
      {
        k: '20',
        recall: (metrics['recall@20'] || 0) * 100,
        precision: (metrics['precision@20'] || 0) * 100,
        f1: (metrics['f1@20'] || 0) * 100
      }
    ];

    // Hit rate data
    const hitRateData = [
      { name: 'Hit@5', value: (metrics['hit_rate@5'] || 0) * 100 },
      { name: 'Hit@10', value: (metrics['hit_rate@10'] || 0) * 100 },
      { name: 'Hit@20', value: (metrics['hit_rate@20'] || 0) * 100 }
    ];

    // Repeat vs Explore
    const behaviorData = [
      { name: 'Repeat Items', value: (metrics['repeat_recall@20'] || 0) * 100, fill: '#6366F1' },
      { name: 'New Items', value: (metrics['explore_recall@20'] || 0) * 100, fill: '#8B5CF6' }
    ];

    // Overall score (radial)
    const overallScore = [
      {
        name: 'Overall',
        recall: (metrics['recall@20'] || 0) * 100,
        fill: '#6366F1'
      }
    ];

    return { performanceData, hitRateData, behaviorData, overallScore };
  };

  const chartData = formatMetricsForCharts();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="text-indigo-600 dark:text-indigo-400" size={28} />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                TIFU-KNN Model Performance
              </h1>
            </div>
            <button
              onClick={() => evaluationMutation.mutate(sampleSize)}
              disabled={evaluationMutation.isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {evaluationMutation.isLoading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <Zap size={18} />
              )}
              <span>Run Evaluation</span>
            </button>
          </div>

          {/* Evaluation Controls */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-gray-600 dark:text-gray-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sample Size:
              </label>
              <select
                value={sampleSize}
                onChange={(e) => setSampleSize(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="50">50 users</option>
                <option value="100">100 users (recommended)</option>
                <option value="200">200 users</option>
                <option value="500">500 users</option>
                <option value="1000">1000 users (slow)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Info size={16} />
              <span>Larger samples provide more accurate metrics but take longer</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingMetrics && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <div className="flex flex-col items-center justify-center">
              <LoadingSpinner size="large" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading model metrics...</p>
            </div>
          </div>
        )}

        {/* Metrics Display */}
        {metricsData && chartData && !isLoadingMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="text-indigo-600" size={20} />
                Performance Metrics by K
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="k" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => `${value.toFixed(1)}%`}
                  />
                  <Legend />
                  <Bar dataKey="recall" fill="#6366F1" name="Recall" />
                  <Bar dataKey="precision" fill="#8B5CF6" name="Precision" />
                  <Bar dataKey="f1" fill="#EC4899" name="F1 Score" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Hit Rate Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="text-green-600" size={20} />
                Hit Rate Analysis
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.hitRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => `${value.toFixed(1)}%`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', r: 6 }}
                    name="Hit Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Overall Performance Gauge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="text-indigo-600" size={20} />
                Overall Model Performance
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={chartData.overallScore}>
                  <RadialBar
                    dataKey="recall"
                    cornerRadius={10}
                    fill="#6366F1"
                  />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                    <tspan className="text-3xl font-bold fill-gray-900 dark:fill-white">
                      {chartData.overallScore[0].recall.toFixed(0)}%
                    </tspan>
                    <tspan x="50%" y="50%" dy="1.5em" className="text-sm fill-gray-600 dark:fill-gray-400">
                      Recall@20
                    </tspan>
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
              
              {/* Metric Summary */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Evaluation Time</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {metricsData.metrics.evaluation_time_seconds?.toFixed(1)}s
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sample Size</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {metricsData.metrics.sample_size} users
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Behavior Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="text-purple-600" size={20} />
                User Behavior Prediction
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.behaviorData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.behaviorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Personalization Score */}
              <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    Personalization Score
                  </span>
                  <span className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                    {((metricsData.metrics.personalization_score || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                  How unique recommendations are per user
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Model Info Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-sm p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">TIFU-KNN Algorithm</h3>
              <p className="text-indigo-100 text-sm">
                Temporal-Item-Frequency-based User-KNN for Next Basket Recommendation
              </p>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <CheckCircle size={16} />
                  Instacart Dataset
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle size={16} />
                  200K+ Users
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle size={16} />
                  3M+ Orders
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-indigo-100">Model Version</p>
              <p className="text-2xl font-bold">v1.0</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Metrics;