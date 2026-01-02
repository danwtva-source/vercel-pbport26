import React, { useState } from 'react';
import { Application, User, Score } from '../types';
import { SCORING_CRITERIA } from '../constants';
import { Modal, Badge, Button } from './UI';
import { DataService } from '../services/firebase';

interface ScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: Application;
  user: User;
  onSave: () => void;
}

export const ScoringModal: React.FC<ScoringModalProps> = ({ isOpen, onClose, app, user, onSave }) => {
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Calculate raw total (0-30) and weighted total (0-100)
  const calculateTotals = () => {
    let rawTotal = 0;
    let weightedSum = 0;

    SCORING_CRITERIA.forEach(c => {
      const score = breakdown[c.id] || 0;
      rawTotal += score;
      // Normalize score to 0-1 range, then multiply by weight
      const normalizedScore = score / 3;
      weightedSum += normalizedScore * c.weight;
    });

    // weightedTotal should be 0-100 scale
    const weightedTotal = Math.round(weightedSum);

    return { rawTotal, weightedTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { rawTotal, weightedTotal } = calculateTotals();

    const newScore: Score = {
      id: `${app.id}_${user.uid}`,
      appId: app.id,
      scorerId: user.uid,
      scorerName: user.displayName || user.username,
      weightedTotal,
      breakdown,
      notes,
      isFinal: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await DataService.saveScore(newScore);
    onSave();
    onClose();
  };

  const { rawTotal, weightedTotal } = calculateTotals();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Score: ${app.projectTitle}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm">
          <p className="font-bold mb-1">Scoring Instructions:</p>
          <p>Score each criterion from 0-3 (0 = Not met, 1 = Partially met, 2 = Well met, 3 = Excellently met)</p>
          <p className="mt-2">Raw Total: <span className="font-bold">{rawTotal}/30</span> | Weighted Total: <span className="font-bold">{weightedTotal}/100</span></p>
        </div>

        {SCORING_CRITERIA.map(criterion => (
          <div key={criterion.id} className="border-b pb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex-1">
                <h4 className="font-bold text-gray-800">{criterion.name}</h4>
                <p className="text-xs text-gray-500 mt-1" dangerouslySetInnerHTML={{ __html: criterion.details }}></p>
              </div>
              <Badge>Weight: {criterion.weight}%</Badge>
            </div>
            <div className="flex gap-4 items-center mt-3">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBreakdown({ ...breakdown, [criterion.id]: value })}
                    className={`w-12 h-12 rounded-lg font-bold text-lg transition ${
                      (breakdown[criterion.id] || 0) === value
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="ml-auto px-4 py-2 bg-purple-100 rounded-lg">
                <span className="text-sm text-purple-600 font-bold">Score: {breakdown[criterion.id] || 0}/3</span>
              </div>
            </div>
            <textarea
              placeholder="Optional comments..."
              className="w-full mt-2 p-2 text-sm border rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
              value={notes[criterion.id] || ''}
              onChange={e => setNotes({ ...notes, [criterion.id]: e.target.value })}
            />
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit">Submit Score</Button>
        </div>
      </form>
    </Modal>
  );
};
