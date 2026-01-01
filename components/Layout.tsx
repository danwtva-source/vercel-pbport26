import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api as AuthService, USE_DEMO_MODE } from '../services/firebase';
import { LogOut, LayoutDashboard, FileText, BarChart3, Settings, Menu, X, Home, Vote, FileQuestion, BookOpen, Briefcase } from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const DemoBanner = () => {
  if (!USE_DEMO_MODE) return null;
  return (
    <div className="bg-amber-500 text-white text-[9px] font-bold text-center py-1 tracking-tighter sticky top-0 z-[60] uppercase shadow-inner">
      Simulation Active — Data is temporary
    </div>
  );
};

export const PublicLayout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isActive = (path: string) => location.pathname === path ? 'bg-purple-100 text-purple-800' : 'text-purple-700 hover:bg-purple-50';

  return (
    <div className="min-h-screen flex flex-col font-arial relative">
      <DemoBanner />
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-purple-100">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 group">
            {/* PUBLIC LOGO: Puzzle Piece PB App Logo */}
            <img src="/logo-public.png" alt="Communities' Choice Logo" className="h-10 w-10 group-hover:rotate-6 transition-transform" />
            <span className="text-xl font-bold text-purple-800 font-display hidden sm:block">Communities' Choice</span>
          </Link>

          <nav className="hidden md:flex space-x-1 items-center">
            <Link to="/" className={`px-4 py-2 rounded-xl font-bold font-display transition ${isActive('/')}`}>Home</Link>
            <Link to="/priorities" className={`px-4 py-2 rounded-xl font-bold font-display transition ${isActive('/priorities')}`}>Priorities</Link>
            <Link to="/vote" className={`px-4 py-2 rounded-xl font-bold font-display transition ${isActive('/vote')}`}>Voting Zone</Link>
            <Link to="/documents" className={`px-4 py-2 rounded-xl font-bold font-display transition ${isActive('/documents')}`}>Resources</Link>
            <Link to="/login" className="ml-4 bg-purple-600 hover:bg-purple-800 text-white px-6 py-2 rounded-xl font-bold font-display transition shadow-lg">Secure Portal</Link>
          </nav>

          <button className="md:hidden text-purple-800 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-purple-100 shadow-xl absolute w-full left-0 top-full flex flex-col p-6 space-y-3 animate-fade-in z-50">
            <Link to="/" className="p-3 rounded-xl hover:bg-purple-50 font-bold text-purple-800 flex items-center" onClick={() => setMobileMenuOpen(false)}><Home size={18} className="mr-3"/> Home</Link>
            <Link to="/priorities" className="p-3 rounded-xl hover:bg-purple-50 font-bold text-purple-800 flex items-center" onClick={() => setMobileMenuOpen(false)}><FileQuestion size={18} className="mr-3"/> Community Priorities</Link>
            <Link to="/vote" className="p-3 rounded-xl hover:bg-purple-50 font-bold text-purple-800 flex items-center" onClick={() => setMobileMenuOpen(false)}><Vote size={18} className="mr-3"/> Voting Zone</Link>
            <Link to="/documents" className="p-3 rounded-xl hover:bg-purple-50 font-bold text-purple-800 flex items-center" onClick={() => setMobileMenuOpen(false)}><BookOpen size={18} className="mr-3"/> Documents</Link>
            <Link to="/login" className="mt-4 p-4 rounded-xl bg-purple-600 text-white font-bold text-center shadow-lg font-display">Secure Portal Access</Link>
          </div>
        )}
      </header>
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-purple-950 text-purple-200 py-10 mt-auto border-t-4 border-teal-500">
        <div className="container mx-auto px-4 text-center">
          <img src="/logo-public.png" alt="Footer Logo" className="h-8 w-8 mx-auto mb-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
          <p className="font-display text-lg mb-1">Communities' Choice Portal</p>
          <p className="text-xs opacity-50 font-arial max-w-sm mx-auto">&copy; 2025 TVA. Supporting community empowerment and participatory budgeting across Torfaen.</p>
        </div>
      </footer>
    </div>
  );
};

