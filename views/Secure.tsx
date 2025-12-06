import React, { useEffect, useState, useMemo } from 'react';
import { Application, User, Score, AREAS, Area, Role, BudgetLine, AdminDocument, PortalSettings, ScoreCriterion } from '../types';
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

// --- USER FORM MODAL (Restored) ---
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
                <select className="w-full p-2 border rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                    <option value="applicant">Applicant</option><option value="committee">Committee</option><option value="admin">Admin</option>
                </select>
                {formData.role === 'committee' && <select className="w-full p-2 border rounded" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value as any})}><option>Select Area...</option>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select>}
                <Button type="submit" className="w-full">Save</Button>
            </form>
        </Modal>
    );
};

// --- SCORE MODAL (Restored) ---
const ScoreModal: React.FC<{ isOpen: boolean; onClose: () => void; app: Application; currentUser: User; existingScore?: Score; onSubmit: (s: Score) => void; }> = ({ isOpen, onClose, app, currentUser, existingScore, onSubmit }) => {
    const [scores, setScores] = useState<Record<string, number>>(existingScore?.scores || {});
    const [notes, setNotes] = useState<Record<string, string>>(existingScore?.notes || {});
    const total = useMemo(() => SCORING_CRITERIA.reduce((sum, c) => sum + (scores[c.id] || 0), 0), [scores]);
    const handleSubmit = () => { onSubmit({ appId: app.id, scorerId: currentUser.uid, scorerName: currentUser.displayName || 'Member', scores, notes, isFinal: true, total, timestamp: Date.now() }); onClose(); };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Score: ${app.projectTitle}`} size="xl">
            <div className="space-y-6">
                {SCORING_CRITERIA.map(c => (
                    <div key={c.id} className="bg-gray-50 p-4 rounded-xl border">
                        <div className="flex justify-between items-center mb-2"><h4 className="font-bold">{c.name} ({c.weight}%)</h4><div className="flex gap-1">{[0,1,2,3].map(v => <button key={v} onClick={() => setScores(p => ({...p, [c.id]: v}))} className={`w-8 h-8 rounded ${scores[c.id]===v ? 'bg-brand-purple text-white' : 'bg-white border'}`}>{v}</button>)}</div></div>
                        <p className="text-sm text-gray-600 mb-2">{c.guidance}</p>
                        <input className="w-full p-2 border rounded text-sm" placeholder="Comments..." value={notes[c.id]||''} onChange={e=>setNotes(p=>({...p, [c.id]:e.target.value}))} />
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center"><div className="font-bold text-xl">Total: {total}/30</div><Button onClick={handleSubmit}>Submit Score</Button></div>
        </Modal>
    );
};

// --- FORMS (Stage 1 & 2) ---
export const DigitalStage1Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: any) => onChange({ ...data, formData: { ...fd, [k]: v } });
    return (
        <form onSubmit={onSubmit} className="space-y-8 bg-white p-8 rounded-2xl shadow-xl max-w-4xl mx-auto">
            <div className="border-b pb-4 mb-4"><h2 className="text-3xl font-dynapuff text-brand-purple">Expression of Interest (Part 1)</h2></div>
            <section className="space-y-4">
                <h3 className="font-bold text-xl border-b pb-2">1. Area & Applicant</h3>
                <div className="grid md:grid-cols-3 gap-2">{AREAS.map(a => <label key={a} className={`border p-3 rounded-lg flex items-center gap-2 cursor-pointer ${data.area === a ? 'bg-purple-50 border-brand-purple' : ''}`}><input type="radio" name="area" checked={data.area === a} onChange={() => onChange({...data, area: a})} disabled={readOnly} /> {a}</label>)}</div>
                <div className="grid md:grid-cols-2 gap-4"><Input label="Project Title" value={data.projectTitle} onChange={e => onChange({...data, projectTitle: e.target.value})} disabled={readOnly} /><Input label="Organisation Name" value={data.orgName} onChange={e => onChange({...data, orgName: e.target.value})} disabled={readOnly} /><Input label="Contact Name" value={data.applicantName} onChange={e => onChange({...data, applicantName: e.target.value})} disabled={readOnly} /><Input label="Email" value={fd.contactEmail || ''} onChange={e => up('contactEmail', e.target.value)} disabled={readOnly} /></div>
            </section>
            <section className="space-y-4"><h3 className="font-bold text-xl border-b pb-2">2. Details</h3><Input label="Summary" value={data.summary} onChange={e => onChange({...data, summary: e.target.value})} disabled={readOnly} /><div className="grid md:grid-cols-2 gap-4"><Input label="Total Cost" type="number" value={data.totalCost} onChange={e => onChange({...data, totalCost: Number(e.target.value)})} disabled={readOnly} /><Input label="Requested" type="number" value={data.amountRequested} onChange={e => onChange({...data, amountRequested: Number(e.target.value)})} disabled={readOnly} /></div></section>
            <section className="space-y-4"><h3 className="font-bold text-xl border-b pb-2">3. Alignment</h3><div className="grid md:grid-cols-2 gap-8"><div><h4 className="font-bold text-brand-purple mb-2">Marmot Principles</h4>{MARMOT_PRINCIPLES.map(p => <label key={p} className="flex gap-2 mb-1 text-sm"><input type="checkbox" checked={fd.marmotPrinciples?.includes(p)} onChange={e => { if(readOnly)return; const old = fd.marmotPrinciples||[]; up('marmotPrinciples', e.target.checked ? [...old,p] : old.filter(x=>x!==p)); }} />{p}</label>)}</div><div><h4 className="font-bold text-brand-teal mb-2">WFG Goals</h4>{WFG_GOALS.map(g => <label key={g} className="flex gap-2 mb-1 text-sm"><input type="checkbox" checked={fd.wfgGoals?.includes(g)} onChange={e => { if(readOnly)return; const old = fd.wfgGoals||[]; up('wfgGoals', e.target.checked ? [...old,g] : old.filter(x=>x!==g)); }} />{g}</label>)}</div></div></section>
            {!readOnly && <div className="flex gap-4 pt-6 border-t"><Button type="submit" className="flex-1">Submit EOI</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button></div>}
        </form>
    );
};

export const DigitalStage2Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: any) => onChange({ ...data, formData: { ...fd, [k]: v } });
    const budget = fd.budgetBreakdown || [];
    return (
        <form onSubmit={onSubmit} className="space-y-8 bg-white p-8 rounded-2xl shadow-xl max-w-5xl mx-auto">
            <div className="border-b pb-4 mb-4 bg-brand-darkTeal -m-8 mb-8 p-8 rounded-t-2xl text-white"><h2 className="text-3xl font-dynapuff">Full Application (Part 2)</h2></div>
            <section className="space-y-4"><h3 className="font-bold text-xl border-b pb-2">1. Organisation</h3><div className="grid md:grid-cols-2 gap-4"><Input label="Charity No." value={fd.charityNumber} onChange={e => up('charityNumber', e.target.value)} disabled={readOnly} /><Input label="Company No." value={fd.companyNumber} onChange={e => up('companyNumber', e.target.value)} disabled={readOnly} /></div></section>
            <section className="space-y-4"><h3 className="font-bold text-xl border-b pb-2">2. Delivery Plan</h3><Input label="Overview & Objectives" value={fd.projectOverview} onChange={e => up('projectOverview', e.target.value)} disabled={readOnly} /><Input label="Activities" value={fd.activities} onChange={e => up('activities', e.target.value)} disabled={readOnly} /></section>
            <section className="space-y-4"><h3 className="font-bold text-xl border-b pb-2">3. Budget</h3>{budget.map((l, i) => <div key={i} className="flex gap-2"><input className="flex-1 border p-2" value={l.item} onChange={e => { const n=[...budget]; n[i].item=e.target.value; up('budgetBreakdown', n); }} /><input className="w-24 border p-2" type="number" value={l.cost} onChange={e => { const n=[...budget]; n[i].cost=Number(e.target.value); up('budgetBreakdown', n); const total=n.reduce((a,b)=>a+b.cost,0); onChange({...data, totalCost: total, amountRequested: total}); }} /></div>)}{!readOnly && <Button type="button" size="sm" onClick={() => up('budgetBreakdown', [...budget, {item:'', note:'', cost:0}])}>+ Add Item</Button>}<div className="text-right font-bold text-xl">Total: £{data.totalCost}</div></section>
            {!readOnly && <div className="flex gap-4 pt-6 border-t"><Button type="submit" className="flex-1 bg-brand-darkTeal">Submit Full App</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button></div>}
        </form>
    );
};

// --- COMMITTEE DASHBOARD (Fixed Evaluate Button) ---
export const CommitteeDashboard: React.FC<{ user: User, onUpdateUser: (u:User)=>void, isAdmin?: boolean, onReturnToAdmin?: ()=>void }> = ({ user, onUpdateUser, isAdmin, onReturnToAdmin }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        const load = async () => {
             const allApps = await api.getApplications(isAdmin ? 'All' : user.area);
             setApps(allApps.filter(a => ['Submitted-Stage1', 'Invited-Stage2', 'Submitted-Stage2'].includes(a.status)));
        };
        load();
    }, [user.area]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                 <h1 className="text-3xl font-bold font-dynapuff">{user.area || 'All Areas'} Committee {isAdmin && '(Admin View)'}</h1>
                 <div className="flex gap-2">{isAdmin && <Button onClick={onReturnToAdmin}>Back</Button>}<Button onClick={() => setIsProfileOpen(true)} variant="outline">Profile</Button></div>
            </div>
            <div className="grid gap-4">
                {apps.map(app => (
                    <Card key={app.id}>
                        <div className="flex justify-between items-center">
                            <div><h3 className="font-bold text-lg">{app.projectTitle}</h3><Badge>{app.status}</Badge></div>
                            <Button size="sm" onClick={() => setSelectedApp(app)}>Evaluate</Button>
                        </div>
                    </Card>
                ))}
            </div>
            {selectedApp && <ScoreModal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} app={selectedApp} currentUser={user} onSubmit={async (s) => { await api.saveScore(s); setSelectedApp(null); }} />}
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onSave={onUpdateUser} />
        </div>
    );
};

// --- ADMIN DASHBOARD (Fixed Users & Profile) ---
export const AdminDashboard: React.FC<{ onNavigatePublic: (v:string)=>void, onNavigateScoring: ()=>void }> = ({ onNavigatePublic, onNavigateScoring }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState<User[]>([]);
    const [apps, setApps] = useState<Application[]>([]);
    const [settings, setSettings] = useState<PortalSettings>({ stage1Visible: true, stage2Visible: false, votingOpen: false });
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [previewMode, setPreviewMode] = useState<'stage1' | 'stage2' | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null); // For Admin Profile
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        api.getUsers().then(u => { setUsers(u); const me = u.find(x => x.role === 'admin'); if(me) setCurrentUser(me); });
        api.getApplications('All').then(setApps);
        api.getPortalSettings().then(setSettings);
    }, []);

    const toggleSetting = async (key: keyof PortalSettings) => { const newS = { ...settings, [key]: !settings[key] }; await api.updatePortalSettings(newS); setSettings(newS); };
    const refresh = () => api.getUsers().then(setUsers);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-dynapuff text-brand-purple">Admin Console</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onNavigatePublic('home')}>Public Site</Button>
                    <Button onClick={onNavigateScoring}>Score Mode</Button>
                    <Button onClick={() => setIsProfileOpen(true)}>My Profile</Button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm inline-flex overflow-x-auto max-w-full">
                {['overview', 'applications', 'users', 'settings'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-lg font-bold transition-all capitalize ${activeTab === t ? 'bg-brand-purple text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>{t}</button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid gap-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="bg-purple-50"><h3 className="text-purple-800 text-sm font-bold uppercase">Apps</h3><p className="text-3xl font-dynapuff">{apps.length}</p></Card>
                        <Card className="bg-teal-50"><h3 className="text-teal-800 text-sm font-bold uppercase">Users</h3><p className="text-3xl font-dynapuff">{users.length}</p></Card>
                        <Card className="bg-blue-50"><h3 className="text-blue-800 text-sm font-bold uppercase">Stage</h3><p className="text-xl font-bold">{settings.stage1Visible ? 'Stage 1 Open' : 'Closed'}</p></Card>
                    </div>
                    <Card><h3 className="font-bold mb-4">Quick Actions</h3><div className="space-y-2"><Button className="w-full justify-start" onClick={() => exportToCSV(apps, 'apps')}>📥 Export CSV</Button><Button className="w-full justify-start" variant="secondary" onClick={() => seedDatabase().then(() => alert("Reset!"))}>↻ Seed Demo DB</Button></div></Card>
                </div>
            )}

            {activeTab === 'users' && (
                <Card>
                    <div className="flex justify-between mb-4"><h3 className="font-bold text-xl">Users</h3><Button size="sm" onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}>+ User</Button></div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50"><tr className="border-b"><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Actions</th></tr></thead>
                        <tbody>{users.map(u => <tr key={u.uid} className="border-b"><td className="p-3">{u.displayName}</td><td className="p-3"><Badge>{u.role}</Badge></td><td className="p-3"><button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="text-blue-600 mr-2">Edit</button><button onClick={async () => { if(confirm("Delete?")) { await api.deleteUser(u.uid); refresh(); }}} className="text-red-600">Delete</button></td></tr>)}</tbody>
                    </table>
                </Card>
            )}

            {activeTab === 'settings' && (
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="font-bold text-xl mb-4">Lifecycle</h3>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 bg-gray-50 rounded border"><span className="font-bold">Stage 1 Open</span><input type="checkbox" checked={settings.stage1Visible} onChange={() => toggleSetting('stage1Visible')} /></label>
                            <label className="flex items-center justify-between p-4 bg-gray-50 rounded border"><span className="font-bold">Stage 2 Open</span><input type="checkbox" checked={settings.stage2Visible} onChange={() => toggleSetting('stage2Visible')} /></label>
                            <label className="flex items-center justify-between p-4 bg-gray-50 rounded border"><span className="font-bold">Voting Open</span><input type="checkbox" checked={settings.votingOpen} onChange={() => toggleSetting('votingOpen')} /></label>
                        </div>
                    </Card>
                    <Card>
                        <h3 className="font-bold text-xl mb-4">Previews</h3>
                        <div className="space-y-4"><Button className="w-full" onClick={() => setPreviewMode('stage1')}>Preview Stage 1</Button><Button className="w-full" onClick={() => setPreviewMode('stage2')}>Preview Stage 2</Button></div>
                    </Card>
                </div>
            )}

            {previewMode && <Modal isOpen={!!previewMode} onClose={() => setPreviewMode(null)} title="Preview"><div className="p-4 text-center bg-yellow-50 text-yellow-800 font-bold mb-4">Preview Mode</div>{previewMode === 'stage1' ? <DigitalStage1Form data={{}} onChange={()=>{}} onSubmit={e=>{e.preventDefault();}} onCancel={()=>setPreviewMode(null)} /> : <DigitalStage2Form data={{}} onChange={()=>{}} onSubmit={e=>{e.preventDefault();}} onCancel={()=>setPreviewMode(null)} />}</Modal>}
            {isUserModalOpen && <UserFormModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} user={editingUser} onSave={refresh} />}
            {currentUser && <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={currentUser} onSave={setCurrentUser} />}
        </div>
    );
};

// --- APPLICANT DASHBOARD (Preserved) ---
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
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8"><h1 className="text-3xl font-bold font-dynapuff">My Dashboard</h1><Button onClick={() => setIsProfileOpen(true)} variant="outline">Profile</Button></div>
            <Card>
                <div className="flex justify-between mb-4"><h2 className="font-bold text-xl">My Applications</h2><Button onClick={() => { setActiveApp({ userId: user.uid, status: 'Draft' }); setViewMode('stage1'); }}>Start New EOI</Button></div>
                {apps.length === 0 ? <p className="text-gray-500 py-8 text-center">No applications yet.</p> : apps.map(app => <div key={app.id} className="border p-4 rounded-xl mb-4 flex justify-between items-center"><div><div className="font-bold text-lg">{app.projectTitle}</div><Badge>{app.status}</Badge></div><div className="flex gap-2">{app.status === 'Draft' && <Button size="sm" onClick={() => { setActiveApp(app); setViewMode('stage1'); }}>Edit</Button>}{app.status === 'Invited-Stage2' && <Button size="sm" variant="secondary" onClick={() => { setActiveApp(app); setViewMode('stage2'); }}>Start Stage 2</Button>}</div></div>)}
            </Card>
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={currUser} onSave={setCurrUser} />
        </div>
    );
};
