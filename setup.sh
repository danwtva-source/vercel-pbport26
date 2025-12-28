#!/bin/bash

# 1. Create Directories
echo "Creating directory structure..."
mkdir -p src/lib
mkdir -p src/services
mkdir -p src/types
mkdir -p src/contexts
mkdir -p src/components/layout
mkdir -p src/components/common
mkdir -p src/pages/auth
mkdir -p src/pages/admin
mkdir -p src/pages/committee
mkdir -p src/pages/portal
mkdir -p public/assets

# 2. Create Configuration Files

echo "Generating package.json..."
cat << 'EOF' > package.json
{
  "name": "communities-choice-portal-v9",
  "private": true,
  "version": "9.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@heroicons/react": "^2.0.18",
    "@tailwindcss/forms": "^0.5.6",
    "clsx": "^2.0.0",
    "date-fns": "^2.30.0",
    "firebase": "^10.5.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.16.0",
    "tailwind-merge": "^1.14.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.45.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
EOF

echo "Generating tsconfig.json..."
cat << 'EOF' > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# Create dummy tsconfig.node.json to prevent errors
cat << 'EOF' > tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

echo "Generating vite.config.ts..."
cat << 'EOF' > vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
})
EOF

echo "Generating tailwind.config.js..."
cat << 'EOF' > tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        header: ['"DynaPuff"', 'cursive'],
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
EOF

echo "Generating postcss.config.js..."
cat << 'EOF' > postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

echo "Generating vercel.json..."
cat << 'EOF' > vercel.json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
EOF

echo "Generating firestore.rules..."
cat << 'EOF' > firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function getUserData() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
    function isAdmin() { return isAuthenticated() && getUserData().role == 'admin'; }
    function isCommittee() { return isAuthenticated() && getUserData().role == 'committee'; }

    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin() || isCommittee());
      allow write: if isAdmin();
    }
    match /applications/{appId} {
      allow read, write: if isAdmin();
      allow create: if isAuthenticated() && request.resource.data.applicantId == request.auth.uid;
      allow read: if isAuthenticated() && (resource.data.applicantId == request.auth.uid);
      allow update: if isAuthenticated() && resource.data.applicantId == request.auth.uid && resource.data.status in ['draft', 'draft_full'];
      allow read: if isCommittee() && (resource.data.area == getUserData().area || request.auth.uid in resource.data.assignments);
      allow update: if isCommittee() && (resource.data.area == getUserData().area || request.auth.uid in resource.data.assignments) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['scores']);
    }
  }
}
EOF

echo "Generating .gitignore..."
cat << 'EOF' > .gitignore
logs
*.log
npm-debug.log*
node_modules/
dist/
build/
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
EOF

echo "Generating index.html..."
cat << 'EOF' > index.html
<!doctype html>
<html lang="en" class="h-full bg-gray-50">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Communities' Choice Torfaen</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body class="h-full">
    <div id="root" class="h-full"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# 3. Create Source Files

echo "Generating src/main.tsx..."
cat << 'EOF' > src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

echo "Generating src/index.css..."
cat << 'EOF' > src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
}

body { @apply text-gray-900 antialiased; }
h1, h2, h3, h4, h5, h6 { font-feature-settings: "ss01", "ss02"; }
EOF

echo "Generating src/vite-env.d.ts..."
cat << 'EOF' > src/vite-env.d.ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
EOF

echo "Generating src/types/index.ts..."
cat << 'EOF' > src/types/index.ts
export type Area = 'Blaenavon' | 'Thornhill & Upper Cwmbran' | 'Trevethin–Penygarn–St Cadoc’s';
export type UserRole = 'admin' | 'committee' | 'applicant';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  area?: Area;
  assignedApplications?: string[];
}

export type ApplicationStatus = 'draft' | 'submitted_eoi' | 'approved_eoi' | 'rejected_eoi' | 'draft_full' | 'submitted_full' | 'scored';

