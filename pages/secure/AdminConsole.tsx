import React, { useState } from 'react';
import { useAuth } from '../../services/firebase';
import { UserRole } from '../../types';

// Sub-Components
import ApplicationsList from './ApplicationsList';
import UserManagement from './UserManagement';
import AdminRounds from '../../views/AdminRounds';

// Icons
const AppIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);
const UsersIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);
const SettingsIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const AdminConsole: React.FC = () => {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'applications' | 'users' | 'rounds'>('applications');

  // NON-NEGOTIABLE: Committee area locked to user's assigned area.
  // Only Admin can see/toggle "All Areas".
  const assignedAreaId = user?.areaId;

  // Access Control Guard
  if (role !== 'admin' && role !== 'committee') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center p-8 bg-white shadow-lg rounded-lg border-l-4 border-red-500 max-w-md mx-auto">
                <div className="text-red-500 mb-4 flex justify-center">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold mb-2 text-gray-800">Access Denied</h2>
                <p className="text-gray-600">You do not have the required permissions to view the Administration Console.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Console Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                {role === 'admin' ? 'Master Admin Console' : 'Committee Portal'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
                {role === 'admin' 
                    ? 'Oversee all applications, users, and rounds.' 
                    : 'Manage applications and scoring for your assigned area.'}
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
             <span className="text-xs text-gray-400 uppercase tracking-wide mb-1">Assigned Region</span>
             <div className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${
                assignedAreaId 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                : 'bg-green-50 text-green-700 border-green-200'
             }`}>
                {assignedAreaId || (role === 'admin' ? 'Global / All Regions' : 'Unassigned')}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8 overflow-x-auto">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('applications')}
              className={`${
                activeTab === 'applications'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <AppIcon />
              Project Entries
            </button>
            
            {role === 'admin' && (
              <>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`${
                    activeTab === 'users'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                >
                    <UsersIcon />
                    User Management
                </button>
                
                <button
                    onClick={() => setActiveTab('rounds')}
                    className={`${
                    activeTab === 'rounds'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                >
                    <SettingsIcon />
                    Rounds & Settings
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Tab Content Container */}
        <div className="bg-white shadow rounded-lg p-6 min-h-[600px] border border-gray-100">
          {activeTab === 'applications' && (
            <ApplicationsList 
              userRole={role as UserRole} 
              assignedAreaId={assignedAreaId} 
            />
          )}
          
          {activeTab === 'users' && role === 'admin' && (
            <UserManagement />
          )}

          {activeTab === 'rounds' && role === 'admin' && (
            <AdminRounds />
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminConsole;
