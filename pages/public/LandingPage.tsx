import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Calendar, Check, Users, Banknote } from 'lucide-react';
import { PublicLayout } from '../../components/Layout';

const LandingPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="text-center py-8 md:py-12">
        <h1 className="text-4xl md:text-6xl font-bold text-purple-900 mb-6 animate-fade-in font-display leading-tight">
          Your Community,<br/><span className="text-teal-500">Your Choice.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-700 mb-10 leading-relaxed">
          Welcome to the Communities' Choice Participatory Budgeting portal. 
          Residents decide how funding is allocated to improve local areas.
        </p>

        {/* --- CAROUSEL SECTION --- */}
        <div className="mb-16">
           <h2 className="text-2xl font-bold text-purple-800 mb-6 font-display text-left px-4 max-w-6xl mx-auto">Get Involved</h2>
           <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 px-4 max-w-6xl mx-auto no-scrollbar">
              {/* Card 1 */}
              <div className="snap-center shrink-0 w-80 bg-white rounded-2xl shadow-card p-6 border-t-4 border-purple-500 flex flex-col">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-purple-600"><Users size={24}/></div>
                <h3 className="text-xl font-bold mb-2 font-display">1. Apply</h3>
                <p className="text-gray-600 mb-4 flex-grow">Community groups submit ideas for projects that benefit the local area.</p>
                <Link to="/login" className="text-purple-700 font-bold hover:underline">Applicant Login &rarr;</Link>
              </div>
              
              {/* Card 2 */}
              <div className="snap-center shrink-0 w-80 bg-white rounded-2xl shadow-card p-6 border-t-4 border-teal-500 flex flex-col">
                 <div className="bg-teal-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-teal-600"><Check size={24}/></div>
                <h3 className="text-xl font-bold mb-2 font-display">2. Review</h3>
                <p className="text-gray-600 mb-4 flex-grow">A community panel reviews applications against our priorities matrix.</p>
                <Link to="/priorities" className="text-teal-700 font-bold hover:underline">View Priorities &rarr;</Link>
              </div>

              {/* Card 3 */}
              <div className="snap-center shrink-0 w-80 bg-white rounded-2xl shadow-card p-6 border-t-4 border-pink-500 flex flex-col">
                 <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-pink-600"><Banknote size={24}/></div>
                <h3 className="text-xl font-bold mb-2 font-display">3. Vote</h3>
                <p className="text-gray-600 mb-4 flex-grow">You decide! Residents vote for the projects they want to see funded.</p>
                <Link to="/vote" className="text-pink-700 font-bold hover:underline">Vote Now &rarr;</Link>
              </div>
           </div>
        </div>

        {/* --- AREA SELECTOR --- */}
        <h2 className="text-3xl font-bold text-gray-800 mb-8 font-display">Select Your Area</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4 mb-16">
          {[
            { id: 'blaenavon', name: 'Blaenavon', img: 'https://placehold.co/600x400/e9d5ff/9333ea?text=Blaenavon' },
            { id: 'thornhill', name: 'Thornhill & Upper Cwmbran', img: 'https://placehold.co/600x400/ccfbf1/14b8a6?text=Thornhill' },
            { id: 'trevethin', name: 'Trevethin, Penygarn & St. Cadocs', img: 'https://placehold.co/600x400/fef3c7/d97706?text=Trevethin' }
          ].map((area) => (
            <div key={area.id} className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100 flex flex-col">
              <img src={area.img} alt={area.name} className="w-full h-48 object-cover" />
              <div className="p-6 flex-grow flex flex-col text-left">
                <h3 className="text-2xl font-bold text-purple-800 mb-2 font-display">{area.name}</h3>
                <p className="text-gray-600 mb-6 flex-grow">Review projects and have your say in the future of {area.name}.</p>
                <Link 
                  to={`/vote?area=${area.id}`}
                  className="w-full inline-flex items-center justify-center bg-purple-600 hover:bg-purple-800 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg group font-display"
                >
                  Enter Zone <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* --- TIMELINE SECTION --- */}
        <div className="bg-white py-12 px-4 rounded-3xl shadow-sm border border-gray-100 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-800 mb-10 font-display">Process Timeline</h2>
          <div className="relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gray-200 transform -translate-y-1/2 z-0"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
               {/* Step 1 */}
               <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold border-4 border-white shadow-lg mb-4">1</div>
                  <h4 className="font-bold text-gray-800 font-display text-lg">Expressions of Interest</h4>
                  <p className="text-sm text-gray-500">Jan 1 - Feb 15</p>
                  <span className="mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold">Completed</span>
               </div>
               
               {/* Step 2 */}
               <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold border-4 border-white shadow-lg mb-4">2</div>
                  <h4 className="font-bold text-gray-800 font-display text-lg">Full Application</h4>
                  <p className="text-sm text-gray-500">Feb 16 - Mar 15</p>
                   <span className="mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold">Completed</span>
               </div>

               {/* Step 3 */}
               <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold border-4 border-white shadow-lg mb-4 animate-pulse">3</div>
                  <h4 className="font-bold text-gray-800 font-display text-lg">Panel Scoring</h4>
                  <p className="text-sm text-gray-500">Mar 16 - Mar 30</p>
                   <span className="mt-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold">Active Now</span>
               </div>

               {/* Step 4 */}
               <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold border-4 border-white shadow-lg mb-4">4</div>
                  <h4 className="font-bold text-gray-800 font-display text-lg">Public Vote</h4>
                  <p className="text-sm text-gray-500">April 2025</p>
                  <span className="mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold">Coming Soon</span>
               </div>
            </div>
          </div>
        </div>

      </div>
    </PublicLayout>
  );
};

export default LandingPage;