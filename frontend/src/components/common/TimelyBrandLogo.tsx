import React from 'react';
import { Clock, Zap, ShoppingCart, Star, Sparkles, Timer } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimelyBrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  variant?: 'full' | 'compact' | 'icon' | 'signature' | 'hero';
  animated?: boolean;
  glowing?: boolean;
}

const TimelyBrandLogo: React.FC<TimelyBrandLogoProps> = ({ 
  size = 'md', 
  variant = 'full',
  animated = true,
  glowing = false
}) => {
  const sizeConfig = {
    sm: { container: 'h-6', text: 'text-lg', icon: 16, spacing: 'gap-1' },
    md: { container: 'h-8', text: 'text-xl', icon: 20, spacing: 'gap-2' },
    lg: { container: 'h-10', text: 'text-2xl', icon: 24, spacing: 'gap-2' },
    xl: { container: 'h-12', text: 'text-3xl', icon: 28, spacing: 'gap-3' },
    hero: { container: 'h-20', text: 'text-5xl', icon: 36, spacing: 'gap-4' }
  };

  const config = sizeConfig[size];

  // Signature Hero Logo
  const SignatureLogo = () => (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.8 } : {}}
      animate={animated ? { opacity: 1, scale: 1 } : {}}
      transition={animated ? { duration: 0.8, ease: "easeOut" } : {}}
      className="relative group cursor-pointer"
    >
      {/* Outer glow ring */}
      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-xl opacity-20 animate-pulse group-hover:opacity-40 transition-all duration-500"></div>
      
      {/* Main logo container */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-full p-6 shadow-2xl border border-indigo-400/30">
        {/* Inner glow */}
        <div className="absolute inset-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-sm"></div>
        
        {/* Content */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={animated ? { rotate: 360 } : {}}
            transition={animated ? { duration: 8, repeat: Infinity, ease: "linear" } : {}}
            className="relative"
          >
            <Clock size={config.icon} className="text-white drop-shadow-lg" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-ping"></div>
          </motion.div>
        </div>
        
        {/* Floating particles */}
        <motion.div
          animate={animated ? { rotate: [0, 360] } : {}}
          transition={animated ? { duration: 20, repeat: Infinity, ease: "linear" } : {}}
          className="absolute inset-0"
        >
          <Sparkles size={12} className="absolute top-2 right-2 text-yellow-400 opacity-70" />
          <Star size={8} className="absolute bottom-3 left-3 text-purple-400 opacity-60" />
          <Zap size={10} className="absolute top-4 left-4 text-indigo-400 opacity-50" />
        </motion.div>
      </div>
    </motion.div>
  );

  // Hero variant with full branding
  const HeroLogo = () => (
    <motion.div
      initial={animated ? { opacity: 0, y: 30 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      transition={animated ? { duration: 1 } : {}}
      className={`flex items-center ${config.spacing} group`}
    >
      <SignatureLogo />
      
      {/* Brand text with effects */}
      <div className="relative">
        {/* Text shadow/glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent blur-sm opacity-50">
          Timely
        </div>
        
        {/* Main text */}
        <motion.div
          initial={animated ? { opacity: 0, x: -20 } : {}}
          animate={animated ? { opacity: 1, x: 0 } : {}}
          transition={animated ? { duration: 0.8, delay: 0.3 } : {}}
          className={`relative font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent ${config.text} tracking-tight leading-tight`}
        >
          Timely
        </motion.div>
        
        {/* Subtitle */}
        <motion.div
          initial={animated ? { opacity: 0 } : {}}
          animate={animated ? { opacity: 1 } : {}}
          transition={animated ? { duration: 0.6, delay: 0.8 } : {}}
          className="text-xs font-semibold text-gray-600 tracking-widest uppercase mt-2"
        >
          Next Gen Shopping
        </motion.div>
      </div>
      
      {/* Accent elements */}
      <motion.div
        initial={animated ? { opacity: 0, scale: 0 } : {}}
        animate={animated ? { opacity: 1, scale: 1 } : {}}
        transition={animated ? { duration: 0.5, delay: 1 } : {}}
        className="flex items-center gap-1"
      >
        <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
        <Timer size={config.icon * 0.6} className="text-indigo-500" />
        <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
      </motion.div>
    </motion.div>
  );

  // Standard variants
  const StandardLogo = () => (
    <motion.div
      initial={animated ? { opacity: 0, y: 10 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      transition={animated ? { duration: 0.5 } : {}}
      className={`flex items-center ${config.spacing} ${config.container}`}
    >
      {/* Icon */}
      <motion.div
        initial={animated ? { rotate: 0 } : {}}
        animate={animated ? { rotate: 360 } : {}}
        transition={animated ? { duration: 3, repeat: Infinity, ease: "linear" } : {}}
        className="relative"
      >
        <div className={`absolute inset-0 ${glowing ? 'bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-30 blur-sm' : ''}`}></div>
        <div className="relative bg-gradient-to-r from-indigo-600 to-purple-700 rounded-full p-1 shadow-lg">
          <Clock size={config.icon} className="text-white" />
        </div>
      </motion.div>
      
      {/* Text */}
      {variant !== 'icon' && (
        <motion.div
          initial={animated ? { opacity: 0, x: -10 } : {}}
          animate={animated ? { opacity: 1, x: 0 } : {}}
          transition={animated ? { duration: 0.6, delay: 0.2 } : {}}
          className="relative"
        >
          <div className={`font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent ${config.text}`}>
            Timely
          </div>
        </motion.div>
      )}
      
      {/* Accent */}
      {variant === 'full' && (
        <motion.div
          initial={animated ? { opacity: 0, scale: 0 } : {}}
          animate={animated ? { opacity: 1, scale: 1 } : {}}
          transition={animated ? { duration: 0.4, delay: 0.5 } : {}}
          className="text-indigo-500"
        >
          <Zap size={config.icon * 0.7} />
        </motion.div>
      )}
    </motion.div>
  );

  // Return appropriate variant
  switch (variant) {
    case 'signature':
      return <SignatureLogo />;
    case 'hero':
      return <HeroLogo />;
    default:
      return <StandardLogo />;
  }
};

export default TimelyBrandLogo;