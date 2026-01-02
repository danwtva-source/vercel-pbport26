import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api as AuthService } from './services/firebase';
import { User, UserRole } from './types';
import { ROUTES } from './utils';

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
import UserSettings from './pages/secure/UserSettings';

// Route guard wrapper component
interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: UserRole | UserRole[];
}

// Helper to normalize role strings for comparison (handles case differences)
const normalizeRole = (role: string | undefined): string => {
  return (role || '').toUpperCase();
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();

    if (!currentUser) {
      navigate(ROUTES.PUBLIC.LOGIN, { replace: true });
      setLoading(false);
      return;
    }

    // Normalize the user's role for comparison (handles 'admin' vs 'ADMIN')
    const userRoleNormalized = normalizeRole(currentUser.role);

    // Check role authorization
    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

      // Admin can access everything
      if (userRoleNormalized === UserRole.ADMIN) {
        setUser(currentUser);
        setLoading(false);
        return;
      }

      // Check if user's role is in allowed roles (normalize for comparison)
      const allowedRolesNormalized = allowedRoles.map(r => normalizeRole(r));
      if (!allowedRolesNormalized.includes(userRoleNormalized)) {
        // Redirect to appropriate dashboard based on role
        switch (userRoleNormalized) {
          case UserRole.COMMITTEE:
            navigate(ROUTES.PORTAL.DASHBOARD, { replace: true });
            break;
          case UserRole.APPLICANT:
            navigate(ROUTES.PORTAL.DASHBOARD, { replace: true });
            break;
          default:
            navigate(ROUTES.PUBLIC.LOGIN, { replace: true });
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
        <Route path={ROUTES.PUBLIC.HOME} element={<LandingPage />} />
        <Route path={ROUTES.PUBLIC.VOTING_ZONE} element={<PostcodeCheckPage />} />
        <Route path={ROUTES.PUBLIC.PRIORITIES} element={<PrioritiesPage />} />
        <Route path={ROUTES.PUBLIC.RESOURCES} element={<DocumentsPage />} />
        <Route path={ROUTES.PUBLIC.TIMELINE} element={<TimelinePage />} />
        <Route path={ROUTES.PUBLIC.LOGIN} element={<LoginPage />} />

        {/* Protected Routes - All authenticated users */}
        <Route
          path={ROUTES.PORTAL.DASHBOARD}
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.PORTAL.APPLICATIONS}
          element={
            <ProtectedRoute>
              <ApplicationsList />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.PORTAL.APPLICATIONS_NEW}
          element={
            <ProtectedRoute>
              <ApplicationForm />
            </ProtectedRoute>
          }
        />

        <Route
          path={`${ROUTES.PORTAL.APPLICATIONS}/:id`}
          element={
            <ProtectedRoute>
              <ApplicationForm />
            </ProtectedRoute>
          }
        />

        {/* User Settings - All authenticated users */}
        <Route
          path="/portal/settings"
          element={
            <ProtectedRoute>
              <UserSettings />
            </ProtectedRoute>
          }
        />

        {/* Committee & Admin Only */}
        <Route
          path={ROUTES.PORTAL.SCORING}
          element={
            <ProtectedRoute requiredRole={[UserRole.COMMITTEE, UserRole.ADMIN]}>
              <ScoringMatrix />
            </ProtectedRoute>
          }
        />

        {/* Admin Only */}
        <Route
          path={ROUTES.PORTAL.ADMIN}
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <AdminConsole />
            </ProtectedRoute>
          }
        />

        {/* Fallback - Redirect to home */}
        <Route path="*" element={<Navigate to={ROUTES.PUBLIC.HOME} replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
