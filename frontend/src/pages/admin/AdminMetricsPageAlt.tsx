// frontend/src/pages/admin/AdminMetricsPage.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import {
  Brain, TrendingUp, Target, Activity, Info,
  Download, RefreshCw, BarChart3, AlertTriangle, Eye, EyeOff,
  Table as TableIcon
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { adminService } from '../../services/admin.service';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

interface DetailedEvaluationMetrics {
  'precision@5'?: number; 'recall@5'?: number; 'f1@5'?: number; 'ndcg@5'?: number; 'hit_rate@5'?: number;
  'precision@10'?: number; 'recall@10'?: number; 'f1@10'?: number; 'ndcg@10'?: number; 'hit_rate@10'?: number;
  'precision@20'?: number; 'recall@20'?: number; 'f1@20'?: number; 'ndcg@20'?: number; 'hit_rate@20'?: number;
  coverage?: number; avg_diversity?: number;
  [key: string]: number | undefined; // For other metrics
}

interface StoredMetricEntry {
  id: number | string;
  timestamp: string;
  model_version: string;
  // These might be redundant if metrics_json is comprehensive
  precision_at_10?: number; 
  recall_at_10?: number;
  f1_at_10?: number;
  ndcg_at_10?: number;
  hit_rate_at_10?: number;
  metrics_json?: DetailedEvaluationMetrics | string;
}

const METRIC_EXPLANATIONS: Record<string, string> = {
    precision: "Precision@K: Of the K items recommended, what fraction were relevant (actually purchased by the user)? Higher is better.",
    recall: "Recall@K: Of all relevant items the user actually purchased, what fraction were captured in the top K recommendations? Higher is better.",
    f1_score: "F1-Score@K: The harmonic mean of Precision and Recall, providing a single score that balances both. Higher is better.",
    ndcg: "NDCG@K (Normalized Discounted Cumulative Gain): Measures ranking quality. It gives higher scores if relevant items are ranked higher in the top K recommendations. Higher is better.",
    hit_rate: "Hit Rate@K: The fraction of users for whom at least one relevant item was found in the top K recommendations. Higher is better.",
    coverage: "Catalog Coverage: Percentage of unique items in the catalog that appeared in any recommendation list over a period. Higher indicates more diverse recommendations.",
    avg_diversity: "Average Diversity: Measures how dissimilar items are within a single recommendation list. Higher indicates more varied suggestions for a user."
};

