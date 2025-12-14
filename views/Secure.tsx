import React, { useEffect, useState, useMemo } from 'react';
import { Application, User, Score, Vote, AREAS, Area, Role, BudgetLine, AdminDocument, PortalSettings, ScoreCriterion, Assignment, Round, ApplicationStatus } from '../types';
import { SCORING_CRITERIA, MARMOT_PRINCIPLES, WFG_GOALS, ORG_TYPES } from '../constants';
import { AdminRounds } from './AdminRounds';
import { api, exportToCSV, seedDatabase, auth, uploadProfileImage, deleteProfileImage } from '../services/firebase';
import { Button, Card, Input, Modal, Badge, BarChart, FileCard } from '../components/UI';

// --- SHARED COMPONENTS & HELPERS ---

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

const printApplication = (app: Application) => {
    const w = window.open('', '_blank');
    if(!w) return;
    w.document.write(`
        <html><head><title>${app.projectTitle} - Print View</title>
        <style>body{font-family:sans-serif;padding:40px;line-height:1.6} h1,h2,h3{color:#333} .section{margin-bottom:20px;border-bottom:1px solid #eee;padding-bottom:20px} .label{font-weight:bold;color:#666;font-size:0.9em} .val{margin-bottom:10px}</style>
        </head><body>
        <h1>${app.projectTitle} (${app.ref || 'Draft'})</h1>
        <div class="section"><div class="label">Organisation</div><div class="val">${app.orgName}</div></div>
        <div class="section"><div class="label">Applicant</div><div class="val">${app.applicantName}</div></div>
        <div class="section"><div class="label">Summary</div><div class="val">${app.summary}</div></div>
        <div class="section"><div class="label">Amount Requested</div><div class="val">£${app.amountRequested}</div></div>
        <h2>Detailed Responses</h2>
        ${Object.entries(app.formData).map(([k,v]) => `<div class="section"><div class="label">${k}</div><div class="val">${typeof v === 'object' ? JSON.stringify(v) : v}</div></div>`).join('')}
        <script>window.print();</script></body></html>
    `);
    w.document.close();
};

const ProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User; onSave: (u: User) => void; }> = ({ isOpen, onClose, user, onSave }) => {
    const [data, setData] = useState({ displayName: user.displayName || '', bio: user.bio || '', phone: user.phone || '', address: user.address || '', roleDescription: user.roleDescription || '', photoUrl: user.photoUrl || '' });
    const [uploadingImage, setUploadingImage] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          setUploadingImage(true);

          // Validate file type
          if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, etc.)');
            e.target.value = '';
            setUploadingImage(false);
            return;
          }

          // Validate file size (limit to 5MB for Firebase Storage)
          const maxSizeMB = 5;
          const fileSizeMB = file.size / (1024 * 1024);

          if (fileSizeMB > maxSizeMB) {
            alert(`Image is too large (${fileSizeMB.toFixed(1)}MB). Please use an image smaller than ${maxSizeMB}MB.`);
            e.target.value = '';
            setUploadingImage(false);
            return;
          }

          console.log("Uploading profile image to Firebase Storage...");

          // Delete old image if it exists and is from Firebase Storage
          if (data.photoUrl) {
            await deleteProfileImage(data.photoUrl);
          }

          // Upload to Firebase Storage
          const downloadURL = await uploadProfileImage(user.uid, file);

          // Update the data state with the new URL
          setData(prev => ({ ...prev, photoUrl: downloadURL }));

          console.log("Profile image uploaded successfully!");
        } catch (error) {
          console.error("Error uploading image:", error);
          alert(`Failed to upload image: ${(error as Error).message}`);
          e.target.value = '';
        } finally {
          setUploadingImage(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const updated = await api.updateUserProfile(user.uid, data);
            onSave(updated);
            onClose();
        } catch(error) {
            console.error('Error saving profile:', error);
            alert("Error saving profile. Please try again.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden border-4 border-purple-100 relative group shadow-inner">
                        <img src={data.photoUrl || `https://ui-avatars.com/api/?name=${data.displayName}&background=random`} alt="Profile" className="w-full h-full object-cover" />
                        {uploadingImage ? (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                              <span className="text-white text-xs font-bold">Uploading...</span>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                            <span className="text-white text-xs font-bold uppercase tracking-widest">Change</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploadingImage} />
                    </div>
                    {uploadingImage && <p className="text-sm text-gray-500 animate-pulse">Uploading to Firebase Storage...</p>}
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
const FormHeader: React.FC<{ title: string; subtitle: string; readOnly?: boolean }> = ({ title, subtitle, readOnly }) => (
    <div className="border-b pb-6 mb-6">
        <div className="flex justify-between items-center">
            <h2 className="text-4xl font-dynapuff text-brand-purple">{title}</h2>
            {readOnly && <span className="bg-gray-100 text-gray-500 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Read Only</span>}
        </div>
        <p className="text-gray-500 mt-2">{subtitle}</p>
    </div>
);

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
            <FormHeader title="Expression of Interest (Part 1)" subtitle="PB 1.1 - Please complete all sections to be considered for the next stage." readOnly={readOnly} />

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
                    <Input label="Organisation Name" value={data.orgName} onChange={e => onChange({...data, orgName: e.target.value})} disabled={readOnly} required />
                    <Input label="Position / Job Title" value={fd.contactPosition || ''} onChange={e => up('contactPosition', e.target.value)} disabled={readOnly} />
                    <Input label="Contact Name" value={data.applicantName} onChange={e => onChange({...data, applicantName: e.target.value})} disabled={readOnly} required />
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
                <Input label="Project Title" value={data.projectTitle} onChange={e => onChange({...data, projectTitle: e.target.value})} disabled={readOnly} required />
                <div>
                    <label className="block font-bold text-sm mb-2 font-dynapuff text-gray-700">Project Summary (Max 250 words)</label>
                    <textarea className="w-full p-4 border border-gray-200 rounded-xl h-40 focus:ring-4 focus:ring-purple-100 outline-none transition-all" value={data.summary} onChange={e => onChange({...data, summary: e.target.value})} disabled={readOnly} required />
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
                        <Input label="Total Project Cost (£)" type="number" value={data.totalCost} onChange={e => onChange({...data, totalCost: Number(e.target.value)})} disabled={readOnly} className="text-xl font-bold" required />
                    </div>
                    <div className="bg-teal-50 p-6 rounded-xl border border-teal-100">
                        <Input label="Amount Requested (£)" type="number" value={data.amountRequested} onChange={e => onChange({...data, amountRequested: Number(e.target.value)})} disabled={readOnly} className="text-xl font-bold" required />
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
                                    <input type="checkbox" checked={fd.marmotPrinciples?.includes(p)} onChange={e => { if(readOnly)return; const old = fd.marmotPrinciples||[]; up('marmotPrinciples', e.target.checked ? [...old,p] : old.filter(x=>x!==p)); }} className="mt-1 accent-brand-purple" disabled={readOnly} />
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
                                    <input type="checkbox" checked={fd.wfgGoals?.includes(g)} onChange={e => { if(readOnly)return; const old = fd.wfgGoals||[]; up('wfgGoals', e.target.checked ? [...old,g] : old.filter(x=>x!==g)); }} className="mt-1 accent-brand-teal" disabled={readOnly} />
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
                    <input type="checkbox" checked={fd.gdprConsent} onChange={e => up('gdprConsent', e.target.checked)} disabled={readOnly} required />
                    <span>I confirm that I have read, understood and consent to the GDPR Policy.</span>
                </label>
                <label className="flex gap-3 items-center">
                    <input type="checkbox" checked={fd.declarationTrue} onChange={e => up('declarationTrue', e.target.checked)} disabled={readOnly} required />
                    <span>I declare that the information provided is true and correct.</span>
                </label>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <Input label="Name" value={fd.declarationName || ''} onChange={e => up('declarationName', e.target.value)} disabled={readOnly} required />
                    <Input label="Typed Signature" value={fd.declarationSignature || ''} onChange={e => up('declarationSignature', e.target.value)} disabled={readOnly} required />
                    <Input label="Date" type="date" value={fd.declarationDate || ''} onChange={e => up('declarationDate', e.target.value)} disabled={readOnly} required />
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
            <FormHeader title="Full Application (Part 2)" subtitle="Detailed Delivery Plan & Justified Budget" readOnly={readOnly} />

            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">1. Organisation & Bank Details</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <Input label="Charity Number (if applicable)" value={fd.charityNumber || ''} onChange={e => up('charityNumber', e.target.value)} disabled={readOnly} />
                    <Input label="Company Number (if applicable)" value={fd.companyNumber || ''} onChange={e => up('companyNumber', e.target.value)} disabled={readOnly} />
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-bold mb-4 flex items-center gap-2">🏦 Bank Account Details</h4>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Input label="Account Name" value={fd.bankAccountName || ''} onChange={e => up('bankAccountName', e.target.value)} disabled={readOnly} required={!readOnly} />
                        <Input label="Sort Code" value={fd.bankSortCode || ''} onChange={e => up('bankSortCode', e.target.value)} disabled={readOnly} required={!readOnly} />
                        <Input label="Account Number" value={fd.bankAccountNumber || ''} onChange={e => up('bankAccountNumber', e.target.value)} disabled={readOnly} required={!readOnly} />
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
                        <textarea className="w-full p-4 border rounded-xl h-32" value={(fd as any)[f.k] || ''} onChange={e => up(f.k, e.target.value)} disabled={readOnly} required={!readOnly} />
                    </div>
                ))}
            </section>

            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">3. Alignment (Justification)</h3>
                <p className="text-gray-500 mb-4">Please explain how your project contributes to the priorities you selected in Part 1.</p>

                {fd.marmotPrinciples?.map(p => (
                    <div key={p} className="bg-purple-50 p-4 rounded-xl mb-4 border border-purple-100">
                        <h4 className="font-bold text-purple-900 mb-2">{p}</h4>
                        <textarea className="w-full p-3 border rounded-lg bg-white" placeholder="Explanation..." value={fd.marmotJustifications?.[p] || ''} onChange={e => updateJustification('marmot', p, e.target.value)} disabled={readOnly} required={!readOnly} />
                    </div>
                ))}
                {fd.wfgGoals?.map(g => (
                    <div key={g} className="bg-teal-50 p-4 rounded-xl mb-4 border border-teal-100">
                        <h4 className="font-bold text-teal-900 mb-2">{g}</h4>
                        <textarea className="w-full p-3 border rounded-lg bg-white" placeholder="Explanation..." value={fd.wfgJustifications?.[g] || ''} onChange={e => updateJustification('wfg', g, e.target.value)} disabled={readOnly} required={!readOnly} />
                    </div>
                ))}
            </section>

            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">4. Detailed Budget</h3>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-3">
                    {budget.map((l, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-5"><input className="w-full p-3 border rounded-lg" placeholder="Item Name" value={l.item} onChange={e => { const n = [...budget]; n[i].item = e.target.value; up('budgetBreakdown', n); }} disabled={readOnly} required={!readOnly} /></div>
                            <div className="col-span-4"><input className="w-full p-3 border rounded-lg" placeholder="Justification" value={l.note} onChange={e => { const n = [...budget]; n[i].note = e.target.value; up('budgetBreakdown', n); }} disabled={readOnly} /></div>
                            <div className="col-span-2"><input className="w-full p-3 border rounded-lg font-bold" type="number" placeholder="0.00" value={l.cost} onChange={e => { const n = [...budget]; n[i].cost = Number(e.target.value); up('budgetBreakdown', n); const total = n.reduce((a,b) => a+b.cost, 0); onChange({...data, totalCost: total, amountRequested: total}); }} disabled={readOnly} required={!readOnly} /></div>
                            <div className="col-span-1">{!readOnly && <button type="button" onClick={() => up('budgetBreakdown', budget.filter((_,j) => j!==i))} className="text-red-400 p-2">✕</button>}</div>
                        </div>
                    ))}
                    {!readOnly && <Button type="button" variant="secondary" size="sm" onClick={() => up('budgetBreakdown', [...budget, { item: '', note: '', cost: 0 }])}>+ Add Line</Button>}
                </div>
                <div className="text-right font-bold text-xl">Total: £{data.totalCost || 0}</div>
                <textarea className="w-full p-4 border rounded-xl" placeholder="Additional Budget Info..." value={fd.additionalBudgetInfo || ''} onChange={e => up('additionalBudgetInfo', e.target.value)} disabled={readOnly} />
            </section>

            <section className="space-y-6 pt-6 border-t">
                <h3 className="font-bold text-xl">5. Declarations</h3>
                <label className="flex gap-3"><input type="checkbox" checked={fd.consentWithdraw} onChange={e => up('consentWithdraw', e.target.checked)} disabled={readOnly} required={!readOnly} /> <span>I consent to withdrawal at discretion if necessary.</span></label>
                <label className="flex gap-3"><input type="checkbox" checked={fd.agreeGdprScrutiny} onChange={e => up('agreeGdprScrutiny', e.target.checked)} disabled={readOnly} required={!readOnly} /> <span>I agree to GDPR policy and scrutiny.</span></label>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <Input label="Name" value={fd.declarationName2 || ''} onChange={e => up('declarationName2', e.target.value)} disabled={readOnly} required={!readOnly} />
                    <Input label="Typed Signature" value={fd.declarationSignature2 || ''} onChange={e => up('declarationSignature2', e.target.value)} disabled={readOnly} required={!readOnly} />
                    <Input label="Date" type="date" value={fd.declarationDate2 || ''} onChange={e => up('declarationDate2', e.target.value)} disabled={readOnly} required={!readOnly} />
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

// --- MODALS (Voting & Scoring) ---

const VoteModal: React.FC<{ isOpen: boolean; onClose: () => void; app: Application; currentUser: User; onSubmit: (decision: 'yes' | 'no', reason: string) => void }> = ({ isOpen, onClose, app, currentUser, onSubmit }) => {
    const [reason, setReason] = useState('');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Vote: ${app.projectTitle}`}>
            <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-xl">
                    <h4 className="font-bold">Summary</h4>
                    <p className="text-sm text-gray-600">{app.summary}</p>
                    <div className="mt-2 font-bold text-brand-purple">£{app.amountRequested}</div>
                </div>
                <div>
                    <label className="block font-bold mb-2">Your Decision (Stage 1 Vote)</label>
                    <div className="flex gap-4">
                        <button type="button" onClick={() => { onSubmit('yes', reason); onClose(); }} className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 py-4 rounded-xl font-bold border border-green-200">YES (Proceed)</button>
                        <button type="button" onClick={() => { onSubmit('no', reason); onClose(); }} className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 py-4 rounded-xl font-bold border border-red-200">NO (Reject)</button>
                    </div>
                </div>
                <textarea className="w-full p-3 border rounded-xl" placeholder="Optional reasoning..." value={reason} onChange={e => setReason(e.target.value)} />
            </div>
        </Modal>
    );
};

const ScoreModal: React.FC<{ isOpen: boolean; onClose: () => void; app: Application; currentUser: User; existingScore?: Score; onSubmit: (s: Score) => void }> = ({ isOpen, onClose, app, currentUser, existingScore, onSubmit }) => {
    const [scores, setScores] = useState<Record<string, number>>(existingScore?.breakdown || {});
    const [notes, setNotes] = useState<Record<string, string>>(existingScore?.notes || {});

    const weightedTotal = useMemo(() => SCORING_CRITERIA.reduce((acc, c) => acc + ((scores[c.id]||0)/3 * c.weight), 0), [scores]);

    const handleSubmit = () => {
        onSubmit({
          id: existingScore?.id || `${app.id}_${currentUser.uid}`,
          appId: app.id,
          scorerId: currentUser.uid,
          scorerName: currentUser.displayName || 'Anonymous',
          breakdown: scores,
          notes,
          isFinal: true,
          weightedTotal: Math.round(weightedTotal),
          createdAt: new Date().toISOString()
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Score: ${app.projectTitle}`} size="xl">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {SCORING_CRITERIA.map(c => (
                    <div key={c.id} className="bg-white border p-4 rounded-xl">
                        <div className="flex justify-between font-bold mb-2">
                          <span>{c.name} ({c.weight}%)</span>
                          <span className="text-purple-600">{scores[c.id] !== undefined ? `${Math.round((scores[c.id]/3)*100)}%` : '-'}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{c.guidance}</p>
                        <div className="flex gap-2">
                          {[0,1,2,3].map(v => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setScores(p => ({...p, [c.id]: v}))}
                              className={`w-12 h-12 rounded font-bold ${scores[c.id]===v ? 'bg-brand-purple text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="w-full mt-2 p-2 border rounded text-sm"
                          placeholder="Optional notes..."
                          value={notes[c.id] || ''}
                          onChange={e => setNotes(p => ({...p, [c.id]: e.target.value}))}
                          rows={2}
                        />
                    </div>
                ))}
            </div>
            <div className="pt-4 border-t flex justify-between items-center mt-4">
                <div className="font-bold text-xl">Weighted Score: {Math.round(weightedTotal)}%</div>
                <Button onClick={handleSubmit}>Submit Score</Button>
            </div>
        </Modal>
    );
};

// --- USER FORM MODAL ---
const UserFormModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User | null; onSave: () => void; }> = ({ isOpen, onClose, user, onSave }) => {
    const [formData, setFormData] = useState<Partial<User>>({ email: '', username: '', displayName: '', role: 'applicant' });
    const [password, setPassword] = useState('');

    useEffect(() => {
      if (user) setFormData(user);
      else setFormData({ email: '', username: '', displayName: '', role: 'applicant' });
      setPassword('');
    }, [user, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          if (user) {
            await api.updateUser({ ...user, ...formData } as User);
          } else {
            await api.adminCreateUser(formData as User, password);
          }
          onSave();
          onClose();
        } catch (error) {
          console.error('Error saving user:', error);
          alert('Failed to save user. Please try again.');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Create User'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Display Name" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} required />
                <Input label="Username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!!user} required />
                <Input label="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!!user} required />
                {!user && <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">Role</label>
                        <select className="w-full p-3 border rounded-xl" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                            <option value="applicant">Applicant</option>
                            <option value="committee">Committee</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    {formData.role === 'committee' && (
                        <div>
                            <label className="block text-sm font-bold mb-2">Area</label>
                            <select className="w-full p-3 border rounded-xl" value={formData.area || ''} onChange={e => setFormData({...formData, area: e.target.value as Area})}>
                                <option value="">Select Area...</option>
                                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
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
        const newDoc: AdminDocument = {
          id: 'doc_' + Date.now(),
          name,
          type: 'folder',
          parentId: viewId,
          category: 'general',
          uploadedBy: 'Admin',
          createdAt: Date.now()
        };
        await api.createDocument(newDoc);
        setDocs(prev => [...prev, newDoc]);
    };

    const handleUpload = async () => {
        const name = prompt("Upload File (Simulator): Enter filename");
        if (!name) return;
        const newDoc: AdminDocument = {
          id: 'file_' + Date.now(),
          name,
          type: 'file',
          parentId: viewId,
          url: '#',
          category: 'general',
          uploadedBy: 'Admin',
          createdAt: Date.now()
        };
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
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCreateFolder}>+ Folder</Button>
                  <Button size="sm" onClick={handleUpload}>+ Upload File</Button>
                </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
                {currentDocs.map(d => (
                    <FileCard
                        key={d.id}
                        title={d.name}
                        type={d.type}
                        date={new Date(d.createdAt).toLocaleDateString()}
                        onClick={() => d.type === 'folder' ? setViewId(d.id) : alert("Downloading " + d.name)}
                        onDelete={async () => {
                          if(confirm("Delete?")) {
                            await api.deleteDocument(d.id);
                            setDocs(docs.filter(x => x.id !== d.id));
                          }
                        }}
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
    const [openRound, setOpenRound] = useState<Round | null>(null);
    const [hasActiveApp, setHasActiveApp] = useState(false);

    useEffect(() => {
        const load = async () => {
            const [myApps, rounds] = await Promise.all([
                api.getApplications(),
                api.getRounds()
            ]);

            const userApps = myApps.filter(a => a.userId === user.uid);
            setApps(userApps);

            // Check for an active round for this user's area
            const now = new Date().toISOString().split('T')[0];
            const active = rounds.find(r =>
                r.status === 'open' &&
                (r.areas.length === 0 || (user.area && r.areas.includes(user.area))) &&
                r.startDate <= now &&
                r.endDate >= now
            );

            setOpenRound(active || null);

            // Check if user has an active (non-final) application in this round
            if (active) {
              const activeAppInRound = userApps.find(app =>
                app.roundId === active.id &&
                !['Funded', 'Not-Funded', 'Rejected-Stage1'].includes(app.status)
              );
              setHasActiveApp(!!activeAppInRound);
            }
        };
        load();
    }, [user.uid, user.area]);

    const handleSave = async (e: React.FormEvent, stage: string) => {
        e.preventDefault();

        const status: ApplicationStatus = stage === '1' ? 'Submitted-Stage1' : 'Submitted-Stage2';
        const finalApp: Partial<Application> = {
          ...activeApp,
          status,
          userId: user.uid,
          submissionMethod: 'digital'
        };

        try {
          if (activeApp.id) {
            await api.updateApplication(activeApp.id, finalApp);
          } else {
            await api.createApplication(finalApp as Application);
          }

          // Reload applications
          const myApps = await api.getApplications();
          setApps(myApps.filter(a => a.userId === user.uid));

          setViewMode('list');
        } catch (error) {
          console.error('Error saving application:', error);
          alert('Failed to save application. Please try again.');
        }
    };

    if (viewMode !== 'list') {
        return viewMode === 'stage1'
            ? <DigitalStage1Form data={activeApp} onChange={setActiveApp} onSubmit={e => handleSave(e,'1')} onCancel={() => setViewMode('list')} />
            : <DigitalStage2Form data={activeApp} onChange={setActiveApp} onSubmit={e => handleSave(e,'2')} onCancel={() => setViewMode('list')} />;
    }

    const canStartNewApp = openRound && !hasActiveApp;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold font-dynapuff">Welcome, {currUser.displayName || 'Applicant'}</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setIsProfileOpen(true)} variant="outline">Profile</Button>
                    <Button
                        disabled={!canStartNewApp}
                        onClick={() => {
                          setActiveApp({
                            userId: user.uid,
                            status: 'Draft',
                            area: user.area || undefined,
                            roundId: openRound?.id,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            submissionMethod: 'digital',
                            formData: {}
                          });
                          setViewMode('stage1');
                        }}
                        title={!openRound ? "No active funding rounds for your area" : hasActiveApp ? "You already have an active application in this round" : "Start New Application"}
                    >
                        {canStartNewApp ? '+ New EOI' : 'Rounds Closed'}
                    </Button>
                </div>
            </div>

            {!openRound && (
              <Card className="bg-yellow-50 border-yellow-200 mb-6">
                <p className="text-yellow-800 font-bold">ℹ️ No active funding rounds are currently open for your area. Please check back later.</p>
              </Card>
            )}

            {hasActiveApp && openRound && (
              <Card className="bg-blue-50 border-blue-200 mb-6">
                <p className="text-blue-800 font-bold">ℹ️ You have an active application in progress for the current round. Complete it before starting a new one.</p>
              </Card>
            )}

            <div className="grid gap-4">
                {apps.map(app => (
                    <Card key={app.id}>
                        <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-bold text-xl">{app.projectTitle || 'Untitled'}</h3>
                              <Badge>{app.status}</Badge>
                              {app.roundId && <span className="text-xs text-gray-500 ml-2">Round: {app.roundId}</span>}
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => printApplication(app)}>Download PDF</Button>
                                {app.status === 'Draft' && <Button size="sm" onClick={() => { setActiveApp(app); setViewMode('stage1'); }}>Edit</Button>}
                                {app.status === 'Invited-Stage2' && <Button size="sm" variant="secondary" onClick={() => { setActiveApp(app); setViewMode('stage2'); }}>Start Stage 2</Button>}
                            </div>
                        </div>
                    </Card>
                ))}
                {apps.length === 0 && <p className="text-center text-gray-500 py-10">You haven't started any applications yet.</p>}
            </div>
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={currUser} onSave={setCurrUser} />
        </div>
    );
};

export const CommitteeDashboard: React.FC<{ user: User, onUpdateUser: (u:User)=>void, isAdmin?: boolean, onReturnToAdmin?: ()=>void }> = ({ user, onUpdateUser, isAdmin, onReturnToAdmin }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [voteModalOpen, setVoteModalOpen] = useState(false);
    const [scoreModalOpen, setScoreModalOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const [allApps, allVotes, allScores] = await Promise.all([
              api.getApplications(user.area || undefined),
              api.getVotes(),
              api.getScores()
            ]);

            // Filter applications by user's area (unless admin viewing)
            const filteredApps = isAdmin ? allApps : allApps.filter(a => a.area === user.area);
            setApps(filteredApps);
            setVotes(allVotes);
            setScores(allScores);
        };
        load();
    }, [user.area, isAdmin]);

    const handleVoteSubmit = async (decision: 'yes' | 'no', reason: string) => {
        if (!selectedApp) return;

        try {
          const vote: Vote = {
            id: `${selectedApp.id}_${user.uid}`,
            appId: selectedApp.id,
            voterId: user.uid,
            voterName: user.displayName || 'Anonymous',
            decision,
            reason,
            createdAt: new Date().toISOString()
          };

          await api.saveVote(vote);

          // Reload votes
          const updatedVotes = await api.getVotes();
          setVotes(updatedVotes);

          setVoteModalOpen(false);
        } catch (error) {
          console.error('Error saving vote:', error);
          alert('Failed to save vote. Please try again.');
        }
    };

    const handleScoreSubmit = async (score: Score) => {
        try {
          await api.saveScore(score);

          // Reload scores
          const updatedScores = await api.getScores();
          setScores(updatedScores);

          setScoreModalOpen(false);
        } catch (error) {
          console.error('Error saving score:', error);
          alert('Failed to save score. Please try again.');
        }
    };

    const handleAction = (app: Application) => {
        setSelectedApp(app);
        if (app.status === 'Submitted-Stage1') {
          setVoteModalOpen(true);
        } else if (['Invited-Stage2', 'Submitted-Stage2'].includes(app.status)) {
          setScoreModalOpen(true);
        }
    };

    // Separate applications by stage
    const stage1Apps = apps.filter(a => a.status === 'Submitted-Stage1');
    const stage2Apps = apps.filter(a => ['Invited-Stage2', 'Submitted-Stage2'].includes(a.status));

    // Check which apps have been voted/scored by this user
    const myVotes = votes.filter(v => v.voterId === user.uid);
    const myScores = scores.filter(s => s.scorerId === user.uid);

    // Combined task list for all applications
    const allTasks = [...stage1Apps, ...stage2Apps];
    const completedTasks = allTasks.filter(app => {
        if (app.status === 'Submitted-Stage1') {
            return myVotes.some(v => v.appId === app.id);
        } else {
            return myScores.some(s => s.appId === app.id);
        }
    });
    const progressPercent = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-dynapuff">{user.area || 'Committee'} Committee Portal</h1>
                <div className="flex gap-2">
                  {isAdmin && onReturnToAdmin && <Button onClick={onReturnToAdmin}>Back to Admin</Button>}
                  <Button onClick={() => setIsProfileOpen(true)} variant="outline">Profile</Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-[1fr,350px] gap-6">
                {/* Main Content */}
                <div>
                    {/* Stage 1: Voting */}
                    <Card className="mb-8 bg-green-50 border-green-200">
                <h2 className="font-bold text-green-900 text-xl mb-4">📋 Stage 1: Vote on Expressions of Interest</h2>
                <p className="text-sm text-green-700 mb-4">
                  Vote YES or NO on whether applications should proceed to Stage 2. You have voted on {myVotes.length} of {stage1Apps.length} applications.
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stage1Apps.map(app => {
                      const hasVoted = myVotes.some(v => v.appId === app.id);
                      return (
                        <Card key={app.id} className={hasVoted ? 'bg-white border-green-300' : 'bg-white'}>
                            {hasVoted && <Badge variant="success">Voted ✓</Badge>}
                            <h3 className="font-bold text-lg mt-2 mb-1">{app.projectTitle}</h3>
                            <p className="text-sm text-gray-500 mb-2">{app.orgName}</p>
                            <p className="text-xs text-gray-400 mb-4">£{app.amountRequested}</p>
                            <div className="flex gap-2 border-t pt-4">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        if (app.pdfUrl) {
                                            setPdfUrl(app.pdfUrl);
                                        } else {
                                            printApplication(app);
                                        }
                                    }}
                                >
                                    View
                                </Button>
                                <Button size="sm" onClick={() => handleAction(app)} disabled={hasVoted}>
                                  {hasVoted ? 'Already Voted' : 'Vote'}
                                </Button>
                            </div>
                        </Card>
                      );
                    })}
                    {stage1Apps.length === 0 && <p className="text-green-700 col-span-full">No Stage 1 applications pending.</p>}
                </div>
            </Card>

            {/* Stage 2: Scoring */}
            <Card className="bg-purple-50 border-purple-200">
                <h2 className="font-bold text-purple-900 text-xl mb-4">⭐ Stage 2: Score Full Applications</h2>
                <p className="text-sm text-purple-700 mb-4">
                  Score applications using the weighted criteria (0-100%). You have scored {myScores.length} of {stage2Apps.length} applications.
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stage2Apps.map(app => {
                      const hasScored = myScores.some(s => s.appId === app.id);
                      const myScore = myScores.find(s => s.appId === app.id);
                      return (
                        <Card key={app.id} className={hasScored ? 'bg-white border-purple-300' : 'bg-white'}>
                            {hasScored && <Badge variant="info">Scored ✓</Badge>}
                            {myScore && <span className="text-xs text-purple-600 ml-2">Your Score: {myScore.weightedTotal}%</span>}
                            <h3 className="font-bold text-lg mt-2 mb-1">{app.projectTitle}</h3>
                            <p className="text-sm text-gray-500 mb-2">{app.orgName}</p>
                            <p className="text-xs text-gray-400 mb-4">£{app.amountRequested}</p>
                            <div className="flex gap-2 border-t pt-4">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        // Use stage2PdfUrl for Stage 2 applications, fall back to pdfUrl or printApplication
                                        const pdfToShow = app.stage2PdfUrl || app.pdfUrl;
                                        if (pdfToShow) {
                                            setPdfUrl(pdfToShow);
                                        } else {
                                            printApplication(app);
                                        }
                                    }}
                                >
                                    View
                                </Button>
                                <Button size="sm" onClick={() => handleAction(app)}>
                                  {hasScored ? 'Edit Score' : 'Score'}
                                </Button>
                            </div>
                        </Card>
                      );
                    })}
                    {stage2Apps.length === 0 && <p className="text-purple-700 col-span-full">No Stage 2 applications pending.</p>}
                </div>
            </Card>
                </div>

                {/* Task List Sidebar */}
                <div className="lg:sticky lg:top-24 lg:self-start">
                    <Card className="bg-white shadow-lg">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 font-dynapuff">My Review Tasks</h3>

                        {allTasks.length === 0 ? (
                            <p className="text-gray-500 text-sm">No applications assigned to your area.</p>
                        ) : (
                            <>
                                {/* Task List */}
                                <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
                                    {allTasks.map(app => {
                                        const isStage1 = app.status === 'Submitted-Stage1';
                                        const isCompleted = isStage1
                                            ? myVotes.some(v => v.appId === app.id)
                                            : myScores.some(s => s.appId === app.id);

                                        let statusBadge;
                                        if (isCompleted) {
                                            statusBadge = <span className="text-xs font-bold text-teal-600 bg-teal-100 px-2 py-1 rounded-full">Completed</span>;
                                        } else {
                                            statusBadge = <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">Pending</span>;
                                        }

                                        return (
                                            <button
                                                key={app.id}
                                                onClick={() => handleAction(app)}
                                                className="w-full text-left p-3 rounded-md bg-gray-50 hover:bg-purple-50 hover:border-purple-200 border border-gray-200 transition-colors"
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-800 truncate">{app.projectTitle}</p>
                                                        <p className="text-xs text-gray-500">{app.orgName}</p>
                                                        <p className="text-xs text-purple-600 mt-1">{isStage1 ? 'Stage 1: Vote' : 'Stage 2: Score'}</p>
                                                    </div>
                                                    {statusBadge}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Progress Summary */}
                                <div className="pt-4 border-t">
                                    {progressPercent === 100 && allTasks.length > 0 ? (
                                        <div className="text-center p-4 bg-teal-100 text-teal-800 rounded-lg font-bold text-sm">
                                            🎉 All applications reviewed!
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm font-semibold text-gray-700 mb-2">
                                                {completedTasks.length} of {allTasks.length} applications reviewed
                                            </p>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className="bg-teal-600 h-2.5 rounded-full transition-all duration-300"
                                                    style={{ width: `${progressPercent}%` }}
                                                ></div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </Card>
                </div>
            </div>

            {selectedApp && voteModalOpen && (
              <VoteModal
                isOpen={voteModalOpen}
                onClose={() => setVoteModalOpen(false)}
                app={selectedApp}
                currentUser={user}
                onSubmit={handleVoteSubmit}
              />
            )}

            {selectedApp && scoreModalOpen && (
              <ScoreModal
                isOpen={scoreModalOpen}
                onClose={() => setScoreModalOpen(false)}
                app={selectedApp}
                currentUser={user}
                existingScore={myScores.find(s => s.appId === selectedApp.id)}
                onSubmit={handleScoreSubmit}
              />
            )}

            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onSave={onUpdateUser} />

            {pdfUrl && <PDFViewer url={pdfUrl} onClose={() => setPdfUrl(null)} />}
        </div>
    );
};

export const AdminDashboard: React.FC<{ onNavigatePublic: (v:string)=>void, onNavigateScoring: ()=>void }> = ({ onNavigatePublic, onNavigateScoring }) => {
    const [tab, setTab] = useState('master');
    const [apps, setApps] = useState<Application[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [filterArea, setFilterArea] = useState<string>('All');
    const [filterRound, setFilterRound] = useState<string>('All');

    const refresh = async () => {
        const [a, u, v, s, r] = await Promise.all([
          api.getApplications('All'),
          api.getUsers(),
          api.getVotes(),
          api.getScores(),
          api.getRounds()
        ]);

        // Enrich apps with computed data for the Master Table
        const enriched = a.map(app => {
            const appVotes = v.filter(x => x.appId === app.id);
            const appScores = s.filter(x => x.appId === app.id);

            const yesVotes = appVotes.filter(x => x.decision === 'yes').length;
            const noVotes = appVotes.filter(x => x.decision === 'no').length;
            const totalVotes = yesVotes + noVotes;
            const yesPercent = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;

            const avgScore = appScores.length > 0
              ? Math.round(appScores.reduce((acc, curr) => acc + curr.weightedTotal, 0) / appScores.length)
              : 0;

            return {
                ...app,
                voteCountYes: yesVotes,
                voteCountNo: noVotes,
                yesPercent,
                scoreCount: appScores.length,
                averageScore: avgScore
            };
        });

        setApps(enriched);
        setUsers(u);
        setVotes(v);
        setScores(s);
        setRounds(r);
    };

    useEffect(() => { refresh(); }, []);

    const changeStatus = async (appId: string, newStatus: ApplicationStatus) => {
        if(confirm(`Change status to ${newStatus}?`)) {
            try {
              await api.updateApplication(appId, { status: newStatus });

              // Log the action using the new logAction signature
              if (auth.currentUser) {
                  await api.logAction({
                    adminId: auth.currentUser.uid,
                    action: 'APP_STATUS_CHANGE',
                    targetId: appId,
                    details: { newStatus, timestamp: Date.now() }
                  });
              }

              refresh();
            } catch (error) {
              console.error('Error changing status:', error);
              alert('Failed to change status. Please try again.');
            }
        }
    };

    // Filter applications
    const filteredApps = apps.filter(app => {
      if (filterArea !== 'All' && app.area !== filterArea) return false;
      if (filterRound !== 'All' && app.roundId !== filterRound) return false;
      return true;
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-dynapuff text-brand-purple">Admin Control Centre</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onNavigatePublic('home')}>View Public Site</Button>
                    <Button onClick={onNavigateScoring}>Enter Scoring Mode</Button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm inline-flex">
                {['master', 'rounds', 'users', 'documents'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-6 py-2 rounded-lg font-bold capitalize ${tab === t ? 'bg-brand-purple text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {t}
                  </button>
                ))}
            </div>

            {tab === 'master' && (
                <Card>
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-xl">Master Application List</h3>
                        <div className="flex gap-2">
                          <select
                            className="border rounded px-3 py-1 text-sm"
                            value={filterArea}
                            onChange={e => setFilterArea(e.target.value)}
                          >
                            <option value="All">All Areas</option>
                            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                          <select
                            className="border rounded px-3 py-1 text-sm"
                            value={filterRound}
                            onChange={e => setFilterRound(e.target.value)}
                          >
                            <option value="All">All Rounds</option>
                            {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                          <Button size="sm" onClick={() => exportToCSV(filteredApps, 'master_export')}>Export CSV</Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3">Ref</th>
                                    <th className="p-3">Project Title</th>
                                    <th className="p-3">Org</th>
                                    <th className="p-3">Area</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Votes (Stage 1)</th>
                                    <th className="p-3">Score (Stage 2)</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredApps.map(app => (
                                    <tr key={app.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-mono text-xs">{app.ref}</td>
                                        <td className="p-3 font-bold">{app.projectTitle}</td>
                                        <td className="p-3">{app.orgName}</td>
                                        <td className="p-3">{app.area}</td>
                                        <td className="p-3"><Badge>{app.status}</Badge></td>
                                        <td className="p-3">
                                            <div className="flex flex-col gap-1">
                                              <span className="text-green-600 font-bold">Yes: {app.voteCountYes}</span>
                                              <span className="text-red-600 font-bold">No: {app.voteCountNo}</span>
                                              <span className="text-xs text-gray-500">{(app as any).yesPercent}% Yes</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-col">
                                              <span className="font-bold">{app.averageScore ? `${app.averageScore}%` : '-'}</span>
                                              <span className="text-xs text-gray-500">{(app as any).scoreCount || 0} scores</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <select
                                              className="border rounded p-1 text-xs"
                                              onChange={(e) => {
                                                if (e.target.value) {
                                                  changeStatus(app.id, e.target.value as ApplicationStatus);
                                                  e.target.value = '';
                                                }
                                              }}
                                              value=""
                                            >
                                                <option value="">Change Status...</option>
                                                <option value="Invited-Stage2">Invite Stage 2</option>
                                                <option value="Rejected-Stage1">Reject Stage 1</option>
                                                <option value="Funded">Mark Funded</option>
                                                <option value="Not-Funded">Mark Not Funded</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredApps.length === 0 && (
                      <p className="text-center text-gray-500 py-10">No applications match the current filters.</p>
                    )}
                </Card>
            )}

            {tab === 'rounds' && <AdminRounds />}

            {tab === 'users' && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl">User Management</h3>
                        <Button size="sm" onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}>+ New User</Button>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                          <tr className="border-b">
                            <th className="p-3">Name</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Area</th>
                            <th className="p-3">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.uid} className="border-b">
                                    <td className="p-3">{u.displayName || u.email}</td>
                                    <td className="p-3"><Badge>{u.role}</Badge></td>
                                    <td className="p-3">{u.area || '-'}</td>
                                    <td className="p-3">
                                        <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="text-blue-600 hover:underline mr-2">Edit</button>
                                        <button onClick={async () => { if(confirm("Delete?")) { await api.deleteUser(u.uid); refresh(); } }} className="text-red-600 hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {tab === 'documents' && <AdminDocCentre />}

            {isUserModalOpen && (
              <UserFormModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                user={editingUser}
                onSave={refresh}
              />
            )}
        </div>
    );
};
