import React, { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { StoreLayout } from './components/layout/StoreLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminRoute, GuestOnlyRoute, ProtectedRoute } from './components/common/RouteGuards';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const Home = lazy(() => import('./pages/Home'));
const ProductListing = lazy(() => import('./pages/ProductListing'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Search = lazy(() => import('./pages/Search'));
const Cart = lazy(() => import('./pages/Cart'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const InfoPage = lazy(() => import('./pages/InfoPage'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminBusinesses = lazy(() => import('./pages/admin/AdminBusinesses'));
const AdminDataQuality = lazy(() => import('./pages/admin/AdminDataQuality'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminOrderDetail = lazy(() => import('./pages/admin/AdminOrderDetail'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function StorePage({ children }: { children: React.ReactNode }) {
  return <StoreLayout>{children}</StoreLayout>;
}

function AdminPage({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <AdminLayout>{children}</AdminLayout>
    </AdminRoute>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ErrorBoundary>
                <Suspense fallback={<LoadingSpinner label="Loading Zyro Mall..." />}>
                  <Routes>
                  {/* Public Storefront Routes */}
                  <Route
                    path="/"
                    element={
                      <StorePage>
                        <Home />
                      </StorePage>
                    }
                  />
                  <Route
                    path="/products"
                    element={
                      <StorePage>
                        <ProductListing />
                      </StorePage>
                    }
                  />
                  <Route
                    path="/products/:slug"
                    element={
                      <StorePage>
                        <ProductDetail />
                      </StorePage>
                    }
                  />
                  <Route
                    path="/search"
                    element={
                      <StorePage>
                        <Search />
                      </StorePage>
                    }
                  />

                  {/* Guest-Only Auth Routes */}
                  <Route
                    path="/login"
                    element={
                      <StorePage>
                        <GuestOnlyRoute>
                          <Login />
                        </GuestOnlyRoute>
                      </StorePage>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <StorePage>
                        <GuestOnlyRoute>
                          <Register />
                        </GuestOnlyRoute>
                      </StorePage>
                    }
                  />
                  <Route
                    path="/forgot-password"
                    element={
                      <StorePage>
                        <GuestOnlyRoute>
                          <ForgotPassword />
                        </GuestOnlyRoute>
                      </StorePage>
                    }
                  />
                  <Route
                    path="/reset-password"
                    element={
                      <StorePage>
                        <ResetPassword />
                      </StorePage>
                    }
                  />
                  <Route
                    path="/about"
                    element={
                      <StorePage>
                        <InfoPage topic="about" />
                      </StorePage>
                    }
                  />
                  <Route
                    path="/contact"
                    element={
                      <StorePage>
                        <InfoPage topic="contact" />
                      </StorePage>
                    }
                  />
                  <Route
                    path="/privacy"
                    element={
                      <StorePage>
                        <InfoPage topic="privacy" />
                      </StorePage>
                    }
                  />
                  <Route
                    path="/terms"
                    element={
                      <StorePage>
                        <InfoPage topic="terms" />
                      </StorePage>
                    }
                  />

                  {/* Protected Customer Routes */}
                  <Route
                    path="/cart"
                    element={
                      <StorePage>
                        <ProtectedRoute>
                          <Cart />
                        </ProtectedRoute>
                      </StorePage>
                    }
                  />
                  <Route
                    path="/wishlist"
                    element={
                      <StorePage>
                        <ProtectedRoute>
                          <Wishlist />
                        </ProtectedRoute>
                      </StorePage>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <StorePage>
                        <ProtectedRoute>
                          <Checkout />
                        </ProtectedRoute>
                      </StorePage>
                    }
                  />
                  <Route
                    path="/order-confirmation/:orderId"
                    element={
                      <StorePage>
                        <ProtectedRoute>
                          <OrderConfirmation />
                        </ProtectedRoute>
                      </StorePage>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <StorePage>
                        <ProtectedRoute>
                          <OrderHistory />
                        </ProtectedRoute>
                      </StorePage>
                    }
                  />
                  <Route
                    path="/orders/:orderId"
                    element={
                      <StorePage>
                        <ProtectedRoute>
                          <OrderDetail />
                        </ProtectedRoute>
                      </StorePage>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <StorePage>
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      </StorePage>
                    }
                  />

                  {/* Admin Dashboard Routes */}
                  <Route
                    path="/admin"
                    element={
                      <AdminPage>
                        <AdminDashboard />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/products"
                    element={
                      <AdminPage>
                        <AdminProducts />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/products/new"
                    element={
                      <AdminPage>
                        <AdminProductForm />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/products/:id/edit"
                    element={
                      <AdminPage>
                        <AdminProductForm />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/categories"
                    element={
                      <AdminPage>
                        <AdminCategories />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/businesses"
                    element={
                      <AdminPage>
                        <AdminBusinesses />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/data-quality"
                    element={
                      <AdminPage>
                        <AdminDataQuality />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/orders"
                    element={
                      <AdminPage>
                        <AdminOrders />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/orders/:id"
                    element={
                      <AdminPage>
                        <AdminOrderDetail />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/customers"
                    element={
                      <AdminPage>
                        <AdminCustomers />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/coupons"
                    element={
                      <AdminPage>
                        <AdminCoupons />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/reviews"
                    element={
                      <AdminPage>
                        <AdminReviews />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/banners"
                    element={
                      <AdminPage>
                        <AdminBanners />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <AdminPage>
                        <AdminReports />
                      </AdminPage>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <AdminPage>
                        <AdminSettings />
                      </AdminPage>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
              </ErrorBoundary>
              <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
