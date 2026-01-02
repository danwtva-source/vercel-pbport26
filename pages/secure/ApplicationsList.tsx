import React, { useState, useMemo } from 'react';
import { useApplications, useAuth } from '../../services/firebase'; 
import { Link } from 'react-router-dom';
import { UserRole } from '../../types';

interface ApplicationsListProps {
  userRole: UserRole;
  assignedAreaId?: string;
}

const ApplicationsList: React.FC<ApplicationsListProps> = ({ userRole, assignedAreaId }) => {
  const { applications = [], loading, error, updateStatus } = useApplications(assignedAreaId);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredApps = useMemo(() => {
    if (!applications || !Array.isArray(applications)) return [];
    
    return applications.filter((app) => {
      const searchTerm = filter.toLowerCase();
      const matchesSearch = (app.projectTitle || '').toLowerCase().includes(searchTerm) || 
                            (app.organisation || '').toLowerCase().includes(searchTerm) ||
                            (app.id || '').toLowerCase().includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
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
        <h3 className="text-lg font-bold flex items-center mb-2">Error loading applications</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <div className="relative flex-grow max-w-lg">
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
            <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md bg-white outline-none"
            >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
            </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        {filteredApps.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No applications found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organisation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request (£)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">{app.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 text-sm font-medium text-indigo-600">
                       <Link to={`/portal/applications/${app.id}`}>{app.projectTitle || 'Untitled'}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{app.organisation || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-medium">£{app.amountRequested?.toLocaleString('en-GB') || '0.00'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800`}>
                        {app.status || 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <Link to={`/portal/applications/${app.id}`} className="text-indigo-600 hover:text-indigo-900">Review</Link>
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
