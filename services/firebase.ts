// services/firebase.ts
import { User, Application, Score, PortalSettings, AdminDocument, Round, Assignment, Vote, AuditLog } from '../types';
import { DEMO_USERS, DEMO_APPS } from '../constants';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch, query, where } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// --- CONFIGURATION ---
// Set to FALSE for production.
export const USE_DEMO_MODE = false;

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
export const storage = getStorage(app);

const DEFAULT_SETTINGS: PortalSettings = {
    stage1Visible: true,
    stage2Visible: false,
    votingOpen: false,
    scoringThreshold: 50
};

// --- HELPER: CSV Export ---
export const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const val = row[header] ? String(row[header]).replace(/,/g, ' ').replace(/"/g, '""') : '';
            return `"${val}"`;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
};

// --- HELPER: Upload Generic File to Firebase Storage ---
export const uploadFile = async (path: string, file: File): Promise<string> => {
    if (USE_DEMO_MODE) return `https://fake-url.com/${file.name}`;
    if (!storage) throw new Error("Storage not initialized");

    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error("Upload failed:", error);
        throw new Error("File upload failed.");
    }
};

// --- HELPER: Upload Profile Image ---
export const uploadProfileImage = async (userId: string, file: File): Promise<string> => {
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filename = `profile_${userId}_${timestamp}.${ext}`;
    return uploadFile(`profile-images/${filename}`, file);
};

// --- HELPER: Delete Old Profile Image ---
export const deleteProfileImage = async (imageUrl: string): Promise<void> => {
    if (USE_DEMO_MODE || !storage || !imageUrl || !imageUrl.includes('firebasestorage')) return;
    try {
        const decodedUrl = decodeURIComponent(imageUrl);
        const pathMatch = decodedUrl.match(/\/o\/(.+?)\?/);
        if (pathMatch && pathMatch[1]) {
            await deleteObject(ref(storage, pathMatch[1]));
        }
    } catch (e) { console.warn("Delete image failed", e); }
};

class AuthService {
  // --- AUTH ---
  async login(id: string, pass: string): Promise<User> {
    if (USE_DEMO_MODE) return this.mockLogin(id, pass);
    if (!auth || !db) throw new Error("Firebase not initialized");

    try {
      const isEmail = id.includes('@');
      const email = isEmail ? id : `${id}@committee.local`;
      const uc = await signInWithEmailAndPassword(auth, email, pass);
      return await this.getUserById(uc.user.uid) || { uid: uc.user.uid, email: uc.user.email || email, role: 'applicant' };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Invalid credentials or user not found');
    }
  }

