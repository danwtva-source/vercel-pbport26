import React, { useEffect, useState, useMemo } from 'react';
import { Application, User, Score, AREAS, Area, Role, BudgetLine, AdminDocument, PortalSettings, ScoreCriterion } from '../types';
import { SCORING_CRITERIA, MARMOT_PRINCIPLES, WFG_GOALS, ORG_TYPES } from '../constants';
import { api, exportToCSV, seedDatabase } from '../services/firebase';
import { Button, Card, Input, Modal, Badge, BarChart, FileCard } from '../components/UI';

// --- SHARED COMPONENTS ---

const PDFViewer: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => (
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

const ProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User; onSave: (u: User) => void; }> = ({ isOpen, onClose, user, onSave }) => {
    const [data, setData] = useState({ displayName: user.displayName || '', bio: user.bio || '', phone: user.phone || '', address: user.address || '', roleDescription: user.roleDescription || '', photoUrl: user.photoUrl || '' });
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { const reader = new FileReader(); reader.onloadend = () => setData(prev => ({ ...prev, photoUrl: reader.result as string })); reader.readAsDataURL(file); }
    };
    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        try {
            const updated = await api.updateUserProfile(user.uid, data); 
            onSave(updated); 
            onClose(); 
        } catch(e) {
            alert("Error saving profile: " + e);
        }
    };
    
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
                <Input label="Address" value={data.address} onChange={e => setData({...data, address: e.target.value})} />
                <div className="bg-gray-50 p-3 rounded text-sm text-gray-500">
                    <label className="block font-bold mb-1">Bio</label>
                    <textarea className="w-full p-2 border rounded" value={data.bio} onChange={e => setData({...data, bio: e.target.value})} rows={3} />
                </div>
                <Button type="submit" className="w-full shadow-lg">Save Profile Changes</Button>
            </form>
        </Modal>
    );
};

