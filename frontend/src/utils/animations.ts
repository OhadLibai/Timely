// Common animation presets for Framer Motion

export const animationPresets = {
  // Fade in from bottom
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.5 }
  },

  // Fade in from top
  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.5 }
  },

  // Slide in from right
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3 }
  },

  // Slide in from left
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3 }
  },

  // Simple fade
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },

  // Scale in
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.3 }
  },

  // Stagger children animation
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  },

  // Spring animation
  spring: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30 
    }
  },

  // Bounce in
  bounceIn: {
    initial: { opacity: 0, scale: 0.3 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.3 },
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 25 
    }
  }
};

// Timing presets
export const timingPresets = {
  fast: { duration: 0.2 },
  normal: { duration: 0.3 },
  slow: { duration: 0.5 },
  verySlow: { duration: 0.8 }
};

// Easing presets
export const easingPresets = {
  easeOut: [0.25, 0.46, 0.45, 0.94],
  easeIn: [0.55, 0.055, 0.675, 0.19],
  easeInOut: [0.645, 0.045, 0.355, 1],
  bounce: [0.68, -0.55, 0.265, 1.55]
};

// Utility to create custom animation with presets
export const createAnimation = (
  preset: keyof typeof animationPresets,
  customTransition?: any
) => {
  const baseAnimation = animationPresets[preset];
  
  if (customTransition) {
    return {
      ...baseAnimation,
      transition: { ...baseAnimation.transition, ...customTransition }
    };
  }
  
  return baseAnimation;
};