import React, { useState, useEffect } from 'react';
import { SecureLayout } from '../../components/Layout';
import { Button, Card, Input, Modal, Badge, BarChart } from '../../components/UI';
import { DataService, exportToCSV, uploadFile as uploadToStorage } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Application, User, Round, AdminDocument, AuditLog, PortalSettings, Score, Vote } from '../../types';
import { ScoringMonitor } from '../../components/ScoringMonitor';
import { formatCurrency, ROUTES } from '../../utils';
import {
  BarChart3, Users, FileText, Settings as SettingsIcon, Clock, Download,
  Plus, Trash2, Edit, Save, X, CheckCircle, XCircle, AlertCircle,
  Eye, Upload, FolderOpen, Calendar, Search, Filter, TrendingUp,
  UserCheck, FileCheck, Activity, ShieldCheck
} from 'lucide-react';

// ============================================================================
// ADMIN CONSOLE - MASTER CONTROL PANEL
// ============================================================================
//
// CRITICAL: This component is for ADMIN ONLY
//
// ADMIN CAN:
// ✓ View master application list with ALL data
// ✓ Change application status (Invite to Stage 2, Mark as Funded, Reject, etc.)
// ✓ User management (CRUD operations)
// ✓ Round management (create/edit funding rounds)
// ✓ Document management (upload resources)
// ✓ View audit logs
// ✓ View KPI dashboard
// ✓ View scoring MONITOR (see which committee members scored which apps)
// ✓ Configure portal settings
// ✓ Export data to CSV
//
// ADMIN CANNOT:
// ✗ Submit scores for applications (that's committee-only)
// ✗ Have scoring form UI (they can VIEW scores, not SUBMIT)
//
// ============================================================================

