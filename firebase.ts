// services/firebase.ts

// ... imports remain the same

// 1. CHANGE THIS TO FALSE TO USE REAL DATABASE
export const USE_DEMO_MODE = false; 

// 2. Update config to use Environment Variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase App unconditionally so we can Seed even in Demo Mode
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const DEFAULT_SETTINGS: PortalSettings = { stage1Visible: true, stage2Visible: false, votingOpen: false };

export const seedDatabase = async () => {
    if (!db) throw new Error("Firebase connection failed. Cannot seed.");
    
    console.log("Starting Seed Process...");
    const batch = writeBatch(db);
    
    // Seed Users
    DEMO_USERS.forEach(({password, ...u}) => {
        const userRef = doc(db, "users", u.uid);
        batch.set(userRef, u);
    });
    
    // Seed Applications
    DEMO_APPS.forEach(a => {
        const appRef = doc(db, "applications", a.id);
        batch.set(appRef, a);
    });
    
    // Seed Settings & Config
    batch.set(doc(db, "portalSettings", "global"), DEFAULT_SETTINGS);
    batch.set(doc(db, "config", "scoringCriteria"), { items: SCORING_CRITERIA });
    
    await batch.commit();
    console.log("Seed Complete!");
};

class AuthService {
  // --- AUTH ---
  async login(id: string, pass: string): Promise<User> {
    if (USE_DEMO_MODE) return this.mockLogin(id, pass);
    if (!auth || !db) throw new Error("Firebase not init");
    let email = id.includes('@') ? id : `${id}@committee.local`;
    const uc = await signInWithEmailAndPassword(auth, email, pass);
    const snap = await getDoc(doc(db, 'users', uc.user.uid));
    return (snap.data() as User) || { uid: uc.user.uid, email, role: 'applicant' };
  }

  async register(email: string, pass: string, name: string): Promise<User> {
    if (USE_DEMO_MODE) return this.mockRegister(email, pass, name);
    if (!auth || !db) throw new Error("Firebase not init");
    const uc = await createUserWithEmailAndPassword(auth, email, pass);
    const u: User = { uid: uc.user.uid, email, displayName: name, role: 'applicant' };
    await setDoc(doc(db, 'users', u.uid), u);
    return u;
  }

  // --- DATA ---
  async getApplications(area?: string): Promise<Application[]> {
      if (USE_DEMO_MODE) return this.mockGetApps(area);
      if (!db) return [];
      const snap = await getDocs(collection(db, "applications"));
      const apps = snap.docs.map(d => d.data() as Application);
      return area && area !== 'All' ? apps.filter(a => a.area === area || a.area === 'Cross-Area') : apps;
  }

