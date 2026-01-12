import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../components/Layout';
import { Vote as VoteIcon, Users, MapPin, Coins, CheckCircle2, Clock, ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { DataService } from '../../services/firebase';
import { Application, PortalSettings, PublicVote } from '../../types';
import { ROUTES } from '../../utils';
import { getAreaColor } from '../../constants';

const PublicVotingPage: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [publicVotes, setPublicVotes] = useState<PublicVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);
  const eligibilityStorageKey = 'pb_public_vote_eligibility';
  const voterIdStorageKey = 'pb_public_voter_id';

  useEffect(() => {
    loadData();
  }, []);

  const getOrCreateVoterId = () => {
    const existing = localStorage.getItem(voterIdStorageKey);
    if (existing) return existing;
    const newId = (globalThis.crypto?.randomUUID?.() ?? `pv_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(voterIdStorageKey, newId);
    return newId;
  };

  const getEligibility = () => {
    const stored = localStorage.getItem(eligibilityStorageKey);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as { area: string; checkedAt: number };
    } catch (error) {
      return null;
    }
  };

  const loadData = async () => {
    try {
      const [appsData, settingsData, publicVotesData] = await Promise.all([
        DataService.getApplications(),
        DataService.getPortalSettings(),
        DataService.getPublicVotes()
      ]);

      // Filter for funded applications with public vote pack complete
      const votableApps = appsData.filter(
        app => app.status === 'Funded' && app.publicVotePackComplete
      );

      setApplications(votableApps);
      setSettings(settingsData);
      setPublicVotes(publicVotesData);
    } catch (error) {
      console.error('Error loading public voting data:', error);
      setError('Unable to load public voting data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Check voting dates
  const now = Date.now();
  const votingStartDate = settings?.publicVotingStartDate;
  const votingEndDate = settings?.publicVotingEndDate;

  // Voting is open if: votingOpen is true AND we're within the date range (if dates are set)
  const isWithinDateRange = (
    (!votingStartDate || now >= votingStartDate) &&
    (!votingEndDate || now <= votingEndDate)
  );
  const votingOpen = (settings?.votingOpen === true) && isWithinDateRange;

  const eligibility = getEligibility();
  const voterId = getOrCreateVoterId();
  const myVotes = publicVotes.filter(vote => vote.voterId === voterId);

  const handleVote = async (app: Application) => {
    if (!votingOpen) {
      alert('Public voting is not currently open.');
      return;
    }

    if (!eligibility) {
      navigate(ROUTES.PUBLIC.VOTING_ZONE);
      return;
    }

    try {
      const vote: PublicVote = {
        id: `${app.id}_${voterId}`,
        applicationId: app.id,
        voterId,
        area: eligibility.area,
        createdAt: new Date().toISOString()
      };
      await DataService.savePublicVote(vote);
      const updatedVotes = await DataService.getPublicVotes();
      setPublicVotes(updatedVotes);
      alert('Thank you! Your vote has been recorded.');
    } catch (error) {
      console.error('Failed to submit public vote:', error);
      alert('Unable to record your vote right now. Please try again.');
    }
  };

  // Format dates for display
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const areas = ['All', ...Array.from(new Set(applications.map(app => app.area)))];
  const filteredApps = selectedArea === 'All'
    ? applications
    : applications.filter(app => app.area === selectedArea);

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </PublicLayout>
    );
  }

  if (error) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto text-center py-20">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!votingOpen) {
    // Determine why voting is not open
    const votingNotEnabled = settings?.votingOpen !== true;
    const beforeStartDate = votingStartDate && now < votingStartDate;
    const afterEndDate = votingEndDate && now > votingEndDate;

    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={40} className="text-purple-600" />
          </div>

          {afterEndDate ? (
            <>
              <h1 className="text-4xl font-bold text-purple-900 mb-4 font-display">Public Voting Has Ended</h1>
              <p className="text-lg text-purple-700 mb-4">
                The public voting period has closed. Thank you to everyone who participated!
              </p>
              {votingEndDate && (
                <p className="text-sm text-gray-600 mb-8">
                  Voting closed on {formatDate(votingEndDate)}
                </p>
              )}
            </>
          ) : beforeStartDate ? (
            <>
              <h1 className="text-4xl font-bold text-purple-900 mb-4 font-display">Voting Opens Soon</h1>
              <p className="text-lg text-purple-700 mb-4">
                Public voting will begin shortly. Mark your calendar!
              </p>
              <div className="bg-purple-50 rounded-xl p-6 inline-block mb-8">
                <div className="flex items-center gap-3 text-purple-800">
                  <Calendar size={24} />
                  <span className="font-bold">Opens: {formatDate(votingStartDate)}</span>
                </div>
                {votingEndDate && (
                  <div className="flex items-center gap-3 text-purple-700 mt-2">
                    <Clock size={24} />
                    <span>Closes: {formatDate(votingEndDate)}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-purple-900 mb-4 font-display">Public Voting Not Yet Live</h1>
              <p className="text-lg text-purple-700 mb-8">
                Public voting will open soon. Please check back later or sign up for updates.
              </p>
            </>
          )}

          {/* Postcode Check Link */}
          <div className="bg-blue-50 rounded-xl p-6 max-w-md mx-auto mb-8">
            <div className="flex items-start gap-3 text-left">
              <MapPin className="text-blue-600 flex-shrink-0 mt-1" size={24} />
              <div>
                <p className="font-bold text-blue-900 mb-1">Check Your Eligibility</p>
                <p className="text-sm text-blue-700 mb-3">
                  Use our postcode checker to see if you're eligible to vote in your area.
                </p>
                <Link
                  to={ROUTES.PUBLIC.POSTCODE_CHECK}
                  className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center gap-1"
                >
                  Check Your Postcode <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>

          <Link
            to={ROUTES.PUBLIC.HOME}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold transition-all"
          >
            <ArrowRight size={20} />
            Back to Home
          </Link>
        </div>
      </PublicLayout>
    );
  }

  if (!eligibility) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-purple-900 mb-4 font-display">Check Your Eligibility First</h1>
          <p className="text-lg text-purple-700 mb-8">
            Please check your postcode to confirm eligibility before voting on projects.
          </p>
          <Link
            to={ROUTES.PUBLIC.VOTING_ZONE}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold transition-all"
          >
            <MapPin size={20} />
            Check My Postcode
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 rounded-full px-4 py-2 mb-4">
            <CheckCircle2 size={18} className="text-green-600" />
            <span className="text-sm font-bold text-green-800">Public Voting Now Open</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-purple-900 mb-4 font-display">
            Vote for Your Favourite Projects
          </h1>

          <p className="text-lg text-purple-700 max-w-3xl mx-auto leading-relaxed">
            Browse the shortlisted projects and cast your vote for those that matter most to your community. Your voice counts in deciding how local funding is allocated.
          </p>

          {/* Voting Period Info */}
          {(votingStartDate || votingEndDate) && (
            <div className="mt-6 inline-flex items-center gap-4 bg-purple-50 rounded-xl px-6 py-3 text-purple-800">
              <Calendar size={20} />
              <div className="text-sm text-left">
                {votingStartDate && <span>Opened: {formatDate(votingStartDate)}</span>}
                {votingStartDate && votingEndDate && <span className="mx-2">•</span>}
                {votingEndDate && <span>Closes: {formatDate(votingEndDate)}</span>}
              </div>
            </div>
          )}

          {/* Postcode Check Reminder */}
          <div className="mt-6 text-sm text-purple-600">
            <Link to={ROUTES.PUBLIC.POSTCODE_CHECK} className="inline-flex items-center gap-1 hover:text-purple-800">
              <MapPin size={14} />
              Check your postcode to see if you're eligible to vote
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Area Filter with Area Colours */}
        {areas.length > 2 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 justify-center">
              {areas.map(area => {
                const areaColor = area === 'All' ? '#9333EA' : getAreaColor(area);
                const isSelected = selectedArea === area;

                return (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                      isSelected
                        ? 'text-white shadow-lg'
                        : 'bg-white border-2 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: isSelected ? areaColor : 'white',
                      borderColor: isSelected ? areaColor : areaColor,
                      color: isSelected ? 'white' : areaColor
                    }}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {filteredApps.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl">
            <Users size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Projects Available</h3>
            <p className="text-gray-500">
              {selectedArea === 'All'
                ? 'No projects are currently available for voting.'
                : `No projects available in ${selectedArea}.`}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map(app => (
              <div
                key={app.id}
                className="bg-white border-2 border-purple-200 rounded-2xl overflow-hidden hover:border-purple-400 hover:shadow-xl transition-all"
              >
                {/* Project Image */}
                {app.publicVoteImage && (
                  <div className="relative h-48 bg-gray-100">
                    <img
                      src={app.publicVoteImage}
                      alt={app.projectTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* Area Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={16} style={{ color: getAreaColor(app.area) }} />
                    <span className="text-sm font-bold" style={{ color: getAreaColor(app.area) }}>{app.area}</span>
                  </div>

                  {/* Project Title */}
                  <h3 className="text-xl font-bold text-purple-900 mb-2 font-display">
                    {app.projectTitle}
                  </h3>

                  {/* Organisation */}
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>By:</strong> {app.orgName}
                  </p>

                  {/* Project Blurb */}
                  <p className="text-gray-700 mb-4 leading-relaxed line-clamp-4">
                    {app.publicVoteBlurb || app.summary}
                  </p>

                  {/* Funding Amount */}
                  <div className="flex items-center gap-2 mb-4 p-3 bg-teal-50 rounded-lg">
                    <Coins size={20} className="text-teal-600" />
                    <span className="font-bold text-teal-900">
                      £{app.amountRequested.toLocaleString()} requested
                    </span>
                  </div>

                  {/* Vote Button */}
                  {myVotes.some(vote => vote.applicationId === app.id) ? (
                    <div className="w-full bg-green-100 text-green-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 size={20} />
                      Vote Recorded
                    </div>
                  ) : (
                    <button
                      onClick={() => handleVote(app)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <VoteIcon size={20} />
                      Vote for This Project
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-12 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900 mb-2">How Public Voting Works</h3>
              <ul className="text-blue-800 space-y-2">
                <li>• Browse all shortlisted projects in your area</li>
                <li>• Vote for the projects that align with community priorities</li>
                <li>• Projects with the most votes receive funding</li>
                <li>• Voting is open to all residents in participating areas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PublicVotingPage;
