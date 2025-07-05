// frontend/tailwind.config.js
// CONSOLIDATED DESIGN SYSTEM - Single Source of Truth
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ============================================================================
      // UNIFIED COLOR SYSTEM - Consolidated from index.css + existing config
      // ============================================================================
      colors: {
        // Primary brand colors (consolidated from CSS variables)
        primary: {
          50: '#f0f9ff',   // --primary-50
          100: '#e0f2fe',  // --primary-100  
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',  // --primary-500
          600: '#0284c7',  // --primary-600
          700: '#0369a1',  // --primary-700
          800: '#075985',
          900: '#0c4a6e',  // --primary-900
        },
        
        // Secondary colors
        secondary: {
          50: '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#FF9800',
          600: '#fb8c00',
          700: '#f57c00',
          800: '#ef6c00',
          900: '#e65100',
        },
        
        // Semantic colors (consolidated from CSS variables)
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // --success
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',  // --warning
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',  // --error
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // --info
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      
      // ============================================================================
      // TYPOGRAPHY SYSTEM
      // ============================================================================
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'sans-serif'],
      },
      
      // ============================================================================
      // LAYOUT VARIABLES (from CSS custom properties)
      // ============================================================================
      spacing: {
        'header': '4rem',      // --header-height
        'sidebar': '16rem',    // --sidebar-width
      },
      
      borderRadius: {
        'default': '0.5rem',   // --border-radius
      },
      
      // ============================================================================
      // SHADOW SYSTEM (from CSS custom properties)
      // ============================================================================
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',     // --shadow-sm
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',   // --shadow-md  
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)', // --shadow-lg
        'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(99, 102, 241, 0.2)',
      },
      
      // ============================================================================
      // ANIMATION SYSTEM - Consolidated from both files
      // ============================================================================
      animation: {
        // From index.css
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        
        // From tailwind.config.js  
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      
      // ============================================================================
      // KEYFRAMES - Consolidated from both files
      // ============================================================================
      keyframes: {
        // From index.css
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        
        // From tailwind.config.js (existing)
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      
      // ============================================================================
      // BACKGROUND GRADIENTS
      // ============================================================================
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
      
      // ============================================================================
      // TRANSITION TIMING
      // ============================================================================
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-out': 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
        'fast': 'cubic-bezier(0.4, 0, 0.2, 1)',     // --transition-fast equivalent
        'normal': 'cubic-bezier(0.4, 0, 0.2, 1)',   // --transition-normal equivalent  
        'slow': 'cubic-bezier(0.4, 0, 0.2, 1)',     // --transition-slow equivalent
      },
      
      transitionDuration: {
        'fast': '150ms',      // --transition-fast
        'normal': '250ms',    // --transition-normal
        'slow': '350ms',      // --transition-slow
      },
    },
  },
  
  // ============================================================================
  // TAILWIND PLUGINS
  // ============================================================================
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/container-queries'),
  ],
}

// ============================================================================
// DESIGN SYSTEM CONSOLIDATION COMPLETE
// 
// ✅ All colors consolidated from CSS variables
// ✅ All animations moved from @keyframes in CSS  
// ✅ Layout variables converted to Tailwind spacing
// ✅ Shadow system unified
// ✅ Typography system centralized
// ✅ Single source of truth for all design tokens
// 
// USAGE:
// - Use bg-primary-500 instead of var(--primary-500)
// - Use animate-fade-in instead of custom CSS animation
// - Use shadow-glow instead of custom CSS shadow
// - All design tokens now available as Tailwind utilities
// ============================================================================