  async createApplication(app: Application): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateApp(app);
      if (!db) return;
      const id = 'app_' + Date.now();
      await setDoc(doc(db, 'applications', id), { ...app, id, createdAt: Date.now() });
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateApp(id, updates);
      if (!db) return;
      await setDoc(doc(db, 'applications', id), updates, { merge: true });
  }

  async deleteApplication(id: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockDeleteApp(id);
      if (!db) return;
      await deleteDoc(doc(db, 'applications', id));
  }

  async saveScore(score: Score): Promise<void> {
      if (USE_DEMO_MODE) return this.mockSaveScore(score);
      if (!db) return;
      await setDoc(doc(db, 'scores', `${score.appId}_${score.scorerId}`), score);
  }

  async getScores(): Promise<Score[]> {
      if (USE_DEMO_MODE) return this.mockGetScores();
      if (!db) return [];
      const snap = await getDocs(collection(db, 'scores'));
      return snap.docs.map(d => d.data() as Score);
  }
  
  async resetUserScores(uid: string): Promise<void> {
      if(USE_DEMO_MODE) return this.mockResetUserScores(uid);
      if(!db) return;
      const q = query(collection(db, "scores"), where("scorerId", "==", uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
  }

  async getPortalSettings(): Promise<PortalSettings> {
      if (USE_DEMO_MODE) return this.mockGetSettings();
      if (!db) return DEFAULT_SETTINGS;
      const s = await getDoc(doc(db, 'portalSettings', 'global'));
      return (s.data() as PortalSettings) || DEFAULT_SETTINGS;
  }
  
  async updatePortalSettings(s: PortalSettings): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateSettings(s);
      if (!db) return;
      await setDoc(doc(db, 'portalSettings', 'global'), s);
  }

  async getUsers(): Promise<User[]> {
      if (USE_DEMO_MODE) return this.mockGetUsers();
      if (!db) return [];
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => d.data() as User);
  }
  
  async updateUser(u: User): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateUser(u);
      if (!db) return;
      await setDoc(doc(db, 'users', u.uid), u, { merge: true });
  }
  
  async updateUserProfile(uid: string, u: Partial<User>): Promise<User> {
      if (USE_DEMO_MODE) return this.mockUpdateProfile(uid, u);
      if (!db) throw new Error("No DB");
      await setDoc(doc(db, 'users', uid), u, { merge: true });
      return (await getDoc(doc(db, 'users', uid))).data() as User;
  }

  async deleteUser(uid: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockDeleteUser(uid);
      if (!db) return;
      await deleteDoc(doc(db, 'users', uid));
  }
  
  async adminCreateUser(u: User, p: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockAdminCreateUser(u, p);
      throw new Error("Admin creation requires Firebase Admin SDK. Please use console.");
  }

  // --- MOCK ---
  private getLocal<T>(k: string): T[] { return JSON.parse(localStorage.getItem(k) || '[]'); }
  private setLocal<T>(k: string, v: T[]) { localStorage.setItem(k, JSON.stringify(v)); }

  mockLogin(id: string, p: string): Promise<User> {
    return new Promise((res, rej) => {
        setTimeout(() => {
            const users = this.getLocal<User>('users');
            if(users.length === 0) { this.setLocal('users', DEMO_USERS); return res(DEMO_USERS[0]); } // Auto-seed
            let email = id.includes('@') ? id : `${id}@committee.local`;
            const u = users.find(u => (u.email.toLowerCase() === email.toLowerCase() || u.username === id) && u.password === p);
            u ? res(u) : rej(new Error("Invalid login"));
        }, 500);
    });
  }
  
  mockRegister(e: string, p: string, n: string): Promise<User> {
       const u = { uid: 'u_'+Date.now(), email: e, password: p, displayName: n, role: 'applicant' as any };
       this.setLocal('users', [...this.getLocal('users'), u]);
       return Promise.resolve(u);
  }
  
  mockGetApps(area?: string): Promise<Application[]> {
      const apps = this.getLocal<Application>('apps');
      if (apps.length === 0 && !localStorage.getItem('apps_init')) { this.setLocal('apps', DEMO_APPS); localStorage.setItem('apps_init', '1'); return Promise.resolve(DEMO_APPS); }
      return Promise.resolve(area && area !== 'All' ? apps.filter(a => a.area === area || a.area === 'Cross-Area') : apps);
  }
  
  mockCreateApp(a: any): Promise<void> {
      const code = a.area?.substring(0,3).toUpperCase() || 'GEN';
      const na = { ...a, id: 'app_'+Date.now(), createdAt: Date.now(), ref: `PB-${code}-${Math.floor(Math.random()*900)}`, status: 'Submitted-Stage1' };
      this.setLocal('apps', [...this.getLocal('apps'), na]);
      return Promise.resolve();
  }
  
  mockUpdateApp(id: string, up: any): Promise<void> {
      const apps = this.getLocal<Application>('apps');
      const i = apps.findIndex(a => a.id === id);
      if(i>=0) { apps[i] = { ...apps[i], ...up }; this.setLocal('apps', apps); }
      return Promise.resolve();
  }
  
  mockDeleteApp(id: string): Promise<void> {
      this.setLocal('apps', this.getLocal<Application>('apps').filter(a => a.id !== id));
      return Promise.resolve();
  }
  
  mockSaveScore(s: Score): Promise<void> {
      const scores = this.getLocal<Score>('scores');
      const i = scores.findIndex(x => x.appId === s.appId && x.scorerId === s.scorerId);
      if(i>=0) scores[i] = s; else scores.push(s);
      this.setLocal('scores', scores);
      return Promise.resolve();
  }
  
  mockGetScores(): Promise<Score[]> { return Promise.resolve(this.getLocal('scores')); }
  
  mockResetUserScores(uid: string): Promise<void> {
      this.setLocal('scores', this.getLocal<Score>('scores').filter(s => s.scorerId !== uid));
      return Promise.resolve();
  }

  mockGetSettings(): Promise<PortalSettings> { return Promise.resolve(this.getLocal<PortalSettings>('portalSettings')[0] || DEFAULT_SETTINGS); }
  mockUpdateSettings(s: PortalSettings): Promise<void> { this.setLocal('portalSettings', [s]); return Promise.resolve(); }
  
  mockGetUsers(): Promise<User[]> { 
      const u = this.getLocal<User>('users');
      if(u.length === 0) { this.setLocal('users', DEMO_USERS); return Promise.resolve(DEMO_USERS); }
      return Promise.resolve(u); 
  }
  mockUpdateUser(u: User): Promise<void> {
      const users = this.getLocal<User>('users');
      const i = users.findIndex(x => x.uid === u.uid);
      if(i>=0) { users[i] = { ...users[i], ...u }; this.setLocal('users', users); }
      return Promise.resolve();
  }
  mockUpdateProfile(uid: string, up: any): Promise<User> {
      const users = this.getLocal<User>('users');
      const i = users.findIndex(x => x.uid === uid);
      if(i>=0) { users[i] = { ...users[i], ...up }; this.setLocal('users', users); return Promise.resolve(users[i]); }
      throw new Error("User not found");
  }
  mockDeleteUser(uid: string): Promise<void> {
      this.setLocal('users', this.getLocal<User>('users').filter(u => u.uid !== uid));
      return Promise.resolve();
  }
  mockAdminCreateUser(u: User, p: string): Promise<void> {
      this.setLocal('users', [...this.getLocal('users'), { ...u, password: p, uid: 'u_'+Date.now() }]);
      return Promise.resolve();
  }
}

export const api = new AuthService();