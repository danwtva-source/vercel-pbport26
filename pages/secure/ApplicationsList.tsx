import React, { useState, useEffect } from 'react';
import { SecureLayout } from '../../components/Layout';
import { AuthService, DataService } from '../../services/firebase';
import { User, Application, UserRole } from '../../types';
import { FileText, Search, Filter, Eye, PenTool } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ApplicationsList: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const u = AuthService.getCurrentUser();
    if (!u) {
      navigate('/login');
      return;
    }
    setUser(u);
    DataService.getApplications(u).then(setApps).catch(console.error);
  }, [navigate]);

  const filteredApps = apps.filter(app => 
    app.applicant.toLowerCase().includes(filter.toLowerCase()) || 
    app.ref.toLowerCase().includes(filter.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-100 text-blue-800';
      case 'Scored': return 'bg-purple-100 text-purple-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) return null;

  return (
    <SecureLayout userRole={user.role}>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-purple-900 font-display">Applications</h1>
          <p className="text-gray-600">
            {user.role === UserRole.APPLICANT ? 'Track your submissions.' : `Managing applications for ${user.area}.`}
          </p>
        </div>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search applicant or ref..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 w-full md:w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-600 text-sm uppercase">Ref</th>
                <th className="px-6 py-4 font-bold text-gray-600 text-sm uppercase">Applicant</th>
                <th className="px-6 py-4 font-bold text-gray-600 text-sm uppercase">Area</th>
                <th className="px-6 py-4 font-bold text-gray-600 text-sm uppercase">Stage</th>
                <th className="px-6 py-4 font-bold text-gray-600 text-sm uppercase">Status</th>
                <th className="px-6 py-4 font-bold text-gray-600 text-sm uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredApps.length > 0 ? filteredApps.map((app) => (
                <tr key={app.ref} className="hover:bg-purple-50 transition">
                  <td className="px-6 py-4 font-mono text-sm font-bold text-purple-700">{app.ref}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{app.applicant}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.area}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.stage}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => navigate(`/portal/application/${app.ref}`)}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                    {(user.role === UserRole.COMMITTEE || user.role === UserRole.ADMIN) && app.stage === 'Part 2' && (
                      <button 
                        onClick={() => navigate('/portal/scoring')}
                        className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-100 rounded-lg transition"
                        title="Score Application"
                      >
                        <PenTool size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No applications found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SecureLayout>
  );
};

export default ApplicationsList;