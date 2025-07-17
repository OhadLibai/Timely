// frontend/src/App.tsx
// CLEANED: Removed old admin routes and updated to use new structure
// CONSTRAINT: Using existing services without modification

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Import stores
import { useAuthStore } from '@/stores/auth.store';

// Import layouts and route guards
import MainLayout from '@/layouts/MainLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';

// Import common components
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ScrollToTop from '@/components/common/ScrollToTop';

// Lazy load pages for better performance
// Public pages
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Products = lazy(() => import('@/pages/Products'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
// Protected user pages
const Profile = lazy(() => import('@/pages/Profile'));
const Orders = lazy(() => import('@/pages/Orders'));
const OrderDetail = lazy(() => import('@/pages/OrderDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Favorites = lazy(() => import('@/pages/Favorites'));
const PredictedBasket = lazy(() => import('@/pages/PredictedBasket'));

// Overview Hub
const AdminHub = lazy(() => import('@/pages/admin/Hub'));

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
  element: React.LazyExoticComponent<React.ComponentType<any>>;
}

const publicRoutes: RouteConfig[] = [
  { path: '/', element: Home },
  { path: '/products', element: Products },
  { path: '/products/:id', element: ProductDetail },
];

const protectedRoutes: RouteConfig[] = [
  { path: '/profile', element: Profile },
  { path: '/orders', element: Orders },
  { path: '/orders/:id', element: OrderDetail },
  { path: '/cart', element: Cart },
  { path: '/checkout', element: Checkout },
  { path: '/favorites', element: Favorites },
  { path: '/predicted-basket', element: PredictedBasket },
];

const adminRoutes: RouteConfig[] = [
  // Overview Hub - default route
  { path: '', element: AdminHub },
  
  // DEMAND 1: Demo User Creation
  { path: 'user-seeding', element: AdminUserSeeding },
  
  // DEMAND 2: Model Performance Evaluation
  { path: 'model-performance', element: AdminModelPerformance },
  
  // DEMAND 3: Test Individual User Prediction
  { path: 'user-prediction', element: AdminUserPrediction },
  
  // DEMAND 4: Frontend Quality Overview
  { path: 'user-experience', element: AdminUserExperience },
];

const App: React.FC = () => {
  const { isLoading: authLoading } = useAuthStore();

  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen bg-gray-50">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Public routes */}
              <Route path="/" element={<MainLayout />}>
                {publicRoutes.map(({ path, element: Component }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}

                {/* Protected user routes within MainLayout */}
                <Route element={<ProtectedRoute />}>
                  {protectedRoutes.map(({ path, element: Component }) => (
                    <Route key={path} path={path} element={<Component />} />
                  ))}
                </Route>
              </Route>

              {/* Admin routes - CLEANED */}
              <Route path="/admin" element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  {adminRoutes.map(({ path, element: Component }) => (
                    <Route 
                      key={path} 
                      path={path} 
                      element={<Component />} 
                    />
                  ))}
                  {/* Index route for /admin */}
                  <Route index element={<AdminHub />} />
                </Route>
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<div>404 - Page Not Found</div>} />
            </Routes>
          </Suspense>

          {/* Global toast notifications */}
          <Toaster
            position="top-left"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#000',
              },
            }}
          />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;