  async register(email: string, pass: string, name: string): Promise<User> {
    if (USE_DEMO_MODE) return this.mockRegister(email, pass, name);
    try {
      const uc = await createUserWithEmailAndPassword(auth, email, pass);
      const u: User = {
        uid: uc.user.uid,
        email,
        username: email.split('@')[0],
        displayName: name,
        role: 'applicant',
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'users', u.uid), u);
      return u;
    } catch (error) { throw new Error('Failed to create account'); }
  }

  // --- DATA ---
  async getApplications(area?: string): Promise<Application[]> {
      if (USE_DEMO_MODE) return this.mockGetApps(area);
      if (!db) return [];
      try {
        // Fetch all apps and filter in memory for complex OR logic (Area OR Cross-Area)
        // In production with large datasets, use specific queries.
        const snap = await getDocs(collection(db, "applications"));
        const apps = snap.docs.map(d => d.data() as Application);
        
        if (area && area !== 'All') {
             return apps.filter(a => a.area === area || a.area === 'Cross-Area');
        }
        return apps;
      } catch (error) { return []; }
  }

  async createApplication(app: Application): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateApp(app);
      try {
        const id = app.id || 'app_' + Date.now();
        await setDoc(doc(db, 'applications', id), { ...app, id, updatedAt: Date.now() });
      } catch (e) { throw new Error('Failed to create application'); }
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateApp(id, updates);
      try {
        await setDoc(doc(db, 'applications', id), { ...updates, updatedAt: Date.now() }, { merge: true });
      } catch (e) { throw new Error('Failed to update application'); }
  }

  async deleteApplication(id: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockDeleteApp(id);
      try { await deleteDoc(doc(db, 'applications', id)); } catch (e) { throw new Error('Failed to delete application'); }
  }

  // --- VOTING & SCORING ---
  async saveVote(vote: Vote): Promise<void> {
      if (USE_DEMO_MODE) return;
      const voteId = vote.id || `${vote.appId}_${vote.voterId}`;
      await setDoc(doc(db, 'votes', voteId), { ...vote, id: voteId });
  }

  async getVotes(): Promise<Vote[]> {
      if (USE_DEMO_MODE) return [];
      const snap = await getDocs(collection(db, 'votes'));
      return snap.docs.map(d => d.data() as Vote);
  }

  async saveScore(score: Score): Promise<void> {
      if (USE_DEMO_MODE) return this.mockSaveScore(score);
      const scoreId = score.id || `${score.appId}_${score.scorerId}`;
      await setDoc(doc(db, 'scores', scoreId), { ...score, id: scoreId });
  }

  async getScores(): Promise<Score[]> {
      if (USE_DEMO_MODE) return this.mockGetScores();
      const snap = await getDocs(collection(db, 'scores'));
      return snap.docs.map(d => d.data() as Score);
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
      if (USE_DEMO_MODE) return this.mockGetUsers();
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => d.data() as User);
  }

  async updateUser(u: User): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateUser(u);
      await setDoc(doc(db, 'users', u.uid), u, { merge: true });
  }

  async updateUserProfile(uid: string, u: Partial<User>): Promise<User> {
      if (USE_DEMO_MODE) return this.mockUpdateProfile(uid, u);
      // Logic to find user by UID field if doc ID differs
      let ref = doc(db, 'users', uid);
      let snap = await getDoc(ref);

      if (!snap.exists()) {
          const q = query(collection(db, 'users'), where('uid', '==', uid));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
              ref = qSnap.docs[0].ref;
              snap = await getDoc(ref);
          }
      }

      const existing = snap.exists() ? (snap.data() as User) : { uid } as User;
      const updated = { ...existing, ...u } as User;
      await setDoc(ref, updated, { merge: true });
      return updated;
  }

  async getUserById(uid: string): Promise<User | null> {
      if (USE_DEMO_MODE) return this.mockGetUser(uid);
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? snap.data() as User : null;
  }

  async adminCreateUser(user: User, password: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockAdminCreateUser(user, password);
      const email = user.email.includes('@') ? user.email : `${user.username}@committee.local`;
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: user.displayName || user.username });
      await setDoc(doc(db, 'users', cred.user.uid), { ...user, uid: cred.user.uid, email });
  }

  // --- SETTINGS ---
  async getSettings(): Promise<PortalSettings> {
      if (USE_DEMO_MODE) return DEFAULT_SETTINGS;
      const snap = await getDoc(doc(db, 'portalSettings', 'main'));
      return snap.exists() ? snap.data() as PortalSettings : DEFAULT_SETTINGS;
  }

  async updateSettings(settings: PortalSettings): Promise<void> {
      if (USE_DEMO_MODE) return;
      await setDoc(doc(db, 'portalSettings', 'main'), settings);
  }

  // --- DOCUMENTS ---
  async getDocuments(): Promise<AdminDocument[]> {
      if (USE_DEMO_MODE) return [];
      const snap = await getDocs(collection(db, 'adminDocuments'));
      return snap.docs.map(d => d.data() as AdminDocument);
  }

  async saveDocument(docData: AdminDocument): Promise<void> {
      if (USE_DEMO_MODE) return;
      await setDoc(doc(db, 'adminDocuments', docData.id), docData);
  }

  async deleteDocument(id: string): Promise<void> {
      if (USE_DEMO_MODE) return;
      await deleteDoc(doc(db, 'adminDocuments', id));
  }

  // --- ROUNDS ---
  async getRounds(): Promise<Round[]> {
      if (USE_DEMO_MODE) return [];
      const snap = await getDocs(collection(db, 'rounds'));
      return snap.docs.map(d => d.data() as Round);
  }

  async createRound(r: Round): Promise<void> {
      if (USE_DEMO_MODE) return;
      await setDoc(doc(db, 'rounds', r.id), r);
  }

  async updateRound(id: string, updates: Partial<Round>): Promise<void> {
      if (USE_DEMO_MODE) return;
      await setDoc(doc(db, 'rounds', id), updates, { merge: true });
  }

  async deleteRound(id: string): Promise<void> {
      if (USE_DEMO_MODE) return;
      await deleteDoc(doc(db, 'rounds', id));
  }

  // --- ASSIGNMENTS ---
  async getAssignments(): Promise<Assignment[]> {
      if (USE_DEMO_MODE) return [];
      const snap = await getDocs(collection(db, 'assignments'));
      return snap.docs.map(d => d.data() as Assignment);
  }

  async createAssignment(a: Assignment): Promise<void> {
      if (USE_DEMO_MODE) return;
      await setDoc(doc(db, 'assignments', a.id), a);
  }

  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<void> {
      if (USE_DEMO_MODE) return;
      await setDoc(doc(db, 'assignments', id), updates, { merge: true });
  }

  async deleteAssignment(id: string): Promise<void> {
      if (USE_DEMO_MODE) return;
      await deleteDoc(doc(db, 'assignments', id));
  }

  // --- AUDIT LOGS ---
  async createAuditLog(log: AuditLog): Promise<void> {
      if (USE_DEMO_MODE) return;
      await setDoc(doc(db, 'auditLogs', log.id), log);
  }

  async getAuditLogs(): Promise<AuditLog[]> {
      if (USE_DEMO_MODE) return [];
      const snap = await getDocs(collection(db, 'auditLogs'));
      return snap.docs.map(d => d.data() as AuditLog);
  }

  // --- SEED DATABASE ---
  async seedDatabase(): Promise<void> {
      if (!db) return;
      const batch = writeBatch(db);
      DEMO_USERS.forEach(u => batch.set(doc(db, 'users', u.uid), u));
      DEMO_APPS.forEach(a => batch.set(doc(db, 'applications', a.id), a));
      await batch.commit();
  }

  // --- MOCKS (DEMO MODE) ---
  mockLogin(id: string, pass: string): Promise<User> {
      return new Promise((resolve, reject) => {
          const user = DEMO_USERS.find(u => (u.username === id || u.email === id) && u.password === pass);
          user ? resolve(user) : reject('Invalid login');
      });
  }

  mockRegister(email: string, pass: string, name: string): Promise<User> {
      const newUser: User = { uid: 'demo_' + Date.now(), email, username: email.split('@')[0], role: 'applicant', displayName: name };
      DEMO_USERS.push(newUser);
      return Promise.resolve(newUser);
  }

  mockGetApps(area?: string): Promise<Application[]> {
      return Promise.resolve(area ? DEMO_APPS.filter(a => a.area === area) : DEMO_APPS);
  }

  mockCreateApp(app: Application) { DEMO_APPS.push(app); return Promise.resolve(); }
  mockUpdateApp(id: string, updates: Partial<Application>) {
      const idx = DEMO_APPS.findIndex(a => a.id === id);
      if (idx >= 0) DEMO_APPS[idx] = { ...DEMO_APPS[idx], ...updates } as Application;
      return Promise.resolve();
  }
  mockDeleteApp(id: string) {
      const idx = DEMO_APPS.findIndex(a => a.id === id);
      if (idx >= 0) DEMO_APPS.splice(idx, 1);
      return Promise.resolve();
  }

  mockSaveScore(score: Score) { return Promise.resolve(); }
  mockGetScores(): Promise<Score[]> { return Promise.resolve([]); }

  mockGetUsers(): Promise<User[]> { return Promise.resolve(DEMO_USERS); }
  mockUpdateUser(u: User) { return Promise.resolve(); }
  mockUpdateProfile(uid: string, u: Partial<User>): Promise<User> { return Promise.resolve({ uid, email: '', role: 'applicant', ...u }); }
  mockGetUser(uid: string): Promise<User | null> { return Promise.resolve(DEMO_USERS.find(u => u.uid === uid) || null); }
  mockAdminCreateUser(user: User, pass: string) { DEMO_USERS.push(user); return Promise.resolve(); }
}

export const api = new AuthService();
export const seedDatabase = () => api.seedDatabase();
