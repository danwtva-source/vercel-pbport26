import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, updateProfile
} from 'firebase/auth';
import { 
  getFirestore, collection, query, where, getDocs, doc, getDoc, 
  setDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, addDoc
} from 'firebase/firestore';
import { User, UserRole, Application, ScoringState, DocumentResource, Round, SystemSettings } from '../types';
import { SCORING_CRITERIA, DEMO_APPLICATIONS, DEMO_USERS } from '../constants';

const firebaseConfig = {
  apiKey: process.env.API_KEY || "AIzaSyDummyKey",
  authDomain: "pb-portal.firebaseapp.com",
  projectId: "pb-portal",
  storageBucket: "pb-portal.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const persistUser = (user: User | null) => {
  if (user) localStorage.setItem('pb_user', JSON.stringify(user));
  else localStorage.removeItem('pb_user');
};

export const DataService = {
  isDemoMode: () => localStorage.getItem('isDemoMode') !== 'false',

  toggleDemoMode: (enable: boolean) => {
    localStorage.setItem('isDemoMode', enable ? 'true' : 'false');
    window.location.reload();
  },

  getApplications: async (user: User): Promise<Application[]> => {
    let apps: Application[] = [];
    if (!DataService.isDemoMode() && auth.currentUser) {
      const appsRef = collection(db, 'applications');
      let q;
      if (user.role === UserRole.ADMIN) q = query(appsRef);
      else if (user.role === UserRole.COMMITTEE) q = query(appsRef, where('area', '==', user.area));
      else q = query(appsRef, where('applicantUid', '==', user.uid));
      
      const snap = await getDocs(q);
      apps = snap.docs.map(d => ({ ref: d.id, ...d.data() } as Application));
    } else {
      apps = JSON.parse(localStorage.getItem('demo_apps') || JSON.stringify(DEMO_APPLICATIONS));
      if (user.role === UserRole.COMMITTEE) apps = apps.filter(a => a.area === user.area);
      else if (user.role === UserRole.APPLICANT) apps = apps.filter(a => a.applicantUid === user.uid || a.applicant === user.name);
    }
    return apps;
  },

  getScoringState: async (user: User, ref: string): Promise<ScoringState | null> => {
    const scoreId = `${ref}_${user.uid}`;
    if (DataService.isDemoMode()) {
      const stored = localStorage.getItem(`score_${scoreId}`);
      return stored ? JSON.parse(stored) : {
        ref, criteria: SCORING_CRITERIA.map(c => ({...c, score: 0, notes: ''})),
        isFinal: false, scorer: user.name, updatedAt: new Date().toISOString()
      };
    }
    const docSnap = await getDoc(doc(db, 'scoring', scoreId));
    return docSnap.exists() ? docSnap.data() as ScoringState : null;
  },

  saveScoringState: async (state: ScoringState) => {
    const user = AuthService.getCurrentUser();
    if (!user) return;
    const scoreId = `${state.ref}_${user.uid}`;
    if (DataService.isDemoMode()) {
      localStorage.setItem(`score_${scoreId}`, JSON.stringify(state));
    } else {
      await setDoc(doc(db, 'scoring', scoreId), {...state, scorerUid: user.uid});
    }
  },

  getDocuments: async (): Promise<DocumentResource[]> => {
    return [
      { id: '1', title: "EOI Guidance Pack", category: 'Guidance', url: '#', size: '1.2MB', uploadedAt: '2025-01-01' },
      { id: '2', title: "Part 2 Budget Template", category: 'Template', url: '#', size: '0.5MB', uploadedAt: '2025-01-05' }
    ];
  },

  getSystemSettings: async (): Promise<SystemSettings> => {
    const stored = localStorage.getItem('system_settings');
    if (stored) return JSON.parse(stored);
    return {
      scoringThreshold: 65, activeRoundId: 'round-1',
      isEOIOpen: true, isPart2Open: true, isVotingOpen: false
    };
  }
};

