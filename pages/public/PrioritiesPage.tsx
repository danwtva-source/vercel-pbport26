import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/Layout';
import { BarChart3, Users, TrendingUp, Info, CheckCircle2 } from 'lucide-react';
import { PRIORITIES_DATA, AREA_DATA } from '../../constants';
import { ROUTES } from '../../utils';

const PrioritiesPage: React.FC = () => {
  const [selectedArea, setSelectedArea] = useState<'blaenavon' | 'thornhill' | 'trevethin'>('blaenavon');

  const areaKeys = Object.keys(PRIORITIES_DATA) as ('blaenavon' | 'thornhill' | 'trevethin')[];
  const currentData = PRIORITIES_DATA[selectedArea];
  const currentAreaName = AREA_DATA[selectedArea].name;

  const getMaxScore = () => {
    return Math.max(...currentData.priorities.map(p => p.score));
  };

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-100 rounded-full px-4 py-2 mb-4">
            <TrendingUp size={18} className="text-purple-600" />
            <span className="text-sm font-bold text-purple-800">Community Priorities</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-purple-900 mb-4 font-display">
            What Matters Most
          </h1>

          <p className="text-lg text-purple-700 max-w-3xl mx-auto leading-relaxed">
            These priorities were identified by residents through extensive community consultation. Projects that align with these priorities score higher in the evaluation process.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8 flex gap-4">
          <Info size={24} className="text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">How Priorities Were Identified</h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              Each community was surveyed to understand local needs and aspirations. The scores represent the number of residents who identified each theme as a priority for their area. These findings guide project evaluation and funding decisions.
            </p>
          </div>
        </div>

        {/* Area Tabs */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3 bg-purple-50 p-2 rounded-xl border-2 border-purple-200">
            {areaKeys.map((areaKey) => {
              const areaName = AREA_DATA[areaKey].name;
              const isSelected = selectedArea === areaKey;

              return (
                <button
                  key={areaKey}
                  onClick={() => setSelectedArea(areaKey)}
                  className={`flex-1 px-6 py-4 rounded-lg font-bold transition-all ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm md:text-base">{areaName}</span>
                    <span className={`text-xs ${isSelected ? 'text-purple-200' : 'text-purple-500'}`}>
                      {PRIORITIES_DATA[areaKey].totalResponses} responses
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Users size={24} />
              <span className="text-sm font-semibold text-purple-200">Total Responses</span>
            </div>
            <div className="text-4xl font-bold font-display">{currentData.totalResponses}</div>
          </div>

          <div className="bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 size={24} />
              <span className="text-sm font-semibold text-teal-200">Priority Themes</span>
            </div>
            <div className="text-4xl font-bold font-display">{currentData.priorities.length}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp size={24} />
              <span className="text-sm font-semibold text-purple-200">Top Priority Score</span>
            </div>
            <div className="text-4xl font-bold font-display">{getMaxScore()}</div>
          </div>
        </div>

        {/* Priorities List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-purple-900 mb-6 font-display">
            {currentAreaName} Priorities
          </h2>

          <div className="space-y-4">
            {currentData.priorities.map((priority, index) => {
              const percentage = (priority.score / getMaxScore()) * 100;
              const isTop = index === 0;

              return (
                <div
                  key={priority.name}
                  className={`bg-white border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                    isTop
                      ? 'border-teal-400 bg-gradient-to-r from-teal-50 to-white'
                      : 'border-purple-200 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl ${
                      isTop
                        ? 'bg-teal-500 text-white'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-xl font-bold text-purple-900 font-display">
                          {priority.name}
                          {isTop && (
                            <span className="ml-3 inline-flex items-center gap-1 bg-teal-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              <CheckCircle2 size={12} />
                              Top Priority
                            </span>
                          )}
                        </h3>
                        <div className="text-right flex-shrink-0">
                          <div className="text-2xl font-bold text-purple-900">{priority.score}</div>
                          <div className="text-xs text-purple-600">responses</div>
                        </div>
                      </div>

                      <p className="text-purple-700 mb-4 leading-relaxed">
                        {priority.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="relative">
                        <div className="h-3 bg-purple-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isTop ? 'bg-gradient-to-r from-teal-500 to-teal-600' : 'bg-gradient-to-r from-purple-500 to-purple-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-purple-600 font-semibold">
                          {percentage.toFixed(0)}% of maximum score
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Application CTA */}
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 text-white rounded-2xl p-8 md:p-10 shadow-xl">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 font-display">Planning to Apply?</h2>
            <p className="text-lg text-purple-100 mb-6 leading-relaxed">
              Projects that strongly align with these community priorities will score higher during evaluation. Make sure your application clearly demonstrates how it addresses the needs identified by local residents.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={AREA_DATA[selectedArea].formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-teal-500 hover:bg-teal-400 text-purple-950 px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
              >
                Submit Application for {currentAreaName}
              </a>
              <Link
                to="/documents"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold transition-all"
              >
                View Application Guidance
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PrioritiesPage;
