import os

# Define the file paths and their merged content
files = {
    "tailwind.config.js": """/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"DynaPuff"', 'cursive'], // Branding Requirement
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          900: '#0c4a6e',
        },
        // Torfaen Areas
        blaenavon: '#e11d48',
        thornhill: '#059669',
        trevethin: '#7c3aed',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}""",

    "src/config/areas.ts": """export const AREA_OPTIONS = [
  "Blaenavon",
  "Thornhill & Upper Cwmbran",
  "Trevethin–Penygarn–St Cadoc’s"
] as const;

export type AreaName = typeof AREA_OPTIONS[number];""",

    "src/App.tsx": """import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
// Assumes you have migrated the layout components from Branch 2
import PublicLayout from './layouts/PublicLayout'; 
import AppLayout from './layouts/AppLayout';       

// Pages
import Landing from './pages/public/Landing';
import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import CommitteeDashboard from './pages/committee/CommitteeDashboard';
import ApplicantDashboard from './pages/applicant/ApplicantDashboard';
import ApplicationForm from './pages/application/ApplicationForm';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Secure Routes */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          
          <Route path="/admin/*" element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/committee/*" element={
            <ProtectedRoute requiredRole="committee">
              <CommitteeDashboard />
            </ProtectedRoute>
          } />

          <Route path="/portal/*" element={
            <ProtectedRoute requiredRole="applicant">
              <ApplicantDashboard />
            </ProtectedRoute>
          } />

          <Route path="/apply/:roundId" element={<ApplicationForm />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}""",

    "src/pages/admin/AdminDashboard.tsx": """import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getSystemStats } from '../../services/firestore/adminService';
// Ensure these UI components exist from Branch 2 migration
import { StatsCard } from '../../components/ui/StatsCard';
import { ApplicationsTable } from '../../components/admin/ApplicationsTable';
import { Loader } from '../../components/ui/Loader';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getSystemStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to load admin stats", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-gray-900">Admin Console</h1>
        <p className="text-gray-500">Overview of Communities’ Choice Torfaen</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Total Applications" value={stats?.totalApps || 0} icon="document" />
        <StatsCard title="Open Rounds" value={stats?.openRounds || 0} icon="clock" />
        <StatsCard title="Total Funds Req" value={`£${stats?.totalFunds || 0}`} icon="currency" />
      </div>

      {/* SCORING TASKS REMOVED: Only Admin Management below */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
        </div>
        <ApplicationsTable />
      </div>
    </div>
  );
}""",

    "src/pages/committee/CommitteeDashboard.tsx": """import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAssignedApplications } from '../../services/firestore/committeeService';
import { ScoringCard } from '../../components/committee/ScoringCard';

export default function CommitteeDashboard() {
  const { user, userProfile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (user?.uid && userProfile?.area) {
      getAssignedApplications(user.uid, userProfile.area).then(setTasks);
    }
  }, [user, userProfile]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
             {userProfile?.area || 'Committee'} Dashboard
          </h1>
          <p className="text-gray-500">Review and score applications for your area.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tasks.map(app => (
          <ScoringCard 
            key={app.id} 
            application={app}
            actionLink={`/committee/score/${app.id}`} 
          />
        ))}
        {tasks.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No applications currently assigned for scoring.</p>
          </div>
        )}
      </div>
    </div>
  );
}""",

    "firestore.rules": """rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isCommittee() {
      return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'committee';
    }
    
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin() || isCommittee();
      allow write: if isOwner(userId) || isAdmin();
    }

    match /applications/{appId} {
      allow read, write: if isAdmin();
      
      allow create: if request.auth != null;
      allow read: if resource.data.userId == request.auth.uid;
      allow update: if resource.data.userId == request.auth.uid && resource.data.status == 'draft';
      
      allow read: if isCommittee() && (
        resource.data.area == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.area
        || request.auth.uid in resource.data.assignedScorers
      );
    }

    match /applications/{appId}/scores/{scoreId} {
      allow read: if isAdmin() || (isCommittee() && request.auth.uid == scoreId);
      allow write: if isCommittee() && request.auth.uid == scoreId;
    }
  }
}""",

    "MIGRATION_NOTES.md": """# Migration Notes: v7 + v8 Synthesis

## 1. Functional Changes
- **Admin Dashboard:** Removed scoring capability. Admin is for oversight only.
- **Committee Dashboard:** Added exclusive `ScoringCard` UI for assigned applications.
- **Areas:** Hardcoded in `src/config/areas.ts` to Blaenavon, Thornhill, and Trevethin.

## 2. Branding
- **Font:** DynaPuff (Headers) + Inter (Body).
- **Colors:** Updated `tailwind.config.js` with Branch 2 palette.

## 3. Security
- `firestore.rules` updated to prevent cross-area peeking for Committee members.

## 4. Setup
1. Run `npm install`
2. Ensure `.env` has Firebase keys.
3. Run `npm run dev` and verify Login redirects.
"""
}

def create_files():
    print("🚀 Starting Synthesis...")
    for path, content in files.items():
        # Create directories if they don't exist
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # Write the file
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Created/Updated: {path}")
    
    print("\\n🎉 Synthesis Complete! Please run 'npm install' and then 'npm run dev'.")

if __name__ == "__main__":
    create_files()