export const AuthService = {
  login: async (email: string, pass: string): Promise<User> => {
    if (DataService.isDemoMode()) {
      const users = JSON.parse(localStorage.getItem('demo_users') || JSON.stringify(DEMO_USERS));
      const u = users.find((du: any) => du.email === email);
      if (!u) throw new Error("User not found in demo data.");
      persistUser(u);
      return u;
    }
    const res = await signInWithEmailAndPassword(auth, email, pass);
    const uDoc = await getDoc(doc(db, 'users', res.user.uid));
    const u = { uid: res.user.uid, ...uDoc.data() } as User;
    persistUser(u);
    return u;
  },

  register: async (name: string, email: string, pass: string): Promise<User> => {
    if (DataService.isDemoMode()) {
      const u: User = { uid: `demo-${Date.now()}`, name, email, role: UserRole.APPLICANT, area: 'Blaenavon' };
      const users = JSON.parse(localStorage.getItem('demo_users') || JSON.stringify(DEMO_USERS));
      users.push(u);
      localStorage.setItem('demo_users', JSON.stringify(users));
      persistUser(u);
      return u;
    }
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    const u: User = { uid: res.user.uid, name, email, role: UserRole.APPLICANT, area: 'Blaenavon' };
    await setDoc(doc(db, 'users', res.user.uid), u);
    persistUser(u);
    return u;
  },

  logout: async () => {
    if (!DataService.isDemoMode()) await signOut(auth);
    persistUser(null);
  },
  getCurrentUser: (): User | null => {
    const u = localStorage.getItem('pb_user');
    return u ? JSON.parse(u) : null;
  }
};

