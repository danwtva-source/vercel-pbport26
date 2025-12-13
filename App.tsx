import React, { useState, useEffect } from 'react';
import { Landing, PostcodeChecker, Timeline, Priorities, PublicDocuments } from './views/Public';
import { ApplicantDashboard, CommitteeDashboard, AdminDashboard } from './views/Secure';
import { Button, Input, Modal } from './components/UI';
import { api, auth } from './services/firebase';
import { User, Role } from './types';

// Import logos
import PublicLogo from './images/PB English Transparent.png';
import PortalLogo from "./images/Peoples' Committee Portal logo 2.png";

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Auth State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Strict Role-Based Routing ---
  const routeUser = (user: User) => {
      const role: Role = user.role;

      // Force redirect based on role
      switch (role) {
        case 'admin':
          setCurrentPage('admin');
          break;
        case 'committee':
          setCurrentPage('committee');
          break;
        case 'applicant':
          setCurrentPage('applicant');
          break;
        default:
          // Unknown role, treat as applicant
          console.warn('Unknown role detected:', user.role);
          setCurrentPage('applicant');
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const u = authMode === 'login'
          ? await api.login(emailOrUser, password)
          : await api.register(emailOrUser, password, displayName);

        setCurrentUser(u);
        setIsAuthOpen(false);
        routeUser(u);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Log the UID to console for debugging
        console.log("Auth UID:", user.uid);

        const profile = await api.getUserById(user.uid);

        if (profile) {
          console.log("Firestore Profile Found:", profile);
          setCurrentUser(profile);

          // Only auto-route if on a public page
          if (['home', 'timeline', 'priorities', 'check-postcode', 'documents'].includes(currentPage)) {
              routeUser(profile);
          }
        } else {
          console.warn("No Firestore Profile found for UID. Creating default applicant profile.");

          // Create a default applicant profile
          const newProfile: User = {
            uid: user.uid,
            email: user.email || '',
            role: 'applicant',
            displayName: user.displayName || undefined,
            createdAt: Date.now()
          };

          setCurrentUser(newProfile);
          setCurrentPage('applicant');
        }
      } else {
        setCurrentUser(null);
        setCurrentPage('home');
      }
    });

    return () => unsubscribe();
  }, []);

  // Enforce role-based access control during session
  useEffect(() => {
      if (!currentUser) return;

      const role: Role = currentUser.role;

      // Admins can access both admin and committee views
      if (role === 'admin') {
        if (!['admin', 'committee'].includes(currentPage)) {
          setCurrentPage('admin');
        }
      } else if (role === 'committee') {
        if (currentPage !== 'committee') {
          setCurrentPage('committee');
        }
      } else if (role === 'applicant') {
        if (currentPage !== 'applicant') {
          setCurrentPage('applicant');
        }
      }
  }, [currentUser, currentPage]);

  const renderView = () => {
    // Public views (unauthenticated)
    if (!currentUser) {
        switch(currentPage) {
            case 'timeline':
              return <Timeline />;
            case 'check-postcode':
              return <PostcodeChecker />;
            case 'priorities':
              return <Priorities />;
            case 'documents':
              return <PublicDocuments />;
            default:
              return <Landing onNavigate={(page) => {
                if (page === 'register') {
                  setAuthMode('register');
                  setIsAuthOpen(true);
                } else {
                  setCurrentPage(page);
                }
              }} />;
        }
    }

    // Authenticated views
    const role: Role = currentUser.role;

    if (role === 'admin') {
        // Admin can access committee view as well
        if (currentPage === 'committee') {
          return (
            <CommitteeDashboard
              user={currentUser}
              onUpdateUser={setCurrentUser}
              isAdmin
              onReturnToAdmin={() => setCurrentPage('admin')}
            />
          );
        }
        return (
          <AdminDashboard
            onNavigatePublic={setCurrentPage}
            onNavigateScoring={() => setCurrentPage('committee')}
          />
        );
    }

    if (role === 'committee') {
      return (
        <CommitteeDashboard
          user={currentUser}
          onUpdateUser={setCurrentUser}
        />
      );
    }

    // Default: Applicant
    return <ApplicantDashboard user={currentUser} />;
  };

  // Determine which logo to show based on authentication state and role
  const isSecurePortal = currentUser && ['admin', 'committee'].includes(currentUser.role);
  const logoSrc = isSecurePortal ? PortalLogo : PublicLogo;
  const logoAlt = isSecurePortal ? "Peoples' Committee Portal" : "Communities' Choice";

  return (
    <div className="min-h-screen flex flex-col bg-white font-arial selection:bg-purple-200">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 h-24 flex justify-between items-center">
            <div
              className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setCurrentPage(currentUser ? (currentUser.role === 'admin' ? 'admin' : currentUser.role === 'committee' ? 'committee' : 'applicant') : 'home')}
            >
                <img
                    src={logoSrc}
                    alt={logoAlt}
                    className="h-20 w-auto object-contain drop-shadow-sm"
                    onError={(e) => {
                      console.error('Logo failed to load:', logoSrc);
                      e.currentTarget.style.display='none';
                    }}
                />
            </div>

            <div className="flex gap-2 md:gap-6 items-center">
                {!currentUser ? (
                    <>
                        <button
                          onClick={() => setCurrentPage('priorities')}
                          className="hidden md:block text-gray-600 hover:text-brand-purple font-bold transition-colors font-dynapuff text-lg"
                        >
                          Priorities
                        </button>
                        <Button
                          onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }}
                          className="bg-brand-purple hover:bg-brand-darkPurple shadow-lg px-6"
                        >
                          Portal Login
                        </Button>
                    </>
                ) : (
                    <div className="flex items-center gap-4 animate-fade-in">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {currentUser.role}
                            </div>
                            <div className="text-sm font-bold text-gray-800">
                              {currentUser.displayName || currentUser.email.split('@')[0]}
                            </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            auth.signOut();
                            setCurrentUser(null);
                            setCurrentPage('home');
                          }}
                        >
                            <span className="text-red-500 hover:text-red-700">Log Out</span>
                        </Button>
                    </div>
                )}
            </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow relative overflow-x-hidden">
        {renderView()}
      </main>

      {/* --- DEBUG BAR (Development Only) --- */}
      {currentUser && import.meta.env.DEV && (
          <div className="fixed bottom-0 left-0 right-0 bg-black text-white text-xs p-2 flex justify-center gap-6 z-[100] opacity-75 hover:opacity-100 transition-opacity font-mono">
              <span>
                UID: <span className="text-yellow-300 select-all">{currentUser.uid}</span>
              </span>
              <span>
                Role: <span className={`font-bold ${currentUser.role === 'committee' ? 'text-green-400' : currentUser.role === 'admin' ? 'text-blue-400' : 'text-purple-400'}`}>
                  {currentUser.role}
                </span>
              </span>
              <span>
                Area: <span className="text-cyan-300">{currentUser.area || 'None'}</span>
              </span>
              <span>
                Route: <span className="text-orange-300">{currentPage}</span>
              </span>
          </div>
      )}

      {/* FOOTER */}
      <footer className="bg-gray-50 border-t border-gray-200 py-16 mt-auto">
        <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="text-center md:text-left">
                    <img
                      src={PublicLogo}
                      alt="Communities' Choice Logo"
                      className="h-12 mb-4 mx-auto md:mx-0 opacity-80"
                      onError={(e) => e.currentTarget.style.display='none'}
                    />
                    <p className="text-gray-500 text-sm max-w-md leading-relaxed">
                        <strong>Communities' Choice</strong> is a participatory budgeting initiative empowering Torfaen residents.
                    </p>
                </div>
                <div className="flex gap-8 text-sm font-bold text-gray-600">
                    <a href="#" className="hover:text-brand-purple transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-brand-purple transition-colors">Contact Us</a>
                </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400 uppercase tracking-widest">
                &copy; 2026 Torfaen County Borough Council & TVA
            </div>
        </div>
      </footer>

      {/* AUTH MODAL */}
      <Modal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        title={authMode === 'login' ? 'Portal Access' : 'Join the Community'}
      >
        <form onSubmit={handleLogin} className="space-y-5 px-4 pb-4">
            {authMode === 'register' && (
              <Input
                label="Full Name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />
            )}
            <Input
              label="Email or Username"
              value={emailOrUser}
              onChange={e => setEmailOrUser(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && (
              <div className="text-red-600 bg-red-50 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">
                ⚠️ {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full shadow-lg py-4 text-lg"
              disabled={loading}
            >
              {loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>
            <div className="text-center text-sm text-gray-500 mt-6 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                  }}
                  className="text-brand-purple font-bold ml-2 hover:underline"
                >
                    {authMode === 'login' ? 'Create an account' : 'Log in'}
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
}

export default App;
