// services/firebase.ts
import { User, Application, Score, PortalSettings, AdminDocument, Round, Assignment, Vote, ApplicationStatus } from '../types';
import { DEMO_USERS, DEMO_APPS, SCORING_CRITERIA } from '../constants';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch, query, where } from "firebase/firestore";

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

class AuthService {
  // --- AUTH ---
  async login(id: string, pass: string): Promise<User> {
    if (USE_DEMO_MODE) return this.mockLogin(id, pass);
    if (!auth || !db) throw new Error("Firebase not initialized");

    try {
      // Determine whether the login identifier is an email or a username.
      const isEmail = id.includes('@');
      const email = isEmail ? id : `${id}@committee.local`;
      const uc = await signInWithEmailAndPassword(auth, email, pass);

      // Attempt to fetch user profile by UID
      const userRef = doc(db, 'users', uc.user.uid);
      const snap = await getDoc(userRef);
      let userData: User | null = snap.exists() ? (snap.data() as User) : null;

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
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Invalid credentials or user not found');
    }
  }

  async register(email: string, pass: string, name: string): Promise<User> {
    if (USE_DEMO_MODE) return this.mockRegister(email, pass, name);
    if (!auth || !db) throw new Error("Firebase not initialized");

    try {
      const uc = await createUserWithEmailAndPassword(auth, email, pass);
      // Derive a username from the email prefix
      const username = email.split('@')[0];
      const u: User = {
        uid: uc.user.uid,
        email,
        username,
        displayName: name,
        role: 'applicant',
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'users', u.uid), u);
      return u;
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Failed to create account');
    }
  }

  // --- DATA ---
  async getApplications(area?: string): Promise<Application[]> {
      if (USE_DEMO_MODE) return this.mockGetApps(area);
      if (!db) return [];

      try {
        const snap = await getDocs(collection(db, "applications"));
        const apps = snap.docs.map(d => d.data() as Application);
        return area && area !== 'All' ? apps.filter(a => a.area === area || a.area === 'Cross-Area') : apps;
      } catch (error) {
        console.error('Error fetching applications:', error);
        return [];
      }
  }

  async createApplication(app: Application): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateApp(app);
      if (!db) return;

      try {
        const id = app.id || 'app_' + Date.now();
        await setDoc(doc(db, 'applications', id), { ...app, id, createdAt: Date.now(), updatedAt: Date.now() });
      } catch (error) {
        console.error('Error creating application:', error);
        throw new Error('Failed to create application');
      }
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateApp(id, updates);
      if (!db) return;

      try {
        await setDoc(doc(db, 'applications', id), { ...updates, updatedAt: Date.now() }, { merge: true });
      } catch (error) {
        console.error('Error updating application:', error);
        throw new Error('Failed to update application');
      }
  }

  async deleteApplication(id: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockDeleteApp(id);
      if (!db) return;

      try {
        await deleteDoc(doc(db, 'applications', id));
      } catch (error) {
        console.error('Error deleting application:', error);
        throw new Error('Failed to delete application');
      }
  }

  // --- VOTING & SCORING ---
  async saveVote(vote: Vote): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;

      try {
        const voteId = vote.id || `${vote.appId}_${vote.voterId}`;
        await setDoc(doc(db, 'votes', voteId), { ...vote, id: voteId });
      } catch (error) {
        console.error('Error saving vote:', error);
        throw new Error('Failed to save vote');
      }
  }

  async getVotes(): Promise<Vote[]> {
      if (USE_DEMO_MODE) return [];
      if (!db) return [];

      try {
        const snap = await getDocs(collection(db, 'votes'));
        return snap.docs.map(d => d.data() as Vote);
      } catch (error) {
        console.error('Error fetching votes:', error);
        return [];
      }
  }

  async saveScore(score: Score): Promise<void> {
      if (USE_DEMO_MODE) return this.mockSaveScore(score);
      if (!db) return;

      try {
        const scoreId = score.id || `${score.appId}_${score.scorerId}`;
        await setDoc(doc(db, 'scores', scoreId), { ...score, id: scoreId });
      } catch (error) {
        console.error('Error saving score:', error);
        throw new Error('Failed to save score');
      }
  }

  async getScores(): Promise<Score[]> {
      if (USE_DEMO_MODE) return this.mockGetScores();
      if (!db) return [];

      try {
        const snap = await getDocs(collection(db, 'scores'));
        return snap.docs.map(d => d.data() as Score);
      } catch (error) {
        console.error('Error fetching scores:', error);
        return [];
      }
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
      if (USE_DEMO_MODE) return this.mockGetUsers();
      if (!db) return [];

      try {
        const snap = await getDocs(collection(db, 'users'));
        return snap.docs.map(d => d.data() as User);
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
  }

  async updateUser(u: User): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateUser(u);
      if (!db) return;

      try {
        await setDoc(doc(db, 'users', u.uid), u, { merge: true });
      } catch (error) {
        console.error('Error updating user:', error);
        throw new Error('Failed to update user');
      }
  }

  async updateUserProfile(uid: string, u: Partial<User>): Promise<User> {
      if (USE_DEMO_MODE) return this.mockUpdateProfile(uid, u);
      if (!db) throw new Error("Database not initialized");

      try {
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
        if (!snap.exists()) {
          throw new Error('User profile not found after update');
        }
        return snap.data() as User;
      } catch (error) {
        console.error('Error updating user profile:', error);
        throw new Error('Failed to update user profile');
      }
  }

  /**
   * Fetch a single user document from Firestore by UID.
   * Returns null if not found, never throws.
   * NOTE: Queries by uid field, not document ID, to handle legacy data structure.
   */
  async getUserById(uid: string): Promise<User | null> {
      if (USE_DEMO_MODE) {
          const user = (DEMO_USERS as any[]).find((u: any) => u.uid === uid);
          return user || null;
      }
      if (!db) return null;

      try {
          // First try to get by document ID (standard approach)
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
              console.log("User found by document ID");
              return snap.data() as User;
          }

          // Fallback: Query by uid field (for legacy document structure)
          console.log("User not found by document ID, querying by uid field...");
          const q = query(collection(db, 'users'), where('uid', '==', uid));
          const querySnap = await getDocs(q);

          if (!querySnap.empty) {
              console.log("User found by uid field query");
              return querySnap.docs[0].data() as User;
          }

          console.warn(`No user found for UID: ${uid}`);
          return null;
      } catch (error) {
          console.error('Failed to fetch user by id:', error);
          return null;
      }
  }

  async deleteUser(uid: string): Promise<void> {
    if (USE_DEMO_MODE) return this.mockDeleteUser(uid);
    if (!db) return;

    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  async adminCreateUser(u: User, p: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockAdminCreateUser(u, p);
      // In a real app, this would call a Cloud Function.
      // For this prototype, we simulate it by creating the DB record.
      try {
        const fakeUid = 'u_' + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, 'users', fakeUid), { ...u, uid: fakeUid, createdAt: Date.now() });
      } catch (error) {
        console.error('Error creating user (admin):', error);
        throw new Error('Failed to create user');
      }
  }

  // --- DOCUMENTS ---
  async getDocuments(): Promise<AdminDocument[]> {
      if (USE_DEMO_MODE) return this.mockGetDocs();
      if (!db) return [];

      try {
        const snap = await getDocs(collection(db, 'adminDocuments'));
        return snap.docs.map(d => d.data() as AdminDocument);
      } catch (error) {
        console.error('Error fetching documents:', error);
        return [];
      }
  }

  async createDocument(docData: AdminDocument): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateDoc(docData);
      if (!db) return;

      try {
        await setDoc(doc(db, 'adminDocuments', docData.id), docData);
      } catch (error) {
        console.error('Error creating document:', error);
        throw new Error('Failed to create document');
      }
  }

  async deleteDocument(id: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockDeleteDoc(id);
      if (!db) return;

      try {
        await deleteDoc(doc(db, 'adminDocuments', id));
      } catch (error) {
        console.error('Error deleting document:', error);
        throw new Error('Failed to delete document');
      }
  }

  // --- ROUNDS & ASSIGNMENTS ---
  async getRounds(): Promise<Round[]> {
      if (USE_DEMO_MODE) return [];
      if (!db) return [];

      try {
        const snap = await getDocs(collection(db, 'rounds'));
        return snap.docs.map(d => d.data() as Round);
      } catch (error) {
        console.error('Error fetching rounds:', error);
        return [];
      }
  }

  async createRound(round: Round): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;

      try {
        await setDoc(doc(db, 'rounds', round.id), { ...round });
      } catch (error) {
        console.error('Error creating round:', error);
        throw new Error('Failed to create round');
      }
  }

  async updateRound(id: string, updates: Partial<Round>): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;

      try {
        await setDoc(doc(db, 'rounds', id), updates, { merge: true });
      } catch (error) {
        console.error('Error updating round:', error);
        throw new Error('Failed to update round');
      }
  }

  async deleteRound(id: string): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;

      try {
        await deleteDoc(doc(db, 'rounds', id));
      } catch (error) {
        console.error('Error deleting round:', error);
        throw new Error('Failed to delete round');
      }
  }

  async getAssignments(committeeId?: string): Promise<Assignment[]> {
      if (USE_DEMO_MODE) return [];
      if (!db) return [];

      try {
        let snap;
        if (committeeId) {
            const q = query(collection(db, 'assignments'), where('committeeId', '==', committeeId));
            snap = await getDocs(q);
        } else {
            snap = await getDocs(collection(db, 'assignments'));
        }
        return snap.docs.map(d => d.data() as Assignment);
      } catch (error) {
        console.error('Error fetching assignments:', error);
        return [];
      }
  }

  async createAssignment(assignment: Assignment): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;

      try {
        await setDoc(doc(db, 'assignments', assignment.id), { ...assignment });
      } catch (error) {
        console.error('Error creating assignment:', error);
        throw new Error('Failed to create assignment');
      }
  }

  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;

      try {
        await setDoc(doc(db, 'assignments', id), updates, { merge: true });
      } catch (error) {
        console.error('Error updating assignment:', error);
        throw new Error('Failed to update assignment');
      }
  }

  async deleteAssignment(id: string): Promise<void> {
      if (USE_DEMO_MODE) return;
      if (!db) return;

      try {
        await deleteDoc(doc(db, 'assignments', id));
      } catch (error) {
        console.error('Error deleting assignment:', error);
        throw new Error('Failed to delete assignment');
      }
  }

  async getPortalSettings(): Promise<PortalSettings> {
      if (USE_DEMO_MODE) return this.mockGetSettings();
      if (!db) return DEFAULT_SETTINGS;

      try {
        const s = await getDoc(doc(db, 'portalSettings', 'global'));
        return s.exists() ? (s.data() as PortalSettings) : DEFAULT_SETTINGS;
      } catch (error) {
        console.error('Error fetching portal settings:', error);
        return DEFAULT_SETTINGS;
      }
  }

  async updatePortalSettings(s: PortalSettings): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateSettings(s);
      if (!db) return;

      try {
        await setDoc(doc(db, 'portalSettings', 'global'), s);
      } catch (error) {
        console.error('Error updating portal settings:', error);
        throw new Error('Failed to update portal settings');
      }
  }

  // --- AUDIT LOGGING ---
  /**
   * Log an admin action for audit trail.
   * @param params - Contains adminId, action, targetId, and optional details
   */
  async logAction(params: {
    adminId: string;
    action: string;
    targetId: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
      const { adminId, action, targetId, details } = params;

      if (USE_DEMO_MODE) {
          console.log(`[AUDIT] Admin ${adminId} performed ${action} on ${targetId}`, details);
          return;
      }

      if (!db) return;

      try {
        const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await setDoc(doc(db, 'auditLogs', id), {
            id,
            adminId,
            action,
            targetId,
            timestamp: Date.now(),
            details: details || {}
        });
      } catch (error) {
        console.error('Error logging action:', error);
        // Don't throw - audit logging failure shouldn't break the main operation
      }
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
       const u: User = { uid: 'u_'+Date.now(), email: e, password: p, displayName: n, role: 'applicant' };
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
    if (!db) throw new Error("Database not initialized");
    const batch = writeBatch(db);

    // 1. Seed Users
    DEMO_USERS.forEach(({password, ...u}) => batch.set(doc(db, "users", u.uid), u));

    // 2. Seed Applications
    DEMO_APPS.forEach(a => batch.set(doc(db, "applications", a.id), a));

    // 3. Seed Settings
    batch.set(doc(db, "portalSettings", "global"), DEFAULT_SETTINGS);

    // 4. Seed Admin Documents
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