export interface Application {
  id: string;
  applicantId: string;
  applicantName: string;
  title: string;
  area: Area;
  status: ApplicationStatus;
  requestedAmount: number;
  submittedAt: any;
  scores?: {
    [committeeMemberId: string]: {
      score: number;
      feedback: string;
      submittedAt: any;
    };
  };
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}
EOF

echo "Generating src/lib/firebase.ts..."
cat << 'EOF' > src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
EOF

echo "Generating src/contexts/AuthContext.tsx..."
cat << 'EOF' > src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isCommittee: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, loading: true, isAdmin: false, isCommittee: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setProfile(docSnap.data() as UserProfile);
        } catch (err) { console.error(err); }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { user, profile, loading, isAdmin: profile?.role === 'admin', isCommittee: profile?.role === 'committee' };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
EOF

echo "Generating src/services/applicationService.ts..."
cat << 'EOF' > src/services/applicationService.ts
import { collection, doc, getDocs, query, where, orderBy, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Application, Area } from '../types';

const COLLECTION = 'applications';

export const applicationService = {
  getAllApplications: async (): Promise<Application[]> => {
    const q = query(collection(db, COLLECTION), orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
  },
  getCommitteeApplications: async (userId: string, userArea?: Area): Promise<Application[]> => {
    if (userArea) {
      const q = query(collection(db, COLLECTION), where('area', '==', userArea), where('status', 'in', ['submitted_full', 'scored']));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
    }
    return [];
  },
  getMyApplications: async (userId: string): Promise<Application[]> => {
    const q = query(collection(db, COLLECTION), where('applicantId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
  },
  submitScore: async (applicationId: string, committeeId: string, scoreData: { score: number; feedback: string }) => {
    const appRef = doc(db, COLLECTION, applicationId);
    const updateField = `scores.${committeeId}`;
    await updateDoc(appRef, { [updateField]: { ...scoreData, submittedAt: Timestamp.now() } });
  }
};
EOF

echo "Generating src/components/layout/AppShell.tsx..."
cat << 'EOF' > src/components/layout/AppShell.tsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { HomeIcon, UsersIcon, DocumentTextIcon, Cog6ToothIcon, Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const LOGO_SRC = "/assets/logo-secure.png";

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const navigation = [
    { name: 'Dashboard', href: profile?.role === 'admin' ? '/admin' : (profile?.role === 'committee' ? '/committee' : '/portal'), icon: HomeIcon, current: location.pathname.includes('dashboard') || location.pathname === '/admin' || location.pathname === '/committee' },
    ...(profile?.role === 'admin' ? [
      { name: 'Applications', href: '/admin/applications', icon: DocumentTextIcon, current: location.pathname.includes('applications') },
      { name: 'Users', href: '/admin/users', icon: UsersIcon, current: location.pathname.includes('users') },
      { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon, current: location.pathname.includes('settings') },
    ] : []),
    ...(profile?.role === 'committee' ? [ { name: 'My Assignments', href: '/committee/assignments', icon: DocumentTextIcon, current: location.pathname.includes('assignments') }, ] : []),
    ...(profile?.role === 'applicant' ? [ { name: 'My Applications', href: '/portal/applications', icon: DocumentTextIcon, current: location.pathname.includes('applications') }, ] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="lg:hidden flex items-center justify-between bg-white p-4 border-b border-gray-200">
        <span className="font-header font-bold text-brand-600">Communities' Choice</span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-600">
          {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-20 border-b border-gray-200 px-6">
             <span className="font-header font-bold text-brand-600 text-xl">Communities' Choice</span>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <Link key={item.name} to={item.href} className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${item.current ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>
                <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${item.current ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">{profile?.displayName?.charAt(0) || 'U'}</div>
              <div className="ml-3"><p className="text-sm font-medium text-gray-700">{profile?.displayName || 'User'}</p><p className="text-xs text-gray-500 capitalize">{profile?.role}</p></div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 py-8 px-4 sm:px-8">{children}</main>
      </div>
    </div>
  );
};
export default AppShell;
EOF

echo "Generating src/components/common/Placeholders.tsx..."
cat << 'EOF' > src/components/common/Placeholders.tsx
import React from 'react';
import AppShell from '../layout/AppShell';
export const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <AppShell>
     <div className="mb-8"><h1 className="text-3xl font-header font-bold text-gray-900">{title}</h1></div>
     <div className="rounded-md bg-yellow-50 p-4"><div className="flex"><div className="ml-3"><h3 className="text-sm font-medium text-yellow-800">Under Construction</h3></div></div></div>
  </AppShell>
);
EOF

echo "Generating src/pages/auth/Login.tsx..."
cat << 'EOF' > src/pages/auth/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await signInWithEmailAndPassword(auth, email, password); navigate('/admin'); } 
    catch (err) { setError('Failed to sign in.'); } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 font-header">Sign in to Communities' Choice</h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="block w-full px-3 py-2 border rounded-md" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="block w-full px-3 py-2 border rounded-md" />
            <button type="submit" disabled={loading} className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">{loading ? '...' : 'Sign in'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
EOF

echo "Generating src/pages/admin/AdminDashboard.tsx..."
cat << 'EOF' > src/pages/admin/AdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Application, Area } from '../../types';
import AppShell from '../../components/layout/AppShell';
import { FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Card = ({ children }: { children: React.ReactNode }) => <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">{children}</div>;

export default function AdminDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filterArea, setFilterArea] = useState<Area | 'All'>('All');
  useEffect(() => {
    const fetchApps = async () => {
        const q = query(collection(db, 'applications'), orderBy('submittedAt', 'desc'));
        const snapshot = await getDocs(q);
        setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application)));
    };
    fetchApps();
  }, []);
  const filteredApps = filterArea === 'All' ? applications : applications.filter(app => app.area === filterArea);
  return (
    <AppShell>
      <div className="mb-8"><h1 className="text-3xl font-header font-bold text-gray-900">Admin Dashboard</h1></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card><p className="text-sm text-gray-500">Total Applications</p><p className="text-3xl font-bold">{applications.length}</p></Card>
      </div>
      <div className="flex gap-4 mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <select value={filterArea} onChange={(e) => setFilterArea(e.target.value as any)} className="block w-full rounded-md border-gray-300">
            <option value="All">All Areas</option>
            <option value="Blaenavon">Blaenavon</option>
            <option value="Thornhill & Upper Cwmbran">Thornhill & Upper Cwmbran</option>
            <option value="Trevethin–Penygarn–St Cadoc’s">Trevethin–Penygarn–St Cadoc’s</option>
        </select>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50"><tr><th className="py-3.5 pl-4 text-left text-sm font-semibold text-gray-900">Project</th><th className="px-3 py-3.5 text-left text-sm font-semibold">Area</th><th className="px-3 py-3.5 text-left text-sm font-semibold">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredApps.map((app) => (
              <tr key={app.id}>
                <td className="whitespace-nowrap py-4 pl-4 text-sm font-medium text-gray-900">{app.title}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{app.area}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{app.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
EOF

echo "Generating src/pages/committee/CommitteeDashboard.tsx..."
cat << 'EOF' > src/pages/committee/CommitteeDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { applicationService } from '../../services/applicationService';
import { Application } from '../../types';
import AppShell from '../../components/layout/AppShell';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function CommitteeDashboard() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Application[]>([]);
  const [scoringApp, setScoringApp] = useState<Application | null>(null);

  useEffect(() => {
    if (user && profile) {
      applicationService.getCommitteeApplications(user.uid, profile.area).then(setTasks);
    }
  }, [user, profile]);

  const hasScored = (app: Application) => user && app.scores && app.scores[user.uid];

  return (
    <AppShell>
      <div className="mb-8"><h1 className="text-3xl font-header font-bold text-gray-900">Committee Dashboard</h1></div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((app) => (
          <div key={app.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <div className="flex justify-between items-start">
               <h3 className="text-lg font-semibold">{app.title}</h3>
               {hasScored(app) && <CheckCircleIcon className="h-6 w-6 text-green-500" />}
             </div>
             <p className="mt-1 text-sm text-gray-500">£{app.requestedAmount}</p>
             <button onClick={() => setScoringApp(app)} disabled={!!hasScored(app)} className="mt-4 w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-gray-100 disabled:text-gray-400">
               {hasScored(app) ? 'Score Submitted' : 'Evaluate & Score'}
             </button>
          </div>
        ))}
      </div>
      {scoringApp && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500 bg-opacity-75">
           <div className="bg-white p-6 rounded-lg max-w-lg w-full">
             <h3 className="text-xl font-bold">Score {scoringApp.title}</h3>
             <button className="mt-4 bg-brand-600 text-white px-4 py-2 rounded" onClick={async () => {
                await applicationService.submitScore(scoringApp.id, user.uid, { score: 10, feedback: "Great project" });
                setScoringApp(null);
                // In real app, refresh tasks here
             }}>Simulate Submit Score 10</button>
             <button className="ml-2 text-gray-600" onClick={() => setScoringApp(null)}>Cancel</button>
           </div>
        </div>
      )}
    </AppShell>
  );
}
EOF

