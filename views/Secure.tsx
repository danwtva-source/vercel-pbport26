import React, { useEffect, useState, useMemo } from 'react';
import { Application, User, Score, Vote, AREAS, Area, Role, BudgetLine, AdminDocument, PortalSettings, ScoreCriterion, Assignment, Round, ApplicationStatus, AuditLog } from '../types';
import { SCORING_CRITERIA, MARMOT_PRINCIPLES, WFG_GOALS, ORG_TYPES } from '../constants';
import { AdminRounds } from './AdminRounds';
import { api, exportToCSV, seedDatabase, auth, uploadProfileImage, deleteProfileImage, uploadFile } from '../services/firebase';
import { Button, Card, Input, Modal, Badge, BarChart, FileCard, RichTextArea, FileUpload } from '../components/UI';

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

const printApplication = (app: Application) => {
    const w = window.open('', '_blank');
    if(!w) return;
    w.document.write(`<html><head><title>${app.projectTitle}</title><style>body{font-family:sans-serif;padding:40px} .s{margin-bottom:20px;border-bottom:1px solid #eee;padding-bottom:10px} .l{font-weight:bold;color:#666}</style></head><body><h1>${app.projectTitle}</h1>${Object.entries(app.formData).map(([k,v])=>`<div class="s"><div class="l">${k}</div><div>${typeof v==='object'?JSON.stringify(v):v}</div></div>`).join('')}<script>window.print();</script></body></html>`);
    w.document.close();
};

const ProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User; onSave: (u: User) => void; }> = ({ isOpen, onClose, user, onSave }) => {
    const [data, setData] = useState({ ...user });
    const [uploading, setUploading] = useState(false);

    const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setUploading(true);
        try {
            if (data.photoUrl) await deleteProfileImage(data.photoUrl);
            const url = await uploadProfileImage(user.uid, e.target.files[0]);
            setData(p => ({ ...p, photoUrl: url }));
        } catch (err) { alert(err); } finally { setUploading(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
            <form onSubmit={e => { e.preventDefault(); api.updateUserProfile(user.uid, data).then(onSave).then(onClose); }} className="space-y-4">
                <div className="flex justify-center mb-4">
                    <div className="relative w-24 h-24 rounded-full bg-gray-200 overflow-hidden group">
                        <img src={data.photoUrl || `https://ui-avatars.com/api/?name=${data.displayName}`} className="w-full h-full object-cover" />
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 cursor-pointer">{uploading ? '...' : 'Change'}<input type="file" onChange={handleImage} className="hidden" /></label>
                    </div>
                </div>
                <Input label="Name" value={data.displayName} onChange={e => setData({...data, displayName: e.target.value})} />
                <Input label="Phone" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} />
                <Input label="Address" value={data.address} onChange={e => setData({...data, address: e.target.value})} />
                <RichTextArea label="Bio" value={data.bio} onChange={e => setData({...data, bio: e.target.value})} />
                <Button type="submit" className="w-full">Save Changes</Button>
            </form>
        </Modal>
    );
};

// --- USER MANAGEMENT MODAL ---
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
          if (user) await api.updateUser({ ...user, ...formData } as User);
          else await api.adminCreateUser(formData as User, password);
          onSave();
          onClose();
        } catch (error) { alert('Failed to save user.'); }
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

// --- DIGITAL FORMS ---

const FormHeader: React.FC<{ title: string; subtitle: string; readOnly?: boolean }> = ({ title, subtitle, readOnly }) => (
    <div className="border-b pb-6 mb-6">
        <div className="flex justify-between items-center">
            <h2 className="text-4xl font-dynapuff text-brand-purple">{title}</h2>
            {readOnly && <Badge>Read Only</Badge>}
        </div>
        <p className="text-gray-500 mt-2">{subtitle}</p>
    </div>
);

// VALIDATION HELPERS
const validateStage2 = (app: Application): string[] => {
    const errors: string[] = [];
    const fd = app.formData;
    if (!fd.bankAccountNumber || !/^\d{8}$/.test(fd.bankAccountNumber)) errors.push("Bank Account Number must be 8 digits.");
    if (!fd.bankSortCode || !/^\d{6}$/.test(fd.bankSortCode.replace(/-/g, ''))) errors.push("Sort Code must be 6 digits.");
    if (!fd.budgetBreakdown || fd.budgetBreakdown.length === 0) errors.push("At least one budget line item is required.");
    if ((app.summary?.split(' ').length || 0) > 300) errors.push("Summary exceeds 300 words.");
    return errors;
};

