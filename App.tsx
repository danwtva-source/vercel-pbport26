import React, { useState, useEffect } from 'react';
import { Landing, PostcodeChecker, Timeline, Priorities, PublicDocuments } from './views/Public';
import { ApplicantDashboard, CommitteeDashboard, AdminDashboard } from './views/Secure';
import { Button, Input, Modal } from './components/UI';
import { api, auth } from './services/firebase';
import { User } from './types';

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

  // --- Strict Routing Helper ---
  const routeUser = (user: User) => {
      if (user.role === 'admin') setCurrentPage('admin');
      else if (user.role === 'committee') setCurrentPage('committee');
      else setCurrentPage('applicant');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
        const u = authMode === 'login' ? await api.login(emailOrUser, password) : await api.register(emailOrUser, password, displayName);
        setCurrentUser(u); 
        setIsAuthOpen(false); 
        routeUser(u);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Log the UID to console to help debugging
        console.log("Auth UID:", user.uid);
        
        const profile = await api.getUserById(user.uid);
        if (profile) {
          console.log("Firestore Profile Found:", profile);
          setCurrentUser(profile);
          if (['home', 'timeline', 'priorities'].includes(currentPage)) {
              routeUser(profile);
          }
        } else {
          console.warn("No Firestore Profile found for UID. Falling back to Applicant.");
          const newProfile: User = { uid: user.uid, email: user.email || '', role: 'applicant' };
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

  // Ensure role enforcement persists during session
  useEffect(() => {
      if (!currentUser) return;
      if (currentUser.role === 'admin' && currentPage !== 'admin' && !['committee', 'home'].includes(currentPage)) {
          if(currentPage !== 'committee') setCurrentPage('admin');
      } else if (currentUser.role === 'committee' && currentPage !== 'committee') {
          setCurrentPage('committee');
      } else if (currentUser.role === 'applicant' && currentPage !== 'applicant') {
          setCurrentPage('applicant');
      }
  }, [currentUser, currentPage]);

  const renderView = () => {
    if (!currentUser) {
        switch(currentPage) {
            case 'timeline': return <Timeline />;
            case 'check-postcode': return <PostcodeChecker />;
            case 'priorities': return <Priorities />;
            case 'documents': return <PublicDocuments />;
            default: return <Landing onNavigate={(page) => { if(page==='register'){setAuthMode('register');setIsAuthOpen(true);} else setCurrentPage(page); }} />;
        }
    }
    if (currentUser.role === 'admin') {
        if(currentPage === 'committee') return <CommitteeDashboard user={currentUser} onUpdateUser={setCurrentUser} isAdmin onReturnToAdmin={() => setCurrentPage('admin')} />;
        return <AdminDashboard onNavigatePublic={setCurrentPage} onNavigateScoring={() => setCurrentPage('committee')} />;
    }
    if (currentUser.role === 'committee') return <CommitteeDashboard user={currentUser} onUpdateUser={setCurrentUser} />;
    
    // Default fallback to Applicant
    return <ApplicantDashboard user={currentUser} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-arial selection:bg-purple-200">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 h-24 flex justify-between items-center">
            <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setCurrentPage('home')}>
                <img 
                    src={currentUser ? "/public/images/Peoples’ Committee Portal logo 2.png" : "/public/images/PB English Transparent.png"} 
                    alt="Communities' Choice Logo" 
                    className="h-20 w-auto object-contain drop-shadow-sm" 
                    onError={(e) => e.currentTarget.style.display='none'} 
                />
            </div>
            <div className="flex gap-2 md:gap-6 items-center">
                {!currentUser ? (
                    <>
                        <button onClick={() => setCurrentPage('priorities')} className="hidden md:block text-gray-600 hover:text-brand-purple font-bold transition-colors font-dynapuff text-lg">Priorities</button>
                        <Button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="bg-brand-purple hover:bg-brand-darkPurple shadow-lg px-6">Portal Login</Button>
                    </>
                ) : (
                    <div className="flex items-center gap-4 animate-fade-in">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentUser.role}</div>
                            <div className="text-sm font-bold text-gray-800">{currentUser.displayName || currentUser.email.split('@')[0]}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { auth.signOut(); setCurrentUser(null); setCurrentPage('home'); }}>
                            <span className="text-red-500 hover:text-red-700">Log Out</span>
                        </Button>
                    </div>
                )}
            </div>
        </div>
      </nav>

      <main className="flex-grow relative overflow-x-hidden">{renderView()}</main>

      {/* --- DEBUG BAR (Helper for Developers) --- */}
      {currentUser && (
          <div className="fixed bottom-0 left-0 right-0 bg-black text-white text-xs p-1 flex justify-center gap-4 z-[100] opacity-75 hover:opacity-100 transition-opacity">
              <span className="font-mono">UID: <span className="text-yellow-300 select-all">{currentUser.uid}</span></span>
              <span className="font-mono">Role: <span className={`font-bold ${currentUser.role === 'committee' ? 'text-green-400' : 'text-red-400'}`}>{currentUser.role}</span></span>
              <span className="font-mono">Area: {currentUser.area || 'None'}</span>
          </div>
      )}

      {/* FOOTER */}
      <footer className="bg-gray-50 border-t border-gray-200 py-16 mt-auto">
        <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="text-center md:text-left">
                    <img src="/public/images/PB English Transparent.png" alt="Logo" className="h-12 mb-4 mx-auto md:mx-0 opacity-80" />
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

      <Modal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} title={authMode === 'login' ? 'Portal Access' : 'Join the Community'}>
        <form onSubmit={handleLogin} className="space-y-5 px-4 pb-4">
            {authMode === 'register' && <Input label="Full Name" value={displayName} onChange={e => setDisplayName(e.target.value)} required />}
            <Input label="Email or Username" value={emailOrUser} onChange={e => setEmailOrUser(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <div className="text-red-600 bg-red-50 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">⚠️ {error}</div>}
            <Button type="submit" className="w-full shadow-lg py-4 text-lg" disabled={loading}>{loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}</Button>
            <div className="text-center text-sm text-gray-500 mt-6 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => { setError(''); setAuthMode(authMode === 'login' ? 'register' : 'login'); }} className="text-brand-purple font-bold ml-2 hover:underline">
                    {authMode === 'login' ? 'Create an account' : 'Log in'}
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
}
export default App;
