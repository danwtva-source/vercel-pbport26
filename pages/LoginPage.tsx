
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService, DataService } from '../services/firebase';
import { PublicLayout } from '../components/Layout';
import { UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { DEMO_USERS } from '../constants';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isDemo = DataService.isDemoMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await AuthService.login(email, password);
      } else {
        if (!name) throw new Error("Name is required for registration");
        await AuthService.register(name, email, password);
      }
      navigate('/portal/dashboard');
    } catch (err: any) {
      console.error(err);
      let msg = 'Authentication failed.';
      if (err.message) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = (email: string) => {
    setEmail(email);
    setPassword('demo123');
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative overflow-hidden">
        {isDemo && (
          <div className="absolute top-0 left-0 right-0 bg-amber-400 text-white text-[10px] font-bold text-center py-1 uppercase tracking-tighter">
            System Demo: Data is local to browser
          </div>
        )}
        
        <div className="text-center mb-8 mt-4">
          <img src="/logo-secure.png" alt="Portal Logo" className="h-20 w-20 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-purple-900 font-display leading-tight">
            {isLogin ? 'Portal Access' : 'Register Account'}
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            {isLogin ? 'Sign in to manage your community projects.' : 'Create a profile to start your grant application.'}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex bg-purple-50 p-1 rounded-xl mb-6">
          <button 
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-purple-600'}`}
          >
            Sign In
          </button>
          <button 
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-purple-600'}`}
          >
            Register
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Organization or User Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-1 focus:ring-purple-500"
                placeholder="Group Name"
                required={!isLogin}
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-1 focus:ring-purple-500"
              placeholder="name@org.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-1 focus:ring-purple-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-red-500 text-[11px] font-bold bg-red-50 p-2 rounded border border-red-100">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-800 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg font-display text-lg"
          >
            {loading ? 'Processing...' : (isLogin ? 'Unlock Portal' : 'Register Now')}
          </button>
        </form>

        {isDemo && isLogin && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-[10px]">
            <h4 className="font-bold text-amber-800 flex items-center mb-1 uppercase tracking-wider">Demo User Passwords: demo123</h4>
            <div className="grid grid-cols-1 gap-1">
              {DEMO_USERS.map(u => (
                <button 
                  key={u.uid}
                  onClick={() => fillDemoCreds(u.email)}
                  className="text-left py-0.5 hover:underline text-amber-700 font-medium"
                >
                  {u.role}: {u.email}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default LoginPage;
