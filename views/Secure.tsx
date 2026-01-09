import React, { useEffect, useState, useMemo } from 'react';
import { Application, User, Score, Vote, AREAS, Area, Role, BudgetLine, DocumentItem, PortalSettings, ScoreCriterion, Assignment, Round, ApplicationStatus, AuditLog } from '../types';
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

const ScoringModal: React.FC<{ isOpen: boolean; onClose: () => void; app: Application; user: User; onSave: () => void; }> = ({ isOpen, onClose, app, user, onSave }) => {
    const [breakdown, setBreakdown] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});

    const calculateTotals = () => {
        let rawTotal = 0;
        let weightedSum = 0;

        SCORING_CRITERIA.forEach(c => {
            const score = breakdown[c.id] || 0;
            rawTotal += score;
            const normalizedScore = score / 3;
            weightedSum += normalizedScore * c.weight;
        });

        const weightedTotal = Math.round(weightedSum);
        return { rawTotal, weightedTotal };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { weightedTotal } = calculateTotals();

        const newScore: Score = {
            id: `${app.id}_${user.uid}`,
            appId: app.id,
            applicationId: app.id,
            scorerId: user.uid,
            committeeId: user.uid,
            scorerName: user.displayName,
            weightedTotal,
            breakdown,
            criterionScores: breakdown,
            notes,
            isFinal: true,
            createdAt: new Date().toISOString()
        };

        await api.saveScore(newScore);
        onSave();
        onClose();
    };

    const { rawTotal, weightedTotal } = calculateTotals();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Score: ${app.projectTitle}`} size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm">
                    <p className="font-bold mb-1">Scoring Instructions:</p>
                    <p>Score each criterion from 0-3 (0 = Not met, 1 = Partially met, 2 = Well met, 3 = Excellently met)</p>
                    <p className="mt-2">Raw Total: <span className="font-bold">{rawTotal}/30</span> | Weighted Total: <span className="font-bold">{weightedTotal}/100</span></p>
                </div>
                
                {SCORING_CRITERIA.map(criterion => (
                    <div key={criterion.id} className="border-b pb-4">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h4 className="font-bold text-gray-800">{criterion.name}</h4>
                                <p className="text-xs text-gray-500">{criterion.details}</p>
                            </div>
                            <Badge>Weight: {criterion.weight}x</Badge>
                        </div>
                        <div className="flex gap-4 items-center">
                            <input
                                type="range" min="0" max="3" step="1"
                                value={breakdown[criterion.id] || 0}
                                onChange={e => setBreakdown({ ...breakdown, [criterion.id]: Number(e.target.value) })}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-purple"
                            />
                            <div className="w-16 font-bold text-xl text-center">{breakdown[criterion.id] || 0}/3</div>
                        </div>
                        <textarea 
                            placeholder="Optional comments..."
                            className="w-full mt-2 p-2 text-sm border rounded-lg"
                            value={notes[criterion.id] || ''}
                            onChange={e => setNotes({ ...notes, [criterion.id]: e.target.value })}
                        />
                    </div>
                ))}
                
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button type="submit">Submit Score</Button>
                </div>
            </form>
        </Modal>
    );
};

const AdminDocCentre: React.FC = () => {
    const [docs, setDocs] = useState<DocumentItem[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => { api.getDocuments().then(setDocs); }, []);

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const timestamp = Date.now();
            const storagePath = `documents/${timestamp}_${file.name}`;
            const url = await uploadFile(storagePath, file);
            const newDoc: DocumentItem = {
                id: 'doc_' + Date.now(),
                name: file.name,
                folderId: 'root',
                url,
                visibility: 'committee',
                filePath: storagePath,
                uploadedBy: auth.currentUser?.uid || 'admin',
                createdAt: Date.now()
            };
            await api.createDocument(newDoc);
            setDocs([...docs, newDoc]);
        } catch (e) { alert("Upload failed"); }
        setUploading(false);
    };

    const handleDelete = async (doc: DocumentItem) => {
        if(!confirm("Delete?")) return;
        await api.deleteDocument(doc.id, doc.filePath);
        setDocs(docs.filter(d => d.id !== doc.id));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <div>
                    <h3 className="font-bold text-xl text-blue-900">Document Centre</h3>
                    <p className="text-sm text-blue-700">Manage guidance and policy documents for committee members.</p>
                </div>
                <div className="w-64">
                    <FileUpload label="Upload Document" onUpload={handleUpload} disabled={uploading} />
                </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
                {docs.length === 0 && <p className="col-span-4 text-center text-gray-400 italic py-8">No documents uploaded yet.</p>}
                {docs.map(d => (
                    <FileCard key={d.id} title={d.name} type="file" date={new Date(d.createdAt).toLocaleDateString()} onDelete={() => handleDelete(d)} onClick={() => window.open(d.url, '_blank')} />
                ))}
            </div>
        </div>
    );
};

const ScoringMonitor: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [filterArea, setFilterArea] = useState<string>('All');
    const [expandedApp, setExpandedApp] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([api.getApplications(), api.getUsers(), api.getScores()]).then(([a, u, s]) => {
            setApps(a); setUsers(u); setScores(s);
        });
    }, []);

    const filteredApps = filterArea === 'All' ? apps : apps.filter(a => a.area === filterArea || a.area === 'Cross-Area');
    const committee = users.filter(u => u.role === 'committee');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl text-white shadow-xl">
                <div>
                     <h2 className="text-2xl font-dynapuff mb-1">Scoring Monitor</h2>
                     <p className="text-gray-400 text-sm">Real-time tracking of committee scoring progress</p>
                </div>
                <div className="flex gap-4 items-center">
                     <select className="p-2 border border-gray-700 bg-gray-800 rounded-lg text-white" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
                        <option value="All">All Areas</option>
                        {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <Button onClick={onExit} className="bg-white text-black hover:bg-gray-200">Exit Scoring Mode</Button>
                </div>
            </div>
            
            <div className="grid gap-4">
                {filteredApps.map(app => {
                    const relevantCommittee = committee.filter(u => u.area === app.area || app.area === 'Cross-Area');
                    const appScores = scores.filter(s => s.appId === app.id);
                    const percentComplete = relevantCommittee.length > 0 ? Math.round((appScores.length / relevantCommittee.length) * 100) : 0;
                    
                    return (
                        <Card key={app.id} className="transition-all hover:shadow-md border-l-4 border-l-brand-purple">
                            <div className="flex justify-between items-center cursor-pointer p-2" onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}>
                                <div className="flex gap-6 items-center flex-1">
                                    <Badge className="font-mono">{app.ref}</Badge>
                                    <div>
                                        <h3 className="font-bold text-lg">{app.projectTitle}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span>{app.orgName}</span>
                                            <span>•</span>
                                            <span className="font-bold text-gray-700">{app.area}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-12 items-center">
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-gray-400 tracking-wider">PROGRESS</div>
                                        <div className="font-bold text-xl flex items-center justify-end gap-2">
                                            {appScores.length} <span className="text-gray-400 text-sm">/ {relevantCommittee.length}</span>
                                        </div>
                                    </div>
                                    <div className="text-right w-24">
                                        <div className="text-[10px] font-bold text-gray-400 tracking-wider">AVG SCORE</div>
                                        <div className={`font-bold text-xl ${app.averageScore && app.averageScore >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                                            {app.averageScore || 0}%
                                        </div>
                                    </div>
                                    <div className={`text-2xl text-gray-300 transition-transform duration-300 ${expandedApp === app.id ? 'rotate-180' : ''}`}>▼</div>
                                </div>
                            </div>
                            
                            {expandedApp === app.id && (
                                <div className="mt-6 border-t pt-6 animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider">Committee Breakdown</h4>
                                        <div className="h-2 w-48 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-brand-purple transition-all duration-500" style={{ width: `${percentComplete}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-4 gap-3">
                                        {relevantCommittee.map(u => {
                                            const score = appScores.find(s => s.scorerId === u.uid);
                                            return (
                                                <div key={u.uid} className={`p-3 rounded-lg border flex justify-between items-center ${score ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${score ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                        <span className="text-sm font-bold text-gray-700">{u.displayName}</span>
                                                    </div>
                                                    {score ? <span className="font-bold text-green-700">{score.weightedTotal}%</span> : <span className="text-xs text-gray-400 italic">Pending</span>}
                                                </div>
                                            );
                                        })}
                                        {relevantCommittee.length === 0 && <p className="text-sm text-gray-500 italic col-span-4 text-center py-2">No committee members assigned to this area.</p>}
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
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

    const toggleArray = (arr: string[] | undefined, val: string) => {
        const safe = arr || [];
        return safe.includes(val) ? safe.filter(x => x !== val) : [...safe, val];
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-10 rounded-[2rem] shadow-2xl max-w-5xl mx-auto border border-gray-100">
            <FormHeader title="Expression of Interest" subtitle="Part 1 - Initial Proposal" readOnly={readOnly} />
            
            {/* 1. Basic Info */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">1. Area & Applicant</h3>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={fd.applyMultiArea} 
                            onChange={e => up('applyMultiArea', e.target.checked)} 
                            disabled={readOnly} 
                            className="w-5 h-5 accent-blue-600" 
                        />
                        <span className="font-bold text-blue-900">I am applying for a Cross-Area Project (covers multiple areas)</span>
                    </label>
                    {fd.applyMultiArea && (
                        <p className="text-sm text-blue-700 mt-2 ml-8">
                            Please select your <strong>primary</strong> area below, but note in your summary which other areas this benefits.
                        </p>
                    )}
                </div>
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

            {/* 2. Project Details */}
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

            {/* 3. Timeline & Specifics */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">3. Timeline & Theme</h3>
                <Input label="Project Theme / Priority (optional)" value={fd.projectTheme} onChange={e => up('projectTheme', e.target.value)} disabled={readOnly} />
                <div className="grid grid-cols-2 gap-6">
                    <Input label="Start Date" type="date" value={fd.startDate} onChange={e => up('startDate', e.target.value)} disabled={readOnly} required />
                    <Input label="End Date" type="date" value={fd.endDate} onChange={e => up('endDate', e.target.value)} disabled={readOnly} required />
                </div>
            </section>

            {/* 4. Outcomes */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">4. Intended Outcomes</h3>
                <p className="text-gray-500 text-sm">List up to 3 specific things your project will achieve.</p>
                <Input label="Outcome 1" value={fd.outcome1} onChange={e => up('outcome1', e.target.value)} disabled={readOnly} required />
                <Input label="Outcome 2" value={fd.outcome2} onChange={e => up('outcome2', e.target.value)} disabled={readOnly} />
                <Input label="Outcome 3" value={fd.outcome3} onChange={e => up('outcome3', e.target.value)} disabled={readOnly} />
            </section>

            {/* 5. Strategic Alignment */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">5. Strategic Alignment</h3>
                
                <div className="bg-purple-50 p-6 rounded-xl">
                    <h4 className="font-bold text-purple-900 mb-4">Marmot Principles (Select all that apply)</h4>
                    <div className="space-y-2">
                        {MARMOT_PRINCIPLES.map(p => (
                            <label key={p} className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={(fd.marmotPrinciples || []).includes(p)} onChange={() => up('marmotPrinciples', toggleArray(fd.marmotPrinciples, p))} disabled={readOnly} className="w-5 h-5 accent-brand-purple" />
                                <span className="text-sm">{p}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="bg-teal-50 p-6 rounded-xl">
                    <h4 className="font-bold text-teal-900 mb-4">Well-being of Future Generations Goals</h4>
                    <div className="space-y-2">
                        {WFG_GOALS.map(g => (
                            <label key={g} className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={(fd.wfgGoals || []).includes(g)} onChange={() => up('wfgGoals', toggleArray(fd.wfgGoals, g))} disabled={readOnly} className="w-5 h-5 accent-brand-teal" />
                                <span className="text-sm">{g}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. Declaration */}
            <section className="space-y-6 border-t pt-6">
                <div className="flex items-start gap-3">
                    <input type="checkbox" required checked={fd.gdprConsent} onChange={e => up('gdprConsent', e.target.checked)} disabled={readOnly} className="mt-1 w-5 h-5 accent-brand-purple" />
                    <p className="text-sm text-gray-600">I confirm that the information provided is true and accurate. I understand that this Expression of Interest will be reviewed by the community committee.</p>
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
                <RichTextArea label="SMART Objectives (Specific, Measurable, Achievable, Relevant, Time-bound)" value={fd.smartObjectives} onChange={e => up('smartObjectives', e.target.value)} disabled={readOnly} required />
                <RichTextArea label="Activities & Delivery Plan" value={fd.activities} onChange={e => up('activities', e.target.value)} disabled={readOnly} required />
                <RichTextArea label="Risk Management" value={fd.riskManagement} onChange={e => up('riskManagement', e.target.value)} disabled={readOnly} required />
            </section>

            {/* Impact */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">3. Impact & Collaboration</h3>
                <RichTextArea label="Community Benefit (Who benefits and how?)" value={fd.communityBenefit} onChange={e => up('communityBenefit', e.target.value)} disabled={readOnly} required />
                <RichTextArea label="Collaborations / Partners (if any)" value={fd.collaborations} onChange={e => up('collaborations', e.target.value)} disabled={readOnly} />
            </section>

            {/* Justifications */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">4. Alignment Justification</h3>
                <p className="text-gray-500 mb-4">Based on your selections in Part 1, please explain how you meet these goals.</p>
                {fd.marmotPrinciples?.map(p => (
                    <div key={p} className="bg-purple-50 p-4 rounded-xl mb-4">
                        <h4 className="font-bold text-purple-900 mb-2">{p}</h4>
                        <RichTextArea value={fd.marmotJustifications?.[p] || ''} onChange={e => up('marmotJustifications', { ...fd.marmotJustifications, [p]: e.target.value })} disabled={readOnly} placeholder="Explain how your project supports this principle..." />
                    </div>
                ))}
            </section>

            {/* Budget */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2">5. Detailed Budget</h3>
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
                <h3 className="font-bold text-xl border-b pb-2">6. Required Documents</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <FileUpload label="Constitution / Governing Doc" currentUrl={fd.attachments?.constitutionUrl} onUpload={f => handleUpload('constitution', f)} disabled={readOnly} />
                    <FileUpload label="Recent Bank Statement" currentUrl={fd.attachments?.bankStatementUrl} onUpload={f => handleUpload('bankStatement', f)} disabled={readOnly} />
                    <FileUpload label="Safeguarding Policy (Optional)" currentUrl={fd.attachments?.otherUrl} onUpload={f => handleUpload('other', f)} disabled={readOnly} />
                </div>
            </section>

            {/* Declaration */}
            <section className="space-y-6 border-t pt-6">
                <div className="flex items-start gap-3">
                    <input type="checkbox" required checked={fd.confirmOtherFunding} onChange={e => up('confirmOtherFunding', e.target.checked)} disabled={readOnly} className="mt-1 w-5 h-5 accent-brand-teal" />
                    <p className="text-sm text-gray-600">I confirm that all funding from other sources has been secured or applied for.</p>
                </div>
                <div className="flex items-start gap-3">
                    <input type="checkbox" required checked={fd.agreeGdprScrutiny} onChange={e => up('agreeGdprScrutiny', e.target.checked)} disabled={readOnly} className="mt-1 w-5 h-5 accent-brand-teal" />
                    <p className="text-sm text-gray-600">I agree to the data processing terms and understand this application will be subject to public scrutiny.</p>
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
    const [scores, setScores] = useState<Score[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [settings, setSettings] = useState<PortalSettings | null>(null);
    const [scoringApp, setScoringApp] = useState<Application | null>(null);

    const refresh = () => {
        Promise.all([
            api.getApplications(), 
            api.getVotes(),
            api.getScores(),
            api.getAssignments(user.uid),
            api.getPortalSettings()
        ]).then(([allApps, allVotes, allScores, myAssigns, portalSettings]) => {
            const assignIds = myAssigns.map(a => a.applicationId);
            const filtered = isAdmin ? allApps : allApps.filter(a => 
                a.area === user.area || 
                a.area === 'Cross-Area' || 
                assignIds.includes(a.id)
            );
            // Sort: Action required first
            const sorted = filtered.sort((a, b) => {
                const aNeedsAction = (a.status === 'Submitted-Stage1' && !allVotes.some(v => v.appId === a.id && v.voterId === user.uid)) || (a.status === 'Submitted-Stage2' && !allScores.some(s => s.appId === a.id && s.scorerId === user.uid));
                const bNeedsAction = (b.status === 'Submitted-Stage1' && !allVotes.some(v => v.appId === b.id && v.voterId === user.uid)) || (b.status === 'Submitted-Stage2' && !allScores.some(s => s.appId === b.id && s.scorerId === user.uid));
                return aNeedsAction === bNeedsAction ? 0 : aNeedsAction ? -1 : 1;
            });
            
            setApps(sorted);
            setVotes(allVotes);
            setScores(allScores);
            setAssignments(myAssigns);
            setSettings(portalSettings);
        });
    };

    useEffect(() => { refresh(); }, [user.uid, user.area, isAdmin]);

    const handleVote = async (appId: string, decision: 'yes'|'no') => {
        await api.saveVote({
            id: `${appId}_${user.uid}`,
            appId,
            applicationId: appId,
            voterId: user.uid,
            committeeId: user.uid,
            decision,
            createdAt: new Date().toISOString()
        });
        refresh();
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-dynapuff">{user.area || 'Committee'} Dashboard</h1>
                    <p className="text-gray-500 text-sm">Your assigned tasks and applications.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsProfileOpen(true)}>Profile</Button>
                    {isAdmin && <Button onClick={onReturnToAdmin}>Exit Admin View</Button>}
                </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.length === 0 && <p className="text-gray-500 col-span-3 text-center py-12">No tasks assigned yet.</p>}
                
                {apps.map(app => {
                    const hasVoted = votes.some(v => v.appId === app.id && v.voterId === user.uid);
                    const hasScored = scores.some(s => s.appId === app.id && s.scorerId === user.uid);
                    
                    let actionRequired = false;
                    let statusBadge = <Badge variant="default">Pending</Badge>;
                    let cardBorder = "border-l-gray-300";

                    if (app.status === 'Submitted-Stage1') {
                        if (hasVoted) {
                             statusBadge = <Badge variant="success">Voted</Badge>;
                             cardBorder = "border-l-green-500";
                        } else {
                             statusBadge = <Badge variant="warning">Vote Needed</Badge>;
                             actionRequired = true;
                             cardBorder = "border-l-orange-500";
                        }
                    } else if (app.status === 'Submitted-Stage2') {
                        if (hasScored) {
                             statusBadge = <Badge variant="success">Scored</Badge>;
                             cardBorder = "border-l-green-500";
                        } else {
                             statusBadge = <Badge variant="warning">Score Needed</Badge>;
                             actionRequired = true;
                             cardBorder = "border-l-purple-500";
                        }
                    } else {
                        statusBadge = <Badge>Info Only</Badge>;
                    }

                    return (
                        <Card key={app.id} className={`flex flex-col h-full border-l-4 ${cardBorder} shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex justify-between items-start mb-4">
                                <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{app.ref}</span>
                                {statusBadge}
                            </div>
                            
                            <h3 className="font-bold text-lg mb-1 leading-tight line-clamp-2">{app.projectTitle}</h3>
                            <p className="text-sm text-gray-500 mb-4">{app.orgName}</p>

                            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center gap-2">
                                <Button size="sm" variant="outline" className="flex-1" onClick={() => printApplication(app)}>View PDF</Button>
                                
                                {actionRequired && app.status === 'Submitted-Stage1' && (
                                    <>
                                        <button onClick={() => handleVote(app.id, 'yes')} className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-2 rounded-lg text-sm font-bold transition-colors">Yes</button>
                                        <button onClick={() => handleVote(app.id, 'no')} className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg text-sm font-bold transition-colors">No</button>
                                    </>
                                )}
                                
                                {actionRequired && app.status === 'Submitted-Stage2' && (
                                    <Button size="sm" className="bg-brand-purple text-white hover:bg-purple-800" onClick={() => setScoringApp(app)}>Score App</Button>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onSave={onUpdateUser} />
            {scoringApp && <ScoringModal isOpen={!!scoringApp} onClose={() => setScoringApp(null)} app={scoringApp} user={user} onSave={refresh} />}
        </div>
    );
};

export const AdminDashboard: React.FC<{ onNavigatePublic: (v:string)=>void, onNavigateScoring: ()=>void }> = ({ onNavigatePublic, onNavigateScoring }) => {
    const [tab, setTab] = useState('overview');
    const [apps, setApps] = useState<Application[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [settings, setSettings] = useState<PortalSettings | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [thresholdInput, setThresholdInput] = useState(50);
    const [isScoringMode, setIsScoringMode] = useState(false);

    const refresh = async () => {
        const [a, l, u, s, v, set] = await Promise.all([
            api.getApplications(),
            api.getAuditLogs(),
            api.getUsers(),
            api.getScores(),
            api.getVotes(),
            api.getPortalSettings()
        ]);
        
        // Enrich apps with computed scores for the dashboard
        const enriched = a.map(app => {
            const appScores = s.filter(x => x.appId === app.id);
            const appVotes = v.filter(x => x.appId === app.id);
            const avg = appScores.length > 0 ? Math.round(appScores.reduce((sum, curr) => sum + curr.weightedTotal, 0) / appScores.length) : 0;
            const yes = appVotes.filter(x => x.decision === 'yes').length;
            const no = appVotes.filter(x => x.decision === 'no').length;
            return { 
                ...app, 
                averageScore: avg, 
                scoreCount: appScores.length,
                voteCountYes: yes,
                voteCountNo: no
            };
        });

        setApps(enriched);
        setLogs(l);
        setUsers(u);
        setScores(s);
        setVotes(v);
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

    if (isScoringMode) {
        return <ScoringMonitor onExit={() => setIsScoringMode(false)} />;
    }

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
                    <Button onClick={() => setIsScoringMode(true)}>Enter Scoring Mode</Button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm inline-flex overflow-x-auto">
                {['overview', 'master', 'rounds', 'users', 'docs', 'logs'].map(t => (
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
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4">Ref</th>
                                    <th className="p-4">Project Title</th>
                                    <th className="p-4">Area</th>
                                    <th className="p-4">Stage 1 (Votes)</th>
                                    <th className="p-4">Stage 2 (Score)</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {apps.map(app => (
                                    <tr key={app.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-mono text-gray-600 font-bold">{app.ref}</td>
                                        <td className="p-4 font-bold text-gray-800">{app.projectTitle}</td>
                                        <td className="p-4">{app.area}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-green-600 font-bold">{app.voteCountYes || 0} Yes</span>
                                                <span className="text-gray-300">|</span>
                                                <span className="text-red-500 font-bold">{app.voteCountNo || 0} No</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {app.averageScore ? (
                                                <Badge className={app.averageScore >= (settings?.scoringThreshold || 50) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                                    {app.averageScore}% ({app.scoreCount})
                                                </Badge>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4"><Badge>{app.status}</Badge></td>
                                        <td className="p-4">
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

            {tab === 'docs' && <AdminDocCentre />}

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
