import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SecureLayout } from '../../components/Layout';
import { Button, Card, Input, Modal, Badge, BarChart } from '../../components/UI';
import { DataService, exportToCSV, uploadFile as uploadToStorage, seedAllTestData } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Application, User, Round, AuditLog, PortalSettings, Score, Vote, PublicVote, DocumentFolder, DocumentItem, DocumentVisibility, Assignment, Announcement } from '../../types';
import { ScoringMonitor } from '../../components/ScoringMonitor';
import { formatCurrency, ROUTES } from '../../utils';
import { AREA_NAMES, getAreaColor } from '../../constants';
import {
  BarChart3, Users, FileText, Settings as SettingsIcon, Clock, Download,
  Plus, Trash2, Edit, Save, X, CheckCircle, XCircle, AlertCircle,
  Eye, Upload, FolderOpen, Calendar, Search, Filter, TrendingUp,
  UserCheck, FileCheck, Activity, ShieldCheck, ClipboardList,
  DollarSign, Calculator, Bell, MapPin
} from 'lucide-react';
import { FinancialDashboard } from '../../components/FinancialDashboard';
import { CoefficientConfig } from '../../components/CoefficientConfig';
import { AnnouncementEditor } from '../../components/AnnouncementEditor';

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
  const { userProfile: currentUser, loading: authLoading } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const resolveTab = (tab: string | null) => {
    if (
      tab === 'overview'
      || tab === 'masterlist'
      || tab === 'users'
      || tab === 'assignments'
      || tab === 'rounds'
      || tab === 'financials'
      || tab === 'coefficients'
      || tab === 'announcements'
      || tab === 'documents'
      || tab === 'logs'
      || tab === 'settings'
    ) {
      return tab;
    }
    return 'overview';
  };
  const [activeTab, setActiveTab] = useState<'overview' | 'masterlist' | 'users' | 'assignments' | 'rounds' | 'financials' | 'coefficients' | 'announcements' | 'documents' | 'logs' | 'settings'>(
    () => resolveTab(searchParams.get('tab'))
  );
  const tabParam = searchParams.get('tab');
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

  useEffect(() => {
    const resolvedTab = resolveTab(tabParam);
    if (resolvedTab !== activeTab) {
      setActiveTab(resolvedTab);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams(prevParams => {
      const nextParams = new URLSearchParams(prevParams);
      if (tab === 'overview') {
        nextParams.delete('tab');
      } else {
        nextParams.set('tab', tab);
      }
      return nextParams;
    });
  };

  // Data state
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [documentFolders, setDocumentFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [publicVotes, setPublicVotes] = useState<PublicVote[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [settings, setSettings] = useState<PortalSettings>({
    stage1Visible: true,
    stage1VotingOpen: false,
    stage2Visible: false,
    stage2ScoringOpen: false,
    votingOpen: false,
    publicVotingStartDate: undefined,
    publicVotingEndDate: undefined,
    scoringThreshold: 50,
    resultsReleased: false
  });

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [areaFilter, setAreaFilter] = useState<string>('All');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'app' | 'user' | 'round' | 'document'>('app');
  const [assignmentCommitteeFilter, setAssignmentCommitteeFilter] = useState<string>('All');
  const [assignmentRoundFilter, setAssignmentRoundFilter] = useState<string>('All');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<string>('All');
  const [newAssignment, setNewAssignment] = useState<{
    applicationId: string;
    committeeId: string;
    dueDate: string;
    status: Assignment['status'];
  }>({
    applicationId: '',
    committeeId: '',
    dueDate: '',
    status: 'assigned'
  });
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  // Bulk assignment state
  const [bulkAssignment, setBulkAssignment] = useState<{
    area: string;
    stage: 'stage1' | 'stage2';
    dueDate: string;
  }>({
    area: '',
    stage: 'stage1',
    dueDate: ''
  });
  const [bulkAssignmentLoading, setBulkAssignmentLoading] = useState(false);
  const [assignmentStats, setAssignmentStats] = useState<{
    total: number;
    byStatus: Record<string, number>;
    byArea: Record<string, number>;
    byCommittee: Record<string, { assigned: number; completed: number; name: string }>;
    overdueCount: number;
  } | null>(null);

  // Financial and Coefficient state
  const [selectedRoundForConfig, setSelectedRoundForConfig] = useState<string | null>(null);
  const [financialRecords, setFinancialRecords] = useState<Record<string, any>>({});

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const publicVoteCounts = publicVotes.reduce<Record<string, number>>((acc, vote) => {
    acc[vote.applicationId] = (acc[vote.applicationId] || 0) + 1;
    return acc;
  }, {});

  // Load all data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [appsData, usersData, roundsData, folderData, docsData, logsData, scoresData, settingsData, votesData, publicVotesData, assignmentsData, announcementsData] = await Promise.all([
        DataService.getApplications(),
        DataService.getUsers(),
        DataService.getRounds(),
        DataService.getDocumentFolders(),
        DataService.getDocuments(),
        DataService.getAuditLogs(),
        DataService.getScores(),
        DataService.getPortalSettings(),
        DataService.getVotes(),
        DataService.getPublicVotes(),
        DataService.getAssignments(),
        DataService.getAllAnnouncements()
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
      setDocumentFolders(folderData);
      setDocuments(docsData);
      setAuditLogs(logsData);
      setScores(scoresData);
      setPublicVotes(publicVotesData);
      setSettings(settingsData);
      setAssignments(assignmentsData);
      setAnnouncements(announcementsData);
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
      const matchesArea = areaFilter === 'All' || app.area === areaFilter;
      return matchesSearch && matchesStatus && matchesArea;
    });

    const handleStatusChange = async (appId: string, newStatus: string) => {
      try {
        // Find the application to get applicant info
        const app = applications.find(a => a.id === appId);

        await DataService.updateApplication(appId, { status: newStatus as any });
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'APP_STATUS_CHANGE',
          targetId: appId,
          details: { newStatus, previousStatus: app?.status }
        });

        // Send notification to applicant for key status changes
        if (app?.userId) {
          if (newStatus === 'Invited-Stage2') {
            await DataService.createNotification({
              recipientId: app.userId,
              type: 'application_invited',
              title: 'Invitation to Part 2!',
              message: `Great news! Your application "${app.projectTitle}" has been invited to submit a full Part 2 application.`,
              relatedId: appId,
              link: '/portal/applications',
              area: app.area
            });
          } else if (newStatus === 'Funded') {
            await DataService.createNotification({
              recipientId: app.userId,
              type: 'application_funded',
              title: 'Application Funded!',
              message: `Congratulations! Your application "${app.projectTitle}" has been approved for funding.`,
              relatedId: appId,
              link: '/portal/applications',
              area: app.area
            });
          } else if (newStatus === 'Not-Funded') {
            await DataService.createNotification({
              recipientId: app.userId,
              type: 'application_not_funded',
              title: 'Application Update',
              message: `Your application "${app.projectTitle}" was not selected for funding in this round. Thank you for participating.`,
              relatedId: appId,
              link: '/portal/applications',
              area: app.area
            });
          } else if (newStatus === 'Rejected-Stage1') {
            await DataService.createNotification({
              recipientId: app.userId,
              type: 'application_not_funded',
              title: 'Application Update',
              message: `Your EOI "${app.projectTitle}" was not selected to proceed to Part 2. Thank you for your submission.`,
              relatedId: appId,
              link: '/portal/applications',
              area: app.area
            });
          }
        }

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                style={{
                  borderLeftColor: areaFilter !== 'All' ? getAreaColor(areaFilter) : undefined,
                  borderLeftWidth: areaFilter !== 'All' ? '4px' : undefined
                }}
              >
                <option value="All">All Areas</option>
                {AREA_NAMES.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
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
                      <td className="p-3 text-sm">
                        <span
                          className="px-2 py-1 rounded-lg font-medium text-white text-xs"
                          style={{ backgroundColor: getAreaColor(app.area) }}
                        >
                          {app.area || '-'}
                        </span>
                      </td>
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
  // TAB: ASSIGNMENTS - COMMITTEE ASSIGNMENTS (CRUD)
  // ============================================================================

  const AssignmentsTab = () => {
    const committeeMembers = users.filter(u => u.role === 'committee' || u.role === 'Committee');
    const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString('en-GB') : '—');

    const resolveApplication = (applicationId: string) =>
      applications.find(app => app.id === applicationId);
    const resolveCommittee = (committeeId: string) =>
      committeeMembers.find(member => member.uid === committeeId);
    const resolveRoundName = (roundId?: string) =>
      rounds.find(round => round.id === roundId)?.name || 'Unassigned';

    const filteredAssignments = assignments.filter(assignment => {
      if (assignmentCommitteeFilter !== 'All' && assignment.committeeId !== assignmentCommitteeFilter) {
        return false;
      }
      if (assignmentStatusFilter !== 'All' && assignment.status !== assignmentStatusFilter) {
        return false;
      }
      if (assignmentRoundFilter !== 'All') {
        const app = resolveApplication(assignment.applicationId);
        const roundId = app?.roundId || 'unassigned';
        if (assignmentRoundFilter === 'unassigned') {
          return roundId === 'unassigned';
        }
        if (roundId !== assignmentRoundFilter) {
          return false;
        }
      }
      return true;
    });

    const refreshAssignments = async () => {
      const assignmentsData = await DataService.getAssignments();
      setAssignments(assignmentsData);
      // Also refresh stats
      const stats = await DataService.getAssignmentStats();
      setAssignmentStats(stats);
    };

    // Load assignment stats on mount
    useEffect(() => {
      DataService.getAssignmentStats().then(setAssignmentStats);
    }, [assignments]);

    // Handle bulk assignment
    const handleBulkAssignment = async () => {
      if (!bulkAssignment.area) {
        alert('Please select an area');
        return;
      }

      setBulkAssignmentLoading(true);
      try {
        const result = await DataService.bulkAssignByArea({
          area: bulkAssignment.area,
          stage: bulkAssignment.stage,
          dueDate: bulkAssignment.dueDate || undefined,
          adminId: currentUser?.uid || 'admin'
        });

        if (result.errors.length > 0) {
          alert(`Bulk assignment completed with errors:\n${result.errors.join('\n')}`);
        } else {
          alert(`Bulk assignment completed!\nCreated: ${result.created}\nSkipped (duplicates): ${result.skipped}`);
        }

        setBulkAssignment({ area: '', stage: 'stage1', dueDate: '' });
        await refreshAssignments();
      } catch (error: any) {
        console.error('Bulk assignment error:', error);
        alert(error?.message || 'Failed to create bulk assignments');
      } finally {
        setBulkAssignmentLoading(false);
      }
    };

    // Get committee members by area for preview
    const getCommitteeMembersForArea = (area: string) =>
      committeeMembers.filter(m => m.area === area);

    // Get eligible applications for bulk assignment preview
    const getEligibleAppsForBulk = () => {
      if (!bulkAssignment.area) return [];
      const targetStatus = bulkAssignment.stage === 'stage1' ? 'Submitted-Stage1' : 'Submitted-Stage2';
      return applications.filter(app =>
        app.area === bulkAssignment.area &&
        (app.status === targetStatus || (bulkAssignment.stage === 'stage2' && app.status === 'Invited-Stage2'))
      );
    };

    const handleCreateAssignment = async () => {
      if (!newAssignment.applicationId || !newAssignment.committeeId) {
        alert('Select an application and committee member.');
        return;
      }
      const assignmentId = `${newAssignment.applicationId}_${newAssignment.committeeId}`;
      const assignment: Assignment = {
        id: assignmentId,
        applicationId: newAssignment.applicationId,
        committeeId: newAssignment.committeeId,
        assignedDate: new Date().toISOString(),
        dueDate: newAssignment.dueDate || undefined,
        status: newAssignment.status
      };
      try {
        await DataService.createAssignment(assignment);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'ASSIGNMENT_CREATE',
          targetId: assignmentId,
          details: {
            applicationId: assignment.applicationId,
            committeeId: assignment.committeeId,
            status: assignment.status,
            dueDate: assignment.dueDate || null
          }
        });
        setNewAssignment({ applicationId: '', committeeId: '', dueDate: '', status: 'assigned' });
        await refreshAssignments();
      } catch (error: any) {
        console.error('Error creating assignment:', error);
        alert(error?.message || 'Failed to create assignment');
      }
    };

    const handleUpdateAssignment = async () => {
      if (!editingAssignment) return;
      const assignmentId = `${editingAssignment.applicationId}_${editingAssignment.committeeId}`;
      try {
        await DataService.updateAssignment(assignmentId, {
          status: editingAssignment.status,
          dueDate: editingAssignment.dueDate || undefined
        });
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'ASSIGNMENT_UPDATE',
          targetId: assignmentId,
          details: {
            status: editingAssignment.status,
            dueDate: editingAssignment.dueDate || null
          }
        });
        setEditingAssignment(null);
        await refreshAssignments();
      } catch (error: any) {
        console.error('Error updating assignment:', error);
        alert(error?.message || 'Failed to update assignment');
      }
    };

    const handleDeleteAssignment = async (assignment: Assignment) => {
      if (!confirm('Delete this assignment?')) return;
      const assignmentId = `${assignment.applicationId}_${assignment.committeeId}`;
      try {
        await DataService.deleteAssignment(assignmentId);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'ASSIGNMENT_DELETE',
          targetId: assignmentId,
          details: {
            applicationId: assignment.applicationId,
            committeeId: assignment.committeeId,
            status: assignment.status
          }
        });
        await refreshAssignments();
      } catch (error: any) {
        console.error('Error deleting assignment:', error);
        alert(error?.message || 'Failed to delete assignment');
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-purple-900 mb-2">Assignments</h2>
          <p className="text-gray-600">Assign committee members to applications and track scoring status.</p>
        </div>

        {/* Assignment Statistics */}
        {assignmentStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-purple-50 to-white">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{assignmentStats.total}</p>
                <p className="text-sm text-gray-600 font-bold">Total Assignments</p>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-white">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{assignmentStats.byStatus['submitted'] || 0}</p>
                <p className="text-sm text-gray-600 font-bold">Completed</p>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-white">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{assignmentStats.byStatus['assigned'] || 0}</p>
                <p className="text-sm text-gray-600 font-bold">Pending</p>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-white">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{assignmentStats.byStatus['in_progress'] || 0}</p>
                <p className="text-sm text-gray-600 font-bold">In Progress</p>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-white">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{assignmentStats.overdueCount}</p>
                <p className="text-sm text-gray-600 font-bold">Overdue</p>
              </div>
            </Card>
          </div>
        )}

        {/* Committee Workload */}
        {assignmentStats && Object.keys(assignmentStats.byCommittee).length > 0 && (
          <Card>
            <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
              <Users size={24} />
              Committee Workload
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(assignmentStats.byCommittee).map(([id, data]) => {
                const completionRate = data.assigned > 0 ? Math.round((data.completed / data.assigned) * 100) : 0;
                return (
                  <div key={id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <p className="font-bold text-gray-800 truncate">{data.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-600">{completionRate}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{data.completed}/{data.assigned} completed</p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Bulk Assignment Card */}
        <Card className="border-2 border-purple-200 bg-purple-50/30">
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Users size={24} />
            Bulk Assign by Area
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Assign all eligible applications in an area to all committee members for that area.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Area</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                value={bulkAssignment.area}
                onChange={(e) => setBulkAssignment({ ...bulkAssignment, area: e.target.value })}
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: bulkAssignment.area ? getAreaColor(bulkAssignment.area) : '#9333EA'
                }}
              >
                <option value="">Select area</option>
                {AREA_NAMES.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Stage</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                value={bulkAssignment.stage}
                onChange={(e) => setBulkAssignment({ ...bulkAssignment, stage: e.target.value as 'stage1' | 'stage2' })}
              >
                <option value="stage1">Part 1 - EOI Voting</option>
                <option value="stage2">Part 2 - Full Application Scoring</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Due Date (Optional)</label>
              <input
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                value={bulkAssignment.dueDate}
                onChange={(e) => setBulkAssignment({ ...bulkAssignment, dueDate: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleBulkAssignment}
                disabled={bulkAssignmentLoading || !bulkAssignment.area}
                className="w-full"
              >
                {bulkAssignmentLoading ? (
                  <span className="animate-pulse">Creating...</span>
                ) : (
                  <>
                    <Users size={18} />
                    Bulk Assign
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Preview */}
          {bulkAssignment.area && (
            <div className="mt-4 p-4 rounded-xl bg-white border border-purple-100">
              <p className="text-sm font-bold text-gray-700 mb-2">Preview:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Committee Members ({bulkAssignment.area}):</p>
                  <p className="font-bold">{getCommitteeMembersForArea(bulkAssignment.area).length} members</p>
                  <div className="mt-1 space-y-1">
                    {getCommitteeMembersForArea(bulkAssignment.area).slice(0, 3).map(m => (
                      <span key={m.uid} className="inline-block px-2 py-1 bg-gray-100 rounded text-xs mr-1">
                        {m.displayName || m.email}
                      </span>
                    ))}
                    {getCommitteeMembersForArea(bulkAssignment.area).length > 3 && (
                      <span className="text-xs text-gray-500">+{getCommitteeMembersForArea(bulkAssignment.area).length - 3} more</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-gray-500">Eligible Applications:</p>
                  <p className="font-bold">{getEligibleAppsForBulk().length} applications</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {bulkAssignment.stage === 'stage1' ? 'Status: Submitted-Stage1' : 'Status: Invited-Stage2 or Submitted-Stage2'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-3 font-bold">
                This will create up to {getCommitteeMembersForArea(bulkAssignment.area).length * getEligibleAppsForBulk().length} assignments
                (excluding existing duplicates)
              </p>
            </div>
          )}
        </Card>

        {/* Individual Assignment Card */}
        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Plus size={24} />
            Create Individual Assignment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Application</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                value={newAssignment.applicationId}
                onChange={(e) => setNewAssignment({ ...newAssignment, applicationId: e.target.value })}
              >
                <option value="">Select application</option>
                {applications.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.ref} • {app.projectTitle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Committee Member</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                value={newAssignment.committeeId}
                onChange={(e) => setNewAssignment({ ...newAssignment, committeeId: e.target.value })}
              >
                <option value="">Select committee member</option>
                {committeeMembers.map(member => (
                  <option key={member.uid} value={member.uid}>
                    {member.displayName || member.email} {member.area ? `(${member.area})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                value={newAssignment.dueDate}
                onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                value={newAssignment.status}
                onChange={(e) => setNewAssignment({ ...newAssignment, status: e.target.value as Assignment['status'] })}
              >
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="rescore">Rescore</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleCreateAssignment}>
              <Plus size={18} />
              Create Assignment
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <h3 className="text-xl font-bold text-purple-900">Assignments List ({filteredAssignments.length})</h3>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-500" />
                <select
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  value={assignmentCommitteeFilter}
                  onChange={(e) => setAssignmentCommitteeFilter(e.target.value)}
                >
                  <option value="All">All committee members</option>
                  {committeeMembers.map(member => (
                    <option key={member.uid} value={member.uid}>
                      {member.displayName || member.email}
                    </option>
                  ))}
                </select>
              </div>
              <select
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={assignmentRoundFilter}
                onChange={(e) => setAssignmentRoundFilter(e.target.value)}
              >
                <option value="All">All rounds</option>
                <option value="unassigned">Unassigned</option>
                {rounds.map(round => (
                  <option key={round.id} value={round.id}>
                    {round.name}
                  </option>
                ))}
              </select>
              <select
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={assignmentStatusFilter}
                onChange={(e) => setAssignmentStatusFilter(e.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="assigned">Assigned</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="rescore">Rescore</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Application</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Committee Member</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Round</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Status</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Assigned</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Due</th>
                  <th className="text-left p-3 font-bold text-sm text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map(assignment => {
                  const app = resolveApplication(assignment.applicationId);
                  const committee = resolveCommittee(assignment.committeeId);
                  return (
                    <tr key={assignment.id} className="border-b border-gray-100 hover:bg-purple-50 transition">
                      <td className="p-3">
                        <div>
                          <p className="font-bold text-gray-900">{app?.projectTitle || assignment.applicationId}</p>
                          <p className="text-xs text-gray-500">{app?.ref}</p>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{committee?.displayName || committee?.email || assignment.committeeId}</td>
                      <td className="p-3 text-sm">{resolveRoundName(app?.roundId)}</td>
                      <td className="p-3">
                        <Badge variant={assignment.status === 'submitted' ? 'success' : assignment.status === 'rescore' ? 'warning' : 'purple'}>
                          {assignment.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">{formatDate(assignment.assignedDate)}</td>
                      <td className="p-3 text-sm">{formatDate(assignment.dueDate)}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingAssignment({
                              ...assignment,
                              dueDate: assignment.dueDate ? assignment.dueDate.slice(0, 10) : ''
                            })}
                            className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-700"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(assignment)}
                            className="p-2 hover:bg-red-100 rounded-lg transition text-red-700"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredAssignments.length === 0 && (
              <p className="text-gray-500 text-center py-8">No assignments match the selected filters.</p>
            )}
          </div>
        </Card>

        {editingAssignment && (
          <Modal isOpen={true} onClose={() => setEditingAssignment(null)} title="Edit Assignment" size="md">
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-bold text-gray-700">Application</p>
                <p className="text-sm text-gray-900">
                  {resolveApplication(editingAssignment.applicationId)?.projectTitle || editingAssignment.applicationId}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-bold text-gray-700">Committee Member</p>
                <p className="text-sm text-gray-900">
                  {resolveCommittee(editingAssignment.committeeId)?.displayName || editingAssignment.committeeId}
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={editingAssignment.status}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, status: e.target.value as Assignment['status'] })}
                >
                  <option value="assigned">Assigned</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="rescore">Rescore</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={editingAssignment.dueDate || ''}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, dueDate: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setEditingAssignment(null)}>Cancel</Button>
                <Button onClick={handleUpdateAssignment}>
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
  // TAB: FINANCIALS - FINANCIAL DASHBOARD
  // ============================================================================

  const FinancialsTab = () => {
    const [selectedRound, setSelectedRound] = useState<string>(
      rounds.length > 0 ? rounds[0].id : ''
    );

    const currentRound = rounds.find(r => r.id === selectedRound);
    const roundApplications = applications.filter(app =>
      !selectedRound || app.roundId === selectedRound
    );

    const handleSaveFinancials = async (financials: any) => {
      try {
        // Store in local state for now - will add Firebase integration later
        setFinancialRecords(prev => ({
          ...prev,
          [selectedRound]: financials
        }));
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'FINANCIALS_UPDATE',
          targetId: selectedRound,
          details: { totalFunding: financials.totalFunding, totalSpent: financials.totalSpent }
        });
        alert('Financial data saved successfully');
      } catch (error) {
        console.error('Error saving financials:', error);
        alert('Failed to save financial data');
      }
    };

    return (
      <div className="space-y-6">
        {/* Round Selector */}
        <Card>
          <div className="flex items-center gap-4">
            <label className="font-bold text-gray-700">Select Round:</label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:border-purple-500 outline-none"
            >
              {rounds.map(round => (
                <option key={round.id} value={round.id}>{round.name}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Financial Dashboard Component */}
        {selectedRound && (
          <FinancialDashboard
            roundId={selectedRound}
            userRole="admin"
            financials={financialRecords[selectedRound]}
            applications={roundApplications}
            onSaveFinancials={handleSaveFinancials}
          />
        )}
      </div>
    );
  };

  // ============================================================================
  // TAB: COEFFICIENTS - COEFFICIENT CONFIGURATION
  // ============================================================================

  const CoefficientsTab = () => {
    const [selectedRound, setSelectedRound] = useState<string>(
      rounds.length > 0 ? rounds[0].id : ''
    );

    const currentRound = rounds.find(r => r.id === selectedRound);

    const handleSaveCoefficients = async (coeffSettings: any) => {
      if (!currentRound) return;

      try {
        await DataService.updateRound(currentRound.id, {
          coefficientSettings: coeffSettings
        });
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'COEFFICIENTS_UPDATE',
          targetId: currentRound.id,
          details: { enabled: coeffSettings.enabled }
        });
        await loadAllData();
        alert('Coefficient settings saved successfully');
      } catch (error) {
        console.error('Error saving coefficient settings:', error);
        alert('Failed to save coefficient settings');
      }
    };

    return (
      <div className="space-y-6">
        {/* Round Selector */}
        <Card>
          <div className="flex items-center gap-4">
            <label className="font-bold text-gray-700">Configure for Round:</label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:border-purple-500 outline-none"
            >
              {rounds.map(round => (
                <option key={round.id} value={round.id}>{round.name}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Coefficient Config Component */}
        {selectedRound && currentRound && (
          <CoefficientConfig
            roundId={selectedRound}
            roundName={currentRound.name}
            settings={currentRound.coefficientSettings}
            onSave={handleSaveCoefficients}
          />
        )}
      </div>
    );
  };

  // ============================================================================
  // TAB: ANNOUNCEMENTS - ANNOUNCEMENT MANAGEMENT
  // ============================================================================

  const AnnouncementsTab = () => {
    const handleSaveAnnouncement = async (announcement: Announcement) => {
      try {
        // Persist to Firebase
        await DataService.createAnnouncement(announcement);

        // Update local state
        setAnnouncements(prev => {
          const existingIndex = prev.findIndex(a => a.id === announcement.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = announcement;
            return updated;
          }
          return [...prev, announcement];
        });

        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'ANNOUNCEMENT_SAVE',
          targetId: announcement.id,
          details: { title: announcement.title, visibility: announcement.visibility }
        });
      } catch (error) {
        console.error('Error saving announcement:', error);
        throw error;
      }
    };

    const handleDeleteAnnouncement = async (id: string) => {
      try {
        // Delete from Firebase
        await DataService.deleteAnnouncement(id);

        // Update local state
        setAnnouncements(prev => prev.filter(a => a.id !== id));

        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'ANNOUNCEMENT_DELETE',
          targetId: id
        });
      } catch (error) {
        console.error('Error deleting announcement:', error);
        throw error;
      }
    };

    return (
      <AnnouncementEditor
        announcements={announcements}
        onSave={handleSaveAnnouncement}
        onDelete={handleDeleteAnnouncement}
      />
    );
  };

  // ============================================================================
  // TAB: DOCUMENTS - DOCUMENT MANAGEMENT
  // ============================================================================

  const DocumentsTab = () => {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(null);
    const [editingFolder, setEditingFolder] = useState<DocumentFolder | null>(null);
    const [newDocument, setNewDocument] = useState<{ name: string; visibility: DocumentVisibility; folderId: string }>({
      name: '',
      visibility: 'public',
      folderId: 'root'
    });
    const [newFolder, setNewFolder] = useState<{ name: string; visibility: DocumentVisibility }>({
      name: '',
      visibility: 'public'
    });
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    const handleUploadDocument = async () => {
      if (!newDocument.name) {
        alert('Please provide a document name');
        return;
      }
      if (!uploadFile) {
        alert('Please select a file to upload');
        return;
      }
      try {
        const id = 'doc_' + Date.now();
        let fileUrl: string | undefined;

        // Upload file to Firebase Storage if a file was selected
        if (uploadFile) {
          const timestamp = Date.now();
          const ext = uploadFile.name.split('.').pop();
          const storagePath = `documents/${id}_${timestamp}.${ext}`;
          fileUrl = await uploadToStorage(storagePath, uploadFile);
          const docData: DocumentItem = {
            id,
            name: newDocument.name,
            folderId: newDocument.folderId || 'root',
            visibility: newDocument.visibility,
            uploadedBy: currentUser?.uid || 'admin',
            createdAt: Date.now(),
            url: fileUrl,
            filePath: storagePath
          };
          await DataService.createDocument(docData);
          await DataService.logAction({
            adminId: currentUser?.uid || 'admin',
            action: 'DOCUMENT_CREATE',
            targetId: id,
            details: { name: newDocument.name, visibility: newDocument.visibility, folderId: newDocument.folderId }
          });
        };
        setNewDocument({ name: '', visibility: 'public', folderId: 'root' });
        setUploadFile(null);
        setShowUploadModal(false);
        await loadAllData();
      } catch (error) {
        console.error('Error uploading document:', error);
        const message = error instanceof Error ? error.message : 'Failed to upload document';
        alert(message);
      }
    };

    const handleCreateFolder = async () => {
      if (!newFolder.name) {
        alert('Please provide a folder name');
        return;
      }
      try {
        const id = 'folder_' + Date.now();
        const folderData: DocumentFolder = {
          id,
          name: newFolder.name,
          visibility: newFolder.visibility,
          createdBy: currentUser?.uid || 'admin',
          createdAt: Date.now(),
        };
        await DataService.createDocumentFolder(folderData);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'FOLDER_CREATE',
          targetId: id,
          details: { name: newFolder.name, visibility: newFolder.visibility }
        });
        setNewFolder({ name: '', visibility: 'public' });
        setShowFolderModal(false);
        await loadAllData();
      } catch (error) {
        console.error('Error creating folder:', error);
        alert('Failed to create folder');
      }
    };

    const handleDeleteFolder = async (folder: DocumentFolder) => {
      const docsInFolder = documents.filter(doc => doc.folderId === folder.id);
      const message = docsInFolder.length > 0
        ? `This folder contains ${docsInFolder.length} document(s). Delete "${folder.name}" anyway?`
        : `Are you sure you want to delete "${folder.name}"?`;
      if (!confirm(message)) return;
      try {
        await DataService.deleteDocumentFolder(folder.id);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'FOLDER_DELETE',
          targetId: folder.id,
          details: { name: folder.name }
        });
        await loadAllData();
      } catch (error) {
        console.error('Error deleting folder:', error);
        alert('Failed to delete folder');
      }
    };

    const handleDeleteDocument = async (doc: DocumentItem) => {
      if (!confirm(`Are you sure you want to delete "${doc.name}"?`)) return;
      try {
        await DataService.deleteDocument(doc.id, doc.filePath);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'DOCUMENT_DELETE',
          targetId: doc.id,
          details: { name: doc.name }
        });
        await loadAllData();
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document');
      }
    };

    const handleUpdateDocument = async (doc: DocumentItem) => {
      try {
        await DataService.updateDocument(doc.id, { name: doc.name, visibility: doc.visibility, folderId: doc.folderId || 'root' });
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'DOCUMENT_UPDATE',
          targetId: doc.id,
          details: { name: doc.name, visibility: doc.visibility, folderId: doc.folderId }
        });
        setEditingDocument(null);
        await loadAllData();
      } catch (error) {
        console.error('Error updating document:', error);
        alert('Failed to update document');
      }
    };

    const handleUpdateFolder = async (folder: DocumentFolder) => {
      try {
        await DataService.updateDocumentFolder(folder.id, { name: folder.name, visibility: folder.visibility });
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'FOLDER_UPDATE',
          targetId: folder.id,
          details: { name: folder.name, visibility: folder.visibility }
        });
        setEditingFolder(null);
        await loadAllData();
      } catch (error) {
        console.error('Error updating folder:', error);
        alert('Failed to update folder');
      }
    };

    const folders = documentFolders;
    const folderLookup = new Map(documentFolders.map(folder => [folder.id, folder.name]));
    const files = documents;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-purple-900 mb-2">Document Management</h2>
            <p className="text-gray-600">Upload and manage resources for committee members</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFolderModal(true)}>
              <FolderOpen size={18} />
              New Folder
            </Button>
            <Button variant="secondary" onClick={() => setShowUploadModal(true)}>
              <Upload size={18} />
              Upload Document
            </Button>
          </div>
        </div>

        {/* Folders */}
        {folders.length > 0 && (
          <Card>
            <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
              <FolderOpen size={20} />
              Folders
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {folders.map(folder => (
                <div key={folder.id} className="p-4 bg-amber-50 rounded-lg border border-amber-200 hover:border-amber-400 transition cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <FolderOpen className="text-amber-600" size={24} />
                    <span className="font-bold text-gray-800 truncate">{folder.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="amber">{folder.visibility}</Badge>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingFolder(folder)} className="p-1 hover:bg-amber-100 rounded transition text-amber-700">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDeleteFolder(folder)} className="p-1 hover:bg-red-100 rounded transition text-red-700">
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
            Documents ({files.length})
          </h3>
          <div className="space-y-3">
            {files.map(doc => (
              <div key={doc.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between hover:border-purple-300 transition">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                    <FileText className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{doc.name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="gray">{doc.visibility}</Badge>
                      {doc.folderId && doc.folderId !== 'root' && (
                        <Badge variant="amber">{folderLookup.get(doc.folderId) || 'Folder'}</Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-700">
                      <Eye size={16} />
                    </a>
                  )}
                  <button onClick={() => setEditingDocument(doc)} className="p-2 hover:bg-purple-100 rounded-lg transition text-purple-700">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDeleteDocument(doc)} className="p-2 hover:bg-red-100 rounded-lg transition text-red-700">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {files.length === 0 && (
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
                value={newDocument.name}
                onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
              />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Visibility</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={newDocument.visibility}
                  onChange={(e) => setNewDocument({ ...newDocument, visibility: e.target.value as DocumentVisibility })}
                >
                  <option value="public">Public</option>
                  <option value="committee">Committee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {folders.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Parent Folder</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                    value={newDocument.folderId}
                    onChange={(e) => setNewDocument({ ...newDocument, folderId: e.target.value })}
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
                value={newFolder.name}
                onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
              />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Visibility</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={newFolder.visibility}
                  onChange={(e) => setNewFolder({ ...newFolder, visibility: e.target.value as DocumentVisibility })}
                >
                  <option value="public">Public</option>
                  <option value="committee">Committee</option>
                  <option value="admin">Admin</option>
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
        {editingDocument && (
          <Modal isOpen={true} onClose={() => setEditingDocument(null)} title="Edit Document" size="md">
            <div className="space-y-4">
              <Input
                label="Name"
                value={editingDocument.name}
                onChange={(e) => setEditingDocument({ ...editingDocument, name: e.target.value })}
              />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Visibility</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={editingDocument.visibility}
                  onChange={(e) => setEditingDocument({ ...editingDocument, visibility: e.target.value as DocumentVisibility })}
                >
                  <option value="public">Public</option>
                  <option value="committee">Committee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Folder</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={editingDocument.folderId || 'root'}
                  onChange={(e) => setEditingDocument({ ...editingDocument, folderId: e.target.value })}
                >
                  <option value="root">Root</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setEditingDocument(null)}>Cancel</Button>
                <Button onClick={() => handleUpdateDocument(editingDocument)}>
                  <Save size={18} />
                  Save Changes
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Edit Folder Modal */}
        {editingFolder && (
          <Modal isOpen={true} onClose={() => setEditingFolder(null)} title="Edit Folder" size="md">
            <div className="space-y-4">
              <Input
                label="Name"
                value={editingFolder.name}
                onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
              />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Visibility</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                  value={editingFolder.visibility}
                  onChange={(e) => setEditingFolder({ ...editingFolder, visibility: e.target.value as DocumentVisibility })}
                >
                  <option value="public">Public</option>
                  <option value="committee">Committee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setEditingFolder(null)}>Cancel</Button>
                <Button onClick={() => handleUpdateFolder(editingFolder)}>
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
    // Ensure localSettings has all fields with proper defaults
    const [localSettings, setLocalSettings] = useState<PortalSettings>({
      stage1Visible: settings.stage1Visible ?? true,
      stage1VotingOpen: settings.stage1VotingOpen ?? false,
      stage2Visible: settings.stage2Visible ?? false,
      stage2ScoringOpen: settings.stage2ScoringOpen ?? false,
      votingOpen: settings.votingOpen ?? false,
      publicVotingStartDate: settings.publicVotingStartDate,
      publicVotingEndDate: settings.publicVotingEndDate,
      scoringThreshold: settings.scoringThreshold ?? 50,
      resultsReleased: settings.resultsReleased ?? false
    });

    // Sync localSettings when parent settings change (e.g., after data reload)
    useEffect(() => {
      setLocalSettings({
        stage1Visible: settings.stage1Visible ?? true,
        stage1VotingOpen: settings.stage1VotingOpen ?? false,
        stage2Visible: settings.stage2Visible ?? false,
        stage2ScoringOpen: settings.stage2ScoringOpen ?? false,
        votingOpen: settings.votingOpen ?? false,
        publicVotingStartDate: settings.publicVotingStartDate,
        publicVotingEndDate: settings.publicVotingEndDate,
        scoringThreshold: settings.scoringThreshold ?? 50,
        resultsReleased: settings.resultsReleased ?? false
      });
    }, [settings]);

    const handleSaveSettings = async () => {
      try {
        // Track which settings changed for notifications
        const stage1VotingChanged = settings.stage1VotingOpen !== localSettings.stage1VotingOpen;
        const stage2ScoringChanged = settings.stage2ScoringOpen !== localSettings.stage2ScoringOpen;
        const publicVotingChanged = settings.votingOpen !== localSettings.votingOpen;

        // Save settings first - this is the critical operation
        await DataService.updatePortalSettings(localSettings);
        await DataService.logAction({
          adminId: currentUser?.uid || 'admin',
          action: 'SETTINGS_UPDATE',
          targetId: 'global',
          details: localSettings as unknown as Record<string, unknown>
        });

        // Update local state immediately after successful save
        setSettings(localSettings);

        // Send notifications for workflow changes (non-blocking)
        // Wrap in try-catch so notification failures don't affect the save confirmation
        let notificationsSent = false;
        try {
          if (stage1VotingChanged) {
            const isOpen = localSettings.stage1VotingOpen;
            // Notify all committee members across all areas
            for (const area of AREA_NAMES) {
              await DataService.notifyCommitteeByArea({
                area,
                type: isOpen ? 'stage_opened' : 'stage_closed',
                title: isOpen ? 'Part 1 Voting Now Open' : 'Part 1 Voting Closed',
                message: isOpen
                  ? 'You can now vote on Part 1 EOI applications in your area.'
                  : 'Part 1 EOI voting has been closed by Admin.',
                link: '/portal/dashboard'
              });
            }
            notificationsSent = true;
          }

          if (stage2ScoringChanged) {
            const isOpen = localSettings.stage2ScoringOpen;
            for (const area of AREA_NAMES) {
              await DataService.notifyCommitteeByArea({
                area,
                type: isOpen ? 'stage_opened' : 'stage_closed',
                title: isOpen ? 'Part 2 Scoring Now Open' : 'Part 2 Scoring Closed',
                message: isOpen
                  ? 'You can now score Part 2 full applications in your area.'
                  : 'Part 2 application scoring has been closed by Admin.',
                link: '/portal/scoring'
              });
            }
            notificationsSent = true;
          }
        } catch (notifError) {
          console.warn('Failed to send notifications, but settings were saved:', notifError);
        }

        if (publicVotingChanged && localSettings.votingOpen) {
          console.log('Public voting status changed');
        }

        alert('Settings saved successfully' + (notificationsSent ? '\nCommittee members have been notified.' : ''));
      } catch (error: any) {
        console.error('Error saving settings:', error);
        const errorMsg = error?.message || error?.code || 'Unknown error';
        alert(`Failed to save settings: ${errorMsg}`);
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
          </div>
        </Card>

        {/* Committee Workflow Controls */}
        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-6">Committee Workflow Controls</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div>
                <p className="font-bold text-gray-800">Stage 1 Committee Voting</p>
                <p className="text-sm text-gray-600">Allow committee members to vote Yes/No on Stage 1 EOIs in their area</p>
                <p className="text-xs text-blue-600 mt-1">
                  {applications.filter(a => a.status === 'Submitted-Stage1').length} EOI(s) awaiting committee review
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={localSettings.stage1VotingOpen || false}
                  onChange={(e) => setLocalSettings({ ...localSettings, stage1VotingOpen: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-teal-50 rounded-lg border-l-4 border-teal-500">
              <div>
                <p className="font-bold text-gray-800">Stage 2 Committee Scoring</p>
                <p className="text-sm text-gray-600">Allow committee members to score Stage 2 applications in their area</p>
                <p className="text-xs text-teal-600 mt-1">
                  {applications.filter(a => a.status === 'Submitted-Stage2' || a.status === 'Invited-Stage2').length} application(s) awaiting scoring
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={localSettings.stage2ScoringOpen || false}
                  onChange={(e) => setLocalSettings({ ...localSettings, stage2ScoringOpen: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Public Voting Controls */}
        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-6">Public Voting</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-bold text-gray-800">Voting Open</p>
                <p className="text-sm text-gray-600">Enable public voting on applications</p>
                {(() => {
                  const fundedApps = applications.filter(app => app.status === 'Funded');
                  const pendingPacks = fundedApps.filter(app => !app.publicVotePackComplete);
                  if (fundedApps.length > 0 && pendingPacks.length > 0) {
                    return (
                      <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={14} />
                        Warning: {pendingPacks.length} funded applicant(s) haven't submitted their pack yet
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={localSettings.votingOpen}
                  onChange={(e) => {
                    const fundedApps = applications.filter(app => app.status === 'Funded');
                    const pendingPacks = fundedApps.filter(app => !app.publicVotePackComplete);

                    if (e.target.checked && fundedApps.length > 0 && pendingPacks.length > 0) {
                      const confirmEnable = window.confirm(
                        `Warning: ${pendingPacks.length} funded applicant(s) have not yet submitted their public vote pack.\n\n` +
                        `Their projects will not be visible in public voting until packs are complete.\n\n` +
                        `Are you sure you want to enable public voting now?`
                      );
                      if (!confirmEnable) return;
                    }

                    setLocalSettings({ ...localSettings, votingOpen: e.target.checked });
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Public Voting Dates */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Public Voting Start Date
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
                  value={localSettings.publicVotingStartDate
                    ? new Date(localSettings.publicVotingStartDate).toISOString().slice(0, 16)
                    : ''}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    publicVotingStartDate: e.target.value ? new Date(e.target.value).getTime() : undefined
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Public Voting End Date
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
                  value={localSettings.publicVotingEndDate
                    ? new Date(localSettings.publicVotingEndDate).toISOString().slice(0, 16)
                    : ''}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    publicVotingEndDate: e.target.value ? new Date(e.target.value).getTime() : undefined
                  })}
                />
              </div>
              {localSettings.publicVotingStartDate && localSettings.publicVotingEndDate && (
                <div className="col-span-2 text-sm text-purple-700">
                  Voting period: {new Date(localSettings.publicVotingStartDate).toLocaleString('en-GB')} - {new Date(localSettings.publicVotingEndDate).toLocaleString('en-GB')}
                </div>
              )}
            </div>

            <div className="bg-white border border-purple-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800">Public Vote Totals</p>
                  <p className="text-sm text-gray-600">Live count of public votes per eligible project</p>
                </div>
                <span className="text-sm font-semibold text-purple-700">
                  Total votes: {publicVotes.length}
                </span>
              </div>
              {applications.filter(app => app.status === 'Funded' && app.publicVotePackComplete).length === 0 ? (
                <p className="text-sm text-gray-500">No funded applications with completed vote packs yet.</p>
              ) : (
                <div className="space-y-2">
                  {applications
                    .filter(app => app.status === 'Funded' && app.publicVotePackComplete)
                    .map(app => (
                      <div key={app.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-md px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800">{app.projectTitle}</span>
                          <span className="text-gray-500">{app.orgName}</span>
                        </div>
                        <span className="font-bold text-purple-700">{publicVoteCounts[app.id] || 0}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-6">Part 2 Results Release</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
              <div>
                <p className="font-bold text-gray-800">Release Part 2 Results</p>
                <p className="text-sm text-gray-600">Make scoring results visible to applicants (successful and unsuccessful)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={localSettings.resultsReleased || false}
                  onChange={(e) => setLocalSettings({ ...localSettings, resultsReleased: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Once released, successful applicants (Funded status) will be prompted to submit their public vote pack (image + blurb). Unsuccessful applicants will receive a notification.
              </p>
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

        {/* Public Vote Pack Tracking */}
        <Card>
          <h3 className="text-xl font-bold text-purple-900 mb-6">Public Vote Pack Tracking</h3>
          <div className="space-y-4">
            {(() => {
              const fundedApps = applications.filter(app => app.status === 'Funded');
              const completedPacks = fundedApps.filter(app => app.publicVotePackComplete);
              const pendingPacks = fundedApps.filter(app => !app.publicVotePackComplete);
              const allPacksComplete = fundedApps.length > 0 && pendingPacks.length === 0;

              return (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                      <p className="text-sm font-bold text-purple-600 mb-1">Total Funded</p>
                      <p className="text-3xl font-bold text-purple-900">{fundedApps.length}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                      <p className="text-sm font-bold text-green-600 mb-1">Packs Complete</p>
                      <p className="text-3xl font-bold text-green-900">{completedPacks.length}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-200">
                      <p className="text-sm font-bold text-amber-600 mb-1">Packs Pending</p>
                      <p className="text-3xl font-bold text-amber-900">{pendingPacks.length}</p>
                    </div>
                  </div>

                  {/* Voting Readiness Indicator */}
                  {fundedApps.length > 0 && (
                    <div className={`p-4 rounded-lg border-2 ${
                      allPacksComplete
                        ? 'bg-green-50 border-green-300'
                        : 'bg-amber-50 border-amber-300'
                    }`}>
                      <div className="flex items-center gap-3">
                        {allPacksComplete ? (
                          <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                        ) : (
                          <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
                        )}
                        <div className="flex-1">
                          <p className={`font-bold ${allPacksComplete ? 'text-green-900' : 'text-amber-900'}`}>
                            {allPacksComplete
                              ? 'All funded applicants have completed their public vote packs'
                              : `${pendingPacks.length} funded applicant(s) still need to submit their public vote pack`}
                          </p>
                          <p className={`text-sm mt-1 ${allPacksComplete ? 'text-green-700' : 'text-amber-700'}`}>
                            {allPacksComplete
                              ? 'Public voting can be safely enabled'
                              : 'Please ensure all packs are complete before enabling public voting'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending Packs List */}
                  {pendingPacks.length > 0 && (
                    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <p className="font-bold text-gray-900">Applicants Pending Pack Submission</p>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {pendingPacks.map(app => (
                          <div key={app.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">{app.projectTitle}</p>
                              <p className="text-sm text-gray-600">{app.orgName} • {app.area}</p>
                            </div>
                            <Badge variant="warning">Pending</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Packs List */}
                  {completedPacks.length > 0 && (
                    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <p className="font-bold text-gray-900">Completed Public Vote Packs</p>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {completedPacks.map(app => (
                          <div key={app.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">{app.projectTitle}</p>
                              <p className="text-sm text-gray-600">{app.orgName} • {app.area}</p>
                              <div className="flex gap-3 mt-2">
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  Image uploaded
                                </span>
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  Blurb submitted
                                </span>
                              </div>
                            </div>
                            <Badge variant="success">Complete</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {fundedApps.length === 0 && (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <p className="text-gray-600">No funded applications yet. Public vote packs will appear here once results are released.</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </Card>

        {/* Comprehensive Test Data Seeding */}
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Activity size={24} />
            Development: Seed All Test Data
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Populate all tabs with comprehensive test data including users, rounds, applications, assignments, audit logs, and announcements.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
            <div className="bg-white p-3 rounded-lg border">
              <p className="font-bold text-purple-700">Users</p>
              <p className="text-gray-500">Admin + 6 committee + 2 applicants</p>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <p className="font-bold text-purple-700">Rounds</p>
              <p className="text-gray-500">2025 (active) + 2026 (planning)</p>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <p className="font-bold text-purple-700">Applications</p>
              <p className="text-gray-500">12 apps across 3 areas</p>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <p className="font-bold text-purple-700">Assignments</p>
              <p className="text-gray-500">Stage 2 apps assigned to committee</p>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <p className="font-bold text-purple-700">Audit Logs</p>
              <p className="text-gray-500">Sample admin activity logs</p>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <p className="font-bold text-purple-700">Announcements</p>
              <p className="text-gray-500">Public + committee + applicant</p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!confirm('This will create comprehensive test data in your database including users, rounds, applications, assignments, audit logs, and announcements. Continue?')) return;

              try {
                const result = await seedAllTestData(currentUser?.uid || 'admin');

                let message = `Test Data Seeding Complete!\n\n`;
                message += `Users: ${result.users}\n`;
                message += `Rounds: ${result.rounds}\n`;
                message += `Applications: ${result.applications}\n`;
                message += `Assignments: ${result.assignments}\n`;
                message += `Audit Logs: ${result.auditLogs}\n`;
                message += `Announcements: ${result.announcements}\n`;

                if (result.errors.length > 0) {
                  message += `\nErrors (${result.errors.length}):\n`;
                  message += result.errors.slice(0, 5).join('\n');
                  if (result.errors.length > 5) {
                    message += `\n... and ${result.errors.length - 5} more`;
                  }
                }

                alert(message);
                await loadAllData();
              } catch (error: any) {
                console.error('Seeding error:', error);
                alert(`Failed to seed test data: ${error.message}`);
              }
            }}
          >
            <Plus size={18} />
            Seed All Test Data
          </Button>
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

  // Show loading state while auth is resolving or data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-bold">Loading admin console...</p>
        </div>
      </div>
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
              onClick={() => handleTabChange('overview')}
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
              onClick={() => handleTabChange('masterlist')}
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
              onClick={() => handleTabChange('users')}
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
              onClick={() => handleTabChange('assignments')}
              className={`px-6 py-4 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'assignments'
                  ? 'border-b-4 border-purple-600 text-purple-900 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ClipboardList size={18} />
              Assignments
            </button>
            <button
              onClick={() => handleTabChange('rounds')}
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
              onClick={() => handleTabChange('financials')}
              className={`px-6 py-4 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'financials'
                  ? 'border-b-4 border-purple-600 text-purple-900 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <DollarSign size={18} />
              Financials
            </button>
            <button
              onClick={() => handleTabChange('coefficients')}
              className={`px-6 py-4 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'coefficients'
                  ? 'border-b-4 border-purple-600 text-purple-900 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calculator size={18} />
              Coefficients
            </button>
            <button
              onClick={() => handleTabChange('announcements')}
              className={`px-6 py-4 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'announcements'
                  ? 'border-b-4 border-purple-600 text-purple-900 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Bell size={18} />
              Announcements
            </button>
            <button
              onClick={() => handleTabChange('documents')}
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
              onClick={() => handleTabChange('logs')}
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
              onClick={() => handleTabChange('settings')}
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
          {activeTab === 'assignments' && <AssignmentsTab />}
          {activeTab === 'rounds' && <RoundsTab />}
          {activeTab === 'financials' && <FinancialsTab />}
          {activeTab === 'coefficients' && <CoefficientsTab />}
          {activeTab === 'announcements' && <AnnouncementsTab />}
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
