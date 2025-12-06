import React, { useState } from 'react';
import { Landing, PostcodeChecker, Timeline, Priorities, PublicDocuments } from './views/Public';
import { ApplicantDashboard, CommitteeDashboard, AdminDashboard } from './views/Secure';
import { Button, Input, Modal } from './components/UI';
import { api } from './services/firebase';
import { User } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
    <div className="min-h-screen flex flex-col bg-slate-50 font-arial">
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-purple-100 shadow-sm">
        <div className="container mx-auto px-4 h-20 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage('home')}>
                <img src={currentUser ? "/images/Peoples’ Committee Portal logo 2.png" : "/images/PB English Transparent.png"} 
                     alt="Logo" className="h-12 object-contain" onError={e => e.currentTarget.style.display='none'} />
                <span className="font-dynapuff text-brand-purple font-bold text-xl">{!currentUser && "Communities' Choice"}</span>
            </div>
            <div className="flex gap-4 items-center">
                {!currentUser ? (
                    <>
                        <button onClick={() => setCurrentPage('check-postcode')} className="text-brand-purple font-bold hidden sm:block">Vote</button>
                        <button onClick={() => setCurrentPage('documents')} className="text-brand-purple font-bold hidden sm:block">Documents</button>
                        <Button size="sm" onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="bg-purple-100 text-purple-800">Committee Portal</Button>
                    </>
                ) : (
                    <div className="flex items-center gap-4 cursor-pointer">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{currentUser.role}</div>
                            <div className="text-sm font-bold text-gray-800">{currentUser.displayName}</div>
                        </div>
                        <img src={currentUser.photoUrl || `https://ui-avatars.com/api/?name=${currentUser.displayName}`} alt="Profile" className="w-10 h-10 rounded-full border-2 border-brand-purple object-cover" />
                        <Button variant="danger" size="sm" onClick={() => { setCurrentUser(null); setCurrentPage('home'); }}>Log Out</Button>
                    </div>
                )}
            </div>
        </div>
      </nav>
      <main className="flex-grow">{renderView()}</main>
      <Modal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} title={authMode === 'login' ? 'Portal Access' : 'Register'}>
        <form onSubmit={handleLogin} className="space-y-4">
            {authMode === 'register' && <Input label="Full Name" value={displayName} onChange={e => setDisplayName(e.target.value)} required />}
            <Input label="Email or Username" value={emailOrUser} onChange={e => setEmailOrUser(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Processing...' : (authMode === 'login' ? 'Log In' : 'Sign Up')}</Button>
        </form>
      </Modal>
    </div>
  );
}
export default App;