const AdminMetricsPage: React.FC = () => {
  const [showExplanations, setShowExplanations] = useState(false);
  const [numMetricHistory, setNumMetricHistory] = useState(10);

  const { data: evaluationMetricsData, isLoading, refetch, isError } = useQuery<StoredMetricEntry[]>(
    ['mlEvaluationMetrics', numMetricHistory],
    () => adminService.getMLEvaluationMetrics(numMetricHistory),
    { staleTime: 1 * 60 * 1000, refetchOnWindowFocus: true } // Refetch more often
  );

  const { data: featureImportanceData, isLoading: isLoadingFeatures } = useQuery(
    'featureImportance',
    adminService.getFeatureImportance,
    { staleTime: 60 * 60 * 1000 }
  );

  const parseMetricsJson = (entry?: StoredMetricEntry): DetailedEvaluationMetrics | null => {
    if (!entry?.metrics_json) return null;
    if (typeof entry.metrics_json === 'object') return entry.metrics_json as DetailedEvaluationMetrics;
    try {
      return JSON.parse(entry.metrics_json as string) as DetailedEvaluationMetrics;
    } catch (e) {
      console.error("Failed to parse metrics_json for entry:", entry.id, e);
      return null;
    }
  };
  
  const latestMetricsEntry = evaluationMetricsData?.[0];
  const latestDetailedMetrics = parseMetricsJson(latestMetricsEntry);

  const metricsForRadar = latestDetailedMetrics ? [
    { metric: 'P@10', value: (latestDetailedMetrics['precision@10'] || 0) * 100, fullMark: 100 },
    { metric: 'R@10', value: (latestDetailedMetrics['recall@10'] || 0) * 100, fullMark: 100 },
    { metric: 'F1@10', value: (latestDetailedMetrics['f1@10'] || 0) * 100, fullMark: 100 },
    { metric: 'NDCG@10', value: (latestDetailedMetrics['ndcg@10'] || 0) * 100, fullMark: 100 },
    { metric: 'Hit@10', value: (latestDetailedMetrics['hit_rate@10'] || 0) * 100, fullMark: 100 },
  ] : [];

  const metricsTrendData = (evaluationMetricsData || []).map(entry => {
    const details = parseMetricsJson(entry);
    return {
      date: new Date(entry.timestamp).toLocaleDateString(),
      model_version: entry.model_version,
      precisionAt10: details ? (details['precision@10'] || 0) * 100 : (entry.precision_at_10 || 0) * 100,
      recallAt10: details ? (details['recall@10'] || 0) * 100 : (entry.recall_at_10 || 0) * 100,
      f1At10: details ? (details['f1@10'] || 0) * 100 : (entry.f1_at_10 || 0) * 100,
      ndcgAt10: details ? (details['ndcg@10'] || 0) * 100 : (entry.ndcg_at_10 || 0) * 100,
    };
  }).reverse();

  const displayMetricValue = (value: number | undefined, isPercentage = true) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return isPercentage ? `${(value * 100).toFixed(1)}%` : value.toFixed(3);
  };

  const renderMetricCard = (title: string, valueKey: keyof DetailedEvaluationMetrics | keyof StoredMetricEntry, icon: React.ElementType, color: string, explanationKey: string) => {
    let val: number | undefined;
    if (latestDetailedMetrics && latestDetailedMetrics[valueKey as keyof DetailedEvaluationMetrics] !== undefined) {
        val = latestDetailedMetrics[valueKey as keyof DetailedEvaluationMetrics];
    } else if (latestMetricsEntry && latestMetricsEntry[valueKey as keyof StoredMetricEntry] !== undefined) {
        val = latestMetricsEntry[valueKey as keyof StoredMetricEntry] as number;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6"
        >
            <div className="flex items-center justify-between mb-2">
                {React.createElement(icon, { className: `w-6 h-6 text-${color}-500` })}
                {showExplanations && (
                    <button onClick={() => toast.info(METRIC_EXPLANATIONS[explanationKey] || "No explanation available.", {duration: 6000})} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <Info size={14}/>
                    </button>
                )}
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>
            <p className={`text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1`}>{displayMetricValue(val)}</p>
        </motion.div>
      );
  };

  if (isLoading) return <LoadingSpinner fullScreen message="Loading ML Metrics..." />;

  return (
    <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">ML Model & Evaluation Metrics</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {latestMetricsEntry ? `Last eval: ${new Date(latestMetricsEntry.timestamp).toLocaleString()} (Version: ${latestMetricsEntry.model_version || 'N/A'})` : "No evaluation data yet."}
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center gap-2">
          <button onClick={() => setShowExplanations(!showExplanations)} title={showExplanations ? "Hide Explanations" : "Show Explanations"} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {showExplanations ? <EyeOff size={20}/> : <Eye size={20} />}
          </button>
          <button onClick={() => refetch()} title="Refresh Data" className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {isError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-300 dark:border-red-700 rounded-md flex items-center gap-3">
              <AlertTriangle size={20} /> <p>Error loading ML evaluation metrics. Please try again.</p>
          </div>
      )}

      {!latestMetricsEntry && !isLoading && !isError && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded-md flex items-center gap-3">
              <AlertTriangle size={20} /> <p>No evaluation metrics data available. The model may need to be trained, or the first evaluation run is pending.</p>
          </div>
      )}

      {/* Key Metrics Display from latest run */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
        {renderMetricCard("Precision@10", 'precision@10', Target, "indigo", "precision")}
        {renderMetricCard("Recall@10", 'recall@10', Activity, "purple", "recall")}
        {renderMetricCard("F1-Score@10", 'f1@10', Brain, "pink", "f1_score")}
        {renderMetricCard("NDCG@10", 'ndcg@10', TrendingUp, "green", "ndcg")}
        {renderMetricCard("Hit Rate@10", 'hit_rate@10', Target, "yellow", "hit_rate")}
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        <motion.div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Trends (Metrics @10 Over Time)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsTrendData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="dark:stroke-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="dark:fill-gray-400" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} className="dark:fill-gray-400" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', border: 'none', borderRadius: '0.5rem' }} itemStyle={{ color: '#e5e7eb' }} labelStyle={{ color: '#cbd5e1', fontWeight: 'bold' }}/>
              <Legend wrapperStyle={{fontSize: "12px"}} />
              <Line type="monotone" dataKey="precisionAt10" name="P@10" stroke="#6366F1" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="recallAt10" name="R@10" stroke="#8B5CF6" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="f1At10" name="F1@10" stroke="#EC4899" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">Overall Performance Snapshot (@10)</h3>
          {metricsForRadar.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={metricsForRadar}>
                <PolarGrid strokeOpacity={0.3} className="dark:stroke-gray-600"/>
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} className="dark:fill-gray-300" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} className="dark:fill-gray-400"/>
                <Radar name="Latest Run" dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                <Tooltip />
                </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 dark:text-gray-400 text-center py-10">Not enough data for radar chart.</p>}
        </motion.div>
      </div>

      {/* Detailed Metrics Table for K=5, 10, 20 from latest run */}
      {latestDetailedMetrics && (
        <motion.div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 mb-6 md:mb-8">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><TableIcon size={20}/> Detailed Metrics by Recommendation Count (K)</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Metric @K</th>
                            {[5, 10, 20].map(k => (
                                <th key={k} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">K={k}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {['precision', 'recall', 'f1', 'ndcg', 'hit_rate'].map(metricName => (
                            <tr key={metricName}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white capitalize">{metricName.replace('_', ' ')}</td>
                                {[5, 10, 20].map(k => (
                                    <td key={k} className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {displayMetricValue(latestDetailedMetrics?.[`${metricName}@${k}` as keyof DetailedEvaluationMetrics])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {latestDetailedMetrics.coverage !== undefined && (
                             <tr>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">Catalog Coverage</td>
                                <td colSpan={3} className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{displayMetricValue(latestDetailedMetrics.coverage, false)} items</td>
                            </tr>
                        )}
                        {latestDetailedMetrics.avg_diversity !== undefined && (
                             <tr>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">Average Diversity</td>
                                <td colSpan={3} className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{displayMetricValue(latestDetailedMetrics.avg_diversity, false)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
      )}

      {/* Feature Importance */}
      {featureImportanceData && featureImportanceData.length > 0 && (
          <motion.div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 mb-6 md:mb-8">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Feature Importances (Model: {latestMetricsEntry?.model_version || 'N/A'})</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={featureImportanceData.slice(0, 15)} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="dark:stroke-gray-700"/>
                <XAxis type="number" tick={{ fontSize: 10 }} className="dark:fill-gray-400"/>
                <YAxis dataKey="feature" type="category" width={120} interval={0} tick={{ fontSize: 10, width: 110 }} className="dark:fill-gray-300"/>
                <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', border: 'none', borderRadius: '0.5rem' }} itemStyle={{ color: '#e5e7eb' }} labelStyle={{ color: '#cbd5e1', fontWeight: 'bold', maxWidth: 200, whiteSpace: 'normal' }}/>
                <Legend wrapperStyle={{fontSize: "12px"}}/>
                <Bar dataKey="importance" name="Importance (Gain)" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
      )}
    </div>
  );
};

export default AdminMetricsPage;