export const SecureLayout: React.FC<LayoutProps & { userRole: UserRole }> = ({ children, userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentUser = AuthService.getCurrentUser();

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path ? 'bg-purple-700 text-white shadow-inner border-l-4 border-teal-400' : 'text-purple-200 hover:bg-purple-800 hover:text-white';

  // Normalize role for comparison (handles 'admin' vs 'ADMIN' case differences)
  const normalizedRole = (userRole || '').toString().toUpperCase();
  const isAdmin = normalizedRole === UserRole.ADMIN || normalizedRole === 'ADMIN';
  const isCommittee = normalizedRole === UserRole.COMMITTEE || normalizedRole === 'COMMITTEE';

  const NavLinks = () => (
    <>
      <Link to="/portal/dashboard" onClick={() => setSidebarOpen(false)} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition text-sm font-bold ${isActive('/portal/dashboard')}`}>
        <LayoutDashboard size={18} />
        <span>My Dashboard</span>
      </Link>

      {(isCommittee || isAdmin) && (
        <Link to="/portal/scoring" onClick={() => setSidebarOpen(false)} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition text-sm font-bold ${isActive('/portal/scoring')}`}>
          <BarChart3 size={18} />
          <span>Matrix Evaluation</span>
        </Link>
      )}

      <Link to="/portal/applications" onClick={() => setSidebarOpen(false)} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition text-sm font-bold ${isActive('/portal/applications')}`}>
        <Briefcase size={18} />
        <span>Project Entries</span>
      </Link>

      {isAdmin && (
         <Link to="/portal/admin" onClick={() => setSidebarOpen(false)} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition text-sm font-bold ${isActive('/portal/admin')}`}>
          <Settings size={18} />
          <span>Master Console</span>
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-arial">
      <DemoBanner />

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-purple-900 text-white hidden md:flex flex-col fixed h-full z-20 shadow-2xl">
        <div className="p-8 border-b border-purple-800 flex flex-col items-center text-center bg-purple-950">
          {/* SECURE INTERNAL LOGO: Circular Portal Logo */}
          <img src="/logo-secure.png" alt="Internal Portal Logo" className="h-16 w-16 mb-4 drop-shadow-lg" />
          <h2 className="text-lg font-bold font-display leading-none">Internal Portal</h2>
          <div className="mt-2 inline-block px-2 py-0.5 rounded bg-teal-500 text-[9px] font-bold text-teal-950 uppercase tracking-widest">{userRole}</div>
        </div>

        <div className="p-4 flex-grow">
           <nav className="space-y-1">
             <NavLinks />
           </nav>
        </div>

        <div className="p-4 bg-purple-950 border-t border-purple-800">
           <div className="px-4 py-3 mb-4 bg-purple-900/50 rounded-xl border border-purple-800">
              <p className="text-[10px] font-bold text-purple-400 uppercase leading-none mb-1">Signed in as</p>
              <p className="text-xs font-bold truncate">{currentUser?.name}</p>
           </div>
           <button onClick={handleLogout} className="flex items-center space-x-3 text-purple-300 hover:text-white transition w-full px-4 py-2 hover:bg-red-600 rounded-lg text-sm font-bold">
             <LogOut size={16} />
             <span>Sign Out</span>
           </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden bg-purple-900 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-lg">
         <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-1"><Menu size={24} /></button>
            <img src="/logo-secure.png" alt="Logo" className="h-8 w-8" />
         </div>
         <span className="text-sm font-bold font-display">Committee Portal</span>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative bg-purple-900 text-white w-64 h-full shadow-2xl animate-slide-in">
             <div className="p-6 flex justify-between items-center border-b border-purple-800">
               <span className="font-bold font-display">Secure Menu</span>
               <button onClick={() => setSidebarOpen(false)}><X size={24}/></button>
             </div>
             <nav className="p-4 space-y-1">
               <NavLinks />
             </nav>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <main className="flex-grow p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
