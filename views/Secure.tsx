import React, { useEffect, useState, useMemo } from 'react';
import { Application, User, Score, AREAS, Area, Role, BudgetLine, AdminDocument, PortalSettings, ScoreCriterion } from '../types';
import { SCORING_CRITERIA, MARMOT_PRINCIPLES, WFG_GOALS } from '../constants';
import { api, exportToCSV, seedDatabase } from '../services/firebase';
import { Button, Card, Input, Modal, Badge, BarChart, FileCard } from '../components/UI';

// --- PDF VIEWER COMPONENT (New) ---
const PDFViewer: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col animate-fade-in">
            <div className="h-16 flex justify-between items-center px-6 text-white bg-gray-900 border-b border-gray-800">
                <span className="font-bold font-dynapuff text-lg">Document Viewer</span>
                <button onClick={onClose} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors font-bold text-sm">Close ✕</button>
            </div>
            <div className="flex-1 p-4 bg-gray-800 flex justify-center">
                <iframe src={url} className="w-full h-full max-w-6xl bg-white rounded shadow-2xl" title="PDF Viewer"></iframe>
            </div>
        </div>
    );
};

// --- PROFILE MODAL ---
const ProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User; onSave: (u: User) => void; }> = ({ isOpen, onClose, user, onSave }) => {
    const [data, setData] = useState({ displayName: user.displayName || '', bio: user.bio || '', phone: user.phone || '', address: user.address || '', roleDescription: user.roleDescription || '', photoUrl: user.photoUrl || '' });
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { const reader = new FileReader(); reader.onloadend = () => setData(prev => ({ ...prev, photoUrl: reader.result as string })); reader.readAsDataURL(file); }
    };
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); const updated = await api.updateUserProfile(user.uid, data); onSave(updated); onClose(); };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden border-4 border-purple-100 relative group shadow-inner">
                        <img src={data.photoUrl || `https://ui-avatars.com/api/?name=${data.displayName}&background=random`} alt="Profile" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"><span className="text-white text-xs font-bold uppercase tracking-widest">Change</span></div>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Display Name" value={data.displayName} onChange={e => setData({...data, displayName: e.target.value})} required />
                    <Input label="Role / Title" value={data.roleDescription} onChange={e => setData({...data, roleDescription: e.target.value})} placeholder="e.g. Treasurer" />
                </div>
                <Input label="Phone Number" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} />
                <Button type="submit" className="w-full shadow-lg">Save Profile Changes</Button>
            </form>
        </Modal>
    );
};

// --- USER FORM MODAL ---
const UserFormModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User | null; onSave: () => void; }> = ({ isOpen, onClose, user, onSave }) => {
    const [formData, setFormData] = useState<Partial<User>>({ email: '', username: '', displayName: '', role: 'applicant' });
    const [password, setPassword] = useState('');
    useEffect(() => { if (user) setFormData(user); else setFormData({ email: '', username: '', displayName: '', role: 'applicant' }); setPassword(''); }, [user, isOpen]);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (user) await api.updateUser({ ...user, ...formData } as User);
        else await api.adminCreateUser(formData as User, password);
        onSave(); onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Create New User'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Display Name" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} required />
                <Input label="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!!user} required />
                {!user && <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">Role</label>
                        <select className="w-full p-3 border rounded-xl" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                            <option value="applicant">Applicant</option><option value="committee">Committee</option><option value="admin">Admin</option>
                        </select>
                    </div>
                    {formData.role === 'committee' && (
                        <div>
                            <label className="block text-sm font-bold mb-2">Area</label>
                            <select className="w-full p-3 border rounded-xl" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value as any})}>
                                <option>Select Area...</option>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <Button type="submit" className="w-full mt-4">Save User</Button>
            </form>
        </Modal>
    );
};