const AdminConsole: React.FC = () => {
  // Get current user from auth context
  const { userProfile: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'masterlist' | 'users' | 'rounds' | 'documents' | 'logs' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [isScoringMode, setIsScoringMode] = useState(false);
  const [authCheckRunning, setAuthCheckRunning] = useState(false);
  const [authCheckResult, setAuthCheckResult] = useState<{
    missing: User[];
    errors: { email: string; message: string }[];
    checked: number;
  } | null>(null);
  const [repairingUser, setRepairingUser] = useState<User | null>(null);
  const [repairPassword, setRepairPassword] = useState('');
  const [repairSubmitting, setRepairSubmitting] = useState(false);
  const [normalizingUsers, setNormalizingUsers] = useState(false);

  // Data state
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [settings, setSettings] = useState<PortalSettings>({
    stage1Visible: true,
    stage2Visible: false,
    votingOpen: false,
    scoringThreshold: 50
  });

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'app' | 'user' | 'round' | 'document'>('app');

  // Load all data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [appsData, usersData, roundsData, docsData, logsData, scoresData, settingsData, votesData] = await Promise.all([
        DataService.getApplications(),
        DataService.getUsers(),
        DataService.getRounds(),
        DataService.getDocuments(),
        DataService.getAuditLogs(),
        DataService.getScores(),
        DataService.getPortalSettings(),
        DataService.getVotes()
      ]);

      // CRITICAL: Enrich apps with computed metrics (matching v7 implementation)
      const enrichedApps = appsData.map(app => {
        const appScores = scoresData.filter(s => s.appId === app.id);
        const appVotes = votesData.filter(v => v.appId === app.id);
        const avg = appScores.length > 0
          ? Math.round(appScores.reduce((sum, curr) => sum + curr.weightedTotal, 0) / appScores.length)
          : 0;
        const yes = appVotes.filter(v => v.decision === 'yes').length;
        const no = appVotes.filter(v => v.decision === 'no').length;

        return {
          ...app,
          averageScore: avg,
          scoreCount: appScores.length,
          voteCountYes: yes,
          voteCountNo: no
        } as any;
      });

      setApplications(enrichedApps);
      setUsers(usersData);
      setRounds(roundsData);
      setDocuments(docsData);
      setAuditLogs(logsData);
      setScores(scoresData);
      setSettings(settingsData);
      void runAuthConsistencyCheck(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAuthConsistencyCheck = async (usersData: User[]) => {
    setAuthCheckRunning(true);
    try {
      const result = await DataService.checkAuthConsistency(usersData);
      setAuthCheckResult(result);
    } catch (error: any) {
      setAuthCheckResult({
        missing: [],
        errors: [{ email: 'N/A', message: error?.message || 'Failed to check auth consistency' }],
        checked: usersData.length
      });
    } finally {
      setAuthCheckRunning(false);
    }
  };

  const handleNormalizeUsers = async () => {
    if (!confirm('Normalize roles and uid fields for all users? This updates Firestore records.')) return;
    setNormalizingUsers(true);
    try {
      const result = await DataService.normalizeUsers();
      alert(`User normalization complete. Updated ${result.updated} records.`);
      await loadAllData();
    } catch (error: any) {
      alert(error?.message || 'Failed to normalize users');
    } finally {
      setNormalizingUsers(false);
    }
  };

  const handleRepairAuthUser = async () => {
    if (!repairingUser) return;
    if (repairPassword.length < 6) {
      alert('Please enter a temporary password (minimum 6 characters).');
      return;
    }
    setRepairSubmitting(true);
    try {
      await DataService.repairAuthUser(repairingUser, repairPassword);
      alert(`Auth account created for ${repairingUser.email}. Share the temporary password securely.`);
      setRepairingUser(null);
      setRepairPassword('');
      await loadAllData();
    } catch (error: any) {
      alert(error?.message || 'Failed to repair auth account');
    } finally {
      setRepairSubmitting(false);
    }
  };

  // ============================================================================
  // TAB: OVERVIEW - KPI DASHBOARD
  // ============================================================================

  const OverviewTab = () => {
    const totalApps = applications.length;
    const submittedStage1 = applications.filter(a => a.status === 'Submitted-Stage1').length;
    const invitedStage2 = applications.filter(a => a.status === 'Invited-Stage2').length;
    const submittedStage2 = applications.filter(a => a.status === 'Submitted-Stage2').length;
    const funded = applications.filter(a => a.status === 'Funded').length;
    const rejected = applications.filter(a => (a.status || '').includes('Rejected')).length;

    const committeeMembers = users.filter(u => u.role === 'committee').length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const applicants = users.filter(u => u.role === 'applicant').length;

    const totalScoresSubmitted = scores.length;
    const uniqueScorers = new Set(scores.map(s => s.scorerId)).size;

    const totalFundingRequested = applications.reduce((sum, app) => sum + (app.amountRequested || 0), 0);
    const totalFunded = applications.filter(a => a.status === 'Funded').reduce((sum, app) => sum + (app.amountRequested || 0), 0);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-purple-900 mb-2">Admin Dashboard</h2>
            <p className="text-gray-600">Complete overview of the participatory budgeting portal</p>
          </div>
          <Button onClick={() => setIsScoringMode(true)} variant="secondary">
            <BarChart3 size={18} className="mr-2" />
            Enter Committee Tasks Overview
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-bold">Total Applications</p>
                <p className="text-3xl font-bold text-purple-900">{totalApps}</p>
              </div>
              <FileText className="text-purple-500" size={40} />
            </div>
          </Card>

          <Card className="border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-bold">Stage 1 Submitted</p>
                <p className="text-3xl font-bold text-blue-900">{submittedStage1}</p>
              </div>
              <FileCheck className="text-blue-500" size={40} />
            </div>
          </Card>

          <Card className="border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-bold">Invited to Stage 2</p>
                <p className="text-3xl font-bold text-amber-900">{invitedStage2}</p>
              </div>
              <AlertCircle className="text-amber-500" size={40} />
            </div>
          </Card>

          <Card className="border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-bold">Funded Projects</p>
                <p className="text-3xl font-bold text-green-900">{funded}</p>
              </div>
              <CheckCircle className="text-green-500" size={40} />
            </div>
          </Card>

          <Card className="border-l-4 border-teal-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-bold">Committee Members</p>
                <p className="text-3xl font-bold text-teal-900">{committeeMembers}</p>
              </div>
              <Users className="text-teal-500" size={40} />
            </div>
          </Card>

          <Card className="border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-bold">Scores Submitted</p>
                <p className="text-3xl font-bold text-indigo-900">{totalScoresSubmitted}</p>
              </div>
              <BarChart3 className="text-indigo-500" size={40} />
            </div>
          </Card>

          <Card className="border-l-4 border-rose-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-bold">Total Requested</p>
                <p className="text-2xl font-bold text-rose-900">{formatCurrency(totalFundingRequested)}</p>
              </div>
              <TrendingUp className="text-rose-500" size={40} />
            </div>
          </Card>

          <Card className="border-l-4 border-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-bold">Total Funded</p>
                <p className="text-2xl font-bold text-emerald-900">{formatCurrency(totalFunded)}</p>
              </div>
              <CheckCircle className="text-emerald-500" size={40} />
            </div>
          </Card>
        </div>

        {/* Application Status Chart */}
        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
            <BarChart3 size={24} />
            Application Status Distribution
          </h3>
          <BarChart data={[
            { label: 'Draft', value: applications.filter(a => a.status === 'Draft').length },
            { label: 'Submitted Stage 1', value: applications.filter(a => a.status === 'Submitted-Stage1').length },
            { label: 'Invited Stage 2', value: applications.filter(a => a.status === 'Invited-Stage2').length },
            { label: 'Submitted Stage 2', value: applications.filter(a => a.status === 'Submitted-Stage2').length },
            { label: 'Funded', value: applications.filter(a => a.status === 'Funded').length }
          ]} />
        </Card>

        {/* Scoring Monitor - VIEW ONLY (NO SUBMISSION) */}
        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Activity size={24} />
            Scoring Monitor
            <span className="text-sm font-normal text-gray-500">(View Only - Admins cannot submit scores)</span>
          </h3>
          <div className="space-y-3">
            {applications.filter(a => a.status === 'Submitted-Stage2' || a.status === 'Invited-Stage2').map(app => {
              const appScores = scores.filter(s => s.appId === app.id);
              const scorerNames = appScores.map(s => {
                const user = users.find(u => u.uid === s.scorerId);
                return user?.displayName || s.scorerName || 'Unknown';
              });

              return (
                <div key={app.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{app.ref} - {app.projectTitle}</p>
                      <p className="text-sm text-gray-600">{app.orgName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-700">{appScores.length} / {committeeMembers} scored</p>
                      {appScores.length > 0 && (
                        <p className="text-xs text-gray-500">
                          Avg: {(appScores.reduce((sum, s) => sum + s.weightedTotal, 0) / appScores.length).toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                  {appScores.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {scorerNames.map((name, i) => (
                        <Badge key={i} variant="green">{name}</Badge>
                      ))}
                    </div>
                  )}
                  {appScores.length === 0 && (
                    <p className="text-sm text-gray-400 mt-2">No scores submitted yet</p>
                  )}
                </div>
              );
            })}
            {applications.filter(a => a.status === 'Submitted-Stage2' || a.status === 'Invited-Stage2').length === 0 && (
              <p className="text-gray-500 text-center py-8">No applications in Stage 2 scoring phase</p>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Clock size={24} />
            Recent Activity
          </h3>
          <div className="space-y-2">
            {auditLogs.slice(0, 10).map(log => (
              <div key={log.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-100">
                <div className="flex items-center gap-3">
                  <Activity size={16} className="text-purple-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">{log.action}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge variant="gray">{log.targetId}</Badge>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // ============================================================================
  // TAB: MASTER LIST - ALL APPLICATIONS WITH STATUS MANAGEMENT
  // ============================================================================

  const MasterListTab = () => {
    const filteredApps = applications.filter(app => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (app.projectTitle || '').toLowerCase().includes(searchLower) ||
                           (app.orgName || '').toLowerCase().includes(searchLower) ||
                           (app.ref || '').toLowerCase().includes(searchLower) ||
                           (app.applicantName || '').toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const handleStatusChange = async (appId: string, newStatus: string) => {
      try {
        await DataService.updateApplication(appId, { status: newStatus as any });
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'APP_STATUS_CHANGE',
          targetId: appId,
          details: { newStatus }
        });
        await loadAllData();
      } catch (error) {
        console.error('Error updating status:', error);
        alert('Failed to update status');
      }
    };

    const handleExportCSV = () => {
      const exportData = applications.map(app => ({
        Ref: app.ref,
        Project: app.projectTitle,
        Organisation: app.orgName,
        Area: app.area,
        Status: app.status,
        AmountRequested: app.amountRequested,
        Applicant: app.applicantName,
        CreatedDate: new Date(app.createdAt).toLocaleDateString()
      }));
      exportToCSV(exportData, `applications-export-${Date.now()}`);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-purple-900 mb-2">Master Application List</h2>
            <p className="text-gray-600">View and manage all applications with complete data access</p>
          </div>
          <Button onClick={handleExportCSV} variant="secondary">
            <Download size={18} />
            Export to CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by project, organisation, or ref..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Submitted-Stage1">Submitted - Stage 1</option>
                <option value="Invited-Stage2">Invited to Stage 2</option>
                <option value="Submitted-Stage2">Submitted - Stage 2</option>
                <option value="Funded">Funded</option>
                <option value="Not-Funded">Not Funded</option>
                <option value="Rejected-Stage1">Rejected - Stage 1</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Applications Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Ref</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Project Title</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Organisation</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Area</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Amount</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Stage 1 (Votes)</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Stage 2 (Score)</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Status</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(app => {
                  const enrichedApp = app as any;
                  return (
                    <tr key={app.id} className="border-b border-gray-100 hover:bg-purple-50 transition">
                      <td className="p-3 font-mono text-sm font-bold">{app.ref || '-'}</td>
                      <td className="p-3">
                        <p className="font-bold text-gray-800">{app.projectTitle || 'Untitled'}</p>
                        <p className="text-xs text-gray-500">{app.applicantName || '-'}</p>
                      </td>
                      <td className="p-3 text-sm">{app.orgName || '-'}</td>
                      <td className="p-3 text-sm">{app.area || '-'}</td>
                      <td className="p-3 text-sm font-bold">{formatCurrency(app.amountRequested || 0)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-600 font-bold">{enrichedApp.voteCountYes || 0} Yes</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-red-500 font-bold">{enrichedApp.voteCountNo || 0} No</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {enrichedApp.averageScore ? (
                          <Badge className={enrichedApp.averageScore >= (settings.scoringThreshold || 50) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {enrichedApp.averageScore}% ({enrichedApp.scoreCount})
                          </Badge>
                        ) : '-'}
                      </td>
                      <td className="p-3">
                        <Badge>{app.status}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setModalType('app');
                              setShowModal(true);
                            }}
                            className="p-2 hover:bg-purple-100 rounded-lg transition text-purple-700"
                            title="View & Edit"
                          >
                            <Eye size={16} />
                          </button>
                          <select
                            className="text-xs p-1 rounded border border-gray-200 bg-white"
                            value={app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          >
                            <option value="Draft">Draft</option>
                            <option value="Submitted-Stage1">Submitted - Stage 1</option>
                            <option value="Invited-Stage2">Invite to Stage 2</option>
                            <option value="Submitted-Stage2">Submitted - Stage 2</option>
                            <option value="Funded">Mark as Funded</option>
                            <option value="Not-Funded">Mark as Not Funded</option>
                            <option value="Rejected-Stage1">Reject Stage 1</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredApps.length === 0 && (
              <p className="text-gray-500 text-center py-8">No applications found</p>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // ============================================================================
  // TAB: USERS - USER MANAGEMENT (CRUD)
  // ============================================================================

  const UsersTab = () => {
    const [newUser, setNewUser] = useState<Partial<User>>({ role: 'applicant', area: null });
    const [newPassword, setNewPassword] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleCreateUser = async () => {
      if (!newUser.email || !newUser.displayName) {
        alert('Please fill in email and display name');
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        alert('Please enter a password (minimum 6 characters)');
        return;
      }
      try {
        await DataService.adminCreateUser(newUser as User, newPassword);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'USER_CREATE',
          targetId: newUser.email,
          details: { role: newUser.role }
        });
        setNewUser({ role: 'applicant', area: null });
        setNewPassword('');
        await loadAllData();
        alert('User created successfully');
      } catch (error: any) {
        console.error('Error creating user:', error);
        alert(error.message || 'Failed to create user');
      }
    };

    const handleUpdateUser = async (user: User) => {
      try {
        await DataService.updateUser(user);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'USER_UPDATE',
          targetId: user.uid,
          details: { role: user.role }
        });
        setEditingUser(null);
        await loadAllData();
      } catch (error) {
        console.error('Error updating user:', error);
        alert('Failed to update user');
      }
    };

    const handleDeleteUser = async (uid: string) => {
      if (!confirm('Are you sure you want to delete this user?')) return;
      try {
        await DataService.deleteUser(uid);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'USER_DELETE',
          targetId: uid
        });
        await loadAllData();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-purple-900 mb-2">User Management</h2>
          <p className="text-gray-600">Create, edit, and manage user accounts</p>
        </div>

        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-purple-900">Auth Consistency Check</h3>
              <p className="text-sm text-gray-600">
                Verifies Firestore users against Firebase Auth sign-in methods.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => runAuthConsistencyCheck(users)} disabled={authCheckRunning}>
                {authCheckRunning ? 'Checking...' : 'Recheck Auth Consistency'}
              </Button>
              <Button variant="secondary" onClick={handleNormalizeUsers} disabled={normalizingUsers}>
                {normalizingUsers ? 'Normalizing...' : 'Normalize Roles & UID'}
              </Button>
            </div>
          </div>

          {authCheckResult && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-600">
                Checked {authCheckResult.checked} users. Missing auth accounts: {authCheckResult.missing.length}.
              </p>
              {authCheckResult.errors.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="font-bold">Auth check warnings</p>
                  <ul className="list-disc pl-5">
                    {authCheckResult.errors.map(error => (
                      <li key={`${error.email}-${error.message}`}>
                        {error.email}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {authCheckResult.missing.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-bold text-red-700">Users missing Firebase Auth accounts</p>
                  <div className="mt-2 space-y-2">
                    {authCheckResult.missing.map(user => (
                      <div key={user.uid} className="flex flex-col gap-2 rounded-lg bg-white p-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">{user.displayName || user.email}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <Button variant="outline" onClick={() => setRepairingUser(user)}>
                          Repair Auth Account
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Create User */}
        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Plus size={24} />
            Create New User
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="email"
              placeholder="Email *"
              className="px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
              value={newUser.email || ''}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password * (min 6 chars)"
              className="px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="text"
              placeholder="Display Name *"
              className="px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
              value={newUser.displayName || ''}
              onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              className="px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
            >
              <option value="applicant">Applicant</option>
              <option value="committee">Committee</option>
              <option value="admin">Admin</option>
            </select>
            {(newUser.role === 'committee' || newUser.role === 'applicant') && (
              <select
                className="px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
                value={newUser.area || ''}
                onChange={(e) => setNewUser({ ...newUser, area: e.target.value as any || null })}
              >
                <option value="">Select Area</option>
                <option value="Blaenavon">Blaenavon</option>
                <option value="Thornhill & Upper Cwmbran">Thornhill & Upper Cwmbran</option>
                <option value="Trevethin, Penygarn & St. Cadocs">Trevethin, Penygarn & St. Cadocs</option>
              </select>
            )}
            <Button onClick={handleCreateUser}>
              <Plus size={18} />
              Create User
            </Button>
          </div>
        </Card>

        {/* Users Table */}
        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-4">All Users ({users.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Email</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Name</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Role</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Area</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.uid} className="border-b border-gray-100 hover:bg-purple-50 transition">
                    <td className="p-3 text-sm">{user.email}</td>
                    <td className="p-3 font-bold">{user.displayName || user.username}</td>
                    <td className="p-3">
                      <Badge variant={user.role === 'admin' ? 'red' : user.role === 'committee' ? 'purple' : 'blue'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{user.area || 'N/A'}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-700"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.uid)}
                          className="p-2 hover:bg-red-100 rounded-lg transition text-red-700"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Edit User Modal */}
        {editingUser && (
          <Modal isOpen={true} onClose={() => setEditingUser(null)} title="Edit User" size="md">
            <div className="space-y-4">
              <Input
                label="Email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
              />
              <Input
                label="Display Name"
                value={editingUser.displayName || ''}
                onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
              />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Role</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                >
                  <option value="applicant">Applicant</option>
                  <option value="committee">Committee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {(editingUser.role === 'committee' || editingUser.role === 'applicant') && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Assigned Area</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                    value={editingUser.area || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, area: e.target.value as any || null })}
                  >
                    <option value="">No Area Assigned</option>
                    <option value="Blaenavon">Blaenavon</option>
                    <option value="Thornhill & Upper Cwmbran">Thornhill & Upper Cwmbran</option>
                    <option value="Trevethin, Penygarn & St. Cadocs">Trevethin, Penygarn & St. Cadocs</option>
                  </select>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button onClick={() => handleUpdateUser(editingUser)}>
                  <Save size={18} />
                  Save Changes
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {repairingUser && (
          <Modal isOpen={true} onClose={() => setRepairingUser(null)} title="Repair Auth Account" size="sm">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Create a Firebase Auth account for <span className="font-bold">{repairingUser.email}</span>.
                This will generate a temporary password that you should share securely.
              </p>
              <Input
                label="Temporary Password"
                type="password"
                value={repairPassword}
                onChange={(e) => setRepairPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setRepairingUser(null)}>Cancel</Button>
                <Button onClick={handleRepairAuthUser} disabled={repairSubmitting}>
                  {repairSubmitting ? 'Repairing...' : 'Create Auth Account'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  };

  // ============================================================================
  // TAB: ROUNDS - FUNDING ROUND MANAGEMENT
  // ============================================================================

  const RoundsTab = () => {
    const [newRound, setNewRound] = useState<Partial<Round>>({
      name: '',
      year: new Date().getFullYear(),
      status: 'planning',
      areas: [],
      stage1Open: false,
      stage2Open: false,
      scoringOpen: false
    });
    const [editingRound, setEditingRound] = useState<Round | null>(null);

    const handleCreateRound = async () => {
      if (!newRound.name || !newRound.startDate || !newRound.endDate) {
        alert('Please fill in all required fields');
        return;
      }
      const id = 'round_' + Date.now();
      try {
        await DataService.createRound({ ...newRound, id } as Round);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'ROUND_CREATE',
          targetId: id,
          details: { name: newRound.name }
        });
        setNewRound({ name: '', year: new Date().getFullYear(), status: 'planning', areas: [] });
        await loadAllData();
      } catch (error) {
        console.error('Error creating round:', error);
        alert('Failed to create round');
      }
    };

    const handleDeleteRound = async (id: string) => {
      if (!confirm('Are you sure you want to delete this round?')) return;
      try {
        await DataService.deleteRound(id);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'ROUND_DELETE',
          targetId: id
        });
        await loadAllData();
      } catch (error) {
        console.error('Error deleting round:', error);
        alert('Failed to delete round');
      }
    };

    const handleUpdateRound = async (round: Round) => {
      try {
        await DataService.updateRound(round.id, round);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'ROUND_UPDATE',
          targetId: round.id,
          details: { name: round.name, status: round.status }
        });
        setEditingRound(null);
        await loadAllData();
      } catch (error) {
        console.error('Error updating round:', error);
        alert('Failed to update round');
      }
    };

    const handleToggleRoundStatus = async (round: Round, field: 'stage1Open' | 'stage2Open' | 'scoringOpen') => {
      try {
        const updated = { ...round, [field]: !round[field] };
        await DataService.updateRound(round.id, { [field]: !round[field] });
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'ROUND_TOGGLE',
          targetId: round.id,
          details: { field, newValue: !round[field] }
        });
        await loadAllData();
      } catch (error) {
        console.error('Error toggling round status:', error);
        alert('Failed to update round');
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-purple-900 mb-2">Funding Rounds</h2>
          <p className="text-gray-600">Create and manage funding rounds</p>
        </div>

        {/* Create Round */}
        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Plus size={24} />
            Create New Round
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Round Name"
              placeholder="e.g., Communities' Choice 2026"
              value={newRound.name}
              onChange={(e) => setNewRound({ ...newRound, name: e.target.value })}
            />
            <Input
              label="Year"
              type="number"
              value={newRound.year}
              onChange={(e) => setNewRound({ ...newRound, year: parseInt(e.target.value) })}
            />
            <Input
              label="Start Date"
              type="date"
              value={newRound.startDate}
              onChange={(e) => setNewRound({ ...newRound, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={newRound.endDate}
              onChange={(e) => setNewRound({ ...newRound, endDate: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <Button onClick={handleCreateRound}>
              <Plus size={18} />
              Create Round
            </Button>
          </div>
        </Card>

        {/* Rounds List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rounds.map(round => (
            <Card key={round.id} className="border-l-4 border-purple-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-purple-900">{round.name}</h3>
                  <p className="text-sm text-gray-600">Year: {round.year}</p>
                </div>
                <Badge variant={round.status === 'open' ? 'green' : round.status === 'closed' ? 'gray' : 'amber'}>
                  {round.status}
                </Badge>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-sm">
                  <span className="font-bold">Period:</span> {round.startDate} to {round.endDate}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleToggleRoundStatus(round, 'stage1Open')}
                    className={`px-2 py-1 text-xs font-bold rounded-full cursor-pointer transition hover:opacity-80 ${round.stage1Open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Stage 1: {round.stage1Open ? 'Open' : 'Closed'}
                  </button>
                  <button
                    onClick={() => handleToggleRoundStatus(round, 'stage2Open')}
                    className={`px-2 py-1 text-xs font-bold rounded-full cursor-pointer transition hover:opacity-80 ${round.stage2Open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Stage 2: {round.stage2Open ? 'Open' : 'Closed'}
                  </button>
                  <button
                    onClick={() => handleToggleRoundStatus(round, 'scoringOpen')}
                    className={`px-2 py-1 text-xs font-bold rounded-full cursor-pointer transition hover:opacity-80 ${round.scoringOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Scoring: {round.scoringOpen ? 'Open' : 'Closed'}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingRound(round)}>
                  <Edit size={14} />
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDeleteRound(round.id)}>
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
          {rounds.length === 0 && (
            <p className="text-gray-500 col-span-2 text-center py-8">No funding rounds created yet</p>
          )}
        </div>

        {/* Edit Round Modal */}
        {editingRound && (
          <Modal isOpen={true} onClose={() => setEditingRound(null)} title="Edit Round" size="md">
            <div className="space-y-4">
              <Input
                label="Round Name"
                value={editingRound.name}
                onChange={(e) => setEditingRound({ ...editingRound, name: e.target.value })}
              />
              <Input
                label="Year"
                type="number"
                value={editingRound.year}
                onChange={(e) => setEditingRound({ ...editingRound, year: parseInt(e.target.value) })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={editingRound.startDate}
                  onChange={(e) => setEditingRound({ ...editingRound, startDate: e.target.value })}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={editingRound.endDate}
                  onChange={(e) => setEditingRound({ ...editingRound, endDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Round Status</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={editingRound.status}
                  onChange={(e) => setEditingRound({ ...editingRound, status: e.target.value as any })}
                >
                  <option value="planning">Planning</option>
                  <option value="open">Open</option>
                  <option value="scoring">Scoring</option>
                  <option value="voting">Voting</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setEditingRound(null)}>Cancel</Button>
                <Button onClick={() => handleUpdateRound(editingRound)}>
                  <Save size={18} />
                  Save Changes
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  };

  // ============================================================================
  // TAB: DOCUMENTS - DOCUMENT MANAGEMENT
  // ============================================================================

  const DocumentsTab = () => {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [editingDoc, setEditingDoc] = useState<AdminDocument | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string>('root');
    const [newDoc, setNewDoc] = useState<Partial<AdminDocument>>({
      name: '',
      type: 'file',
      category: 'general',
      parentId: 'root'
    });
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    const handleUploadDocument = async () => {
      if (!newDoc.name) {
        alert('Please provide a document name');
        return;
      }
      try {
        const id = 'doc_' + Date.now();
        let fileUrl: string | undefined;

        // Upload file to Firebase Storage if a file was selected
        if (uploadFile) {
          const timestamp = Date.now();
          const ext = uploadFile.name.split('.').pop();
          const storagePath = `admin-documents/${id}_${timestamp}.${ext}`;
          fileUrl = await uploadToStorage(storagePath, uploadFile);
        }

        const docData: AdminDocument = {
          id,
          name: newDoc.name!,
          type: newDoc.type as 'file' | 'folder',
          parentId: newDoc.parentId as string,
          category: newDoc.category as 'general' | 'minutes' | 'policy' | 'committee-only',
          uploadedBy: currentUser?.uid || 'admin',
          createdAt: Date.now(),
          url: fileUrl
        };
        await DataService.createDocument(docData);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'DOCUMENT_CREATE',
          targetId: id,
          details: { name: newDoc.name, type: newDoc.type }
        });
        setNewDoc({ name: '', type: 'file', category: 'general', parentId: 'root' });
        setUploadFile(null);
        setShowUploadModal(false);
        await loadAllData();
      } catch (error) {
        console.error('Error uploading document:', error);
        alert('Failed to upload document');
      }
    };

    const handleCreateFolder = async () => {
      if (!newDoc.name) {
        alert('Please provide a folder name');
        return;
      }
      try {
        const id = 'folder_' + Date.now();
        const folderData: AdminDocument = {
          id,
          name: newDoc.name!,
          type: 'folder',
          parentId: newDoc.parentId as string || 'root',
          category: newDoc.category as 'general' | 'minutes' | 'policy' | 'committee-only',
          uploadedBy: currentUser?.uid || 'admin',
          createdAt: Date.now()
        };
        await DataService.createDocument(folderData);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'FOLDER_CREATE',
          targetId: id,
          details: { name: newDoc.name }
        });
        setNewDoc({ name: '', type: 'file', category: 'general', parentId: 'root' });
        setShowFolderModal(false);
        await loadAllData();
      } catch (error) {
        console.error('Error creating folder:', error);
        alert('Failed to create folder');
      }
    };

    const handleDeleteDocument = async (id: string, name: string) => {
      if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
      try {
        await DataService.deleteDocument(id);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'DOCUMENT_DELETE',
          targetId: id,
          details: { name }
        });
        await loadAllData();
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document');
      }
    };

    const handleUpdateDocument = async (doc: AdminDocument) => {
      try {
        await DataService.updateDocument(doc.id, { name: doc.name, category: doc.category });
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'DOCUMENT_UPDATE',
          targetId: doc.id,
          details: { name: doc.name }
        });
        setEditingDoc(null);
        await loadAllData();
      } catch (error) {
        console.error('Error updating document:', error);
        alert('Failed to update document');
      }
    };

    const handleOpenDocument = (doc: AdminDocument) => {
      if (!doc.url) {
        alert('No file is attached to this document yet.');
        return;
      }
      window.open(doc.url, '_blank', 'noopener,noreferrer');
    };

    const folders = documents.filter(d => d.type === 'folder');
    const files = documents.filter(d => d.type === 'file');
    const folderMap = new Map(folders.map(folder => [folder.id, folder]));
    const visibleFolders = folders.filter(folder => folder.parentId === currentFolderId);
    const visibleFiles = files.filter(file => file.parentId === currentFolderId);
    const folderPath: AdminDocument[] = [];
    let cursor = currentFolderId;
    while (cursor !== 'root') {
      const folder = folderMap.get(cursor);
      if (!folder) break;
      folderPath.unshift(folder);
      cursor = folder.parentId as string;
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-purple-900 mb-2">Document Management</h2>
            <p className="text-gray-600">Upload and manage resources for committee members</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewDoc((prev) => ({ ...prev, parentId: currentFolderId }));
                setShowFolderModal(true);
              }}
            >
              <FolderOpen size={18} />
              New Folder
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setNewDoc((prev) => ({ ...prev, parentId: currentFolderId }));
                setShowUploadModal(true);
              }}
            >
              <Upload size={18} />
              Upload Document
            </Button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <button
            onClick={() => setCurrentFolderId('root')}
            className={`font-semibold ${currentFolderId === 'root' ? 'text-purple-700' : 'text-gray-600 hover:text-purple-700'}`}
          >
            All Documents
          </button>
          {folderPath.map((folder) => (
            <React.Fragment key={folder.id}>
              <span className="text-gray-400">/</span>
              <button
                onClick={() => setCurrentFolderId(folder.id)}
                className="font-semibold text-gray-600 hover:text-purple-700"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Folders */}
        {visibleFolders.length > 0 && (
          <Card>
            <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
              <FolderOpen size={20} />
              Folders
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {visibleFolders.map(folder => (
                <div
                  key={folder.id}
                  className="p-4 bg-amber-50 rounded-lg border border-amber-200 hover:border-amber-400 transition cursor-pointer"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <FolderOpen className="text-amber-600" size={24} />
                    <span className="font-bold text-gray-800 truncate">{folder.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="amber">{folder.category}</Badge>
                    <div className="flex gap-1">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingDoc(folder);
                        }}
                        className="p-1 hover:bg-amber-100 rounded transition text-amber-700"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteDocument(folder.id, folder.name);
                        }}
                        className="p-1 hover:bg-red-100 rounded transition text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Files */}
        <Card>
          <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
            <FileText size={20} />
            Documents ({visibleFiles.length})
          </h3>
          <div className="space-y-3">
            {visibleFiles.map(doc => (
              <div key={doc.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between hover:border-purple-300 transition">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                    <FileText className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{doc.name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="gray">{doc.category}</Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenDocument(doc)}
                    className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-700"
                  >
                    <Eye size={16} />
                  </button>
                  <button onClick={() => setEditingDoc(doc)} className="p-2 hover:bg-purple-100 rounded-lg transition text-purple-700">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDeleteDocument(doc.id, doc.name)} className="p-2 hover:bg-red-100 rounded-lg transition text-red-700">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {visibleFiles.length === 0 && (
              <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
            )}
          </div>
        </Card>

        {/* Upload Modal */}
        {showUploadModal && (
          <Modal isOpen={true} onClose={() => setShowUploadModal(false)} title="Upload Document" size="md">
            <div className="space-y-4">
              <Input
                label="Document Name"
                placeholder="Enter document name"
                value={newDoc.name || ''}
                onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
              />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={newDoc.category}
                  onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value as any })}
                >
                  <option value="general">General</option>
                  <option value="minutes">Minutes</option>
                  <option value="policy">Policy</option>
                  <option value="committee-only">Committee Only</option>
                </select>
              </div>
              {folders.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Parent Folder</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                    value={newDoc.parentId}
                    onChange={(e) => setNewDoc({ ...newDoc, parentId: e.target.value })}
                  >
                    <option value="root">Root</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                <Button onClick={handleUploadDocument}>
                  <Upload size={18} />
                  Upload
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Folder Modal */}
        {showFolderModal && (
          <Modal isOpen={true} onClose={() => setShowFolderModal(false)} title="Create Folder" size="md">
            <div className="space-y-4">
              <Input
                label="Folder Name"
                placeholder="Enter folder name"
                value={newDoc.name || ''}
                onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
              />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={newDoc.category}
                  onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value as any })}
                >
                  <option value="general">General</option>
                  <option value="minutes">Minutes</option>
                  <option value="policy">Policy</option>
                  <option value="committee-only">Committee Only</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowFolderModal(false)}>Cancel</Button>
                <Button onClick={handleCreateFolder}>
                  <FolderOpen size={18} />
                  Create Folder
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Edit Document Modal */}
        {editingDoc && (
          <Modal isOpen={true} onClose={() => setEditingDoc(null)} title={`Edit ${editingDoc.type === 'folder' ? 'Folder' : 'Document'}`} size="md">
            <div className="space-y-4">
              <Input
                label="Name"
                value={editingDoc.name}
                onChange={(e) => setEditingDoc({ ...editingDoc, name: e.target.value })}
              />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={editingDoc.category}
                  onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value as any })}
                >
                  <option value="general">General</option>
                  <option value="minutes">Minutes</option>
                  <option value="policy">Policy</option>
                  <option value="committee-only">Committee Only</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setEditingDoc(null)}>Cancel</Button>
                <Button onClick={() => handleUpdateDocument(editingDoc)}>
                  <Save size={18} />
                  Save Changes
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  };

  // ============================================================================
  // TAB: LOGS - AUDIT TRAIL
  // ============================================================================

  const LogsTab = () => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-purple-900 mb-2">Audit Logs</h2>
          <p className="text-gray-600">Complete audit trail of administrative actions</p>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Timestamp</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Action</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Target</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Admin</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-purple-50 transition">
                    <td className="p-3 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3">
                      <Badge variant="purple">{log.action}</Badge>
                    </td>
                    <td className="p-3 text-sm font-mono">{log.targetId}</td>
                    <td className="p-3 text-sm">{log.adminId}</td>
                    <td className="p-3 text-xs text-gray-500">
                      {log.details ? JSON.stringify(log.details).substring(0, 50) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && (
              <p className="text-gray-500 text-center py-8">No audit logs found</p>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // ============================================================================
  // TAB: SETTINGS - PORTAL CONFIGURATION
  // ============================================================================

  const SettingsTab = () => {
    const [localSettings, setLocalSettings] = useState(settings);

    const handleSaveSettings = async () => {
      try {
        await DataService.updatePortalSettings(localSettings);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'SETTINGS_UPDATE',
          targetId: 'global',
          details: localSettings
        });
        setSettings(localSettings);
        alert('Settings saved successfully');
      } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings');
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-purple-900 mb-2">Portal Settings</h2>
          <p className="text-gray-600">Configure global portal settings and visibility</p>
        </div>

        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-6">Stage Visibility</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-bold text-gray-800">Stage 1 Visible</p>
                <p className="text-sm text-gray-600">Allow applicants to submit Stage 1 (EOI) applications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={localSettings.stage1Visible}
                  onChange={(e) => setLocalSettings({ ...localSettings, stage1Visible: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-bold text-gray-800">Stage 2 Visible</p>
                <p className="text-sm text-gray-600">Allow invited applicants to submit Stage 2 (Full) applications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={localSettings.stage2Visible}
                  onChange={(e) => setLocalSettings({ ...localSettings, stage2Visible: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-bold text-gray-800">Voting Open</p>
                <p className="text-sm text-gray-600">Enable public voting on applications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={localSettings.votingOpen}
                  onChange={(e) => setLocalSettings({ ...localSettings, votingOpen: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-6">Scoring Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Scoring Threshold (0-100)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  className="flex-1"
                  value={localSettings.scoringThreshold}
                  onChange={(e) => setLocalSettings({ ...localSettings, scoringThreshold: parseInt(e.target.value) })}
                />
                <span className="text-2xl font-bold text-purple-900 w-16 text-right">
                  {localSettings.scoringThreshold}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Applications must score above this threshold to be considered for funding
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSaveSettings}>
            <Save size={18} />
            Save All Settings
          </Button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading) {
    return (
      <SecureLayout userRole={UserRole.ADMIN}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin console...</p>
          </div>
        </div>
      </SecureLayout>
    );
  }

  // If in scoring mode, show ScoringMonitor instead of tabs
  if (isScoringMode) {
    return (
      <SecureLayout userRole={UserRole.ADMIN}>
        <ScoringMonitor onExit={() => setIsScoringMode(false)} />
      </SecureLayout>
    );
  }

  return (
    <SecureLayout userRole={UserRole.ADMIN}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 p-3 rounded-xl">
            <ShieldCheck className="text-purple-700" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-purple-900">Admin Console</h1>
            <p className="text-gray-600">Master control panel for the participatory budgeting portal</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-x-auto">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-b-4 border-purple-600 text-purple-900 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BarChart3 size={18} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('masterlist')}
              className={`px-6 py-4 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'masterlist'
                  ? 'border-b-4 border-purple-600 text-purple-900 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText size={18} />
              Master List
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-4 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'border-b-4 border-purple-600 text-purple-900 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users size={18} />
              Users
            </button>
            <button
              onClick={() => setActiveTab('rounds')}
              className={`px-6 py-4 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'rounds'
                  ? 'border-b-4 border-purple-600 text-purple-900 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar size={18} />
              Rounds
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-4 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'documents'
                  ? 'border-b-4 border-purple-600 text-purple-900 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FolderOpen size={18} />
              Documents
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-6 py-4 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'logs'
                  ? 'border-b-4 border-purple-600 text-purple-900 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Clock size={18} />
              Audit Logs
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-4 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'border-b-4 border-purple-600 text-purple-900 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SettingsIcon size={18} />
              Settings
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'masterlist' && <MasterListTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'rounds' && <RoundsTab />}
          {activeTab === 'documents' && <DocumentsTab />}
          {activeTab === 'logs' && <LogsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>

        {/* Application Detail Modal */}
        {showModal && selectedApp && modalType === 'app' && (
          <Modal isOpen={true} onClose={() => { setShowModal(false); setSelectedApp(null); }} title={`Application: ${selectedApp.ref}`} size="xl">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-600">Project Title</p>
                  <p className="text-lg font-bold">{selectedApp.projectTitle}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-600">Organisation</p>
                  <p className="text-lg font-bold">{selectedApp.orgName}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-600">Area</p>
                  <p className="text-lg">{selectedApp.area}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-600">Amount Requested</p>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(selectedApp.amountRequested)}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-600">Status</p>
                  <Badge>{selectedApp.status}</Badge>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-600">Applicant</p>
                  <p className="text-lg">{selectedApp.applicantName}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600">Summary</p>
                <p className="text-gray-800 mt-1">{selectedApp.summary}</p>
              </div>

              {/* View Scores (READ ONLY - NO SUBMISSION) */}
              <div>
                <p className="text-sm font-bold text-gray-600 mb-2">Scores Received (View Only)</p>
                {scores.filter(s => s.appId === selectedApp.id).map(score => {
                  const scorer = users.find(u => u.uid === score.scorerId);
                  return (
                    <div key={score.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2">
                      <div className="flex justify-between items-center">
                        <p className="font-bold">{scorer?.displayName || score.scorerName}</p>
                        <Badge variant="green">Score: {score.weightedTotal.toFixed(1)}</Badge>
                      </div>
                    </div>
                  );
                })}
                {scores.filter(s => s.appId === selectedApp.id).length === 0 && (
                  <p className="text-gray-500 text-sm">No scores submitted yet</p>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </SecureLayout>
  );
};

export default AdminConsole;
