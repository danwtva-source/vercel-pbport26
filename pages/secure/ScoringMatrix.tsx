import React, { useState, useEffect } from 'react';
import { SecureLayout } from '../../components/Layout';
import { AuthService, DataService } from '../../services/firebase';
import { User, Application, ScoringState, UserRole } from '../../types';
import { Info, Save, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ScoringMatrix: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [selectedRef, setSelectedRef] = useState('');
  const [scoringState, setScoringState] = useState<ScoringState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = AuthService.getCurrentUser();
    if (!u || (u.role !== UserRole.COMMITTEE && u.role !== UserRole.ADMIN)) {
      navigate('/login');
      return;
    }
    setUser(u);
    DataService.getApplications(u).then(setApps).catch(err => console.error(err));
  }, [navigate]);

  useEffect(() => {
    if (user && selectedRef) {
      setLoading(true);
      DataService.getScoringState(user, selectedRef).then(state => {
        setScoringState(state);
        setLoading(false);
      });
    } else {
      setScoringState(null);
    }
  }, [selectedRef, user]);

  const handleScoreChange = (id: string, val: number) => {
    if (!scoringState || scoringState.isFinal) return;
    setScoringState({
      ...scoringState,
      criteria: scoringState.criteria.map(c => c.id === id ? { ...c, score: val } : c)
    });
  };

  const handleNotesChange = (id: string, val: string) => {
    if (!scoringState || scoringState.isFinal) return;
    setScoringState({
      ...scoringState,
      criteria: scoringState.criteria.map(c => c.id === id ? { ...c, notes: val } : c)
    });
  };

  const save = async (finalize = false) => {
    if (!scoringState || !user) return;
    if (finalize && !window.confirm("Are you sure? This will lock the scores.")) return;

    try {
      const newState = { ...scoringState, isFinal: finalize };
      await DataService.saveScoringState(newState);
      setScoringState(newState);
      alert(finalize ? "Scores Finalized!" : "Progress Saved");
    } catch (e) {
      console.error(e);
      alert("Failed to save. Please try again.");
    }
  };

  if (!user) return null;

  return (
    <SecureLayout userRole={user.role}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-purple-900 font-display">Scoring Matrix</h1>
          <p className="text-gray-600">Review and score applications for {user.area}.</p>
        </div>
        <div className="w-full md:w-64">
          <label className="block text-sm font-bold text-gray-700 mb-1">Select Application</label>
          <select 
            value={selectedRef}
            onChange={(e) => setSelectedRef(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="">-- Choose Application --</option>
            {apps.map(app => (
              <option key={app.ref} value={app.ref}>{app.ref} - {app.applicant}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedRef && (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-dashed border-gray-300 text-center text-gray-400">
          Select an application above to begin scoring.
        </div>
      )}

      {loading && <div className="text-center py-10 text-purple-600 font-bold">Loading...</div>}

      {scoringState && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
          {scoringState.isFinal && (
            <div className="bg-teal-50 text-teal-800 p-4 text-center font-bold border-b border-teal-100 flex items-center justify-center gap-2">
              <Lock size={18}/> This record is finalized and locked.
            </div>
          )}
          
          <div className="p-4 md:p-6">
            {scoringState.criteria.map((c) => (
              <div key={c.id} className="mb-8 border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                <div className="flex flex-col md:flex-row justify-between items-start mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-gray-800 font-display">{c.name}</h3>
                    <div className="group relative hidden md:block">
                      <Info size={18} className="text-purple-400 cursor-help"/>
                      <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded shadow-xl z-10" dangerouslySetInnerHTML={{__html: c.details}}></div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">Weight: {c.weight}</div>
                </div>
                
                {/* Mobile-only Guidance */}
                <div className="md:hidden text-xs text-gray-500 bg-gray-50 p-2 rounded mb-3" dangerouslySetInnerHTML={{__html: c.details}}></div>

                <p className="text-sm text-gray-600 mb-4">{c.guidance}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Score (0-3)</label>
                    <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl">
                      <input 
                        type="range" min="0" max="3" step="1"
                        value={c.score}
                        disabled={scoringState.isFinal}
                        onChange={(e) => handleScoreChange(c.id, parseInt(e.target.value))}
                        className="w-full accent-purple-600 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-2xl font-bold text-purple-700 font-display w-8 text-center">{c.score}</span>
                    </div>
                  </div>
                  <div className="md:col-span-8">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Justification Notes</label>
                    <textarea 
                      value={c.notes}
                      disabled={scoringState.isFinal}
                      onChange={(e) => handleNotesChange(c.id, e.target.value)}
                      placeholder="Why did you give this score?"
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-gray-50 p-6 border-t border-gray-200 flex flex-col md:flex-row justify-end gap-4">
            <button 
              onClick={() => save(false)}
              disabled={scoringState.isFinal}
              className="w-full md:w-auto px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button 
              onClick={() => save(true)}
              disabled={scoringState.isFinal}
              className="w-full md:w-auto px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18}/> Finalize Scores
            </button>
          </div>
        </div>
      )}
    </SecureLayout>
  );
};

export default ScoringMatrix;