// --- SCORE MODAL (With PDF Viewer) ---
const ScoreModal: React.FC<{ isOpen: boolean; onClose: () => void; app: Application; currentUser: User; existingScore?: Score; onSubmit: (s: Score) => void; threshold?: number }> = ({ isOpen, onClose, app, currentUser, existingScore, onSubmit, threshold = 50 }) => {
    const [scores, setScores] = useState<Record<string, number>>(existingScore?.scores || {});
    const [notes, setNotes] = useState<Record<string, string>>(existingScore?.notes || {});
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const { rawTotal, weightedTotalPercent } = useMemo(() => {
        let rTotal = 0;
        let wTotal = 0;
        SCORING_CRITERIA.forEach(c => {
            const val = scores[c.id] || 0;
            rTotal += val;
            wTotal += (val / 3) * c.weight;
        });
        return { rawTotal: rTotal, weightedTotalPercent: Math.round(wTotal) };
    }, [scores]);

    const handleSubmit = () => { onSubmit({ appId: app.id, scorerId: currentUser.uid, scorerName: currentUser.displayName || 'Member', scores, notes, isFinal: true, total: rawTotal, timestamp: Date.now() }); onClose(); };
    
    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Score: ${app.projectTitle}`} size="xl">
                <div className="mb-6 flex gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-700">{app.orgName}</h4>
                        <p className="text-sm text-gray-500">Ref: {app.ref || 'N/A'}</p>
                    </div>
                    {app.pdfUrl && <Button variant="outline" size="sm" onClick={() => setPdfUrl(app.pdfUrl!)}>📄 View Stage 1 PDF</Button>}
                    {app.stage2PdfUrl && <Button variant="outline" size="sm" onClick={() => setPdfUrl(app.stage2PdfUrl!)}>📄 View Stage 2 PDF</Button>}
                </div>
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                    {SCORING_CRITERIA.map(c => (
                        <div key={c.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-gray-800">{c.name} <span className="text-gray-400 text-sm font-normal">({c.weight}%)</span></h4>
                                <div className="flex gap-2">
                                    {[0,1,2,3].map(v => <button key={v} onClick={() => setScores(p => ({...p, [c.id]: v}))} className={`w-10 h-10 rounded-lg font-bold transition-all ${scores[c.id]===v ? 'bg-brand-purple text-white shadow-lg scale-110' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{v}</button>)}
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3 italic">{c.guidance}</p>
                            <input className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors" placeholder="Add justification notes here..." value={notes[c.id]||''} onChange={e=>setNotes(p=>({...p, [c.id]:e.target.value}))} />
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-6 border-t flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                        <div className="font-bold text-xl text-gray-700">Raw: {rawTotal}/30</div>
                        <div className={`px-4 py-2 rounded-lg font-bold text-white shadow-md ${weightedTotalPercent >= threshold ? 'bg-green-500' : 'bg-red-500'}`}>
                            {weightedTotalPercent}% ({weightedTotalPercent >= threshold ? 'Pass' : 'Fail'})
                        </div>
                    </div>
                    <Button onClick={handleSubmit} size="lg" className="shadow-xl">Submit Final Score</Button>
                </div>
            </Modal>
            {pdfUrl && <PDFViewer url={pdfUrl} onClose={() => setPdfUrl(null)} />}
        </>
    );
};

