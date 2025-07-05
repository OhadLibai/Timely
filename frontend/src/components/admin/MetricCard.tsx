// frontend/src/components/admin/MetricCard.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'indigo' | 'pink' | 'orange' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  animated?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  color = 'blue',
  size = 'md',
  loading = false,
  onClick,
  className = '',
  animated = true
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    indigo: 'bg-indigo-500',
    pink: 'bg-pink-500',
    orange: 'bg-orange-500',
    gray: 'bg-gray-500'
  };

  const sizeClasses = {
    sm: {
      container: 'p-4',
      icon: 'w-8 h-8',
      iconSize: 'h-4 w-4',
      title: 'text-xs',
      value: 'text-lg',
      change: 'text-xs'
    },
    md: {
      container: 'p-6',
      icon: 'w-12 h-12',
      iconSize: 'h-6 w-6',
      title: 'text-sm',
      value: 'text-2xl',
      change: 'text-sm'
    },
    lg: {
      container: 'p-8',
      icon: 'w-16 h-16',
      iconSize: 'h-8 w-8',
      title: 'text-base',
      value: 'text-3xl',
      change: 'text-base'
    }
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
      return val.toLocaleString();
    }
    return val;
  };

  const getChangeIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return TrendingUp;
    if (change < 0) return TrendingDown;
    return Activity;
  };

  const getChangeColor = () => {
    if (change === undefined) return 'text-gray-500';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const ChangeIcon = getChangeIcon();
  const classes = sizeClasses[size];

  const content = (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md ${
      onClick ? 'cursor-pointer hover:border-gray-300' : ''
    } ${classes.container} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`font-medium text-gray-600 ${classes.title}`}>
            {title}
          </p>
          
          {loading ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
            </div>
          ) : (
            <p className={`font-semibold text-gray-900 ${classes.value} mt-1`}>
              {formatValue(value)}
            </p>
          )}
          
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
          
          {change !== undefined && !loading && (
            <div className="flex items-center mt-2">
              {ChangeIcon && (
                <ChangeIcon className={`${classes.change === 'text-xs' ? 'h-3 w-3' : 'h-4 w-4'} mr-1 ${getChangeColor()}`} />
              )}
              <span className={`font-medium ${getChangeColor()} ${classes.change}`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        
        <div className={`${classes.icon} ${colorClasses[color]} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {loading ? (
            <div className="animate-spin">
              <Activity className={`${classes.iconSize} text-white`} />
            </div>
          ) : (
            <Icon className={`${classes.iconSize} text-white`} />
          )}
        </div>
      </div>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClick}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div onClick={onClick}>
      {content}
    </div>
  );
};

export default MetricCard;