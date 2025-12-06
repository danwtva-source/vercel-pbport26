import React, { useState } from 'react';
import { Button, Card, Input, FileCard } from '../components/UI';
import { POSTCODES, PRIORITY_DATA, COMMITTEE_DOCS } from '../constants';

const AreaCarousel: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const slides = [
        { 
            name: 'Blaenavon', 
            img: '/images/Blaenavon.png', 
            desc: 'A historic town with a strong community spirit.',
            color: '#FFD447',
            bg: 'bg-yellow-50',
            text: 'text-yellow-800'
        },
        { 
            name: 'Thornhill & Upper Cwmbran', 
            img: '/images/thornhill.png', 
            desc: 'Supporting local initiatives to improve health.',
            color: '#2FBF71',
            bg: 'bg-green-50',
            text: 'text-green-800'
        },
        { 
            name: 'Trevethin, Penygarn & St. Cadocs', 
            img: '/images/trevethin.png', 
            desc: 'Empowering residents to tackle local issues.',
            color: '#3A86FF',
            bg: 'bg-blue-50',
            text: 'text-blue-800'
        }
    ];

    const next = () => setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    const prev = () => setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    const current = slides[currentIndex];

    return (
        <div className="relative w-full max-w-6xl mx-auto mt-12 mb-20 px-4">
            <div className="relative h-[600px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white/20 bg-gray-900">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-black/60 z-10"></div>
                    <img 
                        src={current.img} 
                        alt={current.name} 
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                    <div className="relative z-20 h-full flex flex-col justify-center items-center text-center p-8 md:p-16 text-white">
                        <span className="inline-block px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-6 shadow-lg" style={{ backgroundColor: current.color, color: '#000' }}>
                            Area Spotlight
                        </span>
                        <h2 className="text-5xl md:text-7xl font-dynapuff font-bold mb-6 leading-tight drop-shadow-lg text-white">{current.name}</h2>
                        <p className="text-xl md:text-2xl font-arial max-w-3xl mb-10 opacity-90 leading-relaxed drop-shadow-md">{current.desc}</p>
                        <Button onClick={() => onNavigate('check-postcode')} className="text-gray-900 border-none px-10 py-5 text-xl rounded-2xl shadow-xl hover:scale-105 transition-transform font-dynapuff" style={{ backgroundColor: current.color }}>Enter Voting Area</Button>
                    </div>
                </div>
                <button onClick={prev} className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all hover:scale-110">❮</button>
                <button onClick={next} className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all hover:scale-110">❯</button>
            </div>
        </div>
    );
};

export const Landing: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="animate-fade-in bg-white">
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-50 via-white to-white z-0"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
            <span className="inline-block py-2 px-4 rounded-full bg-brand-purple/10 text-brand-purple text-sm font-bold mb-6 font-dynapuff uppercase tracking-widest border border-brand-purple/20">Round 2 Applications Now Open</span>
            <h1 className="text-6xl md:text-8xl font-bold font-dynapuff text-gray-900 mb-8 tracking-tight">Communities' <br/> <span className="text-brand-purple">Choice</span></h1>
            <p className="text-2xl text-gray-600 font-arial max-w-2xl mx-auto leading-relaxed mb-10">You Decide. You Benefit. <br/><span className="text-base text-gray-500 mt-2 block">Empowering Torfaen residents to allocate public funding to the projects that matter most.</span></p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" onClick={() => onNavigate('register')} className="px-8 py-4 text-lg shadow-xl hover:-translate-y-1">Apply for Funding</Button>
                <Button size="lg" variant="outline" onClick={() => onNavigate('priorities')} className="px-8 py-4 text-lg border-2">View Priorities</Button>
            </div>
        </div>
      </section>
      <AreaCarousel onNavigate={onNavigate} />
      {/* ... Info Grid (preserved) ... */}
    </div>
  );
};

export const Priorities: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'blaenavon' | 'thornhill' | 'trevethin'>('blaenavon');
    const data = PRIORITY_DATA[activeTab];
    const AREA_COLORS = { 'blaenavon': '#FFD447', 'thornhill': '#2FBF71', 'trevethin': '#3A86FF' };
    const currentColor = AREA_COLORS[activeTab];
    const getIcon = (label: string) => {
        if(label.includes('Youth')) return '🛹';
        if(label.includes('Transport')) return '🚌';
        if(label.includes('Environment') || label.includes('Sustainability')) return '🌳';
        if(label.includes('Health')) return '❤️';
        if(label.includes('Crime') || label.includes('Safety')) return '👮';
        return '🏘️';
    };

    return (
        <div className="min-h-screen bg-slate-50 py-16 px-4 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12"><h1 className="text-5xl font-bold font-dynapuff text-brand-purple mb-6">Local Priorities</h1></div>
                <div className="flex justify-center gap-4 mb-12 flex-wrap">
                    {[ { id: 'blaenavon', label: 'Blaenavon', col: '#FFD447' }, { id: 'thornhill', label: 'Thornhill & Upper Cwmbran', col: '#2FBF71' }, { id: 'trevethin', label: 'Trevethin, Penygarn & St. Cadocs', col: '#3A86FF' } ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-1 shadow-sm`} style={{ backgroundColor: activeTab === tab.id ? tab.col : '#FFF', color: activeTab === tab.id ? '#000' : '#666', border: `2px solid ${activeTab === tab.id ? tab.col : 'transparent'}` }}>{tab.label}</button>
                    ))}
                </div>
                <div className="grid lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                        <h3 className="text-2xl font-bold font-dynapuff mb-8 flex items-center gap-3"><span className="w-3 h-8 rounded-full" style={{ backgroundColor: currentColor }}></span>Vote Distribution</h3>
                        <div className="space-y-6">{data.data.map((item, i) => (<div key={i} className="group"><div className="flex justify-between items-end mb-2"><span className="font-bold text-gray-700 flex items-center gap-2"><span className="text-2xl">{getIcon(item.label)}</span> {item.label}</span><span className="font-bold" style={{ color: currentColor }}>{item.value} votes</span></div><div className="h-4 bg-gray-100 rounded-full overflow-hidden"><div className="h-full transition-all duration-1000 ease-out" style={{ width: `${(item.value / 150) * 100}%`, backgroundColor: currentColor }}></div></div></div>))}</div>
                    </div>
                    {/* ... Top Priorities Cards (preserved) ... */}
                </div>
            </div>
        </div>
    );
};

// ... Timeline, PublicDocuments, PostcodeChecker (preserved) ...
export const Timeline: React.FC = () => { return <div>Timeline</div>; }; // Placeholder for brevity in chat, use previous full code
export const PublicDocuments: React.FC = () => { return <div>Docs</div>; }; // Placeholder for brevity
export const PostcodeChecker: React.FC = () => { return <div>Checker</div>; }; // Placeholder for brevity
