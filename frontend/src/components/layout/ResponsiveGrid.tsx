import React from 'react';
import { motion } from 'framer-motion';
import { animationPresets } from '@/utils/animations';

interface GridBreakpoints {
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  '2xl'?: number;
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: GridBreakpoints;
  gap?: number | { x?: number; y?: number };
  className?: string;
  animated?: boolean;
  animationDelay?: number;
  as?: 'div' | 'section' | 'article' | 'ul' | 'ol';
}

const defaultCols: GridBreakpoints = {
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4
};

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = defaultCols,
  gap = 6,
  className = '',
  animated = false,
  animationDelay = 0,
  as = 'div'
}) => {
  // Build grid classes
  const gridCols = {
    sm: cols.sm || defaultCols.sm,
    md: cols.md || defaultCols.md,
    lg: cols.lg || defaultCols.lg,
    xl: cols.xl || defaultCols.xl,
    '2xl': cols['2xl']
  };

  // Build gap classes
  const gapX = typeof gap === 'object' ? gap.x || 6 : gap;
  const gapY = typeof gap === 'object' ? gap.y || 6 : gap;
  
  const gapClasses = gapX === gapY 
    ? `gap-${gapX}` 
    : `gap-x-${gapX} gap-y-${gapY}`;

  // Build responsive grid classes
  const gridClasses = [
    'grid',
    `grid-cols-${gridCols.sm}`,
    gridCols.md && `md:grid-cols-${gridCols.md}`,
    gridCols.lg && `lg:grid-cols-${gridCols.lg}`,
    gridCols.xl && `xl:grid-cols-${gridCols.xl}`,
    gridCols['2xl'] && `2xl:grid-cols-${gridCols['2xl']}`,
    gapClasses,
    className
  ].filter(Boolean).join(' ');

  if (animated) {
    const MotionComponent = motion[as as keyof typeof motion] as any;
    
    return (
      <MotionComponent
        className={gridClasses}
        {...animationPresets.staggerContainer}
        transition={{ 
          ...animationPresets.staggerContainer.animate?.transition,
          delay: animationDelay 
        }}
      >
        {children}
      </MotionComponent>
    );
  }

  const Component = as;
  return (
    <Component className={gridClasses}>
      {children}
    </Component>
  );
};

// Pre-configured grid layouts for common use cases
export const ProductGrid: React.FC<Omit<ResponsiveGridProps, 'cols'>> = (props) => (
  <ResponsiveGrid
    cols={{ sm: 1, md: 2, lg: 3, xl: 4 }}
    {...props}
  />
);

export const CardGrid: React.FC<Omit<ResponsiveGridProps, 'cols'>> = (props) => (
  <ResponsiveGrid
    cols={{ sm: 1, md: 2, lg: 3 }}
    {...props}
  />
);

export const FeatureGrid: React.FC<Omit<ResponsiveGridProps, 'cols'>> = (props) => (
  <ResponsiveGrid
    cols={{ sm: 1, md: 2, lg: 2, xl: 3 }}
    {...props}
  />
);

export const MetricGrid: React.FC<Omit<ResponsiveGridProps, 'cols'>> = (props) => (
  <ResponsiveGrid
    cols={{ sm: 1, md: 2, lg: 4 }}
    {...props}
  />
);