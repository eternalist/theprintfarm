// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Context
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';

// Components
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterCustomerPage from './pages/auth/RegisterCustomerPage';
import RegisterMakerPage from './pages/auth/RegisterMakerPage';
import DashboardPage from './pages/DashboardPage';
import ModelDetailPage from './pages/ModelDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import MakersPage from './pages/MakersPage';
import MessagesPage from './pages/MessagesPage';
import MakerDashboardPage from './pages/maker/MakerDashboardPage';
import MakerMessagesPage from './pages/maker/MakerMessagesPage';
import MakerProfilePage from './pages/maker/MakerProfilePage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminQueuesPage from './pages/admin/AdminQueuesPage';
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route component
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public route component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    // Redirect based on role
    const dashboardPath = user.role === 'MAKER' ? '/maker/dashboard' : '/dashboard';
    return <Navigate to={dashboardPath} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/signup/customer" element={
        <PublicRoute>
          <RegisterCustomerPage />
        </PublicRoute>
      } />
      <Route path="/signup/maker" element={
        <PublicRoute>
          <RegisterMakerPage />
        </PublicRoute>
      } />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Default redirect */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Customer routes */}
        <Route path="dashboard" element={
          <ProtectedRoute roles={['CUSTOMER', 'ADMIN']}>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="models/:id" element={
          <ProtectedRoute>
            <ModelDetailPage />
          </ProtectedRoute>
        } />
        <Route path="favorites" element={
          <ProtectedRoute roles={['CUSTOMER']}>
            <FavoritesPage />
          </ProtectedRoute>
        } />
        <Route path="makers" element={
          <ProtectedRoute roles={['CUSTOMER']}>
            <MakersPage />
          </ProtectedRoute>
        } />
        <Route path="messages" element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        } />

        {/* Maker routes */}
        <Route path="maker/dashboard" element={
          <ProtectedRoute roles={['MAKER']}>
            <MakerDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="maker/messages" element={
          <ProtectedRoute roles={['MAKER']}>
            <MakerMessagesPage />
          </ProtectedRoute>
        } />
        <Route path="maker/profile" element={
          <ProtectedRoute roles={['MAKER']}>
            <MakerProfilePage />
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="admin/users" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminUsersPage />
          </ProtectedRoute>
        } />
        <Route path="admin/queues" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminQueuesPage />
          </ProtectedRoute>
        } />
        <Route path="admin/announcements" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminAnnouncementsPage />
          </ProtectedRoute>
        } />

        {/* Common routes */}
        <Route path="profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <AppRoutes />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#10b981',
                  },
                },
                error: {
                  style: {
                    background: '#ef4444',
                  },
                },
              }}
            />
          </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;