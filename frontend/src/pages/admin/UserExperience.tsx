// frontend/src/pages/admin/UserExperience.tsx
// DEMAND 4: Frontend Quality Overview - Static shopping flow status
// Hardcoded / Placard

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Palette, CheckCircle, ShoppingCart, Package, 
  Heart, CreditCard, User, Search, ArrowLeft,
  Smartphone, Monitor, Tablet, Zap, Eye,
  Clock, TrendingUp, Star, Gift
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';

const UserExperience: React.FC = () => {
  const navigate = useNavigate();

  // ============================================================================
  // STATIC USER EXPERIENCE STATUS (DEMAND 4)
  // ============================================================================

  const shoppingFlowStatus = [
    {
      name: 'Shopping Flow',
      status: 'operational',
      icon: ShoppingCart,
      description: 'Complete shopping journey from browse to checkout',
      features: ['Product browsing', 'Category filtering', 'Search functionality', 'Add to cart']
    },
    {
      name: 'Product Display',
      status: 'operational',
      icon: Package,
      description: 'Product presentation and information display',
      features: ['Product images', 'Price display', 'Product details', 'Stock information']
    },
    {
      name: 'Cart Functionality',
      status: 'operational',
      icon: ShoppingCart,
      description: 'Shopping cart and checkout process',
      features: ['Add/remove items', 'Quantity adjustment', 'Price calculation', 'Checkout flow']
    }
  ];

  const userInterfaceStatus = [
    {
      name: 'Responsive Design',
      status: 'operational',
      icon: Smartphone,
      description: 'Mobile and desktop compatibility',
      details: 'Optimized for all screen sizes'
    },
    {
      name: 'Visual Design',
      status: 'operational',
      icon: Palette,
      description: 'Modern UI with consistent branding',
      details: 'Clean, professional interface'
    },
    {
      name: 'User Authentication',
      status: 'operational',
      icon: User,
      description: 'Login and registration system',
      details: 'Secure user account management'
    },
    {
      name: 'Performance',
      status: 'operational',
      icon: Zap,
      description: 'Fast loading and responsive interface',
      details: 'Optimized for speed'
    }
  ];

  const mlIntegrationStatus = [
    {
      name: 'Predicted Basket',
      status: 'operational',
      icon: Gift,
      description: 'ML-powered basket recommendations',
      details: 'Smart product suggestions based on history'
    },
    {
      name: 'Personalization',
      status: 'operational',
      icon: Star,
      description: 'Personalized shopping experience',
      details: 'Tailored recommendations for each user'
    },
    {
      name: 'Auto-Generation',
      status: 'operational',
      icon: TrendingUp,
      description: 'Automated basket creation',
      details: 'One-click basket generation'
    }
  ];

  const StatusCard: React.FC<{
    name: string;
    status: string;
    icon: React.ElementType;
    description: string;
    features?: string[];
    details?: string;
  }> = ({ name, status, icon: Icon, description, features, details }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-green-100/30 rounded-lg">
          <Icon className="w-6 h-6 text-green-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">
              {name}
            </h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600">
            {description}
          </p>
        </div>
        <div className="px-3 py-1 bg-green-100/30 rounded-full">
          <span className="text-sm font-medium text-green-700">
            ✅ Operational
          </span>
        </div>
      </div>

      {features && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Key Features:
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {details && (
        <div className="mt-4 p-3 bg-green-50/20 rounded-lg">
          <p className="text-sm text-green-700">
            {details}
          </p>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Frontend Quality Overview"
          description="User experience monitoring and shopping flow status assessment"
          icon={Palette}
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

        {/* Status Overview */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-100/30 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  All Systems Operational
                </h2>
                <p className="text-gray-600">
                  Frontend quality and user experience are performing optimally
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  100%
                </div>
                <div className="text-sm text-gray-600">
                  System Uptime
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  ✅
                </div>
                <div className="text-sm text-gray-600">
                  All Features Working
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  Excellent
                </div>
                <div className="text-sm text-gray-600">
                  User Experience
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Core Shopping Flow Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Core Shopping Flow
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {shoppingFlowStatus.map((item, index) => (
              <StatusCard key={index} {...item} />
            ))}
          </div>
        </div>

        {/* User Interface Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            User Interface Quality
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {userInterfaceStatus.map((item, index) => (
              <StatusCard key={index} {...item} />
            ))}
          </div>
        </div>

        {/* ML Integration Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            ML Integration & Personalization
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {mlIntegrationStatus.map((item, index) => (
              <StatusCard key={index} {...item} />
            ))}
          </div>
        </div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white"
        >
          <div className="flex items-center gap-4">
            <CheckCircle className="w-12 h-12 text-green-100" />
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Excellent User Experience Status
              </h3>
              <p className="text-green-100">
                All frontend components are operational and providing an optimal shopping experience. 
                The ML-powered features are working seamlessly to deliver personalized recommendations 
                and automated basket generation.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UserExperience;