import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { animationPresets, createAnimation } from '@/utils/animations';

interface AnimatedContainerProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit' | 'transition'> {
  preset?: keyof typeof animationPresets;
  delay?: number;
  duration?: number;
  disabled?: boolean;
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  customAnimation?: {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
  };
}

export const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  preset = 'fadeInUp',
  delay = 0,
  duration,
  disabled = false,
  children,
  as = 'div',
  customAnimation,
  ...props
}) => {
  // If animations are disabled, render as regular div
  if (disabled) {
    const Component = as as any;
    return <Component {...props}>{children}</Component>;
  }

  // Use custom animation if provided, otherwise use preset
  const animation = customAnimation || animationPresets[preset];
  
  // Apply custom timing if provided
  const customTransition = duration || delay ? {
    ...(duration && { duration }),
    ...(delay && { delay })
  } : undefined;

  const finalAnimation = customTransition 
    ? createAnimation(preset, customTransition)
    : animation;

  const MotionComponent = motion[as as keyof typeof motion] as any;

  return (
    <MotionComponent
      {...finalAnimation}
      {...props}
    >
      {children}
    </MotionComponent>
  );
};