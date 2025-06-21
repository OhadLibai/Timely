// frontend/src/pages/admin/Metrics.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import {
  Brain, TrendingUp, Target, Activity, Info,
  Download, RefreshCw, Calendar, BarChart3,
  Zap, Users, ShoppingCart, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { adminService } from '../../services/admin.service';
import { predictionService } from '../../services/prediction.service';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import MetricExplanation from '../../components/admin/MetricExplanation';
import toast from 'react-hot-toast';

import { MetricCard } from '../../components/admin/MetricCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

interface TimeRange {
  value: string;
  label: string;
  days: number;
}

const timeRanges: TimeRange[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: '180d', label: 'Last 6 months', days: 180 }
];

const AdminMetrics: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(timeRanges[1]);
  const [showExplanations, setShowExplanations] = useState(false);

  // Fetch ML metrics over time
  const { data: metricsHistory, isLoading, refetch } = useQuery(
    ['ml-metrics-history', selectedTimeRange.days],
    () => adminService.getMLMetricsHistory(selectedTimeRange.days),
    { staleTime: 10 * 60 * 1000 }
  );

  // Fetch current metrics
  const { data: currentMetrics } = useQuery(
    'current-ml-metrics',
    predictionService.getModelMetrics,
    { staleTime: 5 * 60 * 1000 }
  );

  // Fetch online metrics
  const { data: onlineMetrics } = useQuery(
    'online-metrics',
    predictionService.getOnlineMetrics,
    { staleTime: 5 * 60 * 1000 }
  );

  // Exporting the results (JSON format)
  const handleExportMetrics = async () => {
    try {
      const data = await adminService.exportMetrics(selectedTimeRange.days);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ml-metrics-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Metrics exported successfully');
    } catch (error) {
      toast.error('Failed to export metrics');
    }
  };

  const handleEvaluateClick = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.triggerModelEvaluation();
      // With our new architecture, the response directly contains the new metrics
      setMetrics(response.metrics);
    } catch (err) {
      setError('Failed to run evaluation. Please check the service logs.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const radarData = currentMetrics ? [
    { metric: 'Precision', value: (currentMetrics.precisionAt10 * 100) },
    { metric: 'Recall', value: (currentMetrics.recallAt10 * 100) },
    { metric: 'Hit Rate', value: (currentMetrics.hitRate * 100) },
    { metric: 'NDCG', value: (currentMetrics.ndcg * 100) },
    { metric: 'F1 Score', value: (currentMetrics.f1Score * 100) },
    { metric: 'Acceptance', value: ((onlineMetrics?.autoCartAcceptanceRate || 0) * 100) }
  ] : [];

  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                ML Model Metrics
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor and analyze the performance of your recommendation system
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedTimeRange.value}
                onChange={(e) => setSelectedTimeRange(timeRanges.find(r => r.value === e.target.value)!)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
              <button
                onClick={() => setShowExplanations(!showExplanations)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Info size={20} />
              </button>
              <button
                onClick={handleExportMetrics}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Download size={20} />
              </button>
              <button
                onClick={() => refetch()}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Current Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-indigo-500" />
              <span className="text-3xl font-bold text-indigo-600">
                {((currentMetrics?.precisionAt10 || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Precision@10</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Accuracy of top 10 predictions
            </p>
            {showExplanations && (
              <MetricExplanation metric="precision" className="mt-3" />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-purple-500" />
              <span className="text-3xl font-bold text-purple-600">
                {((currentMetrics?.recallAt10 || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Recall@10</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Coverage of relevant items
            </p>
            {showExplanations && (
              <MetricExplanation metric="recall" className="mt-3" />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8 text-green-500" />
              <span className="text-3xl font-bold text-green-600">
                {((currentMetrics?.hitRate || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Hit Rate</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Predictions with at least 1 hit
            </p>
            {showExplanations && (
              <MetricExplanation metric="hitrate" className="mt-3" />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-orange-500" />
              <span className="text-3xl font-bold text-orange-600">
                {((currentMetrics?.ndcg || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">NDCG</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Ranking quality score
            </p>
            {showExplanations && (
              <MetricExplanation metric="ndcg" className="mt-3" />
            )}
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Metrics History */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performance Trends
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metricsHistory?.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none', 
                    borderRadius: '0.5rem' 
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="precision" stroke="#6366F1" name="Precision" strokeWidth={2} />
                <Line type="monotone" dataKey="recall" stroke="#8B5CF6" name="Recall" strokeWidth={2} />
                <Line type="monotone" dataKey="hitRate" stroke="#10B981" name="Hit Rate" strokeWidth={2} />
                <Line type="monotone" dataKey="ndcg" stroke="#F59E0B" name="NDCG" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Radar Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Overall Performance
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="metric" stroke="#9CA3AF" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9CA3AF" />
                <Radar 
                  name="Current" 
                  dataKey="value" 
                  stroke="#6366F1" 
                  fill="#6366F1" 
                  fillOpacity={0.6} 
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Online Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              User Engagement Metrics
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cart Acceptance Rate</span>
                  <span className="font-semibold">{((onlineMetrics?.autoCartAcceptanceRate || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(onlineMetrics?.autoCartAcceptanceRate || 0) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cart Value Uplift</span>
                  <span className="font-semibold">+{((onlineMetrics?.cartValueUplift || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((onlineMetrics?.cartValueUplift || 0) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">User Satisfaction</span>
                  <span className="font-semibold">{onlineMetrics?.userSatisfactionScore?.toFixed(1) || '0'}/5.0</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${((onlineMetrics?.userSatisfactionScore || 0) / 5) * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-indigo-600">
                      {onlineMetrics?.totalPredictions?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Predictions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {onlineMetrics?.successfulPredictions?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Successful</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Actions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Model Management
          </h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleRetrainModel}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Brain size={20} />
              Retrain Model
            </button>
            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
              <BarChart3 size={20} />
              Run A/B Test
            </button>
            <button className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
              <Calendar size={20} />
              Schedule Training
            </button>
          </div>

          {metricsHistory?.lastTraining && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Last model training: {new Date(metricsHistory.lastTraining).toLocaleString()}
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    Training data: {metricsHistory.trainingDataSize?.toLocaleString() || 'N/A'} samples
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminMetrics;