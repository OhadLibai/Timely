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
      return Package;
    case 'favorite':
      return Heart;
    case 'cart':
      return ShoppingCart;
    case 'system':
      return Settings;
    default:
      return Bell;
  }
};

/**
 * Renders icon with loading state support
 */
export const renderIconWithLoading = (
  Icon: LucideIcon | undefined, 
  loading: boolean = false, 
  _className: string = "w-5 h-5"
) => {
  if (loading) {
    return Loader2;
  }
  if (Icon) {
    return Icon;
  }
  return null;
};