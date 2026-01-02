import React, { useState } from 'react';
import { useAuth } from '../../services/firebase';
import { UserRole } from '../../types';
import ApplicationsList from './ApplicationsList';
import UserManagement from './UserManagement';
import AdminRounds from '../../views/AdminRounds';

const AdminConsole: React.FC = () => {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'applications' | 'users' | 'rounds'>('applications');
  const assignedAreaId = user?.areaId;

  if (role !== 'admin' && role !== 'committee') {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto py-6 px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{role === 'admin' ? 'Master Admin Console' : 'Committee Portal'}</h1>
          <div className="text-right">
             <span className="text-xs text-gray-400 uppercase">Region</span>
             <div className="font-bold text-indigo-700">{assignedAreaId || (role === 'admin' ? 'Global' : 'Unassigned')}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 mb-8 flex space-x-8">
            <button onClick={() => setActiveTab('applications')} className={`py-4 px-1 border-b-2 font-medium ${activeTab === 'applications' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>Project Entries</button>
            {role === 'admin' && (
              <>
                <button onClick={() => setActiveTab('users')} className={`py-4 px-1 border-b-2 font-medium ${activeTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>User Management</button>
                <button onClick={() => setActiveTab('rounds')} className={`py-4 px-1 border-b-2 font-medium ${activeTab === 'rounds' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>Rounds & Settings</button>
              </>
            )}
        </div>

        <div className="bg-white shadow rounded p-6 min-h-[400px]">
          {activeTab === 'applications' && <ApplicationsList userRole={role as UserRole} assignedAreaId={assignedAreaId} />}
          {activeTab === 'users' && role === 'admin' && <UserManagement />}
          {activeTab === 'rounds' && role === 'admin' && <AdminRounds />}
        </div>
      </main>
    </div>
  );
};

export default AdminConsole;
