// frontend/src/App.tsx
// CLEANED: Removed old admin routes and updated to use new structure
// CONSTRAINT: Using existing services without modification

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

// ============================================================================
// ADMIN PAGES - RESTRUCTURED FOR 4 CORE DEMANDS
// ============================================================================

// Overview Hub Dashboard
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));

// DEMAND 1: Demo User Creation
const AdminUserSeeding = lazy(() => import('@/pages/admin/UserSeeding'));

// DEMAND 2: Model Performance Evaluation  
const AdminModelPerformance = lazy(() => import('@/pages/admin/ModelPerformance'));

// DEMAND 3: Test Individual User Prediction
const AdminUserPrediction = lazy(() => import('@/pages/admin/UserPrediction'));

// DEMAND 4: Frontend Quality Overview
const AdminUserExperience = lazy(() => import('@/pages/admin/UserExperience'));

// Global loading component
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
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

// ============================================================================
// CLEANED ADMIN ROUTES - ONLY 4 CORE DEMANDS
// ============================================================================
const adminRoutes: RouteConfig[] = [
  // Overview Hub Dashboard
  { path: '/admin', element: AdminDashboard },
  
  // DEMAND 1: Demo User Creation
  { path: '/admin/user-seeding', element: AdminUserSeeding },
  
  // DEMAND 2: Model Performance Evaluation
  { path: '/admin/model-performance', element: AdminModelPerformance },
  
  // DEMAND 3: Test Individual User Prediction
  { path: '/admin/user-prediction', element: AdminUserPrediction },
  
  // DEMAND 4: Frontend Quality Overview
  { path: '/admin/user-experience', element: AdminUserExperience },
];

const App: React.FC = () => {
  const { checkAuth, isLoading: authLoading } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<MainLayout />}>
                {publicRoutes.map(({ path, element: Component }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}
              </Route>

              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected user routes */}
              <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                {protectedRoutes.map(({ path, element: Component }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}
              </Route>

              {/* Admin routes - CLEANED */}
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                {adminRoutes.map(({ path, element: Component }) => (
                  <Route 
                    key={path} 
                    path={path === '/admin' ? '' : path.replace('/admin', '')} 
                    element={<Component />} 
                  />
                ))}
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>

          {/* Global toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: theme === 'dark' ? '#374151' : '#fff',
                color: theme === 'dark' ? '#fff' : '#000',
              },
            }}
          />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;