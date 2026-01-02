import React from 'react';
import { useRounds, updateRound } from '../services/firebase'; 

const AdminRounds: React.FC = () => {
  const { rounds, loading, error } = useRounds();
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error loading rounds</div>;

  const activeRound = rounds?.[0]; 

  const toggleStage2 = async () => {
    if (!activeRound) return;
    if (confirm(`Confirm ${!activeRound.stage2Open ? 'OPEN' : 'CLOSE'} Stage 2?`)) {
        await updateRound(activeRound.id, { stage2Open: !activeRound.stage2Open });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded shadow border">
        <h3 className="text-lg font-bold mb-4">Round Controls</h3>
        {activeRound ? (
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded border">
                <div>
                    <h4 className="font-bold">Stage 2: Full Application</h4>
                    <div className={activeRound.stage2Open ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{activeRound.stage2Open ? 'OPEN' : 'CLOSED'}</div>
                </div>
                <button onClick={toggleStage2} className={`px-4 py-2 rounded text-white font-bold ${activeRound.stage2Open ? 'bg-red-600' : 'bg-green-600'}`}>
                    {activeRound.stage2Open ? 'Close Stage 2' : 'Open Stage 2'}
                </button>
            </div>
        ) : <div className="text-gray-500">No active rounds.</div>}
      </div>
    </div>
  );
};
export default AdminRounds;
