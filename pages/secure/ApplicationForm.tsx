
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SecureLayout } from '../../components/Layout';
import { AuthService, DataService, AdminService } from '../../services/firebase';
import { User, UserRole, Application, BudgetLine } from '../../types';
import { WFG_GOALS, MARMOT_PRINCIPLES, AREA_DATA } from '../../constants';
// Added missing icons: FileText, Database, XCircle, Plus
import { Save, ArrowLeft, Send, CheckCircle, AlertTriangle, Lock, Eye, Building, Phone, Mail, MapPin, FileText, Database, XCircle, Plus } from 'lucide-react';

const ApplicationForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<Partial<Application>>({
    ref: '',
    applicant: '',
    projectTitle: '',
    projectSummary: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    beneficiaries: '',
    timescale: '',
    amountRequest: 0,
    totalCost: 0,
    area: '',
    selectedWfgGoals: [],
    wfgJustifications: {},
    selectedMarmotPrinciples: [],
    marmotJustifications: {},
    projectPlan: '',
    communityInvolvement: '',
    collaboration: '',
    sustainability: '',
    inclusionStrategy: '',
    monitoringEvaluation: '',
    risksChallenges: '',
    budgetBreakdown: [],
    status: 'Draft',
    stage: 'EOI'
  });

  const [budgetLine, setBudgetLine] = useState<BudgetLine>({ item: '', amount: 0 });

  useEffect(() => {
    const u = AuthService.getCurrentUser();
    if (!u) { navigate('/login'); return; }
    setUser(u);
    
    if (id?.startsWith('PREVIEW-')) {
      setIsPreview(true);
      setIsReadOnly(true);
      setFormData(prev => ({
        ...prev,
        ref: id,
        applicant: "Preview Charity",
        projectTitle: "Sample Simulation Title",
        stage: id === 'PREVIEW-EOI' ? 'EOI' : 'Part 2',
        status: 'Draft'
      }));
      return;
    }

    if (id && id !== 'new') {
      setLoading(true);
      DataService.getApplications(u).then(apps => {
        const found = apps.find(a => a.ref === id);
        if (found) {
          setFormData(found);
          const isOwner = found.applicantUid === u.uid;
          const isAdmin = u.role === UserRole.ADMIN;
          setIsReadOnly(!isOwner && !isAdmin);
        } else { setError('Record not located in system.'); }
        setLoading(false);
      });
    } else if (id === 'new') {
      setFormData(prev => ({ ...prev, applicantUid: u.uid }));
    }
  }, [id, navigate]);

  const handleChange = (field: keyof Application, value: any) => {
    if (isReadOnly && !isPreview) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSelection = (field: 'selectedWfgGoals' | 'selectedMarmotPrinciples', sid: string) => {
    if (isReadOnly) return;
    const current = (formData[field] as string[]) || [];
    const updated = current.includes(sid) ? current.filter(x => x !== sid) : [...current, sid];
    handleChange(field, updated);
  };

  const handleJustificationChange = (type: 'wfg' | 'marmot', id: string, text: string) => {
    if (isReadOnly) return;
    const field = type === 'wfg' ? 'wfgJustifications' : 'marmotJustifications';
    const current = (formData[field] as Record<string, string>) || {};
    const updated = { ...current, [id]: text };
    handleChange(field, updated);
  };

  const addBudgetLine = () => {
    if (!budgetLine.item || budgetLine.amount <= 0) return;
    const current = formData.budgetBreakdown || [];
    handleChange('budgetBreakdown', [...current, budgetLine]);
    setBudgetLine({ item: '', amount: 0 });
  };

  const removeBudgetLine = (index: number) => {
    if (isReadOnly) return;
    const current = formData.budgetBreakdown || [];
    handleChange('budgetBreakdown', current.filter((_, i) => i !== index));
  };

  const saveAction = async () => {
    try {
      if (id === 'new') {
        const res = await AdminService.addApplication(formData);
        navigate(`/portal/application/${res.ref}`, { replace: true });
        alert("EOI Draft Initialized.");
      } else {
        await AdminService.updateApplication(formData as Application);
        alert("Application progress saved.");
      }
    } catch (e) { alert("An error occurred during preservation."); }
  };

  const handleSubmit = async () => {
    if (window.confirm("Ready for submission? This will lock your entry for internal review.")) {
      await AdminService.updateApplicationStatus(formData.ref!, 'Submitted');
      alert("Application sent successfully.");
      navigate('/portal/dashboard');
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-purple-600 font-display text-xl animate-pulse">Syncing system records...</div>;
  if (!user) return null;

  return (
    <SecureLayout userRole={user.role}>
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-purple-600 flex items-center font-bold text-sm transition">
          <ArrowLeft size={16} className="mr-1"/> Return to List
        </button>
        {isPreview && <div className="bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-[10px] font-bold shadow-sm ring-1 ring-amber-200 uppercase tracking-widest">Logic Audit Simulation</div>}
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 animate-fade-in">
        {/* Header Block */}
        <div className="bg-purple-900 text-white p-6 md:p-10 relative">
           <div className="flex justify-between items-start">
              <div className="max-w-3xl">
                 <div className="flex items-center gap-2 mb-3">
                    <span className="bg-purple-700 px-3 py-1 rounded-lg text-[10px] font-bold font-mono uppercase tracking-widest">{formData.stage} Phase</span>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${formData.status === 'Draft' ? 'bg-teal-500 text-white' : 'bg-blue-500 text-white'}`}>{formData.status}</span>
                 </div>
                 <h1 className="text-3xl md:text-4xl font-bold font-display leading-tight">{formData.projectTitle || 'Enter Project Identification'}</h1>
                 <p className="text-purple-200 text-lg mt-2 font-medium">{formData.applicant || 'Organization Identity PENDING'}</p>
              </div>
              <div className="bg-purple-800/50 backdrop-blur-md p-4 rounded-2xl text-center hidden md:block ring-1 ring-purple-600/50">
                 <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-1">System Identifier</p>
                 <p className="font-mono text-lg font-bold">{formData.ref || 'GENERATING...'}</p>
              </div>
           </div>
        </div>

        <div className="p-6 md:p-12 space-y-16">
           {/* PART 1: CORE EOI DATA */}
           <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-purple-100 pb-4">
                 <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><FileText size={20}/></div>
                 <h2 className="text-xl font-bold text-purple-900 font-display">Part 1: Primary Identification & Concept</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest flex items-center gap-1"><Building size={12}/> Legal Organization Name</label>
                    <input className="w-full p-3.5 border-2 border-gray-100 rounded-xl focus:border-purple-400 focus:ring-0 transition bg-gray-50/30" value={formData.applicant} onChange={e => handleChange('applicant', e.target.value)} readOnly={isReadOnly} placeholder="Official group or group lead name..." />
                 </div>
                 <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Brief Project Title</label>
                    <input className="w-full p-3.5 border-2 border-gray-100 rounded-xl focus:border-purple-400 focus:ring-0 transition" value={formData.projectTitle} onChange={e => handleChange('projectTitle', e.target.value)} readOnly={isReadOnly} placeholder="A short, catchy name for your project..." />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest flex items-center gap-1"><Mail size={12}/> Representative Email</label>
                    <input className="w-full p-3.5 border-2 border-gray-100 rounded-xl focus:border-purple-400 transition" value={formData.email} onChange={e => handleChange('email', e.target.value)} readOnly={isReadOnly} placeholder="primary@contact.org" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest flex items-center gap-1"><Phone size={12}/> Contact Number</label>
                    <input className="w-full p-3.5 border-2 border-gray-100 rounded-xl focus:border-purple-400 transition" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} readOnly={isReadOnly} placeholder="01495 000000" />
                 </div>
                 <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Project Summary (EOI Intake)</label>
                    <textarea rows={4} className="w-full p-3.5 border-2 border-gray-100 rounded-xl focus:border-purple-400 transition resize-none" value={formData.projectSummary} onChange={e => handleChange('projectSummary', e.target.value)} readOnly={isReadOnly} placeholder="Briefly describe what you want to achieve and why it matters..." />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Communities' Choice Funding Target (£)</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">£</span>
                       <input type="number" className="w-full pl-8 p-3.5 border-2 border-gray-100 rounded-xl font-bold text-purple-700" value={formData.amountRequest} onChange={e => handleChange('amountRequest', parseFloat(e.target.value))} readOnly={isReadOnly} />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Geographical Target Zone</label>
                    <select className="w-full p-3.5 border-2 border-gray-100 rounded-xl bg-white focus:border-purple-400 transition" value={formData.area} onChange={e => handleChange('area', e.target.value)} disabled={isReadOnly}>
                       <option value="">-- Choose Impact Area --</option>
                       {Object.keys(AREA_DATA).map(k => <option key={k} value={AREA_DATA[k].name}>{AREA_DATA[k].name}</option>)}
                    </select>
                 </div>

                 {/* EOI PHASE: STRATEGIC CHECKBOXES */}
                 <div className="md:col-span-2 pt-6">
                    <h3 className="text-sm font-bold text-purple-900 mb-4 uppercase tracking-widest font-display">Phase 1 Alignment Checkbox</h3>
                    <p className="text-xs text-gray-500 mb-6 italic">Select the goals your project aligns with. Justifications will only be requested if you are taken forward to Part 2.</p>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-10">
                       {WFG_GOALS.map(goal => (
                         <div key={goal.id} onClick={() => toggleSelection('selectedWfgGoals', goal.id)} className={`p-5 rounded-2xl border-2 transition-all flex items-start cursor-pointer group ${formData.selectedWfgGoals?.includes(goal.id) ? 'bg-teal-50 border-teal-400 shadow-sm' : 'bg-white border-gray-100 hover:border-purple-200'}`}>
                            <div className={`w-5 h-5 rounded-md border-2 mt-0.5 mr-4 flex items-center justify-center shrink-0 transition-colors ${formData.selectedWfgGoals?.includes(goal.id) ? 'bg-teal-500 border-teal-500' : 'bg-gray-50 border-gray-200 group-hover:border-purple-300'}`}>{formData.selectedWfgGoals?.includes(goal.id) && <CheckCircle size={14} className="text-white"/>}</div>
                            <div><p className="text-sm font-bold text-gray-800">{goal.label}</p><p className="text-[10px] text-gray-500 mt-1 leading-tight">{goal.desc}</p></div>
                         </div>
                       ))}
                    </div>

                    <h3 className="text-sm font-bold text-purple-900 mb-4 uppercase tracking-widest font-display">Marmot Health Equity Principles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                       {MARMOT_PRINCIPLES.map(p => (
                         <div key={p.id} onClick={() => toggleSelection('selectedMarmotPrinciples', p.id)} className={`p-4 rounded-xl border-2 text-[10px] font-bold cursor-pointer transition-all flex items-center group ${formData.selectedMarmotPrinciples?.includes(p.id) ? 'bg-purple-50 border-purple-400 text-purple-800 shadow-sm' : 'bg-white border-gray-100 hover:border-purple-200 text-gray-600'}`}>
                            <div className={`w-4 h-4 rounded-sm mr-3 shrink-0 border-2 transition-colors ${formData.selectedMarmotPrinciples?.includes(p.id) ? 'bg-purple-600 border-purple-600' : 'bg-gray-50 border-gray-200 group-hover:border-purple-300'}`}></div>
                            {p.label}
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </section>

           {/* PART 2: FULL DELIVERY, BUDGET & JUSTIFICATIONS */}
           {(formData.stage === 'Part 2' || user.role === UserRole.ADMIN) && (
             <section className="space-y-12 animate-slide-in bg-gray-50/50 -mx-6 md:-mx-12 p-6 md:p-12 border-y-2 border-gray-100">
                <div className="flex items-center gap-3 border-b border-teal-100 pb-4">
                   <div className="bg-teal-100 p-2 rounded-lg text-teal-600"><Database size={20}/></div>
                   <h2 className="text-xl font-bold text-teal-900 font-display">Part 2: Full Delivery Detail & Strategic Justifications</h2>
                </div>
                
                {/* DYNAMIC JUSTIFICATION FIELDS */}
                <div className="space-y-10">
                   {(formData.selectedWfgGoals || []).length > 0 && (
                     <div className="space-y-6">
                        <h4 className="text-sm font-bold text-teal-800 flex items-center gap-2 uppercase tracking-widest"><CheckCircle size={16} className="text-teal-500"/> WFG Goal Justifications</h4>
                        <div className="grid gap-6">
                           {formData.selectedWfgGoals?.map(gid => {
                             const goal = WFG_GOALS.find(g => g.id === gid);
                             return (
                               <div key={gid} className="bg-white p-6 rounded-2xl border-2 border-teal-50 shadow-sm hover:border-teal-200 transition">
                                  <label className="block text-xs font-bold text-teal-900 mb-3 tracking-wide">{goal?.label}</label>
                                  <textarea 
                                    className="w-full p-4 text-sm border-2 border-gray-50 rounded-xl bg-gray-50/30 focus:bg-white focus:border-teal-400 transition" 
                                    rows={3} 
                                    placeholder={`Please justify how your project meaningfully contributes to ${goal?.label}...`}
                                    value={formData.wfgJustifications?.[gid] || ''}
                                    onChange={e => handleJustificationChange('wfg', gid, e.target.value)}
                                    readOnly={isReadOnly}
                                  />
                               </div>
                             );
                           })}
                        </div>
                     </div>
                   )}

                   {(formData.selectedMarmotPrinciples || []).length > 0 && (
                     <div className="space-y-6">
                        <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2 uppercase tracking-widest"><CheckCircle size={16} className="text-purple-500"/> Marmot Principle Justifications</h4>
                        <div className="grid gap-6">
                           {formData.selectedMarmotPrinciples?.map(pid => {
                             const principle = MARMOT_PRINCIPLES.find(p => p.id === pid);
                             return (
                               <div key={pid} className="bg-white p-6 rounded-2xl border-2 border-purple-50 shadow-sm hover:border-purple-200 transition">
                                  <label className="block text-xs font-bold text-purple-900 mb-3 tracking-wide">{principle?.label}</label>
                                  <textarea 
                                    className="w-full p-4 text-sm border-2 border-gray-50 rounded-xl bg-gray-50/30 focus:bg-white focus:border-purple-400 transition" 
                                    rows={3} 
                                    placeholder={`Please justify how your project addresses the principle of: ${principle?.label}...`}
                                    value={formData.marmotJustifications?.[pid] || ''}
                                    onChange={handleJustificationChange.bind(null, 'marmot', pid, '') /* Re-binding for better change handling */}
                                    onBlur={e => handleJustificationChange('marmot', pid, e.target.value)}
                                    defaultValue={formData.marmotJustifications?.[pid] || ''}
                                    readOnly={isReadOnly}
                                  />
                               </div>
                             );
                           })}
                        </div>
                     </div>
                   )}

                   <div className="pt-6 space-y-8">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Full Delivery Methodology & Milestones</label>
                        <textarea rows={8} className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-white focus:border-teal-400 transition" value={formData.projectPlan} onChange={e => handleChange('projectPlan', e.target.value)} readOnly={isReadOnly} placeholder="Step-by-step how the project will be delivered, including specific dates and milestones..." />
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Partnerships & Strategic Collaboration</label>
                          <textarea rows={4} className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-white focus:border-teal-400 transition" value={formData.collaboration} onChange={e => handleChange('collaboration', e.target.value)} readOnly={isReadOnly} placeholder="Who are you working with? Name local groups or statutory bodies..." />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Long-Term Sustainability & Community Legacy</label>
                          <textarea rows={4} className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-white focus:border-teal-400 transition" value={formData.sustainability} onChange={e => handleChange('sustainability', e.target.value)} readOnly={isReadOnly} placeholder="What happens after this funding is spent? How will the benefits continue?" />
                        </div>
                      </div>

                      <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm">
                         <div className="flex justify-between items-center mb-6">
                            <h4 className="font-bold text-gray-800 text-lg font-display">Itemized Project Expenditure</h4>
                            <div className="text-right">
                               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Running Total</p>
                               <p className="text-2xl font-bold text-purple-700 font-display">£{(formData.budgetBreakdown || []).reduce((s,l) => s + l.amount, 0).toLocaleString()}</p>
                            </div>
                         </div>
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                               <thead className="bg-gray-50 border-b-2 border-gray-100">
                                  <tr><th className="px-4 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Item Description</th><th className="px-4 py-3 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Quantity/Cost (£)</th>{!isReadOnly && <th className="px-4 py-3 w-12"></th>}</tr>
                               </thead>
                               <tbody className="divide-y divide-gray-50">
                                  {(formData.budgetBreakdown || []).map((line, idx) => (
                                     <tr key={idx} className="group hover:bg-gray-50 transition"><td className="px-4 py-3 text-gray-700 font-medium">{line.item}</td><td className="px-4 py-3 text-right font-mono font-bold text-purple-900">£{line.amount.toFixed(2)}</td>{!isReadOnly && <td className="px-4 py-3 text-right"><button onClick={() => removeBudgetLine(idx)} className="text-red-300 hover:text-red-600 transition-colors"><XCircle size={20}/></button></td>}</tr>
                                  ))}
                                  {(formData.budgetBreakdown || []).length === 0 && (
                                     <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400 italic">No budget items added yet. Use the inputs below.</td></tr>
                                  )}
                               </tbody>
                            </table>
                         </div>
                         {!isReadOnly && (
                            <div className="mt-8 flex flex-col md:flex-row gap-3 bg-purple-50/50 p-4 rounded-2xl border-2 border-dashed border-purple-200">
                               <input className="flex-grow p-3 border-2 border-white rounded-xl text-sm focus:border-purple-400 shadow-sm" placeholder="Expense Item Name (e.g. Venue Hire)" value={budgetLine.item} onChange={e => setBudgetLine({...budgetLine, item: e.target.value})} />
                               <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">£</span>
                                  <input className="w-full md:w-32 pl-7 p-3 border-2 border-white rounded-xl text-sm focus:border-purple-400 shadow-sm font-bold" type="number" placeholder="0.00" value={budgetLine.amount} onChange={e => setBudgetLine({...budgetLine, amount: parseFloat(e.target.value) || 0})} />
                               </div>
                               <button onClick={addBudgetLine} className="bg-purple-600 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-md hover:bg-purple-700 transition flex items-center justify-center gap-2 whitespace-nowrap"><Plus size={14}/> Add Line</button>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
             </section>
           )}

           {/* ACTIONS BAR */}
           {!isReadOnly && (
             <div className="flex flex-col md:flex-row justify-end gap-4 pt-10 border-t-2 border-gray-100">
                <button onClick={saveAction} className="px-8 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm hover:bg-gray-200 transition shadow-sm">Save Work In Progress</button>
                <button onClick={handleSubmit} className="px-10 py-3.5 bg-purple-600 text-white font-bold rounded-2xl text-sm shadow-xl flex items-center justify-center gap-2 hover:bg-purple-800 transition transform hover:-translate-y-0.5"><Send size={16}/> Final Submission</button>
             </div>
           )}
           
           {isReadOnly && !isPreview && (
             <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center max-w-2xl mx-auto">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><Lock size={32}/></div>
                <h3 className="text-xl font-bold text-gray-700 mb-2 font-display">Record is Read-Only</h3>
                <p className="text-sm text-gray-500">This application has been finalized or is currently under committee evaluation. Edits are disabled until the next phase notification.</p>
             </div>
           )}
        </div>
      </div>
    </SecureLayout>
  );
};

export default ApplicationForm;