echo "Generating src/pages/portal/ApplicantPortal.tsx..."
cat << 'EOF' > src/pages/portal/ApplicantPortal.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { applicationService } from '../../services/applicationService';
import { Application } from '../../types';
import AppShell from '../../components/layout/AppShell';

export default function ApplicantPortal() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  useEffect(() => {
    if (user) applicationService.getMyApplications(user.uid).then(setApplications);
  }, [user]);

  return (
    <AppShell>
      <div className="mb-8"><h2 className="text-2xl font-header font-bold text-gray-900">My Applications</h2></div>
      <div className="bg-white shadow sm:rounded-md border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {applications.map((app) => (
            <li key={app.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-brand-600">{app.title}</p>
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">{app.status}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
EOF

echo "Generating src/App.tsx..."
cat << 'EOF' > src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import CommitteeDashboard from './pages/committee/CommitteeDashboard';
import ApplicantPortal from './pages/portal/ApplicantPortal';
import { PlaceholderPage } from './components/common/Placeholders';

const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles: string[] }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user || !profile) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(profile.role)) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'committee') return <Navigate to="/committee" replace />;
    return <Navigate to="/portal" replace />;
  }
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/applications" element={<ProtectedRoute allowedRoles={['admin']}><PlaceholderPage title="Application Management" /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><PlaceholderPage title="User Management" /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><PlaceholderPage title="System Settings" /></ProtectedRoute>} />
          <Route path="/committee" element={<ProtectedRoute allowedRoles={['committee']}><CommitteeDashboard /></ProtectedRoute>} />
          <Route path="/committee/assignments" element={<ProtectedRoute allowedRoles={['committee']}><PlaceholderPage title="My Assignments" /></ProtectedRoute>} />
          <Route path="/portal" element={<ProtectedRoute allowedRoles={['applicant']}><ApplicantPortal /></ProtectedRoute>} />
          <Route path="/portal/applications" element={<ProtectedRoute allowedRoles={['applicant']}><ApplicantPortal /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
EOF

echo "Generating Documentation..."
echo "# QA Checklist" > QA_CHECKLIST.md
echo "# Migration Notes" > MIGRATION_NOTES.md
echo "# Feature Matrix" > FEATURE_MATRIX.md
echo "# Communities Choice v9" > README.md

echo "Initializing Git..."
git init

echo "--------------------------------------------------------"
echo "✅ Project Generation Complete!"
echo "Next Steps:"
echo "1. Run: npm install"
echo "2. Create a .env file with your VITE_FIREBASE keys"
echo "3. Run: npm run dev"
echo "--------------------------------------------------------"
EOF
