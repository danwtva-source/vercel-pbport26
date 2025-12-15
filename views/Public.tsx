import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Input, FileCard } from '../components/UI';
import { POSTCODES, PRIORITY_DATA, COMMITTEE_DOCS } from '../constants';

// --- STYLED CAROUSEL (SwiperJS Implementation) ---
const AreaCarousel: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
    const swiperRef = useRef<HTMLDivElement | null>(null);
    const swiperInstanceRef = useRef<any>(null);

    useEffect(() => {
        // Inject Swiper CSS (if not already present)
        const SWIPER_CSS = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
        if (!document.querySelector(`link[href="${SWIPER_CSS}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = SWIPER_CSS;
            document.head.appendChild(link);
        }

        // helper to init swiper once script is available
        const initSwiper = () => {
            const SwiperCtor = (window as any).Swiper;
            if (!SwiperCtor || !swiperRef.current) return;

            // destroy existing instance if any
            if (swiperInstanceRef.current && typeof swiperInstanceRef.current.destroy === 'function') {
                swiperInstanceRef.current.destroy(true, true);
                swiperInstanceRef.current = null;
            }

            swiperInstanceRef.current = new SwiperCtor(swiperRef.current, {
                loop: true,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                slidesPerView: 1,
                spaceBetween: 24,
                centeredSlides: true,
                // responsive breakpoints if desired
                breakpoints: {
                    768: {
                        slidesPerView: 1,
                    },
                    1024: {
                        slidesPerView: 1,
                    },
                },
            });
        };

        // If Swiper already loaded on window, init immediately; otherwise inject script
        if ((window as any).Swiper) {
            initSwiper();
        } else {
            const SWIPER_JS = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
            // avoid adding duplicate script
            if (!document.querySelector(`script[src="${SWIPER_JS}"]`)) {
                const script = document.createElement('script');
                script.src = SWIPER_JS;
                script.async = true;
                script.onload = () => {
                    initSwiper();
                };
                document.body.appendChild(script);

                return () => {
                    // cleanup script if we added it (leave CSS)
                    script.remove();
                    if (swiperInstanceRef.current && typeof swiperInstanceRef.current.destroy === 'function') {
                        swiperInstanceRef.current.destroy(true, true);
                        swiperInstanceRef.current = null;
                    }
                };
            } else {
                // script tag already exists but window.Swiper may not be set yet; try init after a short delay
                const t = setTimeout(initSwiper, 300);
                return () => clearTimeout(t);
            }
        }

        // cleanup on unmount
        return () => {
            if (swiperInstanceRef.current && typeof swiperInstanceRef.current.destroy === 'function') {
                swiperInstanceRef.current.destroy(true, true);
                swiperInstanceRef.current = null;
            }
        };
    }, []);

    const goToVotePage = (area: string) => {
        // Provide an area-specific navigation token; consuming code can interpret it
        onNavigate(`check-postcode:${area}`);
    };

    return (
        <div className="flex justify-center items-center pb-12">
            {/* Inline styles copied/adapted from provided snippet */}
            <style>{`
                /* ---------------- */
                /* Carousel Styles  */
                /* ---------------- */
                .swiper-custom {
                    width: 100%;
                    height: 500px;
                }
                .swiper-custom .swiper-slide {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    background: #fafafa;
                    border-radius: 1rem;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    padding: 2rem;
                    height: 460px;
                    text-align: center;
                }
                .area-img {
                    width: 100%;
                    max-width: 420px;
                    height: auto;
                    border-radius: 0.75rem;
                    box-shadow: 0 2px 10px rgba(80,0,100,0.08);
                    margin-bottom: 1.5rem;
                    background: #fff;
                }
                /* Custom Swiper navigation colors */
                .swiper-button-next, .swiper-button-prev {
                    color: #9333ea !important;
                }
                .swiper-pagination-bullet-active {
                    background: #9333ea !important;
                }
            `}</style>

            <div className="w-full max-w-2xl px-4">
                <div className="swiper swiper-custom" ref={swiperRef}>
                    <div className="swiper-wrapper">
                        {/* Blaenavon Slide */}
                        <div className="swiper-slide">
                            <img src="images/bln.png" alt="Blaenavon Area Map" className="area-img" />
                            <h3 className="text-2xl font-semibold text-purple-700 mb-2 dynapuff">Blaenavon</h3>
                            <p className="text-gray-700 mb-4 arial-nova">See projects in Blaenavon and vote for your favourite three!</p>
                            <button
                                onClick={() => goToVotePage('blaenavon')}
                                className="bg-purple-600 hover:bg-purple-800 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition transform hover:scale-105 dynapuff"
                            >
                                View & Vote
                            </button>
                        </div>

                        {/* Thornhill & Upper Cwmbran Slide */}
                        <div className="swiper-slide">
                            <img src="images/tuc.png" alt="Thornhill & Upper Cwmbran Area Map" className="area-img" />
                            <h3 className="text-2xl font-semibold text-purple-700 mb-2 dynapuff">Thornhill & Upper Cwmbran</h3>
                            <p className="text-gray-700 mb-4 arial-nova">See projects in Thornhill & Upper Cwmbran and vote!</p>
                            <button
                                onClick={() => goToVotePage('thornhill')}
                                className="bg-purple-600 hover:bg-purple-800 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition transform hover:scale-105 dynapuff"
                            >
                                View & Vote
                            </button>
                        </div>

                        {/* Trevethin, Penygarn & St. Cadocs Slide */}
                        <div className="swiper-slide">
                            <img src="images/tps.png" alt="Trevethin, Penygarn & St Cadocs Area Map" className="area-img" />
                            <h3 className="text-2xl font-semibold text-purple-700 mb-2 dynapuff">Trevethin, Penygarn & St. Cadocs</h3>
                            <p className="text-gray-700 mb-4 arial-nova">See projects in this area and vote for your favourite three!</p>
                            <button
                                onClick={() => goToVotePage('trevethin')}
                                className="bg-purple-600 hover:bg-purple-800 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition transform hover:scale-105 dynapuff"
                            >
                                View & Vote
                            </button>
                        </div>
                    </div>

                    {/* Carousel Navigation */}
                    <div className="swiper-pagination"></div>
                    <div className="swiper-button-prev"></div>
                    <div className="swiper-button-next"></div>
                </div>
            </div>
        </div>
    );
};

// --- LANDING (Restored "Hero" Aesthetic) ---
export const Landing: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="animate-fade-in bg-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-50 via-white to-white z-0"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
            <span className="inline-block py-2 px-4 rounded-full bg-brand-purple/10 text-brand-purple text-sm font-bold mb-6 font-dynapuff uppercase tracking-widest border border-brand-purple/20">
                Round 2 Applications Now Open
            </span>
            <h1 className="text-6xl md:text-8xl font-bold font-dynapuff text-gray-900 mb-8 tracking-tight">
                Communities' <br/> <span className="text-brand-purple">Choice</span>
            </h1>
            <p className="text-2xl text-gray-600 font-arial max-w-2xl mx-auto leading-relaxed mb-10">
                You Decide. You Benefit. <br/>
                <span className="text-base text-gray-500 mt-2 block">Empowering Torfaen residents to allocate public funding to the projects that matter most.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" onClick={() => onNavigate('register')} className="px-8 py-4 text-lg shadow-xl hover:-translate-y-1">
                    Apply for Funding
                </Button>
                <Button size="lg" variant="outline" onClick={() => onNavigate('priorities')} className="px-8 py-4 text-lg border-2">
                    View Priorities
                </Button>
            </div>
        </div>
      </section>

      {/* Carousel */}
      <AreaCarousel onNavigate={onNavigate} />

      {/* Info Grid */}
      <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold font-dynapuff text-gray-800 mb-4">How It Works</h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">Participatory Budgeting gives you direct control over local spending.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                  {[
                      { title: '1. Ideas', icon: '💡', text: 'Community groups submit project proposals that address local priorities.' },
                      { title: '2. Review', icon: '🔍', text: 'Local People\'s Committees review applications for feasibility and benefit.' },
                      { title: '3. Vote', icon: '🗳️', text: 'Residents vote for their favourite projects at a public event. The most popular win!' }
                  ].map((step, i) => (
                      <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center hover:shadow-xl transition-shadow">
                          <div className="text-6xl mb-6">{step.icon}</div>
                          <h3 className="text-2xl font-bold font-dynapuff text-brand-purple mb-4">{step.title}</h3>
                          <p className="text-gray-600 leading-relaxed">{step.text}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>
    </div>
  );
};

// --- PRIORITIES (Using Specific Area Colours) ---
export const Priorities: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'blaenavon' | 'thornhill' | 'trevethin'>('blaenavon');
    const data = PRIORITY_DATA[activeTab];

    // Colors provided in prompt
    const AREA_COLORS = {
        'blaenavon': '#FFD447',
        'thornhill': '#2FBF71',
        'trevethin': '#3A86FF'
    };
    
    const currentColor = AREA_COLORS[activeTab];

    // Helper for visual flair
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
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold font-dynapuff text-brand-purple mb-6">Local Priorities</h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Based on <strong>1,062 responses</strong> from the 'Have Your Say!' survey. <br/>
                        Applications addressing these themes will be prioritised.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-4 mb-12 flex-wrap">
                    {[
                        { id: 'blaenavon', label: 'Blaenavon', col: '#FFD447' },
                        { id: 'thornhill', label: 'Thornhill & Upper Cwmbran', col: '#2FBF71' },
                        { id: 'trevethin', label: 'Trevethin, Penygarn & St. Cadocs', col: '#3A86FF' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-1 shadow-sm`}
                            style={{ 
                                backgroundColor: activeTab === tab.id ? tab.col : '#FFF',
                                color: activeTab === tab.id ? '#000' : '#666',
                                border: `2px solid ${activeTab === tab.id ? tab.col : 'transparent'}`
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Main Chart Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                        <h3 className="text-2xl font-bold font-dynapuff mb-8 flex items-center gap-3">
                            <span className="w-3 h-8 rounded-full" style={{ backgroundColor: currentColor }}></span>
                            Vote Distribution
                        </h3>
                        <div className="space-y-6">
                            {data.data.map((item, i) => (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="font-bold text-gray-700 flex items-center gap-2">
                                            <span className="text-2xl">{getIcon(item.label)}</span> {item.label}
                                        </span>
                                        <span className="font-bold" style={{ color: currentColor }}>{item.value} votes</span>
                                    </div>
                                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full transition-all duration-1000 ease-out" 
                                            style={{ width: `${(item.value / 150) * 100}%`, backgroundColor: currentColor }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Priorities Cards */}
                    <div className="grid gap-4 content-start">
                        <div className="p-8 rounded-[2.5rem] shadow-lg mb-4 text-black" style={{ backgroundColor: currentColor }}>
                            <h3 className="text-2xl font-bold font-dynapuff mb-2">Key Focus Areas</h3>
                            <p className="opacity-80 font-bold">These are the top 3 priorities identified by your community.</p>
                        </div>
                        {data.data.slice(0, 3).map((item, i) => (
                            <div key={i} className="p-6 rounded-3xl border-2 flex items-center gap-6 transition-transform hover:scale-[1.02] bg-white border-gray-100">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-gray-50">
                                    {getIcon(item.label)}
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase opacity-50 tracking-wider mb-1">Priority #{i+1}</div>
                                    <h4 className="text-xl font-bold font-dynapuff text-gray-800">{item.label}</h4>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- TIMELINE (Styled) ---
export const Timeline: React.FC = () => {
    const events = [
        { date: 'Jan - May 2025', title: 'Have Your Say!', desc: 'Community priorities identified via public survey.', status: 'done' },
        { date: 'June 20 2025', title: 'Applications Open', desc: 'Round 2 EOI submissions begin.', status: 'active' },
        { date: 'Aug 01 2025', title: 'EOI Deadline', desc: 'Midnight deadline for Part 1 forms.', status: 'future' },
        { date: 'Sept 10 2025', title: 'Full Application', desc: 'Part 2 detailed submission deadline.', status: 'future' },
        { date: 'Nov 2025', title: 'Public Vote', desc: 'Community voting events take place.', status: 'future' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-4 animate-fade-in">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold font-dynapuff text-brand-purple mb-4">Programme Timeline</h1>
                    <p className="text-xl text-gray-600">Key dates for the 2026 funding cycle.</p>
                </div>
                
                <div className="relative pl-8 md:pl-0">
                    {/* Vertical Line */}
                    <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gray-200 transform md:-translate-x-1/2 rounded-full"></div>
                    
                    <div className="space-y-16">
                        {events.map((e, i) => (
                            <div key={i} className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''} group`}>
                                {/* Content Side */}
                                <div className="flex-1 w-full md:w-1/2">
                                    <div className={`bg-white p-8 rounded-3xl shadow-sm border-l-8 transition-all hover:shadow-xl ${e.status === 'active' ? 'border-brand-teal ring-4 ring-teal-50' : 'border-gray-100'}`}>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mb-3 ${e.status === 'active' ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'}`}>
                                            {e.date}
                                        </span>
                                        <h3 className="text-2xl font-bold font-dynapuff text-gray-800 mb-2">{e.title}</h3>
                                        <p className="text-gray-600">{e.desc}</p>
                                    </div>
                                </div>

                                {/* Center Node */}
                                <div className="absolute left-8 md:left-1/2 w-12 h-12 bg-white border-4 border-brand-purple rounded-full transform -translate-x-1/2 flex items-center justify-center z-10">
                                    {e.status === 'done' ? <span className="text-brand-purple font-bold">✓</span> : <span className="text-gray-400 font-bold">{i+1}</span>}
                                </div>

                                {/* Empty Side (for layout balance) */}
                                <div className="hidden md:block flex-1"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- PUBLIC DOCUMENTS (Styled) ---
export const PublicDocuments: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 py-20 px-4 animate-fade-in">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold font-dynapuff text-brand-purple mb-6">Resource Centre</h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Download guidance notes, templates, and application forms.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {COMMITTEE_DOCS.map((doc, i) => (
                        <div key={i} onClick={() => window.open(doc.url, '_blank')} className="group bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 cursor-pointer transition-transform">
                            <div className="flex items-start gap-6">
                                <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-brand-purple group-hover:text-white transition-colors shadow-sm">
                                    📄
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold font-dynapuff text-gray-800 mb-2 group-hover:text-brand-purple transition-colors">{doc.title}</h3>
                                    <p className="text-gray-500 mb-4">{doc.desc}</p>
                                    <span className="text-sm font-bold text-brand-teal uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                                        Download PDF <span>→</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- POSTCODE CHECKER (Styled) ---
export const PostcodeChecker: React.FC = () => {
    const [code, setCode] = useState('');
    const [result, setResult] = useState<{valid: boolean, area?: string} | null>(null);

    const check = () => {
        const norm = code.toUpperCase().replace(/\s/g, '');
        let found = false;
        for (const [area, codes] of Object.entries(POSTCODES)) {
            const flatCodes = codes.map(c => c.replace(/\s/g, ''));
            if (flatCodes.includes(norm)) {
                setResult({ valid: true, area });
                found = true;
                break;
            }
        }
        if (!found) setResult({ valid: false });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-teal-700 py-20 px-4 flex items-center justify-center animate-fade-in">
            <Card className="max-w-lg w-full text-center p-12 rounded-[2.5rem] shadow-2xl border-none">
                <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner">📍</div>
                <h1 className="text-4xl font-bold font-dynapuff mb-4 text-gray-800">Check Eligibility</h1>
                <p className="text-gray-500 mb-8 text-lg">Enter your full postcode to confirm you live within a participating area.</p>
                
                <div className="space-y-4">
                    <Input 
                        placeholder="e.g. NP4 9AA" 
                        value={code} 
                        onChange={e => setCode(e.target.value)}
                        className="text-center uppercase font-bold text-2xl tracking-widest py-4 border-2 border-gray-200 focus:border-brand-purple rounded-xl"
                    />
                    <Button onClick={check} size="lg" className="w-full py-4 text-lg shadow-xl bg-brand-purple hover:bg-brand-darkPurple">
                        Verify Location
                    </Button>
                </div>

                {result && (
                    <div className={`mt-8 p-6 rounded-2xl border-2 animate-slide-up ${result.valid ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        {result.valid ? (
                            <div>
                                <div className="text-3xl mb-2">✅ Verified!</div>
                                <div className="text-sm opacity-80 uppercase tracking-wide">You belong to:</div>
                                <div className="font-bold text-xl mt-1">{result.area}</div>
                            </div>
                        ) : (
                            <div className="font-bold text-lg">❌ Postcode not recognized for this funding round.</div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};
