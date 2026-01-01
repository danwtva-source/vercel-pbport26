import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/firebase';
import { useNavigate, useParams } from 'react-router-dom';

// Weighted Criteria aligned with 'Matrix.xlsx - EOI Scoring Matrix.csv'
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

interface ScoreState {
  [key: number]: number; // Index -> Score (0-3)
}

const ScoringMatrix: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scores, setScores] = useState<ScoreState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);

  // Initialize scores
  useEffect(() => {
    // In a real app, you would fetch existing scores for this application from Firestore here
    // using the application ID and current user ID.
    // For now, we initialize with zeros or reload draft state.
    const initialScores: ScoreState = {};
    CRITERIA.forEach((_, idx) => initialScores[idx] = 0);
    setScores(initialScores);
  }, [id]);

  const handleScoreChange = (index: number, value: string) => {
    if (locked) return;
    
    // Handle empty input gracefully (treat as 0 for UI logic, or keep empty if desired)
    if (value === '') {
        setScores(prev => ({ ...prev, [index]: 0 }));
        return;
    }

    const numVal = parseInt(value);
    
    // Strict 0-3 enforcement as per PRD
    if (!isNaN(numVal) && numVal >= 0 && numVal <= 3) {
      setScores(prev => ({ ...prev, [index]: numVal }));
    }
  };

  // Calculate Raw Total (Max 30)
  const rawTotal = Object.values(scores).reduce((a, b) => a + (b || 0), 0);
  const maxRaw = CRITERIA.length * 3; // 30 points max

  // Calculate Weighted Score %
  // Formula per item: (Score / 3) * Weight
  // The sum of all weights is 100%.
  const weightedTotal = CRITERIA.reduce((acc, item, index) => {
    const score = scores[index] || 0;
    const itemWeight = item.weight;
    // Calculate contribution: 3 points = 100% of the weight.
    const contribution = (score / 3) * itemWeight;
    return acc + contribution;
  }, 0);

  const handleSubmit = async () => {
    if (!user || !id) return;
    setIsSubmitting(true);
    try {
      // Logic to submit to Firestore 'scores' collection
      // Example structure:
      // await db.collection('scores').add({
      //   applicationId: id,
      //   userId: user.uid,
      //   scores: scores,
      //   rawTotal: rawTotal,
      //   weightedTotal: weightedTotal,
      //   timestamp: serverTimestamp()
      // });
      
      console.log("Submitting Assessment:", { 
        applicationId: id, 
        rawTotal, 
        weightedTotal: weightedTotal.toFixed(2) 
      });
      
      // Simulating network delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      alert(`Assessment submitted successfully!\n\nRaw Score: ${rawTotal}/30\nWeighted Score: ${weightedTotal.toFixed(2)}%`);
      navigate('/portal/dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to submit score. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-lg border-t-4 border-indigo-600 my-8">
      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
            <h2 className="text-3xl font-bold text-gray-800">Application Assessment Matrix</h2>
            <p className="text-gray-500 text-sm mt-2">
            Rate each category from 0 to 3 based on the EOI Scoring Guide.
            </p>
        </div>
        <div className="mt-4 sm:mt-0 text-right bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase block tracking-wider">Max Raw Score</span>
            <div className="text-2xl font-extrabold text-indigo-600">30 Points</div>
        </div>
      </div>
      
      {/* Matrix Grid */}
      <div className="space-y-4">
        {CRITERIA.map((criterion, index) => (
          <div key={index} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white rounded-md border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all duration-200">
            
            {/* Label & Weight Badge */}
            <div className="flex-grow pr-4 mb-3 md:mb-0">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider border border-indigo-200">
                        Weight: {criterion.weight}%
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">ID: {criterion.id}</span>
                </div>
                <label className="text-base font-semibold text-gray-800 block leading-tight">
                    {criterion.name}
                </label>
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto bg-gray-50 p-2 rounded-md md:bg-transparent md:p-0">
              <div className="flex flex-col items-end min-w-[80px]">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Contribution</span>
                <span className="text-sm font-bold text-gray-600 font-mono">
                    {/* Visual calc: shows how many % points this item currently adds to the total */}
                    {(( (scores[index] || 0) / 3 ) * criterion.weight).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-bold uppercase hidden sm:inline">Score (0-3):</span>
                <input
                    type="number"
                    min="0"
                    max="3"
                    value={scores[index] ?? 0}
                    onChange={(e) => handleScoreChange(index, e.target.value)}
                    className={`w-16 h-12 p-2 border-2 rounded-md text-center font-bold text-xl outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-all
                    ${(scores[index] === 3) ? 'border-green-500 bg-green-50 text-green-700' : 
                      (scores[index] === 0) ? 'border-gray-300 text-gray-400' : 
                      'border-indigo-400 text-indigo-700'}`}
                    disabled={locked}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Results */}
      <div className="mt-10 pt-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50 p-6 rounded-lg shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Score Summary */}
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm text-gray-600 border-b border-gray-200 pb-2 border-dashed">
                    <span className="font-medium">Raw Points Total:</span>
                    <span className="font-bold font-mono text-lg">{rawTotal} / {maxRaw}</span>
                </div>
                <div className="flex justify-between items-end">
                    <span className="text-lg font-bold text-indigo-900">Final Weighted Score:</span>
                    <span className="text-4xl font-extrabold text-indigo-600 leading-none">{weightedTotal.toFixed(2)}%</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mt-1">
                    <div 
                        className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(weightedTotal, 100)}%` }}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-row justify-end gap-4 mt-4 md:mt-0">
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-3 border border-gray-300 bg-white rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-sm"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || locked}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 font-bold shadow-md transition-transform active:scale-95 flex items-center"
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Submitting...
                        </>
                    ) : 'Submit Assessment'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ScoringMatrix;
