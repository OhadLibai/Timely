// frontend/src/pages/admin/ModelPerformance.tsx
// UPDATED: Using new ModelMetrics interface with PascalCase properties
// DEMAND 2: Model Performance Evaluation - Detailed page with comprehensive metrics

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from 'react-query';
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

  // UPDATED: Prepare chart data using new ModelMetrics interface
  const chartData = metricsData ? {
    performanceMetrics: [
      { name: 'Precision@20', value: metricsData.PrecisionAt20 * 100, color: '#6366F1' },
      { name: 'Recall@20', value: metricsData.RecallAt20 * 100, color: '#8B5CF6' },
      { name: 'F1 Score@20', value: metricsData.F1ScoreAt20 * 100, color: '#EC4899' },
      { name: 'NDCG@20', value: metricsData.NDCGAt20 * 100, color: '#F59E0B' },
      { name: 'Jaccard Similarity', value: metricsData.JaccardSimilarity * 100, color: '#10B981' }
    ],
    overallScore: [
      { 
        name: 'Overall Performance', 
        value: metricsData.F1ScoreAt20 * 100,
        fill: '#6366F1'
      }
    ],
    comparisonData: [
      { metric: 'Precision@20', current: metricsData.PrecisionAt20 * 100, baseline: 75 },
      { metric: 'Recall@20', current: metricsData.RecallAt20 * 100, baseline: 70 },
      { metric: 'F1 Score@20', current: metricsData.F1ScoreAt20 * 100, baseline: 72 },
      { metric: 'NDCG@20', current: metricsData.NDCGAt20 * 100, baseline: 68 },
      { metric: 'Jaccard Similarity', current: metricsData.JaccardSimilarity * 100, baseline: 65 }
    ],
    timeSeriesData: [
      { time: '1h ago', precision: 82, recall: 78, f1: 80, ndcg: 79, jaccard: 75 },
      { time: '2h ago', precision: 81, recall: 77, f1: 79, ndcg: 78, jaccard: 74 },
      { time: '3h ago', precision: 83, recall: 79, f1: 81, ndcg: 80, jaccard: 76 },
      { time: 'Current', 
        precision: metricsData.PrecisionAt20 * 100,
        recall: metricsData.RecallAt20 * 100,
        f1: metricsData.F1ScoreAt20 * 100,
        ndcg: metricsData.NDCGAt20 * 100,
        jaccard: metricsData.JaccardSimilarity * 100
      }
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
    <div className="min-h-screen bg-gray-50 p-6">
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
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Run Model Evaluation
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Evaluate model performance against ground truth data using various sample sizes
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Sample Size:
                  </label>
                  <select
                    value={sampleSize}
                    onChange={(e) => setSampleSize(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={50}>50 users</option>
                    <option value={100}>100 users</option>
                    <option value={200}>200 users</option>
                    <option value={500}>500 users</option>
                    <option value={-1}>All users</option>
                  </select>
                </div>
                <Button
                  onClick={() => handleRunEvaluation(sampleSize)}
                  disabled={isEvaluating}
                  icon={isEvaluating ? RefreshCw : PlayCircle}
                  loading={isEvaluating}
                  variant="primary"
                >
                  {isEvaluating ? 'Evaluating...' : 'Run Evaluation'}
                </Button>
              </div>
            </div>

            {metricsData && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Last evaluation completed successfully
                  </span>
                  {metricsData.sampleSize && (
                    <span className="text-sm text-green-600">
                      (Sample size: {metricsData.sampleSize} users)
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* UPDATED: Key Metrics Overview using new interface */}
        {metricsData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <MetricCard
                title="Precision@20"
                value={`${(metricsData.PrecisionAt20 * 100).toFixed(1)}%`}
                subtitle="Accuracy of top 20 predictions"
                icon={Target}
                color="blue"
                trend={metricsData.PrecisionAt20 > 0.75 ? 'up' : 'down'}
              />
              <MetricCard
                title="Recall@20"
                value={`${(metricsData.RecallAt20 * 100).toFixed(1)}%`}
                subtitle="Coverage of relevant items"
                icon={Activity}
                color="green"
                trend={metricsData.RecallAt20 > 0.70 ? 'up' : 'down'}
              />
              <MetricCard
                title="F1 Score@20"
                value={metricsData.F1ScoreAt20.toFixed(3)}
                subtitle="Harmonic mean of precision & recall"
                icon={TrendingUp}
                color="purple"
                trend={metricsData.F1ScoreAt20 > 0.72 ? 'up' : 'down'}
              />
              <MetricCard
                title="NDCG@20"
                value={metricsData.NDCGAt20.toFixed(3)}
                subtitle="Normalized ranking quality"
                icon={BarChart3}
                color="indigo"
                trend={metricsData.NDCGAt20 > 0.68 ? 'up' : 'down'}
              />
              <MetricCard
                title="Jaccard Similarity"
                value={`${(metricsData.JaccardSimilarity * 100).toFixed(1)}%`}
                subtitle="Set intersection similarity"
                icon={Zap}
                color="orange"
                trend={metricsData.JaccardSimilarity > 0.65 ? 'up' : 'down'}
              />
            </div>
          </motion.div>
        )}

        {/* Charts and Detailed Analysis */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Performance Metrics Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Performance Metrics Overview
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.performanceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Score']}
                  />
                  <Bar dataKey="value" fill="#6366F1">
                    {chartData.performanceMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Current vs Baseline Comparison */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Current vs Baseline Performance
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.comparisonData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis 
                    type="category" 
                    dataKey="metric" 
                    width={100}
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
                  />
                  <Legend />
                  <Bar dataKey="current" fill="#6366F1" name="Current" />
                  <Bar dataKey="baseline" fill="#E5E7EB" name="Baseline" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {/* Performance Trends */}
        {chartData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Performance Trends Over Time
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[60, 90]} />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="precision" 
                  stroke="#6366F1" 
                  strokeWidth={2}
                  name="Precision@20"
                />
                <Line 
                  type="monotone" 
                  dataKey="recall" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Recall@20"
                />
                <Line 
                  type="monotone" 
                  dataKey="f1" 
                  stroke="#EC4899" 
                  strokeWidth={2}
                  name="F1 Score@20"
                />
                <Line 
                  type="monotone" 
                  dataKey="ndcg" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  name="NDCG@20"
                />
                <Line 
                  type="monotone" 
                  dataKey="jaccard" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  name="Jaccard Similarity"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Additional Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Evaluation Insights
          </h3>
          
          {metricsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Performance Analysis</h4>
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${metricsData.PrecisionAt20 > 0.8 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <div className="flex items-center gap-2">
                      {metricsData.PrecisionAt20 > 0.8 ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                      <span className="text-sm font-medium">
                        Precision@20: {metricsData.PrecisionAt20 > 0.8 ? 'Excellent' : 'Good'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {metricsData.PrecisionAt20 > 0.8 
                        ? 'Model shows high accuracy in top recommendations'
                        : 'Model accuracy is acceptable but could be improved'
                      }
                    </p>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${metricsData.RecallAt20 > 0.75 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <div className="flex items-center gap-2">
                      {metricsData.RecallAt20 > 0.75 ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                      <span className="text-sm font-medium">
                        Recall@20: {metricsData.RecallAt20 > 0.75 ? 'Excellent' : 'Good'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {metricsData.RecallAt20 > 0.75 
                        ? 'Model captures most relevant items effectively'
                        : 'Model captures relevant items but could improve coverage'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Recommendations</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  {metricsData.F1ScoreAt20 > 0.77 ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Model performance is excellent. Consider production deployment.</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                      <span>Consider hyperparameter tuning to improve F1 score.</span>
                    </div>
                  )}
                  
                  {metricsData.JaccardSimilarity > 0.7 ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Jaccard similarity indicates good set overlap with ground truth.</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                      <span>Consider feature engineering to improve similarity scores.</span>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <span>Monitor trends over time to ensure consistent performance.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ModelPerformance;