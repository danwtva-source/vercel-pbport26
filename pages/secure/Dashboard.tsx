import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SecureLayout } from '../../components/Layout';
import { DataService } from '../../services/firebase';
import { UserRole, Application, Vote, Score, Assignment, User, Area } from '../../types';
import { ScoringModal } from '../../components/ScoringModal';
import { formatCurrency, ROUTES } from '../../utils';
import {
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  TrendingUp,
  Award,
  Settings,
  Filter,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  DollarSign,
  Target,
  Activity,
  Calendar,
  ChevronRight,
  Briefcase,
  Vote as VoteIcon
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string>('All');

  useEffect(() => {
    const user = DataService.getCurrentUser();
    setCurrentUser(user);
    if (user) {
      loadData(user);
    } else {
      navigate(ROUTES.PUBLIC.LOGIN);
    }
  }, []);

  const loadData = async (user: User) => {
    setLoading(true);
    try {
      const [appsData, votesData, scoresData, assignmentsData, usersData] = await Promise.all([
        DataService.getApplications(),
        DataService.getVotes(),
        DataService.getScores(),
        user.role === 'committee' ? DataService.getAssignments(user.uid) : Promise.resolve([]),
        user.role === 'admin' ? DataService.getUsers() : Promise.resolve([])
      ]);

      setAllApplications(appsData);
      setVotes(votesData);
      setScores(scoresData);
      setAssignments(assignmentsData);
      setUsers(usersData);

      // Filter applications based on role
      if (user.role === 'applicant') {
        setApplications(appsData.filter(app => app.userId === user.uid));
      } else if (user.role === 'committee') {
        const assignedAppIds = assignmentsData.map(a => a.applicationId);
        const committeeApps = appsData.filter(app =>
          assignedAppIds.includes(app.id) ||
          (user.area && (app.area === user.area || app.area === 'Cross-Area'))
        );
        setApplications(committeeApps);
      } else {
        setApplications(appsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  // Determine user role from enum or string
  const userRole = currentUser.role === 'applicant' ? UserRole.APPLICANT :
                   currentUser.role === 'committee' ? UserRole.COMMITTEE :
                   currentUser.role === 'admin' ? UserRole.ADMIN :
                   UserRole.PUBLIC;

  if (loading) {
    return (
      <SecureLayout userRole={userRole}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </SecureLayout>
    );
  }

  return (
    <SecureLayout userRole={userRole}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-display">
              {userRole === UserRole.APPLICANT && 'My Dashboard'}
              {userRole === UserRole.COMMITTEE && 'Committee Dashboard'}
              {userRole === UserRole.ADMIN && 'Admin Console'}
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {currentUser.displayName || currentUser.username || currentUser.email}
            </p>
          </div>
          {userRole === UserRole.APPLICANT && (
            <button
              onClick={() => navigate(ROUTES.PORTAL.APPLICATIONS_NEW)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg"
            >
              <Plus size={20} />
              New Application
            </button>
          )}
        </div>

        {/* Applicant Dashboard */}
        {userRole === UserRole.APPLICANT && (
          <ApplicantDashboard
            applications={applications}
            currentUser={currentUser}
            navigate={navigate}
          />
        )}

        {/* Committee Dashboard */}
        {userRole === UserRole.COMMITTEE && (
          <CommitteeDashboard
            applications={applications}
            votes={votes}
            scores={scores}
            assignments={assignments}
            currentUser={currentUser}
            selectedArea={selectedArea}
            setSelectedArea={setSelectedArea}
            navigate={navigate}
          />
        )}

        {/* Admin Dashboard */}
        {userRole === UserRole.ADMIN && (
          <AdminDashboard
            applications={allApplications}
            votes={votes}
            scores={scores}
            users={users}
            navigate={navigate}
          />
        )}
      </div>
    </SecureLayout>
  );
};

// --- APPLICANT DASHBOARD ---
interface ApplicantDashboardProps {
  applications: Application[];
  currentUser: User;
  navigate: any;
}

const ApplicantDashboard: React.FC<ApplicantDashboardProps> = ({ applications, currentUser, navigate }) => {
  const draftApps = applications.filter(app => app.status === 'Draft');
  const submittedApps = applications.filter(app => app.status.includes('Submitted'));
  const fundedApps = applications.filter(app => app.status === 'Funded');
  const rejectedApps = applications.filter(app => app.status.includes('Rejected') || app.status === 'Not-Funded');

  const getStatusIcon = (status: string) => {
    if (status === 'Draft') return <Clock className="text-gray-500" size={20} />;
    if (status.includes('Submitted')) return <Activity className="text-blue-500" size={20} />;
    if (status === 'Funded') return <CheckCircle2 className="text-green-500" size={20} />;
    if (status.includes('Rejected') || status === 'Not-Funded') return <XCircle className="text-red-500" size={20} />;
    if (status.includes('Invited')) return <Award className="text-purple-500" size={20} />;
    return <FileText className="text-gray-500" size={20} />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'Draft') return 'bg-gray-100 text-gray-700';
    if (status.includes('Submitted')) return 'bg-blue-100 text-blue-700';
    if (status === 'Funded') return 'bg-green-100 text-green-700';
    if (status.includes('Rejected') || status === 'Not-Funded') return 'bg-red-100 text-red-700';
    if (status.includes('Invited')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="text-purple-600" size={24} />}
          label="Total Applications"
          value={applications.length}
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={<Clock className="text-blue-600" size={24} />}
          label="In Progress"
          value={submittedApps.length}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<CheckCircle2 className="text-green-600" size={24} />}
          label="Funded"
          value={fundedApps.length}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<DollarSign className="text-teal-600" size={24} />}
          label="Total Requested"
          value={formatCurrency(applications.reduce((sum, app) => sum + app.amountRequested, 0))}
          bgColor="bg-teal-50"
        />
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Briefcase className="text-purple-600" size={24} />
            My Applications
          </h2>
          {applications.length > 0 && (
            <button
              onClick={() => navigate(ROUTES.PORTAL.APPLICATIONS)}
              className="text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
            >
              View All
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No applications yet</h3>
            <p className="text-gray-500 mb-6">Start your first application to access funding opportunities</p>
            <button
              onClick={() => navigate(ROUTES.PORTAL.APPLICATIONS_NEW)}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition"
            >
              <Plus size={20} />
              Create Application
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.slice(0, 5).map(app => (
              <div
                key={app.id}
                onClick={() => navigate(ROUTES.PORTAL.APPLICATION_DETAIL(app.id))}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition cursor-pointer"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {getStatusIcon(app.status)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{app.projectTitle}</h3>
                    <p className="text-sm text-gray-600 truncate">{app.orgName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="font-semibold text-gray-900">{formatCurrency(app.amountRequested)}</p>
                    <p className="text-xs text-gray-500">{app.area}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(app.status)}`}>
                    {app.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 font-display mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            icon={<Plus />}
            title="New Application"
            description="Start a new funding application"
            onClick={() => navigate(ROUTES.PORTAL.APPLICATIONS_NEW)}
          />
          <QuickActionCard
            icon={<FileText />}
            title="View All Applications"
            description="See all your submissions"
            onClick={() => navigate(ROUTES.PORTAL.APPLICATIONS)}
          />
          <QuickActionCard
            icon={<Settings />}
            title="Account Settings"
            description="Update your profile"
              onClick={() => navigate(ROUTES.PORTAL.DASHBOARD)} // Settings not yet implemented
          />
        </div>
      </div>
    </div>
  );
};

// --- COMMITTEE DASHBOARD ---
interface CommitteeDashboardProps {
  applications: Application[];
  votes: Vote[];
  scores: Score[];
  assignments: Assignment[];
  currentUser: User;
  selectedArea: string;
  setSelectedArea: (area: string) => void;
  navigate: any;
}

const CommitteeDashboard: React.FC<CommitteeDashboardProps> = ({
  applications,
  votes,
  scores,
  assignments,
  currentUser,
  selectedArea,
  setSelectedArea,
  navigate
}) => {
  const [scoringApp, setScoringApp] = useState<Application | null>(null);
  const myVotes = votes.filter(v => v.voterId === currentUser.uid);
  const myScores = scores.filter(s => s.scorerId === currentUser.uid);

  const pendingAssignments = assignments.filter(a => a.status === 'assigned' || a.status === 'draft');
  const completedAssignments = assignments.filter(a => a.status === 'submitted');

  const stage1Apps = applications.filter(app => app.status === 'Submitted-Stage1');
  const stage2Apps = applications.filter(app => app.status === 'Submitted-Stage2' || app.status === 'Invited-Stage2');

  const filteredApps = selectedArea === 'All'
    ? applications
    : applications.filter(app => app.area === selectedArea || app.area === 'Cross-Area');

  const areas: Area[] = ['Blaenavon', 'Thornhill & Upper Cwmbran', 'Trevethin, Penygarn & St. Cadocs'];

  const handleVote = async (appId: string, decision: 'yes' | 'no') => {
    await DataService.saveVote({
      id: `${appId}_${currentUser.uid}`,
      appId,
      voterId: currentUser.uid,
      decision,
      createdAt: new Date().toISOString()
    });
    await loadData(currentUser); // Refresh to show updated state
  };

  const handleScoringComplete = () => {
    setScoringApp(null);
    loadData(currentUser); // Refresh to show updated state
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Briefcase className="text-purple-600" size={24} />}
          label="Assigned Applications"
          value={assignments.length}
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={<Clock className="text-orange-600" size={24} />}
          label="Pending Review"
          value={pendingAssignments.length}
          bgColor="bg-orange-50"
        />
        <StatCard
          icon={<ThumbsUp className="text-blue-600" size={24} />}
          label="My Votes"
          value={myVotes.length}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<BarChart3 className="text-green-600" size={24} />}
          label="My Scores"
          value={myScores.length}
          bgColor="bg-green-50"
        />
      </div>

      {/* Area Filter */}
      {/* Area Badge for Committee (read-only) or Area Selector for Admin */}
      {currentUser.area && currentUser.role !== 'admin' && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-3">
            <Target className="text-purple-600" size={24} />
            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Your Assigned Area</h3>
              <p className="text-xl font-bold text-purple-900">{currentUser.area}</p>
            </div>
          </div>
        </div>
      )}

      {/* Area Filter for Admin only */}
      {currentUser.role === 'admin' && currentUser.area && (
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="text-gray-600" size={20} />
              <span className="font-semibold text-gray-700">Filter by Area:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedArea('All')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  selectedArea === 'All'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Areas
              </button>
              {areas.map(area => (
                <button
                  key={area}
                  onClick={() => setSelectedArea(area)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    selectedArea === area
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending Assignments */}
      {pendingAssignments.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-orange-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900 font-display">
              Pending Assignments ({pendingAssignments.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pendingAssignments.slice(0, 5).map(assignment => {
              const app = applications.find(a => a.id === assignment.applicationId);
              if (!app) return null;
              return (
                <div
                  key={assignment.id}
                  onClick={() => navigate(`/portal/scoring/${app.id}`)}
                  className="flex items-center justify-between p-4 border border-orange-200 bg-orange-50 rounded-lg hover:border-orange-400 transition cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <Target className="text-orange-600" size={20} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{app.projectTitle}</h3>
                      <p className="text-sm text-gray-600">{app.orgName} • {app.area}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {assignment.dueDate && (
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-gray-500">Due</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(assignment.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <ChevronRight className="text-gray-400" size={20} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Applications to Review */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <VoteIcon className="text-purple-600" size={24} />
            Applications to Review ({filteredApps.length})
          </h2>
          <button
            onClick={() => navigate(ROUTES.PORTAL.APPLICATIONS)}
            className="text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
          >
            View All
            <ChevronRight size={16} />
          </button>
        </div>

        {filteredApps.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No applications to review in this area</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApps.map(app => {
              const hasVoted = myVotes.some(v => v.appId === app.id);
              const hasScored = myScores.some(s => s.appId === app.id);

              let actionRequired = false;
              let statusBadge = <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">Pending</span>;
              let cardBorder = "border-l-gray-300";

              if (app.status === 'Submitted-Stage1') {
                if (hasVoted) {
                  statusBadge = <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Voted</span>;
                  cardBorder = "border-l-green-500";
                } else {
                  statusBadge = <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">Vote Needed</span>;
                  actionRequired = true;
                  cardBorder = "border-l-orange-500";
                }
              } else if (app.status === 'Submitted-Stage2' || app.status === 'Invited-Stage2') {
                if (hasScored) {
                  statusBadge = <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Scored</span>;
                  cardBorder = "border-l-green-500";
                } else {
                  statusBadge = <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Score Needed</span>;
                  actionRequired = true;
                  cardBorder = "border-l-purple-500";
                }
              } else {
                statusBadge = <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">Info Only</span>;
              }

              return (
                <div key={app.id} className={`bg-white rounded-xl shadow-md border-l-4 ${cardBorder} p-5 flex flex-col h-full hover:shadow-lg transition`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{app.ref}</span>
                    {statusBadge}
                  </div>

                  <h3 className="font-bold text-lg mb-1 leading-tight line-clamp-2">{app.projectTitle}</h3>
                  <p className="text-sm text-gray-500 mb-4">{app.orgName}</p>

                  <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center gap-2">
                    <button
                      onClick={() => navigate(ROUTES.PORTAL.APPLICATION_DETAIL(app.id))}
                      className="flex-1 px-4 py-2 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg text-sm font-bold transition"
                    >
                      View
                    </button>

                    {actionRequired && app.status === 'Submitted-Stage1' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleVote(app.id, 'yes'); }}
                          className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-bold transition"
                        >
                          Yes
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleVote(app.id, 'no'); }}
                          className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-bold transition"
                        >
                          No
                        </button>
                      </>
                    )}

                    {actionRequired && (app.status === 'Submitted-Stage2' || app.status === 'Invited-Stage2') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setScoringApp(app); }}
                        className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-sm font-bold transition"
                      >
                        Score App
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ScoringModal */}
      {scoringApp && (
        <ScoringModal
          isOpen={!!scoringApp}
          onClose={() => setScoringApp(null)}
          app={scoringApp}
          user={currentUser}
          onSave={handleScoringComplete}
        />
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 font-display mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            icon={<BarChart3 />}
            title="Matrix Evaluation"
            description="Score applications"
            onClick={() => navigate(ROUTES.PORTAL.SCORING)}
          />
          <QuickActionCard
            icon={<Briefcase />}
            title="All Applications"
            description="View all submissions"
            onClick={() => navigate(ROUTES.PORTAL.APPLICATIONS)}
          />
          <QuickActionCard
            icon={<Activity />}
            title="Scoring Matrix"
            description="View scoring tools"
            onClick={() => navigate(ROUTES.PORTAL.SCORING)}
          />
        </div>
      </div>
    </div>
  );
};

// --- ADMIN DASHBOARD ---
interface AdminDashboardProps {
  applications: Application[];
  votes: Vote[];
  scores: Score[];
  users: User[];
  navigate: any;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ applications, votes, scores, users, navigate }) => {
  const totalFunding = applications.reduce((sum, app) => sum + app.amountRequested, 0);
  const fundedApps = applications.filter(app => app.status === 'Funded');
  const totalFunded = fundedApps.reduce((sum, app) => sum + app.amountRequested, 0);

  const stage1Apps = applications.filter(app => app.status === 'Submitted-Stage1');
  const stage2Apps = applications.filter(app => app.status === 'Submitted-Stage2' || app.status === 'Invited-Stage2');

  const applicants = users.filter(u => u.role === 'applicant').length;
  const committee = users.filter(u => u.role === 'committee').length;

  const statusBreakdown = [
    { label: 'Draft', count: applications.filter(a => a.status === 'Draft').length, color: 'bg-gray-500' },
    { label: 'Stage 1', count: stage1Apps.length, color: 'bg-blue-500' },
    { label: 'Stage 2', count: stage2Apps.length, color: 'bg-purple-500' },
    { label: 'Funded', count: fundedApps.length, color: 'bg-green-500' },
    { label: 'Rejected', count: applications.filter(a => a.status.includes('Rejected') || a.status === 'Not-Funded').length, color: 'bg-red-500' }
  ];

  const recentApps = applications
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="text-purple-600" size={24} />}
          label="Total Applications"
          value={applications.length}
          bgColor="bg-purple-50"
          subtitle={`${stage1Apps.length} Stage 1 • ${stage2Apps.length} Stage 2`}
        />
        <StatCard
          icon={<DollarSign className="text-green-600" size={24} />}
          label="Total Funding Requested"
          value={formatCurrency(totalFunding)}
          bgColor="bg-green-50"
          subtitle={`${formatCurrency(totalFunded)} funded`}
        />
        <StatCard
          icon={<Users className="text-blue-600" size={24} />}
          label="Active Users"
          value={users.length}
          bgColor="bg-blue-50"
          subtitle={`${applicants} applicants • ${committee} committee`}
        />
        <StatCard
          icon={<TrendingUp className="text-teal-600" size={24} />}
          label="Success Rate"
          value={`${applications.length > 0 ? Math.round((fundedApps.length / applications.length) * 100) : 0}%`}
          bgColor="bg-teal-50"
          subtitle={`${fundedApps.length} of ${applications.length} funded`}
        />
      </div>

      {/* Application Status Overview */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 font-display mb-6 flex items-center gap-2">
          <BarChart3 className="text-purple-600" size={24} />
          Application Status Overview
        </h2>
        <div className="space-y-4">
          {statusBreakdown.map(status => {
            const percentage = applications.length > 0
              ? (status.count / applications.length) * 100
              : 0;
            return (
              <div key={status.label}>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-gray-700">{status.label}</span>
                  <span className="text-gray-600">{status.count} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${status.color} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 font-display mb-4 flex items-center gap-2">
            <ThumbsUp className="text-blue-600" size={20} />
            Voting Activity
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Votes Cast</span>
              <span className="font-bold text-gray-900">{votes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Yes Votes</span>
              <span className="font-bold text-green-600">{votes.filter(v => v.decision === 'yes').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">No Votes</span>
              <span className="font-bold text-red-600">{votes.filter(v => v.decision === 'no').length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 font-display mb-4 flex items-center gap-2">
            <BarChart3 className="text-green-600" size={20} />
            Scoring Activity
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Scores</span>
              <span className="font-bold text-gray-900">{scores.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Score</span>
              <span className="font-bold text-purple-600">
                {scores.length > 0
                  ? (scores.reduce((sum, s) => sum + s.weightedTotal, 0) / scores.length).toFixed(1)
                  : '0.0'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Final Scores</span>
              <span className="font-bold text-green-600">{scores.filter(s => s.isFinal).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Activity className="text-purple-600" size={24} />
            Recent Activity
          </h2>
          <button
            onClick={() => navigate(ROUTES.PORTAL.APPLICATIONS)}
            className="text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
          >
            View All
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {recentApps.map(app => (
            <div
              key={app.id}
              onClick={() => navigate(ROUTES.PORTAL.APPLICATION_DETAIL(app.id))}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-4 flex-1">
                <FileText className="text-purple-600" size={20} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{app.projectTitle}</h3>
                  <p className="text-sm text-gray-600 truncate">{app.orgName} • {app.area}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden lg:block">
                  <p className="font-semibold text-gray-900">{formatCurrency(app.amountRequested)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(app.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  app.status === 'Funded' ? 'bg-green-100 text-green-700' :
                  app.status.includes('Submitted') ? 'bg-blue-100 text-blue-700' :
                  app.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {app.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 font-display mb-4">Admin Functions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            icon={<Settings />}
            title="Admin Console"
            description="Full admin control panel"
            onClick={() => navigate(ROUTES.PORTAL.ADMIN)}
          />
          <QuickActionCard
            icon={<Users />}
            title="Manage Users"
            description="Create and edit user accounts"
            onClick={() => navigate(ROUTES.PORTAL.ADMIN)}
          />
          <QuickActionCard
            icon={<FileText />}
            title="Master List"
            description="View all applications with analytics"
            onClick={() => navigate(ROUTES.PORTAL.ADMIN)}
          />
        </div>
      </div>
    </div>
  );
};

// --- SHARED COMPONENTS ---
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bgColor: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, bgColor, subtitle }) => (
  <div className={`${bgColor} rounded-xl p-6 shadow-md`}>
    <div className="flex items-center justify-between mb-2">
      <div className="p-2 bg-white rounded-lg shadow-sm">
        {icon}
      </div>
    </div>
    <p className="text-sm text-gray-600 font-semibold mb-1">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
  </div>
);

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition text-left group"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition">
        {icon}
      </div>
      <h3 className="font-bold text-gray-900">{title}</h3>
    </div>
    <p className="text-sm text-gray-600">{description}</p>
  </button>
);

export default Dashboard;
