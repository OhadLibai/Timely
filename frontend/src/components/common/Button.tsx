import React from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost: 'hover:bg-gray-100 text-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-gray-500'
  };

  const widthClass = fullWidth ? 'w-full' : '';
  
  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`;

  const renderIcon = () => {
    if (loading) {
      return <Loader2 className="w-5 h-5 animate-spin" />;
    }
    if (Icon) {
      return <Icon className="w-5 h-5" />;
    }
    return null;
  };

  const iconElement = renderIcon();
  const hasIcon = iconElement !== null;
  const hasChildren = React.Children.count(children) > 0;

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {hasIcon && iconPosition === 'left' && (
        <span className={hasChildren ? 'mr-2' : ''}>
          {iconElement}
        </span>
      )}
      
      {children}
      
      {hasIcon && iconPosition === 'right' && (
        <span className={hasChildren ? 'ml-2' : ''}>
          {iconElement}
        </span>
      )}
    </button>
  );
};