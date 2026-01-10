import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicLayout } from '../components/Layout';
import { Button, Input, Card } from '../components/UI';
import { api } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, AlertCircle, Loader } from 'lucide-react';
import { ROUTES } from '../utils';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'applicant' | 'community'>('applicant');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user;

      if (mode === 'login') {
        // Login with email/password
        user = await api.login(email, password);
      } else {
        // Register new user
        if (!name.trim()) {
          throw new Error('Please enter your full name');
        }
        // Validate email format with proper regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Please enter a valid email address');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        user = await api.register(email, password, name, role);
      }

      // Store user in localStorage (AuthService pattern)
      localStorage.setItem('pb_user', JSON.stringify(user));

      await refreshProfile();
      // Redirect to portal root so role-based redirect handles landing
      navigate(ROUTES.PORTAL.ROOT);
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'login' ? 'sign in' : 'create account'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <PublicLayout>
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-2 border-purple-100">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4">
                {mode === 'login' ? (
                  <LogIn size={32} className="text-purple-600" />
                ) : (
                  <UserPlus size={32} className="text-purple-600" />
                )}
              </div>
              <h1 className="text-3xl font-bold text-purple-900 mb-2 font-display">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-gray-600 font-arial">
                {mode === 'login'
                  ? 'Sign in to access your secure portal'
                  : 'Join the Communities\' Choice portal'}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-shake">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <>
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="name"
                  />

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Account Type
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'applicant' | 'community')}
                      disabled={loading}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option value="applicant">Applicant - Submit funding applications</option>
                      <option value="community">Community Member - Receive updates and participate in discussions</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Choose "Applicant" if you plan to submit funding applications. Choose "Community Member" if you want to stay informed and participate in discussions.
                    </p>
                  </div>
                </>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                placeholder={mode === 'register' ? 'Create a strong password (min. 6 characters)' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
                  </>
                ) : (
                  <>
                    {mode === 'login' ? (
                      <>
                        <LogIn size={20} />
                        Sign In
                      </>
                    ) : (
                      <>
                        <UserPlus size={20} />
                        Create Account
                      </>
                    )}
                  </>
                )}
              </Button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm mb-3">
                {mode === 'login'
                  ? "Don't have an account?"
                  : 'Already have an account?'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={toggleMode}
                disabled={loading}
                className="w-full"
              >
                {mode === 'login' ? 'Create New Account' : 'Sign In Instead'}
              </Button>
            </div>
          </Card>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-purple-50 border border-purple-100 rounded-xl">
            <p className="text-xs text-purple-800 text-center font-medium">
              <span className="font-bold">Secure Portal Access:</span> Your credentials are encrypted and protected.
              Contact support if you need assistance accessing your account.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default LoginPage;