export const DigitalStage1Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (status: ApplicationStatus) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: any) => onChange({ ...data, formData: { ...fd, [k]: v } });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit('Submitted-Stage1');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-10 rounded-[2rem] shadow-2xl max-w-5xl mx-auto border border-gray-100">
            <FormHeader title="Expression of Interest" subtitle="Part 1 - Initial Proposal" readOnly={readOnly} />
            
            {/* 1. Basic Info */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">1. Area & Applicant</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    {AREAS.map(a => (
                        <label key={a} className={`border-2 p-4 rounded-xl flex items-center gap-3 cursor-pointer ${data.area === a ? 'bg-purple-50 border-brand-purple' : ''}`}>
                            <input type="radio" name="area" checked={data.area === a} onChange={() => onChange({...data, area: a})} disabled={readOnly} className="accent-brand-purple w-5 h-5" />
                            <span className="font-bold text-gray-700">{a}</span>
                        </label>
                    ))}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <Input label="Organisation Name" value={data.orgName} onChange={e => onChange({...data, orgName: e.target.value})} disabled={readOnly} required />
                    <Input label="Contact Name" value={data.applicantName} onChange={e => onChange({...data, applicantName: e.target.value})} disabled={readOnly} required />
                    <Input label="Email" type="email" value={fd.contactEmail} onChange={e => up('contactEmail', e.target.value)} disabled={readOnly} required />
                    <Input label="Phone" value={fd.contactPhone} onChange={e => up('contactPhone', e.target.value)} disabled={readOnly} />
                </div>
            </section>

            {/* 2. Project */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">2. Project Details</h3>
                <Input label="Project Title" value={data.projectTitle} onChange={e => onChange({...data, projectTitle: e.target.value})} disabled={readOnly} required />
                <RichTextArea label="Project Summary (Max 250 words)" maxWords={250} value={data.summary} onChange={e => onChange({...data, summary: e.target.value})} disabled={readOnly} required />
                
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-purple-50 p-6 rounded-xl">
                        <Input label="Total Cost (£)" type="number" value={data.totalCost} onChange={e => onChange({...data, totalCost: Number(e.target.value)})} disabled={readOnly} required />
                    </div>
                    <div className="bg-teal-50 p-6 rounded-xl">
                        <Input label="Amount Requested (£)" type="number" value={data.amountRequested} onChange={e => onChange({...data, amountRequested: Number(e.target.value)})} disabled={readOnly} required />
                    </div>
                </div>
            </section>

            {!readOnly && (
                <div className="flex gap-4 pt-8 border-t border-gray-100 sticky bottom-0 bg-white p-4 -mx-4 shadow-top z-10">
                    <Button type="button" variant="outline" onClick={() => onSubmit('Draft')}>Save as Draft</Button>
                    <Button type="submit" className="flex-1 text-lg py-4 shadow-xl">Submit Expression of Interest</Button>
                    <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                </div>
            )}
        </form>
    );
};

