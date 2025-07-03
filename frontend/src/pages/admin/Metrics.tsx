// frontend/src/pages/admin/Metrics.tsx
// UPDATED: Standalone page with proper PageHeader and navigation

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, BarChart3, Activity, RefreshCw,
  CheckCircle, AlertCircle, Info, Zap, Target, Users, ArrowLeft
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts';
import { adminService } from '@/services/admin.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MetricCard from '@/components/admin/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';

const Metrics: React.FC = () => {
  const navigate = useNavigate();
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
        const errorMessage = error.response?.data?.error || 'Evaluation failed';
        toast.error(`❌ ${errorMessage}`, { duration: 8000 });
      }
    }
  );

  const handleRunEvaluation = () => {
    evaluationMutation.mutate(sampleSize);
  };

  // Prepare chart data
  const chartData = metricsData ? {
    performanceMetrics: [
      { name: 'Precision@10', value: metricsData.precisionAt10 * 100 },
      { name: 'Recall@10', value: metricsData.recallAt10 * 100 },
      { name: 'Hit Rate', value: metricsData.hitRate * 100 },
      { name: 'NDCG', value: metricsData.ndcg * 100 },
      { name: 'F1 Score', value: metricsData.f1Score * 100 }
    ],
    overallScore: [
      { name: 'Overall', recall: metricsData.recallAt10 * 100, fill: '#6366F1' }
    ]
  } : null;

  const isRunningEvaluation = evaluationMutation.isLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Model Performance Metrics"
          description="Comprehensive evaluation of ML model predictions and performance analysis"
          icon={Brain}
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
          actions={
            <Button 
              variant="primary" 
              icon={isRunningEvaluation ? RefreshCw : Zap}
              loading={isRunningEvaluation}
              onClick={handleRunEvaluation}
            >
              Run Evaluation
            </Button>
          }
        />

        {/* Evaluation Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-500" />
              Evaluation Configuration
            </h2>
          </div>

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
          <>
            {/* Performance Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Precision@10"
                value={`${(metricsData.precisionAt10 * 100).toFixed(1)}%`}
                subtitle="Product relevance"
                icon={Target}
                color="blue"
              />
              
              <MetricCard
                title="Recall@10"
                value={`${(metricsData.recallAt10 * 100).toFixed(1)}%`}
                subtitle="Coverage accuracy"
                icon={Activity}
                color="green"
              />
              
              <MetricCard
                title="Hit Rate"
                value={`${(metricsData.hitRate * 100).toFixed(1)}%`}
                subtitle="Successful predictions"
                icon={Zap}
                color="orange"
              />
              
              <MetricCard
                title="F1 Score"
                value={metricsData.f1Score?.toFixed(3) || 'N/A'}
                subtitle="Harmonic mean"
                icon={Brain}
                color="purple"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Performance Bar Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="text-blue-600" size={20} />
                  Performance Metrics Comparison
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.performanceMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: 'none',
                        borderRadius: '8px'
                      }}
                      formatter={(value: any) => `${value.toFixed(1)}%`}
                    />
                    <Bar dataKey="value" fill="#6366F1" />
                  </BarChart>
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
                        Recall@10
                      </tspan>
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                
                {/* Metric Summary */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">NDCG Score</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(metricsData.ndcg * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sample Size</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {metricsData.sampleSize || 'N/A'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Evaluation Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Evaluation Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Evaluation</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {metricsData.lastUpdated ? 
                        new Date(metricsData.lastUpdated).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="text-blue-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Users Evaluated</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {metricsData.sampleSize || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-purple-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Evaluation Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {metricsData.evaluationTime || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!metricsData && !isLoadingMetrics && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Metrics Available
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Run your first model evaluation to see performance metrics
            </p>
            <Button
              variant="primary"
              onClick={handleRunEvaluation}
              loading={isRunningEvaluation}
              icon={Zap}
            >
              Run First Evaluation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Metrics;