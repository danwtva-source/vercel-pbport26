import React, { useEffect, useState, useMemo } from 'react';
import { Application, User, Score, AREAS, Area, Role, BudgetLine, AdminDocument } from '../types';
import { SCORING_CRITERIA, MARMOT_PRINCIPLES, WFG_GOALS } from '../constants';
import { api, exportToCSV, seedDatabase } from '../services/firebase';
import { Button, Card, Input, Modal, Badge, BarChart, FileCard } from '../components/UI';

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
                    <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-4 border-purple-100 relative group">
                        <img src={data.photoUrl || `https://ui-avatars.com/api/?name=${data.displayName}&background=random`} alt="Profile" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"><span className="text-white text-xs font-bold">Change</span></div>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                </div>
                <Input label="Display Name" value={data.displayName} onChange={e => setData({...data, displayName: e.target.value})} required />
                <Input label="Role / Title" value={data.roleDescription} onChange={e => setData({...data, roleDescription: e.target.value})} />
                <Input label="Phone" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} />
                <Button type="submit" className="w-full">Save Changes</Button>
            </form>
        </Modal>
    );
};

// --- STAGE 1 FORM (Matches PB 1.1) ---
export const DigitalStage1Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: any) => onChange({ ...data, formData: { ...fd, [k]: v } });
    
    return (
        <form onSubmit={onSubmit} className="space-y-8 bg-white p-8 rounded-2xl shadow-xl max-w-4xl mx-auto">
            <div className="border-b pb-4 mb-4"><h2 className="text-3xl font-dynapuff text-brand-purple">Expression of Interest (Part 1)</h2></div>
            
            {/* 1. Area & Applicant */}
            <section className="space-y-4">
                <h3 className="font-bold text-xl border-b pb-2">1. Area & Applicant Information</h3>
                <div className="grid md:grid-cols-3 gap-2">
                    {AREAS.map(a => (
                        <label key={a} className={`border p-3 rounded-lg flex items-center gap-2 cursor-pointer ${data.area === a ? 'bg-purple-50 border-brand-purple' : ''}`}>
                            <input type="radio" name="area" checked={data.area === a} onChange={() => onChange({...data, area: a})} disabled={readOnly} /> {a}
                        </label>
                    ))}
                </div>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={fd.applyMultiArea || false} onChange={e => up('applyMultiArea', e.target.checked)} disabled={readOnly} /> Applying to multiple areas?</label>
                {fd.applyMultiArea && <textarea placeholder="Breakdown for Cross-Area Applications (Logistics & Costs)" className="w-full border p-2 rounded" value={fd.crossAreaBreakdown || ''} onChange={e => up('crossAreaBreakdown', e.target.value)} disabled={readOnly} />}
                
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Organisation Name" value={data.orgName} onChange={e => onChange({...data, orgName: e.target.value})} disabled={readOnly} />
                    <Input label="Project Title" value={data.projectTitle} onChange={e => onChange({...data, projectTitle: e.target.value})} disabled={readOnly} />
                    <Input label="Contact Name" value={data.applicantName} onChange={e => onChange({...data, applicantName: e.target.value})} disabled={readOnly} />
                    <Input label="Position / Job Title" value={fd.contactPosition || ''} onChange={e => up('contactPosition', e.target.value)} disabled={readOnly} />
                    <Input label="Email" value={fd.contactEmail || ''} onChange={e => up('contactEmail', e.target.value)} disabled={readOnly} />
                    <Input label="Phone" value={fd.contactPhone || ''} onChange={e => up('contactPhone', e.target.value)} disabled={readOnly} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    <Input label="Street" value={fd.addressStreet || ''} onChange={e => up('addressStreet', e.target.value)} disabled={readOnly} />
                    <Input label="Town/City" value={fd.addressTown || ''} onChange={e => up('addressTown', e.target.value)} disabled={readOnly} />
                    <Input label="Postcode" value={fd.addressPostcode || ''} onChange={e => up('addressPostcode', e.target.value)} disabled={readOnly} />
                </div>
                <div>
                    <label className="block font-bold text-sm mb-2">Organisation Type</label>
                    <select className="w-full p-3 border rounded-xl" value={fd.orgType || ''} onChange={e => up('orgType', e.target.value)} disabled={readOnly}>
                        <option value="">Select...</option>
                        {['Community Interest Company', 'Registered Charity', 'Voluntary Group', 'Private Business', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
            </section>

            {/* 2. Project Details */}
            <section className="space-y-4">
                <h3 className="font-bold text-xl border-b pb-2">2. Project Details</h3>
                <Input label="Main Project Theme" value={fd.projectTheme || ''} onChange={e => up('projectTheme', e.target.value)} disabled={readOnly} />
                <div className="grid md:grid-cols-3 gap-4">
                    <Input label="Start Date" type="date" value={fd.startDate || ''} onChange={e => up('startDate', e.target.value)} disabled={readOnly} />
                    <Input label="End Date" type="date" value={fd.endDate || ''} onChange={e => up('endDate', e.target.value)} disabled={readOnly} />
                    <Input label="Duration" placeholder="e.g. 6 months" value={fd.duration || ''} onChange={e => up('duration', e.target.value)} disabled={readOnly} />
                </div>
                <div>
                    <label className="block font-bold text-sm mb-2">Summary (Max 250 words)</label>
                    <textarea className="w-full p-3 border rounded-xl h-32" value={data.summary} onChange={e => onChange({...data, summary: e.target.value})} disabled={readOnly} />
                </div>
                <div>
                    <label className="block font-bold text-sm mb-2">Positive Outcomes</label>
                    <Input placeholder="Outcome 1" value={fd.outcome1 || ''} onChange={e => up('outcome1', e.target.value)} disabled={readOnly} className="mb-2" />
                    <Input placeholder="Outcome 2" value={fd.outcome2 || ''} onChange={e => up('outcome2', e.target.value)} disabled={readOnly} className="mb-2" />
                    <Input placeholder="Outcome 3" value={fd.outcome3 || ''} onChange={e => up('outcome3', e.target.value)} disabled={readOnly} />
                </div>
            </section>

            {/* 3. Budget */}
            <section className="space-y-4">
                <h3 className="font-bold text-xl border-b pb-2">3. Budget</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Total Project Cost (£)" type="number" value={data.totalCost} onChange={e => onChange({...data, totalCost: Number(e.target.value)})} disabled={readOnly} />
                    <Input label="Amount Requested (£)" type="number" value={data.amountRequested} onChange={e => onChange({...data, amountRequested: Number(e.target.value)})} disabled={readOnly} />
                </div>
                <Input label="Other Funding Sources" placeholder="Grants, donations, etc." value={fd.otherFundingSources || ''} onChange={e => up('otherFundingSources', e.target.value)} disabled={readOnly} />
            </section>

            {/* 4. Alignment */}
            <section className="space-y-4">
                <h3 className="font-bold text-xl border-b pb-2">4. Priorities & Alignment</h3>
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-bold text-brand-purple mb-2">Marmot Principles</h4>
                        {MARMOT_PRINCIPLES.map(p => (
                            <label key={p} className="flex gap-2 mb-1 text-sm"><input type="checkbox" checked={fd.marmotPrinciples?.includes(p)} onChange={e => { if(readOnly)return; const old = fd.marmotPrinciples||[]; up('marmotPrinciples', e.target.checked ? [...old,p] : old.filter(x=>x!==p)); }} />{p}</label>
                        ))}
                    </div>
                    <div>
                        <h4 className="font-bold text-brand-teal mb-2">WFG Goals</h4>
                        {WFG_GOALS.map(g => (
                            <label key={g} className="flex gap-2 mb-1 text-sm"><input type="checkbox" checked={fd.wfgGoals?.includes(g)} onChange={e => { if(readOnly)return; const old = fd.wfgGoals||[]; up('wfgGoals', e.target.checked ? [...old,g] : old.filter(x=>x!==g)); }} />{g}</label>
                        ))}
                    </div>
                </div>
            </section>
            
            {!readOnly && (
                <div className="flex gap-4 pt-6 border-t">
                    <Button type="submit" className="flex-1">Submit EOI</Button>
                    <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                </div>
            )}
        </form>
    );
};

// --- STAGE 2 FORM (Matches PB 2.1) ---
export const DigitalStage2Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: any) => onChange({ ...data, formData: { ...fd, [k]: v } });
    const budget = fd.budgetBreakdown || [];

    return (
        <form onSubmit={onSubmit} className="space-y-8 bg-white p-8 rounded-2xl shadow-xl max-w-5xl mx-auto">
            <div className="border-b pb-4 mb-4 bg-brand-darkTeal -m-8 mb-8 p-8 rounded-t-2xl text-white">
                <h2 className="text-3xl font-dynapuff">Full Application (Part 2)</h2>
                <p className="opacity-80">Detailed Delivery Plan & Budget</p>
            </div>

            <section className="space-y-4">
                <h3 className="font-bold text-xl border-b pb-2">1. Organisation & Bank Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Charity Number" value={fd.charityNumber || ''} onChange={e => up('charityNumber', e.target.value)} disabled={readOnly} />
                    <Input label="Company Number" value={fd.companyNumber || ''} onChange={e => up('companyNumber', e.target.value)} disabled={readOnly} />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border">
                    <h4 className="font-bold mb-2">Bank Details</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Input label="Account Name" value={fd.bankAccountName || ''} onChange={e => up('bankAccountName', e.target.value)} disabled={readOnly} />
                        <Input label="Sort Code" value={fd.bankSortCode || ''} onChange={e => up('bankSortCode', e.target.value)} disabled={readOnly} />
                        <Input label="Account Number" value={fd.bankAccountNumber || ''} onChange={e => up('bankAccountNumber', e.target.value)} disabled={readOnly} />
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="font-bold text-xl border-b pb-2">2. Project Delivery Plan</h3>
                <div className="space-y-4">
                    {[
                        { k: 'projectOverview', l: '2.2 Overview & SMART Objectives', h: 'Describe main purpose, beneficiaries, and specific objectives.' },
                        { k: 'activities', l: '2.3 Activities & Delivery Plan', h: 'Outline activities, milestones, and responsibilities.' },
                        { k: 'communityBenefit', l: '2.4 Community Benefit & Impact', h: 'Short and long term impacts.' },
                        { k: 'collaborations', l: '2.5 Collaborations', h: 'Partners and their roles.' },
                        { k: 'risks', l: '2.6 Risk Management', h: 'Risks and mitigations.' }
                    ].map(f => (
                        <div key={f.k}>
                            <label className="block font-bold mb-1">{f.l}</label>
                            <p className="text-xs text-gray-500 mb-2">{f.h}</p>
                            <textarea className="w-full p-3 border rounded-xl h-24" value={(fd as any)[f.k] || ''} onChange={e => up(f.k, e.target.value)} disabled={readOnly} />
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="font-bold text-xl border-b pb-2">3. Detailed Budget</h3>
                {budget.map((l, i) => (
                    <div key={i} className="flex gap-2">
                        <input className="flex-1 border p-2 rounded" placeholder="Item" value={l.item} onChange={e => { const n = [...budget]; n[i].item = e.target.value; up('budgetBreakdown', n); }} disabled={readOnly} />
                        <input className="flex-1 border p-2 rounded" placeholder="Note" value={l.note} onChange={e => { const n = [...budget]; n[i].note = e.target.value; up('budgetBreakdown', n); }} disabled={readOnly} />
                        <input className="w-24 border p-2 rounded" type="number" placeholder="£" value={l.cost} onChange={e => { const n = [...budget]; n[i].cost = Number(e.target.value); up('budgetBreakdown', n); const total = n.reduce((a,b) => a+b.cost, 0); onChange({...data, totalCost: total, amountRequested: total}); }} disabled={readOnly} />
                        {!readOnly && <button type="button" onClick={() => up('budgetBreakdown', budget.filter((_,j) => j!==i))} className="text-red-500 px-2">✕</button>}
                    </div>
                ))}
                {!readOnly && <Button type="button" variant="secondary" size="sm" onClick={() => up('budgetBreakdown', [...budget, { item: '', note: '', cost: 0 }])}>+ Add Item</Button>}
                <div className="text-right font-bold text-xl">Total: £{data.totalCost}</div>
                <textarea placeholder="Additional Budget Info / Match Funding" className="w-full border p-3 rounded mt-2" value={fd.additionalBudgetInfo || ''} onChange={e => up('additionalBudgetInfo', e.target.value)} disabled={readOnly} />
            </section>

            {!readOnly && <div className="flex gap-4 pt-6 border-t"><Button type="submit" className="flex-1 bg-brand-darkTeal">Submit Full Application</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button></div>}
        </form>
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
        setDocs([...docs, newDoc]);
    };

    const handleUpload = async () => {
        alert("In a real app, this would open a file picker and upload to Storage.");
        const name = prompt("Mock File Name:");
        if (!name) return;
        const newDoc: AdminDocument = { id: 'file_' + Date.now(), name, type: 'file', parentId: viewId, url: '#', category: 'general', uploadedBy: 'Admin', createdAt: Date.now() };
        await api.createDocument(newDoc);
        setDocs([...docs, newDoc]);
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
                        onDelete={async () => { if(confirm("Delete?")) { await api.deleteDocument(d.id); setDocs(docs.filter(x => x.id !== d.id)); }}}
                    />
                ))}
                {currentDocs.length === 0 && <div className="col-span-3 text-center text-gray-400 py-8">Empty Folder</div>}
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
        if (activeApp.id) await api.updateApplication(activeApp.id, { ...activeApp, status } as any);
        else await api.createApplication({ ...activeApp, status } as any);
        setViewMode('list');
    };

    const getStatusStep = (s: string) => {
        if(s.includes('Draft')) return 0;
        if(s.includes('Stage1')) return 1;
        if(s.includes('Stage2')) return 2;
        if(s.includes('Finalist')) return 3;
        if(s.includes('Funded')) return 4;
        return 1;
    };

    if (viewMode !== 'list') {
        const Form = viewMode === 'stage1' ? DigitalStage1Form : DigitalStage2Form;
        return <Form data={activeApp} onChange={setActiveApp} onSubmit={e => handleSubmit(e, viewMode === 'stage1'?'1':'2')} onCancel={() => setViewMode('list')} />;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-dynapuff">Welcome, {currUser.displayName}</h1>
                <Button onClick={() => setIsProfileOpen(true)} variant="outline">My Profile</Button>
            </div>

            {apps.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow border border-dashed border-gray-300">
                    <h3 className="text-xl font-bold text-gray-500 mb-4">No Applications Yet</h3>
                    <Button onClick={() => { setActiveApp({ userId: user.uid, status: 'Draft' }); setViewMode('stage1'); }}>Start New EOI</Button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {apps.map(app => (
                        <Card key={app.id}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-xl">{app.projectTitle}</h3>
                                    <p className="text-sm text-gray-500">Ref: {app.ref || 'Pending'}</p>
                                </div>
                                <div className="flex gap-2">
                                    {app.status === 'Draft' && <Button size="sm" onClick={() => { setActiveApp(app); setViewMode('stage1'); }}>Edit EOI</Button>}
                                    {app.status === 'Invited-Stage2' && <Button size="sm" onClick={() => { setActiveApp(app); setViewMode('stage2'); }}>Start Part 2</Button>}
                                </div>
                            </div>
                            {/* Timeline */}
                            <div className="relative pt-4">
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-purple transition-all duration-1000" style={{ width: `${(getStatusStep(app.status) / 4) * 100}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">
                                    <span>Draft</span>
                                    <span>EOI Sent</span>
                                    <span>Full App</span>
                                    <span>Voting</span>
                                    <span>Funded</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={currUser} onSave={setCurrUser} />
        </div>
    );
};

export const CommitteeDashboard: React.FC<{ user: User, onUpdateUser: (u:User)=>void, isAdmin?: boolean, onReturnToAdmin?: ()=>void }> = ({ user, onUpdateUser, isAdmin, onReturnToAdmin }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [team, setTeam] = useState<User[]>([]);
    const [activeTab, setActiveTab] = useState('tasks');
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        const load = async () => {
             const allApps = await api.getApplications(isAdmin ? 'All' : user.area);
             setApps(allApps.filter(a => ['Submitted-Stage1', 'Invited-Stage2', 'Submitted-Stage2'].includes(a.status)));
             if(user.area) {
                 const allUsers = await api.getUsers();
                 setTeam(allUsers.filter(u => u.role === 'committee' && u.area === user.area));
             }
        };
        load();
    }, [user.area]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                 <div>
                     <h1 className="text-3xl font-bold font-dynapuff">{user.area} Committee</h1>
                     {isAdmin && <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">Admin View</span>}
                 </div>
                 <div className="flex gap-2">
                     {isAdmin && <Button onClick={onReturnToAdmin}>Back to Admin</Button>}
                     <Button onClick={() => setIsProfileOpen(true)} variant="outline">Profile</Button>
                 </div>
            </div>

            <div className="flex gap-4 mb-6 border-b">
                {['tasks', 'team', 'documents'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 font-bold border-b-2 transition-colors capitalize ${activeTab === t ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-400'}`}>{t}</button>
                ))}
            </div>

            {activeTab === 'tasks' && (
                <div className="grid gap-4">
                    {apps.map(app => (
                        <Card key={app.id}>
                            <div className="flex justify-between items-center">
                                <div><h3 className="font-bold text-lg">{app.projectTitle}</h3><Badge>{app.status}</Badge></div>
                                <Button size="sm">Evaluate</Button>
                            </div>
                        </Card>
                    ))}
                    {apps.length === 0 && <div className="text-center text-gray-400 py-8">No active tasks.</div>}
                </div>
            )}
            
            {activeTab === 'team' && (
                <div className="grid md:grid-cols-2 gap-4">
                    {team.map(m => (
                        <div key={m.uid} className="bg-white p-4 rounded-xl shadow flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-purple text-white flex items-center justify-center font-bold">{m.displayName?.charAt(0)}</div>
                            <div><div className="font-bold">{m.displayName}</div><div className="text-xs text-gray-500">{m.email}</div></div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'documents' && (
                <Card>
                    <h3 className="font-bold mb-4">Committee Resources</h3>
                    <p className="text-gray-500 text-sm mb-4">Access terms, policies, and meeting minutes.</p>
                    <div className="grid md:grid-cols-3 gap-4">
                        <FileCard title="Terms of Reference" type="file" onClick={() => {}} />
                        <FileCard title="Meeting Minutes" type="folder" onClick={() => {}} />
                    </div>
                </Card>
            )}

            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onSave={onUpdateUser} />
        </div>
    );
};

export const AdminDashboard: React.FC<{ onNavigatePublic: (v:string)=>void, onNavigateScoring: ()=>void }> = ({ onNavigatePublic, onNavigateScoring }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState<User[]>([]);
    const [apps, setApps] = useState<Application[]>([]);
    
    useEffect(() => {
        api.getUsers().then(setUsers);
        api.getApplications('All').then(setApps);
    }, []);

    // Metrics
    const totalFunds = apps.reduce((sum, a) => sum + (a.amountRequested || 0), 0);
    const byArea = apps.reduce((acc, a) => { acc[a.area] = (acc[a.area] || 0) + 1; return acc; }, {} as Record<string, number>);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-dynapuff text-brand-purple">Admin Console</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onNavigatePublic('home')}>Public Site</Button>
                    <Button onClick={onNavigateScoring}>Score Mode</Button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm inline-flex overflow-x-auto max-w-full">
                {['overview', 'applications', 'committees', 'users', 'documents'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-lg font-bold transition-all capitalize ${activeTab === t ? 'bg-brand-purple text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>{t}</button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid gap-6">
                    <div className="grid md:grid-cols-4 gap-4">
                        <Card className="bg-purple-50 border-purple-100"><h3 className="text-purple-800 text-sm font-bold uppercase">Total Apps</h3><p className="text-3xl font-dynapuff">{apps.length}</p></Card>
                        <Card className="bg-teal-50 border-teal-100"><h3 className="text-teal-800 text-sm font-bold uppercase">Requested</h3><p className="text-3xl font-dynapuff">£{totalFunds.toLocaleString()}</p></Card>
                        <Card className="bg-blue-50 border-blue-100"><h3 className="text-blue-800 text-sm font-bold uppercase">Users</h3><p className="text-3xl font-dynapuff">{users.length}</p></Card>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <h3 className="font-bold mb-4">Applications by Area</h3>
                            <BarChart data={Object.entries(byArea).map(([k, v]) => ({ label: k.split(' ')[0], value: v }))} />
                        </Card>
                        <Card>
                            <h3 className="font-bold mb-4">Quick Actions</h3>
                            <div className="space-y-2">
                                <Button className="w-full justify-start" onClick={() => exportToCSV(apps, 'applications_export')}>📥 Export Applications to Excel</Button>
                                <Button className="w-full justify-start" variant="secondary" onClick={() => seedDatabase().then(() => alert("Reset!"))}>↻ Seed Demo Database</Button>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === 'committees' && (
                <Card>
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-xl">Committee Members</h3>
                        <Input placeholder="Filter by name..." className="w-64 mb-0" />
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr className="border-b"><th className="p-3">Name</th><th className="p-3">Area</th><th className="p-3">Role</th><th className="p-3">Status</th></tr></thead>
                        <tbody>
                            {users.filter(u => u.role === 'committee').map(u => (
                                <tr key={u.uid} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-bold">{u.displayName}</td>
                                    <td className="p-3">{u.area}</td>
                                    <td className="p-3 text-sm">{u.roleDescription || 'Member'}</td>
                                    <td className="p-3"><Badge variant="green">Active</Badge></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {activeTab === 'users' && (
                <Card>
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-xl">All Registered Users</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr className="border-b"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Actions</th></tr></thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.uid} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-bold">{u.displayName}</td>
                                    <td className="p-3 text-sm">{u.email}</td>
                                    <td className="p-3"><Badge>{u.role}</Badge></td>
                                    <td className="p-3">
                                        <button onClick={async () => { if(confirm("Delete User?")) { await api.deleteUser(u.uid); setUsers(users.filter(x=>x.uid!==u.uid)); }}} className="text-red-600 hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {activeTab === 'documents' && <AdminDocCentre />}

            {activeTab === 'applications' && (
                 <Card>
                    <div className="flex justify-between mb-4"><h3 className="font-bold text-xl">All Applications</h3><Button size="sm" onClick={() => exportToCSV(apps, 'all_apps')}>Export CSV</Button></div>
                    <div className="space-y-2">
                        {apps.map(a => (
                            <div key={a.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                                <div><div className="font-bold">{a.projectTitle}</div><div className="text-xs text-gray-500">{a.orgName} • {a.area}</div></div>
                                <Badge>{a.status}</Badge>
                            </div>
                        ))}
                    </div>
                 </Card>
            )}
        </div>
    );
};
