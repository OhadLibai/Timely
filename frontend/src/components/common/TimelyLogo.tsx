import React from 'react';
import { Clock, Zap, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimelyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact' | 'icon';
  animated?: boolean;
}

const TimelyLogo: React.FC<TimelyLogoProps> = ({ 
  size = 'md', 
  variant = 'full',
  animated = true 
}) => {
  const sizeClasses = {
    sm: {
      container: 'h-6',
      text: 'text-lg',
      icon: 16
    },
    md: {
      container: 'h-8',
      text: 'text-xl',
      icon: 20
    },
    lg: {
      container: 'h-10',
      text: 'text-2xl',
      icon: 24
    },
    xl: {
      container: 'h-12',
      text: 'text-3xl',
      icon: 28
    }
  };

  const currentSize = sizeClasses[size];

  const LogoIcon = () => (
    <motion.div
      initial={animated ? { rotate: 0 } : {}}
      animate={animated ? { rotate: 360 } : {}}
      transition={animated ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
      className="relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20 blur-sm"></div>
      <div className="relative bg-gradient-to-r from-indigo-600 to-purple-700 rounded-full p-1 shadow-lg">
        <Clock size={currentSize.icon} className="text-white" />
      </div>
    </motion.div>
  );

  const LogoText = () => (
    <motion.div
      initial={animated ? { opacity: 0, x: -20 } : {}}
      animate={animated ? { opacity: 1, x: 0 } : {}}
      transition={animated ? { duration: 0.6, delay: 0.2 } : {}}
      className="relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent blur-sm opacity-30">
        Timely
      </div>
      <div className={`relative font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent ${currentSize.text}`}>
        Timely
      </div>
    </motion.div>
  );

  const CompactLogo = () => (
    <motion.div
      initial={animated ? { scale: 0.8 } : {}}
      animate={animated ? { scale: 1 } : {}}
      transition={animated ? { duration: 0.5 } : {}}
      className="relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg opacity-20 blur-sm"></div>
      <div className={`relative bg-gradient-to-r from-indigo-600 to-purple-700 rounded-lg px-2 py-1 shadow-lg ${currentSize.container} flex items-center justify-center`}>
        <span className="text-white font-bold text-sm">T</span>
      </div>
    </motion.div>
  );

  if (variant === 'icon') {
    return <LogoIcon />;
  }

  if (variant === 'compact') {
    return <CompactLogo />;
  }

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 10 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      transition={animated ? { duration: 0.5 } : {}}
      className={`flex items-center gap-2 ${currentSize.container}`}
    >
      <LogoIcon />
      <LogoText />
      <motion.div
        initial={animated ? { opacity: 0, scale: 0 } : {}}
        animate={animated ? { opacity: 1, scale: 1 } : {}}
        transition={animated ? { duration: 0.4, delay: 0.8 } : {}}
        className="text-indigo-500"
      >
        <Zap size={currentSize.icon * 0.7} />
      </motion.div>
    </motion.div>
  );
};

export default TimelyLogo;