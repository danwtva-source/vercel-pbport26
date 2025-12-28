import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api as AuthService } from './services/firebase';
import { User, UserRole } from './types';

// Lazy load pages for better performance
import LandingPage from './pages/public/LandingPage';
import PostcodeCheckPage from './pages/public/PostcodeCheckPage';
import PrioritiesPage from './pages/public/PrioritiesPage';
import DocumentsPage from './pages/public/DocumentsPage';
import TimelinePage from './pages/public/TimelinePage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/secure/Dashboard';
import ScoringMatrix from './pages/secure/ScoringMatrix';
import ApplicationsList from './pages/secure/ApplicationsList';
import ApplicationForm from './pages/secure/ApplicationForm';
import AdminConsole from './pages/secure/AdminConsole';

// Route guard wrapper component
interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: UserRole | UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();

    if (!currentUser) {
      navigate('/login', { replace: true });
      setLoading(false);
      return;
    }

    // Check role authorization
    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

      // Admin can access everything
      if (currentUser.role === UserRole.ADMIN) {
        setUser(currentUser);
        setLoading(false);
        return;
      }

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(currentUser.role as UserRole)) {
        // Redirect to appropriate dashboard based on role
        switch (currentUser.role) {
          case UserRole.COMMITTEE:
            navigate('/portal/dashboard', { replace: true });
            break;
          case UserRole.APPLICANT:
            navigate('/portal/dashboard', { replace: true });
            break;
          default:
            navigate('/login', { replace: true });
        }
        setLoading(false);
        return;
      }
    }

    setUser(currentUser);
    setLoading(false);
  }, [requiredRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : null;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/vote" element={<PostcodeCheckPage />} />
        <Route path="/priorities" element={<PrioritiesPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes - All authenticated users */}
        <Route
          path="/portal/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/portal/applications"
          element={
            <ProtectedRoute>
              <ApplicationsList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/portal/application/:id"
          element={
            <ProtectedRoute>
              <ApplicationForm />
            </ProtectedRoute>
          }
        />

        {/* Committee & Admin Only */}
        <Route
          path="/portal/scoring"
          element={
            <ProtectedRoute requiredRole={[UserRole.COMMITTEE, UserRole.ADMIN]}>
              <ScoringMatrix />
            </ProtectedRoute>
          }
        />

        {/* Admin Only */}
        <Route
          path="/portal/admin"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <AdminConsole />
            </ProtectedRoute>
          }
        />

        {/* Fallback - Redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
