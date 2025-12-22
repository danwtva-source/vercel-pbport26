import { User, Application, Score, PortalSettings, AdminDocument, Round, Assignment } from '../types';
import { DEMO_USERS, DEMO_APPS, SCORING_CRITERIA } from '../constants';

// --- CONFIGURATION ---
// Set to FALSE for production.
export const USE_DEMO_MODE = true;  // ✅ DEMO MODE ENABLED - No Firebase needed! 

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const DEFAULT_SETTINGS: PortalSettings = { 
    stage1Visible: true, 
    stage2Visible: false, 
    votingOpen: false, 
    scoringThreshold: 50 
};

// --- HELPER: CSV Export ---
export const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const val = row[header] ? String(row[header]).replace(/,/g, ' ') : '';
            return `"${val}"`;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
};

class AuthService {
  // --- AUTH ---
  async login(id: string, pass: string): Promise<User> {
    if (USE_DEMO_MODE) return this.mockLogin(id, pass);
    if (!auth || !db) throw new Error("Firebase not init");
    // Determine whether the login identifier is an email or a username. If it looks like an email, use it
    // directly for authentication; otherwise build a pseudo‑email. After authentication, we try to
    // resolve the user document by UID and, failing that, by username.
    const isEmail = id.includes('@');
    const email = isEmail ? id : `${id}@committee.local`;
    const uc = await signInWithEmailAndPassword(auth, email, pass);
    // Attempt to fetch user profile by UID
    const userRef = doc(db, 'users', uc.user.uid);
    const snap = await getDoc(userRef);
    let userData: User | null = (snap.data() as User) || null;
    if (!userData && !isEmail) {
      // If not found by UID and the identifier was a username, fallback to query by username
      const q = query(collection(db, 'users'), where('username', '==', id));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        userData = qSnap.docs[0].data() as User;
      }
    }
    // Default to an applicant role if no user record is found
    return userData || { uid: uc.user.uid, email: uc.user.email || email, role: 'applicant' };
  }

  async register(email: string, pass: string, name: string): Promise<User> {
    if (USE_DEMO_MODE) return this.mockRegister(email, pass, name);
    if (!auth || !db) throw new Error("Firebase not init");
    const uc = await createUserWithEmailAndPassword(auth, email, pass);
    // Derive a username from the email prefix to support username‑based logins in addition to email
    const username = email.split('@')[0];
    const u: User = { uid: uc.user.uid, email, username, displayName: name, role: 'applicant' };
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
      const id = app.id || 'app_' + Date.now();
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
      
      // 1. Update Firestore Document
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, u, { merge: true });

      // 2. Update Auth Profile (DisplayName / PhotoURL) if current user
      if (auth.currentUser && auth.currentUser.uid === uid) {
          await updateProfile(auth.currentUser, {
              displayName: u.displayName || auth.currentUser.displayName,
              photoURL: u.photoUrl || auth.currentUser.photoURL
          });
      }

      // 3. Return fresh data
      const snap = await getDoc(userRef);
      return snap.data() as User;
  }

  async getDocuments(): Promise<AdminDocument[]> {
      if (USE_DEMO_MODE) return this.mockGetDocs();
      if (!db) return [];
      const snap = await getDocs(collection(db, 'adminDocuments'));
      return snap.docs.map(d => d.data() as AdminDocument);
  }

  async createDocument(docData: AdminDocument): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateDoc(docData);
      if (!db) return;
      await setDoc(doc(db, 'adminDocuments', docData.id), docData);
  }

  async deleteDocument(id: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockDeleteDoc(id);
      if (!db) return;
      await deleteDoc(doc(db, 'adminDocuments', id));
  }

  // --- ROUNDS & ASSIGNMENTS ---

  /**
   * Fetch all funding rounds from Firestore. Each round document is typed as Round.
   */
  async getRounds(): Promise<Round[]> {
      if (USE_DEMO_MODE) return [];
      if (!db) return [];
      const snap = await getDocs(collection(db, 'rounds'));
      return snap.docs.map(d => d.data() as Round);
  }

  /**
   * Create a new funding round. The round.id is used as the document key.
   */
  async createRound(round: Round): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;
      await setDoc(doc(db, 'rounds', round.id), { ...round });
  }

  /**
   * Update fields on an existing round by document id.
   */
  async updateRound(id: string, updates: Partial<Round>): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;
      await setDoc(doc(db, 'rounds', id), updates, { merge: true });
  }

  /**
   * Delete a round. Use cautiously; consider restricting via security rules.
   */
  async deleteRound(id: string): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;
      await deleteDoc(doc(db, 'rounds', id));
  }

  /**
   * Fetch assignments. If a committeeId is provided, returns only assignments for that committee member.
   */
  async getAssignments(committeeId?: string): Promise<Assignment[]> {
      if (USE_DEMO_MODE) return [];
      if (!db) return [];
      let snap;
      if (committeeId) {
          const q = query(collection(db, 'assignments'), where('committeeId', '==', committeeId));
          snap = await getDocs(q);
      } else {
          snap = await getDocs(collection(db, 'assignments'));
      }
      return snap.docs.map(d => d.data() as Assignment);
  }

  /**
   * Create an assignment linking a committee member to an application.
   */
  async createAssignment(assignment: Assignment): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;
      await setDoc(doc(db, 'assignments', assignment.id), { ...assignment });
  }

  /**
   * Update assignment fields.
   */
  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;
      await setDoc(doc(db, 'assignments', id), updates, { merge: true });
  }

  /**
   * Delete an assignment.
   */
  async deleteAssignment(id: string): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;
      await deleteDoc(doc(db, 'assignments', id));
  }
  
  async adminCreateUser(u: User, p: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockAdminCreateUser(u, p);
      // In a real app, this would call a Cloud Function.
      // For this prototype, we simulate it by creating the DB record.
      const fakeUid = 'u_' + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'users', fakeUid), { ...u, uid: fakeUid, createdAt: Date.now() });
  }
  
  async deleteUser(uid: string): Promise<void> {
    if (USE_DEMO_MODE) return this.mockDeleteUser(uid);
    if (!db) return;
    await deleteDoc(doc(db, 'users', uid));
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

  // --- MOCK IMPLEMENTATIONS (Preserved for Demo toggle) ---
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
  mockGetDocs(): Promise<AdminDocument[]> { return Promise.resolve(this.getLocal('adminDocs')); }
  mockCreateDoc(d: AdminDocument): Promise<void> {
      this.setLocal('adminDocs', [...this.getLocal('adminDocs'), d]);
      return Promise.resolve();
  }
  mockDeleteDoc(id: string): Promise<void> {
      this.setLocal('adminDocs', this.getLocal<AdminDocument>('adminDocs').filter(d => d.id !== id));
      return Promise.resolve();
  }
  mockGetSettings(): Promise<PortalSettings> { return Promise.resolve(this.getLocal<PortalSettings>('portalSettings')[0] || DEFAULT_SETTINGS); }
  mockUpdateSettings(s: PortalSettings): Promise<void> { this.setLocal('portalSettings', [s]); return Promise.resolve(); }
}

export const api = new AuthService();
export const seedDatabase = async () => {
    if (!db) throw new Error("No DB");
    const batch = writeBatch(db);
    
    // 1. Seed Users
    DEMO_USERS.forEach(({password, ...u}) => batch.set(doc(db, "users", u.uid), u));
    
    // 2. Seed Applications
    DEMO_APPS.forEach(a => batch.set(doc(db, "applications", a.id), a));
    
    // 3. Seed Settings
    batch.set(doc(db, "portalSettings", "global"), DEFAULT_SETTINGS);

    // 4. Seed Admin Documents (New Feature)
    const folders = ['Committee Guidelines', 'Meeting Minutes', 'Policies'];
    folders.forEach(name => {
        const id = 'folder_' + name.replace(/\s/g, '');
        const folderDoc: AdminDocument = {
            id,
            name,
            type: 'folder',
            parentId: 'root',
            category: 'general',
            uploadedBy: 'System',
            createdAt: Date.now()
        };
        batch.set(doc(db, "adminDocuments", id), folderDoc);
    });

    await batch.commit();
    console.log("Database seeded successfully with Users, Apps, Settings, and Folders.");
};