export const DigitalStage2Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (status: ApplicationStatus) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: any) => onChange({ ...data, formData: { ...fd, [k]: v } });
    const budget = fd.budgetBreakdown || [];

    const handleUpload = async (field: string, file: File) => {
        try {
            const url = await uploadFile(`applications/${data.id}/${field}_${Date.now()}_${file.name}`, file);
            up('attachments', { ...fd.attachments, [`${field}Url`]: url, [field]: true });
        } catch (e) { alert("Upload error"); }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validateStage2(data as Application);
        if (errors.length > 0) {
            alert("Please fix the following:\n" + errors.join('\n'));
            return;
        }
        if (confirm("Are you sure you want to submit? This is final.")) {
            onSubmit('Submitted-Stage2');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-10 rounded-[2rem] shadow-2xl max-w-6xl mx-auto border border-gray-100">
            <FormHeader title="Full Application (Part 2)" subtitle="Detailed Delivery Plan & Budget" readOnly={readOnly} />

            {/* Bank Details */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">1. Organisation & Bank</h3>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 grid md:grid-cols-3 gap-6">
                    <Input label="Account Name" value={fd.bankAccountName} onChange={e => up('bankAccountName', e.target.value)} disabled={readOnly} required />
                    <Input label="Sort Code (12-34-56)" value={fd.bankSortCode} onChange={e => up('bankSortCode', e.target.value)} disabled={readOnly} placeholder="000000" maxLength={8} required />
                    <Input label="Account Number" value={fd.bankAccountNumber} onChange={e => up('bankAccountNumber', e.target.value)} disabled={readOnly} placeholder="8 digits" maxLength={8} required />
                </div>
            </section>

            {/* Detailed Project */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">2. Detailed Delivery</h3>
                <RichTextArea label="SMART Objectives" value={fd.smartObjectives} onChange={e => up('smartObjectives', e.target.value)} disabled={readOnly} required />
                <RichTextArea label="Activities & Delivery Plan" value={fd.activities} onChange={e => up('activities', e.target.value)} disabled={readOnly} required />
                <RichTextArea label="Risk Management" value={fd.riskManagement} onChange={e => up('riskManagement', e.target.value)} disabled={readOnly} required />
            </section>

            {/* Justifications */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">3. Alignment Justification</h3>
                {fd.marmotPrinciples?.map(p => (
                    <div key={p} className="bg-purple-50 p-4 rounded-xl">
                        <h4 className="font-bold text-purple-900 mb-2">{p}</h4>
                        <RichTextArea value={fd.marmotJustifications?.[p] || ''} onChange={e => up('marmotJustifications', { ...fd.marmotJustifications, [p]: e.target.value })} disabled={readOnly} />
                    </div>
                ))}
            </section>

            {/* Budget */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">4. Detailed Budget</h3>
                <div className="bg-gray-50 p-6 rounded-xl space-y-3">
                    {budget.map((l, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-5"><Input placeholder="Item" value={l.item} onChange={e => { const n = [...budget]; n[i].item = e.target.value; up('budgetBreakdown', n); }} disabled={readOnly} /></div>
                            <div className="col-span-4"><Input placeholder="Note" value={l.note} onChange={e => { const n = [...budget]; n[i].note = e.target.value; up('budgetBreakdown', n); }} disabled={readOnly} /></div>
                            <div className="col-span-2"><Input type="number" placeholder="0.00" value={l.cost} onChange={e => { const n = [...budget]; n[i].cost = Number(e.target.value); up('budgetBreakdown', n); }} disabled={readOnly} /></div>
                            <div className="col-span-1">{!readOnly && <button type="button" onClick={() => up('budgetBreakdown', budget.filter((_,j) => j!==i))} className="text-red-500 font-bold">✕</button>}</div>
                        </div>
                    ))}
                    {!readOnly && <Button type="button" variant="secondary" size="sm" onClick={() => up('budgetBreakdown', [...budget, { item: '', note: '', cost: 0 }])}>+ Add Item</Button>}
                </div>
                <div className="text-right font-bold text-xl">Total: £{budget.reduce((a,b)=>a+b.cost, 0)}</div>
            </section>

            {/* Documents */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">5. Required Documents</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <FileUpload label="Constitution / Governing Doc" currentUrl={fd.attachments?.constitutionUrl} onUpload={f => handleUpload('constitution', f)} disabled={readOnly} />
                    <FileUpload label="Recent Bank Statement" currentUrl={fd.attachments?.bankStatementUrl} onUpload={f => handleUpload('bankStatement', f)} disabled={readOnly} />
                    <FileUpload label="Safeguarding Policy (Optional)" currentUrl={fd.attachments?.otherUrl} onUpload={f => handleUpload('other', f)} disabled={readOnly} />
                </div>
            </section>

            {!readOnly && (
                <div className="flex gap-4 pt-8 border-t border-gray-100 sticky bottom-0 bg-white p-4 -mx-4 shadow-top z-10">
                    <Button type="button" variant="outline" onClick={() => onSubmit('Draft')}>Save as Draft</Button>
                    <Button type="submit" className="flex-1 bg-brand-darkTeal text-lg py-4 shadow-xl">Submit Full Application</Button>
                    <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                </div>
            )}
        </form>
    );
};

// --- DASHBOARDS ---

export const ApplicantDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'stage1' | 'stage2'>('list');
    const [activeApp, setActiveApp] = useState<Partial<Application>>({});
    const [openRound, setOpenRound] = useState<Round | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(user);

    useEffect(() => {
        api.getApplications().then(all => setApps(all.filter(a => a.userId === user.uid)));
        api.getRounds().then(rs => {
            const now = new Date().toISOString().split('T')[0];
            setOpenRound(rs.find(r => r.status === 'open' && (r.areas.includes(user.area!) || r.areas.length === 0) && r.startDate <= now && r.endDate >= now) || null);
        });
    }, [user.uid]);

    const handleSave = async (status: ApplicationStatus) => {
        const toSave = { ...activeApp, status, userId: user.uid, submissionMethod: 'digital' } as Application;
        if (toSave.id) await api.updateApplication(toSave.id, toSave);
        else await api.createApplication(toSave);
        const myApps = await api.getApplications();
        setApps(myApps.filter(a => a.userId === user.uid));
        setViewMode('list');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-dynapuff">My Applications</h1>
                    <p className="text-gray-500">Welcome, {currentUser.displayName}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsProfileOpen(true)}>Edit Profile</Button>
                    <Button disabled={!openRound} onClick={() => { setActiveApp({ userId: user.uid, area: user.area || undefined, roundId: openRound?.id, formData: {} }); setViewMode('stage1'); }}>
                        {openRound ? '+ New Application' : 'Rounds Closed'}
                    </Button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="grid gap-4">
                    {apps.map(app => (
                        <Card key={app.id}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-xl">{app.projectTitle || 'Untitled Draft'}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <Badge>{app.status}</Badge>
                                        <span className="text-gray-400 text-sm">Ref: {app.ref || 'Pending'}</span>
                                    </div>
                                    {app.feedback && <div className="mt-2 text-sm bg-blue-50 text-blue-800 p-2 rounded"><strong>Feedback:</strong> {app.feedback}</div>}
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => printApplication(app)}>Print</Button>
                                    {(app.status === 'Draft' || app.status.includes('Returned')) && <Button size="sm" onClick={() => { setActiveApp(app); setViewMode('stage1'); }}>Edit</Button>}
                                    {app.status === 'Invited-Stage2' && <Button size="sm" variant="secondary" onClick={() => { setActiveApp(app); setViewMode('stage2'); }}>Start Stage 2</Button>}
                                </div>
                            </div>
                        </Card>
                    ))}
                    {apps.length === 0 && <p className="text-center text-gray-500">No applications found.</p>}
                </div>
            ) : viewMode === 'stage1' ? (
                <DigitalStage1Form data={activeApp} onChange={setActiveApp} onSubmit={handleSave} onCancel={() => setViewMode('list')} />
            ) : (
                <DigitalStage2Form data={activeApp} onChange={setActiveApp} onSubmit={handleSave} onCancel={() => setViewMode('list')} />
            )}
            
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={currentUser} onSave={setCurrentUser} />
        </div>
    );
};

