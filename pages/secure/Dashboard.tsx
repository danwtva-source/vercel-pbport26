import React, { useEffect, useState } from 'react';
import { SecureLayout } from '../../components/Layout';
import { AuthService, DataService } from '../../services/firebase';
import { User, UserRole, Application } from '../../types';
import { useNavigate } from 'react-router-dom';
import { BarChart3, FileText, CheckCircle, Clock, AlertCircle, ArrowRight, User as UserIcon } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const u = AuthService.getCurrentUser();
    if (!u) { navigate('/login'); return; }
    setUser(u);
    DataService.getApplications(u).then(data => { setApps(data); setLoading(false); });
  }, []);

  if (!user || loading) return <div className="p-10 text-center font-bold text-purple-600">Initialising Dashboard...</div>;

  // --- COMMITTEE DASHBOARD COMPONENTS ---
  const CommitteeView = () => {
    const scoredCount = apps.filter(a => a.status === 'Scored').length;
    const pendingCount = apps.filter(a => a.stage === 'Part 2' && a.status === 'Submitted').length;
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-card border-t-4 border-purple-600">
            <h3 className="font-bold text-lg mb-4">Your Area Performance: {user.area}</h3>
            <div className="flex justify-between items-end mb-2">
              <span className="text-4xl font-bold text-purple-700">{Math.round((scoredCount / (apps.length || 1)) * 100)}%</span>
              <span className="text-sm text-gray-500">{scoredCount} / {apps.length} Applications Scored</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-purple-600 h-3 rounded-full" style={{width: `${(scoredCount / (apps.length || 1)) * 100}%`}}></div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-card">
            <h3 className="font-bold text-lg mb-4">Immediate Tasks</h3>
            <div className="space-y-3">
              {apps.filter(a => a.stage === 'Part 2' && a.status === 'Submitted').map(a => (
                <div key={a.ref} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border">
                   <div>
                     <p className="font-bold text-purple-900">{a.applicant}</p>
                     <p className="text-xs text-gray-500">{a.projectTitle}</p>
                   </div>
                   <button onClick={() => navigate('/portal/scoring')} className="bg-purple-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm">Score Matrix</button>
                </div>
              ))}
              {pendingCount === 0 && <p className="text-gray-400 text-sm italic">No pending applications in {user.area} currently.</p>}
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-900 to-purple-800 p-8 rounded-2xl text-white shadow-xl">
           <h3 className="text-2xl font-bold font-display mb-4">Committee Guidance</h3>
           <p className="text-indigo-200 text-sm mb-6 leading-relaxed">As a committee member for {user.area}, your role is to objectively score Part 2 applications against our 10-category matrix. Ensure justifications are provided for every score below 2.</p>
           <button onClick={() => navigate('/documents')} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-bold transition">
             <FileText size={18}/> Review Matrix Guidance
           </button>
        </div>
      </div>
    );
  };

  // --- APPLICANT DASHBOARD COMPONENTS ---
  const ApplicantView = () => {
    const myApp = apps[0];
    if (!myApp) return (
      <div className="bg-white p-12 rounded-2xl shadow-card text-center">
        <FileText size={48} className="mx-auto text-gray-300 mb-4"/>
        <h3 className="text-2xl font-bold text-gray-800">No Application Started</h3>
        <p className="text-gray-500 mt-2 mb-6">Ready to make a difference in your community?</p>
        <button onClick={() => navigate('/portal/application/new')} className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-purple-700 transition">Start Expression of Interest</button>
      </div>
    );

    const steps = [
      { id: 'eoi', label: 'Expression of Interest', status: myApp.stage === 'EOI' ? (myApp.status === 'Submitted' ? 'Current' : 'Draft') : 'Completed' },
      { id: 'review', label: 'Committee Review', status: myApp.stage === 'EOI' && myApp.status === 'Submitted' ? 'Upcoming' : (myApp.stage === 'Part 2' ? 'Completed' : 'Current') },
      { id: 'full', label: 'Full Application', status: myApp.stage === 'Part 2' ? (myApp.status === 'Draft' ? 'Current' : 'Submitted') : 'Upcoming' },
      { id: 'vote', label: 'Public Vote', status: myApp.status === 'Approved' ? 'Current' : 'Upcoming' }
    ];

    return (
      <div className="space-y-8">
        <div className="bg-white p-8 rounded-2xl shadow-card relative overflow-hidden">
           <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-bold text-purple-900 font-display">{myApp.projectTitle || 'Untitled Project'}</h3>
                <p className="text-gray-500">Ref: {myApp.ref} • Area: {myApp.area}</p>
              </div>
              <span className="bg-teal-100 text-teal-800 px-4 py-1.5 rounded-full font-bold text-sm uppercase">{myApp.status}</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-100 -z-0 hidden md:block"></div>
              {steps.map((step, i) => (
                <div key={step.id} className="relative z-10 text-center flex flex-col items-center">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white shadow-md ${step.status === 'Completed' ? 'bg-green-500 text-white' : step.status === 'Current' ? 'bg-purple-600 text-white scale-110' : 'bg-gray-200 text-gray-400'}`}>
                      {step.status === 'Completed' ? <CheckCircle size={18}/> : i+1}
                   </div>
                   <p className={`mt-3 text-sm font-bold ${step.status === 'Current' ? 'text-purple-700' : 'text-gray-400'}`}>{step.label}</p>
                   <p className="text-[10px] uppercase text-gray-400 font-bold">{step.status}</p>
                </div>
              ))}
           </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <Clock className="text-purple-600" size={32}/>
              <div>
                 <h4 className="font-bold text-purple-900">Next Step</h4>
                 <p className="text-purple-700 text-sm">
                   {myApp.stage === 'EOI' && myApp.status === 'Submitted' ? 'Your EOI is being reviewed for eligibility. We will contact you soon.' : 
                    myApp.stage === 'Part 2' && myApp.status === 'Draft' ? 'Congratulations! Please complete your Full Application details.' :
                    'Please wait for the committee to complete the scoring process.'}
                 </p>
              </div>
           </div>
           {myApp.stage === 'Part 2' && myApp.status === 'Draft' && (
             <button onClick={() => navigate(`/portal/application/${myApp.ref}`)} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-purple-700 transition">Complete Part 2</button>
           )}
        </div>
      </div>
    );
  };

  return (
    <SecureLayout userRole={user.role}>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-purple-900 font-display">Portal Dashboard</h1>
          <p className="text-gray-600">Accessing as <span className="font-bold text-purple-700">{user.role}</span> {user.area !== 'Applicant' && `for ${user.area}`}</p>
        </div>
        <div className="bg-white p-2 rounded-xl shadow-sm border flex items-center gap-3">
           <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400"><UserIcon size={20}/></div>
           <div className="pr-4">
              <p className="text-sm font-bold text-gray-800 leading-tight">{user.name}</p>
              <button className="text-[10px] font-bold text-purple-600 uppercase hover:underline">Edit Profile</button>
           </div>
        </div>
      </div>

      {user.role === UserRole.ADMIN && (
        <div className="space-y-8 animate-fade-in">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-card flex items-center justify-between border-l-4 border-purple-600">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Live Rounds</p>
                  <p className="text-2xl font-bold text-gray-800">Scoring Phase</p>
                </div>
                <button onClick={() => navigate('/portal/admin')} className="p-2 bg-purple-50 text-purple-600 rounded-lg"><ArrowRight size={20}/></button>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-card flex items-center justify-between border-l-4 border-teal-600">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Total Grant Pool</p>
                  <p className="text-2xl font-bold text-gray-800">£150,000</p>
                </div>
                <BarChart3 className="text-teal-600" size={32}/>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-card flex items-center justify-between border-l-4 border-amber-600">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Admin Tasks</p>
                  <p className="text-2xl font-bold text-gray-800">14 Pending</p>
                </div>
                <AlertCircle className="text-amber-600" size={32}/>
              </div>
           </div>
           
           <div className="bg-white p-6 rounded-2xl shadow-card">
              <h3 className="font-bold text-lg mb-4">Master Application Overview</h3>
              <div className="space-y-4">
                 {apps.slice(0, 5).map(app => (
                   <div key={app.ref} className="flex flex-col md:flex-row justify-between md:items-center p-4 border rounded-xl hover:shadow-md transition gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center font-bold text-purple-700">{app.ref.slice(-3)}</div>
                        <div>
                          <p className="font-bold text-gray-800">{app.applicant}</p>
                          <p className="text-xs text-gray-500">{app.area} • £{app.amountRequest}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 rounded uppercase">{app.status}</span>
                        <button onClick={() => navigate(`/portal/application/${app.ref}`)} className="text-purple-600 font-bold text-sm">View</button>
                      </div>
                   </div>
                 ))}
                 <button onClick={() => navigate('/portal/applications')} className="w-full py-3 text-purple-600 font-bold hover:bg-purple-50 rounded-xl transition">See All Applications &rarr;</button>
              </div>
           </div>
        </div>
      )}

      {user.role === UserRole.COMMITTEE && <CommitteeView />}
      {user.role === UserRole.APPLICANT && <ApplicantView />}

    </SecureLayout>
  );
};

export default Dashboard;