// services/firebase.ts
import { User, Application, Score, PortalSettings, AdminDocument, Round, Assignment, Vote, ApplicationStatus, AuditLog } from '../types';
import { DEMO_USERS, DEMO_APPS, SCORING_CRITERIA } from '../constants';
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch, query, where, orderBy, limit } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// --- CONFIGURATION ---
// Set to FALSE for production with Firebase configured.
// Set to TRUE for demo/development without Firebase.
export const USE_DEMO_MODE = false; // Production mode with Firebase

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase config is available, otherwise log warning
const hasFirebaseConfig = firebaseConfig.apiKey && firebaseConfig.projectId;

if (!hasFirebaseConfig && !USE_DEMO_MODE) {
  console.warn('⚠️ Firebase configuration missing. Set environment variables or enable USE_DEMO_MODE.');
}

// Initialize Firebase only if config is available
let app: any;
let auth: any;
let db: any;
let storage: any;
let secondaryApp: any;
let secondaryAuth: any;
const secondaryAppName = 'secondary';

try {
  if (hasFirebaseConfig) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Create secondary app for admin user creation (prevents session switch)
    secondaryApp = getApps().some(existing => existing.name === secondaryAppName)
      ? getApp(secondaryAppName)
      : initializeApp(firebaseConfig, secondaryAppName);
    secondaryAuth = getAuth(secondaryApp);
  } else if (!USE_DEMO_MODE) {
    console.error('❌ Cannot initialize Firebase: Missing configuration');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

export { auth, db, storage };

const DEFAULT_SETTINGS: PortalSettings = {
    stage1Visible: true,
    stage2Visible: false,
    votingOpen: false,
    scoringThreshold: 50,
    resultsReleased: false
};

// --- HELPER: CSV Export ---
export const exportToCSV = (data: any[], filename: string) => {
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
  private async resolveUserDocRef(uid?: string, email?: string) {
    if (!db) return null;

    if (uid) {
      const directRef = doc(db, 'users', uid);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) return directRef;

      const uidQuery = query(collection(db, 'users'), where('uid', '==', uid));
      const uidSnap = await getDocs(uidQuery);
      if (!uidSnap.empty) return doc(db, 'users', uidSnap.docs[0].id);
    }

    if (email) {
      const emailQuery = query(collection(db, 'users'), where('email', '==', email));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) return doc(db, 'users', emailSnap.docs[0].id);
    }

    return null;
  }

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

  async logout(): Promise<void> {
    if (USE_DEMO_MODE) {
      localStorage.removeItem('pb_user');
      return;
    }
    try {
      await signOut(auth);
      localStorage.removeItem('pb_user');
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout');
    }
  }

  getCurrentUser(): User | null {
    const stored = localStorage.getItem('pb_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
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
      if (USE_DEMO_MODE) return this.mockSaveVote(vote);
      const voteId = vote.id || `${vote.appId}_${vote.voterId}`;
      await setDoc(doc(db, 'votes', voteId), { ...vote, id: voteId });
  }

  async getVotes(): Promise<Vote[]> {
      if (USE_DEMO_MODE) return this.mockGetVotes();
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
      // Ensure uid is set from document ID if missing in data
      return snap.docs.map(d => {
        const data = d.data() as User;
        return { ...data, uid: data.uid || d.id };
      });
  }

  async updateUser(u: User): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateUser(u);
      // Normalize role to lowercase before saving
      const normalizedUser = {
        ...u,
        role: u.role ? (u.role.toLowerCase() as 'admin' | 'committee' | 'applicant') : 'applicant'
      };
      await setDoc(doc(db, 'users', u.uid), normalizedUser, { merge: true });
  }

  async updateUserProfile(uid: string, u: Partial<User>): Promise<User> {
      if (USE_DEMO_MODE) return this.mockUpdateProfile(uid, u);
      const ref = await this.resolveUserDocRef(uid);
      if (!ref) throw new Error("User not found");

      await setDoc(ref, u, { merge: true });
      if (auth.currentUser && auth.currentUser.uid === uid) {
          await updateProfile(auth.currentUser, { 
              displayName: u.displayName || auth.currentUser.displayName,
              photoURL: u.photoUrl || auth.currentUser.photoURL
          });
      }
      const finalSnap = await getDoc(ref);
      return finalSnap.data() as User;
  }

  async getUserById(uid: string): Promise<User | null> {
      if (USE_DEMO_MODE) return (DEMO_USERS as any[]).find(u => u.uid === uid) || null;
      try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) return snap.data() as User;
          const q = query(collection(db, 'users'), where('uid', '==', uid));
          const qSnap = await getDocs(q);
          return qSnap.empty ? null : qSnap.docs[0].data() as User;
      } catch (e) { return null; }
  }

  async deleteUser(uid: string): Promise<void> {
    if (USE_DEMO_MODE) return this.mockDeleteUser(uid);
    await deleteDoc(doc(db, 'users', uid));
  }

  async adminCreateUser(u: User, p: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockAdminCreateUser(u, p);

      if (!secondaryAuth || !db) throw new Error('Firebase not initialized');
      if (!u.email || !p) throw new Error('Email and password required');

      try {
        // Use secondary auth instance to prevent switching current admin session
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, u.email, p);
        const uid = userCredential.user.uid;

        // Update display name in Auth profile
        if (u.displayName) {
          await updateProfile(userCredential.user, { displayName: u.displayName });
        }

        // Sign out the secondary auth immediately (does not affect primary auth)
        await signOut(secondaryAuth);

        // Save user profile to Firestore with matching UID
        // Ensure role is lowercase for Firestore rules consistency
        const normalizedRole = (u.role || 'applicant').toLowerCase() as 'admin' | 'committee' | 'applicant';
        const userData: User = {
          uid,
          email: u.email,
          displayName: u.displayName || '',
          role: normalizedRole,
          area: u.area || null,
          isActive: true,
          createdAt: Date.now()
        };

        await setDoc(doc(db, 'users', uid), userData);
      } catch (error: any) {
        // Ensure secondary auth is signed out even on error
        try { await signOut(secondaryAuth); } catch {}

        if (error.code === 'auth/email-already-in-use') {
          throw new Error('Email already registered');
        }
        if (error.code === 'auth/weak-password') {
          throw new Error('Password is too weak (minimum 6 characters)');
        }
        throw new Error(`Failed to create user: ${error.message}`);
      }
  }

  async normalizeUsers(): Promise<{ updated: number }> {
      if (USE_DEMO_MODE) return { updated: 0 };
      if (!db) throw new Error('Firebase not initialized');

      const snap = await getDocs(collection(db, 'users'));
      const batch = writeBatch(db);
      let updated = 0;

      snap.docs.forEach(docSnap => {
        const data = docSnap.data() as User;
        const normalizedRole = (data.role || 'applicant').toLowerCase() as 'admin' | 'committee' | 'applicant';
        const normalizedUid = data.uid || docSnap.id;
        const updates: Partial<User> = {};

        if (data.role !== normalizedRole) updates.role = normalizedRole;
        if (data.uid !== normalizedUid) updates.uid = normalizedUid;

        if (Object.keys(updates).length > 0) {
          batch.set(doc(db, 'users', docSnap.id), updates, { merge: true });
          updated += 1;
        }
      });

      if (updated > 0) await batch.commit();
      return { updated };
  }

  async checkAuthConsistency(users: User[]): Promise<{ missing: User[]; errors: { email: string; message: string }[]; checked: number }> {
      if (USE_DEMO_MODE) return { missing: [], errors: [], checked: users.length };
      if (!auth) throw new Error('Firebase auth not initialized');

      const missing: User[] = [];
      const errors: { email: string; message: string }[] = [];

      for (const user of users) {
        if (!user.email) continue;
        try {
          const methods = await fetchSignInMethodsForEmail(auth, user.email);
          if (methods.length === 0) {
            missing.push(user);
          }
        } catch (error: any) {
          errors.push({ email: user.email, message: error?.message || 'Unknown error' });
        }
      }

      return { missing, errors, checked: users.length };
  }

  async repairAuthUser(user: User, tempPassword: string): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!secondaryAuth || !db) throw new Error('Firebase not initialized');
      if (!user.email || !tempPassword) throw new Error('Email and password required');

      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, user.email, tempPassword);
        const uid = userCredential.user.uid;

        if (user.displayName) {
          await updateProfile(userCredential.user, { displayName: user.displayName });
        }

        await signOut(secondaryAuth);

        const ref = await this.resolveUserDocRef(user.uid, user.email);
        if (!ref) throw new Error('User profile not found');

        const normalizedRole = (user.role || 'applicant').toLowerCase() as 'admin' | 'committee' | 'applicant';
        await setDoc(ref, { uid, role: normalizedRole }, { merge: true });
      } catch (error: any) {
        try { await signOut(secondaryAuth); } catch {}
        if (error.code === 'auth/email-already-in-use') {
          throw new Error('Auth account already exists for this email');
        }
        if (error.code === 'auth/weak-password') {
          throw new Error('Password is too weak (minimum 6 characters)');
        }
        throw new Error(`Failed to repair auth user: ${error.message}`);
      }
  }

  // --- DOCUMENTS ---
  async getDocuments(): Promise<AdminDocument[]> {
      if (USE_DEMO_MODE) return this.mockGetDocs();
      const snap = await getDocs(collection(db, 'adminDocuments'));
      return snap.docs.map(d => d.data() as AdminDocument);
  }

  async createDocument(docData: AdminDocument): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateDoc(docData);
      await setDoc(doc(db, 'adminDocuments', docData.id), docData);
  }

  async deleteDocument(id: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockDeleteDoc(id);
      await deleteDoc(doc(db, 'adminDocuments', id));
  }

  async updateDocument(id: string, updates: Partial<AdminDocument>): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateDoc(id, updates);
      await setDoc(doc(db, 'adminDocuments', id), updates, { merge: true });
  }

  // --- PASSWORD MANAGEMENT ---
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
      if (USE_DEMO_MODE) {
        console.log('[DEMO] Password change requested');
        return;
      }
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('No authenticated user');
      // Re-authenticate before password change
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
  }

  // --- ROUNDS & ASSIGNMENTS ---
  async getRounds(): Promise<Round[]> {
      if (USE_DEMO_MODE) return this.mockGetRounds();
      const snap = await getDocs(collection(db, 'rounds'));
      // Ensure id is set from document ID if missing in data
      return snap.docs.map(d => {
        const data = d.data() as Round;
        return { ...data, id: data.id || d.id };
      });
  }

  async createRound(round: Round): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateRound(round);
      await setDoc(doc(db, 'rounds', round.id), round);
  }

  async updateRound(id: string, updates: Partial<Round>): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateRound(id, updates);
      await setDoc(doc(db, 'rounds', id), updates, { merge: true });
  }

  async deleteRound(id: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockDeleteRound(id);
      await deleteDoc(doc(db, 'rounds', id));
  }

  async getAssignments(committeeId?: string): Promise<Assignment[]> {
      if (USE_DEMO_MODE) return this.mockGetAssignments(committeeId);
      const q = committeeId
        ? query(collection(db, 'assignments'), where('committeeId', '==', committeeId))
        : collection(db, 'assignments');
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as Assignment);
  }

  async createAssignment(assignment: Assignment): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateAssignment(assignment);
      await setDoc(doc(db, 'assignments', assignment.id), assignment);
  }

  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateAssignment(id, updates);
      await setDoc(doc(db, 'assignments', id), updates, { merge: true });
  }

  async deleteAssignment(id: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockDeleteAssignment(id);
      await deleteDoc(doc(db, 'assignments', id));
  }

  // --- SETTINGS ---
  async getPortalSettings(): Promise<PortalSettings> {
      if (USE_DEMO_MODE) return this.mockGetSettings();
      const s = await getDoc(doc(db, 'portalSettings', 'global'));
      return s.exists() ? (s.data() as PortalSettings) : DEFAULT_SETTINGS;
  }

  async updatePortalSettings(s: PortalSettings): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateSettings(s);
      await setDoc(doc(db, 'portalSettings', 'global'), s);
  }

  // --- AUDIT LOGGING ---
  async logAction(params: { adminId: string; action: string; targetId: string; details?: Record<string, unknown>; }): Promise<void> {
      if (USE_DEMO_MODE) { console.log(`[AUDIT]`, params); return; }
      const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await setDoc(doc(db, 'auditLogs', id), { ...params, id, timestamp: Date.now() });
  }

  async getAuditLogs(): Promise<AuditLog[]> {
      if (USE_DEMO_MODE) return this.mockGetAuditLogs();
      const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as AuditLog);
  }

  // --- MOCK IMPLEMENTATIONS (Preserved for Demo toggle) ---
  private getLocal<T>(k: string): T[] { return JSON.parse(localStorage.getItem(k) || '[]'); }
  private setLocal<T>(k: string, v: T[]) { localStorage.setItem(k, JSON.stringify(v)); }

  mockLogin(id: string, p: string): Promise<User> {
    return new Promise((res, rej) => {
      setTimeout(() => {
        const users = this.getLocal<User>('users');
        if(users.length === 0) { this.setLocal('users', DEMO_USERS); return res(DEMO_USERS[0]); }
        let email = id.includes('@') ? id : `${id}@committee.local`;
        const u = users.find(u => (u.email.toLowerCase() === email.toLowerCase() || u.username === id) && u.password === p);
        u ? res(u) : rej(new Error("Invalid login"));
      }, 500);
    });
  }

  mockRegister(e: string, p: string, n: string): Promise<User> {
    const u: User = { uid: 'u_'+Date.now(), email: e, password: p, displayName: n, role: 'applicant' };
    this.setLocal('users', [...this.getLocal('users'), u]);
    return Promise.resolve(u);
  }

  mockGetApps(area?: string): Promise<Application[]> {
    const apps = this.getLocal<Application>('apps');
    if (apps.length === 0 && !localStorage.getItem('apps_init')) {
      this.setLocal('apps', DEMO_APPS);
      localStorage.setItem('apps_init', '1');
      return Promise.resolve(DEMO_APPS);
    }
    return Promise.resolve(area && area !== 'All' ? apps.filter(a => a.area === area || a.area === 'Cross-Area') : apps);
  }

  mockCreateApp(a: any): Promise<void> {
    const code = a.area?.substring(0,3).toUpperCase() || 'GEN';
    const na = { ...a, id: 'app_'+Date.now(), createdAt: Date.now(), updatedAt: Date.now(), ref: `PB-${code}-${Math.floor(Math.random()*900)}`, status: 'Submitted-Stage1' as ApplicationStatus };
    this.setLocal('apps', [...this.getLocal('apps'), na]);
    return Promise.resolve();
  }

  mockUpdateApp(id: string, up: any): Promise<void> {
    const apps = this.getLocal<Application>('apps');
    const i = apps.findIndex(a => a.id === id);
    if(i>=0) { apps[i] = { ...apps[i], ...up, updatedAt: Date.now() }; this.setLocal('apps', apps); }
    return Promise.resolve();
  }

  mockDeleteApp(id: string): Promise<void> {
    this.setLocal('apps', this.getLocal<Application>('apps').filter(a => a.id !== id));
    return Promise.resolve();
  }

  mockSaveVote(vote: Vote): Promise<void> {
    const votes = this.getLocal<Vote>('votes');
    const i = votes.findIndex(v => v.appId === vote.appId && v.voterId === vote.voterId);
    if(i>=0) votes[i] = vote; else votes.push(vote);
    this.setLocal('votes', votes);
    return Promise.resolve();
  }

  mockGetVotes(): Promise<Vote[]> {
    return Promise.resolve(this.getLocal('votes'));
  }

  mockSaveScore(s: Score): Promise<void> {
    const scores = this.getLocal<Score>('scores');
    const i = scores.findIndex(x => x.appId === s.appId && x.scorerId === s.scorerId);
    if(i>=0) scores[i] = s; else scores.push(s);
    this.setLocal('scores', scores);
    return Promise.resolve();
  }

  mockGetScores(): Promise<Score[]> {
    return Promise.resolve(this.getLocal('scores'));
  }

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
    const uid = 'u_' + Date.now();
    const newUser: User = {
      ...u,
      uid,
      password: p, // Only for demo login purposes
      isActive: true,
      createdAt: Date.now()
    };
    this.setLocal('users', [...this.getLocal('users'), newUser]);
    return Promise.resolve();
  }

  mockGetDocs(): Promise<AdminDocument[]> {
    return Promise.resolve(this.getLocal('adminDocs'));
  }

  mockCreateDoc(d: AdminDocument): Promise<void> {
    this.setLocal('adminDocs', [...this.getLocal('adminDocs'), d]);
    return Promise.resolve();
  }

  mockDeleteDoc(id: string): Promise<void> {
    this.setLocal('adminDocs', this.getLocal<AdminDocument>('adminDocs').filter(d => d.id !== id));
    return Promise.resolve();
  }

  mockUpdateDoc(id: string, updates: Partial<AdminDocument>): Promise<void> {
    const docs = this.getLocal<AdminDocument>('adminDocs');
    const i = docs.findIndex(d => d.id === id);
    if(i >= 0) { docs[i] = { ...docs[i], ...updates }; this.setLocal('adminDocs', docs); }
    return Promise.resolve();
  }

  mockGetRounds(): Promise<Round[]> {
    return Promise.resolve(this.getLocal('rounds'));
  }

  mockCreateRound(round: Round): Promise<void> {
    this.setLocal('rounds', [...this.getLocal('rounds'), round]);
    return Promise.resolve();
  }

  mockUpdateRound(id: string, updates: Partial<Round>): Promise<void> {
    const rounds = this.getLocal<Round>('rounds');
    const i = rounds.findIndex(r => r.id === id);
    if(i>=0) { rounds[i] = { ...rounds[i], ...updates }; this.setLocal('rounds', rounds); }
    return Promise.resolve();
  }

  mockDeleteRound(id: string): Promise<void> {
    this.setLocal('rounds', this.getLocal<Round>('rounds').filter(r => r.id !== id));
    return Promise.resolve();
  }

  mockGetAssignments(committeeId?: string): Promise<Assignment[]> {
    const assignments = this.getLocal<Assignment>('assignments');
    return Promise.resolve(committeeId ? assignments.filter(a => a.committeeId === committeeId) : assignments);
  }

  mockCreateAssignment(assignment: Assignment): Promise<void> {
    this.setLocal('assignments', [...this.getLocal('assignments'), assignment]);
    return Promise.resolve();
  }

  mockUpdateAssignment(id: string, updates: Partial<Assignment>): Promise<void> {
    const assignments = this.getLocal<Assignment>('assignments');
    const i = assignments.findIndex(a => a.id === id);
    if(i>=0) { assignments[i] = { ...assignments[i], ...updates }; this.setLocal('assignments', assignments); }
    return Promise.resolve();
  }

  mockDeleteAssignment(id: string): Promise<void> {
    this.setLocal('assignments', this.getLocal<Assignment>('assignments').filter(a => a.id !== id));
    return Promise.resolve();
  }

  mockGetSettings(): Promise<PortalSettings> {
    return Promise.resolve(this.getLocal<PortalSettings>('portalSettings')[0] || DEFAULT_SETTINGS);
  }

  mockUpdateSettings(s: PortalSettings): Promise<void> {
    this.setLocal('portalSettings', [s]);
    return Promise.resolve();
  }

  mockGetAuditLogs(): Promise<AuditLog[]> {
    return Promise.resolve(this.getLocal('auditLogs'));
  }
}

// Export primary instance
export const api = new AuthService();

// Export as DataService for v8 compatibility
export const DataService = api;

// Seed database function
export const seedDatabase = async () => {
  if (!db) throw new Error("Database not initialized");
  const batch = writeBatch(db);
  DEMO_USERS.forEach(({password, ...u}) => batch.set(doc(db, "users", u.uid), u));
  DEMO_APPS.forEach(a => batch.set(doc(db, "applications", a.id), a));
  batch.set(doc(db, "portalSettings", "global"), DEFAULT_SETTINGS);
  await batch.commit();
};