export const CommitteeDashboard: React.FC<{ user: User, onUpdateUser: (u:User)=>void, isAdmin?: boolean, onReturnToAdmin?: ()=>void }> = ({ user, onUpdateUser, isAdmin, onReturnToAdmin }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [settings, setSettings] = useState<PortalSettings | null>(null);

    useEffect(() => {
        Promise.all([
            api.getApplications(), // Get ALL, then filter
            api.getVotes(),
            api.getAssignments(user.uid),
            api.getPortalSettings()
        ]).then(([allApps, allVotes, myAssigns, portalSettings]) => {
            // LOGIC: Show apps if (In My Area OR Cross-Area) OR (Explicitly Assigned to Me)
            const assignIds = myAssigns.map(a => a.applicationId);
            const filtered = isAdmin ? allApps : allApps.filter(a => 
                a.area === user.area || 
                a.area === 'Cross-Area' || 
                assignIds.includes(a.id)
            );
            setApps(filtered);
            setVotes(allVotes);
            setAssignments(myAssigns);
            setSettings(portalSettings);
        });
    }, [user.uid, user.area, isAdmin]);

    const handleVote = async (appId: string, decision: 'yes'|'no') => {
        await api.saveVote({ id: `${appId}_${user.uid}`, appId, voterId: user.uid, decision, createdAt: new Date().toISOString() });
        const v = await api.getVotes(); setVotes(v);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-dynapuff">{user.area || 'Committee'} Dashboard</h1>
                    {isAdmin && <Badge variant="warning" className="ml-2">Admin View</Badge>}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsProfileOpen(true)}>Profile</Button>
                    {isAdmin && <Button onClick={onReturnToAdmin}>Exit Scoring Mode</Button>}
                </div>
            </div>
            
            <h2 className="font-bold text-xl mb-4">Pending Reviews</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apps.map(app => {
                    const hasVoted = votes.some(v => v.appId === app.id && v.voterId === user.uid);
                    const isAssigned = assignments.some(a => a.applicationId === app.id);
                    return (
                        <Card key={app.id} className={hasVoted ? 'opacity-70' : ''}>
                            {isAssigned && <Badge variant="warning" className="mb-2">Assigned to You</Badge>}
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold">{app.projectTitle}</h3>
                                {settings && app.averageScore && (
                                    <Badge className={app.averageScore >= settings.scoringThreshold ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                        {app.averageScore}%
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">{app.orgName}</p>
                            <div className="mt-4 flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => printApplication(app)}>View</Button>
                                {!hasVoted && app.status === 'Submitted-Stage1' && (
                                    <>
                                        <Button size="sm" className="bg-green-600" onClick={() => handleVote(app.id, 'yes')}>Yes</Button>
                                        <Button size="sm" className="bg-red-600" onClick={() => handleVote(app.id, 'no')}>No</Button>
                                    </>
                                )}
                                {hasVoted && <Badge variant="success">Completed</Badge>}
                            </div>
                        </Card>
                    );
                })}
            </div>
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onSave={onUpdateUser} />
        </div>
    );
};

export const AdminDashboard: React.FC<{ onNavigatePublic: (v:string)=>void, onNavigateScoring: ()=>void }> = ({ onNavigatePublic, onNavigateScoring }) => {
    const [tab, setTab] = useState('overview');
    const [apps, setApps] = useState<Application[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [settings, setSettings] = useState<PortalSettings | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [thresholdInput, setThresholdInput] = useState(50);

    const refresh = async () => {
        const [a, l, u, s, set] = await Promise.all([
            api.getApplications(),
            api.getAuditLogs(),
            api.getUsers(),
            api.getScores(),
            api.getPortalSettings()
        ]);
        
        // Enrich apps with computed scores for the dashboard
        const enriched = a.map(app => {
            const appScores = s.filter(x => x.appId === app.id);
            const avg = appScores.length > 0 ? Math.round(appScores.reduce((sum, curr) => sum + curr.weightedTotal, 0) / appScores.length) : 0;
            return { ...app, averageScore: avg, scoreCount: appScores.length };
        });

        setApps(enriched);
        setLogs(l);
        setUsers(u);
        setScores(s);
        setSettings(set);
        if (set) setThresholdInput(set.scoringThreshold);
    };

    useEffect(() => { refresh(); }, []);

    const updateThreshold = async () => {
        if (settings) {
            await api.updatePortalSettings({ ...settings, scoringThreshold: thresholdInput });
            await api.logAction({ adminId: auth.currentUser!.uid, action: 'UPDATE_THRESHOLD', targetId: 'global', details: { from: settings.scoringThreshold, to: thresholdInput } });
            alert("Threshold updated globally.");
            refresh();
        }
    };

    const changeStatus = async (app: Application, status: ApplicationStatus) => {
        if (!confirm(`Change status to ${status}?`)) return;
        await api.updateApplication(app.id, { status });
        await api.logAction({ adminId: auth.currentUser!.uid, action: 'STATUS_CHANGE', targetId: app.id, details: { from: app.status, to: status } });
        refresh();
    };

    // Analytics Helpers
    const committeeUsers = users.filter(u => u.role === 'committee');
    const pendingReviews = apps.filter(a => a.status === 'Submitted-Stage1' || a.status === 'Submitted-Stage2').length;
    const passedApps = apps.filter(a => (a.averageScore || 0) >= (settings?.scoringThreshold || 50)).length;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-dynapuff text-brand-purple">Admin Control</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onNavigatePublic('home')}>Public View</Button>
                    <Button onClick={onNavigateScoring}>Enter Scoring Mode</Button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm inline-flex overflow-x-auto">
                {['overview', 'master', 'rounds', 'users', 'logs'].map(t => (
                  <button key={t} onClick={() => setTab(t)} className={`px-6 py-2 rounded-lg font-bold capitalize ${tab === t ? 'bg-brand-purple text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{t}</button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid md:grid-cols-4 gap-4">
                        <Card className="bg-purple-50 border-purple-200">
                            <div className="text-3xl font-bold text-brand-purple">{apps.length}</div>
                            <div className="text-xs text-purple-700 font-bold uppercase">Total Applications</div>
                        </Card>
                        <Card className="bg-orange-50 border-orange-200">
                            <div className="text-3xl font-bold text-orange-600">{pendingReviews}</div>
                            <div className="text-xs text-orange-700 font-bold uppercase">Pending Review</div>
                        </Card>
                        <Card className="bg-green-50 border-green-200">
                            <div className="text-3xl font-bold text-green-600">{passedApps}</div>
                            <div className="text-xs text-green-700 font-bold uppercase">Passed Threshold</div>
                        </Card>
                        <Card className="bg-blue-50 border-blue-200">
                            <div className="text-3xl font-bold text-blue-600">{scores.length}</div>
                            <div className="text-xs text-blue-700 font-bold uppercase">Total Scores Submitted</div>
                        </Card>
                    </div>

                    {/* Charts & Settings Row */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <h3 className="font-bold mb-4">Application Status</h3>
                            <BarChart data={[
                                { label: 'Draft', value: apps.filter(a => a.status === 'Draft').length },
                                { label: 'Submitted Stage 1', value: apps.filter(a => a.status === 'Submitted-Stage1').length },
                                { label: 'Stage 2 Invited', value: apps.filter(a => a.status === 'Invited-Stage2').length },
                                { label: 'Submitted Stage 2', value: apps.filter(a => a.status === 'Submitted-Stage2').length },
                                { label: 'Funded', value: apps.filter(a => a.status === 'Funded').length }
                            ]} />
                        </Card>
                        
                        <Card>
                            <h3 className="font-bold mb-4">Global Scoring Controls</h3>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Pass Threshold (%)</label>
                                <p className="text-xs text-gray-500 mb-3">Applications scoring below this will be flagged red in committee dashboards.</p>
                                <div className="flex gap-2">
                                    <Input type="number" value={thresholdInput} onChange={e => setThresholdInput(Number(e.target.value))} className="w-24" />
                                    <Button onClick={updateThreshold}>Update Threshold</Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Committee Activity */}
                    <Card>
                        <h3 className="font-bold mb-4">Committee Activity</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50"><tr><th className="p-2">Member</th><th className="p-2">Area</th><th className="p-2">Scores Submitted</th></tr></thead>
                                <tbody>
                                    {committeeUsers.map(u => {
                                        const count = scores.filter(s => s.scorerId === u.uid).length;
                                        return (
                                            <tr key={u.uid} className="border-b">
                                                <td className="p-2 font-bold">{u.displayName}</td>
                                                <td className="p-2">{u.area}</td>
                                                <td className="p-2"><Badge variant={count > 0 ? 'success' : 'default'}>{count} Scores</Badge></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {tab === 'master' && (
                <Card>
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-xl">Master List</h3>
                        <Button size="sm" onClick={() => exportToCSV(apps, 'master_export')}>Export CSV</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b"><tr><th>Ref</th><th>Title</th><th>Area</th><th>Score</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {apps.map(app => (
                                    <tr key={app.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-mono text-xs">{app.ref}</td>
                                        <td className="p-3 font-bold">{app.projectTitle}</td>
                                        <td className="p-3">{app.area}</td>
                                        <td className="p-3">
                                            {app.averageScore ? (
                                                <Badge className={app.averageScore >= (settings?.scoringThreshold || 50) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                                    {app.averageScore}% ({app.scoreCount})
                                                </Badge>
                                            ) : '-'}
                                        </td>
                                        <td className="p-3"><Badge>{app.status}</Badge></td>
                                        <td className="p-3">
                                            <select className="border rounded p-1 text-xs" onChange={e => { if(e.target.value) changeStatus(app, e.target.value as ApplicationStatus) }}>
                                                <option value="">Change Status...</option>
                                                <option value="Invited-Stage2">Invite Stage 2</option>
                                                <option value="Funded">Mark Funded</option>
                                                <option value="Rejected-Stage1">Reject</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                        <thead><tr className="border-b"><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Area</th><th className="p-3">Action</th></tr></thead>
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

            {tab === 'logs' && (
                <Card>
                    <h3 className="font-bold mb-4">Audit Logs</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {logs.map(l => (
                            <div key={l.id} className="text-xs p-2 border-b font-mono">
                                <span className="text-gray-400">{new Date(l.timestamp).toLocaleString()}</span> 
                                <span className="font-bold text-blue-600 mx-2">{l.action}</span>
                                <span>{l.targetId}</span>
                                {l.details && <span className="text-gray-500 ml-2">{JSON.stringify(l.details)}</span>}
                            </div>
                        ))}
                    </div>
                </Card>
            )}
            
            {isUserModalOpen && <UserFormModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} user={editingUser} onSave={refresh} />}
        </div>
    );
};
