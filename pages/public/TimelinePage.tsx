import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/Layout';
import { Calendar, CheckCircle2, Clock, Circle, ArrowRight, Users, FileText, Vote, Trophy } from 'lucide-react';
import { ROUTES } from '../../utils';

interface Milestone {
  id: number;
  phase: string;
  title: string;
  description: string;
  date: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: React.ReactNode;
  details?: string[];
}

const TimelinePage: React.FC = () => {
  const milestones: Milestone[] = [
    {
      id: 1,
      phase: 'Phase 1',
      title: 'Community Consultation',
      description: 'Extensive community engagement to identify local priorities across all three areas.',
      date: 'September - November 2024',
      status: 'completed',
      icon: <Users size={24} />,
      details: [
        'Over 1,000 residents surveyed',
        'Community events in each area',
        'Priorities identified and ranked'
      ]
    },
    {
      id: 2,
      phase: 'Phase 2',
      title: 'Expression of Interest (Part 1)',
      description: 'Groups and organizations submit initial project proposals aligned with community priorities.',
      date: 'December 2024 - January 2025',
      status: 'completed',
      icon: <FileText size={24} />,
      details: [
        'EOI forms released to all areas',
        'Initial screening by committees',
        'Shortlisting of projects for Part 2'
      ]
    },
    {
      id: 3,
      phase: 'Phase 3',
      title: 'Full Applications (Part 2)',
      description: 'Shortlisted projects develop detailed applications with budgets and delivery plans.',
      date: 'February - March 2025',
      status: 'current',
      icon: <FileText size={24} />,
      details: [
        'Detailed application forms',
        'Budget and delivery planning',
        'Evidence of need and community support'
      ]
    },
    {
      id: 4,
      phase: 'Phase 4',
      title: 'Committee Evaluation',
      description: 'Resident committees score applications using the evaluation matrix.',
      date: 'April 2025',
      status: 'upcoming',
      icon: <Users size={24} />,
      details: [
        'Matrix scoring across 10 criteria',
        'Committee discussion and feedback',
        'Final shortlist for public vote'
      ]
    },
    {
      id: 5,
      phase: 'Phase 5',
      title: 'Public Voting',
      description: 'Community members vote on their preferred projects to determine funding allocation.',
      date: 'May 2025',
      status: 'upcoming',
      icon: <Vote size={24} />,
      details: [
        'Online and in-person voting',
        'Open to all area residents',
        'Results announced publicly'
      ]
    },
    {
      id: 6,
      phase: 'Phase 6',
      title: 'Project Delivery',
      description: 'Successful projects receive funding and begin implementation.',
      date: 'June 2025 onwards',
      status: 'upcoming',
      icon: <Trophy size={24} />,
      details: [
        'Funding agreements finalized',
        'Projects commence delivery',
        'Monitoring and evaluation'
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-teal-500';
      case 'current':
        return 'bg-purple-600';
      case 'upcoming':
        return 'bg-gray-300';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={28} className="text-white" />;
      case 'current':
        return <Clock size={28} className="text-white" />;
      case 'upcoming':
        return <Circle size={28} className="text-gray-500" />;
      default:
        return <Circle size={28} className="text-gray-500" />;
    }
  };

  const currentMilestone = milestones.find(m => m.status === 'current');

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-100 rounded-full px-4 py-2 mb-4">
            <Calendar size={18} className="text-purple-600" />
            <span className="text-sm font-bold text-purple-800">Project Timeline</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-purple-900 mb-4 font-display">
            Communities' Choice Timeline
          </h1>

          <p className="text-lg text-purple-700 max-w-3xl mx-auto leading-relaxed">
            Follow the journey from community consultation to project delivery. Track key milestones and understand where we are in the process.
          </p>
        </div>

        {/* Current Phase Highlight */}
        {currentMilestone && (
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-2xl p-8 mb-12 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-purple-200 text-sm font-semibold">Current Phase</p>
                <h2 className="text-2xl font-bold font-display">{currentMilestone.title}</h2>
              </div>
            </div>
            <p className="text-purple-100 text-lg mb-4">{currentMilestone.description}</p>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2">
              <Calendar size={16} />
              <span className="text-sm font-semibold">{currentMilestone.date}</span>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 via-purple-300 to-gray-300"></div>

          {/* Milestones */}
          <div className="space-y-8">
            {milestones.map((milestone, index) => {
              const isCompleted = milestone.status === 'completed';
              const isCurrent = milestone.status === 'current';
              const isUpcoming = milestone.status === 'upcoming';

              return (
                <div key={milestone.id} className="relative pl-20">
                  {/* Timeline Dot */}
                  <div className={`absolute left-0 w-16 h-16 rounded-full ${getStatusColor(milestone.status)} flex items-center justify-center shadow-lg z-10`}>
                    {getStatusIcon(milestone.status)}
                  </div>

                  {/* Milestone Card */}
                  <div className={`border-2 rounded-xl p-6 transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-br from-purple-50 to-white border-purple-400 shadow-lg'
                      : isCompleted
                        ? 'bg-gradient-to-br from-teal-50 to-white border-teal-300'
                        : 'bg-white border-gray-300'
                  }`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="inline-flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            isCurrent
                              ? 'bg-purple-600 text-white'
                              : isCompleted
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                          }`}>
                            {milestone.phase}
                          </span>
                          {isCurrent && (
                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-yellow-400 text-yellow-900 animate-pulse">
                              In Progress
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-bold text-purple-900 mb-2 font-display">
                          {milestone.title}
                        </h3>
                        <p className="text-purple-700 leading-relaxed mb-3">
                          {milestone.description}
                        </p>
                        <div className="flex items-center gap-2 text-purple-600">
                          <Calendar size={16} />
                          <span className="text-sm font-semibold">{milestone.date}</span>
                        </div>
                      </div>

                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                        isCurrent
                          ? 'bg-purple-600 text-white'
                          : isCompleted
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                      }`}>
                        {milestone.icon}
                      </div>
                    </div>

                    {/* Details */}
                    {milestone.details && milestone.details.length > 0 && (
                      <div className={`mt-4 pt-4 border-t-2 ${
                        isCurrent
                          ? 'border-purple-200'
                          : isCompleted
                            ? 'border-teal-200'
                            : 'border-gray-200'
                      }`}>
                        <ul className="space-y-2">
                          {milestone.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-purple-700">
                              <CheckCircle2 size={16} className={`flex-shrink-0 mt-0.5 ${
                                isCurrent
                                  ? 'text-purple-600'
                                  : isCompleted
                                    ? 'text-teal-600'
                                    : 'text-gray-400'
                              }`} />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Dates Summary */}
        <div className="mt-16 bg-purple-50 border-2 border-purple-200 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-purple-900 mb-6 font-display text-center">
            Quick Reference: Key Dates
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="bg-white rounded-lg p-4 border border-purple-200 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-lg ${getStatusColor(milestone.status)} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold text-sm">{milestone.id}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-purple-900 text-sm truncate">{milestone.title}</p>
                  <p className="text-xs text-purple-600">{milestone.date}</p>
                </div>
                <div>
                  {milestone.status === 'completed' && (
                    <CheckCircle2 size={20} className="text-teal-600" />
                  )}
                  {milestone.status === 'current' && (
                    <Clock size={20} className="text-purple-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-br from-purple-900 to-purple-800 text-white rounded-2xl p-8 md:p-10 shadow-xl text-center">
          <h2 className="text-3xl font-bold mb-4 font-display">Want to Get Involved?</h2>
          <p className="text-lg text-purple-100 mb-6 leading-relaxed max-w-2xl mx-auto">
            Depending on which phase we're in, there are different ways to participate. Check out our priorities, view documents, or submit your application.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/priorities"
              className="bg-teal-500 hover:bg-teal-400 text-purple-950 px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2"
            >
              View Priorities
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/documents"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold transition-all inline-flex items-center justify-center gap-2"
            >
              Application Documents
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default TimelinePage;
