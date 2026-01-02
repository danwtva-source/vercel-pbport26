import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/firebase';
import { useNavigate, useParams } from 'react-router-dom';

const CRITERIA = [
  { id: 1, name: "Project Overview & SMART Objectives", weight: 15 },
  { id: 2, name: "Alignment with Local Priorities", weight: 15 },
  { id: 3, name: "Community Benefit & Outcomes", weight: 10 },
  { id: 4, name: "Activities, Milestones & Delivery Responsibilities", weight: 5 },
  { id: 5, name: "Timeline & Scheduling Realism", weight: 10 },
  { id: 6, name: "Collaborations & Partnerships", weight: 10 },
  { id: 7, name: "Risk Management & Feasibility", weight: 5 },
  { id: 8, name: "Budget Transparency & Value for Money", weight: 10 },
  { id: 9, name: "Cross‑Area Specificity & Venues (if applicable)", weight: 10 },
  { id: 10, name: "Alignment with Marmot Principles & WFG Goals", weight: 10 }
];

interface ScoreState { [key: number]: number; }

const ScoringMatrix: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scores, setScores] = useState<ScoreState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialScores: ScoreState = {};
    CRITERIA.forEach((_, idx) => initialScores[idx] = 0);
    setScores(initialScores);
  }, [id]);

  const handleScoreChange = (index: number, value: string) => {
    if (value === '') { setScores(prev => ({ ...prev, [index]: 0 })); return; }
    const numVal = parseInt(value);
    if (!isNaN(numVal) && numVal >= 0 && numVal <= 3) {
      setScores(prev => ({ ...prev, [index]: numVal }));
    }
  };

  const rawTotal = Object.values(scores).reduce((a, b) => a + (b || 0), 0);
  const weightedTotal = CRITERIA.reduce((acc, item, index) => {
    return acc + ((scores[index] || 0) / 3) * item.weight;
  }, 0);

  const handleSubmit = async () => {
    if (!user || !id) return;
    setIsSubmitting(true);
    try {
      // Simulate submission (replace with actual firestore call when ready)
      await new Promise(r => setTimeout(r, 500)); 
      alert(`Assessment submitted!\nRaw: ${rawTotal}/30\nWeighted: ${weightedTotal.toFixed(2)}%`);
      navigate('/portal/dashboard');
    } catch (err) {
      alert('Failed to submit score.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow-lg border-t-4 border-indigo-600 my-8">
      <div className="mb-6 border-b pb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Application Assessment Matrix</h2>
        <div className="text-right"><span className="text-xs uppercase font-bold text-gray-500">Max Raw Score</span><div className="text-xl font-bold text-indigo-600">30 Points</div></div>
      </div>
      
      <div className="space-y-4">
        {CRITERIA.map((criterion, index) => (
          <div key={index} className="flex flex-col sm:flex-row justify-between p-4 bg-gray-50 rounded border hover:border-indigo-300">
            <div className="flex-grow pr-4">
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Weight: {criterion.weight}%</span>
                <div className="mt-1 font-semibold">{criterion.name}</div>
            </div>
            <div className="flex items-center gap-4 mt-2 sm:mt-0">
              <div className="text-right">
                <div className="text-[10px] uppercase text-gray-500">Contribution</div>
                <div className="font-mono font-bold text-sm">{(((scores[index]||0)/3)*criterion.weight).toFixed(1)}%</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">Score (0-3):</span>
                <input type="number" min="0" max="3" value={scores[index]??0} onChange={(e)=>handleScoreChange(index, e.target.value)} className="w-16 p-2 border rounded text-center font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t bg-gray-50 p-6 rounded flex justify-between items-center">
        <div>
            <div className="text-sm text-gray-600">Raw Points: <span className="font-bold">{rawTotal} / 30</span></div>
            <div className="text-2xl font-bold text-indigo-900">Weighted Score: {weightedTotal.toFixed(2)}%</div>
        </div>
        <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-3 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">
            {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
        </button>
      </div>
    </div>
  );
};

export default ScoringMatrix;
