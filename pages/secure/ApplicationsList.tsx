import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SecureLayout } from '../../components/Layout';
import { Button, Card, Badge, Input } from '../../components/UI';
import { api } from '../../services/firebase';
import { api as AuthService } from '../../services/firebase';
import { Application, UserRole, Area, ApplicationStatus } from '../../types';
import { FileText, Plus, Search, Filter, Download, Eye, Edit2, Trash2 } from 'lucide-react';

const ApplicationsList: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = AuthService.getCurrentUser();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'All'>('All');
  const [filterArea, setFilterArea] = useState<Area | 'All'>('All');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      let apps: Application[] = [];

      if (!currentUser) {
        navigate('/login');
        return;
      }

      // Load applications based on user role
      if (currentUser.role === UserRole.ADMIN) {
        // ADMIN: Get all applications
        apps = await api.getApplications('All');
      } else if (currentUser.role === UserRole.COMMITTEE) {
        // COMMITTEE: Get applications for their area
        if (currentUser.area) {
          apps = await api.getApplications(currentUser.area);
        } else {
          apps = await api.getApplications('All');
        }
      } else if (currentUser.role === UserRole.APPLICANT) {
        // APPLICANT: Get only their own applications
        const allApps = await api.getApplications('All');
        apps = allApps.filter(app => app.userId === currentUser.uid);
      } else {
        apps = [];
      }

      setApplications(apps);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteApplication(id);
      await loadApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Failed to delete application');
    }
  };

  const handleExport = () => {
    const csvData = filteredApplications.map(app => ({
      Ref: app.ref,
      Title: app.projectTitle,
      Organisation: app.orgName,
      Area: app.area,
      Status: app.status,
      Amount: app.amountRequested,
      TotalCost: app.totalCost,
      Applicant: app.applicantName,
      Created: new Date(app.createdAt).toLocaleDateString()
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row =>
        headers.map(header => {
          const val = (row as any)[header] ? String((row as any)[header]).replace(/,/g, ' ').replace(/"/g, '""') : '';
          return `"${val}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      app.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.orgName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicantName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'All' || app.status === filterStatus;
    const matchesArea = filterArea === 'All' || app.area === filterArea;

    return matchesSearch && matchesStatus && matchesArea;
  });

  // Determine permissions
  const canCreate = currentUser?.role === UserRole.APPLICANT || currentUser?.role === UserRole.ADMIN;
  const canEdit = (app: Application) => {
    if (currentUser?.role === UserRole.ADMIN) return true;
    if (currentUser?.role === UserRole.APPLICANT && app.userId === currentUser.uid) {
      // Applicants can only edit their own drafts or invited-stage2 applications
      return app.status === 'Draft' || app.status === 'Invited-Stage2';
    }
    return false;
  };
  const canDelete = (app: Application) => {
    if (currentUser?.role === UserRole.ADMIN) return true;
    if (currentUser?.role === UserRole.APPLICANT && app.userId === currentUser.uid) {
      return app.status === 'Draft';
    }
    return false;
  };

  if (!currentUser) {
    return null;
  }

  return (
    <SecureLayout userRole={currentUser.role as UserRole}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-900 font-display flex items-center gap-3">
              <FileText size={32} className="text-purple-600" />
              {currentUser.role === UserRole.APPLICANT ? 'My Applications' : 'Applications'}
            </h1>
            <p className="text-gray-600 mt-1">
              {currentUser.role === UserRole.APPLICANT && 'Manage your funding applications'}
              {currentUser.role === UserRole.COMMITTEE && `Reviewing applications for ${currentUser.area}`}
              {currentUser.role === UserRole.ADMIN && 'All applications across all areas'}
            </p>
          </div>
          <div className="flex gap-3">
            {filteredApplications.length > 0 && (
              <Button variant="outline" size="md" onClick={handleExport}>
                <Download size={18} />
                Export CSV
              </Button>
            )}
            {canCreate && (
              <Button variant="primary" size="md" onClick={() => navigate('/portal/application/new')}>
                <Plus size={18} />
                New Application
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ApplicationStatus | 'All')}
              className="px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted-Stage1">Submitted (Stage 1)</option>
              <option value="Rejected-Stage1">Rejected (Stage 1)</option>
              <option value="Invited-Stage2">Invited to Stage 2</option>
              <option value="Submitted-Stage2">Submitted (Stage 2)</option>
              <option value="Funded">Funded</option>
              <option value="Not-Funded">Not Funded</option>
            </select>

            {currentUser.role === UserRole.ADMIN && (
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value as Area | 'All')}
                className="px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
              >
                <option value="All">All Areas</option>
                <option value="Blaenavon">Blaenavon</option>
                <option value="Thornhill & Upper Cwmbran">Thornhill & Upper Cwmbran</option>
                <option value="Trevethin, Penygarn & St. Cadocs">Trevethin, Penygarn & St. Cadocs</option>
                <option value="Cross-Area">Cross-Area</option>
              </select>
            )}
          </div>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing <span className="font-bold text-purple-600">{filteredApplications.length}</span> of{' '}
            <span className="font-bold">{applications.length}</span> applications
          </span>
          {(searchTerm || filterStatus !== 'All' || filterArea !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('All');
                setFilterArea('All');
              }}
              className="text-purple-600 hover:text-purple-800 font-medium underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-bold">Loading applications...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredApplications.length === 0 && (
          <Card className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No applications found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterStatus !== 'All' || filterArea !== 'All'
                ? 'Try adjusting your filters'
                : canCreate
                ? 'Get started by creating your first application'
                : 'No applications available yet'}
            </p>
            {canCreate && !searchTerm && filterStatus === 'All' && (
              <Button variant="primary" onClick={() => navigate('/portal/application/new')}>
                <Plus size={18} />
                Create Application
              </Button>
            )}
          </Card>
        )}

        {/* Applications Table */}
        {!loading && filteredApplications.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-purple-50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-50 border-b-2 border-purple-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Ref
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Project Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Organisation
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Area
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-purple-50/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/portal/application/${app.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-bold text-purple-600">{app.ref}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{app.projectTitle}</div>
                        <div className="text-sm text-gray-500">{app.applicantName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{app.orgName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{app.area}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge>{app.status}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">£{app.amountRequested.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">of £{app.totalCost.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/portal/application/${app.id}`)}
                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          {canEdit(app) && (
                            <button
                              onClick={() => navigate(`/portal/application/${app.id}`)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                          {canDelete(app) && (
                            <button
                              onClick={() => handleDelete(app.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SecureLayout>
  );
};

export default ApplicationsList;
