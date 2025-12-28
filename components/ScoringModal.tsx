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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let total = 0;
    let maxTotal = 0;

    SCORING_CRITERIA.forEach(c => {
      const score = breakdown[c.id] || 0;
      total += score * c.weight;
      maxTotal += 100 * c.weight;
    });

    const weightedTotal = Math.round((total / maxTotal) * 100);

    const newScore: Score = {
      id: `${app.id}_${user.uid}`,
      appId: app.id,
      scorerId: user.uid,
      scorerName: user.displayName || user.username,
      weightedTotal,
      breakdown,
      notes,
      isFinal: true,
      createdAt: new Date().toISOString()
    };

    await DataService.saveScore(newScore);
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Score: ${app.projectTitle}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm">
          Please score each criterion from 0-100. The system will automatically calculate the weighted total based on committee priorities.
        </div>

        {SCORING_CRITERIA.map(criterion => (
          <div key={criterion.id} className="border-b pb-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h4 className="font-bold text-gray-800">{criterion.name}</h4>
                <p className="text-xs text-gray-500">{criterion.details}</p>
              </div>
              <Badge>Weight: {criterion.weight}x</Badge>
            </div>
            <div className="flex gap-4 items-center">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={breakdown[criterion.id] || 0}
                onChange={e => setBreakdown({ ...breakdown, [criterion.id]: Number(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="w-16 font-bold text-xl text-center">{breakdown[criterion.id] || 0}</div>
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
