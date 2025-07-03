// frontend/src/App.tsx
import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

// Import stores
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';

// Import layouts and route guards
import MainLayout from '@/layouts/MainLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';

// Import common components
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Lazy load pages for better performance
// Public pages
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Products = lazy(() => import('@/pages/Products'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Protected user pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Profile = lazy(() => import('@/pages/Profile'));
const Orders = lazy(() => import('@/pages/Orders'));
const OrderDetail = lazy(() => import('@/pages/OrderDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Favorites = lazy(() => import('@/pages/Favorites'));
const PredictedBasket = lazy(() => import('@/pages/PredictedBasket'));
const OrderSuccess = lazy(() => import('@/pages/OrderSuccess'));

// Admin pages - Supporting all 4 demands
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminDemoUsers = lazy(() => import('@/pages/admin/DemoUsers'));
const AdminModelPerformance = lazy(() => import('@/pages/admin/ModelPerformance'));
const AdminUserPredictions = lazy(() => import('@/pages/admin/UserPredictions'));
const AdminProducts = lazy(() => import('@/pages/admin/Products'));
const AdminOrders = lazy(() => import('@/pages/admin/Orders'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const AdminMLService = lazy(() => import('@/pages/admin/MLService'));

// Global loading component
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <LoadingSpinner size="large" />
  </div>
);

// Route configuration
interface RouteConfig {
  path: string;
  element: React.LazyExoticComponent<React.FC>;
}

const publicRoutes: RouteConfig[] = [
  { path: '/', element: Home },
  { path: '/products', element: Products },
  { path: '/products/:id', element: ProductDetail },
  { path: '/about', element: About },
  { path: '/contact', element: Contact },
];

const protectedRoutes: RouteConfig[] = [
  { path: '/dashboard', element: Dashboard },
  { path: '/profile', element: Profile },
  { path: '/orders', element: Orders },
  { path: '/orders/:id', element: OrderDetail },
  { path: '/cart', element: Cart },
  { path: '/checkout', element: Checkout },
  { path: '/favorites', element: Favorites },
  { path: '/predicted-basket', element: PredictedBasket },
  { path: '/order-success', element: OrderSuccess },
];

const adminRoutes: RouteConfig[] = [
  { path: '/admin', element: AdminDashboard },
  { path: '/admin/demo-users', element: AdminDemoUsers }, // Demand 1
  { path: '/admin/model-performance', element: AdminModelPerformance }, // Demand 2
  { path: '/admin/user-predictions', element: AdminUserPredictions }, // Demand 3
  { path: '/admin/products', element: AdminProducts },
  { path: '/admin/orders', element: AdminOrders },
  { path: '/admin/users', element: AdminUsers },
  { path: '/admin/ml-service', element: AdminMLService },
  { path: '/admin/settings', element: AdminSettings },
];

const App: React.FC = () => {
  const { checkAuth, isLoading: authLoading } = useAuthStore();
  const { initializeTheme } = useThemeStore();

  // Initialize app on mount
  useEffect(() => {
    // Initialize theme
    initializeTheme();
    
    // Check authentication status
    checkAuth();
    
    // Set up global error handler for uncaught promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [checkAuth, initializeTheme]);

  // Show loading screen while checking auth
  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route element={<MainLayout />}>
                {publicRoutes.map(({ path, element: Element }) => (
                  <Route key={path} path={path} element={<Element />} />
                ))}
                
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Protected User Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  {protectedRoutes.map(({ path, element: Element }) => (
                    <Route key={path} path={path} element={<Element />} />
                  ))}
                </Route>
              </Route>

              {/* Admin Routes - Protected by AdminRoute */}
              <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  {adminRoutes.map(({ path, element: Element }) => (
                    <Route key={path} path={path} element={<Element />} />
                  ))}
                </Route>
              </Route>

              {/* Fallback Routes */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
        </AnimatePresence>

        {/* Global Toast Notifications */}
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          containerClassName="toast-container"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
            },
            success: {
              style: {
                background: '#10b981',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
              },
            },
            loading: {
              style: {
                background: '#6366f1',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#6366f1',
              },
            },
          }}
        />

        {/* Global ML Prediction Status Indicator */}
        <MLStatusIndicator />
        
        {/* Development Tools */}
        {process.env.NODE_ENV === 'development' && <DevTools />}
      </BrowserRouter>
    </ErrorBoundary>
  );
};

// ML Status Indicator Component
const MLStatusIndicator: React.FC = () => {
  const [mlStatus, setMlStatus] = React.useState<'connected' | 'disconnected' | 'loading'>('loading');
  
  useEffect(() => {
    // Check ML service status periodically
    const checkMLStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/ml-service/status`);
        setMlStatus(response.ok ? 'connected' : 'disconnected');
      } catch {
        setMlStatus('disconnected');
      }
    };
    
    checkMLStatus();
    const interval = setInterval(checkMLStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  if (mlStatus === 'loading') return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg ${
        mlStatus === 'connected' 
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          mlStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
        } animate-pulse`} />
        <span className="text-xs font-medium">
          ML Service: {mlStatus === 'connected' ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  );
};

// Development Tools Component
const DevTools: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user } = useAuthStore();
  
  return (
    <>
      {/* Dev Tools Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-50 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        title="Toggle Dev Tools"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      
      {/* Dev Tools Panel */}
      {isOpen && (
        <div className="fixed bottom-20 left-4 z-50 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🛠️</span> Dev Tools
          </h3>
          
          {/* Current User Info */}
          <div className="space-y-2 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              <strong>User:</strong> {user?.email || 'Not logged in'}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Role:</strong> {user?.role || 'guest'}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>ID:</strong> {user?.id || 'N/A'}
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/api/docs'}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              API Documentation
            </button>
            <button
              onClick={() => localStorage.clear()}
              className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            >
              Clear Local Storage
            </button>
          </div>
          
          {/* Environment Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
            <p>Environment: {import.meta.env.MODE}</p>
            <p>API: {import.meta.env.VITE_API_URL}</p>
            <p>ML Service: {import.meta.env.VITE_ML_SERVICE_URL}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default App;