// --- STAGE 1 FORM (Matches PB 1.1 PDF) ---
export const DigitalStage1Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: any) => onChange({ ...data, formData: { ...fd, [k]: v } });
    
    // Org Type Checkbox Logic
    const toggleOrgType = (type: string) => {
        const current = fd.orgTypes || [];
        const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
        up('orgTypes', updated);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-8 bg-white p-10 rounded-[2rem] shadow-2xl max-w-5xl mx-auto border border-gray-100">
            <div className="border-b pb-6 mb-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-4xl font-dynapuff text-brand-purple">Expression of Interest (Part 1)</h2>
                    {readOnly && <span className="bg-gray-100 text-gray-500 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Read Only</span>}
                </div>
                <p className="text-gray-500 mt-2">PB 1.1 - Please complete all sections to be considered for the next stage.</p>
            </div>
            
            {/* 1. Area & Applicant */}
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
                    <span className="font-bold text-blue-800">Applying for funding in more than one area?</span>
                </div>
                {fd.applyMultiArea && <textarea placeholder="Describe logistics/cost breakdown for each area..." className="w-full p-4 border rounded-xl h-24" value={fd.crossAreaBreakdown || ''} onChange={e => up('crossAreaBreakdown', e.target.value)} disabled={readOnly} />}
                
                <div className="grid md:grid-cols-2 gap-6">
                    <Input label="Organisation Name" value={data.orgName} onChange={e => onChange({...data, orgName: e.target.value})} disabled={readOnly} />
                    <Input label="Position / Job Title" value={fd.contactPosition || ''} onChange={e => up('contactPosition', e.target.value)} disabled={readOnly} />
                    <Input label="Contact Name" value={data.applicantName} onChange={e => onChange({...data, applicantName: e.target.value})} disabled={readOnly} />
                    <Input label="Email Address" type="email" value={fd.contactEmail || ''} onChange={e => up('contactEmail', e.target.value)} disabled={readOnly} />
                    <Input label="Phone Number" value={fd.contactPhone || ''} onChange={e => up('contactPhone', e.target.value)} disabled={readOnly} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    <Input label="Street" value={fd.addressStreet || ''} onChange={e => up('addressStreet', e.target.value)} disabled={readOnly} />
                    <Input label="Town/City" value={fd.addressTown || ''} onChange={e => up('addressTown', e.target.value)} disabled={readOnly} />
                    <Input label="Postcode" value={fd.addressPostcode || ''} onChange={e => up('addressPostcode', e.target.value)} disabled={readOnly} />
                </div>
            </section>

            {/* 2. Organisation Type */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">2. Organisation Type</h3>
                <div className="grid md:grid-cols-2 gap-3">
                    {ORG_TYPES.map(type => (
                        <label key={type} className="flex gap-3 text-sm items-center cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                            <input type="checkbox" checked={fd.orgTypes?.includes(type)} onChange={() => toggleOrgType(type)} disabled={readOnly} className="accent-brand-purple" />
                            <span>{type}</span>
                        </label>
                    ))}
                </div>
                <Input label="Other (please describe)" value={fd.orgTypeOther || ''} onChange={e => up('orgTypeOther', e.target.value)} disabled={readOnly} />
            </section>

            {/* 3. Priorities */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">3. Priorities & Timeline</h3>
                <Input label="Main Project Theme (see Priorities Report)" value={fd.projectTheme || ''} onChange={e => up('projectTheme', e.target.value)} disabled={readOnly} />
                <div className="grid md:grid-cols-3 gap-6">
                    <Input label="Start Date" type="date" value={fd.startDate || ''} onChange={e => up('startDate', e.target.value)} disabled={readOnly} />
                    <Input label="End Date" type="date" value={fd.endDate || ''} onChange={e => up('endDate', e.target.value)} disabled={readOnly} />
                    <Input label="Duration" placeholder="e.g. 6 months" value={fd.duration || ''} onChange={e => up('duration', e.target.value)} disabled={readOnly} />
                </div>
            </section>

            {/* 4. Project Details */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">4. Project Details</h3>
                <Input label="Project Title" value={data.projectTitle} onChange={e => onChange({...data, projectTitle: e.target.value})} disabled={readOnly} />
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

            {/* 5. Budget */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">5. Budget</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                        <Input label="Total Project Cost (£)" type="number" value={data.totalCost} onChange={e => onChange({...data, totalCost: Number(e.target.value)})} disabled={readOnly} className="text-xl font-bold" />
                    </div>
                    <div className="bg-teal-50 p-6 rounded-xl border border-teal-100">
                        <Input label="Amount Requested (£)" type="number" value={data.amountRequested} onChange={e => onChange({...data, amountRequested: Number(e.target.value)})} disabled={readOnly} className="text-xl font-bold" />
                    </div>
                </div>
                <Input label="Other Funding Sources" placeholder="e.g. £500 from Town Council" value={fd.otherFundingSources || ''} onChange={e => up('otherFundingSources', e.target.value)} disabled={readOnly} />
            </section>

            {/* 6. Alignment */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">6. Alignment</h3>
                <p className="text-sm text-gray-500">Tick all that apply. You will be asked to justify these in Part 2.</p>
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

            {/* 7. Declarations */}
            <section className="space-y-6 border-t pt-6">
                <h3 className="font-bold text-xl text-gray-800">7. Declarations</h3>
                <label className="flex gap-3 items-center">
                    <input type="checkbox" checked={fd.gdprConsent} onChange={e => up('gdprConsent', e.target.checked)} disabled={readOnly} />
                    <span>I confirm that I have read, understood and consent to the GDPR Policy.</span>
                </label>
                <label className="flex gap-3 items-center">
                    <input type="checkbox" checked={fd.declarationTrue} onChange={e => up('declarationTrue', e.target.checked)} disabled={readOnly} />
                    <span>I declare that the information provided is true and correct.</span>
                </label>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <Input label="Name" value={fd.declarationName || ''} onChange={e => up('declarationName', e.target.value)} disabled={readOnly} />
                    <Input label="Typed Signature" value={fd.declarationSignature || ''} onChange={e => up('declarationSignature', e.target.value)} disabled={readOnly} />
                    <Input label="Date" type="date" value={fd.declarationDate || ''} onChange={e => up('declarationDate', e.target.value)} disabled={readOnly} />
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

// --- STAGE 2 FORM (Matches PB 2.1 PDF) ---
export const DigitalStage2Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: any) => onChange({ ...data, formData: { ...fd, [k]: v } });
    const budget = fd.budgetBreakdown || [];

    // Helper for Justification Updates
    const updateJustification = (type: 'marmot' | 'wfg', key: string, val: string) => {
        const field = type === 'marmot' ? 'marmotJustifications' : 'wfgJustifications';
        const current = fd[field] || {};
        up(field, { ...current, [key]: val });
    };

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
                    <h4 className="font-bold mb-4 flex items-center gap-2">🏦 Bank Account Details</h4>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Input label="Account Name" value={fd.bankAccountName || ''} onChange={e => up('bankAccountName', e.target.value)} disabled={readOnly} />
                        <Input label="Sort Code" value={fd.bankSortCode || ''} onChange={e => up('bankSortCode', e.target.value)} disabled={readOnly} />
                        <Input label="Account Number" value={fd.bankAccountNumber || ''} onChange={e => up('bankAccountNumber', e.target.value)} disabled={readOnly} />
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">2. Detailed Project</h3>
                {[
                    { k: 'smartObjectives', l: 'SMART Objectives', h: 'Specific, Measurable, Achievable, Relevant, Time-bound.' },
                    { k: 'activities', l: 'Activities & Delivery Plan', h: 'What exactly will you do?' },
                    { k: 'communityBenefit', l: 'Community Benefit', h: 'How does it help?' },
                    { k: 'collaborations', l: 'Collaborations', h: 'Who are you working with?' },
                    { k: 'riskManagement', l: 'Risk Management', h: 'What could go wrong and how will you fix it?' }
                ].map(f => (
                    <div key={f.k}>
                        <label className="block font-bold text-lg mb-1">{f.l}</label>
                        <p className="text-sm text-gray-500 mb-2">{f.h}</p>
                        <textarea className="w-full p-4 border rounded-xl h-32" value={(fd as any)[f.k] || ''} onChange={e => up(f.k, e.target.value)} disabled={readOnly} />
                    </div>
                ))}
            </section>

            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">3. Alignment (Justification)</h3>
                <p className="text-gray-500 mb-4">Please explain how your project contributes to the priorities you selected in Part 1.</p>
                
                {fd.marmotPrinciples?.map(p => (
                    <div key={p} className="bg-purple-50 p-4 rounded-xl mb-4 border border-purple-100">
                        <h4 className="font-bold text-purple-900 mb-2">{p}</h4>
                        <textarea className="w-full p-3 border rounded-lg bg-white" placeholder="Explanation..." value={fd.marmotJustifications?.[p] || ''} onChange={e => updateJustification('marmot', p, e.target.value)} disabled={readOnly} />
                    </div>
                ))}
                {fd.wfgGoals?.map(g => (
                    <div key={g} className="bg-teal-50 p-4 rounded-xl mb-4 border border-teal-100">
                        <h4 className="font-bold text-teal-900 mb-2">{g}</h4>
                        <textarea className="w-full p-3 border rounded-lg bg-white" placeholder="Explanation..." value={fd.wfgJustifications?.[g] || ''} onChange={e => updateJustification('wfg', g, e.target.value)} disabled={readOnly} />
                    </div>
                ))}
            </section>

            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">4. Detailed Budget</h3>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-3">
                    {budget.map((l, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-5"><input className="w-full p-3 border rounded-lg" placeholder="Item Name" value={l.item} onChange={e => { const n = [...budget]; n[i].item = e.target.value; up('budgetBreakdown', n); }} disabled={readOnly} /></div>
                            <div className="col-span-4"><input className="w-full p-3 border rounded-lg" placeholder="Justification" value={l.note} onChange={e => { const n = [...budget]; n[i].note = e.target.value; up('budgetBreakdown', n); }} disabled={readOnly} /></div>
                            <div className="col-span-2"><input className="w-full p-3 border rounded-lg font-bold" type="number" placeholder="0.00" value={l.cost} onChange={e => { const n = [...budget]; n[i].cost = Number(e.target.value); up('budgetBreakdown', n); const total = n.reduce((a,b) => a+b.cost, 0); onChange({...data, totalCost: total, amountRequested: total}); }} disabled={readOnly} /></div>
                            <div className="col-span-1">{!readOnly && <button type="button" onClick={() => up('budgetBreakdown', budget.filter((_,j) => j!==i))} className="text-red-400 p-2">✕</button>}</div>
                        </div>
                    ))}
                    {!readOnly && <Button type="button" variant="secondary" size="sm" onClick={() => up('budgetBreakdown', [...budget, { item: '', note: '', cost: 0 }])}>+ Add Line</Button>}
                </div>
                <div className="text-right font-bold text-xl">Total: £{data.totalCost}</div>
                <textarea className="w-full p-4 border rounded-xl" placeholder="Additional Budget Info..." value={fd.additionalBudgetInfo || ''} onChange={e => up('additionalBudgetInfo', e.target.value)} disabled={readOnly} />
            </section>

            <section className="space-y-6 pt-6 border-t">
                <h3 className="font-bold text-xl">5. Declarations</h3>
                <label className="flex gap-3"><input type="checkbox" checked={fd.consentWithdraw} onChange={e => up('consentWithdraw', e.target.checked)} disabled={readOnly} /> <span>I consent to withdrawal at discretion if necessary.</span></label>
                <label className="flex gap-3"><input type="checkbox" checked={fd.agreeGdprScrutiny} onChange={e => up('agreeGdprScrutiny', e.target.checked)} disabled={readOnly} /> <span>I agree to GDPR policy and scrutiny.</span></label>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <Input label="Name" value={fd.declarationName2 || ''} onChange={e => up('declarationName2', e.target.value)} disabled={readOnly} />
                    <Input label="Typed Signature" value={fd.declarationSignature2 || ''} onChange={e => up('declarationSignature2', e.target.value)} disabled={readOnly} />
                    <Input label="Date" type="date" value={fd.declarationDate2 || ''} onChange={e => up('declarationDate2', e.target.value)} disabled={readOnly} />
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

    const handleSubmit = () => { 
        onSubmit({ 
            appId: app.id, 
            scorerId: currentUser.uid, 
            scorerName: currentUser.displayName || 'Member', 
            scores, 
            notes, 
            isFinal: true, 
            total: rawTotal, 
            weightedTotal: weightedTotalPercent, 
            timestamp: Date.now() 
        }); 
        onClose(); 
    };
    
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
                            <input className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors" placeholder="Justification notes..." value={notes[c.id]||''} onChange={e=>setNotes(p=>({...p, [c.id]:e.target.value}))} />
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
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Create User'}>
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
                                <option>Select Area...</option>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select>
                        </div>
                    )}
                </div>
                <Button type="submit" className="w-full mt-4">Save User</Button>
            </form>
        </Modal>
    );
};

// --- ADMIN DOCUMENT CENTRE ---
const AdminDocCentre: React.FC = () => {
    const [docs, setDocs] = useState<AdminDocument[]>([]);
    const [viewId, setViewId] = useState<string>('root');

    useEffect(() => { api.getDocuments().then(setDocs); }, []);

    const currentDocs = docs.filter(d => d.parentId === viewId);
    const parent = viewId !== 'root' ? docs.find(d => d.id === viewId) : null;

    const handleCreateFolder = async () => {
        const name = prompt("Folder Name:");
        if (!name) return;
        const newDoc: AdminDocument = { id: 'doc_' + Date.now(), name, type: 'folder', parentId: viewId, category: 'general', uploadedBy: 'Admin', createdAt: Date.now() };
        await api.createDocument(newDoc);
        setDocs(prev => [...prev, newDoc]);
    };

    const handleUpload = async () => {
        const name = prompt("Upload File (Simulator): Enter filename");
        if (!name) return;
        const newDoc: AdminDocument = { id: 'file_' + Date.now(), name, type: 'file', parentId: viewId, url: '#', category: 'general', uploadedBy: 'Admin', createdAt: Date.now() };
        await api.createDocument(newDoc);
        setDocs(prev => [...prev, newDoc]);
        alert("File record created! (No actual storage bucket connected yet)");
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    {viewId !== 'root' && <button onClick={() => setViewId(parent?.parentId || 'root')} className="text-2xl hover:bg-gray-100 p-1 rounded">🔙</button>}
                    <h3 className="font-bold text-xl">{viewId === 'root' ? 'Document Centre' : parent?.name}</h3>
                </div>
                <div className="flex gap-2"><Button size="sm" variant="outline" onClick={handleCreateFolder}>+ Folder</Button><Button size="sm" onClick={handleUpload}>+ Upload File</Button></div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
                {currentDocs.map(d => (
                    <FileCard 
                        key={d.id} title={d.name} type={d.type} date={new Date(d.createdAt).toLocaleDateString()}
                        onClick={() => d.type === 'folder' ? setViewId(d.id) : alert("Downloading " + d.name)}
                        onDelete={async () => { if(confirm("Delete?")) { await api.deleteDocument(d.id); setDocs(docs.filter(x => x.id !== d.id)); }}}
                    />
                ))}
            </div>
        </Card>
    );
};

// --- DASHBOARDS ---

export const ApplicantDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'stage1' | 'stage2'>('list');
    const [activeApp, setActiveApp] = useState<Partial<Application>>({});
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [currUser, setCurrUser] = useState(user);

    useEffect(() => { api.getApplications().then(all => setApps(all.filter(a => a.userId === user.uid))); }, [user.uid, viewMode]);

    const handleSubmit = async (e: React.FormEvent, stage: string) => {
        e.preventDefault();
        const status = stage === '1' ? 'Submitted-Stage1' : 'Submitted-Stage2';
        const finalApp = { ...activeApp, status, userId: user.uid };
        if (activeApp.id) await api.updateApplication(activeApp.id, finalApp as any);
        else await api.createApplication(finalApp as any);
        setViewMode('list');
    };

    if (viewMode !== 'list') {
        return viewMode === 'stage1' 
            ? <DigitalStage1Form data={activeApp} onChange={setActiveApp} onSubmit={e => handleSubmit(e,'1')} onCancel={() => setViewMode('list')} />
            : <DigitalStage2Form data={activeApp} onChange={setActiveApp} onSubmit={e => handleSubmit(e,'2')} onCancel={() => setViewMode('list')} />;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8"><h1 className="text-3xl font-bold font-dynapuff">Welcome, {currUser.displayName}</h1><Button onClick={() => setIsProfileOpen(true)} variant="outline">My Profile</Button></div>
            <Card>
                <div className="flex justify-between mb-4"><h2 className="font-bold text-xl">My Applications</h2><Button onClick={() => { setActiveApp({ userId: user.uid, status: 'Draft' }); setViewMode('stage1'); }}>Start New EOI</Button></div>
                {apps.length === 0 ? <p className="text-gray-500 py-8 text-center">No applications yet.</p> : apps.map(app => <div key={app.id} className="border p-4 rounded-xl mb-4 flex justify-between items-center"><div><div className="font-bold text-lg">{app.projectTitle}</div><Badge>{app.status}</Badge></div><div className="flex gap-2">{app.status === 'Draft' && <Button size="sm" onClick={() => { setActiveApp(app); setViewMode('stage1'); }}>Edit</Button>}{app.status === 'Invited-Stage2' && <Button size="sm" variant="secondary" onClick={() => { setActiveApp(app); setViewMode('stage2'); }}>Start Stage 2</Button>}</div></div>)}
            </Card>
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={currUser} onSave={setCurrUser} />
        </div>
    );
};

export const CommitteeDashboard: React.FC<{ user: User, onUpdateUser: (u:User)=>void, isAdmin?: boolean, onReturnToAdmin?: ()=>void }> = ({ user, onUpdateUser, isAdmin, onReturnToAdmin }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [team, setTeam] = useState<User[]>([]);
    const [activeTab, setActiveTab] = useState('tasks');
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [settings, setSettings] = useState<PortalSettings>({ stage1Visible: true, stage2Visible: false, votingOpen: false, scoringThreshold: 50 });

    useEffect(() => {
        const load = async () => {
             const allApps = await api.getApplications(isAdmin ? 'All' : user.area);
             setApps(allApps.filter(a => ['Submitted-Stage1', 'Invited-Stage2', 'Submitted-Stage2'].includes(a.status)));
             if(user.area) { const allUsers = await api.getUsers(); setTeam(allUsers.filter(u => u.role === 'committee' && u.area === user.area)); }
             const s = await api.getPortalSettings(); setSettings(s);
        };
        load();
    }, [user.area]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                 <div><h1 className="text-3xl font-bold font-dynapuff">{user.area || 'All Areas'} Committee {isAdmin && '(Admin View)'}</h1></div>
                 <div className="flex gap-2">{isAdmin && <Button onClick={onReturnToAdmin}>Back</Button>}<Button onClick={() => setIsProfileOpen(true)} variant="outline">Profile</Button></div>
            </div>
            <div className="flex gap-4 mb-6 border-b">{['tasks', 'team', 'documents'].map(t => <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 font-bold border-b-2 transition-colors capitalize ${activeTab === t ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-400'}`}>{t}</button>)}</div>
            {activeTab === 'tasks' && <div className="grid gap-4">{apps.map(app => <Card key={app.id}><div className="flex justify-between items-center"><div><h3 className="font-bold text-lg">{app.projectTitle}</h3><Badge>{app.status}</Badge></div><Button size="sm" onClick={() => setSelectedApp(app)}>Evaluate</Button></div></Card>)}</div>}
            {activeTab === 'team' && <div className="grid md:grid-cols-2 gap-4">{team.map(m => <div key={m.uid} className="bg-white p-4 rounded-xl shadow flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-brand-purple text-white flex items-center justify-center font-bold">{m.displayName?.charAt(0)}</div><div><div className="font-bold">{m.displayName}</div><div className="text-xs text-gray-500">{m.email}</div></div></div>)}</div>}
            {activeTab === 'documents' && <Card><h3 className="font-bold mb-4">Resources</h3><p className="text-gray-500">No documents yet.</p></Card>}
            {selectedApp && <ScoreModal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} app={selectedApp} currentUser={user} onSubmit={async (s) => { await api.saveScore(s); setSelectedApp(null); }} threshold={settings.scoringThreshold} />}
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onSave={onUpdateUser} />
        </div>
    );
};

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

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-dynapuff text-brand-purple">Admin Console</h1>
                <div className="flex gap-2"><Button variant="outline" onClick={() => onNavigatePublic('home')}>Public Site</Button><Button onClick={onNavigateScoring}>Score Mode</Button><Button onClick={() => setIsProfileOpen(true)}>My Profile</Button></div>
            </div>
            <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm inline-flex overflow-x-auto max-w-full">
                {['overview', 'applications', 'users', 'committees', 'documents', 'settings'].map(t => <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-lg font-bold transition-all capitalize ${activeTab === t ? 'bg-brand-purple text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>{t}</button>)}
            </div>
            {activeTab === 'overview' && <div className="grid gap-6"><div className="grid md:grid-cols-4 gap-4"><Card className="bg-purple-50 border-purple-100"><h3 className="text-purple-800 text-sm font-bold uppercase">Total Apps</h3><p className="text-3xl font-dynapuff">{apps.length}</p></Card><Card className="bg-blue-50 border-blue-100"><h3 className="text-blue-800 text-sm font-bold uppercase">Users</h3><p className="text-3xl font-dynapuff">{users.length}</p></Card></div><Card><h3 className="font-bold mb-4">Quick Actions</h3><Button className="w-full justify-start" onClick={() => exportToCSV(apps, 'apps')}>📥 Export CSV</Button><Button className="w-full justify-start bg-red-100 text-red-600 mt-2" onClick={() => seedDatabase().then(() => alert("Seeded!"))}>↻ Seed Database</Button></Card></div>}
            {activeTab === 'users' && <Card><div className="flex justify-between mb-4"><h3 className="font-bold text-xl">Users</h3><Button size="sm" onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}>+ User</Button></div><table className="w-full text-left"><thead><tr className="border-b"><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Actions</th></tr></thead><tbody>{users.map(u => <tr key={u.uid} className="border-b"><td className="p-3">{u.displayName}</td><td className="p-3"><Badge>{u.role}</Badge></td><td className="p-3"><button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="text-blue-600 mr-2">Edit</button><button onClick={async () => { if(confirm("Delete?")) { await api.deleteUser(u.uid); refresh(); }}} className="text-red-600">Delete</button></td></tr>)}</tbody></table></Card>}
            {activeTab === 'committees' && <Card><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-2xl font-dynapuff">Committee Members</h3><Button size="sm" onClick={() => { setEditingUser({ role: 'committee' } as User); setIsUserModalOpen(true); }}>+ Add Member</Button></div><div className="grid md:grid-cols-2 gap-4">{users.filter(u => u.role === 'committee').map(u => <div key={u.uid} className="flex items-center gap-4 p-4 border rounded-xl hover:shadow-md transition-shadow bg-white relative group"><div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xl">{u.displayName?.charAt(0)}</div><div><div className="font-bold">{u.displayName}</div><div className="text-xs text-gray-500">{u.area}</div></div><div className="ml-auto flex gap-2"><button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="text-blue-500 font-bold text-sm hover:underline">Edit</button></div></div>)}</div></Card>}
            {activeTab === 'documents' && <AdminDocCentre />}
            {activeTab === 'applications' && <Card><div className="flex justify-between mb-4"><h3 className="font-bold text-xl">All Applications</h3><Button size="sm" onClick={() => exportToCSV(apps, 'all_apps')}>Export CSV</Button></div><div className="space-y-2">{apps.map(a => <div key={a.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50"><div><div className="font-bold">{a.projectTitle}</div><div className="text-xs text-gray-500">{a.orgName} • {a.area}</div></div><Badge>{a.status}</Badge></div>)}</div></Card>}
            {activeTab === 'settings' && <div className="grid md:grid-cols-2 gap-6"><Card><h3 className="font-bold text-xl mb-4">Lifecycle</h3><div className="space-y-4"><label className="flex items-center justify-between p-4 bg-gray-50 rounded border"><span className="font-bold">Stage 1 Open</span><input type="checkbox" checked={settings.stage1Visible} onChange={() => toggleSetting('stage1Visible')} /></label><label className="flex items-center justify-between p-4 bg-gray-50 rounded border"><span className="font-bold">Stage 2 Open</span><input type="checkbox" checked={settings.stage2Visible} onChange={() => toggleSetting('stage2Visible')} /></label><label className="flex items-center justify-between p-4 bg-gray-50 rounded border"><span className="font-bold">Voting Open</span><input type="checkbox" checked={settings.votingOpen} onChange={() => toggleSetting('votingOpen')} /></label></div></Card><Card><h3 className="font-bold text-xl mb-4">Previews</h3><div className="space-y-4"><Button className="w-full" onClick={() => setPreviewMode('stage1')}>Preview Stage 1</Button><Button className="w-full" onClick={() => setPreviewMode('stage2')}>Preview Stage 2</Button></div></Card></div>}
            {previewMode && <Modal isOpen={!!previewMode} onClose={() => setPreviewMode(null)} title="Preview"><div className="p-4 text-center bg-yellow-50 text-yellow-800 font-bold mb-4">Preview Mode</div>{previewMode === 'stage1' ? <DigitalStage1Form data={{}} onChange={()=>{}} onSubmit={e=>{e.preventDefault();}} onCancel={()=>setPreviewMode(null)} /> : <DigitalStage2Form data={{}} onChange={()=>{}} onSubmit={e=>{e.preventDefault();}} onCancel={()=>setPreviewMode(null)} />}</Modal>}
            {isUserModalOpen && <UserFormModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} user={editingUser} onSave={refresh} />}
            {currentUser && <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={currentUser} onSave={setCurrentUser} />}
        </div>
    );
};
