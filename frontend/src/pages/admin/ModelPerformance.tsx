// frontend/src/pages/admin/ModelPerformance.tsx
// DEMAND 2: Model Performance Evaluation - Dedicated detailed page
// UPDATED: Removed duplicate metrics, focus on detailed evaluation interface

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, BarChart3, Activity, RefreshCw,
  CheckCircle, AlertCircle, Info, Zap, Target, Users, ArrowLeft,
  PlayCircle, Clock, Database, Settings
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { metricsService } from '@/services/metrics.service';
import { QUERY_CONFIGS } from '@/utils/queryConfig';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MetricCard from '@/components/admin/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';

const ModelPerformance: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sampleSize, setSampleSize] = useState(100);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Fetch existing metrics using metricsService
  const { 
    data: metricsData, 
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics 
  } = useQuery(
    'modelPerformanceMetrics',
    () => metricsService.getModelPerformance(sampleSize),
    {
      ...QUERY_CONFIGS.STABLE_DATA,
      cacheTime: 30 * 60 * 1000
    }
  );

  // Trigger new evaluation using metricsService
  const handleRunEvaluation = async (size: number) => {
    try {
      setIsEvaluating(true);
      toast.loading('🧠 Running model evaluation... This may take a minute.', {
        id: 'evaluation'
      });
      
      await metricsService.getModelPerformance(size);
      
      toast.dismiss('evaluation');
      toast.success('✅ Model evaluation completed!', {
        duration: 6000,
        icon: '🎉'
      });
      
      // Refresh metrics
      refetchMetrics();
    } catch (error: any) {
      toast.dismiss('evaluation');
      toast.error(`❌ Evaluation failed: ${error.message}`, { duration: 8000 });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Prepare chart data
  const chartData = metricsData ? {
    performanceMetrics: [
      { name: 'Precision@10', value: metricsData.precisionAt10 * 100, color: '#6366F1' },
      { name: 'Recall@10', value: metricsData.recallAt10 * 100, color: '#8B5CF6' },
      { name: 'Recall@20', value: metricsData.recallAt20 * 100, color: '#EC4899' },
      { name: 'Hit Rate', value: metricsData.hitRate * 100, color: '#F59E0B' },
      { name: 'NDCG', value: metricsData.ndcg * 100, color: '#10B981' }
    ],
    overallScore: [
      { 
        name: 'Overall Performance', 
        value: metricsData.recallAt10 * 100,
        fill: '#6366F1'
      }
    ],
    comparisonData: [
      { metric: 'Precision@10', current: metricsData.precisionAt10 * 100, baseline: 75 },
      { metric: 'Recall@10', current: metricsData.recallAt10 * 100, baseline: 70 },
      { metric: 'Hit Rate', current: metricsData.hitRate * 100, baseline: 80 },
      { metric: 'NDCG', current: metricsData.ndcg * 100, baseline: 72 }
    ]
  } : null;

  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

  if (isLoadingMetrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Model Performance Evaluation"
          description="Comprehensive ML model metrics analysis and evaluation interface"
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
        />

        {/* Evaluation Controls */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Run Model Evaluation
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Evaluate ML model performance against the Instacart dataset
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sample Size:
                  </label>
                  <select
                    value={sampleSize}
                    onChange={(e) => setSampleSize(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value={50}>50 users</option>
                    <option value={100}>100 users</option>
                    <option value={200}>200 users</option>
                    <option value={500}>500 users</option>
                    <option value={1000}>1000 users</option>
                  </select>
                </div>
                <Button
                  variant="primary"
                  onClick={() => handleRunEvaluation(sampleSize)}
                  disabled={isEvaluating}
                  icon={isEvaluating ? RefreshCw : PlayCircle}
                >
                  {isEvaluating ? 'Evaluating...' : 'Run Evaluation'}
                </Button>
              </div>
            </div>

            {isEvaluating && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Running evaluation on {sampleSize} users...
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      This may take a few moments. Please wait.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* No Metrics State */}
        {!metricsData && !isLoadingMetrics && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Evaluation Results Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Run your first model evaluation to see detailed performance metrics and analysis.
            </p>
            <Button
              variant="primary"
              onClick={() => handleRunEvaluation(sampleSize)}
              disabled={isEvaluating}
              icon={PlayCircle}
            >
              Run First Evaluation
            </Button>
          </div>
        )}

        {/* Metrics Display */}
        {metricsData && chartData && (
          <>
            {/* Performance Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
                title="Recall@20"
                value={`${(metricsData.recallAt20 * 100).toFixed(1)}%`}
                subtitle="Extended coverage"
                icon={TrendingUp}
                color="purple"
              />
              <MetricCard
                title="Hit Rate"
                value={`${(metricsData.hitRate * 100).toFixed(1)}%`}
                subtitle="Successful predictions"
                icon={Zap}
                color="orange"
              />
              <MetricCard
                title="NDCG Score"
                value={`${(metricsData.ndcg * 100).toFixed(1)}%`}
                subtitle="Ranking quality"
                icon={BarChart3}
                color="indigo"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Performance Comparison Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Performance vs Baseline
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="current" fill="#6366F1" name="Current Performance" />
                    <Bar dataKey="baseline" fill="#E5E7EB" name="Baseline" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Metrics Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Metrics Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.performanceMetrics}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    >
                      {chartData.performanceMetrics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Evaluation Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Evaluation Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sample Size</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {metricsData.sampleSize || 'N/A'} users
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="text-blue-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Evaluation</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {metricsData.lastUpdated ? 
                        new Date(metricsData.lastUpdated).toLocaleDateString() : 
                        'Just now'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Database className="text-purple-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Dataset</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Instacart Market Basket
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModelPerformance;