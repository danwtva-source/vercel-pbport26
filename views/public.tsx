import React, { useState } from 'react';
import { Button, Card, Input, FileCard } from '../components/UI';
import { POSTCODES, PRIORITY_DATA, COMMITTEE_DOCS } from '../constants';

// ... AreaCarousel remains unchanged (omitted for brevity, assume it's here) ...
const AreaCarousel: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const slides = [
        { name: 'Blaenavon', img: 'images/Blaenavon map.png', desc: 'See projects in Blaenavon and vote for your favourite three!', color: 'text-purple-700' },
        { name: 'Thornhill & Upper Cwmbran', img: 'images/Thornhill & Upper Cwmbran map.png', desc: 'See projects in Thornhill & Upper Cwmbran and vote!', color: 'text-teal-700' },
        { name: 'Trevethin, Penygarn & St. Cadocs', img: 'images/Trevethin Penygarn & St Cadocs map.png', desc: 'See projects in this area and vote for your favourite three!', color: 'text-pink-700' }
    ];
    const nextSlide = () => setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    return (
        <div className="relative w-full max-w-3xl mx-auto">
            <div className="overflow-hidden rounded-3xl shadow-2xl bg-white border border-gray-100 relative h-[520px]">
                <div className="flex transition-transform duration-500 ease-in-out h-full" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                    {slides.map((slide, index) => (
                        <div key={index} className="min-w-full h-full flex flex-col items-center justify-center p-8 bg-gray-50">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 w-full max-w-md flex items-center justify-center h-64">
                                <img src={slide.img} alt={`${slide.name} Map`} className="max-h-full w-auto object-contain" onError={(e) => e.currentTarget.src = `https://placehold.co/400x300/EEE/31343C?text=${slide.name}`} />
                            </div>
                            <h3 className={`text-3xl font-bold font-dynapuff mb-3 text-center ${slide.color}`}>{slide.name}</h3>
                            <p className="text-gray-600 font-arial mb-6 text-center max-w-md">{slide.desc}</p>
                            <Button onClick={() => onNavigate('check-postcode')} className="shadow-lg transform hover:scale-105 transition-transform">View & Vote</Button>
                        </div>
                    ))}
                </div>
                <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-brand-purple p-3 rounded-full shadow-lg backdrop-blur-sm z-10">←</button>
                <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-brand-purple p-3 rounded-full shadow-lg backdrop-blur-sm z-10">→</button>
            </div>
        </div>
    );
};

export const Landing: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="animate-fade-in bg-gradient-to-br from-purple-100 via-purple-200 to-teal-100 min-h-[calc(100vh-80px)]">
      <section className="pt-12 pb-8 text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-teal mb-4 font-dynapuff drop-shadow-sm">You Decide. You Benefit.</h1>
        <p className="text-xl text-gray-700 max-w-2xl mx-auto font-arial leading-relaxed">Welcome to the Round 2 Application Cycle (2026). <br/>Apply for funding or join a committee to shape the future of Torfaen.</p>
        <div className="mt-8 flex justify-center gap-4">
             <Button size="lg" onClick={() => onNavigate('register')} className="shadow-xl shadow-purple-200/50 transform hover:-translate-y-1">Apply for Funding</Button>
             <Button size="lg" variant="outline" onClick={() => onNavigate('timeline')} className="bg-white/80 backdrop-blur-sm">View Timeline</Button>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-4 pb-20"><AreaCarousel onNavigate={onNavigate} /></section>
    </div>
  );
};

export const PublicDocuments: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 animate-fade-in">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold font-dynapuff text-brand-purple mb-4">Guidance & Forms</h1>
                    <p className="text-gray-600">Download essential documents for your application.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    {COMMITTEE_DOCS.map((doc, i) => (
                        <Card key={i} onClick={() => window.open(doc.url, '_blank')} className="cursor-pointer hover:border-brand-purple hover:bg-purple-50 group">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl group-hover:bg-purple-200 transition-colors">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 mb-1">{doc.title}</h3>
                                    <p className="text-sm text-gray-500 mb-2">{doc.desc}</p>
                                    <span className="text-xs font-bold text-brand-purple uppercase tracking-wider">Download PDF</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const Priorities: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'blaenavon' | 'thornhill' | 'trevethin'>('blaenavon');
    const data = PRIORITY_DATA[activeTab];
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 animate-fade-in">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold font-dynapuff text-center text-brand-purple mb-8">Community Priorities</h1>
                <div className="flex justify-center mb-8 gap-2 flex-wrap">
                    {[ { id: 'blaenavon', label: 'Blaenavon' }, { id: 'thornhill', label: 'Thornhill & Upper Cwmbran' }, { id: 'trevethin', label: 'Trevethin, Penygarn & St. Cadocs' } ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2 rounded-full font-bold transition-all ${activeTab === tab.id ? 'bg-brand-purple text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{tab.label}</button>
                    ))}
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                    <Card>
                         <h3 className="font-bold text-xl mb-4">Priority Breakdown</h3>
                         <div className="space-y-4">
                             {data.data.map((item, i) => (
                                 <div key={i}>
                                     <div className="flex justify-between text-sm font-bold mb-1"><span>{item.label}</span><span>{item.value} votes</span></div>
                                     <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-brand-teal" style={{ width: `${(item.value / 150) * 100}%` }}></div></div>
                                 </div>
                             ))}
                         </div>
                    </Card>
                    <div className="grid gap-4 content-start">
                        {data.data.slice(0, 3).map((item, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl shadow border-l-4 border-brand-purple flex items-center gap-4">
                                <span className="text-3xl font-bold text-gray-200">#{i+1}</span>
                                <h4 className="font-bold text-lg">{item.label}</h4>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PostcodeChecker: React.FC = () => {
    const [code, setCode] = useState('');
    const [result, setResult] = useState<{valid: boolean, area?: string} | null>(null);
    const check = () => {
        const norm = code.toUpperCase().replace(/\s/g, '');
        let found = false;
        for (const [area, codes] of Object.entries(POSTCODES)) {
            if (codes.map(c => c.replace(/\s/g, '')).includes(norm)) { setResult({ valid: true, area }); found = true; break; }
        }
        if (!found) setResult({ valid: false });
    };
    return (
        <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
            <Card className="max-w-lg w-full text-center border-t-8 border-t-brand-purple">
                <h1 className="text-2xl font-bold font-dynapuff mb-4">Voter Eligibility Check</h1>
                <Input placeholder="Enter Postcode (e.g. NP4 9AA)" value={code} onChange={e => setCode(e.target.value)} className="text-center uppercase font-bold text-xl" />
                <Button onClick={check} size="lg" className="w-full mt-4">Verify Postcode</Button>
                {result && <div className={`mt-4 p-4 rounded-xl font-bold ${result.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{result.valid ? `✅ Valid! Area: ${result.area}` : '❌ Not recognised.'}</div>}
            </Card>
        </div>
    );
};

export const Timeline: React.FC = () => <div className="p-12 text-center font-bold text-gray-500">Timeline View (See Home)</div>;