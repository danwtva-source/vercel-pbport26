import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SecureLayout } from '../../components/Layout';
import { DataService, uploadFile } from '../../services/firebase';
import { UserRole, Application, Vote, Score, Assignment, User, Area, PortalSettings, Notification, Announcement } from '../../types';
import { ScoringModal } from '../../components/ScoringModal';
import { AnnouncementsBanner } from '../../components/AnnouncementsBanner';
import { useAuth } from '../../context/AuthContext';
import { ROUTES, isStoredRole, toUserRole } from '../../utils';
import { getAreaColor } from '../../constants';
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
  Coins,
  Target,
  Activity,
  Calendar,
  ChevronRight,
  Briefcase,
  Vote as VoteIcon,
  Lock,
  MapPin,
  Bell,
  RefreshCw
} from 'lucide-react';

// Settings polling interval (30 seconds)
const SETTINGS_POLL_INTERVAL = 30000;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastSettingsCheck, setLastSettingsCheck] = useState<number>(Date.now());
  const settingsPollRef = useRef<NodeJS.Timeout | null>(null);
  const { userProfile, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (userProfile) {
      setCurrentUser(userProfile);
      loadData(userProfile);
    } else {
      navigate(ROUTES.PUBLIC.LOGIN);
    }
  }, [authLoading, userProfile, navigate]);

  const loadData = async (user: User) => {
    setLoading(true);
    setError(null);
    try {
      // For committee members, fetch applications filtered by their area
      const userArea = isStoredRole(user.role, 'committee') ? user.area : undefined;

      const [appsData, votesData, scoresData, assignmentsData, usersData, settings, announcementsData] = await Promise.all([
        DataService.getApplications(userArea || undefined),
        DataService.getVotes(),
        DataService.getScores(),
        isStoredRole(user.role, 'committee') ? DataService.getAssignments(user.uid) : Promise.resolve([]),
        isStoredRole(user.role, 'admin') ? DataService.getUsers() : Promise.resolve([]),
        DataService.getPortalSettings(),
        DataService.getAnnouncements()
      ]);

      setAllApplications(appsData);
      setVotes(votesData);
      setScores(scoresData);
      setAssignments(assignmentsData);
      setUsers(usersData);
      setPortalSettings(settings);
      setAnnouncements(announcementsData);

      // Filter applications based on role
      if (isStoredRole(user.role, 'applicant')) {
        setApplications(appsData.filter(app => app.userId === user.uid));
      } else if (isStoredRole(user.role, 'committee')) {
        // AREA-BASED FILTERING: Committee members only see apps in their assigned area
        // First filter by area (already done in getApplications), then by assignments
        const assignedAppIds = assignmentsData.map(a => a.applicationId);
        // Show both area-matched apps with assignments AND all apps in their area for voting
        const areaFilteredApps = appsData.filter(app => {
          // Must be in committee member's area (or cross-area)
          if (user.area && app.area !== user.area && app.area !== 'Cross-Area') {
            return false;
          }
          return true;
        });
        setApplications(areaFilteredApps);
      } else {
        setApplications(appsData);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load notifications
  const loadNotifications = useCallback(async (userId: string) => {
    try {
      const notifs = await DataService.getNotifications(userId);
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  }, []);

  // Poll for settings changes (committee members only)
  useEffect(() => {
    if (!currentUser || !isStoredRole(currentUser.role, 'committee')) return;

    const pollSettings = async () => {
      try {
        const newSettings = await DataService.getPortalSettings();
        setPortalSettings(prev => {
          // Check if settings changed and notify user
          if (prev) {
            const votingChanged = prev.stage1VotingOpen !== newSettings.stage1VotingOpen;
            const scoringChanged = prev.stage2ScoringOpen !== newSettings.stage2ScoringOpen;

            if (votingChanged || scoringChanged) {
              // Settings changed - update the UI
              setLastSettingsCheck(Date.now());
            }
          }
          return newSettings;
        });
      } catch (err) {
        console.error('Error polling settings:', err);
      }
    };

    // Initial poll
    pollSettings();

    // Set up interval
    settingsPollRef.current = setInterval(pollSettings, SETTINGS_POLL_INTERVAL);

    return () => {
      if (settingsPollRef.current) {
        clearInterval(settingsPollRef.current);
      }
    };
  }, [currentUser]);

  // Load notifications on mount and poll periodically
  useEffect(() => {
    if (!currentUser) return;

    loadNotifications(currentUser.uid);

    // Poll notifications every minute
    const notifInterval = setInterval(() => {
      loadNotifications(currentUser.uid);
    }, 60000);

    return () => clearInterval(notifInterval);
  }, [currentUser, loadNotifications]);

  // Handle marking notification as read
  const handleMarkNotificationRead = async (notificationId: string) => {
    await DataService.markNotificationRead(notificationId);
    if (currentUser) {
      loadNotifications(currentUser.uid);
    }
  };

  // Handle marking all notifications as read
  const handleMarkAllRead = async () => {
    if (currentUser) {
      await DataService.markAllNotificationsRead(currentUser.uid);
      loadNotifications(currentUser.uid);
    }
  };

  // Show loading state while auth is resolving or data is loading
  if (authLoading || !currentUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-bold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if data loading failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={20} />
              <p className="font-bold">Error Loading Dashboard</p>
            </div>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => loadData(currentUser)}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Determine user role from enum or string
  const userRole = toUserRole(currentUser.role);

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
              {userRole === UserRole.COMMUNITY && 'Community Member Dashboard'}
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {currentUser.displayName || currentUser.username || currentUser.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification Bell - For all authenticated users */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100"
              >
                <Bell size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-purple-600 hover:underline font-bold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-gray-500 text-sm">No notifications</p>
                    ) : (
                      notifications.slice(0, 10).map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => handleMarkNotificationRead(notif.id)}
                          className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${
                            !notif.read ? 'bg-purple-50' : ''
                          }`}
                        >
                          <p className="font-bold text-sm text-gray-900">{notif.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadData(currentUser)}
              className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100"
              title="Refresh data"
            >
              <RefreshCw size={20} className="text-gray-600" />
            </button>

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
        </div>

        {/* Applicant Dashboard */}
        {userRole === UserRole.APPLICANT && (
          <ApplicantDashboard
            applications={applications}
            currentUser={currentUser}
            navigate={navigate}
            portalSettings={portalSettings}
            onReloadData={() => loadData(currentUser)}
            announcements={announcements}
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
            navigate={navigate}
            onRefresh={() => loadData(currentUser)}
            portalSettings={portalSettings}
            announcements={announcements}
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

        {/* Community Member Dashboard */}
        {userRole === UserRole.COMMUNITY && (
          <CommunityDashboard
            currentUser={currentUser}
            navigate={navigate}
            portalSettings={portalSettings}
            announcements={announcements}
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
  portalSettings: PortalSettings | null;
  onReloadData: () => void;
  announcements: Announcement[];
}

const ApplicantDashboard: React.FC<ApplicantDashboardProps> = ({ applications, currentUser, navigate, portalSettings, onReloadData, announcements }) => {
  const [submittingPublicPack, setSubmittingPublicPack] = useState(false);
  const [publicPackApp, setPublicPackApp] = useState<Application | null>(null);
  const [publicVoteBlurb, setPublicVoteBlurb] = useState('');
  const [publicVoteImageFile, setPublicVoteImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const publicVoteBlurbWordCount = publicVoteBlurb.split(/\s+/).filter(Boolean).length;
  const isPublicBlurbValid = publicVoteBlurbWordCount <= 200;
  const draftApps = applications.filter(app => app.status === 'Draft');
  const submittedApps = applications.filter(app => app.status.includes('Submitted'));
  const fundedApps = applications.filter(app => app.status === 'Funded');
  const rejectedApps = applications.filter(app => app.status.includes('Rejected') || app.status === 'Not-Funded');

  // Check if results have been released
  const resultsReleased = portalSettings?.resultsReleased || false;

  // Find funded apps that need public vote pack
  const fundedNeedingPack = fundedApps.filter(app => !app.publicVotePackComplete);

  const handleSubmitPublicPack = async () => {
    if (!publicPackApp || !publicVoteBlurb || !publicVoteImageFile) {
      alert('Please provide both an image and a blurb');
      return;
    }

    if (!isPublicBlurbValid) {
      alert('Please keep your public vote description to 200 words or less.');
      return;
    }

    setSubmittingPublicPack(true);
    try {
      // Upload image
      setUploadingImage(true);
      const imagePath = `public-vote-images/${publicPackApp.id}_${Date.now()}_${publicVoteImageFile.name}`;
      const imageUrl = await uploadFile(imagePath, publicVoteImageFile);
      setUploadingImage(false);

      // Update application with public vote pack
      await DataService.updateApplication(publicPackApp.id, {
        publicVoteImage: imageUrl,
        publicVoteBlurb: publicVoteBlurb,
        publicVotePackComplete: true
      });

      alert('Public vote pack submitted successfully!');
      setPublicPackApp(null);
      setPublicVoteBlurb('');
      setPublicVoteImageFile(null);
      onReloadData();
    } catch (error) {
      console.error('Error submitting public pack:', error);
      alert('Failed to submit public vote pack');
    } finally {
      setSubmittingPublicPack(false);
      setUploadingImage(false);
    }
  };

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
      {/* Announcements Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <AnnouncementsBanner role="applicant" maxItems={3} />
      </div>

      {/* Results Released Notifications */}
      {resultsReleased && fundedApps.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-300 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-900 mb-2">Congratulations! Your Application Has Been Successful</h3>
              <p className="text-green-800 mb-4">
                Your project has been selected for public voting. To proceed, please submit your public vote pack (an image and a short description) below.
              </p>
              {fundedNeedingPack.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="font-bold text-gray-900 mb-2">Applications needing public vote pack:</p>
                  <ul className="space-y-2">
                    {fundedNeedingPack.map(app => (
                      <li key={app.id} className="flex items-center justify-between">
                        <span className="text-gray-700">{app.projectTitle}</span>
                        <button
                          onClick={() => {
                            setPublicPackApp(app);
                            setPublicVoteBlurb(app.publicVoteBlurb || '');
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                        >
                          Submit Pack
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AnnouncementsFeed announcements={announcements} userRole="applicant" />

      {resultsReleased && rejectedApps.length > 0 && fundedApps.length === 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900 mb-2">Application Update</h3>
              <p className="text-red-800">
                Unfortunately, you have not been successful on this occasion. We appreciate your interest and encourage you to look out for future funding rounds. Please feel free to contact us if you would like feedback on your application.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Public Vote Pack Submission Modal */}
      {publicPackApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-purple-900">Submit Public Vote Pack</h2>
              <button
                onClick={() => {
                  setPublicPackApp(null);
                  setPublicVoteBlurb('');
                  setPublicVoteImageFile(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={28} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-gray-700 mb-4">
                  <strong>Project:</strong> {publicPackApp.projectTitle}
                </p>
                <p className="text-sm text-gray-600 mb-6">
                  Your public vote pack will be displayed to the community during public voting. Please provide a compelling image and description to help voters understand your project.
                </p>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Project Image *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPublicVoteImageFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                />
                {publicVoteImageFile && (
                  <p className="text-sm text-green-600 mt-2">Selected: {publicVoteImageFile.name}</p>
                )}
              </div>

              {/* Blurb */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Project Description * (max 200 words)
                </label>
                <textarea
                  value={publicVoteBlurb}
                  onChange={(e) => setPublicVoteBlurb(e.target.value)}
                  rows={6}
                  maxLength={1200}
                  placeholder="Provide a short, engaging description of your project for public voters..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {publicVoteBlurbWordCount} / 200 words
                </p>
                {!isPublicBlurbValid && (
                  <p className="text-sm text-red-600 mt-1">Please reduce your description to 200 words or fewer.</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  onClick={handleSubmitPublicPack}
                  disabled={submittingPublicPack || !publicVoteBlurb || !publicVoteImageFile || !isPublicBlurbValid}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-bold transition"
                >
                  {uploadingImage ? 'Uploading Image...' : submittingPublicPack ? 'Submitting...' : 'Submit Public Vote Pack'}
                </button>
                <button
                  onClick={() => {
                    setPublicPackApp(null);
                    setPublicVoteBlurb('');
                    setPublicVoteImageFile(null);
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          icon={<Coins className="text-teal-600" size={24} />}
          label="Total Requested"
          value={`£${applications.reduce((sum, app) => sum + app.amountRequested, 0).toLocaleString()}`}
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
                    <p className="font-semibold text-gray-900">£{app.amountRequested.toLocaleString()}</p>
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
            onClick={() => navigate(ROUTES.PORTAL.SETTINGS)}
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
  navigate: any;
  onRefresh: () => Promise<void>;
  portalSettings: PortalSettings | null;
  announcements: Announcement[];
}

const CommitteeDashboard: React.FC<CommitteeDashboardProps> = ({
  applications,
  votes,
  scores,
  assignments,
  currentUser,
  navigate,
  onRefresh,
  portalSettings,
  announcements
}) => {
  const [scoringApp, setScoringApp] = useState<Application | null>(null);
  const myVotes = votes.filter(v => v.voterId === currentUser.uid);
  const myScores = scores.filter(s => s.scorerId === currentUser.uid);

  const pendingAssignments = assignments.filter(a => a.status === 'assigned' || a.status === 'draft');
  const completedAssignments = assignments.filter(a => a.status === 'submitted');

  const stage1Apps = applications.filter(app => app.status === 'Submitted-Stage1');
  const stage2Apps = applications.filter(app => app.status === 'Submitted-Stage2' || app.status === 'Invited-Stage2');

  const assignedAppIds = new Set(assignments.map(assignment => assignment.applicationId));
  const filteredApps = applications.filter(app => assignedAppIds.has(app.id));

  // Check if committee voting on EOIs is allowed (Stage 1)
  const isStage1VotingAllowed = portalSettings?.stage1VotingOpen === true;
  // Check if committee scoring is allowed (Stage 2)
  const isStage2ScoringAllowed = portalSettings?.stage2ScoringOpen === true;

  const handleVote = async (appId: string, decision: 'yes' | 'no') => {
    if (!isStage1VotingAllowed) {
      alert('Stage 1 committee voting is currently closed. Contact Admin to enable voting.');
      return;
    }
    await DataService.saveVote({
      id: `${appId}_${currentUser.uid}`,
      appId,
      applicationId: appId,
      voterId: currentUser.uid,
      committeeId: currentUser.uid,
      decision,
      createdAt: new Date().toISOString()
    });
    await onRefresh(); // Refresh data without full page reload
  };

  const handleScoringComplete = async () => {
    setScoringApp(null);
    await onRefresh(); // Refresh data without full page reload
  };

  return (
    <div className="space-y-6">
      <AnnouncementsFeed announcements={announcements} userRole="committee" />

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

      {/* Area Indicator - Committee members only see applications from their area */}
      {currentUser.area && (
        <div
          className="rounded-xl shadow-md p-4 border-l-4"
          style={{
            borderLeftColor: getAreaColor(currentUser.area),
            backgroundColor: `${getAreaColor(currentUser.area)}15`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <MapPin style={{ color: getAreaColor(currentUser.area) }} size={20} />
                <span className="font-semibold text-gray-700">Your Area:</span>
              </div>
              <span
                className="px-4 py-2 rounded-lg font-bold text-white"
                style={{ backgroundColor: getAreaColor(currentUser.area) }}
              >
                {currentUser.area}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              You can only view and interact with applications in your assigned area
            </div>
          </div>
        </div>
      )}

      {/* Workflow Status Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stage 1 Voting Status */}
        <div className={`rounded-xl p-4 flex items-center gap-3 ${
          isStage1VotingAllowed
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          {isStage1VotingAllowed ? (
            <>
              <CheckCircle2 className="text-green-600 flex-shrink-0" size={24} />
              <div>
                <p className="font-bold text-green-800">Stage 1 Voting: Open</p>
                <p className="text-sm text-green-700">You can vote Yes/No on EOI applications</p>
              </div>
            </>
          ) : (
            <>
              <Lock className="text-amber-600 flex-shrink-0" size={24} />
              <div>
                <p className="font-bold text-amber-800">Stage 1 Voting: Closed</p>
                <p className="text-sm text-amber-700">EOI voting will be enabled by Admin</p>
              </div>
            </>
          )}
        </div>

        {/* Stage 2 Scoring Status */}
        <div className={`rounded-xl p-4 flex items-center gap-3 ${
          isStage2ScoringAllowed
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          {isStage2ScoringAllowed ? (
            <>
              <CheckCircle2 className="text-green-600 flex-shrink-0" size={24} />
              <div>
                <p className="font-bold text-green-800">Stage 2 Scoring: Open</p>
                <p className="text-sm text-green-700">You can score full applications</p>
              </div>
            </>
          ) : (
            <>
              <Lock className="text-amber-600 flex-shrink-0" size={24} />
              <div>
                <p className="font-bold text-amber-800">Stage 2 Scoring: Closed</p>
                <p className="text-sm text-amber-700">Application scoring will be enabled by Admin</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Announcements Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <AnnouncementsBanner role="committee" maxItems={3} />
      </div>

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
            onClick={() => navigate(ROUTES.PORTAL.SCORING)}
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
          icon={<Coins className="text-green-600" size={24} />}
          label="Total Funding Requested"
          value={`£${totalFunding.toLocaleString()}`}
          bgColor="bg-green-50"
          subtitle={`£${totalFunded.toLocaleString()} funded`}
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
                  <p className="font-semibold text-gray-900">£{app.amountRequested.toLocaleString()}</p>
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

// --- COMMUNITY MEMBER DASHBOARD ---
interface CommunityDashboardProps {
  currentUser: User;
  navigate: any;
  portalSettings: PortalSettings | null;
  announcements: Announcement[];
}

const CommunityDashboard: React.FC<CommunityDashboardProps> = ({ currentUser, navigate, portalSettings, announcements }) => {
  const votingOpen = portalSettings?.votingOpen || false;

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-purple-600 to-teal-600 text-white rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-3 font-display">Welcome to Communities' Choice!</h2>
        <p className="text-lg text-purple-100 leading-relaxed">
          As a community member, you can stay informed about participatory budgeting projects, participate in public voting when it's live, and engage in community discussions.
        </p>
      </div>

      <AnnouncementsFeed announcements={announcements} userRole="public" />

      {/* Quick Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Public Voting Status */}
        <div className="bg-white rounded-xl shadow-md p-6 border-2 border-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              votingOpen ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <VoteIcon size={24} className={votingOpen ? 'text-green-600' : 'text-gray-400'} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Public Voting</h3>
              <p className={`text-sm font-semibold ${votingOpen ? 'text-green-600' : 'text-gray-500'}`}>
                {votingOpen ? 'Now Open!' : 'Not Live Yet'}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {votingOpen
              ? 'Public voting is currently open. You can view and vote on projects competing for funding.'
              : 'Public voting will open soon. Check back later to vote on your favourite projects.'}
          </p>
          {votingOpen ? (
            <button
              onClick={() => navigate(ROUTES.PUBLIC.VOTING_LIVE)}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition"
            >
              Vote on Projects
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-gray-200 text-gray-500 px-4 py-2 rounded-lg font-bold cursor-not-allowed"
            >
              Voting Opens Soon
            </button>
          )}
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-xl shadow-md p-6 border-2 border-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Settings size={24} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Your Account</h3>
              <p className="text-sm text-gray-500">Community Member</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Manage your account settings, update your profile, and customize your preferences.
          </p>
          <button
            onClick={() => navigate(ROUTES.PORTAL.SETTINGS)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold transition"
          >
            Account Settings
          </button>
        </div>
      </div>

      {/* Learn More */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="text-white" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 mb-2">About Communities' Choice</h3>
            <p className="text-blue-800 mb-4">
              Communities' Choice is a participatory budgeting initiative that gives local residents a direct voice in how funding is allocated. Learn more about the process, view community priorities, and see the timeline for the current funding round.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(ROUTES.PUBLIC.PRIORITIES)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition"
              >
                View Priorities
              </button>
              <button
                onClick={() => navigate(ROUTES.PUBLIC.TIMELINE)}
                className="bg-white hover:bg-blue-50 text-blue-700 border-2 border-blue-300 px-4 py-2 rounded-lg font-bold text-sm transition"
              >
                View Timeline
              </button>
              <button
                onClick={() => navigate(ROUTES.PUBLIC.RESOURCES)}
                className="bg-white hover:bg-blue-50 text-blue-700 border-2 border-blue-300 px-4 py-2 rounded-lg font-bold text-sm transition"
              >
                Resources
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
