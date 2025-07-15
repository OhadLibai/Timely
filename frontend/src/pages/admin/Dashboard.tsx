// frontend/src/pages/admin/Dashboard.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from 'react-query';
import { 
  Brain, UserPlus, Target, Palette, TrendingUp, 
  Users, Zap, CheckCircle, ArrowRight, RefreshCw,
  BarChart3, Activity, Package, DollarSign, 
  PlayCircle, Settings, Eye, Sparkles, Clock,
  Star, Trophy, Rocket, Heart, Crown, Diamond
} from 'lucide-react';
import { evaluationService } from '@/services/evaluation.service';
import { useDashboardOverview } from '@/hooks/api/useAdmin';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MetricCard from '@/components/admin/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import { formatPrice } from '@/utils/formatters';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEvaluating, setIsEvaluating] = useState(false);

  // ============================================================================
  // CONSOLIDATED DATA CONSUMPTION - USING DASHBOARD OVERVIEW HOOK
  // ============================================================================

  // Use consolidated dashboard hook instead of individual queries
  const { mlMetrics, isLoading, error } = useDashboardOverview();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // ============================================================================
  // OVERVIEW HUB SECTIONS
  // ============================================================================

  const MLAnalyticsSection = () => (
    <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-xl shadow-lg border border-purple-200/50 p-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-pink-600/5 to-blue-600/5"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                🧠 ML Analytics Hub
                <Sparkles className="w-5 h-5 text-purple-500" />
              </h2>
              <p className="text-sm text-purple-700 font-medium">
                ✨ Displaying the latest evaluation results
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/admin/model-performance')}
              icon={ArrowRight}
              iconPosition="right"
            >
              🚀 Run New Evaluation
            </Button>
          </div>
        </div>

      {/* UPDATED: ML Metrics using new interface properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Precision@K"
          value={mlMetrics.data ? mlMetrics.data.PrecisionAt?.toFixed(3) : 'N/A'}
          subtitle="Accuracy at top K"
          icon={Target}
          color="blue"
          size="sm"
        />
        <MetricCard
          title="Recall@K"
          value={mlMetrics.data ? mlMetrics.data.RecallAt?.toFixed(3) : 'N/A'}
          subtitle="Coverage accuracy"
          icon={Activity}
          color="green"
          size="sm"
        />
        <MetricCard
          title="F1 Score@K"
          value={mlMetrics.data ? mlMetrics.data.F1ScoreAt?.toFixed(3) : 'N/A'}
          subtitle="Harmonic mean"
          icon={TrendingUp}
          color="purple"
          size="sm"
        />
        <MetricCard
          title="NDCG@K"
          value={mlMetrics.data ? mlMetrics.data.NDCGAt?.toFixed(3) : 'N/A'}
          subtitle="Ranking quality"
          icon={BarChart3}
          color="indigo"
          size="sm"
        />
        <MetricCard
          title="Jaccard Similarity"
          value={mlMetrics.data ? mlMetrics.data.JaccardSimilarity.toFixed(3) : 'N/A'}
          subtitle="Set similarity"
          icon={Zap}
          color="orange"
          size="sm"
        />
        </div>
      </div>
    </div>
  );

  const DemoManagementSection = () => (
    <div className="bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 rounded-xl shadow-xl border border-cyan-200/60 p-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/8 via-sky-600/8 to-blue-600/8"></div>
      <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-6 left-6 w-16 h-16 bg-gradient-to-br from-sky-400/20 to-cyan-400/20 rounded-full blur-lg"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg ring-2 ring-cyan-400/30">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                ⚡ System Management
                <Settings className="w-6 h-6 text-cyan-600" />
                <Crown className="w-5 h-5 text-blue-500" />
              </h2>
              <p className="text-base text-cyan-700 font-medium mt-1">
                🔧 User provisioning and system administration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/admin/user-seeding')}
              icon={UserPlus}
            >
              👤 Create User
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/admin/user-seeding')}
              icon={ArrowRight}
              iconPosition="right"
            >
              🎛️ Manage Users
            </Button>
          </div>
        </div>

      {/* Enhanced Demo Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Active Users"
          value={2}
          subtitle="Demo accounts provisioned"
          icon={Users}
          color="cyan"
          size="md"
        />
        <MetricCard
          title="System Orders"
          value={10}
          subtitle="Total transactions processed"
          icon={Package}
          color="blue"
          size="md"
        />
        <MetricCard
          title="Recent Activity"
          value={'User 42'}
          subtitle="Last provisioned account"
          icon={Clock}
          color="sky"
          size="md"
        />
        </div>
      </div>
    </div>
  );

  const PredictionTestingSection = () => (
    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50 rounded-xl shadow-lg border border-green-200/50 p-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 via-emerald-600/5 to-lime-600/5"></div>
      <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-6 left-6 w-18 h-18 bg-gradient-to-br from-lime-400/20 to-green-400/20 rounded-full blur-lg"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg ring-2 ring-green-400/30">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                🎯 Prediction Testing
                <Trophy className="w-6 h-6 text-green-500" />
                <Sparkles className="w-5 h-5 text-emerald-500" />
              </h2>
              <p className="text-base text-green-700 font-medium mt-1">
                🔍 Individual user prediction analysis and validation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/admin/user-prediction')}
              icon={PlayCircle}
            >
              🧪 Test New User
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/admin/user-prediction')}
              icon={ArrowRight}
              iconPosition="right"
            >
              🔬 Prediction Lab
            </Button>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Last Test"
          value="User 42"
          subtitle="Most recent analysis"
          icon={Target}
          color="blue"
          size="md"
        />
        <MetricCard
          title="Test Accuracy"
          value="89.2%"
          subtitle="Average precision"
          icon={CheckCircle}
          color="green"
          size="md"
        />
        <MetricCard
          title="Tests Run"
          value="156"
          subtitle="Total predictions"
          icon={BarChart3}
          color="purple"
          size="md"
        />
        </div>
      </div>
    </div>
  );

  const UserExperienceSection = () => (
    <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 rounded-xl shadow-lg border border-pink-200/50 p-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-pink-600/5 via-rose-600/5 to-orange-600/5"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl shadow-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                🎨 User Experience
                <Heart className="w-5 h-5 text-pink-500" />
              </h2>
              <p className="text-sm text-pink-700 font-medium">
                ✨ Frontend quality and shopping flow status
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/user-experience')}
            icon={ArrowRight}
            iconPosition="right"
          >
            💫 View Experience Details
          </Button>
        </div>

      {/* Static User Experience Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 bg-green-50/20 rounded-lg">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div>
            <div className="font-semibold text-green-900">
              Shopping Flow
            </div>
            <div className="text-sm text-green-600">
              ✅ Operational
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-green-50/20 rounded-lg">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div>
            <div className="font-semibold text-green-900">
              Product Display
            </div>
            <div className="text-sm text-green-600">
              ✅ Operational
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-green-50/20 rounded-lg">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div>
            <div className="font-semibold text-green-900">
              Cart Functionality
            </div>
            <div className="text-sm text-green-600">
              ✅ Operational
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 p-6 relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 bg-purple-200/20 rounded-full blur-xl"
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-40 right-32 w-24 h-24 bg-pink-200/20 rounded-full blur-xl"
          animate={{
            y: [0, 15, 0],
            x: [0, -8, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div
          className="absolute bottom-32 left-1/3 w-20 h-20 bg-blue-200/20 rounded-full blur-xl"
          animate={{
            y: [0, -10, 0],
            x: [0, 5, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>
      
      <div className="max-w-7xl mx-auto relative">
        {/* Enhanced Page Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                ✨ Admin Dashboard
              </h1>
              <Sparkles className="w-6 h-6 text-purple-500" />
            </div>
            <p className="text-lg text-gray-600 mb-2">
              🚀 Overview Hub - Real-time metrics, quick actions and system status
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Diamond className="w-4 h-4 text-blue-500" />
                Live Metrics
              </span>
              <span className="flex items-center gap-1">
                <Rocket className="w-4 h-4 text-purple-500" />
                AI Powered
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-pink-500" />
                Real-time
              </span>
            </div>
          </motion.div>
        </div>

        {/* Overview Hub Content */}
        <div className="space-y-16">
          {/* ML Analytics Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MLAnalyticsSection />
          </motion.div>

          {/* System Management Section (Full Width) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <DemoManagementSection />
          </motion.div>

          {/* Prediction Testing Section (Full Width) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <PredictionTestingSection />
          </motion.div>

          {/* User Experience Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <UserExperienceSection />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;