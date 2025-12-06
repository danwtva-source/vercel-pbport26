import React, { useState } from 'react';
import { Landing, PostcodeChecker, Timeline, Priorities, PublicDocuments } from './views/Public';
import { ApplicantDashboard, CommitteeDashboard, AdminDashboard } from './views/Secure';
import { Button, Input, Modal } from './components/UI';
import { api } from './services/firebase';
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
        const u = authMode === 'login' ? await api.login(emailOrUser, password) : await api.register(emailOrUser, password, displayName);
        setCurrentUser(u); setIsAuthOpen(false); setCurrentPage(u.role === 'admin' ? 'admin' : u.role === 'committee' ? 'committee' : 'applicant');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleProfileClick = () => {
      if(!currentUser) return;
      if(currentUser.role === 'admin') setCurrentPage('admin');
      else if(currentUser.role === 'committee') setCurrentPage('committee');
      else setCurrentPage('applicant');
  };

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
    return <ApplicantDashboard user={currentUser} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-arial selection:bg-purple-200">
      {/* HEADER / NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 h-24 flex justify-between items-center">
            {/* Logo Section */}
            <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setCurrentPage('home')}>
                <img 
                    src={currentUser ? "/images/Peoples’ Committee Portal logo 2.png" : "/images/PB English Transparent.png"} 
                    alt="Communities' Choice Logo" 
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
                        <Button variant="ghost" size="sm" onClick={() => { setCurrentUser(null); setCurrentPage('home'); }}>
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
                    <img src="/images/PB English Transparent.png" alt="Logo" className="h-12 mb-4 mx-auto md:mx-0 opacity-80" />
                    <p className="text-gray-500 text-sm max-w-md leading-relaxed">
                        <strong>Communities' Choice</strong> is a participatory budgeting initiative empowering Torfaen residents to make decisions about public funding in their local areas.
                    </p>
                </div>
                <div className="flex gap-8 text-sm font-bold text-gray-600">
                    <a href="#" className="hover:text-brand-purple transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-brand-purple transition-colors">Accessibility</a>
                    <a href="#" className="hover:text-brand-purple transition-colors">Contact Us</a>
                </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400 uppercase tracking-widest">
                &copy; 2026 Torfaen County Borough Council & TVA
            </div>
        </div>
      </footer>

      {/* AUTH MODAL */}
      <Modal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} title={authMode === 'login' ? 'Portal Access' : 'Join the Community'}>
        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <img src="/images/Peoples’ Committee Portal logo 2.png" alt="Logo" className="h-12 w-auto" onError={e => e.currentTarget.style.display='none'} />
            </div>
            <h3 className="font-dynapuff text-xl text-brand-purple mb-1">Welcome Back</h3>
            <p className="text-gray-500 text-sm">Secure access for Applicants & Committee Members</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5 px-4 pb-4">
            {authMode === 'register' && <Input label="Full Name" value={displayName} onChange={e => setDisplayName(e.target.value)} required placeholder="Jane Doe" />}
            <Input label="Email or Username" value={emailOrUser} onChange={e => setEmailOrUser(e.target.value)} required placeholder="user@example.com" />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            {error && <div className="text-red-600 bg-red-50 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">⚠️ {error}</div>}
            <Button type="submit" className="w-full shadow-lg py-4 text-lg" disabled={loading}>
                {loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>
            <div className="text-center text-sm text-gray-500 mt-6 pt-6 border-t border-gray-100">
                {authMode === 'login' ? 'New to Communities\' Choice?' : 'Already have an account?'}
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
