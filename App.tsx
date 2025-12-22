import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/public/LandingPage';
import PostcodeCheckPage from './pages/public/PostcodeCheckPage';
import PrioritiesPage from './pages/public/PrioritiesPage';
import DocumentsPage from './pages/public/DocumentsPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/secure/Dashboard';
import ScoringMatrix from './pages/secure/ScoringMatrix';
import ApplicationsList from './pages/secure/ApplicationsList';
import ApplicationForm from './pages/secure/ApplicationForm';
import AdminConsole from './pages/secure/AdminConsole';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/vote" element={<PostcodeCheckPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/priorities" element={<PrioritiesPage />} /> 
        <Route path="/documents" element={<DocumentsPage />} />

        {/* Secure Routes */}
        <Route path="/portal/dashboard" element={<Dashboard />} />
        <Route path="/portal/scoring" element={<ScoringMatrix />} />
        <Route path="/portal/applications" element={<ApplicationsList />} />
        <Route path="/portal/application/:id" element={<ApplicationForm />} />
        <Route path="/portal/admin" element={<AdminConsole />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;