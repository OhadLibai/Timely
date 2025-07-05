import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

interface FeatureCardProps extends Omit<CardProps, 'children'> {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor?: string;
  iconBg?: string;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  animated = false,
  hover = false,
  padding = 'md'
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const baseClasses = `bg-white rounded-xl shadow-sm ${paddingClasses[padding]} ${className}`;
  const hoverClasses = hover ? 'hover:shadow-xl transition-shadow duration-300' : '';
  const combinedClasses = `${baseClasses} ${hoverClasses}`;

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={combinedClasses}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={combinedClasses}>{children}</div>;
};

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  iconColor = 'text-indigo-600',
  iconBg = 'bg-indigo-100/20',
  className = '',
  animated = true,
  hover = true,
  padding = 'lg'
}) => {
  return (
    <Card 
      className={className} 
      animated={animated} 
      hover={hover} 
      padding={padding}
    >
      <div className="text-center">
        <div className={`w-16 h-16 ${iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed">
          {description}
        </p>
      </div>
    </Card>
  );
};