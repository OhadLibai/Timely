import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Truck, 
  RefreshCw,
  Circle,
  LucideIcon
} from 'lucide-react';

export type StatusType = 
  | 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' 
  | 'completed' | 'failed' | 'active' | 'inactive' | 'draft'
  | 'success' | 'warning' | 'error' | 'info';

interface StatusConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  textColor: string;
  label: string;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  // Order statuses
  pending: {
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    label: 'Pending'
  },
  processing: {
    icon: RefreshCw,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-800 dark:text-blue-200',
    label: 'Processing'
  },
  confirmed: {
    icon: CheckCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-800 dark:text-blue-200',
    label: 'Confirmed'
  },
  shipped: {
    icon: Truck,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    textColor: 'text-indigo-800 dark:text-indigo-200',
    label: 'Shipped'
  },
  delivered: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-800 dark:text-green-200',
    label: 'Delivered'
  },
  cancelled: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-800 dark:text-red-200',
    label: 'Cancelled'
  },
  
  // General statuses
  completed: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-800 dark:text-green-200',
    label: 'Completed'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-800 dark:text-red-200',
    label: 'Failed'
  },
  active: {
    icon: Circle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-800 dark:text-green-200',
    label: 'Active'
  },
  inactive: {
    icon: Circle,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    textColor: 'text-gray-800 dark:text-gray-200',
    label: 'Inactive'
  },
  draft: {
    icon: Circle,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    textColor: 'text-gray-800 dark:text-gray-200',
    label: 'Draft'
  },
  
  // Alert statuses
  success: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-800 dark:text-green-200',
    label: 'Success'
  },
  warning: {
    icon: AlertCircle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    label: 'Warning'
  },
  error: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-800 dark:text-red-200',
    label: 'Error'
  },
  info: {
    icon: AlertCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-800 dark:text-blue-200',
    label: 'Info'
  }
};

interface StatusIndicatorProps {
  status: StatusType;
  customLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'pill' | 'minimal' | 'icon-only';
  className?: string;
  showIcon?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  customLabel,
  size = 'md',
  variant = 'badge',
  className = '',
  showIcon = true
}) => {
  const config = statusConfigs[status];
  const label = customLabel || config.label;
  
  const sizes = {
    sm: { text: 'text-xs', padding: 'px-2 py-0.5', icon: 'w-3 h-3' },
    md: { text: 'text-sm', padding: 'px-2.5 py-1', icon: 'w-4 h-4' },
    lg: { text: 'text-base', padding: 'px-3 py-1.5', icon: 'w-5 h-5' }
  };

  const variants = {
    badge: `inline-flex items-center gap-1 font-medium rounded-md ${config.bgColor} ${config.textColor}`,
    pill: `inline-flex items-center gap-1 font-medium rounded-full ${config.bgColor} ${config.textColor}`,
    minimal: `inline-flex items-center gap-1 ${config.color}`,
    'icon-only': `inline-flex items-center justify-center ${config.color}`
  };

  const IconComponent = config.icon;
  const sizeConfig = sizes[size];

  return (
    <span className={`${variants[variant]} ${sizeConfig.text} ${variant !== 'icon-only' ? sizeConfig.padding : ''} ${className}`}>
      {showIcon && (
        <IconComponent className={sizeConfig.icon} />
      )}
      {variant !== 'icon-only' && label}
    </span>
  );
};

// Helper function to get status from string (for backward compatibility)
export const getStatusIndicator = (statusString: string): StatusType => {
  const normalized = statusString.toLowerCase() as StatusType;
  return statusConfigs[normalized] ? normalized : 'info';
};