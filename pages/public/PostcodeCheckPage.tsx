import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/Layout';
import { Search, MapPin, CheckCircle2, XCircle, ArrowRight, Info, Vote, FileText } from 'lucide-react';
import { AREA_DATA } from '../../constants';
import { DataService } from '../../services/firebase';
import { PortalSettings } from '../../types';
import { ROUTES } from '../../utils';

const PostcodeCheckPage: React.FC = () => {
  const [postcode, setPostcode] = useState('');
  const [result, setResult] = useState<{ eligible: boolean; area?: string; formUrl?: string } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const eligibilityStorageKey = 'pb_public_vote_eligibility';

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsData = await DataService.getPortalSettings();
        setSettings(settingsData);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const normalizePostcode = (pc: string): string => {
    return pc.toUpperCase().replace(/\s+/g, '');
  };

  const checkPostcode = () => {
    setIsChecking(true);

    // Simulate a brief loading state for better UX
    setTimeout(() => {
      const normalized = normalizePostcode(postcode);

      for (const [key, areaData] of Object.entries(AREA_DATA)) {
        if (areaData.postcodes.includes(normalized)) {
          localStorage.setItem(eligibilityStorageKey, JSON.stringify({
            area: areaData.name,
            checkedAt: Date.now()
          }));
          setResult({
            eligible: true,
            area: areaData.name,
            formUrl: areaData.formUrl
          });
          setIsChecking(false);
          return;
        }
      }

      setResult({ eligible: false });
      setIsChecking(false);
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (postcode.trim()) {
      checkPostcode();
    }
  };

  const handleReset = () => {
    setPostcode('');
    setResult(null);
    localStorage.removeItem(eligibilityStorageKey);
  };

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-100 rounded-full px-4 py-2 mb-4">
            <MapPin size={18} className="text-purple-600" />
            <span className="text-sm font-bold text-purple-800">Eligibility Checker</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-purple-900 mb-4 font-display">
            Check Your Postcode
          </h1>

          <p className="text-lg text-purple-700 max-w-2xl mx-auto leading-relaxed">
            Enter your postcode to find out if you're in one of the three Communities' Choice areas and discover your local priorities.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8 flex gap-4">
          <Info size={24} className="text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">About This Tool</h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              This postcode checker helps you determine if your address falls within one of the three Communities' Choice pilot areas: Blaenavon, Thornhill & Upper Cwmbran, or Trevethin, Penygarn & St. Cadocs.
            </p>
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-white border-2 border-purple-200 rounded-2xl p-8 md:p-10 shadow-lg mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="postcode" className="block text-sm font-bold text-purple-900 mb-3">
                Enter Your Postcode
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    id="postcode"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="e.g., NP4 9AA"
                    className="w-full px-4 py-4 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-lg font-semibold uppercase"
                    disabled={isChecking}
                    maxLength={8}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!postcode.trim() || isChecking}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <Search size={20} />
                  {isChecking ? 'Checking...' : 'Check'}
                </button>
              </div>
              <p className="text-sm text-purple-600 mt-2">
                Enter your full postcode (e.g., NP4 9AA). Spaces are optional.
              </p>
            </div>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div className={`animate-fade-in ${result.eligible ? 'bg-gradient-to-br from-teal-50 to-green-50 border-teal-300' : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-300'} border-2 rounded-2xl p-8 md:p-10 shadow-lg`}>
            <div className="flex items-start gap-4 mb-6">
              {result.eligible ? (
                <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={32} className="text-white" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <XCircle size={32} className="text-white" />
                </div>
              )}

              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-purple-900 mb-2 font-display">
                  {result.eligible ? 'Great News!' : 'Not in a Pilot Area'}
                </h2>
                <p className="text-lg text-purple-700 leading-relaxed">
                  {result.eligible
                    ? `Your postcode is in the ${result.area} area.`
                    : 'This postcode is not currently in one of the three Communities\' Choice pilot areas.'}
                </p>
              </div>
            </div>

            {result.eligible && result.area && (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 mb-6">
                <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <MapPin size={20} className="text-purple-600" />
                  Your Area: {result.area}
                </h3>
                <p className="text-purple-700 mb-4">
                  You can participate in the Communities' Choice process for {result.area}. This includes viewing local priorities, voting on projects, and even submitting your own project applications.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    to={ROUTES.PUBLIC.LOGIN}
                    className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                  >
                    <FileText size={18} />
                    Submit Application
                  </Link>

                  {settings?.votingOpen ? (
                    <Link
                      to={ROUTES.PUBLIC.VOTING_LIVE}
                      className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                    >
                      <Vote size={18} />
                      Vote on Projects
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center justify-center gap-2 bg-gray-300 text-gray-500 px-6 py-3 rounded-xl font-bold cursor-not-allowed"
                      title="Public voting is not live yet"
                    >
                      <Vote size={18} />
                      Vote on Projects
                    </button>
                  )}
                </div>
                {!settings?.votingOpen && (
                  <p className="text-sm text-purple-600 mt-2 text-center">
                    Public voting is not live yet. Check back soon!
                  </p>
                )}
              </div>
            )}

            {!result.eligible && (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 mb-6">
                <h3 className="font-bold text-purple-900 mb-3">What This Means</h3>
                <p className="text-purple-700 mb-4">
                  The Communities' Choice initiative is currently running as a pilot in three specific areas of Torfaen. Your postcode doesn't fall within these pilot zones at this time.
                </p>
                <p className="text-purple-700 mb-4">
                  If the pilot is successful, there may be opportunities to expand the programme to other areas in the future.
                </p>
                <Link
                  to={ROUTES.PUBLIC.HOME}
                  className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 font-bold"
                >
                  Learn More About the Initiative
                  <ArrowRight size={18} />
                </Link>
              </div>
            )}

            <button
              onClick={handleReset}
              className="text-purple-600 hover:text-purple-800 font-bold text-sm underline"
            >
              Check Another Postcode
            </button>
          </div>
        )}

        {/* Area Overview */}
        {!result && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-purple-900 mb-6 font-display text-center">
              Communities' Choice Areas
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {Object.values(AREA_DATA).map((area) => (
                <div key={area.name} className="bg-white border-2 border-purple-200 rounded-xl p-6 hover:border-purple-400 transition-all">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <MapPin size={24} className="text-purple-600" />
                  </div>
                  <h3 className="font-bold text-purple-900 mb-2 font-display">{area.name}</h3>
                  <p className="text-sm text-purple-600 font-semibold mb-3">
                    {area.postcodes.length} postcodes
                  </p>
                  <p className="text-sm text-purple-700">
                    £150,000 available for community projects
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default PostcodeCheckPage;
