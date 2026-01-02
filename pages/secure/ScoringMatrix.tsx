import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SecureLayout } from '../../components/Layout';
import { Button, Card, Badge, Modal } from '../../components/UI';
import { DataService } from '../../services/firebase';
import { Application, Score, UserRole, User, Round, PortalSettings } from '../../types';
import { SCORING_CRITERIA } from '../../constants';
import { BarChart3, CheckCircle, Clock, AlertCircle, Save, Eye, FileText, Lock } from 'lucide-react';

// Helper to convert lowercase role string to UserRole enum
const roleToUserRole = (role: string | undefined): UserRole => {
  const normalized = (role || '').toUpperCase();
  switch (normalized) {
    case 'ADMIN': return UserRole.ADMIN;
    case 'COMMITTEE': return UserRole.COMMITTEE;
    case 'APPLICANT': return UserRole.APPLICANT;
    default: return UserRole.PUBLIC;
  }
};

interface CriterionScore {
  score: number;
  notes: string;
}

interface ApplicationWithScores extends Application {
  myScore?: Score;
  allScores?: Score[];
  isScored: boolean;
}

const ScoringMatrix: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<ApplicationWithScores[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ApplicationWithScores | null>(null);
  const [scoringData, setScoringData] = useState<Record<string, CriterionScore>>({});
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'scored' | 'unscored'>('unscored');
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null);

  // Determine role flags (safe to compute even with null user)
  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === 'admin';
  const isCommittee = currentUser?.role === UserRole.COMMITTEE || currentUser?.role === 'committee' || isAdmin;

  // Check if scoring is allowed based on round/portal settings
  const isScoringAllowed = (): { allowed: boolean; reason?: string } => {
    // Admins can always score
    if (isAdmin) return { allowed: true };

    // Check if there's an active round with scoring enabled
    if (activeRound && activeRound.scoringOpen === false) {
      return { allowed: false, reason: 'Scoring is currently closed for this funding round.' };
    }

    return { allowed: true };
  };

  // Get current user on mount - MUST be before any conditional returns
  useEffect(() => {
    const user = DataService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
  }, [navigate]);

  // Load data when user is available - MUST be before any conditional returns
  useEffect(() => {
    if (currentUser && isCommittee) {
      loadData();
    }
  }, [currentUser, isCommittee]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Fetch portal settings and rounds
      const [settings, rounds] = await Promise.all([
        DataService.getPortalSettings(),
        DataService.getRounds()
      ]);
      setPortalSettings(settings);

      // Find the active round (status 'scoring' or 'open')
      const active = rounds.find(r => r.status === 'scoring' || r.status === 'open');
      setActiveRound(active || null);

      // Fetch applications - filter by area for committee members
      const area = isAdmin ? undefined : currentUser.area;
      const apps = await DataService.getApplications(area);

      // Only show Stage 2 applications that are ready for scoring
      const eligibleApps = apps.filter(
        app => (app.status === 'Submitted-Stage2' || app.status === 'Invited-Stage2')
      );

      // Fetch all scores
      const allScores = await DataService.getScores();
      setScores(allScores);

      // Enrich applications with scoring data
      const enrichedApps: ApplicationWithScores[] = eligibleApps.map(app => {
        const appScores = allScores.filter(s => s.appId === app.id);
        const myScore = appScores.find(s => s.scorerId === currentUser.uid);

        return {
          ...app,
          myScore,
          allScores: appScores,
          isScored: !!myScore
        };
      });

      setApplications(enrichedApps);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Access control - render loading or access denied AFTER all hooks
  if (!currentUser) {
    return (
      <SecureLayout userRole={UserRole.PUBLIC}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </SecureLayout>
    );
  }

  if (!isCommittee) {
    return (
      <SecureLayout userRole={roleToUserRole(currentUser.role)}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="max-w-md text-center">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              This scoring interface is only accessible to Committee Members and Administrators.
            </p>
          </Card>
        </div>
      </SecureLayout>
    );
  }

  const scoringStatus = isScoringAllowed();

  const openScoringModal = (app: ApplicationWithScores) => {
    // Check if scoring is allowed (admins bypass this check)
    if (!scoringStatus.allowed) {
      alert(scoringStatus.reason || 'Scoring is currently not available.');
      return;
    }

    setSelectedApp(app);

    // Initialize scoring data from existing score or defaults
    const initialData: Record<string, CriterionScore> = {};
    SCORING_CRITERIA.forEach(criterion => {
      initialData[criterion.id] = {
        score: app.myScore?.breakdown[criterion.id] || 0,
        notes: app.myScore?.notes?.[criterion.id] || ''
      };
    });
    setScoringData(initialData);
  };

  const calculateWeightedTotal = (): number => {
    let total = 0;
    let maxTotal = 0;
    SCORING_CRITERIA.forEach(criterion => {
      const rawScore = scoringData[criterion.id]?.score || 0;
      total += rawScore * criterion.weight;
      maxTotal += 3 * criterion.weight;
    });
    // Return as percentage (0-100)
    return maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  };

  const handleScoreChange = (criterionId: string, score: number) => {
    setScoringData(prev => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        score: Math.max(0, Math.min(3, score))
      }
    }));
  };

  const handleNotesChange = (criterionId: string, notes: string) => {
    setScoringData(prev => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        notes
      }
    }));
  };

  const handleSaveScore = async () => {
    if (!selectedApp) return;

    setSaving(true);
    try {
      const breakdown: Record<string, number> = {};
      const notes: Record<string, string> = {};

      SCORING_CRITERIA.forEach(criterion => {
        breakdown[criterion.id] = scoringData[criterion.id]?.score || 0;
        notes[criterion.id] = scoringData[criterion.id]?.notes || '';
      });

      const score: Score = {
        id: `${selectedApp.id}_${currentUser.uid}`,
        appId: selectedApp.id,
        scorerId: currentUser.uid,
        scorerName: currentUser.displayName || currentUser.username || currentUser.email,
        weightedTotal: calculateWeightedTotal(),
        breakdown,
        notes,
        isFinal: true,
        createdAt: selectedApp.myScore?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await DataService.saveScore(score);

      // Reload data to reflect changes
      await loadData();

      // Close modal
      setSelectedApp(null);
      setScoringData({});
    } catch (error) {
      console.error('Failed to save score:', error);
      alert('Failed to save score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filterStatus === 'scored') return app.isScored;
    if (filterStatus === 'unscored') return !app.isScored;
    return true;
  });

  const weightedTotal = calculateWeightedTotal();
  const completionPercentage = (weightedTotal / 100) * 100;

  if (loading) {
    return (
      <SecureLayout userRole={roleToUserRole(currentUser.role)}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading applications...</p>
          </div>
        </div>
      </SecureLayout>
    );
  }

  return (
    <SecureLayout userRole={roleToUserRole(currentUser.role)}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-purple-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">Scoring Matrix</h1>
          </div>
          <p className="text-gray-600">
            Evaluate Part 2 applications using the 10-point criteria framework
          </p>
          {!isAdmin && currentUser.area && (
            <div className="mt-2">
              <Badge variant="purple">Viewing: {currentUser.area}</Badge>
            </div>
          )}
        </div>

        {/* Scoring Closed Banner */}
        {!scoringStatus.allowed && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Lock className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold text-amber-800">Scoring Currently Closed</p>
              <p className="text-sm text-amber-700">{scoringStatus.reason}</p>
              <p className="text-xs text-amber-600 mt-1">You can view applications but cannot submit new scores at this time.</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-bold uppercase tracking-wide">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{applications.length}</p>
              </div>
              <FileText className="text-gray-300" size={40} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-bold uppercase tracking-wide">Scored by You</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {applications.filter(a => a.isScored).length}
                </p>
              </div>
              <CheckCircle className="text-green-300" size={40} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-bold uppercase tracking-wide">Pending Review</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">
                  {applications.filter(a => !a.isScored).length}
                </p>
              </div>
              <Clock className="text-amber-300" size={40} />
            </div>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={filterStatus === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            All ({applications.length})
          </Button>
          <Button
            variant={filterStatus === 'unscored' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('unscored')}
          >
            Unscored ({applications.filter(a => !a.isScored).length})
          </Button>
          <Button
            variant={filterStatus === 'scored' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('scored')}
          >
            Scored ({applications.filter(a => a.isScored).length})
          </Button>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <Card className="text-center py-12">
            <AlertCircle className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-600 mb-2">No Applications Found</h3>
            <p className="text-gray-500">
              {filterStatus === 'unscored' && 'All applications have been scored!'}
              {filterStatus === 'scored' && 'No scored applications yet.'}
              {filterStatus === 'all' && 'No applications available for scoring.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map(app => (
              <Card key={app.id} className="hover:shadow-2xl transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{app.projectTitle}</h3>
                      {app.isScored && (
                        <Badge variant="green">
                          <CheckCircle size={14} className="inline mr-1" />
                          Scored
                        </Badge>
                      )}
                      {!app.isScored && (
                        <Badge variant="amber">
                          <Clock size={14} className="inline mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 font-bold">Ref:</span>{' '}
                        <span className="text-gray-900">{app.ref}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-bold">Applicant:</span>{' '}
                        <span className="text-gray-900">{app.applicant}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-bold">Area:</span>{' '}
                        <Badge variant="purple">{app.area}</Badge>
                      </div>
                    </div>

                    <p className="text-gray-600 mt-2 line-clamp-2">{app.projectSummary}</p>

                    {app.isScored && app.myScore && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-600">Your Score:</span>
                          <div className="flex items-center gap-2">
                            <div className="bg-purple-100 px-3 py-1 rounded-lg">
                              <span className="text-purple-900 font-bold">{app.myScore.weightedTotal}/100</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              Last updated: {new Date(app.myScore.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant={app.isScored ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => openScoringModal(app)}
                    >
                      {app.isScored ? (
                        <>
                          <Eye size={16} />
                          Review Score
                        </>
                      ) : (
                        <>
                          <BarChart3 size={16} />
                          Score Application
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Scoring Modal */}
        {selectedApp && (
          <Modal
            isOpen={!!selectedApp}
            onClose={() => setSelectedApp(null)}
            title={`Score: ${selectedApp.projectTitle}`}
            size="xl"
          >
            <div className="space-y-6">
              {/* Application Summary */}
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <h4 className="font-bold text-purple-900 mb-2">Application Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-purple-700 font-bold">Reference:</span> {selectedApp.ref}
                  </div>
                  <div>
                    <span className="text-purple-700 font-bold">Applicant:</span> {selectedApp.applicant}
                  </div>
                  <div>
                    <span className="text-purple-700 font-bold">Area:</span> {selectedApp.area}
                  </div>
                  <div>
                    <span className="text-purple-700 font-bold">Funding:</span> £{selectedApp.amountRequest?.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Weighted Total Display */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-lg">Weighted Total Score</h4>
                  <div className="text-4xl font-bold">{weightedTotal}/100</div>
                </div>
                <div className="bg-white/20 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-teal-400 h-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Scoring Criteria */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 text-lg">Evaluation Criteria</h4>

                {SCORING_CRITERIA.map((criterion, idx) => {
                  const currentScore = scoringData[criterion.id]?.score || 0;
                  const currentNotes = scoringData[criterion.id]?.notes || '';

                  return (
                    <div key={criterion.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-bold text-gray-900 mb-1">{criterion.name}</h5>
                          <p className="text-sm text-gray-600 mb-2">{criterion.guidance}</p>
                          <div
                            className="text-xs text-gray-500 bg-white border border-gray-200 rounded-lg p-2"
                            dangerouslySetInnerHTML={{ __html: criterion.details }}
                          />
                        </div>
                        <div className="ml-4 text-right">
                          <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Weight</div>
                          <div className="text-2xl font-bold text-purple-600">{criterion.weight}%</div>
                        </div>
                      </div>

                      {/* Score Slider */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-bold text-gray-700">Score (0-3)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="3"
                              value={currentScore}
                              onChange={(e) => handleScoreChange(criterion.id, parseInt(e.target.value) || 0)}
                              className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-center font-bold"
                            />
                            <span className="text-sm text-gray-500">
                              = {((currentScore / 3) * criterion.weight).toFixed(1)} weighted
                            </span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="3"
                          step="1"
                          value={currentScore}
                          onChange={(e) => handleScoreChange(criterion.id, parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>0</span>
                          <span>1</span>
                          <span>2</span>
                          <span>3</span>
                        </div>
                      </div>

                      {/* Notes Field */}
                      <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">
                          Notes / Comments
                        </label>
                        <textarea
                          value={currentNotes}
                          onChange={(e) => handleNotesChange(criterion.id, e.target.value)}
                          placeholder="Add your reasoning or notes for this criterion..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={handleSaveScore}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save size={18} />
                      {selectedApp.isScored ? 'Update Score' : 'Submit Score'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedApp(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </SecureLayout>
  );
};

export default ScoringMatrix;
