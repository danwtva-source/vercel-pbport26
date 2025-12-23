import React, { useEffect, useState, useMemo } from 'react';
import { Application, User, Score, Vote, AREAS, Area, Role, BudgetLine, AdminDocument, PortalSettings, Assignment, Round, ApplicationStatus, AuditLog } from '../types';
import { SCORING_CRITERIA, MARMOT_PRINCIPLES, WFG_GOALS, ORG_TYPES } from '../constants';
import { AdminRounds } from './AdminRounds';
import { api, exportToCSV, uploadProfileImage, deleteProfileImage, uploadFile } from '../services/firebase';
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let total = 0;
        let maxTotal = 0;
        
        SCORING_CRITERIA.forEach(c => {
            const score = breakdown[c.id] || 0;
            total += score * c.weight;
            maxTotal += 100 * c.weight;
        });
        
        const weightedTotal = Math.round((total / maxTotal) * 100);

        const newScore: Score = {
            id: `${app.id}_${user.uid}`,
            appId: app.id,
            scorerId: user.uid,
            scorerName: user.displayName,
            weightedTotal,
            breakdown,
            notes,
            isFinal: true,
            createdAt: new Date().toISOString()
        };

        await api.saveScore(newScore);
        onSave();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Score: ${app.projectTitle}`} size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm">
                    Please score each criterion from 0-100. The system will automatically calculate the weighted total based on committee priorities.
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
                                type="range" min="0" max="100" step="5" 
                                value={breakdown[criterion.id] || 0}
                                onChange={e => setBreakdown({ ...breakdown, [criterion.id]: Number(e.target.value) })}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-purple"
                            />
                            <div className="w-16 font-bold text-xl text-center">{breakdown[criterion.id] || 0}</div>
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
    const [docs, setDocs] = useState<AdminDocument[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => { api.getDocuments().then(setDocs); }, []);

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const url = await uploadFile(`admin-docs/${Date.now()}_${file.name}`, file);
            const newDoc: AdminDocument = {
                id: 'doc_' + Date.now(),
                name: file.name,
                type: 'file',
                parentId: 'root',
                url,
                category: 'general',
                uploadedBy: 'admin',
                createdAt: Date.now()
            };
            await api.saveDocument(newDoc);
            setDocs(prev => [...prev, newDoc]);
        } catch (err) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        await api.deleteDocument(id);
        setDocs(prev => prev.filter(d => d.id !== id));
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Admin Document Centre</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {docs.map(d => <FileCard key={d.id} title={d.name} type="file" date={new Date(d.createdAt).toLocaleDateString()} onClick={() => d.url && window.open(d.url, '_blank')} onDelete={() => handleDelete(d.id)} />)}
                <div className="flex flex-col justify-center items-center border-2 border-dashed rounded-xl p-4">
                    <input type="file" className="hidden" id="docUpload" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                    <label htmlFor="docUpload" className="cursor-pointer text-sm font-bold text-brand-purple">{uploading ? 'Uploading...' : 'Upload Document'}</label>
                </div>
            </div>
        </Card>
    );
};

// --- STAGE 1 FORM (Matches PB 1.1 PDF) ---
export const DigitalStage1Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: unknown) => onChange({ ...data, formData: { ...fd, [k]: v } });
    
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
                <div className="grid md:grid-cols-2 gap-4">
                    {ORG_TYPES.map(type => (
                        <label key={type} className={`border-2 p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${fd.orgTypes?.includes(type) ? 'bg-purple-50 border-brand-purple shadow-md' : 'border-gray-100 hover:border-purple-200'}`}>
                            <input type="checkbox" checked={fd.orgTypes?.includes(type)} onChange={() => toggleOrgType(type)} disabled={readOnly} className="accent-brand-purple w-5 h-5" /> 
                            <span className="font-bold text-gray-700">{type}</span>
                        </label>
                    ))}
                </div>
                <Input label="Other (Please specify)" value={fd.orgTypeOther || ''} onChange={e => up('orgTypeOther', e.target.value)} disabled={readOnly} />
            </section>

            {/* 3. Project Overview */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">3. Project Overview</h3>
                <Input label="Project Title" value={data.projectTitle} onChange={e => onChange({...data, projectTitle: e.target.value})} disabled={readOnly} />
                <RichTextArea label="Project Summary" value={data.summary} onChange={e => onChange({...data, summary: e.target.value})} disabled={readOnly} />
                <Input label="Amount Requested (£)" type="number" value={data.amountRequested} onChange={e => onChange({...data, amountRequested: Number(e.target.value)})} disabled={readOnly} />
            </section>

            {/* 4. Project Theme & Timeline */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">4. Project Theme & Timeline</h3>
                <Input label="Project Theme" value={fd.projectTheme || ''} onChange={e => up('projectTheme', e.target.value)} disabled={readOnly} />
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Start Date" type="date" value={fd.startDate || ''} onChange={e => up('startDate', e.target.value)} disabled={readOnly} />
                    <Input label="End Date" type="date" value={fd.endDate || ''} onChange={e => up('endDate', e.target.value)} disabled={readOnly} />
                </div>
                <Input label="Project Duration" value={fd.duration || ''} onChange={e => up('duration', e.target.value)} disabled={readOnly} />
            </section>

            {/* 5. Project Outcomes */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">5. Project Outcomes</h3>
                <Input label="Outcome 1" value={fd.outcome1 || ''} onChange={e => up('outcome1', e.target.value)} disabled={readOnly} />
                <Input label="Outcome 2" value={fd.outcome2 || ''} onChange={e => up('outcome2', e.target.value)} disabled={readOnly} />
                <Input label="Outcome 3" value={fd.outcome3 || ''} onChange={e => up('outcome3', e.target.value)} disabled={readOnly} />
            </section>

            {/* 6. Funding */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">6. Funding</h3>
                <RichTextArea label="Other Funding Sources" value={fd.otherFundingSources || ''} onChange={e => up('otherFundingSources', e.target.value)} disabled={readOnly} />
            </section>

            {/* 7. Alignment */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">7. Alignment with Marmot & WFG</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    {MARMOT_PRINCIPLES.map(p => (
                        <label key={p} className={`border-2 p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${fd.marmotPrinciples?.includes(p) ? 'bg-purple-50 border-brand-purple shadow-md' : 'border-gray-100 hover:border-purple-200'}`}>
                            <input type="checkbox" checked={fd.marmotPrinciples?.includes(p)} onChange={() => up('marmotPrinciples', fd.marmotPrinciples?.includes(p) ? fd.marmotPrinciples.filter(m => m !== p) : [...(fd.marmotPrinciples || []), p])} disabled={readOnly} className="accent-brand-purple w-5 h-5" /> 
                            <span className="font-bold text-gray-700">{p}</span>
                        </label>
                    ))}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    {WFG_GOALS.map(g => (
                        <label key={g} className={`border-2 p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${fd.wfgGoals?.includes(g) ? 'bg-purple-50 border-brand-purple shadow-md' : 'border-gray-100 hover:border-purple-200'}`}>
                            <input type="checkbox" checked={fd.wfgGoals?.includes(g)} onChange={() => up('wfgGoals', fd.wfgGoals?.includes(g) ? fd.wfgGoals.filter(w => w !== g) : [...(fd.wfgGoals || []), g])} disabled={readOnly} className="accent-brand-purple w-5 h-5" /> 
                            <span className="font-bold text-gray-700">{g}</span>
                        </label>
                    ))}
                </div>
            </section>

            {/* 8. Declarations */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">8. Declaration</h3>
                <div className="space-y-4">
                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={fd.gdprConsent || false} onChange={e => up('gdprConsent', e.target.checked)} disabled={readOnly} className="w-5 h-5 accent-brand-purple" />
                        <span className="text-gray-700">I consent to GDPR terms.</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={fd.declarationTrue || false} onChange={e => up('declarationTrue', e.target.checked)} disabled={readOnly} className="w-5 h-5 accent-brand-purple" />
                        <span className="text-gray-700">I confirm the information is true and correct.</span>
                    </label>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    <Input label="Name" value={fd.declarationName || ''} onChange={e => up('declarationName', e.target.value)} disabled={readOnly} />
                    <Input label="Date" type="date" value={fd.declarationDate || ''} onChange={e => up('declarationDate', e.target.value)} disabled={readOnly} />
                    <Input label="Signature" value={fd.declarationSignature || ''} onChange={e => up('declarationSignature', e.target.value)} disabled={readOnly} />
                </div>
            </section>

            <div className="flex justify-end gap-4">
                <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
                <Button type="submit">Submit EOI</Button>
            </div>
        </form>
    );
};

// --- STAGE 2 FORM (Matches PB 2.1 PDF) ---
export const DigitalStage2Form: React.FC<{ data: Partial<Application>; onChange: (d: Partial<Application>) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; readOnly?: boolean; }> = ({ data, onChange, onSubmit, onCancel, readOnly }) => {
    const fd = data.formData || {};
    const up = (k: string, v: unknown) => onChange({ ...data, formData: { ...fd, [k]: v } });

    const updateBudgetLine = (i: number, line: BudgetLine) => {
        const updated = [...(fd.budgetBreakdown || [])];
        updated[i] = line;
        up('budgetBreakdown', updated);
    };

    const addBudgetLine = () => {
        const updated = [...(fd.budgetBreakdown || []), { item: '', note: '', cost: 0 }];
        up('budgetBreakdown', updated);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-10 bg-white p-10 rounded-[2rem] shadow-2xl max-w-5xl mx-auto border border-gray-100">
            <div className="border-b pb-6 mb-6">
                <h2 className="text-4xl font-dynapuff text-brand-purple">Full Application (Part 2)</h2>
                <p className="text-gray-500 mt-2">PB 2.1 - Complete the full application form for shortlisted projects.</p>
            </div>

            {/* 1. Org Bank Details */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">1. Organisation & Bank Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Bank Account Name" value={fd.bankAccountName || ''} onChange={e => up('bankAccountName', e.target.value)} disabled={readOnly} />
                    <Input label="Account Number" value={fd.bankAccountNumber || ''} onChange={e => up('bankAccountNumber', e.target.value)} disabled={readOnly} />
                    <Input label="Sort Code" value={fd.bankSortCode || ''} onChange={e => up('bankSortCode', e.target.value)} disabled={readOnly} />
                    <Input label="Charity Number" value={fd.charityNumber || ''} onChange={e => up('charityNumber', e.target.value)} disabled={readOnly} />
                    <Input label="Company Number" value={fd.companyNumber || ''} onChange={e => up('companyNumber', e.target.value)} disabled={readOnly} />
                </div>
            </section>

            {/* 2. Project Details */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">2. Project Details</h3>
                <RichTextArea label="SMART Objectives" value={fd.smartObjectives || ''} onChange={e => up('smartObjectives', e.target.value)} disabled={readOnly} />
                <RichTextArea label="Planned Activities" value={fd.activities || ''} onChange={e => up('activities', e.target.value)} disabled={readOnly} />
                <RichTextArea label="Community Benefit" value={fd.communityBenefit || ''} onChange={e => up('communityBenefit', e.target.value)} disabled={readOnly} />
                <RichTextArea label="Collaborations" value={fd.collaborations || ''} onChange={e => up('collaborations', e.target.value)} disabled={readOnly} />
                <RichTextArea label="Risk Management" value={fd.riskManagement || ''} onChange={e => up('riskManagement', e.target.value)} disabled={readOnly} />
            </section>

            {/* 3. Alignment Justifications */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">3. Alignment Justification</h3>
                <p className="text-sm text-gray-500">Explain how your project aligns with selected Marmot Principles and Well-being Goals.</p>

                {MARMOT_PRINCIPLES.map(p => (
                    <RichTextArea key={p} label={`Marmot: ${p}`} value={fd.marmotJustifications?.[p] || ''} onChange={e => up('marmotJustifications', { ...fd.marmotJustifications, [p]: e.target.value })} disabled={readOnly} />
                ))}

                {WFG_GOALS.map(g => (
                    <RichTextArea key={g} label={`WFG: ${g}`} value={fd.wfgJustifications?.[g] || ''} onChange={e => up('wfgJustifications', { ...fd.wfgJustifications, [g]: e.target.value })} disabled={readOnly} />
                ))}
            </section>

            {/* 4. Budget */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">4. Detailed Budget</h3>
                {(fd.budgetBreakdown || []).map((line, idx) => (
                    <div key={idx} className="grid md:grid-cols-3 gap-4">
                        <Input label="Item" value={line.item} onChange={e => updateBudgetLine(idx, { ...line, item: e.target.value })} disabled={readOnly} />
                        <Input label="Notes" value={line.note} onChange={e => updateBudgetLine(idx, { ...line, note: e.target.value })} disabled={readOnly} />
                        <Input label="Cost" type="number" value={line.cost} onChange={e => updateBudgetLine(idx, { ...line, cost: Number(e.target.value) })} disabled={readOnly} />
                    </div>
                ))}
                {!readOnly && <Button type="button" variant="outline" onClick={addBudgetLine}>Add Budget Line</Button>}
                <RichTextArea label="Additional Budget Info" value={fd.additionalBudgetInfo || ''} onChange={e => up('additionalBudgetInfo', e.target.value)} disabled={readOnly} />
            </section>

            {/* 5. Uploads & Declarations */}
            <section className="space-y-6">
                <h3 className="font-bold text-xl border-b pb-2 text-gray-800">5. Uploads & Declarations</h3>
                <div className="space-y-4">
                    <FileUpload label="Upload Constitution" currentUrl={fd.attachments?.constitution ? data.pdfUrl : undefined} onUpload={async (file) => {
                        const url = await uploadFile(`applications/${data.id || 'new'}/constitution`, file);
                        onChange({ ...data, pdfUrl: url, formData: { ...fd, attachments: { ...fd.attachments, constitution: true } } });
                    }} disabled={readOnly} />
                    <FileUpload label="Upload Safeguarding" currentUrl={fd.attachments?.safeguarding ? data.stage2PdfUrl : undefined} onUpload={async (file) => {
                        const url = await uploadFile(`applications/${data.id || 'new'}/safeguarding`, file);
                        onChange({ ...data, stage2PdfUrl: url, formData: { ...fd, attachments: { ...fd.attachments, safeguarding: true } } });
                    }} disabled={readOnly} />
                </div>
                <div className="space-y-4">
                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={fd.consentWithdraw || false} onChange={e => up('consentWithdraw', e.target.checked)} disabled={readOnly} className="w-5 h-5 accent-brand-purple" />
                        <span className="text-gray-700">I understand data usage and consent to processing.</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={fd.agreeGdprScrutiny || false} onChange={e => up('agreeGdprScrutiny', e.target.checked)} disabled={readOnly} className="w-5 h-5 accent-brand-purple" />
                        <span className="text-gray-700">I agree to GDPR scrutiny.</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={fd.confirmOtherFunding || false} onChange={e => up('confirmOtherFunding', e.target.checked)} disabled={readOnly} className="w-5 h-5 accent-brand-purple" />
                        <span className="text-gray-700">I confirm other funding sources are declared.</span>
                    </label>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    <Input label="Name" value={fd.declarationName2 || ''} onChange={e => up('declarationName2', e.target.value)} disabled={readOnly} />
                    <Input label="Date" type="date" value={fd.declarationDate2 || ''} onChange={e => up('declarationDate2', e.target.value)} disabled={readOnly} />
                    <Input label="Signature" value={fd.declarationSignature2 || ''} onChange={e => up('declarationSignature2', e.target.value)} disabled={readOnly} />
                </div>
            </section>

            <div className="flex justify-end gap-4">
                <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
                <Button type="submit">Submit Full Application</Button>
            </div>
        </form>
    );
};

// --- DASHBOARD COMPONENTS ---

export const ApplicantDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [selected, setSelected] = useState<Application | null>(null);
    const [editing, setEditing] = useState<Partial<Application> | null>(null);
    const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api.getApplications().then(setApps);
        api.getSettings().then(setPortalSettings);
    }, []);

    const myApps = useMemo(() => apps.filter(a => a.userId === user.uid), [apps, user.uid]);

    const createNew = () => {
        if (!portalSettings?.stage1Visible) {
            setError('Stage 1 applications are currently closed.');
            return;
        }
        setEditing({
            userId: user.uid,
            applicantName: user.displayName || user.email,
            orgName: '',
            projectTitle: '',
            area: AREAS[0],
            summary: '',
            amountRequested: 0,
            totalCost: 0,
            status: 'Draft',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ref: 'A' + Date.now(),
            submissionMethod: 'digital',
            formData: {}
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        try {
            const isNew = !editing.id;
            const app: Application = {
                ...(editing as Application),
                id: editing.id || 'app_' + Date.now(),
                status: 'Submitted-Stage1',
                updatedAt: Date.now()
            };
            if (isNew) await api.createApplication(app);
            else await api.updateApplication(app.id, app);
            setEditing(null);
            setApps(await api.getApplications());
        } catch (err) {
            setError('Failed to submit application.');
        }
    };

    const submitStage2 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        try {
            const app: Application = {
                ...(editing as Application),
                status: 'Submitted-Stage2',
                updatedAt: Date.now()
            };
            await api.updateApplication(app.id, app);
            setEditing(null);
            setApps(await api.getApplications());
        } catch (err) {
            setError('Failed to submit full application.');
        }
    };

    const saveDraft = async () => {
        if (!editing) return;
        try {
            const app: Application = {
                ...(editing as Application),
                status: 'Draft',
                updatedAt: Date.now()
            };
            if (!editing.id) await api.createApplication(app);
            else await api.updateApplication(app.id, app);
            setEditing(null);
            setApps(await api.getApplications());
        } catch {
            setError('Failed to save draft.');
        }
    };

    if (editing) {
        const isStage2 = editing.status === 'Invited-Stage2' || editing.status === 'Submitted-Stage2';
        return (
            <div className="space-y-6 p-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold font-dynapuff text-brand-purple">{isStage2 ? 'Full Application (Part 2)' : 'Application Form (Part 1)'}</h1>
                    <Button variant="ghost" onClick={() => setEditing(null)}>Back</Button>
                </div>
                {error && <div className="text-red-500 font-bold">{error}</div>}
                {isStage2 ? (
                    <DigitalStage2Form data={editing} onChange={setEditing} onSubmit={submitStage2} onCancel={() => setEditing(null)} />
                ) : (
                    <>
                        <DigitalStage1Form data={editing} onChange={setEditing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={saveDraft}>Save Draft</Button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-dynapuff text-brand-purple">Applicant Dashboard</h1>
                <Button onClick={createNew}>New Application</Button>
            </div>
            {error && <div className="text-red-500 font-bold">{error}</div>}

            <div className="grid md:grid-cols-2 gap-6">
                {myApps.map(app => (
                    <Card key={app.id} className="space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold">{app.projectTitle}</h3>
                                <p className="text-sm text-gray-500">{app.orgName}</p>
                            </div>
                            <Badge>{app.status}</Badge>
                        </div>
                        <p className="text-gray-600">{app.summary}</p>
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-brand-purple">£{app.amountRequested}</span>
                            <Button variant="outline" onClick={() => setEditing(app)}>View / Edit</Button>
                        </div>
                        {app.status === 'Invited-Stage2' && portalSettings?.stage2Visible && (
                            <Button onClick={() => setEditing(app)} className="w-full">Complete Full Application</Button>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export const CommitteeDashboard: React.FC<{ user: User; onUpdateUser: (u: User) => void; isAdmin?: boolean; onReturnToAdmin?: () => void }> = ({ user, onUpdateUser, isAdmin, onReturnToAdmin }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selected, setSelected] = useState<Application | null>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [scoringOpen, setScoringOpen] = useState(false);
    const [filterArea, setFilterArea] = useState<Area | 'All'>(user.area || 'All');
    const [tab, setTab] = useState<'apps' | 'assigned' | 'scoring' | 'voting'>('apps');

    useEffect(() => {
        api.getApplications(user.role === 'committee' ? user.area || undefined : undefined).then(setApps);
        api.getScores().then(setScores);
        api.getVotes().then(setVotes);
        api.getAssignments().then(setAssignments);
    }, [user.area, user.role]);

    const appsToShow = useMemo(() => {
        if (tab === 'assigned') {
            const assignedIds = assignments.filter(a => a.committeeId === user.uid).map(a => a.applicationId);
            return apps.filter(a => assignedIds.includes(a.id));
        }
        if (filterArea !== 'All') return apps.filter(a => a.area === filterArea || a.area === 'Cross-Area');
        return apps;
    }, [apps, filterArea, tab, assignments, user.uid]);

    const hasVoted = (appId: string) => votes.find(v => v.appId === appId && v.voterId === user.uid);
    const myScore = (appId: string) => scores.find(s => s.appId === appId && s.scorerId === user.uid);

    const handleVote = async (app: Application, decision: 'yes' | 'no') => {
        const vote: Vote = {
            id: `${app.id}_${user.uid}`,
            appId: app.id,
            voterId: user.uid,
            voterName: user.displayName,
            decision,
            createdAt: new Date().toISOString()
        };
        await api.saveVote(vote);
        setVotes(await api.getVotes());
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-dynapuff text-brand-purple">Committee Dashboard</h1>
                    {isAdmin && <button onClick={onReturnToAdmin} className="text-xs text-blue-600 underline">Return to Admin</button>}
                </div>
                <div className="flex gap-2 items-center">
                    <Button variant="ghost" onClick={() => setProfileOpen(true)}>Edit Profile</Button>
                </div>
            </div>

            <div className="flex gap-2">
                <Button variant={tab === 'apps' ? 'primary' : 'outline'} onClick={() => setTab('apps')}>All Apps</Button>
                <Button variant={tab === 'assigned' ? 'primary' : 'outline'} onClick={() => setTab('assigned')}>Assigned</Button>
                <Button variant={tab === 'scoring' ? 'primary' : 'outline'} onClick={() => setTab('scoring')}>Scoring</Button>
                <Button variant={tab === 'voting' ? 'primary' : 'outline'} onClick={() => setTab('voting')}>Voting</Button>
            </div>

            <div className="flex items-center gap-4">
                <label className="font-bold">Filter Area:</label>
                <select value={filterArea} onChange={e => setFilterArea(e.target.value as Area | 'All')} className="p-2 border rounded-xl">
                    <option value="All">All</option>
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {appsToShow.map(app => (
                    <Card key={app.id} className="space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold">{app.projectTitle}</h3>
                                <p className="text-sm text-gray-500">{app.orgName}</p>
                            </div>
                            <Badge>{app.status}</Badge>
                        </div>
                        <p className="text-gray-600">{app.summary}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setSelected(app)}>View</Button>
                            {tab === 'voting' && !hasVoted(app.id) && (
                                <>
                                    <Button onClick={() => handleVote(app, 'yes')}>Vote Yes</Button>
                                    <Button variant="outline" onClick={() => handleVote(app, 'no')}>Vote No</Button>
                                </>
                            )}
                            {tab === 'scoring' && (
                                <Button onClick={() => { setSelected(app); setScoringOpen(true); }}>Score</Button>
                            )}
                        </div>
                        {tab === 'voting' && hasVoted(app.id) && <p className="text-xs text-green-600 font-bold">Voted: {hasVoted(app.id)?.decision}</p>}
                        {tab === 'scoring' && myScore(app.id) && <p className="text-xs text-blue-600 font-bold">Score Submitted</p>}
                    </Card>
                ))}
            </div>

            {selected && (
                <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected.projectTitle} size="lg">
                    <div className="space-y-4">
                        <p>{selected.summary}</p>
                        <div className="flex gap-2">
                            {selected.pdfUrl && <Button variant="outline" onClick={() => window.open(selected.pdfUrl, '_blank')}>View PDF</Button>}
                            <Button variant="outline" onClick={() => printApplication(selected)}>Print</Button>
                        </div>
                    </div>
                </Modal>
            )}

            <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} user={user} onSave={onUpdateUser} />
            {selected && (
                <ScoringModal isOpen={scoringOpen} onClose={() => setScoringOpen(false)} app={selected} user={user} onSave={() => api.getScores().then(setScores)} />
            )}
        </div>
    );
};

export const AdminDashboard: React.FC<{ onNavigatePublic: (page: string) => void; onNavigateScoring: () => void }> = ({ onNavigatePublic, onNavigateScoring }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [settings, setSettings] = useState<PortalSettings>({ stage1Visible: true, stage2Visible: false, votingOpen: false, scoringThreshold: 50 });
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [tab, setTab] = useState<'applications' | 'users' | 'settings' | 'documents' | 'rounds' | 'assignments' | 'audit'>('applications');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [scoreBreakdown, setScoreBreakdown] = useState<Score | null>(null);
    const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

    useEffect(() => {
        const load = async () => {
            setApps(await api.getApplications());
            setUsers(await api.getUsers());
            setScores(await api.getScores());
            setVotes(await api.getVotes());
            setAssignments(await api.getAssignments());
            setSettings(await api.getSettings());
            setAuditLogs(await api.getAuditLogs());
        };
        load();
    }, []);

    const handleSettingsSave = async () => {
        await api.updateSettings(settings);
        alert('Settings saved');
    };

    const updateStatus = async (app: Application, status: ApplicationStatus) => {
        await api.updateApplication(app.id, { status });
        await api.createAuditLog({
            id: 'log_' + Date.now(),
            adminId: 'admin',
            action: 'APP_STATUS_CHANGE',
            targetId: app.id,
            timestamp: Date.now(),
            details: { from: app.status, to: status }
        });
        setApps(await api.getApplications());
        setAuditLogs(await api.getAuditLogs());
    };

    const handleAssign = async (a: Assignment) => {
        if (editingAssignment) await api.updateAssignment(editingAssignment.id, a);
        else await api.createAssignment(a);
        setAssignments(await api.getAssignments());
        setAssignmentModalOpen(false);
        setEditingAssignment(null);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-dynapuff text-brand-purple">Admin Dashboard</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onNavigatePublic('home')}>View Public Site</Button>
                    <Button onClick={onNavigateScoring}>Go to Committee View</Button>
                </div>
            </div>

            <div className="flex gap-2 flex-wrap">
                <Button variant={tab === 'applications' ? 'primary' : 'outline'} onClick={() => setTab('applications')}>Applications</Button>
                <Button variant={tab === 'users' ? 'primary' : 'outline'} onClick={() => setTab('users')}>Users</Button>
                <Button variant={tab === 'settings' ? 'primary' : 'outline'} onClick={() => setTab('settings')}>Settings</Button>
                <Button variant={tab === 'documents' ? 'primary' : 'outline'} onClick={() => setTab('documents')}>Documents</Button>
                <Button variant={tab === 'rounds' ? 'primary' : 'outline'} onClick={() => setTab('rounds')}>Rounds</Button>
                <Button variant={tab === 'assignments' ? 'primary' : 'outline'} onClick={() => setTab('assignments')}>Assignments</Button>
                <Button variant={tab === 'audit' ? 'primary' : 'outline'} onClick={() => setTab('audit')}>Audit Logs</Button>
            </div>

            {tab === 'applications' && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => exportToCSV(apps, 'applications')}>Export CSV</Button>
                    </div>
                    <div className="grid gap-4">
                        {apps.map(app => (
                            <Card key={app.id} className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold">{app.projectTitle}</h3>
                                        <p className="text-xs text-gray-500">{app.applicantName}</p>
                                    </div>
                                    <Badge>{app.status}</Badge>
                                </div>
                                <p className="text-sm text-gray-600">{app.summary}</p>
                                <div className="flex gap-2 flex-wrap">
                                    <Button variant="outline" onClick={() => setSelectedApp(app)}>View</Button>
                                    <Button variant="outline" onClick={() => printApplication(app)}>Print</Button>
                                    <Button variant="outline" onClick={() => updateStatus(app, 'Invited-Stage2')}>Invite Stage 2</Button>
                                    <Button variant="outline" onClick={() => updateStatus(app, 'Rejected-Stage1')}>Reject Stage 1</Button>
                                    <Button variant="outline" onClick={() => updateStatus(app, 'Funded')}>Mark Funded</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'users' && (
                <div className="space-y-4">
                    <Button onClick={() => { setEditingUser(null); setUserModalOpen(true); }}>Create User</Button>
                    <div className="grid gap-4">
                        {users.map(u => (
                            <Card key={u.uid} className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold">{u.displayName || u.email}</h3>
                                    <p className="text-xs text-gray-500">{u.role}</p>
                                </div>
                                <Button variant="outline" onClick={() => { setEditingUser(u); setUserModalOpen(true); }}>Edit</Button>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'settings' && (
                <Card className="space-y-4">
                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={settings.stage1Visible} onChange={e => setSettings({ ...settings, stage1Visible: e.target.checked })} className="w-5 h-5" />
                        <span className="font-bold">Stage 1 Applications Open</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={settings.stage2Visible} onChange={e => setSettings({ ...settings, stage2Visible: e.target.checked })} className="w-5 h-5" />
                        <span className="font-bold">Stage 2 Applications Open</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={settings.votingOpen} onChange={e => setSettings({ ...settings, votingOpen: e.target.checked })} className="w-5 h-5" />
                        <span className="font-bold">Public Voting Open</span>
                    </label>
                    <Input label="Scoring Threshold" type="number" value={settings.scoringThreshold} onChange={e => setSettings({ ...settings, scoringThreshold: Number(e.target.value) })} />
                    <Button onClick={handleSettingsSave}>Save Settings</Button>
                </Card>
            )}

            {tab === 'documents' && <AdminDocCentre />}

            {tab === 'rounds' && <AdminRounds />}

            {tab === 'assignments' && (
                <Card className="space-y-4">
                    <Button onClick={() => { setEditingAssignment(null); setAssignmentModalOpen(true); }}>Assign Application</Button>
                    <div className="grid gap-4">
                        {assignments.map(a => (
                            <Card key={a.id} className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold">App: {a.applicationId}</h3>
                                    <p className="text-xs text-gray-500">Committee: {a.committeeId}</p>
                                </div>
                                <Button variant="outline" onClick={() => { setEditingAssignment(a); setAssignmentModalOpen(true); }}>Edit</Button>
                            </Card>
                        ))}
                    </div>
                </Card>
            )}

            {tab === 'audit' && (
                <Card>
                    <h3 className="font-bold mb-4">Audit Logs</h3>
                    <div className="space-y-2">
                        {auditLogs.map(log => (
                            <div key={log.id} className="text-xs text-gray-600">
                                <span className="font-bold">{log.action}</span> on {log.targetId} at {new Date(log.timestamp).toLocaleString()}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {selectedApp && (
                <Modal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} title={selectedApp.projectTitle} size="lg">
                    <div className="space-y-4">
                        <p>{selectedApp.summary}</p>
                        <div className="flex gap-2">
                            {selectedApp.pdfUrl && <Button variant="outline" onClick={() => window.open(selectedApp.pdfUrl, '_blank')}>View PDF</Button>}
                            {selectedApp.stage2PdfUrl && <Button variant="outline" onClick={() => window.open(selectedApp.stage2PdfUrl, '_blank')}>View Stage 2 PDF</Button>}
                        </div>
                        <Button variant="outline" onClick={() => setScoreBreakdown(scores.find(s => s.appId === selectedApp.id) || null)}>View Scores</Button>
                    </div>
                </Modal>
            )}

            {scoreBreakdown && (
                <Modal isOpen={!!scoreBreakdown} onClose={() => setScoreBreakdown(null)} title="Score Breakdown" size="lg">
                    <BarChart data={SCORING_CRITERIA.map(c => ({ label: c.name, value: scoreBreakdown.breakdown[c.id] || 0 }))} />
                </Modal>
            )}

            <UserFormModal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} user={editingUser} onSave={() => api.getUsers().then(setUsers)} />

            {assignmentModalOpen && (
                <Modal isOpen={assignmentModalOpen} onClose={() => setAssignmentModalOpen(false)} title="Assign Application">
                    <form onSubmit={e => {
                        e.preventDefault();
                        if (!editingAssignment) return;
                        handleAssign(editingAssignment);
                    }} className="space-y-4">
                        <Input label="Application ID" value={editingAssignment?.applicationId || ''} onChange={e => setEditingAssignment({ ...(editingAssignment || { id: 'assign_' + Date.now(), committeeId: '', assignedDate: new Date().toISOString(), status: 'assigned' }), applicationId: e.target.value })} />
                        <Input label="Committee UID" value={editingAssignment?.committeeId || ''} onChange={e => setEditingAssignment({ ...(editingAssignment || { id: 'assign_' + Date.now(), applicationId: '', assignedDate: new Date().toISOString(), status: 'assigned' }), committeeId: e.target.value })} />
                        <Button type="submit">Save Assignment</Button>
                    </form>
                </Modal>
            )}
        </div>
    );
};
