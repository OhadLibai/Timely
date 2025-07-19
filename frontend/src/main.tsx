// frontend/src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';

// Import error boundary for app-level error handling
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Import React Query for data fetching
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// ============================================================================
// PARCEL TYPE DECLARATIONS
// ============================================================================

declare const module: {
  hot?: {
    accept(): void;
  };
};

declare const process: {
  env: {
    NODE_ENV: string;
    [key: string]: string | undefined;
  };
};

// React JSX runtime declaration for Parcel
declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

// ============================================================================
// GLOBAL ERROR HANDLING
// ============================================================================

// Global error event handler
window.addEventListener('error', (event) => {
  console.error('💥 Global error caught:', {
    message: event.error?.message,
    stack: event.error?.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
  
  // In development, show more details
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.error('Full error event:', event);
  }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise
  });
  
  // In development, show more details
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.error('Full rejection event:', event);
  }
});

// ============================================================================
// QUERY CLIENT CONFIGURATION
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 *1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 errors (auth issues)
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      onError: (error: any) => {
        console.error('Query error:', error);
        // Could add global error toast here if needed
      }
    },
    mutations: {
      retry: 1,
      onError: (error: any) => {
        console.error('Mutation error:', error);
      }
    }
  }
});

// ============================================================================
// DEVELOPMENT TOOLS
// ============================================================================

const initializeDevelopmentTools = () => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'development') return;

  console.log("==========================================");
  console.log("🚀 Starting React frontend app...");
  console.log("==========================================");
  console.log('🔧 Timely Development Mode Initialized');
  console.log('📁 Instacart Dataset: Ready for testing');
  console.log('🎯 Environment: Development/Testing Stage');
  console.log('⚡ Build Tool: Parcel (Hot Module Replacement Active)');

  // Add debugging helpers to window object
  (window as any).__TIMELY_DEBUG__ = {
    queryClient,
    env: typeof process !== 'undefined' ? process.env : {},
    version: '1.0.0-dev',
    stage: 'development-testing',
    buildTool: 'parcel'
  };

  // Performance monitoring
  if ('performance' in window && 'measure' in performance) {
    // Mark app start
    performance.mark('timely-app-start');
    
    // Monitor for performance issues
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          console.log(`⚡ Performance: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
        }
      }
    });
    
    observer.observe({ entryTypes: ['measure'] });
  }
};

// ============================================================================
// ACCESSIBILITY ENHANCEMENTS
// ============================================================================

const initializeAccessibility = () => {
  // Skip to main content link for keyboard navigation
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50 rounded-br transition-all';
  skipLink.setAttribute('data-testid', 'skip-to-main');
  document.body.insertBefore(skipLink, document.body.firstChild);

  // Keyboard navigation indicator
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
  });

  // Focus management for better UX
  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement;
    if (target.getAttribute('data-focus-visible') === 'true') {
      target.classList.add('focus-visible');
    }
  });

  document.addEventListener('focusout', (e) => {
    const target = e.target as HTMLElement;
    target.classList.remove('focus-visible');
  });
};

// ============================================================================
// LOADING STATE MANAGEMENT
// ============================================================================

const initializationLoader = {
  show: () => {
    const loader = document.createElement('div');
    loader.id = 'timely-initialization-loader';
    loader.innerHTML = `
      <div class="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div class="text-center">
          <div class="relative">
            <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <div class="absolute inset-0 rounded-full h-16 w-16 border-r-4 border-blue-200 mx-auto animate-pulse"></div>
          </div>
          <h1 class="text-2xl font-bold text-gray-800 mb-2">Timely</h1>
          <p class="text-gray-600 font-medium">Initializing ML-Powered Grocery Assistant...</p>
          <div class="mt-4 text-sm text-gray-500">
            <div class="flex items-center justify-center space-x-2">
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(loader);
  },

  hide: () => {
    const loader = document.getElementById('timely-initialization-loader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.transition = 'opacity 400ms ease-out';
      setTimeout(() => {
        loader.remove();
        // Mark initialization complete for performance monitoring
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && 'performance' in window) {
          performance.mark('timely-app-ready');
          performance.measure('timely-initialization', 'timely-app-start', 'timely-app-ready');
        }
      }, 400);
    }
  }
};

// ============================================================================
// APP INITIALIZATION
// ============================================================================

const initializeTimely = async (): Promise<void> => {
  try {
    // Show loading state
    initializationLoader.show();
    
    // Initialize development tools
    initializeDevelopmentTools();
    
    // Initialize accessibility features
    initializeAccessibility();
    
    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found - check your HTML template');
    }

    // Create React root
    const root = ReactDOM.createRoot(rootElement);
    
    // Add main content ID for accessibility
    rootElement.setAttribute('id', 'main-content');
    
    // Render the app with all providers
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <App />
            {/* Show React Query devtools in development */}
            {typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && (
              <ReactQueryDevtools 
                initialIsOpen={false} 
                position="bottom-right"
              />
            )}
          </QueryClientProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );

    // Hide loading state after a short delay to ensure smooth transition
    setTimeout(() => {
      initializationLoader.hide();
    }, 1000);

    console.log('✅ Timely app initialized successfully');
    
  } catch (error) {
    console.error('💥 Failed to initialize Timely app:', error);
    
    // Hide loader and show error
    initializationLoader.hide();
    
    // Show basic error message
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-red-50">
        <div class="text-center p-8">
          <div class="text-red-500 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-800 mb-2">Initialization Error</h1>
          <p class="text-gray-600 mb-4">Failed to start the Timely application.</p>
          <button 
            onclick="window.location.reload()" 
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Reload Application
          </button>
          ${typeof process !== 'undefined' && process.env.NODE_ENV === 'development' ? `
            <details class="mt-4 text-left">
              <summary class="cursor-pointer text-sm text-gray-500">Development Error Details</summary>
              <pre class="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">${error}</pre>
            </details>
          ` : ''}
        </div>
      </div>
    `;
  }
};

// ============================================================================
// START THE APPLICATION
// ============================================================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTimely);
} else {
  initializeTimely();
}