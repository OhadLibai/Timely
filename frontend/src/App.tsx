// frontend/src/App.tsx
// STREAMLINED: Complete routing focused on 4 core ML demo demands
// REMOVED: Unnecessary admin CRUD pages, settings, etc.

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

// Layout components
import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';
import AdminLayout from '@/layouts/AdminLayout';

// Auth components
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';

// Loading component
import LoadingSpinner from '@/components/common/LoadingSpinner';

// ============================================================================
// LAZY LOADED PAGES - Optimized for demo requirements
// ============================================================================

// Customer-facing pages (Demand 4: Good UX)
const Home = lazy(() => import('@/pages/Home'));
const Products = lazy(() => import('@/pages/Products'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Orders = lazy(() => import('@/pages/Orders'));
const OrderDetail = lazy(() => import('@/pages/OrderDetail'));
const Profile = lazy(() => import('@/pages/Profile'));
const Favorites = lazy(() => import('@/pages/Favorites'));
const PredictedBasket = lazy(() => import('@/pages/PredictedBasket'));

// Auth pages
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));

// Admin pages - ONLY the 4 core demo demands
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const UserSeeding = lazy(() => import('@/pages/admin/UserSeeding'));
const AdminMetrics = lazy(() => import('@/pages/admin/Metrics'));
const DemoPredictionPage = lazy(() => import('@/pages/admin/DemoPredictionPage'));

// ============================================================================
// REACT QUERY CONFIGURATION
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <AnimatePresence mode="wait">
            <Suspense fallback={<LoadingSpinner fullScreen />}>
              <Routes>
                {/* ================================================================ */}
                {/* PUBLIC ROUTES - Customer Experience (Demand 4) */}
                {/* ================================================================ */}
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Home />} />
                  <Route path="products" element={<Products />} />
                  <Route path="products/:id" element={<ProductDetail />} />
                </Route>

                {/* ================================================================ */}
                {/* AUTH ROUTES */}
                {/* ================================================================ */}
                <Route path="/auth" element={<AuthLayout />}>
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                </Route>

                {/* ================================================================ */}
                {/* PROTECTED USER ROUTES - Customer Experience (Demand 4) */}
                {/* ================================================================ */}
                <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route path="cart" element={<Cart />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="orders/:id" element={<OrderDetail />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="favorites" element={<Favorites />} />
                  <Route path="predicted-basket" element={<PredictedBasket />} />
                </Route>

                {/* ================================================================ */}
                {/* ADMIN ROUTES - 4 Core ML Demo Demands Only */}
                {/* ================================================================ */}
                <Route 
                  path="/admin" 
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  {/* Demo Overview */}
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />

                  {/* DEMAND 1: User Seeding */}
                  <Route path="user-seeding" element={<UserSeeding />} />

                  {/* DEMAND 2: Model Performance Stats */}
                  <Route path="metrics" element={<AdminMetrics />} />

                  {/* DEMAND 3: Individual User Prediction Performance */}
                  <Route path="demo-prediction" element={<DemoPredictionPage />} />

                  {/* Legacy route redirects */}
                  <Route path="evaluation" element={<Navigate to="/admin/metrics" replace />} />
                  <Route path="model-performance" element={<Navigate to="/admin/metrics" replace />} />
                </Route>

                {/* ================================================================ */}
                {/* FALLBACK ROUTES */}
                {/* ================================================================ */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AnimatePresence>

          {/* Global Components */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />

          {/* React Query DevTools - Development Only */}
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </div>
      </Router>
    </QueryClientProvider>
  );
};

export default App;