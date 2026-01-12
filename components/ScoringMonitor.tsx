import React, { useState, useEffect } from 'react';
import { Application, User, Score } from '../types';
import { DataService } from '../services/firebase';
import { Card, Badge, Button } from './UI';
import { getAreaColor, AREA_NAMES } from '../constants';
import { MapPin } from 'lucide-react';

interface ScoringMonitorProps {
  onExit: () => void;
}

export const ScoringMonitor: React.FC<ScoringMonitorProps> = ({ onExit }) => {
  const [apps, setApps] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [filterArea, setFilterArea] = useState<string>('All');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      DataService.getApplications(),
      DataService.getUsers(),
      DataService.getScores()
    ]).then(([a, u, s]) => {
      setApps(a);
      setUsers(u);
      setScores(s);
    });
  }, []);

  const areas = AREA_NAMES;
  const filteredApps = filterArea === 'All' ? apps : apps.filter(a => a.area === filterArea || a.area === 'Cross-Area');
  const committee = users.filter(u => u.role === 'committee');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <h2 className="text-2xl font-bold mb-1">Scoring Monitor</h2>
          <p className="text-gray-400 text-sm">Real-time tracking of committee scoring progress</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-gray-400" />
            <select
              className="p-2 border border-gray-700 bg-gray-800 rounded-lg text-white"
              value={filterArea}
              onChange={e => setFilterArea(e.target.value)}
              style={{
                borderLeftWidth: '4px',
                borderLeftColor: filterArea === 'All' ? '#9333EA' : getAreaColor(filterArea)
              }}
            >
              <option value="All">All Areas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <Button onClick={onExit} variant="secondary">
            Exit Committee Tasks Overview
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredApps.filter(app => app.status === 'Submitted-Stage2' || app.status === 'Invited-Stage2').map(app => {
          const relevantCommittee = committee.filter(u => u.area === app.area || app.area === 'Cross-Area');
          const appScores = scores.filter(s => s.appId === app.id);
          const percentComplete = relevantCommittee.length > 0 ? Math.round((appScores.length / relevantCommittee.length) * 100) : 0;
          const avgScore = appScores.length > 0
            ? Math.round(appScores.reduce((sum, s) => sum + s.weightedTotal, 0) / appScores.length)
            : 0;

          return (
            <Card key={app.id} className="border-l-4 border-purple-500 hover:shadow-lg transition">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
              >
                <div className="flex gap-6 items-center flex-1">
                  <Badge variant="purple" className="font-mono">{app.ref}</Badge>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{app.projectTitle}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{app.orgName}</span>
                      <span>•</span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
                        style={{
                          backgroundColor: `${getAreaColor(app.area)}20`,
                          color: getAreaColor(app.area)
                        }}
                      >
                        <MapPin size={10} />
                        {app.area}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-12 items-center">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 tracking-wider">PROGRESS</div>
                    <div className="font-bold text-xl flex items-center justify-end gap-2">
                      {appScores.length} <span className="text-gray-400 text-sm">/ {relevantCommittee.length}</span>
                    </div>
                  </div>
                  <div className="text-right w-24">
                    <div className="text-[10px] font-bold text-gray-400 tracking-wider">AVG SCORE</div>
                    <div className={`font-bold text-xl ${avgScore >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                      {avgScore}%
                    </div>
                  </div>
                  <div className={`text-2xl text-gray-300 transition-transform duration-300 ${expandedApp === app.id ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </div>
              </div>

              {expandedApp === app.id && (
                <div className="mt-6 border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider">Committee Breakdown</h4>
                    <div className="h-2 w-48 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 transition-all duration-500"
                        style={{ width: `${percentComplete}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-4 gap-3">
                    {relevantCommittee.map(u => {
                      const score = appScores.find(s => s.scorerId === u.uid);
                      return (
                        <div
                          key={u.uid}
                          className={`p-3 rounded-lg border flex justify-between items-center ${
                            score ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${score ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span className="text-sm font-bold text-gray-700">{u.displayName || u.username}</span>
                          </div>
                          {score ? (
                            <span className="font-bold text-green-700">{score.weightedTotal}%</span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Pending</span>
                          )}
                        </div>
                      );
                    })}
                    {relevantCommittee.length === 0 && (
                      <p className="text-sm text-gray-500 italic col-span-4 text-center py-2">
                        No committee members assigned to this area.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {filteredApps.filter(app => app.status === 'Submitted-Stage2' || app.status === 'Invited-Stage2').length === 0 && (
          <Card>
            <p className="text-gray-500 text-center py-12">No applications in Stage 2 scoring phase</p>
          </Card>
        )}
      </div>
    </div>
  );
};