export const AdminService = {
  // --- USER MGMT ---
  getAllUsers: async () => {
    if (DataService.isDemoMode()) {
      return JSON.parse(localStorage.getItem('demo_users') || JSON.stringify(DEMO_USERS));
    }
    return (await getDocs(collection(db, 'users'))).docs.map(d => ({uid: d.id, ...d.data()} as User));
  },
  addUser: async (u: Partial<User>) => {
    if (DataService.isDemoMode()) {
      const users = await AdminService.getAllUsers();
      const newUser = { ...u, uid: `user-${Date.now()}` } as User;
      users.push(newUser);
      localStorage.setItem('demo_users', JSON.stringify(users));
      return;
    }
    await addDoc(collection(db, 'users'), u);
  },
  updateUser: async (u: User) => {
    if (DataService.isDemoMode()) {
      const users = await AdminService.getAllUsers();
      const idx = users.findIndex((user: User) => user.uid === u.uid);
      if (idx > -1) {
        users[idx] = u;
        localStorage.setItem('demo_users', JSON.stringify(users));
      }
      return;
    }
    await updateDoc(doc(db, 'users', u.uid), { ...u });
  },
  deleteUser: async (uid: string) => {
    if (DataService.isDemoMode()) {
      const users = await AdminService.getAllUsers();
      const filtered = users.filter((u: User) => u.uid !== uid);
      localStorage.setItem('demo_users', JSON.stringify(filtered));
      return;
    }
    await deleteDoc(doc(db, 'users', uid));
  },

  // --- ROUND MGMT ---
  getRounds: async (): Promise<Round[]> => {
    const stored = localStorage.getItem('demo_rounds');
    if (stored) return JSON.parse(stored);
    return [
      { id: 'round-1', name: 'Expression of Interest 2025', status: 'open', startDate: '2025-01-01', endDate: '2025-02-15' },
      { id: 'round-2', name: 'Full Application 2025', status: 'planning', startDate: '2025-02-16', endDate: '2025-03-30' }
    ];
  },
  addRound: async (r: Partial<Round>) => {
    const rounds = await AdminService.getRounds();
    const newRound = { ...r, id: `round-${Date.now()}` } as Round;
    rounds.push(newRound);
    localStorage.setItem('demo_rounds', JSON.stringify(rounds));
  },
  updateRound: async (r: Round) => {
    const rounds = await AdminService.getRounds();
    const idx = rounds.findIndex(round => round.id === r.id);
    if (idx > -1) {
      rounds[idx] = r;
      localStorage.setItem('demo_rounds', JSON.stringify(rounds));
    }
  },
  deleteRound: async (id: string) => {
    const rounds = await AdminService.getRounds();
    const filtered = rounds.filter(r => r.id !== id);
    localStorage.setItem('demo_rounds', JSON.stringify(filtered));
  },

  // --- APP MGMT ---
  addApplication: async (a: Partial<Application>) => {
     if (DataService.isDemoMode()) {
       const apps = await DataService.getApplications({role: UserRole.ADMIN} as User);
       const newApp = { ...a, ref: `APP-${Date.now().toString().slice(-4)}` } as Application;
       apps.push(newApp);
       localStorage.setItem('demo_apps', JSON.stringify(apps));
       return newApp;
     }
     const res = await addDoc(collection(db, 'applications'), a);
     return { ...a, ref: res.id };
  },
  updateApplication: async (a: Application) => {
    if (DataService.isDemoMode()) {
       const apps = await DataService.getApplications({role: UserRole.ADMIN} as User);
       const idx = apps.findIndex(app => app.ref === a.ref);
       if (idx > -1) {
         apps[idx] = a;
         localStorage.setItem('demo_apps', JSON.stringify(apps));
       }
    } else {
       await setDoc(doc(db, 'applications', a.ref), a);
    }
  },
  updateApplicationStatus: async (ref: string, status: string, stage?: 'EOI' | 'Part 2') => {
    if (DataService.isDemoMode()) {
       const apps = await DataService.getApplications({role: UserRole.ADMIN} as User);
       const app = apps.find(a => a.ref === ref);
       if (app) { 
         app.status = status as any; 
         if (stage) app.stage = stage; 
         localStorage.setItem('demo_apps', JSON.stringify(apps));
       }
    } else {
       await updateDoc(doc(db, 'applications', ref), { status, ...(stage && { stage }) });
    }
  },
  deleteApplication: async (ref: string) => {
    if (DataService.isDemoMode()) {
      const apps = await DataService.getApplications({role: UserRole.ADMIN} as User);
      const filtered = apps.filter(a => a.ref !== ref);
      localStorage.setItem('demo_apps', JSON.stringify(filtered));
      return;
    }
    await deleteDoc(doc(db, 'applications', ref));
  },

  // --- SYSTEM CONTROL ---
  updateSystemSettings: async (settings: SystemSettings) => {
    localStorage.setItem('system_settings', JSON.stringify(settings));
    if (!DataService.isDemoMode()) {
      await setDoc(doc(db, 'system', 'settings'), settings);
    }
  },

  seedProductionData: async () => {
    console.log("Initializing Production/Demo Seed Process...");
    
    // Clear demo/local identifiers
    localStorage.removeItem('demo_apps');
    localStorage.removeItem('demo_users');
    localStorage.removeItem('demo_rounds');
    localStorage.removeItem('system_settings');
    localStorage.removeItem('pb_user');
    
    const defaultSettings: SystemSettings = {
      scoringThreshold: 65,
      activeRoundId: 'round-1',
      isEOIOpen: true,
      isPart2Open: true,
      isVotingOpen: false
    };

    const defaultRounds: Round[] = [
      { id: 'round-1', name: 'Spring Communities Choice 2025', status: 'open', startDate: '2025-01-01', endDate: '2025-03-31' },
      { id: 'round-2', name: 'Winter Resilience Grant', status: 'planning', startDate: '2025-10-01', endDate: '2025-12-15' }
    ];

    if (DataService.isDemoMode()) {
      localStorage.setItem('demo_apps', JSON.stringify(DEMO_APPLICATIONS));
      localStorage.setItem('demo_users', JSON.stringify(DEMO_USERS));
      localStorage.setItem('demo_rounds', JSON.stringify(defaultRounds));
      localStorage.setItem('system_settings', JSON.stringify(defaultSettings));
      alert("Demo Data Seeded Successfully.");
    } else {
      // Live Firebase seeding
      try {
        await setDoc(doc(db, 'system', 'settings'), defaultSettings);
        const criteriaPromises = SCORING_CRITERIA.map(c => setDoc(doc(db, 'criteria', c.id), c));
        const roundPromises = defaultRounds.map(r => setDoc(doc(db, 'rounds', r.id), r));
        await Promise.all([...criteriaPromises, ...roundPromises]);
        alert("Live Matrix and System Settings Initialized.");
      } catch (e) {
        console.error(e);
        alert("Error seeding live database. Check console.");
      }
    }
    window.location.reload();
  }
};