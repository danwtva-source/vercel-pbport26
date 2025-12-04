import React, { useEffect, useState, useMemo } from 'react';
import { Application, User, Score, AREAS, Area, Role, BudgetLine, PortalSettings, AppStatus } from '../types';
import { COMMITTEE_DOCS, SCORING_CRITERIA, MARMOT_PRINCIPLES, WFG_GOALS } from '../constants';
import { api, seedDatabase } from '../services/firebase';
import { Button, Card, Input, Modal, Badge } from '../components/UI';

// --- HELPER COMPONENTS ---

const StatusBadge: React.FC<{ status: AppStatus }> = ({ status }) => {
    let color = 'gray';
    if (status === 'Submitted-Stage1') color = 'blue';
    if (status === 'Invited-Stage2') color = 'amber';
    if (status === 'Submitted-Stage2') color = 'purple';
    if (status === 'Finalist') color = 'teal';
    if (status === 'Funded') color = 'green';
    if (status === 'Rejected' || status === 'Rejected-Stage1') color = 'red';
    if (status === 'Withdrawn') color = 'red';
    
    return <Badge variant={color as any}>{status}</Badge>;
};

// --- UPLOAD SIMULATION ---
const FileUploader: React.FC<{ 
    label: string; 
    currentUrl?: string; 
    onUpload: (url: string) => void;
    disabled?: boolean; 
}> = ({ label, currentUrl, onUpload, disabled }) => {
    const [uploading, setUploading] = useState(false);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setUploading(true);
            setTimeout(() => {
                const fakeUrl = `https://fake-storage.com/${e.target.files![0].name}`;
                onUpload(fakeUrl);
                setUploading(false);
            }, 1500);
        }
    };

    return (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
            <h4 className="font-bold text-gray-700 mb-2">{label}</h4>
            {currentUrl ? (
                <div className="mb-4">
                    <p className="text-green-600 font-bold text-sm mb-2">✓ File Uploaded</p>
                    <a href={currentUrl} target="_blank" rel="noreferrer" className="text-brand-purple underline text-sm">View Current File</a>
                </div>
            ) : (
                <p className="text-sm text-gray-500 mb-4">No file uploaded yet.</p>
            )}
            
            <label className={`inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer shadow-sm font-bold text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                {uploading ? 'Uploading...' : (currentUrl ? 'Replace File' : 'Choose PDF')}
                <input type="file" accept=".pdf" className="hidden" onChange={handleFile} disabled={disabled || uploading} />
            </label>
        </div>
    );
};

// --- SHARED PROFILE MODAL ---
const ProfileModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    user: User; 
    onSave: (u: User) => void; 
}> = ({ isOpen, onClose, user, onSave }) => {
    const [data, setData] = useState({ 
        displayName: user.displayName || '', 
        bio: user.bio || '', 
        phone: user.phone || '',
        address: user.address || '',
        roleDescription: user.roleDescription || '',
        photoUrl: user.photoUrl || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const updated = await api.updateUserProfile(user.uid, data);
        onSave(updated);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
            <form onSubmit={handleSubmit} className="space-y-6">
                <Input label="Display Name" value={data.displayName} onChange={e => setData({...data, displayName: e.target.value})} required />
                <Input label="Role / Title" placeholder="e.g. Treasurer" value={data.roleDescription} onChange={e => setData({...data, roleDescription: e.target.value})} />
                <Input label="Phone Number" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} />
                <Button type="submit" className="w-full shadow-lg">Save Profile Changes</Button>
            </form>
        </Modal>
    );
};

// --- USER FORM MODAL (ADMIN) ---
const UserFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: User | null; 
    onSave: () => void;
}> = ({ isOpen, onClose, user, onSave }) => {
    const [formData, setFormData] = useState<Partial<User>>({
        email: '', username: '', displayName: '', role: 'applicant', area: undefined
    });
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({ email: user.email, username: user.username || '', displayName: user.displayName, role: user.role, area: user.area });
        } else {
            setFormData({ email: '', username: '', displayName: '', role: 'applicant', area: undefined });
        }
        setPassword('');
        setError('');
    }, [user, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (user) await api.updateUser({ ...user, ...formData } as User);
            else await api.adminCreateUser(formData as User, password);
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Create New User'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Display Name" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} required />
                <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required disabled={!!user} />
                {!user && <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />}
                <div className="grid grid-cols-2 gap-4">
                     <select className="px-4 py-3 rounded-xl border" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                        <option value="applicant">Applicant</option>
                        <option value="committee">Committee</option>
                        <option value="admin">Admin</option>
                    </select>
                    {formData.role === 'committee' && (
                        <select className="px-4 py-3 rounded-xl border" value={formData.area || ''} onChange={e => setFormData({...formData, area: e.target.value as Area})}>
                            <option value="">Select Area...</option>
                            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    )}
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <Button type="submit" className="w-full">{user ? 'Update' : 'Create'}</Button>
            </form>
        </Modal>
    );
};

// --- STAGE 1 FORMS (DIGITAL & PDF) ---

const PdfStage1Form: React.FC<{
    data: Partial<Application>;
    onChange: (d: Partial<Application>) => void;
    onSubmit: () => void;
    onCancel: () => void;
}> = ({ data, onChange, onSubmit, onCancel }) => {
    return (
        <Card className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold font-dynapuff mb-4 text-brand-purple">Stage 1: PDF Upload Mode</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-sm text-blue-700">
                    <strong>Instructions:</strong> Please download the blank EOI form, fill it out on your device, and upload the completed PDF below.
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                    <div>
                        <h3 className="font-bold">1. Download Form</h3>
                        <p className="text-sm text-gray-500">Blank Part 1 EOI Template</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open('https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%201.1%20-%20EOI%20Form%20(Part%201).pdf', '_blank')}>Download PDF</Button>
                </div>

                <div>
                    <h3 className="font-bold mb-2">2. Basic Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input label="Project Title" value={data.projectTitle} onChange={e => onChange({...data, projectTitle: e.target.value})} />
                        <Input label="Organisation" value={data.orgName} onChange={e => onChange({...data, orgName: e.target.value})} />
                         <select 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                            value={data.area} 
                            onChange={e => onChange({...data, area: e.target.value as Area})}
                        >
                            <option value="">Select Area...</option>
                            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold mb-2">3. Upload Completed Form</h3>
                    <FileUploader 
                        label="Upload EOI PDF" 
                        currentUrl={data.pdfUrl} 
                        onUpload={(url) => onChange({...data, pdfUrl: url})} 
                    />
                </div>

                <div className="flex gap-4 pt-4 border-t">
                    <Button onClick={onSubmit} disabled={!data.pdfUrl || !data.projectTitle} className="flex-1">Submit Application</Button>
                    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                </div>
            </div>
        </Card>
    );
};

const DigitalStage1Form: React.FC<{
    data: Partial<Application>;
    onChange: (newData: Partial<Application>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    readOnly?: boolean;
}> = ({ data, onChange, onSubmit, onCancel, readOnly = false }) => {
     const updateFormData = (field: string, value: any) => {
        onChange({ ...data, formData: { ...data.formData, [field]: value } });
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-purple-100 overflow-hidden max-w-5xl mx-auto">
            <div className="bg-brand-purple p-6 text-white flex justify-between items-center">
                <h2 className="text-2xl font-bold font-dynapuff">Expression of Interest (Stage 1)</h2>
                {readOnly && <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">ReadOnly</span>}
            </div>
            <form onSubmit={onSubmit} className="p-8 space-y-8">
                <section>
                    <h3 className="font-bold text-xl mb-4 border-b pb-2">1. Area & Applicant</h3>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                        {AREAS.map(area => (
                            <label key={area} className={`flex items-center gap-2 p-3 rounded border cursor-pointer ${data.area === area ? 'bg-purple-50 border-purple-500' : ''}`}>
                                <input type="radio" name="area" value={area} checked={data.area === area} onChange={() => onChange({...data, area})} disabled={readOnly} />
                                <span className="text-sm font-bold">{area}</span>
                            </label>
                        ))}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input label="Project Title" value={data.projectTitle} onChange={e => onChange({...data, projectTitle: e.target.value})} disabled={readOnly} />
                        <Input label="Organisation Name" value={data.orgName} onChange={e => onChange({...data, orgName: e.target.value})} disabled={readOnly} />
                        <Input label="Contact Name" value={data.applicantName} onChange={e => onChange({...data, applicantName: e.target.value})} disabled={readOnly} />
                        <Input label="Email" value={data.formData?.contactEmail || ''} onChange={e => updateFormData('contactEmail', e.target.value)} disabled={readOnly} />
                    </div>
                </section>

                <section>
                    <h3 className="font-bold text-xl mb-4 border-b pb-2">2. Project Details</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Summary (Max 250 words)</label>
                        <textarea className="w-full p-3 border rounded-xl h-32" value={data.summary} onChange={e => onChange({...data, summary: e.target.value})} disabled={readOnly} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input label="Total Cost (£)" type="number" value={data.totalCost} onChange={e => onChange({...data, totalCost: Number(e.target.value)})} disabled={readOnly} />
                        <Input label="Amount Requested (£)" type="number" value={data.amountRequested} onChange={e => onChange({...data, amountRequested: Number(e.target.value)})} disabled={readOnly} />
                    </div>
                </section>
                
                <section>
                     <h3 className="font-bold text-xl mb-4 border-b pb-2">3. Priorities & Alignment</h3>
                     <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold text-gray-700 mb-2">Marmot Principles</h4>
                            {MARMOT_PRINCIPLES.map(p => (
                                <label key={p} className="flex gap-2 text-sm mb-1">
                                    <input type="checkbox" checked={data.formData?.marmotPrinciples?.includes(p)} 
                                        onChange={e => {
                                            if (readOnly) return;
                                            const cur = data.formData?.marmotPrinciples || [];
                                            updateFormData('marmotPrinciples', e.target.checked ? [...cur, p] : cur.filter(x => x !== p));
                                        }} disabled={readOnly} 
                                    />
                                    {p}
                                </label>
                            ))}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-700 mb-2">WFG Goals</h4>
                             {WFG_GOALS.map(g => (
                                <label key={g} className="flex gap-2 text-sm mb-1">
                                    <input type="checkbox" checked={data.formData?.wfgGoals?.includes(g)} 
                                        onChange={e => {
                                            if (readOnly) return;
                                            const cur = data.formData?.wfgGoals || [];
                                            updateFormData('wfgGoals', e.target.checked ? [...cur, g] : cur.filter(x => x !== g));
                                        }} disabled={readOnly} 
                                    />
                                    {g}
                                </label>
                            ))}
                        </div>
                     </div>
                </section>

                <div className="flex gap-4 border-t pt-6">
                    {!readOnly && (
                        <>
                            <Button type="submit" className="flex-1">Submit EOI</Button>
                            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                        </>
                    )}
                </div>
            </form>
        </div>
    );
};

// --- STAGE 2 FORMS (DIGITAL & PDF) ---

const PdfStage2Form: React.FC<{
    data: Partial<Application>;
    onChange: (d: Partial<Application>) => void;
    onSubmit: () => void;
    onCancel: () => void;
}> = ({ data, onChange, onSubmit, onCancel }) => {
    return (
        <Card className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold font-dynapuff mb-4 text-brand-teal">Stage 2: Full App Upload Mode</h2>
            <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-6">
                <p className="text-sm text-teal-700">
                    <strong>Instructions:</strong> Download the Full Application form, complete it, and upload it here.
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                    <div>
                        <h3 className="font-bold">1. Download Form</h3>
                        <p className="text-sm text-gray-500">Blank Full Application Template</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open('https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%202.1%20-%20Full%20Application%20Form%20(Part%202)%20final.pdf', '_blank')}>Download PDF</Button>
                </div>

                <div>
                    <h3 className="font-bold mb-2">2. Upload Completed Form</h3>
                    <FileUploader 
                        label="Upload Full App PDF" 
                        currentUrl={data.stage2PdfUrl} 
                        onUpload={(url) => onChange({...data, stage2PdfUrl: url})} 
                    />
                </div>

                <div className="flex gap-4 pt-4 border-t">
                    <Button onClick={onSubmit} disabled={!data.stage2PdfUrl} className="flex-1 bg-brand-teal">Submit Full Application</Button>
                    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                </div>
            </div>
        </Card>
    );
};

const DigitalStage2Form: React.FC<{
    data: Partial<Application>;
    onChange: (newData: Partial<Application>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    readOnly?: boolean;
}> = ({ data, onChange, onSubmit, onCancel, readOnly = false }) => {
    const updateFormData = (field: string, value: any) => {
        onChange({ ...data, formData: { ...data.formData, [field]: value } });
    };

    const budgetLines: BudgetLine[] = data.formData?.budgetBreakdown || [];

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-teal-100 overflow-hidden max-w-5xl mx-auto">
             <div className="bg-brand-darkTeal p-6 text-white flex justify-between items-center">
                <h2 className="text-2xl font-bold font-dynapuff">Full Application (Stage 2)</h2>
                {readOnly && <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">ReadOnly</span>}
            </div>
            <form onSubmit={onSubmit} className="p-8 space-y-8">
                <section>
                    <h3 className="font-bold text-xl mb-4 border-b pb-2">1. Organisation & Bank Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input label="Organisation" value={data.orgName} disabled />
                        <Input label="Charity/Company No." value={data.formData?.charityNumber || ''} onChange={e => updateFormData('charityNumber', e.target.value)} disabled={readOnly} />
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border mt-4">
                        <h4 className="font-bold mb-2">Bank Details</h4>
                        <div className="grid md:grid-cols-3 gap-4">
                            <Input label="Account Name" value={data.formData?.bankAccountName || ''} onChange={e => updateFormData('bankAccountName', e.target.value)} disabled={readOnly} />
                            <Input label="Sort Code" value={data.formData?.bankSortCode || ''} onChange={e => updateFormData('bankSortCode', e.target.value)} disabled={readOnly} />
                            <Input label="Account No." value={data.formData?.bankAccountNumber || ''} onChange={e => updateFormData('bankAccountNumber', e.target.value)} disabled={readOnly} />
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="font-bold text-xl mb-4 border-b pb-2">2. Detailed Budget</h3>
                    <div className="space-y-2 mb-4">
                         {budgetLines.map((line, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input className="flex-1 p-2 border rounded" placeholder="Item" value={line.item} onChange={e => {
                                    if(readOnly) return;
                                    const nl = [...budgetLines]; nl[idx].item = e.target.value;
                                    updateFormData('budgetBreakdown', nl);
                                }} disabled={readOnly} />
                                <input className="w-24 p-2 border rounded" type="number" placeholder="Cost" value={line.cost} onChange={e => {
                                    if(readOnly) return;
                                    const nl = [...budgetLines]; nl[idx].cost = Number(e.target.value);
                                    const total = nl.reduce((sum, x) => sum + (x.cost||0), 0);
                                    onChange({...data, totalCost: total, amountRequested: total, formData: {...data.formData, budgetBreakdown: nl}});
                                }} disabled={readOnly} />
                                {!readOnly && <button type="button" className="text-red-500 font-bold px-2">X</button>}
                            </div>
                         ))}
                    </div>
                    {!readOnly && <Button type="button" variant="secondary" size="sm" onClick={() => updateFormData('budgetBreakdown', [...budgetLines, { item: '', note: '', cost: 0 }])}>+ Add Item</Button>}
                    <div className="mt-4 text-right font-bold text-xl">Total: £{data.totalCost || 0}</div>
                </section>

                <div className="flex gap-4 border-t pt-6">
                    {!readOnly && (
                        <>
                            <Button type="submit" className="flex-1 bg-brand-darkTeal">Submit Full App</Button>
                            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                        </>
                    )}
                </div>
            </form>
        </div>
    );
};

// --- SCORE MODAL ---
const ScoreModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    app: Application;
    currentUser: User;
    existingScore?: Score;
    onSubmit: (s: Score) => void;
    readOnly?: boolean;
}> = ({ isOpen, onClose, app, currentUser, existingScore, onSubmit, readOnly }) => {
    const [scores, setScores] = useState<Record<string, number>>(existingScore?.scores || {});
    const [notes, setNotes] = useState<Record<string, string>>(existingScore?.notes || {});

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
            scores, notes, isFinal: true, total: rawTotal, timestamp: Date.now()
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Score: ${app.projectTitle}`} size="xl">
            <div className="grid md:grid-cols-3 gap-6">
                 {/* App Preview Column */}
                 <div className="md:col-span-1 border-r pr-4 max-h-[70vh] overflow-y-auto">
                    <h4 className="font-bold text-brand-purple mb-4">Application Details</h4>
                    <div className="text-sm space-y-4">
                        <div><strong>Title:</strong> {app.projectTitle}</div>
                        <div><strong>Summary:</strong> {app.summary}</div>
                        <div><strong>Amount:</strong> £{app.amountRequested}</div>
                        {app.submissionMethod === 'upload' ? (
                            <a href={app.stage2PdfUrl || app.pdfUrl} target="_blank" className="block p-2 bg-blue-50 text-blue-700 rounded text-center font-bold">View PDF Application</a>
                        ) : (
                            <div className="bg-gray-100 p-2 rounded">Digital Form Data Available</div>
                        )}
                    </div>
                 </div>

                 {/* Scoring Column */}
                 <div className="md:col-span-2 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    {SCORING_CRITERIA.map((c) => (
                        <div key={c.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold">{c.name} ({c.weight}%)</h4>
                                <div className="flex gap-1">
                                    {[0, 1, 2, 3].map(val => (
                                        <button key={val} onClick={() => !readOnly && setScores(prev => ({...prev, [c.id]: val}))}
                                            className={`w-8 h-8 rounded ${scores[c.id] === val ? 'bg-brand-purple text-white' : 'bg-white border'}`} disabled={readOnly}>
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{c.guidance}</p>
                            <input className="w-full p-2 border rounded text-sm" placeholder="Comments..." value={notes[c.id]||''} onChange={e=>setNotes(p=>({...p, [c.id]:e.target.value}))} disabled={readOnly}/>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="mt-4 pt-4 border-t flex justify-between items-center bg-white sticky bottom-0">
                <div className="flex gap-4">
                     <div className="bg-purple-100 px-3 py-1 rounded text-purple-800 font-bold">Raw: {rawTotal}/30</div>
                     <div className={`px-3 py-1 rounded font-bold ${weightedTotalPercent >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {weightedTotalPercent}%
                     </div>
                </div>
                {!readOnly && <Button onClick={handleSubmit}>Submit</Button>}
            </div>
        </Modal>
    );
};

// --- DASHBOARDS ---

export const ApplicantDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [settings, setSettings] = useState<PortalSettings>({ part1Live: false, part2Live: false, scoringLive: false });
    
    // Logic State
    const [viewMode, setViewMode] = useState<'list' | 'stage1-choice' | 'stage1-digital' | 'stage1-pdf' | 'stage2-choice' | 'stage2-digital' | 'stage2-pdf'>('list');
    const [activeApp, setActiveApp] = useState<Partial<Application>>({});
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => { 
        api.getApplications().then(all => setApps(all.filter(a => a.userId === user.uid))); 
        api.getPortalSettings().then(setSettings);
    }, [user.uid, viewMode]);

    const handleSubmit = async (e: React.FormEvent | null, stage: string, method: 'digital' | 'upload') => {
        if (e) e.preventDefault();
        const status = stage === '1' ? 'Submitted-Stage1' : 'Submitted-Stage2';
        const payload = { ...activeApp, status, submissionMethod: method };
        
        if (activeApp.id) await api.updateApplication(activeApp.id, payload as any);
        else await api.createApplication({ ...payload, userId: user.uid, createdAt: Date.now() } as any);
        
        setViewMode('list');
    };

    const renderContent = () => {
        switch(viewMode) {
            case 'stage1-choice':
                return (
                    <Card className="max-w-2xl mx-auto text-center">
                        <h2 className="text-2xl font-bold font-dynapuff mb-6">Choose Submission Method</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <button onClick={() => setViewMode('stage1-digital')} className="p-6 border-2 border-purple-100 rounded-2xl hover:border-brand-purple hover:bg-purple-50 transition-all group">
                                <div className="text-4xl mb-4">💻</div>
                                <h3 className="font-bold text-lg mb-2 text-brand-purple">Digital Form</h3>
                                <p className="text-sm text-gray-500">Fill out the application directly on this website. Save as you go.</p>
                            </button>
                            <button onClick={() => setViewMode('stage1-pdf')} className="p-6 border-2 border-purple-100 rounded-2xl hover:border-brand-purple hover:bg-purple-50 transition-all group">
                                <div className="text-4xl mb-4">📄</div>
                                <h3 className="font-bold text-lg mb-2 text-brand-purple">Upload PDF</h3>
                                <p className="text-sm text-gray-500">Download the PDF form, fill it offline, and upload the completed file.</p>
                            </button>
                        </div>
                        <Button variant="ghost" className="mt-6" onClick={() => setViewMode('list')}>Cancel</Button>
                    </Card>
                );
            case 'stage1-digital':
                return <DigitalStage1Form data={activeApp} onChange={setActiveApp} onSubmit={(e) => handleSubmit(e, '1', 'digital')} onCancel={() => setViewMode('list')} />;
            case 'stage1-pdf':
                return <PdfStage1Form data={activeApp} onChange={setActiveApp} onSubmit={() => handleSubmit(null, '1', 'upload')} onCancel={() => setViewMode('list')} />;
            
            case 'stage2-choice':
                return (
                    <Card className="max-w-2xl mx-auto text-center border-teal-200">
                        <h2 className="text-2xl font-bold font-dynapuff mb-6 text-brand-teal">Stage 2 Submission Method</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <button onClick={() => setViewMode('stage2-digital')} className="p-6 border-2 border-teal-100 rounded-2xl hover:border-brand-teal hover:bg-teal-50 transition-all">
                                <div className="text-4xl mb-4">💻</div>
                                <h3 className="font-bold text-lg mb-2 text-brand-teal">Digital Form</h3>
                            </button>
                            <button onClick={() => setViewMode('stage2-pdf')} className="p-6 border-2 border-teal-100 rounded-2xl hover:border-brand-teal hover:bg-teal-50 transition-all">
                                <div className="text-4xl mb-4">📄</div>
                                <h3 className="font-bold text-lg mb-2 text-brand-teal">Upload PDF</h3>
                            </button>
                        </div>
                        <Button variant="ghost" className="mt-6" onClick={() => setViewMode('list')}>Cancel</Button>
                    </Card>
                );
            case 'stage2-digital':
                 return <DigitalStage2Form data={activeApp} onChange={setActiveApp} onSubmit={(e) => handleSubmit(e, '2', 'digital')} onCancel={() => setViewMode('list')} />;
            case 'stage2-pdf':
                 return <PdfStage2Form data={activeApp} onChange={setActiveApp} onSubmit={() => handleSubmit(null, '2', 'upload')} onCancel={() => setViewMode('list')} />;
            
            default:
                return (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-xl">My Applications</h2>
                            {settings.part1Live && (
                                <Button onClick={() => { setActiveApp({ userId: user.uid, status: 'Draft', formData: { budgetBreakdown: [] } }); setViewMode('stage1-choice'); }}>
                                    + Start New Application
                                </Button>
                            )}
                        </div>
                        {apps.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                                <p className="text-gray-500">You haven't submitted any applications yet.</p>
                                {!settings.part1Live && <p className="text-red-500 font-bold mt-2">Stage 1 Applications are currently CLOSED.</p>}
                            </div>
                        ) : (
                            apps.map(app => (
                                <div key={app.id} className="bg-white border p-6 rounded-xl mb-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-lg text-brand-purple">{app.projectTitle || 'Untitled Project'}</h3>
                                            <StatusBadge status={app.status} />
                                        </div>
                                        <p className="text-sm text-gray-500">Ref: {app.ref} • Method: {app.submissionMethod === 'upload' ? 'PDF Upload' : 'Digital Form'}</p>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        {/* Stage 1 Edits */}
                                        {app.status === 'Draft' && (
                                            <Button size="sm" onClick={() => { setActiveApp(app); setViewMode(app.submissionMethod === 'upload' ? 'stage1-pdf' : 'stage1-digital'); }}>Edit Stage 1</Button>
                                        )}
                                        
                                        {/* Stage 2 Trigger */}
                                        {(app.status === 'Invited-Stage2' && settings.part2Live) && (
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-xs font-bold text-green-600 animate-pulse">🌟 You are invited to Stage 2!</span>
                                                <Button size="sm" variant="secondary" onClick={() => { setActiveApp(app); setViewMode('stage2-choice'); }}>Start Stage 2</Button>
                                            </div>
                                        )}
                                        
                                        {app.status === 'Submitted-Stage2' && <span className="text-sm font-bold text-gray-400">Under Review</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                );
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-dynapuff">Applicant Dashboard</h1>
                <Button onClick={() => setIsProfileOpen(true)} variant="outline">Profile</Button>
            </div>
            {renderContent()}
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onSave={() => window.location.reload()} />
        </div>
    );
};

export const CommitteeDashboard: React.FC<{ user: User, onUpdateUser: (u:User)=>void, isAdmin?: boolean, onReturnToAdmin?: ()=>void }> = ({ user, isAdmin, onReturnToAdmin }) => {
    const [apps, setApps] = useState<Application[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);

    useEffect(() => {
        const load = async () => {
             const allApps = await api.getApplications(isAdmin ? 'All' : user.area);
             // Committee only sees Finalists
             setApps(allApps.filter(a => a.status === 'Finalist'));
             setScores((await api.getScores()).filter(s => s.scorerId === user.uid));
        };
        load();
    }, [user.area, user.uid, isAdmin]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                 <h1 className="text-3xl font-bold font-dynapuff">Committee Dashboard {isAdmin && '(Admin View)'}</h1>
                 {isAdmin && <Button onClick={onReturnToAdmin}>Return to Admin</Button>}
            </div>
            
            {apps.length === 0 ? (
                 <div className="text-center p-12 bg-white rounded-xl shadow">
                    <h3 className="text-xl font-bold text-gray-400">No applications are currently ready for scoring.</h3>
                    <p className="text-gray-500">Please wait for the administrator to release Stage 2 applications.</p>
                 </div>
            ) : (
                <div className="grid gap-4">
                    {apps.map(app => {
                        const sc = scores.find(s => s.appId === app.id);
                        return (
                            <Card key={app.id}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-xl">{app.projectTitle}</h3>
                                            <Badge variant="teal">Ready to Score</Badge>
                                        </div>
                                        <p className="text-sm text-gray-500">{app.orgName} • £{app.amountRequested}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {sc && <span className="text-green-600 font-bold">Scored: {sc.total}/30</span>}
                                        <Button onClick={() => setSelectedApp(app)}>{sc ? 'Update Score' : 'Score Application'}</Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
            
            {selectedApp && (
                <ScoreModal 
                    isOpen={!!selectedApp} 
                    onClose={() => setSelectedApp(null)} 
                    app={selectedApp} 
                    currentUser={user}
                    existingScore={scores.find(s => s.appId === selectedApp.id)}
                    onSubmit={async (s) => {
                        await api.saveScore(s);
                        // Reload scores locally
                        setScores([...scores.filter(sc => sc.appId !== s.appId), s]);
                    }}
                />
            )}
        </div>
    );
};

export const AdminDashboard: React.FC<{ onNavigatePublic: (v:string)=>void, onNavigateScoring: ()=>void }> = ({ onNavigatePublic, onNavigateScoring }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [apps, setApps] = useState<Application[]>([]);
    const [settings, setSettings] = useState<PortalSettings>({ part1Live: false, part2Live: false, scoringLive: false });
    const [activeTab, setActiveTab] = useState('overview');
    const [isSeeding, setIsSeeding] = useState(false);
    
    // Admin Action States
    const [editingApp, setEditingApp] = useState<Application | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    const refresh = async () => { 
        setUsers(await api.getUsers());
        setApps(await api.getApplications('All'));
        setSettings(await api.getPortalSettings());
    };
    
    useEffect(() => { refresh(); }, []);

    // --- Admin Actions ---
    const toggleSetting = async (key: keyof PortalSettings) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        await api.updatePortalSettings(newSettings);
        setSettings(newSettings);
    };

    const updateStatus = async (appId: string, status: AppStatus) => {
        if(!confirm(`Are you sure you want to change status to ${status}?`)) return;
        await api.updateApplication(appId, { status } as any);
        refresh();
    };

    const deleteApp = async (appId: string) => {
        if(!confirm("DELETE Application? This cannot be undone.")) return;
        await api.deleteApplication(appId);
        refresh();
    };

    const handleSeed = async () => {
        if(!confirm("Overwrite DB with Demo Data?")) return;
        setIsSeeding(true);
        try { await seedDatabase(); refresh(); alert("Done"); }
        catch(e:any) { alert(e.message); }
        finally { setIsSeeding(false); }
    };

    // Filtered lists
    const stage1Apps = apps.filter(a => ['Submitted-Stage1', 'Draft'].includes(a.status));
    const stage2Apps = apps.filter(a => ['Invited-Stage2', 'Submitted-Stage2', 'Finalist', 'Funded', 'Rejected'].includes(a.status));

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-dynapuff text-brand-purple">Admin Control Center</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onNavigatePublic('home')}>Public Site</Button>
                    <Button onClick={onNavigateScoring}>Committee View</Button>
                </div>
            </div>

            {/* --- MASTER CONTROL PANEL --- */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className={`border-l-8 ${settings.part1Live ? 'border-green-500' : 'border-red-500'}`}>
                    <h3 className="font-bold text-gray-500 uppercase text-xs">Stage 1 (EOI)</h3>
                    <div className="flex justify-between items-center mt-2">
                        <span className={`text-xl font-bold ${settings.part1Live ? 'text-green-700' : 'text-red-700'}`}>
                            {settings.part1Live ? 'LIVE' : 'CLOSED'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={settings.part1Live} onChange={() => toggleSetting('part1Live')} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                </Card>

                <Card className={`border-l-8 ${settings.part2Live ? 'border-amber-500' : 'border-red-500'}`}>
                    <h3 className="font-bold text-gray-500 uppercase text-xs">Stage 2 (Full App)</h3>
                    <div className="flex justify-between items-center mt-2">
                        <span className={`text-xl font-bold ${settings.part2Live ? 'text-amber-700' : 'text-red-700'}`}>
                            {settings.part2Live ? 'OPEN TO INVITED' : 'CLOSED'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={settings.part2Live} onChange={() => toggleSetting('part2Live')} />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-amber-500 after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Controls visibility for 'Invited' applicants</p>
                </Card>

                <Card className="border-l-8 border-purple-500">
                    <h3 className="font-bold text-gray-500 uppercase text-xs">Database</h3>
                    <div className="flex justify-between items-center mt-2">
                         <span className="text-lg font-bold">Data Management</span>
                         <Button size="sm" onClick={handleSeed} disabled={isSeeding}>{isSeeding ? 'Seeding...' : 'Seed / Reset'}</Button>
                    </div>
                </Card>
            </div>

            <div className="flex gap-4 mb-6 border-b">
                {['overview', 'stage1', 'stage2', 'users'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === t ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        {t.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* --- VIEW: STAGE 1 MANAGEMENT --- */}
            {activeTab === 'stage1' && (
                <Card>
                    <h3 className="font-bold text-xl mb-4">Stage 1 Applications (EOI)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase"><th className="p-3">Ref</th><th className="p-3">Project</th><th className="p-3">Status</th><th className="p-3">Method</th><th className="p-3">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {stage1Apps.map(a => (
                                    <tr key={a.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono text-sm">{a.ref}</td>
                                        <td className="p-3 font-bold">{a.projectTitle}</td>
                                        <td className="p-3"><StatusBadge status={a.status} /></td>
                                        <td className="p-3 text-sm">{a.submissionMethod}</td>
                                        <td className="p-3 flex gap-2">
                                            {a.status === 'Submitted-Stage1' && (
                                                <>
                                                    <Button size="sm" onClick={() => updateStatus(a.id, 'Invited-Stage2')}>Accept (Invite Stage 2)</Button>
                                                    <Button size="sm" variant="danger" onClick={() => updateStatus(a.id, 'Rejected-Stage1')}>Reject</Button>
                                                </>
                                            )}
                                            <Button size="sm" variant="ghost" onClick={() => setEditingApp(a)}>Edit</Button>
                                            <button onClick={() => deleteApp(a.id)} className="text-red-400 hover:text-red-600 text-xs font-bold px-2">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* --- VIEW: STAGE 2 MANAGEMENT --- */}
            {activeTab === 'stage2' && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl">Stage 2 Applications (Full)</h3>
                        <Button size="sm" variant="secondary" onClick={() => {
                            if(confirm("Release ALL 'Submitted-Stage2' apps to Committee?")) {
                                apps.filter(a => a.status === 'Submitted-Stage2').forEach(a => api.updateApplication(a.id, {status: 'Finalist'} as any));
                                setTimeout(refresh, 1000);
                            }
                        }}>Bulk Release to Committee</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase"><th className="p-3">Ref</th><th className="p-3">Project</th><th className="p-3">Status</th><th className="p-3">Stage 2 File</th><th className="p-3">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {stage2Apps.map(a => (
                                    <tr key={a.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono text-sm">{a.ref}</td>
                                        <td className="p-3">
                                            <div className="font-bold">{a.projectTitle}</div>
                                            <div className="text-xs text-gray-500">{a.orgName}</div>
                                        </td>
                                        <td className="p-3"><StatusBadge status={a.status} /></td>
                                        <td className="p-3 text-sm">
                                            {a.submissionMethod === 'upload' 
                                                ? <a href={a.stage2PdfUrl} target="_blank" className="text-blue-600 underline">View PDF</a> 
                                                : 'Digital Data'}
                                        </td>
                                        <td className="p-3 flex gap-2">
                                            {a.status === 'Submitted-Stage2' && (
                                                <Button size="sm" variant="secondary" onClick={() => updateStatus(a.id, 'Finalist')}>Release to Committee</Button>
                                            )}
                                            {a.status === 'Finalist' && (
                                                <span className="text-xs font-bold text-green-600">With Committee</span>
                                            )}
                                            <Button size="sm" variant="ghost" onClick={() => setEditingApp(a)}>Edit</Button>
                                            <Button size="sm" variant="danger" onClick={() => updateStatus(a.id, 'Withdrawn')}>Withdraw</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* --- VIEW: USERS MANAGEMENT (RESTORED) --- */}
            {activeTab === 'users' && (
                <Card>
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold">Users</h3>
                        <Button size="sm" onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}>+ User</Button>
                    </div>
                    <table className="w-full text-left">
                        <thead><tr className="border-b"><th className="p-2">Name</th><th className="p-2">Role</th><th className="p-2">Actions</th></tr></thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.uid} className="border-b">
                                    <td className="p-2">{u.displayName}</td>
                                    <td className="p-2"><Badge>{u.role}</Badge></td>
                                    <td className="p-2">
                                        <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="text-blue-600 font-bold mr-2">Edit</button>
                                        <button onClick={async () => { if(confirm('Delete?')) { await api.deleteUser(u.uid); refresh(); }}} className="text-red-600 font-bold">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <UserFormModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} user={editingUser} onSave={refresh} />
                </Card>
            )}

            {/* --- VIEW: OVERVIEW --- */}
            {activeTab === 'overview' && (
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-purple-50 to-white">
                        <h3 className="font-bold text-xl mb-4 text-brand-purple">Process Status</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b pb-2">
                                <span>Part 1 EOI</span>
                                <span className={settings.part1Live ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{settings.part1Live ? 'Active' : 'Closed'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span>Part 2 Invitations</span>
                                <span className={settings.part2Live ? 'text-green-600 font-bold' : 'text-gray-400 font-bold'}>{settings.part2Live ? 'Enabled' : 'Paused'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Pending EOI Reviews</span>
                                <span className="font-bold">{apps.filter(a => a.status === 'Submitted-Stage1').length}</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Pending Stage 2 Reviews</span>
                                <span className="font-bold">{apps.filter(a => a.status === 'Submitted-Stage2').length}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {editingApp && (
                <Modal isOpen={!!editingApp} onClose={() => setEditingApp(null)} title="Admin Edit Mode" size="xl">
                    <div className="p-4">
                        <h3 className="font-bold mb-4 text-red-600">⚠ You are editing a live application.</h3>
                        <DigitalStage1Form 
                            data={editingApp} 
                            onChange={setEditingApp} 
                            onSubmit={(e) => {
                                e.preventDefault();
                                api.updateApplication(editingApp.id, editingApp as any);
                                setEditingApp(null);
                                refresh();
                            }} 
                            onCancel={() => setEditingApp(null)} 
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
};
