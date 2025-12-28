import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/Layout';
import { ArrowRight, MapPin, Users, Vote, FileText, CheckCircle2, Heart, Sparkles } from 'lucide-react';
import { AREA_DATA } from '../../constants';

const LandingPage: React.FC = () => {
  const areas = Object.values(AREA_DATA);

  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="relative -mt-8 -mx-4 mb-12 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtNi42MjcgNS4zNzMtMTIgMTItMTJzMTIgNS4zNzMgMTIgMTItNS4zNzMgMTItMTIgMTItMTItNS4zNzMtMTItMTJ6bTAgMjhjMC02LjYyNyA1LjM3My0xMiAxMi0xMnMxMiA1LjM3MyAxMiAxMi01LjM3MyAxMi0xMiAxMi0xMi01LjM3My0xMi0xMnpNMCAxNmMwLTYuNjI3IDUuMzczLTEyIDEyLTEyczEyIDUuMzczIDEyIDEyLTUuMzczIDEyLTEyIDEyUzAgMjIuNjI3IDAgMTZ6bTAgMjhjMC02LjYyNyA1LjM3My0xMiAxMi0xMnMxMiA1LjM3MyAxMiAxMi01LjM3MyAxMi0xMiAxMlMwIDUwLjYyNyAwIDQ0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-teal-500/20 backdrop-blur-sm border border-teal-400/30 rounded-full px-4 py-2 mb-6 animate-fade-in">
              <Sparkles size={16} className="text-teal-300" />
              <span className="text-sm font-bold text-teal-100">Your Voice, Your Community, Your Choice</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold font-display mb-6 leading-tight">
              Communities' Choice Portal
            </h1>

            <p className="text-xl md:text-2xl text-purple-100 mb-8 leading-relaxed">
              Empowering communities across Torfaen through participatory budgeting.
              <br className="hidden md:block" />
              <span className="text-teal-300 font-semibold">Your ideas. Your projects. Your future.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/vote"
                className="group bg-teal-500 hover:bg-teal-400 text-purple-950 px-8 py-4 rounded-xl font-bold text-lg shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <Vote size={24} />
                Vote on Projects
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/priorities"
                className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2"
              >
                <FileText size={24} />
                View Priorities
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        <div className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-100 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
          <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
            <Users size={28} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-purple-900 mb-3 font-display">Community Led</h3>
          <p className="text-purple-700 leading-relaxed">
            Local residents identify priorities and vote on projects that matter most to their community.
          </p>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-white border-2 border-teal-100 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
          <div className="w-14 h-14 bg-teal-600 rounded-xl flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-purple-900 mb-3 font-display">Transparent Process</h3>
          <p className="text-purple-700 leading-relaxed">
            Every step is open and accountable, from application to evaluation to final public vote.
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-100 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
          <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
            <Heart size={28} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-purple-900 mb-3 font-display">Real Impact</h3>
          <p className="text-purple-700 leading-relaxed">
            Projects funded through this initiative create lasting positive change in our communities.
          </p>
        </div>
      </div>

      {/* Area Information */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-purple-900 mb-4 font-display">
            Three Communities, One Vision
          </h2>
          <p className="text-lg text-purple-700 max-w-2xl mx-auto">
            The Communities' Choice initiative covers three distinct areas, each with their own identified priorities and allocated funding.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {areas.map((area, index) => (
            <div
              key={area.name}
              className="group bg-white border-2 border-purple-200 hover:border-purple-400 rounded-2xl p-6 transition-all hover:shadow-xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 group-hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors">
                  <MapPin size={24} className="text-purple-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-purple-900 mb-1 font-display">{area.name}</h3>
                  <p className="text-sm text-purple-600 font-semibold">£150,000 Available</p>
                </div>
              </div>

              <p className="text-purple-700 mb-4 text-sm leading-relaxed">
                Community-led budgeting for projects that address local priorities and create lasting impact.
              </p>

              <Link
                to="/priorities"
                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 font-bold text-sm group-hover:gap-3 transition-all"
              >
                View {area.name} Priorities
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-br from-purple-900 to-purple-800 text-white rounded-3xl p-8 md:p-12 mb-16 shadow-2xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center font-display">How It Works</h2>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              step: '1',
              title: 'Community Consultation',
              desc: 'Residents identify local priorities through surveys and engagement events.'
            },
            {
              step: '2',
              title: 'Project Applications',
              desc: 'Groups submit project ideas that align with community priorities.'
            },
            {
              step: '3',
              title: 'Committee Review',
              desc: 'Resident committees evaluate applications using a scoring matrix.'
            },
            {
              step: '4',
              title: 'Public Vote',
              desc: 'Community members vote on shortlisted projects to decide funding.'
            }
          ].map((item) => (
            <div key={item.step} className="relative">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 h-full">
                <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center mb-4 font-bold text-xl text-purple-950">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2 font-display">{item.title}</h3>
                <p className="text-purple-100 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-purple-50 rounded-2xl p-8 md:p-12 border-2 border-purple-200">
        <h2 className="text-3xl font-bold text-purple-900 mb-4 font-display">Ready to Get Involved?</h2>
        <p className="text-lg text-purple-700 mb-6 max-w-2xl mx-auto">
          Whether you're looking to submit a project, join a committee, or simply vote on what matters to your community, we're here to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/documents"
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
          >
            Application Resources
          </Link>
          <Link
            to="/login"
            className="bg-white hover:bg-gray-50 text-purple-600 border-2 border-purple-600 px-8 py-4 rounded-xl font-bold transition-all"
          >
            Access Secure Portal
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
};

export default LandingPage;
