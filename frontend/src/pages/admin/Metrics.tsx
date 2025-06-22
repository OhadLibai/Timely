// frontend/src/pages/admin/Metrics.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from 'react-query';
import {
  Brain, TrendingUp, Target, Activity, Info,
  Download, RefreshCw, BarChart3,
  Zap
} from 'lucide-react';
import {
  LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { adminService } from '../../services/admin.service';
import { predictionService } from '../../services/prediction.service';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import MetricExplanation from '../../components/admin/MetricExplanation';
import toast from 'react-hot-toast';

interface ModelMetrics {
    precision_at_k: Record<string, number>;
    recall_at_k: Record<string, number>;
    f1_score: number;
    ndcg: number;
    hit_rate: number;
}

const AdminMetrics: React.FC = () => {
  const [showExplanations, setShowExplanations] = useState(false);
  const [evaluationMetrics, setEvaluationMetrics] = useState<ModelMetrics | null>(null);

  // Fetch existing metric data
  const { data: modelMetrics, isLoading: isModelLoading } = useQuery(
    'model-metrics',
    predictionService.getModelMetrics,
    { staleTime: 10 * 60 * 1000 }
  );

  const { data: onlineMetrics, isLoading: isOnlineLoading } = useQuery(
    'online-metrics',
    predictionService.getOnlineMetrics,
    { staleTime: 5 * 60 * 1000 }
  );
  
  // Setup mutation for triggering a new evaluation
  const evaluateModelMutation = useMutation(adminService.triggerModelEvaluation, {
    onSuccess: (data) => {
        toast.dismiss();
        // The API response now directly contains the metrics object
        setEvaluationMetrics(data.metrics);
        toast.success("Model evaluation complete!");
    },
    onError: (error: any) => {
        toast.dismiss();
        toast.error(error.response?.data?.detail || "Failed to evaluate model.");
    }
  });

  const handleEvaluateModel = () => {
    toast.loading("Running evaluation... This may take a moment.");
    evaluateModelMutation.mutate();
  };

  if (isModelLoading || isOnlineLoading) {
    return <LoadingSpinner fullScreen />;
  }

  const radarData = modelMetrics ? [
    { metric: 'Precision', value: (modelMetrics.precisionAt10 * 100) },
    { metric: 'Recall', value: (modelMetrics.recallAt10 * 100) },
    { metric: 'Hit Rate', value: (modelMetrics.hitRate * 100) },
    { metric: 'NDCG', value: (modelMetrics.ndcg * 100) },
    { metric: 'F1 Score', value: (modelMetrics.f1Score * 100) },
  ] : [];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ML Model Metrics</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor and analyze the performance of your recommendation system.</p>
        </div>
        <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExplanations(!showExplanations)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Toggle Explanations"
            >
              <Info size={20} />
            </button>
            <button
                onClick={handleEvaluateModel}
                disabled={evaluateModelMutation.isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Brain size={16} />
              {evaluateModelMutation.isLoading ? 'Evaluating...' : 'Evaluate Model'}
            </button>
        </div>
      </div>
      
      {/* On-demand Evaluation Results Section */}
      {evaluationMetrics && (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                On-Demand Evaluation Results
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500">Precision@10</p>
                    <p className="font-bold text-xl text-indigo-600">{(evaluationMetrics.precision_at_k['10'] * 100).toFixed(2)}%</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500">Recall@10</p>
                    <p className="font-bold text-xl text-purple-600">{(evaluationMetrics.recall_at_k['10'] * 100).toFixed(2)}%</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500">F1 Score @10</p>
                    <p className="font-bold text-xl text-pink-600">{(evaluationMetrics.f1_score * 100).toFixed(2)}%</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500">Hit Rate @10</p>
                    <p className="font-bold text-xl text-green-600">{(evaluationMetrics.hit_rate * 100).toFixed(2)}%</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500">NDCG @10</p>
                    <p className="font-bold text-xl text-orange-600">{(evaluationMetrics.ndcg * 100).toFixed(2)}%</p>
                </div>
            </div>
            {showExplanations && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MetricExplanation metric="Precision" description="Of the items we recommended, what percentage did the user actually buy?" />
                    <MetricExplanation metric="Recall" description="Of all the items the user actually bought, what percentage did we successfully recommend?" />
                </div>
            )}
        </motion.div>
      )}

      {/* Persistent Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between"><Target className="h-8 w-8 text-indigo-600" /><span className="text-3xl font-bold">{(modelMetrics?.precisionAt10 * 100 || 0).toFixed(1)}%</span></div>
              <h3 className="mt-2 font-semibold text-gray-900 dark:text-white">Precision@10</h3>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.1}} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between"><Activity className="h-8 w-8 text-purple-600" /><span className="text-3xl font-bold">{(modelMetrics?.recallAt10 * 100 || 0).toFixed(1)}%</span></div>
              <h3 className="mt-2 font-semibold text-gray-900 dark:text-white">Recall@10</h3>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.2}} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between"><Zap className="h-8 w-8 text-green-600" /><span className="text-3xl font-bold">{(onlineMetrics?.autoCartAcceptanceRate * 100 || 0).toFixed(1)}%</span></div>
              <h3 className="mt-2 font-semibold text-gray-900 dark:text-white">Cart Acceptance</h3>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.3}} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between"><TrendingUp className="h-8 w-8 text-orange-600" /><span className="text-3xl font-bold">{onlineMetrics?.avgEditDistance?.toFixed(2) || 'N/A'}</span></div>
              <h3 className="mt-2 font-semibold text-gray-900 dark:text-white">Avg. Edit Distance</h3>
          </motion.div>
      </div>
    </div>
  );
};

export default AdminMetrics;