import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';

// Import performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Import error boundary
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Performance monitoring setup
const sendToAnalytics = (metric: any) => {
  // In production, send to your analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example: Analytics.track('Web Vital', metric);
    console.log('Web Vital:', metric);
  }
};

// Register Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// Service Worker registration for PWA support
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered: ', registration);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, show update notification
              if (window.confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });
    } catch (error) {
      console.log('SW registration failed: ', error);
    }
  }
};

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // In production, send to error tracking service (e.g., Sentry)
  // Sentry.captureException(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // In production, send to error tracking service
  // Sentry.captureException(event.reason);
});

// Development tools
if (process.env.NODE_ENV === 'development') {
  // React DevTools profiler
  const startProfiling = () => {
    console.log('🚀 React profiling started');
  };
  
  const stopProfiling = () => {
    console.log('⏹️ React profiling stopped');
  };

  // Add to window for debugging
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    ...((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ || {}),
    onCommitFiberRoot: (id: any, root: any) => {
      // Custom profiling logic
    }
  };

  // Performance debugging
  console.log('🔧 Development mode - Performance monitoring enabled');
  
  // Hot reload indicator
  if (module.hot) {
    module.hot.accept();
  }
}

// Theme detection and persistence
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('timely-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.setAttribute('data-theme', theme);
};

// Initialize theme before React renders
initializeTheme();

// Accessibility improvements
const initializeA11y = () => {
  // Skip to main content link
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50';
  document.body.insertBefore(skipLink, document.body.firstChild);

  // Focus management for keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
  });
};

// Loading state management
const showInitialLoader = () => {
  const loader = document.createElement('div');
  loader.id = 'initial-loader';
  loader.innerHTML = `
    <div class="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600 font-medium">Loading Timely...</p>
      </div>
    </div>
  `;
  document.body.appendChild(loader);
};

const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 300ms ease-out';
    setTimeout(() => loader.remove(), 300);
  }
};

// App initialization
const initializeApp = async () => {
  try {
    // Show loading state
    showInitialLoader();
    
    // Initialize accessibility features
    initializeA11y();
    
    // Register service worker
    await registerServiceWorker();
    
    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // Create React root
    const root = ReactDOM.createRoot(rootElement);
    
    // Render app with error boundary
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );

    // Hide initial loader after React hydration
    setTimeout(hideInitialLoader, 100);
    
    // Performance logging
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Timely app initialized successfully');
      console.log('📊 Performance monitoring active');
      console.log('🎨 Theme system ready');
      console.log('♿ Accessibility features enabled');
    }

  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // Fallback error UI
    const errorContainer = document.getElementById('root');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gray-50">
          <div class="text-center p-8">
            <h1 class="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>
            <p class="text-gray-600 mb-6">
              We're sorry, but there was an error loading the application.
            </p>
            <button 
              onclick="window.location.reload()" 
              class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      `;
    }
  }
};

// Start the application
initializeApp();