import React, { useState, useMemo } from 'react';
import { useApplications, useAuth } from '../../services/firebase'; 
import { Link } from 'react-router-dom';
import { UserRole } from '../../types';

interface ApplicationsListProps {
  userRole: UserRole;
  assignedAreaId?: string;
}

const ApplicationsList: React.FC<ApplicationsListProps> = ({ userRole, assignedAreaId }) => {
  // Defensive destructuring: default to empty array if hook returns null/undefined
  // checks against the 'useApplications' hook from services/firebase.ts
  const { applications = [], loading, error, updateStatus } = useApplications(assignedAreaId);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredApps = useMemo(() => {
    // CRITICAL FIX: Ensure applications is an array before filtering to prevent crashes
    if (!applications || !Array.isArray(applications)) return [];
    
    return applications.filter((app) => {
      // Search Logic
      const searchTerm = filter.toLowerCase();
      const matchesSearch = (app.projectTitle || '').toLowerCase().includes(searchTerm) || 
                            (app.organisation || '').toLowerCase().includes(searchTerm) ||
                            (app.id || '').toLowerCase().includes(searchTerm);
      
      // Status Logic
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      
      // Strict Area Enforcement for Committee
      // If admin, show all (unless filtered by parent). If committee, ONLY show if areaId matches.
      // Note: The hook 'useApplications(assignedAreaId)' should already handle fetching the correct data,
      // but this client-side check is a double-safety mechanism.
      const matchesArea = userRole === 'admin' ? true : app.areaId === assignedAreaId;

      return matchesSearch && matchesStatus && matchesArea;
    });
  }, [applications, filter, statusFilter, userRole, assignedAreaId]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
        <span className="font-medium">Loading project entries...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200 shadow-sm">
        <h3 className="text-lg font-bold flex items-center mb-2">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Error loading applications
        </h3>
        <p>{error.message || "An unknown error occurred while fetching data."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <div className="relative flex-grow max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            type="text"
            placeholder="Search projects, IDs, or organisations..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
            <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</label>
            <select 
                id="status-filter"
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 outline-none min-w-[140px]"
            >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
            </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        {filteredApps.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No applications found</h3>
            <p className="mt-1 text-sm text-gray-500">There are no project entries matching your current filters.</p>
            {(filter || statusFilter !== 'all') && (
                <button 
                    onClick={() => {setFilter(''); setStatusFilter('all');}}
                    className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                >
                    Clear all filters
                </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Title</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organisation</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request (£)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                      <span title={app.id}>{app.id.substring(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                       <Link to={`/portal/applications/${app.id}`} className="hover:underline">
                        {app.projectTitle || 'Untitled Project'}
                       </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {app.organisation || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                       {/* Formatting Fix: UK Pounds */}
                      £{typeof app.amountRequested === 'number' ? app.amountRequested.toLocaleString('en-GB', { minimumFractionDigits: 2 }) : '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${app.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          app.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 
                          app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {(app.status || 'Draft').charAt(0).toUpperCase() + (app.status || 'draft').slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <Link 
                        to={`/portal/applications/${app.id}`}
                        className="text-indigo-600 hover:text-indigo-900 border border-indigo-200 px-3 py-1 rounded hover:bg-indigo-50 transition-colors"
                      >
                        Review
                      </Link>
                      {userRole === 'admin' && app.status === 'submitted' && (
                         <button
                            onClick={() => updateStatus && updateStatus(app.id, 'approved')}
                            className="text-green-600 hover:text-green-900 text-xs ml-2"
                         >
                            Approve
                         </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsList;
