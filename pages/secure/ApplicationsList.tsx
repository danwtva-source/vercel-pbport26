import React, { useState, useMemo } from 'react';
import { useApplications } from '../../services/firebase'; // Hook assumed to exist
import { Application, UserRole } from '../../types';
import { Link } from 'react-router-dom';

interface ApplicationsListProps {
  userRole: UserRole;
  assignedAreaId?: string;
}

const ApplicationsList: React.FC<ApplicationsListProps> = ({ userRole, assignedAreaId }) => {
  // Defensive check: default to empty array if hook returns null/undefined
  const { applications = [], loading, error, updateStatus } = useApplications(assignedAreaId);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredApps = useMemo(() => {
    // CRITICAL FIX: Ensure applications is an array before filtering
    if (!applications || !Array.isArray(applications)) return [];
    
    return applications.filter((app) => {
      const matchesSearch = (app.projectTitle || '').toLowerCase().includes(filter.toLowerCase()) || 
                            (app.organisation || '').toLowerCase().includes(filter.toLowerCase());
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      
      // Strict Area Enforcement for Committee
      // If admin, show all. If committee, ONLY show if areaId matches.
      const matchesArea = userRole === 'admin' ? true : app.areaId === assignedAreaId;

      return matchesSearch && matchesStatus && matchesArea;
    });
  }, [applications, filter, statusFilter, userRole, assignedAreaId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
        <span>Loading project entries...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
        <strong>Error loading applications:</strong> {error.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative flex-grow max-w-lg">
          <input
            type="text"
            placeholder="Search projects, IDs, or organisations..."
            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status:</span>
            <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500"
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
            <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">No applications found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {/* Handle potentially long IDs gracefully */}
                      <span title={app.id}>{app.id.substring(0, 8)}...</span>
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
                      £{typeof app.amountRequested === 'number' ? app.amountRequested.toLocaleString('en-GB') : '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
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
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Review
                      </Link>
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