// --- FORMS (Strictly Preserved) ---
// (DigitalStage1Form and DigitalStage2Form logic is identical to previous working version, just wrapped in cleaner containers)
export const DigitalStage1Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: any) => onChange({ ...data, formData: { ...fd, [k]: v } });
    
    return (
        <form onSubmit={onSubmit} className="space-y-8 bg-white p-10 rounded-[2rem] shadow-2xl max-w-5xl mx-auto border border-gray-100">
            <div className="border-b pb-6 mb-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-4xl font-dynapuff text-brand-purple">Expression of Interest (Part 1)</h2>
                    {readOnly && <span className="bg-gray-100 text-gray-500 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Read Only</span>}
                </div>
                <p className="text-gray-500 mt-2">Please complete all sections to be considered for the next stage.</p>
            </div>
            
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">1. Area & Applicant Information</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    {AREAS.map(a => (
                        <label key={a} className={`border-2 p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${data.area === a ? 'bg-purple-50 border-brand-purple shadow-md' : 'border-gray-100 hover:border-purple-200'}`}>
                            <input type="radio" name="area" checked={data.area === a} onChange={() => onChange({...data, area: a})} disabled={readOnly} className="accent-brand-purple w-5 h-5" /> 
                            <span className="font-bold text-gray-700">{a}</span>
                        </label>
                    ))}
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                    <input type="checkbox" checked={fd.applyMultiArea || false} onChange={e => up('applyMultiArea', e.target.checked)} disabled={readOnly} className="w-5 h-5 accent-brand-purple" />
                    <span className="font-bold text-blue-800">My project operates across multiple areas (Cross-Area Application)</span>
                </div>
                {fd.applyMultiArea && <textarea placeholder="Please describe the logistics and cost breakdown for each area..." className="w-full p-4 border rounded-xl h-24" value={fd.crossAreaBreakdown || ''} onChange={e => up('crossAreaBreakdown', e.target.value)} disabled={readOnly} />}
                
                <div className="grid md:grid-cols-2 gap-6">
                    <Input label="Organisation Name" value={data.orgName} onChange={e => onChange({...data, orgName: e.target.value})} disabled={readOnly} />
                    <Input label="Project Title" value={data.projectTitle} onChange={e => onChange({...data, projectTitle: e.target.value})} disabled={readOnly} />
                    <Input label="Contact Name" value={data.applicantName} onChange={e => onChange({...data, applicantName: e.target.value})} disabled={readOnly} />
                    <Input label="Position / Job Title" value={fd.contactPosition || ''} onChange={e => up('contactPosition', e.target.value)} disabled={readOnly} />
                    <Input label="Email Address" type="email" value={fd.contactEmail || ''} onChange={e => up('contactEmail', e.target.value)} disabled={readOnly} />
                    <Input label="Phone Number" value={fd.contactPhone || ''} onChange={e => up('contactPhone', e.target.value)} disabled={readOnly} />
                </div>
            </section>

            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">2. Project Details</h3>
                <Input label="Main Project Theme (see Priorities)" value={fd.projectTheme || ''} onChange={e => up('projectTheme', e.target.value)} disabled={readOnly} />
                <div className="grid md:grid-cols-3 gap-6">
                    <Input label="Start Date" type="date" value={fd.startDate || ''} onChange={e => up('startDate', e.target.value)} disabled={readOnly} />
                    <Input label="End Date" type="date" value={fd.endDate || ''} onChange={e => up('endDate', e.target.value)} disabled={readOnly} />
                    <Input label="Duration" placeholder="e.g. 6 months" value={fd.duration || ''} onChange={e => up('duration', e.target.value)} disabled={readOnly} />
                </div>
                <div>
                    <label className="block font-bold text-sm mb-2 font-dynapuff text-gray-700">Project Summary (Max 250 words)</label>
                    <textarea className="w-full p-4 border border-gray-200 rounded-xl h-40 focus:ring-4 focus:ring-purple-100 outline-none transition-all" value={data.summary} onChange={e => onChange({...data, summary: e.target.value})} disabled={readOnly} />
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <label className="block font-bold text-lg mb-4 font-dynapuff text-gray-800">Positive Outcomes</label>
                    <div className="space-y-4">
                        <Input placeholder="Outcome 1: What will change?" value={fd.outcome1 || ''} onChange={e => up('outcome1', e.target.value)} disabled={readOnly} />
                        <Input placeholder="Outcome 2: Who will benefit?" value={fd.outcome2 || ''} onChange={e => up('outcome2', e.target.value)} disabled={readOnly} />
                        <Input placeholder="Outcome 3: Long term impact?" value={fd.outcome3 || ''} onChange={e => up('outcome3', e.target.value)} disabled={readOnly} />
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">3. Budget</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                        <Input label="Total Project Cost (£)" type="number" value={data.totalCost} onChange={e => onChange({...data, totalCost: Number(e.target.value)})} disabled={readOnly} className="text-xl font-bold" />
                    </div>
                    <div className="bg-teal-50 p-6 rounded-xl border border-teal-100">
                        <Input label="Amount Requested from Fund (£)" type="number" value={data.amountRequested} onChange={e => onChange({...data, amountRequested: Number(e.target.value)})} disabled={readOnly} className="text-xl font-bold" />
                    </div>
                </div>
                <Input label="Other Funding Sources (Confirmed/Pending)" placeholder="e.g. £500 from Town Council (Confirmed)" value={fd.otherFundingSources || ''} onChange={e => up('otherFundingSources', e.target.value)} disabled={readOnly} />
            </section>

            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">4. Priorities & Alignment</h3>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                        <h4 className="font-bold text-brand-purple text-lg mb-4">Marmot Principles</h4>
                        <div className="space-y-3">
                            {MARMOT_PRINCIPLES.map(p => (
                                <label key={p} className="flex gap-3 text-sm items-start cursor-pointer hover:bg-purple-100 p-2 rounded transition-colors">
                                    <input type="checkbox" checked={fd.marmotPrinciples?.includes(p)} onChange={e => { if(readOnly)return; const old = fd.marmotPrinciples||[]; up('marmotPrinciples', e.target.checked ? [...old,p] : old.filter(x=>x!==p)); }} className="mt-1 accent-brand-purple" />
                                    <span>{p}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="bg-teal-50 p-6 rounded-xl border border-teal-100">
                        <h4 className="font-bold text-brand-teal text-lg mb-4">WFG Goals</h4>
                        <div className="space-y-3">
                            {WFG_GOALS.map(g => (
                                <label key={g} className="flex gap-3 text-sm items-start cursor-pointer hover:bg-teal-100 p-2 rounded transition-colors">
                                    <input type="checkbox" checked={fd.wfgGoals?.includes(g)} onChange={e => { if(readOnly)return; const old = fd.wfgGoals||[]; up('wfgGoals', e.target.checked ? [...old,g] : old.filter(x=>x!==g)); }} className="mt-1 accent-brand-teal" />
                                    <span>{g}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            
            {!readOnly && (
                <div className="flex gap-4 pt-8 border-t border-gray-100 sticky bottom-0 bg-white p-4 -mx-4 shadow-inner-top">
                    <Button type="submit" className="flex-1 text-lg py-4 shadow-xl">Submit Expression of Interest</Button>
                    <Button type="button" variant="ghost" onClick={onCancel} className="px-8">Cancel</Button>
                </div>
            )}
        </form>
    );
};

export const DigitalStage2Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: any) => onChange({ ...data, formData: { ...fd, [k]: v } });
    const budget = fd.budgetBreakdown || [];

    return (
        <form onSubmit={onSubmit} className="space-y-8 bg-white p-10 rounded-[2rem] shadow-2xl max-w-6xl mx-auto border border-gray-100">
            <div className="border-b pb-6 mb-6 bg-brand-darkTeal -m-10 mb-8 p-10 rounded-t-[2rem] text-white shadow-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-4xl font-dynapuff mb-2">Full Application (Part 2)</h2>
                        <p className="opacity-80 text-lg">Detailed Delivery Plan & Justified Budget</p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                        <div className="text-xs uppercase font-bold opacity-70">Project Ref</div>
                        <div className="font-mono text-xl">{data.ref || 'NEW'}</div>
                    </div>
                </div>
            </div>

            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">1. Organisation & Bank Details</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <Input label="Charity Number (if applicable)" value={fd.charityNumber || ''} onChange={e => up('charityNumber', e.target.value)} disabled={readOnly} />
                    <Input label="Company Number (if applicable)" value={fd.companyNumber || ''} onChange={e => up('companyNumber', e.target.value)} disabled={readOnly} />
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-bold mb-4 flex items-center gap-2">🏦 Bank Account Details <span className="text-xs font-normal text-gray-500">(Must match bank statement)</span></h4>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Input label="Account Name" value={fd.bankAccountName || ''} onChange={e => up('bankAccountName', e.target.value)} disabled={readOnly} />
                        <Input label="Sort Code" value={fd.bankSortCode || ''} onChange={e => up('bankSortCode', e.target.value)} disabled={readOnly} />
                        <Input label="Account Number" value={fd.bankAccountNumber || ''} onChange={e => up('bankAccountNumber', e.target.value)} disabled={readOnly} />
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">2. Project Delivery Plan</h3>
                <div className="space-y-6">
                    {[
                        { k: 'projectOverview', l: '2.2 Overview & SMART Objectives', h: 'Describe main purpose, beneficiaries, and specific objectives (150-200 words).' },
                        { k: 'activities', l: '2.3 Activities & Delivery Plan', h: 'Outline activities, services, events, milestones and responsibilities.' },
                        { k: 'communityBenefit', l: '2.4 Community Benefit & Impact', h: 'How does this respond to priorities? Short and long term impacts.' },
                        { k: 'collaborations', l: '2.5 Collaborations', h: 'Partners, community centres, groups and their roles.' },
                        { k: 'risks', l: '2.6 Risk Management', h: 'Identify risks and your mitigation strategies.' }
                    ].map(f => (
                        <div key={f.k} className="bg-white rounded-xl">
                            <label className="block font-bold text-lg mb-1 text-gray-800">{f.l}</label>
                            <p className="text-sm text-gray-500 mb-3 italic">{f.h}</p>
                            <textarea className="w-full p-4 border border-gray-300 rounded-xl h-32 focus:ring-4 focus:ring-teal-100 outline-none transition-all" value={(fd as any)[f.k] || ''} onChange={e => up(f.k, e.target.value)} disabled={readOnly} />
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-bold text-xl text-gray-800">3. Detailed Budget</h3>
                    <div className="text-2xl font-bold text-brand-darkTeal">Total: £{data.totalCost}</div>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-3">
                    <div className="grid grid-cols-12 gap-4 text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                        <div className="col-span-5">Item / Service</div>
                        <div className="col-span-4">Notes / Justification</div>
                        <div className="col-span-2">Cost (£)</div>
                        <div className="col-span-1"></div>
                    </div>
                    {budget.map((l, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-5"><input className="w-full p-3 border rounded-lg" placeholder="Item Name" value={l.item} onChange={e => { const n = [...budget]; n[i].item = e.target.value; up('budgetBreakdown', n); }} disabled={readOnly} /></div>
                            <div className="col-span-4"><input className="w-full p-3 border rounded-lg" placeholder="Why is this needed?" value={l.note} onChange={e => { const n = [...budget]; n[i].note = e.target.value; up('budgetBreakdown', n); }} disabled={readOnly} /></div>
                            <div className="col-span-2"><input className="w-full p-3 border rounded-lg font-bold" type="number" placeholder="0.00" value={l.cost} onChange={e => { const n = [...budget]; n[i].cost = Number(e.target.value); up('budgetBreakdown', n); const total = n.reduce((a,b) => a+b.cost, 0); onChange({...data, totalCost: total, amountRequested: total}); }} disabled={readOnly} /></div>
                            <div className="col-span-1">{!readOnly && <button type="button" onClick={() => up('budgetBreakdown', budget.filter((_,j) => j!==i))} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors">✕</button>}</div>
                        </div>
                    ))}
                    {!readOnly && <Button type="button" variant="secondary" size="sm" onClick={() => up('budgetBreakdown', [...budget, { item: '', note: '', cost: 0 }])}>+ Add Budget Line</Button>}
                </div>
                <div className="mt-4">
                    <label className="block font-bold mb-2">Additional Budget Info / Match Funding</label>
                    <textarea className="w-full p-4 border rounded-xl h-24" placeholder="Details of any other funding secured or in-kind contributions..." value={fd.additionalBudgetInfo || ''} onChange={e => up('additionalBudgetInfo', e.target.value)} disabled={readOnly} />
                </div>
            </section>

            {!readOnly && (
                <div className="flex gap-4 pt-8 border-t border-gray-100 sticky bottom-0 bg-white p-4 -mx-4 shadow-inner-top">
                    <Button type="submit" className="flex-1 bg-brand-darkTeal hover:bg-teal-800 text-lg py-4 shadow-xl">Submit Full Application</Button>
                    <Button type="button" variant="ghost" onClick={onCancel} className="px-8">Cancel</Button>
                </div>
            )}
        </form>
    );
};

// --- COMMITTEE DASHBOARD ---
export const CommitteeDashboard: React.FC<{ user: User, onUpdateUser: (u:User)=>void, isAdmin?: boolean, onReturnToAdmin?: ()=>void }> = ({ user, onUpdateUser, isAdmin, onReturnToAdmin }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [settings, setSettings] = useState<PortalSettings>({ stage1Visible: true, stage2Visible: false, votingOpen: false, scoringThreshold: 50 });

    useEffect(() => {
        const load = async () => {
             const allApps = await api.getApplications(isAdmin ? 'All' : user.area);
             setApps(allApps.filter(a => ['Submitted-Stage1', 'Invited-Stage2', 'Submitted-Stage2'].includes(a.status)));
             const s = await api.getPortalSettings();
             setSettings(s);
        };
        load();
    }, [user.area]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                 <div>
                     <h1 className="text-3xl font-bold font-dynapuff text-gray-800">{user.area || 'All Areas'} Committee</h1>
                     {isAdmin && <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Admin View</span>}
                 </div>
                 <div className="flex gap-2">{isAdmin && <Button onClick={onReturnToAdmin}>Return to Admin</Button>}<Button onClick={() => setIsProfileOpen(true)} variant="outline">My Profile</Button></div>
            </div>
            <div className="grid gap-6">
                {apps.map(app => (
                    <Card key={app.id} className="hover:shadow-lg transition-shadow border-l-8 border-l-brand-purple">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{app.area}</div>
                                <h3 className="font-bold text-xl text-gray-800">{app.projectTitle}</h3>
                                <p className="text-sm text-gray-500">{app.orgName}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge>{app.status}</Badge>
                                <Button size="sm" onClick={() => setSelectedApp(app)} className="shadow-md">Evaluate & Score</Button>
                            </div>
                        </div>
                    </Card>
                ))}
                {apps.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-gray-400">No applications pending review in this area.</div>}
            </div>
            {selectedApp && <ScoreModal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} app={selectedApp} currentUser={user} onSubmit={async (s) => { await api.saveScore(s); setSelectedApp(null); }} threshold={settings.scoringThreshold} />}
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onSave={onUpdateUser} />
        </div>
    );
};

// --- ADMIN DASHBOARD ---
export const AdminDashboard: React.FC<{ onNavigatePublic: (v:string)=>void, onNavigateScoring: ()=>void }> = ({ onNavigatePublic, onNavigateScoring }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState<User[]>([]);
    const [apps, setApps] = useState<Application[]>([]);
    const [settings, setSettings] = useState<PortalSettings>({ stage1Visible: true, stage2Visible: false, votingOpen: false, scoringThreshold: 50 });
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [previewMode, setPreviewMode] = useState<'stage1' | 'stage2' | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        api.getUsers().then(u => { setUsers(u); const me = u.find(x => x.role === 'admin'); if(me) setCurrentUser(me); });
        api.getApplications('All').then(setApps);
        api.getPortalSettings().then(setSettings);
    }, []);

    const toggleSetting = async (key: keyof PortalSettings) => { const newS = { ...settings, [key]: !settings[key] }; await api.updatePortalSettings(newS); setSettings(newS); };
    const updateThreshold = async (val: number) => { const newS = { ...settings, scoringThreshold: val }; await api.updatePortalSettings(newS); setSettings(newS); };
    const refresh = () => api.getUsers().then(setUsers);

    // Dummy data for preview mode
    const dummyApp: Partial<Application> = {
        projectTitle: 'Example Project', orgName: 'Community Group', applicantName: 'Jane Doe', area: 'Blaenavon', totalCost: 5000, amountRequested: 4000,
        formData: { contactEmail: 'test@example.com', marmotPrinciples: [MARMOT_PRINCIPLES[0]], budgetBreakdown: [{ item: 'Equipment', note: 'Laptops', cost: 1000 }] }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold font-dynapuff text-brand-purple">Admin Console</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onNavigatePublic('home')}>View Public Site</Button>
                    <Button onClick={onNavigateScoring} className="bg-brand-teal hover:bg-brand-darkTeal">Enter Score Mode</Button>
                    <Button onClick={() => setIsProfileOpen(true)} className="bg-gray-800 hover:bg-black">Admin Profile</Button>
                </div>
            </div>

            <div className="flex gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm inline-flex overflow-x-auto max-w-full">
                {['overview', 'applications', 'users', 'committees', 'documents', 'settings'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-3 rounded-xl font-bold transition-all capitalize whitespace-nowrap ${activeTab === t ? 'bg-brand-purple text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>{t}</button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid gap-8">
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white border-none relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 text-9xl opacity-10">📄</div>
                            <h3 className="text-purple-100 text-sm font-bold uppercase tracking-widest mb-2">Total Applications</h3>
                            <p className="text-5xl font-dynapuff">{apps.length}</p>
                        </Card>
                        <Card className="bg-gradient-to-br from-teal-500 to-teal-700 text-white border-none relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 text-9xl opacity-10">💷</div>
                            <h3 className="text-teal-100 text-sm font-bold uppercase tracking-widest mb-2">Funds Requested</h3>
                            <p className="text-5xl font-dynapuff">£{apps.reduce((s,a)=>s+(a.amountRequested||0),0).toLocaleString()}</p>
                        </Card>
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-none relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 text-9xl opacity-10">👥</div>
                            <h3 className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-2">Users & Members</h3>
                            <p className="text-5xl font-dynapuff">{users.length}</p>
                        </Card>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2">
                            <Card className="h-full">
                                <h3 className="font-bold text-xl mb-6 font-dynapuff">Application Distribution</h3>
                                <BarChart data={Object.entries(apps.reduce((acc,a)=>{acc[a.area]=(acc[a.area]||0)+1;return acc},{} as any)).map(([k,v])=>({label:k.split(' ')[0], value:v as number}))} />
                            </Card>
                        </div>
                        <div>
                            <Card className="h-full">
                                <h3 className="font-bold text-xl mb-6 font-dynapuff">System Actions</h3>
                                <div className="space-y-4">
                                    <Button className="w-full justify-between" onClick={() => exportToCSV(apps, 'apps')}>Download Data CSV <span>📥</span></Button>
                                    <Button className="w-full justify-between bg-red-100 text-red-600 hover:bg-red-200 border-none" onClick={() => seedDatabase().then(() => alert("Database Seeded!"))}>Reset & Seed DB <span>↻</span></Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <Card>
                    <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-2xl font-dynapuff">User Management</h3><Button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}>+ Create New User</Button></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="border-b-2 border-gray-100 text-gray-400 text-sm uppercase tracking-wider"><th className="p-4">Name</th><th className="p-4">Role</th><th className="p-4">Area</th><th className="p-4 text-right">Actions</th></tr></thead>
                            <tbody>{users.map(u => <tr key={u.uid} className="border-b border-gray-50 hover:bg-gray-50 transition-colors"><td className="p-4 font-bold text-gray-800">{u.displayName}<div className="text-xs font-normal text-gray-400">{u.email}</div></td><td className="p-4"><Badge>{u.role}</Badge></td><td className="p-4 text-gray-500">{u.area || '-'}</td><td className="p-4 text-right"><button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="text-blue-600 font-bold hover:underline mr-4">Edit</button><button onClick={async () => { if(confirm("Delete user?")) { await api.deleteUser(u.uid); refresh(); }}} className="text-red-500 font-bold hover:underline">Delete</button></td></tr>)}</tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'committees' && (
                <Card>
                    <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-2xl font-dynapuff">Committee Members</h3><Input placeholder="Search members..." className="w-64 mb-0" /></div>
                    <div className="grid md:grid-cols-2 gap-4">
                        {users.filter(u => u.role === 'committee').map(u => (
                            <div key={u.uid} className="flex items-center gap-4 p-4 border rounded-xl hover:shadow-md transition-shadow bg-white">
                                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xl">{u.displayName?.charAt(0)}</div>
                                <div><div className="font-bold">{u.displayName}</div><div className="text-xs text-gray-500">{u.area}</div></div>
                                <div className="ml-auto"><Badge variant="green">Active</Badge></div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {activeTab === 'settings' && (
                <div className="grid md:grid-cols-2 gap-8">
                    <Card className="border-t-4 border-t-purple-500">
                        <h3 className="font-bold text-xl mb-6 font-dynapuff">Application Lifecycle</h3>
                        <div className="space-y-6">
                            {[ {k:'stage1Visible', l:'Stage 1 (EOI)'}, {k:'stage2Visible', l:'Stage 2 (Full App)'}, {k:'votingOpen', l:'Public Voting'} ].map((s: any) => (
                                <div key={s.k} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="font-bold text-gray-700">{s.l}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={(settings as any)[s.k]} onChange={() => toggleSetting(s.k)} />
                                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                            ))}
                            <div className="p-6 bg-gray-800 rounded-xl text-white">
                                <label className="block font-bold mb-4 flex justify-between"><span>Scoring Pass Threshold</span> <span className="bg-white/20 px-2 rounded">{settings.scoringThreshold}%</span></label>
                                <input type="range" min="0" max="100" value={settings.scoringThreshold} onChange={(e) => updateThreshold(Number(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-brand-teal" />
                            </div>
                        </div>
                    </Card>
                    <Card className="border-t-4 border-t-teal-500">
                        <h3 className="font-bold text-xl mb-6 font-dynapuff">System Tools</h3>
                        <div className="space-y-4">
                            <Button className="w-full py-4 text-lg justify-center bg-purple-100 text-purple-800 hover:bg-purple-200 border-none" onClick={() => setPreviewMode('stage1')}>👁️ Preview Stage 1 Form</Button>
                            <Button className="w-full py-4 text-lg justify-center bg-teal-100 text-teal-800 hover:bg-teal-200 border-none" onClick={() => setPreviewMode('stage2')}>👁️ Preview Stage 2 Form</Button>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'documents' && <AdminDocCentre />}

            {activeTab === 'applications' && (
                 <Card>
                    <div className="flex justify-between mb-6"><h3 className="font-bold text-2xl font-dynapuff">Master Application List</h3><Button size="sm" onClick={() => exportToCSV(apps, 'all_apps')}>Export CSV</Button></div>
                    <div className="space-y-3">
                        {apps.map(a => (
                            <div key={a.id} className="flex justify-between items-center p-4 border rounded-xl hover:shadow-md transition-all bg-white group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 group-hover:bg-brand-purple group-hover:text-white transition-colors">{a.projectTitle.charAt(0)}</div>
                                    <div><div className="font-bold text-lg">{a.projectTitle}</div><div className="text-xs text-gray-500 uppercase tracking-wide">{a.orgName} • {a.area}</div></div>
                                </div>
                                <Badge>{a.status}</Badge>
                            </div>
                        ))}
                    </div>
                 </Card>
            )}

            {previewMode && <Modal isOpen={!!previewMode} onClose={() => setPreviewMode(null)} title="Form Preview" size="xl"><div className="p-3 mb-6 bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-center font-bold text-sm uppercase tracking-wider">⚠️ Admin Preview Mode - Data will not be saved</div>{previewMode === 'stage1' ? <DigitalStage1Form data={dummyApp} onChange={()=>{}} onSubmit={e=>{e.preventDefault();}} onCancel={()=>setPreviewMode(null)} /> : <DigitalStage2Form data={dummyApp} onChange={()=>{}} onSubmit={e=>{e.preventDefault();}} onCancel={()=>setPreviewMode(null)} />}</Modal>}
            {isUserModalOpen && <UserFormModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} user={editingUser} onSave={refresh} />}
            {currentUser && <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={currentUser} onSave={setCurrentUser} />}
        </div>
    );
};

// --- APPLICANT DASHBOARD ---
export const ApplicantDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'stage1' | 'stage2'>('list');
    const [activeApp, setActiveApp] = useState<Partial<Application>>({});
    const [currUser, setCurrUser] = useState(user);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => { api.getApplications().then(all => setApps(all.filter(a => a.userId === user.uid))); }, [user.uid, viewMode]);
    const handleSubmit = async (e: React.FormEvent, stage: string) => { e.preventDefault(); const status = stage === '1' ? 'Submitted-Stage1' : 'Submitted-Stage2'; if (activeApp.id) await api.updateApplication(activeApp.id, { ...activeApp, status } as any); else await api.createApplication({ ...activeApp, status } as any); setViewMode('list'); };

    if (viewMode !== 'list') return viewMode === 'stage1' ? <DigitalStage1Form data={activeApp} onChange={setActiveApp} onSubmit={e => handleSubmit(e,'1')} onCancel={() => setViewMode('list')} /> : <DigitalStage2Form data={activeApp} onChange={setActiveApp} onSubmit={e => handleSubmit(e,'2')} onCancel={() => setViewMode('list')} />;

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-bold font-dynapuff text-brand-purple mb-2">Welcome, {currUser.displayName}</h1>
                    <p className="text-gray-500">Manage your funding applications.</p>
                </div>
                <Button onClick={() => setIsProfileOpen(true)} variant="outline">My Profile</Button>
            </div>
            
            {apps.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-[2rem] shadow-sm border-2 border-dashed border-gray-200">
                    <div className="text-6xl mb-4">🚀</div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Ready to make a difference?</h3>
                    <p className="text-gray-500 mb-8">You haven't started any applications yet.</p>
                    <Button size="lg" onClick={() => { setActiveApp({ userId: user.uid, status: 'Draft' }); setViewMode('stage1'); }} className="shadow-xl">Start New Application</Button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {apps.map(app => (
                        <Card key={app.id} className="border-l-8 border-l-brand-teal hover:shadow-xl transition-shadow">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ref: {app.ref || 'PENDING'}</div>
                                    <h3 className="font-bold text-2xl text-gray-800">{app.projectTitle}</h3>
                                    <p className="text-sm text-gray-500 mt-1">Status: <span className="font-bold text-brand-purple">{app.status}</span></p>
                                </div>
                                <div className="flex gap-3">
                                    {app.status === 'Draft' && <Button onClick={() => { setActiveApp(app); setViewMode('stage1'); }}>Continue Editing</Button>}
                                    {app.status === 'Invited-Stage2' && <Button className="bg-brand-teal hover:bg-brand-darkTeal" onClick={() => { setActiveApp(app); setViewMode('stage2'); }}>Start Stage 2</Button>}
                                    <Button variant="ghost" size="sm">View Details</Button>
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-brand-purple to-brand-teal" style={{ width: `${(app.status.includes('Stage2') ? 75 : app.status.includes('Submitted') ? 50 : 25)}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">
                                    <span>Draft</span>
                                    <span>EOI Submitted</span>
                                    <span>Full App</span>
                                    <span>Voting</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                    <div className="text-center mt-8">
                        <Button variant="outline" onClick={() => { setActiveApp({ userId: user.uid, status: 'Draft' }); setViewMode('stage1'); }}>+ Start Another Application</Button>
                    </div>
                </div>
            )}
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={currUser} onSave={setCurrUser} />
        </div>
    );
};
