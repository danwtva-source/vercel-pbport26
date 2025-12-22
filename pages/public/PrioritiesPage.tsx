import React, { useState } from 'react';
import { PublicLayout } from '../../components/Layout';
import { PRIORITIES_DATA, AREA_DATA } from '../../constants';
import { Trophy, BarChart2, MapPin } from 'lucide-react';

const PrioritiesPage: React.FC = () => {
  const [activeArea, setActiveArea] = useState<string>('blaenavon');

  const areaKeys = Object.keys(PRIORITIES_DATA);
  const currentData = PRIORITIES_DATA[activeArea];

  return (
    <PublicLayout>
      <div className="text-center py-10">
        <h1 className="text-4xl font-bold text-purple-800 mb-4 font-display">Community Priorities</h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          These priorities were identified by residents through our initial consultation phase. 
          Projects applying for funding are scored based on how well they align with these needs.
        </p>
      </div>

      {/* Area Filter */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {areaKeys.map(key => (
          <button
            key={key}
            onClick={() => setActiveArea(key)}
            className={`px-6 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-md flex items-center ${
              activeArea === key 
                ? 'bg-purple-600 text-white ring-4 ring-purple-200' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MapPin size={18} className="mr-2"/>
            {AREA_DATA[key]?.name || key}
          </button>
        ))}
      </div>

      {/* Stats Header */}
      <div className="bg-white rounded-2xl p-6 shadow-card mb-10 max-w-5xl mx-auto border-t-4 border-purple-500 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 font-display">{AREA_DATA[activeArea]?.name}</h2>
          <p className="text-gray-500">Based on resident feedback</p>
        </div>
        <div className="text-right">
          <p className="text-sm uppercase tracking-wide text-gray-400 font-bold">Total Responses</p>
          <p className="text-3xl font-bold text-purple-700 font-display">{currentData.totalResponses}</p>
        </div>
      </div>

      {/* Priorities Grid */}
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16">
        {currentData.priorities.map((item, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <Trophy size={60} className="text-purple-600" />
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-purple-100 text-purple-700 w-8 h-8 rounded-full flex items-center justify-center font-bold font-display shadow-sm">
                {index + 1}
              </div>
              <h3 className="text-xl font-bold text-gray-800 font-display">{item.name}</h3>
            </div>
            
            <p className="text-gray-600 mb-6 text-sm h-12 overflow-hidden">{item.description}</p>
            
            <div className="w-full bg-gray-100 rounded-full h-4 mb-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-teal-400 h-4 rounded-full" 
                style={{ width: `${(item.score / 150) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
              <span>Relevance Score</span>
              <span>{item.score} Points</span>
            </div>
          </div>
        ))}
      </div>
    </PublicLayout>
  );
};

export default PrioritiesPage;