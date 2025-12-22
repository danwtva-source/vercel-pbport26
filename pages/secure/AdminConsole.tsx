import React, { useState, useEffect } from 'react';
import { SecureLayout } from '../../components/Layout';
import { AuthService, AdminService, DataService } from '../../services/firebase';
import { User, UserRole, Application, Round, MasterTask, SystemSettings } from '../../types';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, BarChart3, Settings, AlertTriangle, FileText, 
  Database, Eye, Plus, Trash2, Download, CheckCircle, XCircle,
  ShieldAlert, RefreshCw, Edit, Save, X, Search, Briefcase, ArrowRight
} from 'lucide-react';
import { AREA_DATA } from '../../constants';

const AdminConsole: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rounds' | 'apps' | 'previews' | 'system'>('overview');
  
  const [apps, setApps] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [appSearch, setAppSearch] = useState('');

  // Edit states
  const [editingRound, setEditingRound] = useState<Partial<Round> | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  useEffect(() => {
    const u = AuthService.getCurrentUser();
    if (!u || u.role !== UserRole.ADMIN) { navigate('/login'); return; }
    setUser(u);
    loadData(u);
  }, []);

  const loadData = async (u: User) => {
    setLoading(true);
    const [allApps, allUsers, allRounds, sysSettings] = await Promise.all([
      DataService.getApplications(u),
      AdminService.getAllUsers(),
      AdminService.getRounds(),
      DataService.getSystemSettings()
    ]);
    setApps(allApps);
    setUsers(allUsers);
    setRounds(allRounds);
    setSettings(sysSettings);
    setLoading(false);
  };

  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await AdminService.updateSystemSettings(updated);
  };

  const getMasterTasks = (): MasterTask[] => {
    const tasks: MasterTask[] = [];
    apps.forEach(a => {
      if (a.status === 'Submitted' && a.stage === 'EOI') {
        tasks.push({ 
          id: a.ref, 
          type: 'review_eoi', 
          priority: 'high', 
          title: `Review EOI: ${a.applicant}`, 
          description: `Review eligibility for EOI: ${a.ref}`,
          area: a.area, 
          targetRef: a.ref 
        });
      }
      if (a.status === 'Submitted' && a.stage === 'Part 2') {
        tasks.push({ 
          id: a.ref, 
          type: 'score_app', 
          priority: 'medium', 
          title: `Ready for Scoring: ${a.applicant}`, 
          description: `Score Part 2 app: ${a.ref}`,
          area: a.area, 
          targetRef: a.ref 
        });
      }
    });
    return tasks;
  };

  // --- CRUD ACTIONS ---
  const deleteApp = async (ref: string) => {
    if (window.confirm("Delete this application forever?")) {
      await AdminService.deleteApplication(ref);
      loadData(user!);
    }
  };

  const saveRound = async () => {
    if (!editingRound?.name || !editingRound?.startDate || !editingRound?.endDate) {
      alert("Name and dates are mandatory.");
      return;
    }
    if (editingRound.id) await AdminService.updateRound(editingRound as Round);
    else await AdminService.addRound(editingRound);
    setEditingRound(null);
    loadData(user!);
  };

  const saveUser = async () => {
    if (!editingUser?.email || !editingUser?.name) {
      alert("Name and email are required.");
      return;
    }
    if (editingUser.uid) await AdminService.updateUser(editingUser as User);
    else await AdminService.addUser(editingUser);
    setEditingUser(null);
    loadData(user!);
  };

  const handleSeed = async () => {
    if (window.confirm("This will reset all current demo data to factory defaults. Proceed?")) {
      await AdminService.seedProductionData();
    }
  };

  if (!user || loading) return <div className="p-10 text-center text-purple-600 font-bold font-display">Initializing Master Console...</div>;

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );
  
  const filteredApps = apps.filter(a => 
    a.applicant?.toLowerCase().includes(appSearch.toLowerCase()) || 
    a.ref?.toLowerCase().includes(appSearch.toLowerCase())
  );

  return (
    <SecureLayout userRole={UserRole.ADMIN}>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo-secure.png" alt="Portal Logo" className="h-12 w-12" />
            <h1 className="text-3xl font-bold text-purple-900 font-display">Administrative Console</h1>
          </div>
          <p className="text-gray-600">Global oversight and system integrity controls.</p>
        </div>
        <button 
          onClick={handleSeed}
          className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-amber-200 transition"
        >
          <RefreshCw size={14}/> Seed Production Data
        </button>
      </div>

      <div className="flex space-x-1 mb-6 border-b border-gray-200 overflow-x-auto pb-1 no-scrollbar bg-white/50 p-1 rounded-t-xl">
        {[
          { id: 'overview', label: 'Dashboard', icon: BarChart3 },
          { id: 'apps', label: 'Applications', icon: Briefcase },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'rounds', label: 'Rounds', icon: Calendar },
          { id: 'previews', label: 'Forms', icon: Eye },
          { id: 'system', label: 'Settings', icon: Settings },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-4 py-3 font-bold transition rounded-t-lg whitespace-nowrap ${activeTab === tab.id ? 'bg-white border-x border-t border-gray-200 text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <tab.icon size={16} className="mr-2" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-card min-h-[600px] animate-fade-in">
        
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="text-[10px] font-bold text-purple-400 uppercase">EOIs Received</p>
                  <p className="text-3xl font-bold text-purple-900">{apps.filter(a => a.stage === 'EOI').length}</p>
               </div>
               <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                  <p className="text-[10px] font-bold text-teal-400 uppercase">Part 2 Active</p>
                  <p className="text-3xl font-bold text-teal-900">{apps.filter(a => a.stage === 'Part 2').length}</p>
               </div>
               <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-400 uppercase">Pending Review</p>
                  <p className="text-3xl font-bold text-amber-900">{getMasterTasks().length}</p>
               </div>
               <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Total Accounts</p>
                  <p className="text-3xl font-bold text-gray-900">{users.length}</p>
               </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center"><AlertTriangle className="mr-2 text-amber-500" size={20}/> Attention Queue</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {getMasterTasks().length > 0 ? getMasterTasks().slice(0, 6).map(task => (
                  <div key={task.id} className="flex justify-between items-center p-4 border rounded-xl bg-white shadow-sm hover:border-purple-300 transition cursor-pointer group" onClick={() => navigate(`/portal/application/${task.targetRef}`)}>
                    <div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${task.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {task.type.replace('_', ' ')}
                      </span>
                      <h4 className="font-bold text-sm text-gray-800 mt-1">{task.title}</h4>
                      <p className="text-[10px] text-gray-400 uppercase">{task.area}</p>
                    </div>
                    <ArrowRight size={16} className="text-purple-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all"/>
                  </div>
                )) : (
                  <div className="col-span-2 py-10 text-center text-gray-400 border-2 border-dashed rounded-xl">All tasks completed.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'apps' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="relative w-full md:w-80">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                 <input className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm" placeholder="Filter by applicant or ref..." value={appSearch} onChange={e => setAppSearch(e.target.value)} />
               </div>
               <button onClick={() => navigate('/portal/application/new')} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold flex items-center text-sm shadow-lg hover:bg-purple-700 transition"><Plus size={16} className="mr-1"/> New Entry</button>
            </div>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase border-b">
                  <tr>
                    <th className="px-4 py-4">Applicant Organization</th>
                    <th className="px-4 py-4">Reference</th>
                    <th className="px-4 py-4">Phase</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredApps.map(a => (
                    <tr key={a.ref} className="hover:bg-purple-50 transition text-sm">
                      <td className="px-4 py-4">
                        <p className="font-bold">{a.applicant}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter">{a.area}</p>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-purple-700 font-bold">{a.ref}</td>
                      <td className="px-4 py-4"><span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded">{a.stage}</span></td>
                      <td className="px-4 py-4">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${a.status === 'Submitted' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>
                           {a.status}
                         </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => navigate(`/portal/application/${a.ref}`)} className="text-purple-600 hover:bg-purple-100 p-2 rounded-lg mr-1" title="Edit/View"><Edit size={16}/></button>
                        <button onClick={() => deleteApp(a.ref)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg" title="Delete"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="relative w-full md:w-80">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                 <input className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm" placeholder="Filter names or emails..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
               </div>
               {!editingUser && (
                 <button onClick={() => setEditingUser({ role: UserRole.APPLICANT, area: 'Applicant' })} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold flex items-center text-sm shadow-lg hover:bg-purple-700 transition"><Plus size={16} className="mr-1"/> Create User</button>
               )}
            </div>

            {editingUser && (
              <div className="p-6 border border-purple-200 bg-purple-50 rounded-2xl animate-slide-in mb-6 shadow-inner">
                <div className="flex justify-between items-center mb-6"><h4 className="font-bold text-purple-900 font-display text-lg">{editingUser.uid ? 'Edit Portal User' : 'New User Provisioning'}</h4><button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-red-500"><X size={20}/></button></div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Full Name</label>
                    <input className="w-full p-2.5 border rounded-xl bg-white" placeholder="e.g. Jane Doe" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Email Identity</label>
                    <input className="w-full p-2.5 border rounded-xl bg-white" placeholder="jane@example.com" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">System Role</label>
                    <select className="w-full p-2.5 border rounded-xl bg-white" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                      {Object.values(UserRole).filter(r => r !== 'PUBLIC').map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Zone Assignment</label>
                    <select className="w-full p-2.5 border rounded-xl bg-white" value={editingUser.area} onChange={e => setEditingUser({...editingUser, area: e.target.value})}>
                      <option value="Admin">System Global (Admin Only)</option>
                      {Object.values(AREA_DATA).map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                      <option value="Applicant">Applicant Isolation</option>
                    </select>
                  </div>
                </div>
                <button onClick={saveUser} className="mt-6 bg-purple-600 text-white px-8 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 w-full md:w-auto shadow-md hover:bg-purple-700 transition"><Save size={16}/> Persist User Account</button>
              </div>
            )}

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase border-b">
                  <tr><th className="px-4 py-4">Portal Member</th><th className="px-4 py-4">Role</th><th className="px-4 py-4">Jurisdiction</th><th className="px-4 py-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map(u => (
                    <tr key={u.uid} className="hover:bg-purple-50 text-sm">
                      <td className="px-4 py-4">
                        <p className="font-bold">{u.name}</p>
                        <p className="text-[10px] text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-4"><span className={`bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === 'ADMIN' ? 'text-purple-700 ring-1 ring-purple-200' : ''}`}>{u.role}</span></td>
                      <td className="px-4 py-4 text-gray-500 italic">{u.area}</td>
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => setEditingUser(u)} className="text-purple-600 hover:bg-purple-100 p-2 rounded-lg mr-1"><Edit size={14}/></button>
                        <button onClick={() => AdminService.deleteUser(u.uid).then(() => loadData(user!))} className="text-red-400 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'rounds' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
               <h3 className="font-bold text-xl font-display text-purple-900">Funding Cycle Management</h3>
               {!editingRound && <button onClick={() => setEditingRound({ status: 'planning' })} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold flex items-center text-sm shadow-md hover:bg-purple-700 transition"><Plus size={16} className="mr-1"/> Create Round</button>}
             </div>

             {editingRound && (
               <div className="p-6 border border-purple-100 bg-gray-50 rounded-2xl animate-fade-in mb-6 shadow-inner">
                 <div className="flex justify-between mb-6 font-bold text-purple-900 text-lg font-display"><span>{editingRound.id ? 'Modify Cycle' : 'Initialize New Cycle'}</span><button onClick={() => setEditingRound(null)} className="text-gray-400 hover:text-red-500"><X size={20}/></button></div>
                 <div className="grid md:grid-cols-2 gap-4">
                   <div className="md:col-span-2 space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase">Cycle Label</label>
                     <input className="w-full p-2.5 border rounded-xl bg-white" placeholder="e.g. Summer Inclusion Fund 2025" value={editingRound.name || ''} onChange={e => setEditingRound({...editingRound, name: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase">Submission Window Start</label>
                     <input type="date" className="w-full p-2.5 border rounded-xl bg-white" value={editingRound.startDate || ''} onChange={e => setEditingRound({...editingRound, startDate: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase">Submission Window End</label>
                     <input type="date" className="w-full p-2.5 border rounded-xl bg-white" value={editingRound.endDate || ''} onChange={e => setEditingRound({...editingRound, endDate: e.target.value})} />
                   </div>
                   <div className="md:col-span-2 space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase">Current Operational Phase</label>
                     <select className="w-full p-2.5 border rounded-xl bg-white" value={editingRound.status} onChange={e => setEditingRound({...editingRound, status: e.target.value as any})}>
                       <option value="planning">Initial Planning / Locked</option>
                       <option value="open">EOI Intake Live</option>
                       <option value="scoring">Committee Matrix Active</option>
                       <option value="voting">Public Ballot Released</option>
                       <option value="closed">Archive / Historical Data</option>
                     </select>
                   </div>
                 </div>
                 <button onClick={saveRound} className="mt-6 bg-purple-600 text-white px-8 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 w-full md:w-auto shadow-md hover:bg-purple-700 transition"><Save size={16}/> Apply Logic Updates</button>
               </div>
             )}
             
             <div className="space-y-4">
               {rounds.map(r => (
                 <div key={r.id} className="p-5 border rounded-xl flex justify-between items-center group bg-white shadow-sm hover:border-purple-200 transition">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${r.status === 'open' ? 'bg-green-500 animate-pulse' : r.status === 'scoring' ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                      <div>
                        <h4 className="font-bold text-gray-800">{r.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{r.startDate} &mdash; {r.endDate}</p>
                          <span className="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-600 font-bold rounded uppercase">{r.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                       <button onClick={() => setEditingRound(r)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"><Edit size={16}/></button>
                       <button onClick={() => AdminService.deleteRound(r.id).then(() => loadData(user!))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/></button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'previews' && (
           <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                 <div className="p-8 border-2 border-dashed rounded-3xl bg-white flex flex-col items-center group hover:bg-purple-50/50 hover:border-purple-200 transition cursor-default">
                    <FileText size={64} className="text-purple-200 mb-4 group-hover:scale-110 transition-transform"/>
                    <h4 className="font-bold text-purple-900 font-display text-xl mb-1">Part 1 (EOI) Audit</h4>
                    <p className="text-[10px] text-gray-400 mb-8 uppercase tracking-widest font-bold">Eligibility & Checkboxes</p>
                    <button onClick={() => navigate('/portal/application/PREVIEW-EOI')} className="w-full py-3 bg-white border border-purple-200 rounded-xl font-bold text-purple-600 hover:bg-purple-600 hover:text-white shadow-sm transition">Begin logic preview</button>
                 </div>
                 <div className="p-8 border-2 border-dashed rounded-3xl bg-white flex flex-col items-center group hover:bg-teal-50/50 hover:border-teal-200 transition cursor-default">
                    <Database size={64} className="text-teal-200 mb-4 group-hover:scale-110 transition-transform"/>
                    <h4 className="font-bold text-teal-900 font-display text-xl mb-1">Part 2 (Full) Audit</h4>
                    <p className="text-[10px] text-gray-400 mb-8 uppercase tracking-widest font-bold">Justifications & Budget</p>
                    <button onClick={() => navigate('/portal/application/PREVIEW-FULL')} className="w-full py-3 bg-white border border-teal-100 rounded-xl font-bold text-teal-600 hover:bg-teal-600 hover:text-white shadow-sm transition">Begin logic preview</button>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6 max-w-4xl mx-auto">
             <div className="p-8 border rounded-3xl bg-gray-50/50 grid md:grid-cols-2 gap-10">
                <div>
                  <h4 className="font-bold text-xs uppercase text-gray-400 mb-4 tracking-widest">Global Scoring Threshold</h4>
                  <div className="flex items-center gap-4">
                    <input type="number" value={settings?.scoringThreshold} onChange={e => handleUpdateSettings({ scoringThreshold: parseInt(e.target.value) })} className="w-28 p-4 border rounded-2xl font-bold text-3xl text-purple-700 bg-white shadow-inner" /> 
                    <span className="font-bold text-gray-300 text-3xl">%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 leading-relaxed font-medium uppercase">Projects failing to meet this percentage average from the matrix will be automatically disqualified from the public vote phase.</p>
                </div>
                <div>
                   <h4 className="font-bold text-xs uppercase text-gray-400 mb-4 tracking-widest">Master Visibility Switches</h4>
                   <div className="space-y-3">
                      <div className="flex justify-between text-sm font-bold items-center bg-white p-3 border rounded-xl shadow-sm">
                        <span className="text-gray-700">EOI Intake Status</span>
                        <button onClick={() => handleUpdateSettings({ isEOIOpen: !settings?.isEOIOpen })} className={`w-12 h-6 rounded-full relative transition-colors ${settings?.isEOIOpen ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings?.isEOIOpen ? 'left-7' : 'left-1'}`}></div></button>
                      </div>
                      <div className="flex justify-between text-sm font-bold items-center bg-white p-3 border rounded-xl shadow-sm">
                        <span className="text-gray-700">Part 2 Detail Intake</span>
                        <button onClick={() => handleUpdateSettings({ isPart2Open: !settings?.isPart2Open })} className={`w-12 h-6 rounded-full relative transition-colors ${settings?.isPart2Open ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings?.isPart2Open ? 'left-7' : 'left-1'}`}></div></button>
                      </div>
                      <div className="flex justify-between text-sm font-bold items-center bg-white p-3 border rounded-xl shadow-sm">
                        <span className="text-gray-700">Public Ballot Accessibility</span>
                        <button onClick={() => handleUpdateSettings({ isVotingOpen: !settings?.isVotingOpen })} className={`w-12 h-6 rounded-full relative transition-colors ${settings?.isVotingOpen ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings?.isVotingOpen ? 'left-7' : 'left-1'}`}></div></button>
                      </div>
                   </div>
                </div>
             </div>
             <div className="p-8 bg-red-50 rounded-3xl border border-red-100">
                <h4 className="text-red-800 font-bold mb-4 flex items-center gap-2 font-display text-lg"><ShieldAlert size={24}/> System Maintenance</h4>
                <div className="flex flex-col md:flex-row gap-4">
                  <button onClick={handleSeed} className="bg-white border border-red-200 text-red-600 px-8 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition shadow-sm"><RefreshCw size={14}/> Wipe & Seed Production Defaults</button>
                  <button className="bg-white border border-gray-200 text-gray-500 px-8 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"><Download size={14}/> Export Master Backup (CSV)</button>
                </div>
             </div>
          </div>
        )}

      </div>
    </SecureLayout>
  );
};

export default AdminConsole;