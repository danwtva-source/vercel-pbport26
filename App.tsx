import React, { useState, useEffect } from 'react';
import { Landing, PostcodeChecker, Timeline, Priorities, PublicDocuments } from './views/Public';
import { ApplicantDashboard, CommitteeDashboard, AdminDashboard } from './views/Secure';
import { Button, Input, Modal } from './components/UI';
import { api, auth } from './services/firebase';
import { Role, User } from './types';
import { getDashboardPageForRole } from './utils/routing';

// Logo paths (served from public directory)
const PublicLogo = '/images/PB English Transparent.png';
const PortalLogo = "/images/Peoples’ Committee Portal logo 2.png";

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
      setCurrentPage(getDashboardPageForRole(role));
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
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred');
      } else {
        setError('An error occurred');
      }
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
          console.log("User Role:", profile.role);
          console.log("User Area:", profile.area);
          setCurrentUser(profile);

          // ALWAYS route user to their role-specific dashboard after login
          routeUser(profile);
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
      console.log("Role enforcement check - Current role:", role, "Current page:", currentPage);

      if (currentPage === 'committee' && role === 'admin') return;

      const expectedPage = getDashboardPageForRole(role);
      if (currentPage !== expectedPage) {
        setCurrentPage(expectedPage);
      }
  }, [currentUser, currentPage]);

  const handleProfileClick = () => {
      if(!currentUser) return;
      routeUser(currentUser);
  };

  const renderView = () => {
    // Public views (unauthenticated)
    if (!currentUser) {
        const page = currentPage.split(':')[0];
        switch(page) {
            case 'timeline':
              return <Timeline />;
            case 'check-postcode':
              return <PostcodeChecker />;
            case 'priorities':
              return <Priorities />;
            case 'documents':
              return <PublicDocuments />;
            default:
              return <Landing onNavigate={(pageName) => {
                if (pageName === 'register') {
                  setAuthMode('register');
                  setIsAuthOpen(true);
                } else {
                  setCurrentPage(pageName);
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
      {/* HEADER / NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 h-24 flex justify-between items-center">
            {/* Logo Section - Logic for Public vs Portal Logo */}
            <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setCurrentPage('home')}>
                <img 
                    src={logoSrc}
                    alt={logoAlt}
                    className="h-20 w-auto object-contain drop-shadow-sm" 
                    onError={(e) => e.currentTarget.style.display='none'} 
                />
            </div>

            {/* Navigation Items */}
            <div className="flex gap-2 md:gap-6 items-center">
                {!currentUser ? (
                    <>
                        <button onClick={() => setCurrentPage('priorities')} className="hidden md:block text-gray-600 hover:text-brand-purple font-bold transition-colors font-dynapuff text-lg">Priorities</button>
                        <button onClick={() => setCurrentPage('timeline')} className="hidden md:block text-gray-600 hover:text-brand-purple font-bold transition-colors font-dynapuff text-lg">Timeline</button>
                        <button onClick={() => setCurrentPage('documents')} className="hidden md:block text-gray-600 hover:text-brand-purple font-bold transition-colors font-dynapuff text-lg">Resources</button>
                        <div className="h-8 w-px bg-gray-200 hidden md:block mx-2"></div>
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
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentUser.role}</div>
                            <div className="text-sm font-bold text-gray-800">{currentUser.displayName || currentUser.email.split('@')[0]}</div>
                        </div>
                        <div 
                            onClick={handleProfileClick}
                            className="relative cursor-pointer group"
                        >
                            <img 
                                src={currentUser.photoUrl || `https://ui-avatars.com/api/?name=${currentUser.displayName}&background=9333ea&color=fff`} 
                                alt="Profile" 
                                className="w-12 h-12 rounded-full border-2 border-white shadow-md group-hover:scale-105 transition-transform object-cover" 
                            />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { auth.signOut(); }}>
                            <span className="text-red-500 hover:text-red-700">Log Out</span>
                        </Button>
                    </div>
                )}
            </div>
        </div>
      </nav>

      {/* MAIN VIEWPORT */}
      <main className="flex-grow relative overflow-x-hidden">
        {renderView()}
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-50 border-t border-gray-200 py-16 mt-auto">
        <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="text-center md:text-left">
                    <img src={PublicLogo} alt="Logo" className="h-12 mb-4 mx-auto md:mx-0 opacity-80" />
                    <p className="text-gray-600 max-w-sm">Communities' Choice is a participatory budgeting initiative empowering local residents to shape their communities.</p>
                </div>
                <div className="text-center md:text-right">
                    <p className="text-gray-400 text-sm">&copy; 2025 Communities' Choice Torfaen</p>
                </div>
            </div>
        </div>
      </footer>

      {/* AUTH MODAL */}
      <Modal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} title={authMode === 'login' ? 'Portal Login' : 'Create Account'}>
        <form onSubmit={handleLogin} className="space-y-4">
            <Input label={authMode === 'login' ? 'Email or Username' : 'Email'} value={emailOrUser} onChange={e => setEmailOrUser(e.target.value)} required />
            {authMode === 'register' && <Input label="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} required />}
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Register'}</Button>
            <div className="text-center text-sm text-gray-500">
                {authMode === 'login' ? (
                    <button type="button" onClick={() => setAuthMode('register')} className="text-brand-purple font-bold">Need an account?</button>
                ) : (
                    <button type="button" onClick={() => setAuthMode('login')} className="text-brand-purple font-bold">Already have an account?</button>
                )}
            </div>
        </form>
      </Modal>
    </div>
  );
}

export default App;
