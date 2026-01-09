import React from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { User, UserRole } from './types';
import { ROUTES, toUserRole } from './utils';

// Lazy load pages for better performance
import LandingPage from './pages/public/LandingPage';
import PostcodeCheckPage from './pages/public/PostcodeCheckPage';
import PublicVotingPage from './pages/public/PublicVotingPage';
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
import DocumentsPortal from './pages/secure/DocumentsPortal';

// Route guard wrapper component
interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: UserRole | UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { userProfile, loading, error } = useAuth();
  const navigate = useNavigate();

  // Show loading spinner while auth state is being resolved
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

  // If there's an auth error (e.g., profile not found), show error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Authentication Error</p>
            <p>{error}</p>
          </div>
          <button
            onClick={() => navigate(ROUTES.PUBLIC.LOGIN, { replace: true })}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // No user - redirect to login
  if (!userProfile) {
    // Use Navigate component for proper redirect during render
    return <Navigate to={ROUTES.PUBLIC.LOGIN} replace />;
  }

  const userRole = toUserRole(userProfile.role);

  // Check role authorization if required
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Admin can access everything
    if (userRole === UserRole.ADMIN) {
      return children;
    }

    if (!allowedRoles.includes(userRole)) {
      // Redirect to dashboard - user doesn't have required role
      return <Navigate to={ROUTES.PORTAL.DASHBOARD} replace />;
    }
  }

  return children;
};

const PortalRedirect: React.FC = () => {
  const { userProfile, loading, error } = useAuth();

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

  if (error) {
    return <Navigate to={ROUTES.PUBLIC.LOGIN} replace />;
  }

  if (!userProfile) {
    return <Navigate to={ROUTES.PUBLIC.LOGIN} replace />;
  }

  const userRoleNormalized = toUserRole(userProfile.role);

  if (userRoleNormalized === UserRole.APPLICANT) {
    return <Navigate to={ROUTES.PORTAL.APPLICANT} replace />;
  }

  return <Navigate to={ROUTES.PORTAL.DASHBOARD} replace />;
};

// Main routes component (must be inside Router)
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path={ROUTES.PUBLIC.HOME} element={<LandingPage />} />
      <Route path={ROUTES.PUBLIC.VOTING_ZONE} element={<PostcodeCheckPage />} />
      <Route path={ROUTES.PUBLIC.VOTING_LIVE} element={<PublicVotingPage />} />
      <Route path={ROUTES.PUBLIC.ALIASES.VOTING_ZONE} element={<Navigate to={ROUTES.PUBLIC.VOTING_ZONE} replace />} />
      <Route path={ROUTES.PUBLIC.ALIASES.VOTING_LIVE} element={<Navigate to={ROUTES.PUBLIC.VOTING_LIVE} replace />} />
      <Route path={ROUTES.PUBLIC.PRIORITIES} element={<PrioritiesPage />} />
      <Route path={ROUTES.PUBLIC.RESOURCES} element={<DocumentsPage />} />
      <Route path={ROUTES.PUBLIC.ALIASES.RESOURCES} element={<Navigate to={ROUTES.PUBLIC.RESOURCES} replace />} />
      <Route path={ROUTES.PUBLIC.TIMELINE} element={<TimelinePage />} />
      <Route path={ROUTES.PUBLIC.LOGIN} element={<LoginPage />} />

      {/* Protected Routes - All authenticated users */}
      <Route
        path={ROUTES.PORTAL.ROOT}
        element={
          <ProtectedRoute>
            <PortalRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PORTAL.DASHBOARD}
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PORTAL.APPLICANT}
        element={
          <ProtectedRoute requiredRole={UserRole.APPLICANT}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Applicant, Committee, and Admin can access applications */}
      <Route
        path={ROUTES.PORTAL.APPLICATIONS}
        element={
          <ProtectedRoute requiredRole={[UserRole.APPLICANT, UserRole.COMMITTEE, UserRole.ADMIN]}>
            <ApplicationsList />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.PORTAL.APPLICATIONS_NEW}
        element={
          <ProtectedRoute requiredRole={UserRole.APPLICANT}>
            <ApplicationForm />
          </ProtectedRoute>
        }
      />

      <Route
        path={`${ROUTES.PORTAL.APPLICATIONS}/:id`}
        element={
          <ProtectedRoute requiredRole={[UserRole.APPLICANT, UserRole.COMMITTEE, UserRole.ADMIN]}>
            <ApplicationForm />
          </ProtectedRoute>
        }
      />

      {/* User Settings - All authenticated users */}
      <Route
        path={ROUTES.PORTAL.SETTINGS}
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
      <Route
        path={ROUTES.PORTAL.DOCUMENTS}
        element={
          <ProtectedRoute requiredRole={[UserRole.COMMITTEE, UserRole.ADMIN]}>
            <DocumentsPortal />
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
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
