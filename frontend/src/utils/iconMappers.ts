import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Minus,
  Package, 
  Heart, 
  ShoppingCart, 
  Settings, 
  Bell,
  Loader2,
  LucideIcon
} from 'lucide-react';

/**
 * Icon mapping utilities for consistent iconography
 */

/**
 * Maps change values to appropriate trend icons
 */
export const getChangeIcon = (change: number | undefined): LucideIcon | null => {
  if (change === undefined) return null;
  if (change > 0) return TrendingUp;
  if (change < 0) return TrendingDown;
  return Activity;
};

/**
 * Maps confidence scores to appropriate trend icons
 */
export const getConfidenceIcon = (score: number): LucideIcon => {
  if (score >= 0.8) return TrendingUp;
  if (score >= 0.6) return Minus;
  return TrendingDown;
};

/**
 * Maps notification types to appropriate icons
 */
export const getNotificationIcon = (type: 'order' | 'favorite' | 'cart' | 'system' | string) => {
  switch (type) {
    case 'order':
      return <Package size={16} className="text-blue-500" />;
    case 'favorite':
      return <Heart size={16} className="text-red-500" />;
    case 'cart':
      return <ShoppingCart size={16} className="text-green-500" />;
    case 'system':
      return <Settings size={16} className="text-gray-500" />;
    default:
      return <Bell size={16} className="text-gray-500" />;
  }
};

/**
 * Renders icon with loading state support
 */
export const renderIconWithLoading = (
  Icon: LucideIcon | undefined, 
  loading: boolean = false, 
  className: string = "w-5 h-5"
) => {
  if (loading) {
    return <Loader2 className={`${className} animate-spin`} />;
  }
  if (Icon) {
    return <Icon className={className} />;
  }
  return null;
};