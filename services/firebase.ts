// services/firebase.ts
import { User, Application, Score, PortalSettings, DocumentFolder, DocumentItem, DocumentVisibility, Round, Assignment, Vote, PublicVote, ApplicationStatus, AuditLog, Area, Notification, Announcement } from '../types';
import { DEMO_USERS, DEMO_APPS, SCORING_CRITERIA, DEMO_DOCUMENTS, DEMO_DOCUMENT_FOLDERS, DEMO_ANNOUNCEMENTS } from '../constants';
import { toStoredRole } from '../utils';
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch, query, where, orderBy, limit } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// --- TYPE GUARDS ---

// Type guard for Firebase errors
interface FirebaseError {
  code: string;
  message: string;
  name: string;
}

function isFirebaseError(error: unknown): error is FirebaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as any).code === 'string'
  );
}

// --- CONFIGURATION ---
// Set to FALSE for production with Firebase configured.
// Set to TRUE for demo/development without Firebase.
export const USE_DEMO_MODE = true; // Demo mode for testing without Firebase

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const inferredStorageBucket = firebaseConfig.storageBucket
  || (firebaseConfig.projectId ? `${firebaseConfig.projectId}.appspot.com` : undefined);

const firebaseConfigWithBucket = {
  ...firebaseConfig,
  storageBucket: inferredStorageBucket
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
    app = getApps().length ? getApp() : initializeApp(firebaseConfigWithBucket);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Create secondary app for admin user creation (prevents session switch)
    secondaryApp = getApps().some(existing => existing.name === secondaryAppName)
      ? getApp(secondaryAppName)
      : initializeApp(firebaseConfigWithBucket, secondaryAppName);
    secondaryAuth = getAuth(secondaryApp);
  } else if (!USE_DEMO_MODE) {
    console.error('❌ Cannot initialize Firebase: Missing configuration');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

export { auth, db, storage };

const DEFAULT_SETTINGS: PortalSettings = {
    // Stage 1 (EOI)
    stage1Visible: true,
    stage1VotingOpen: false,
    // Stage 2 (Full Application)
    stage2Visible: false,
    stage2ScoringOpen: false,
    // Public Voting
    votingOpen: false,
    publicVotingStartDate: undefined,
    publicVotingEndDate: undefined,
    // Scoring & Results
    scoringThreshold: 50,
    resultsReleased: false
};

// Helper to build canonical assignment ID
const buildAssignmentId = (assignment: Assignment): string => {
  return `${assignment.applicationId}_${assignment.committeeId}`;
};

const AREA_NAME_TO_ID: Record<Area, string> = {
  'Blaenavon': 'blaenavon',
  'Thornhill & Upper Cwmbran': 'thornhill-upper-cwmbran',
  'Trevethin, Penygarn & St. Cadocs': 'trevethin-penygarn-st-cadocs',
  'Cross-Area': 'cross-area'
};

const AREA_ID_TO_NAME: Record<string, Area> = Object.entries(AREA_NAME_TO_ID).reduce(
  (acc, [name, id]) => {
    acc[id] = name as Area;
    return acc;
  },
  {} as Record<string, Area>
);

const resolveAreaId = (area?: Area | null, areaId?: string | null): string | undefined => {
  return areaId || (area ? AREA_NAME_TO_ID[area] : undefined);
};

const resolveAreaName = (area?: Area | null, areaId?: string | null): Area | null => {
  return area || (areaId ? AREA_ID_TO_NAME[areaId] || null : null);
};

const isPermissionDeniedError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const typedError = error as { code?: string; message?: string };
  return typedError.code === 'permission-denied'
    || typedError.message?.includes('Missing or insufficient permissions') === true;
};

const mapUserFromFirestore = (data: Partial<User>, docId: string): User => {
  const normalizedRole = toStoredRole(data.role);
  const area = resolveAreaName(data.area || null, data.areaId || null);
  return {
    ...data,
    uid: data.uid || docId,
    role: normalizedRole,
    area,
    areaId: resolveAreaId(area || undefined, data.areaId || undefined) || null
  } as User;
};

const mapUserToFirestore = (user: User): Partial<User> => {
  const normalizedRole = toStoredRole(user.role);
  const areaId = resolveAreaId(user.area || undefined, user.areaId || undefined);
  const area = resolveAreaName(user.area || null, areaId || null);
  return {
    ...user,
    role: normalizedRole,
    area,
    areaId: areaId || null
  };
};

const mapApplicationFromFirestore = (data: Partial<Application>, docId: string): Application => {
  const applicationId = data.applicationId || data.id || docId;
  const applicantId = data.applicantId || data.userId || (data as any).applicantUid || '';
  const area = resolveAreaName(data.area || null, data.areaId || null);
  const areaId = resolveAreaId(area || undefined, data.areaId || undefined);
  const now = Date.now();
  return {
    ...data,
    id: applicationId,
    applicationId,
    applicantId,
    userId: data.userId || (data as any).applicantUid || applicantId,
    applicantName: data.applicantName || (data as any).contactName || '',
    orgName: data.orgName || (data as any).applicant || '',
    summary: data.summary || (data as any).projectSummary || '',
    area: area as Area,
    areaId,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    submissionMethod: data.submissionMethod || 'digital',
    formData: data.formData || {}
  } as Application;
};

const mapApplicationToFirestore = (app: Application): Partial<Application> => {
  const applicationId = app.applicationId || app.id;
  const applicantId = app.applicantId || app.userId;
  const areaId = resolveAreaId(app.area || undefined, app.areaId || undefined);
  const area = resolveAreaName(app.area || null, areaId || null);
  return {
    ...app,
    id: applicationId,
    applicationId,
    applicantId,
    userId: app.userId || applicantId,
    area,
    areaId
  };
};

const mapVoteFromFirestore = (data: Partial<Vote>, docId: string): Vote => {
  const applicationId = data.applicationId || data.appId || '';
  const committeeId = data.committeeId || data.voterId || '';
  return {
    ...data,
    id: data.id || docId,
    applicationId,
    appId: data.appId || applicationId,
    committeeId,
    voterId: data.voterId || committeeId
  } as Vote;
};

const mapVoteToFirestore = (vote: Vote): Partial<Vote> => {
  const applicationId = vote.applicationId || vote.appId;
  const committeeId = vote.committeeId || vote.voterId;
  return {
    ...vote,
    applicationId,
    appId: vote.appId || applicationId,
    committeeId,
    voterId: vote.voterId || committeeId
  };
};

const mapScoreFromFirestore = (data: Partial<Score>, docId: string): Score => {
  const applicationId = data.applicationId || data.appId || '';
  const committeeId = data.committeeId || data.scorerId || '';
  const criterionScores = data.criterionScores || data.breakdown || {};
  return {
    ...data,
    id: data.id || docId,
    applicationId,
    appId: data.appId || applicationId,
    committeeId,
    scorerId: data.scorerId || committeeId,
    breakdown: data.breakdown || criterionScores,
    criterionScores
  } as Score;
};

const mapScoreToFirestore = (score: Score): Partial<Score> => {
  const applicationId = score.applicationId || score.appId;
  const committeeId = score.committeeId || score.scorerId;
  const criterionScores = score.criterionScores || score.breakdown;
  return {
    ...score,
    applicationId,
    appId: score.appId || applicationId,
    committeeId,
    scorerId: score.scorerId || committeeId,
    breakdown: score.breakdown || criterionScores,
    criterionScores
  };
};

const stripUndefinedFields = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(item => stripUndefinedFields(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefinedFields(entry)])
    ) as T;
  }

  return value;
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

// --- CONSTANTS: File Upload Validation ---
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv'
];
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.txt', '.csv'];

// --- HELPER: Validate File Before Upload ---
export const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit.` };
    }

    // Check file extension
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return { valid: false, error: `File type not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}` };
    }

    // Check MIME type (additional security layer)
    if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
        console.warn(`MIME type ${file.type} not in allowed list, but extension is valid`);
    }

    return { valid: true };
};

// --- HELPER: Upload Generic File to Firebase Storage ---
export const uploadFile = async (path: string, file: File): Promise<string> => {
    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.valid) {
        throw new Error(validation.error || 'File validation failed.');
    }

    if (USE_DEMO_MODE) return `https://fake-url.com/${file.name}`;

    const ensureStorage = () => {
      if (storage) return storage;
      if (!hasFirebaseConfig) return null;
      const bucketName = inferredStorageBucket;
      const bucketUrl = bucketName ? `gs://${bucketName}` : undefined;
      try {
        storage = getStorage(getApp(), bucketUrl);
      } catch (error) {
        console.error("Storage initialization failed:", error);
        return null;
      }
      return storage;
    };

    const activeStorage = ensureStorage();
    if (!activeStorage) {
      throw new Error("Storage not initialized. Check Firebase storage configuration.");
    }

    try {
        const storageRef = ref(activeStorage, path);
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

  async register(email: string, pass: string, name: string, role: 'applicant' | 'community' = 'applicant'): Promise<User> {
    if (USE_DEMO_MODE) return this.mockRegister(email, pass, name, role);
    try {
      const uc = await createUserWithEmailAndPassword(auth, email, pass);
      const u: User = {
        uid: uc.user.uid,
        email,
        username: email.split('@')[0],
        displayName: name,
        role: toStoredRole(role),
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
        const apps = snap.docs.map(d => mapApplicationFromFirestore(d.data() as Application, d.id));

        if (area && area !== 'All') {
             const areaId = resolveAreaId(area as Area, null);
             const crossAreaId = AREA_NAME_TO_ID['Cross-Area'];
             return apps.filter(a => a.area === area || a.areaId === areaId || a.area === 'Cross-Area' || a.areaId === crossAreaId);
        }
        return apps;
      } catch (error) { return []; }
  }

  async createApplication(app: Application): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateApp(app);
      try {
        const id = app.id || 'app_' + Date.now();
        const mapped = mapApplicationToFirestore({ ...app, id, updatedAt: Date.now() } as Application);
        await setDoc(doc(db, 'applications', id), mapped);
      } catch (e) { throw new Error('Failed to create application'); }
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateApp(id, updates);
      try {
        const mappedUpdates: Partial<Application> = { ...updates, updatedAt: Date.now() };
        if (updates.applicationId) {
          mappedUpdates.id = updates.applicationId;
        }
        if (updates.applicantId || updates.userId) {
          const applicantId = updates.applicantId || updates.userId;
          mappedUpdates.applicantId = applicantId;
          mappedUpdates.userId = updates.userId || applicantId;
        }
        if (updates.area || updates.areaId) {
          const areaId = resolveAreaId(updates.area as Area, updates.areaId || null);
          const areaName = resolveAreaName(updates.area || null, areaId || null);
          mappedUpdates.areaId = areaId;
          mappedUpdates.area = areaName || undefined;
        }
        await setDoc(doc(db, 'applications', id), mappedUpdates, { merge: true });
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
      const mapped = mapVoteToFirestore({ ...vote, id: voteId } as Vote);
      await setDoc(doc(db, 'votes', voteId), mapped);
  }

  async getVotes(): Promise<Vote[]> {
      if (USE_DEMO_MODE) return this.mockGetVotes();
      try {
        const snap = await getDocs(collection(db, 'votes'));
        return snap.docs.map(d => mapVoteFromFirestore(d.data() as Vote, d.id));
      } catch (error) {
        console.error('Error fetching votes:', error);
        return [];
      }
  }

  async savePublicVote(vote: PublicVote): Promise<void> {
      if (USE_DEMO_MODE) return this.mockSavePublicVote(vote);
      if (!db) throw new Error('Firestore not initialized');
      const settings = await this.getPortalSettings();
      const now = Date.now();
      const withinDateRange = (!settings.publicVotingStartDate || now >= settings.publicVotingStartDate)
        && (!settings.publicVotingEndDate || now <= settings.publicVotingEndDate);
      if (!settings.votingOpen || !withinDateRange) {
        throw new Error('Public voting is currently closed.');
      }
      const voteId = vote.id || `${vote.applicationId}_${vote.voterId}`;
      await setDoc(doc(db, 'publicVotes', voteId), { ...vote, id: voteId });
  }

  async getPublicVotes(): Promise<PublicVote[]> {
      if (USE_DEMO_MODE) return this.mockGetPublicVotes();
      if (!db) throw new Error('Firestore not initialized');
      try {
        const snap = await getDocs(collection(db, 'publicVotes'));
        return snap.docs.map(d => ({ ...(d.data() as PublicVote), id: d.id }));
      } catch (error) {
        console.error('Error fetching public votes:', error);
        return [];
      }
  }

  async saveScore(score: Score): Promise<void> {
      if (USE_DEMO_MODE) return this.mockSaveScore(score);
      const scoreId = score.id || `${score.appId}_${score.scorerId}`;
      const mapped = mapScoreToFirestore({ ...score, id: scoreId } as Score);
      await setDoc(doc(db, 'scores', scoreId), mapped);
  }

  async getScores(): Promise<Score[]> {
      if (USE_DEMO_MODE) return this.mockGetScores();
      try {
        const snap = await getDocs(collection(db, 'scores'));
        return snap.docs.map(d => mapScoreFromFirestore(d.data() as Score, d.id));
      } catch (error) {
        console.error('Error fetching scores:', error);
        return [];
      }
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
      if (USE_DEMO_MODE) return this.mockGetUsers();
      try {
        const snap = await getDocs(collection(db, 'users'));
        // Ensure uid is set from document ID if missing in data
        return snap.docs.map(d => mapUserFromFirestore(d.data() as User, d.id));
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
  }

  async updateUser(u: User): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateUser(u);
      const normalizedUser = mapUserToFirestore(u);
      await setDoc(doc(db, 'users', u.uid), normalizedUser, { merge: true });
  }

  async updateUserProfile(uid: string, u: Partial<User>): Promise<User> {
      if (USE_DEMO_MODE) return this.mockUpdateProfile(uid, u);
      const ref = await this.resolveUserDocRef(uid);
      if (!ref) throw new Error("User not found");

      const mappedUpdates: Partial<User> = { ...u };
      if (u.role) mappedUpdates.role = toStoredRole(u.role);
      if (u.area || u.areaId) {
        const areaId = resolveAreaId(u.area as Area, u.areaId || null);
        const areaName = resolveAreaName(u.area || null, areaId || null);
        mappedUpdates.areaId = areaId || null;
        mappedUpdates.area = areaName || undefined;
      }
      await setDoc(ref, mappedUpdates, { merge: true });
      if (auth.currentUser && auth.currentUser.uid === uid) {
          await updateProfile(auth.currentUser, { 
              displayName: u.displayName || auth.currentUser.displayName,
              photoURL: u.photoUrl || auth.currentUser.photoURL
          });
      }
      const finalSnap = await getDoc(ref);
      return mapUserFromFirestore(finalSnap.data() as User, finalSnap.id);
  }

  async getUserById(uid: string): Promise<User | null> {
      if (USE_DEMO_MODE) {
        const demo = (DEMO_USERS as any[]).find(u => u.uid === uid) || null;
        return demo ? mapUserFromFirestore(demo as User, demo.uid) : null;
      }
      try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) return mapUserFromFirestore(snap.data() as User, snap.id);
          const q = query(collection(db, 'users'), where('uid', '==', uid));
          const qSnap = await getDocs(q);
          return qSnap.empty ? null : mapUserFromFirestore(qSnap.docs[0].data() as User, qSnap.docs[0].id);
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
        const normalizedRole = toStoredRole(u.role);
        const areaId = resolveAreaId(u.area || undefined, u.areaId || undefined);
        const area = resolveAreaName(u.area || null, areaId || null);
        const userData: User = {
          uid,
          email: u.email,
          displayName: u.displayName || '',
          role: normalizedRole,
          area: area || null,
          areaId: areaId || null,
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
        const normalizedRole = toStoredRole(data.role);
        const normalizedUid = data.uid || docSnap.id;
        const areaId = resolveAreaId(data.area || undefined, data.areaId || undefined);
        const areaName = resolveAreaName(data.area || null, areaId || null);
        const updates: Partial<User> = {};

        if (data.role !== normalizedRole) updates.role = normalizedRole;
        if (data.uid !== normalizedUid) updates.uid = normalizedUid;
        if (areaId && data.areaId !== areaId) updates.areaId = areaId;
        if (areaName && data.area !== areaName) updates.area = areaName;

        if (Object.keys(updates).length > 0) {
          batch.set(doc(db, 'users', docSnap.id), updates, { merge: true });
          updated += 1;
        }
      });

      if (updated > 0) await batch.commit();
      return { updated };
  }

  /**
   * One-time normalization to migrate legacy slug-based areaId values to PRD codes.
   * Keeps existing area display names intact while updating areaId fields.
   */
  async normalizeAreaIds(): Promise<{ usersUpdated: number; applicationsUpdated: number }> {
      if (USE_DEMO_MODE) return { usersUpdated: 0, applicationsUpdated: 0 };
      if (!db) throw new Error('Firebase not initialized');

      const normalizeCollection = async (collectionName: 'users' | 'applications') => {
        const snap = await getDocs(collection(db, collectionName));
        let batch = writeBatch(db);
        let updated = 0;
        let batchCount = 0;

        for (const docSnap of snap.docs) {
          const data = docSnap.data() as User | Application;
          const areaId = resolveAreaId(data.area || undefined, data.areaId || undefined);
          const areaName = resolveAreaName(data.area || null, areaId || null);
          const updates: Partial<User | Application> = {};

          if (areaId && data.areaId !== areaId) updates.areaId = areaId;
          if (areaName && data.area !== areaName) updates.area = areaName;

          if (Object.keys(updates).length > 0) {
            batch.set(doc(db, collectionName, docSnap.id), updates, { merge: true });
            updated += 1;
            batchCount += 1;
          }

          if (batchCount >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }

        if (batchCount > 0) await batch.commit();
        return updated;
      };

      const usersUpdated = await normalizeCollection('users');
      const applicationsUpdated = await normalizeCollection('applications');
      return { usersUpdated, applicationsUpdated };
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

        const normalizedRole = toStoredRole(user.role);
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
  async getDocumentFolders(visibility?: DocumentVisibility | DocumentVisibility[]): Promise<DocumentFolder[]> {
      if (USE_DEMO_MODE) return this.mockGetDocumentFolders(visibility);
      if (!db) {
        console.warn('Firestore not initialized, returning empty document folders');
        return [];
      }
      try {
        const ref = collection(db, 'documentFolders');
        const q = visibility
          ? query(ref, where('visibility', Array.isArray(visibility) ? 'in' : '==', visibility))
          : ref;
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as DocumentFolder));
      } catch (error) {
        console.error('Error fetching document folders:', error);
        throw new Error('Failed to load document folders. Please check your permissions.');
      }
  }

  async createDocumentFolder(folderData: DocumentFolder): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateDocumentFolder(folderData);
      if (!db) throw new Error('Firestore not initialized');
      try {
        await setDoc(doc(db, 'documentFolders', folderData.id), folderData);
      } catch (error) {
        console.error('Error creating document folder:', error);
        throw new Error('Failed to create folder. Please check your permissions.');
      }
  }

  async updateDocumentFolder(id: string, updates: Partial<DocumentFolder>): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateDocumentFolder(id, updates);
      if (!db) throw new Error('Firestore not initialized');
      try {
        await setDoc(doc(db, 'documentFolders', id), updates, { merge: true });
      } catch (error) {
        console.error('Error updating document folder:', error);
        throw new Error('Failed to update folder. Please check your permissions.');
      }
  }

  async deleteDocumentFolder(id: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockDeleteDocumentFolder(id);
      if (!db) throw new Error('Firestore not initialized');
      try {
        await deleteDoc(doc(db, 'documentFolders', id));
      } catch (error) {
        console.error('Error deleting document folder:', error);
        throw new Error('Failed to delete folder. Please check your permissions.');
      }
  }

  async getDocuments(options?: { visibility?: DocumentVisibility | DocumentVisibility[]; folderId?: string | null; }): Promise<DocumentItem[]> {
      if (USE_DEMO_MODE) return this.mockGetDocuments(options);
      if (!db) {
        console.warn('Firestore not initialized, returning empty documents');
        return [];
      }
      try {
        const ref = collection(db, 'documents');
        const constraints = [];
        if (options?.visibility) {
          constraints.push(where('visibility', Array.isArray(options.visibility) ? 'in' : '==', options.visibility));
        }
        if (options?.folderId && options.folderId !== 'root') {
          constraints.push(where('folderId', '==', options.folderId));
        }
        const q = constraints.length ? query(ref, ...constraints) : ref;
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as DocumentItem));
      } catch (error) {
        console.error('Error fetching documents:', error);
        throw new Error('Failed to load documents. Please check your permissions.');
      }
  }

  async createDocument(docData: DocumentItem): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateDocument(docData);
      if (!db) throw new Error('Firestore not initialized');
      try {
        await setDoc(doc(db, 'documents', docData.id), docData);
      } catch (error) {
        console.error('Error creating document:', error);
        throw new Error('Failed to upload document. Please check your permissions.');
      }
  }

  async deleteDocument(id: string, filePath?: string): Promise<void> {
      if (USE_DEMO_MODE) return this.mockDeleteDocument(id);
      if (!db) throw new Error('Firestore not initialized');
      try {
        let resolvedPath = filePath;
        if (!resolvedPath) {
          const snap = await getDoc(doc(db, 'documents', id));
          if (snap.exists()) {
            resolvedPath = (snap.data() as DocumentItem).filePath;
          }
        }
        if (resolvedPath && storage) {
          try {
            await deleteObject(ref(storage, resolvedPath));
          } catch (storageError) {
            console.warn('Failed to delete storage file:', storageError);
          }
        }
        await deleteDoc(doc(db, 'documents', id));
      } catch (error) {
        console.error('Error deleting document:', error);
        throw new Error('Failed to delete document. Please check your permissions.');
      }
  }

  async updateDocument(id: string, updates: Partial<DocumentItem>): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateDocument(id, updates);
      if (!db) throw new Error('Firestore not initialized');
      try {
        await setDoc(doc(db, 'documents', id), updates, { merge: true });
      } catch (error) {
        console.error('Error updating document:', error);
        throw new Error('Failed to update document. Please check your permissions.');
      }
  }

  // --- ANNOUNCEMENTS ---
  // --- FINANCIALS ---
  async getFinancials(): Promise<FinancialRecord[]> {
      if (USE_DEMO_MODE) return this.mockGetFinancials();
      if (!db) {
        console.warn('Firestore not initialized, returning empty financial records');
        return [];
      }
      const snap = await getDocs(collection(db, 'financials'));
      return snap.docs.map(d => d.data() as FinancialRecord);
  }

  async saveFinancials(record: FinancialRecord): Promise<void> {
      if (USE_DEMO_MODE) return this.mockSaveFinancials(record);
      if (!db) throw new Error('Firestore not initialized');
      await setDoc(doc(db, 'financials', record.roundId), record, { merge: true });
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
      try {
        const snap = await getDocs(collection(db, 'rounds'));
        // Ensure id is set from document ID if missing in data
        return snap.docs.map(d => {
          const data = d.data() as Round;
          return { ...data, id: data.id || d.id };
        });
      } catch (error) {
        console.error('Error fetching rounds:', error);
        return [];
      }
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
      try {
        const q = committeeId
          ? query(collection(db, 'assignments'), where('committeeId', '==', committeeId))
          : collection(db, 'assignments');
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as Assignment);
      } catch (error) {
        console.error('Error fetching assignments:', error);
        return [];
      }
  }

  async createAssignment(assignment: Assignment): Promise<void> {
      if (USE_DEMO_MODE) return this.mockCreateAssignment(assignment);
      const id = buildAssignmentId(assignment);
      await setDoc(doc(db, 'assignments', id), { ...assignment, id });
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
      if (s.exists()) {
        // Merge with defaults to ensure all fields exist
        const data = s.data();
        return {
          ...DEFAULT_SETTINGS,
          ...data,
          // Ensure boolean fields are actually booleans
          stage1Visible: data.stage1Visible === true,
          stage1VotingOpen: data.stage1VotingOpen === true,
          stage2Visible: data.stage2Visible === true,
          stage2ScoringOpen: data.stage2ScoringOpen === true,
          votingOpen: data.votingOpen === true,
          resultsReleased: data.resultsReleased === true,
          scoringThreshold: typeof data.scoringThreshold === 'number' ? data.scoringThreshold : 50,
        };
      }
      return DEFAULT_SETTINGS;
  }

  async updatePortalSettings(s: PortalSettings): Promise<void> {
      if (USE_DEMO_MODE) return this.mockUpdateSettings(s);
      // Filter out undefined values as Firebase doesn't handle them well
      const cleanSettings: Record<string, any> = {};
      for (const [key, value] of Object.entries(s)) {
        if (value !== undefined) {
          cleanSettings[key] = value;
        }
      }
      await setDoc(doc(db, 'portalSettings', 'global'), cleanSettings, { merge: true });
  }

  // --- AUDIT LOGGING ---
  async logAction(params: { adminId: string; action: string; targetId: string; details?: Record<string, unknown>; }): Promise<void> {
      if (USE_DEMO_MODE) { console.log(`[AUDIT]`, params); return; }
      const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      // Clean undefined values from details to avoid Firebase errors
      let cleanDetails: Record<string, unknown> | undefined;
      if (params.details) {
        cleanDetails = {};
        for (const [key, value] of Object.entries(params.details)) {
          if (value !== undefined) {
            cleanDetails[key] = value;
          }
        }
      }

      await setDoc(doc(db, 'auditLogs', id), {
        adminId: params.adminId,
        action: params.action,
        targetId: params.targetId,
        details: cleanDetails,
        id,
        timestamp: Date.now()
      });
  }

  async getAuditLogs(): Promise<AuditLog[]> {
      if (USE_DEMO_MODE) return this.mockGetAuditLogs();
      try {
        const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as AuditLog);
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        if (isFirebaseError(error) && error.code === 'permission-denied') {
          console.warn('⚠️ Permission denied reading audit logs. Check Firestore rules.');
        }
        return [];
      }
  }

  // --- BULK ASSIGNMENT ---

  /**
   * Bulk assign applications to committee members by area.
   * Creates assignments for all eligible applications to all committee members in that area.
   */
  async bulkAssignByArea(params: {
    area: string;
    stage: 'stage1' | 'stage2';
    dueDate?: string;
    adminId: string;
  }): Promise<{ created: number; skipped: number; errors: string[] }> {
    const { area, stage, dueDate, adminId } = params;
    const result = { created: 0, skipped: 0, errors: [] as string[] };

    // Get all committee members for this area
    const allUsers = await this.getUsers();
    const committeeMembers = allUsers.filter(
      u => (u.role === 'committee' || u.role === 'Committee') && u.area === area
    );

    if (committeeMembers.length === 0) {
      result.errors.push(`No committee members found for area: ${area}`);
      return result;
    }

    // Get all applications for this area at the appropriate stage
    const allApps = await this.getApplications(area);
    const targetStatus = stage === 'stage1' ? 'Submitted-Stage1' : 'Submitted-Stage2';
    const eligibleApps = allApps.filter(app =>
      app.status === targetStatus ||
      (stage === 'stage2' && app.status === 'Invited-Stage2')
    );

    if (eligibleApps.length === 0) {
      result.errors.push(`No eligible applications found for ${stage} in area: ${area}`);
      return result;
    }

    // Get existing assignments to avoid duplicates
    const existingAssignments = await this.getAssignments();
    const existingKeys = new Set(existingAssignments.map(a => `${a.applicationId}_${a.committeeId}`));

    // Create assignments for each app/committee combination
    const assignedDate = new Date().toISOString().split('T')[0];

    for (const app of eligibleApps) {
      for (const member of committeeMembers) {
        const assignmentKey = `${app.id}_${member.uid}`;

        if (existingKeys.has(assignmentKey)) {
          result.skipped++;
          continue;
        }

        const assignment: Assignment = {
          id: assignmentKey,
          applicationId: app.id,
          committeeId: member.uid,
          assignedDate,
          dueDate,
          status: 'assigned',
          area,
          stage,
          assignedBy: adminId
        };

        try {
          await this.createAssignment(assignment);
          result.created++;

          // Create notification for committee member
          await this.createNotification({
            recipientId: member.uid,
            type: 'assignment_created',
            title: 'New Assignment',
            message: `You have been assigned to review "${app.projectTitle || app.ref}" for ${stage === 'stage1' ? 'Part 1 voting' : 'Part 2 scoring'}.`,
            relatedId: app.id,
            area
          });
        } catch (err) {
          result.errors.push(`Failed to assign ${app.ref} to ${member.displayName || member.email}: ${err}`);
        }
      }
    }

    // Log the bulk action
    await this.logAction({
      adminId,
      action: 'BULK_ASSIGNMENT',
      targetId: area,
      details: {
        stage,
        appsAssigned: eligibleApps.length,
        committeeMembersCount: committeeMembers.length,
        created: result.created,
        skipped: result.skipped
      }
    });

    return result;
  }

  /**
   * Get assignments filtered by various criteria
   */
  async getAssignmentsByApplication(applicationId: string): Promise<Assignment[]> {
    if (USE_DEMO_MODE) {
      const all = await this.mockGetAssignments();
      return all.filter(a => a.applicationId === applicationId);
    }
    const q = query(collection(db, 'assignments'), where('applicationId', '==', applicationId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Assignment);
  }

  async getAssignmentsByStatus(status: Assignment['status']): Promise<Assignment[]> {
    if (USE_DEMO_MODE) {
      const all = await this.mockGetAssignments();
      return all.filter(a => a.status === status);
    }
    const q = query(collection(db, 'assignments'), where('status', '==', status));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Assignment);
  }

  async getAssignmentsByArea(area: string): Promise<Assignment[]> {
    if (USE_DEMO_MODE) {
      const all = await this.mockGetAssignments();
      return all.filter(a => a.area === area);
    }
    const q = query(collection(db, 'assignments'), where('area', '==', area));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Assignment);
  }

  async getOverdueAssignments(): Promise<Assignment[]> {
    const today = new Date().toISOString().split('T')[0];
    const all = await this.getAssignments();
    return all.filter(a =>
      a.status === 'assigned' &&
      a.dueDate &&
      a.dueDate < today
    );
  }

  /**
   * Get assignment statistics for admin dashboard
   */
  async getAssignmentStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byArea: Record<string, number>;
    byCommittee: Record<string, { assigned: number; completed: number; name: string }>;
    overdueCount: number;
  }> {
    const assignments = await this.getAssignments();
    const users = await this.getUsers();
    const userMap = new Map(users.map(u => [u.uid, u]));

    const stats = {
      total: assignments.length,
      byStatus: {} as Record<string, number>,
      byArea: {} as Record<string, number>,
      byCommittee: {} as Record<string, { assigned: number; completed: number; name: string }>,
      overdueCount: 0
    };

    const today = new Date().toISOString().split('T')[0];

    for (const a of assignments) {
      // By status
      stats.byStatus[a.status] = (stats.byStatus[a.status] || 0) + 1;

      // By area
      if (a.area) {
        stats.byArea[a.area] = (stats.byArea[a.area] || 0) + 1;
      }

      // By committee member
      if (!stats.byCommittee[a.committeeId]) {
        const user = userMap.get(a.committeeId);
        stats.byCommittee[a.committeeId] = {
          assigned: 0,
          completed: 0,
          name: user?.displayName || user?.email || a.committeeId
        };
      }
      stats.byCommittee[a.committeeId].assigned++;
      if (a.status === 'submitted') {
        stats.byCommittee[a.committeeId].completed++;
      }

      // Overdue count
      if (a.status === 'assigned' && a.dueDate && a.dueDate < today) {
        stats.overdueCount++;
      }
    }

    return stats;
  }

  // --- NOTIFICATIONS ---

  async createNotification(params: {
    recipientId: string;
    type: Notification['type'];
    title: string;
    message: string;
    link?: string;
    relatedId?: string;
    area?: string;
  }): Promise<void> {
    if (USE_DEMO_MODE) return this.mockCreateNotification(params);
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const notification: Notification = {
      id,
      ...params,
      createdAt: Date.now(),
      read: false
    };
    await setDoc(doc(db, 'notifications', id), notification);
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    if (USE_DEMO_MODE) return this.mockGetNotifications(userId);
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as Notification);
    } catch (error) {
      console.error('Error loading notifications:', error);
      if (isFirebaseError(error) && error.code === 'permission-denied') {
        console.warn('⚠️ Permission denied reading notifications. Check Firestore rules.');
      }
      return [];
    }
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    if (USE_DEMO_MODE) return this.mockMarkNotificationRead(notificationId);
    await setDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: Date.now()
    }, { merge: true });
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const notifications = await this.getNotifications(userId);
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await this.markNotificationRead(n.id);
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const notifications = await this.getNotifications(userId);
    return notifications.filter(n => !n.read).length;
  }

  /**
   * Send notification to all committee members in an area
   */
  async notifyCommitteeByArea(params: {
    area: string;
    type: Notification['type'];
    title: string;
    message: string;
    link?: string;
    relatedId?: string;
  }): Promise<void> {
    const users = await this.getUsers();
    const committeeMembers = users.filter(
      u => (u.role === 'committee' || u.role === 'Committee') && u.area === params.area
    );

    for (const member of committeeMembers) {
      await this.createNotification({
        recipientId: member.uid,
        ...params,
        area: params.area
      });
    }
  }

  // Mock notification methods
  private mockCreateNotification(params: any): Promise<void> {
    const notifications = this.getLocal<Notification>('notifications');
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    notifications.push({ id, ...params, createdAt: Date.now(), read: false });
    this.setLocal('notifications', notifications);
    return Promise.resolve();
  }

  private mockGetNotifications(userId: string): Promise<Notification[]> {
    const notifications = this.getLocal<Notification>('notifications');
    return Promise.resolve(
      notifications
        .filter(n => n.recipientId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
    );
  }

  private mockMarkNotificationRead(notificationId: string): Promise<void> {
    const notifications = this.getLocal<Notification>('notifications');
    const idx = notifications.findIndex(n => n.id === notificationId);
    if (idx >= 0) {
      notifications[idx].read = true;
      notifications[idx].readAt = Date.now();
      this.setLocal('notifications', notifications);
    }
    return Promise.resolve();
  }

  // --- ANNOUNCEMENTS ---

  async getAnnouncements(visibility?: Announcement['visibility']): Promise<Announcement[]> {
    if (USE_DEMO_MODE) return this.mockGetAnnouncements(visibility);
    
    if (!db) {
      console.warn('Firestore not initialized, returning empty announcements');
      return [];
    }

    try {
      const snap = await getDocs(collection(db, 'announcements'));
      let announcements = snap.docs.map(d => d.data() as Announcement);

      // Filter by visibility if specified
      if (visibility) {
        announcements = announcements.filter(a => a.visibility === visibility || a.visibility === 'all');
      }

      // Filter out announcements outside their date range
      const now = Date.now();
      announcements = announcements.filter(a => {
        if (a.startDate && a.startDate > now) return false;
        if (a.endDate && a.endDate < now) return false;
        return true;
      });

      // Sort: pinned first, then by createdAt desc
      return announcements.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    } catch (error) {
      console.error('Error fetching announcements:', error);
      if (isFirebaseError(error) && error.code === 'permission-denied') {
        console.warn('⚠️ Permission denied reading announcements. Check Firestore rules.');
      }
      return [];
    }
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    if (USE_DEMO_MODE) return this.mockGetAnnouncements();
    
    if (!db) {
      console.warn('Firestore not initialized, returning empty announcements');
      return [];
    }

    try {
      const snap = await getDocs(collection(db, 'announcements'));
      const announcements = snap.docs.map(d => d.data() as Announcement);

      // Sort: pinned first, then by createdAt desc
      return announcements.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    } catch (error) {
      console.error('Error fetching all announcements:', error);
      if (isFirebaseError(error) && error.code === 'permission-denied') {
        console.warn('⚠️ Permission denied reading announcements. Check Firestore rules.');
      }
      return [];
    }
  }

  async createAnnouncement(announcement: Announcement): Promise<void> {
    if (USE_DEMO_MODE) return this.mockCreateAnnouncement(announcement);
    if (!db) throw new Error('Firestore not initialized');

    try {
      const id = announcement.id || `announcement_${Date.now()}`;
      await setDoc(doc(db, 'announcements', id), {
        ...announcement,
        id,
        createdAt: announcement.createdAt || Date.now(),
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw new Error('Failed to create announcement. Please check your permissions.');
    }
  }

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<void> {
    if (USE_DEMO_MODE) return this.mockUpdateAnnouncement(id, updates);
    if (!db) throw new Error('Firestore not initialized');

    try {
      await setDoc(doc(db, 'announcements', id), {
        ...updates,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw new Error('Failed to update announcement. Please check your permissions.');
    }
  }

  async deleteAnnouncement(id: string): Promise<void> {
    if (USE_DEMO_MODE) return this.mockDeleteAnnouncement(id);
    if (!db) throw new Error('Firestore not initialized');

    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw new Error('Failed to delete announcement. Please check your permissions.');
    }
  }

  async incrementAnnouncementReadCount(id: string): Promise<void> {
    if (USE_DEMO_MODE) return;

    const docRef = doc(db, 'announcements', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const current = snap.data() as Announcement;
      await setDoc(docRef, { readCount: (current.readCount || 0) + 1 }, { merge: true });
    }
  }

  // Get announcements filtered by user role
  async getAnnouncementsForRole(role: 'admin' | 'committee' | 'applicant' | 'community'): Promise<Announcement[]> {
    const all = await this.getAnnouncements();

    return all.filter(a => {
      switch (a.visibility) {
        case 'all': return true;
        case 'admin': return role === 'admin';
        case 'committee': return role === 'admin' || role === 'committee';
        case 'applicants': return role === 'admin' || role === 'applicant';
        default: return true;
      }
    });
  }

  // Get public announcements (visibility: 'all')
  async getPublicAnnouncements(): Promise<Announcement[]> {
    const all = await this.getAnnouncements();
    return all.filter(a => a.visibility === 'all');
  }

  // Mock announcement methods
  private mockGetAnnouncements(visibility?: Announcement['visibility']): Promise<Announcement[]> {
    let announcements = this.getLocal<Announcement>('announcements');
    
    // Seed demo data if empty
    if (announcements.length === 0) {
      this.setLocal('announcements', DEMO_ANNOUNCEMENTS);
      announcements = DEMO_ANNOUNCEMENTS;
    }

    if (visibility) {
      announcements = announcements.filter(a => a.visibility === visibility || a.visibility === 'all');
    }

    // Filter by date range
    const now = Date.now();
    announcements = announcements.filter(a => {
      if (a.startDate && a.startDate > now) return false;
      if (a.endDate && a.endDate < now) return false;
      return true;
    });

    // Sort: pinned first, then by createdAt desc
    return Promise.resolve(announcements.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    }));
  }

  private mockCreateAnnouncement(announcement: Announcement): Promise<void> {
    const announcements = this.getLocal<Announcement>('announcements');
    const id = announcement.id || `announcement_${Date.now()}`;
    const newAnnouncement = {
      ...announcement,
      id,
      createdAt: announcement.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    const existingIdx = announcements.findIndex(a => a.id === id);
    if (existingIdx >= 0) {
      announcements[existingIdx] = newAnnouncement;
    } else {
      announcements.push(newAnnouncement);
    }

    this.setLocal('announcements', announcements);
    return Promise.resolve();
  }

  private mockUpdateAnnouncement(id: string, updates: Partial<Announcement>): Promise<void> {
    const announcements = this.getLocal<Announcement>('announcements');
    const idx = announcements.findIndex(a => a.id === id);
    if (idx >= 0) {
      announcements[idx] = { ...announcements[idx], ...updates, updatedAt: Date.now() };
      this.setLocal('announcements', announcements);
    }
    return Promise.resolve();
  }

  private mockDeleteAnnouncement(id: string): Promise<void> {
    const announcements = this.getLocal<Announcement>('announcements');
    this.setLocal('announcements', announcements.filter(a => a.id !== id));
    return Promise.resolve();
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

  mockRegister(e: string, p: string, n: string, role: 'applicant' | 'community' = 'applicant'): Promise<User> {
    const u: User = { uid: 'u_'+Date.now(), email: e, password: p, displayName: n, role: toStoredRole(role) };
    this.setLocal('users', [...this.getLocal('users'), u]);
    return Promise.resolve(u);
  }

  mockGetApps(area?: string): Promise<Application[]> {
    const apps = this.getLocal<Application>('apps');
    if (apps.length === 0 && !localStorage.getItem('apps_init')) {
      const normalized = DEMO_APPS.map((app, index) => mapApplicationFromFirestore(
        app as Application,
        app.id || `demo_app_${index + 1}`
      ));
      this.setLocal('apps', normalized);
      localStorage.setItem('apps_init', '1');
      return Promise.resolve(normalized);
    }
    const mapped = apps.map(app => mapApplicationFromFirestore(app as Application, app.id));
    if (area && area !== 'All') {
      const areaId = resolveAreaId(area as Area, null);
      const crossAreaId = AREA_NAME_TO_ID['Cross-Area'];
      return Promise.resolve(mapped.filter(a => a.area === area || a.areaId === areaId || a.area === 'Cross-Area' || a.areaId === crossAreaId));
    }
    return Promise.resolve(mapped);
  }

  mockCreateApp(a: any): Promise<void> {
    const code = a.area?.substring(0,3).toUpperCase() || 'GEN';
    const base = { ...a, id: 'app_'+Date.now(), createdAt: Date.now(), updatedAt: Date.now(), ref: `PB-${code}-${Math.floor(Math.random()*900)}`, status: 'Submitted-Stage1' as ApplicationStatus };
    const na = mapApplicationFromFirestore(base as Application, base.id);
    this.setLocal('apps', [...this.getLocal('apps'), na]);
    return Promise.resolve();
  }

  mockUpdateApp(id: string, up: any): Promise<void> {
    const apps = this.getLocal<Application>('apps');
    const i = apps.findIndex(a => a.id === id);
    if(i>=0) {
      const updated = mapApplicationFromFirestore({ ...apps[i], ...up, updatedAt: Date.now() } as Application, id);
      apps[i] = updated;
      this.setLocal('apps', apps);
    }
    return Promise.resolve();
  }

  mockDeleteApp(id: string): Promise<void> {
    this.setLocal('apps', this.getLocal<Application>('apps').filter(a => a.id !== id));
    return Promise.resolve();
  }

  mockSaveVote(vote: Vote): Promise<void> {
    const votes = this.getLocal<Vote>('votes');
    const normalized = mapVoteToFirestore(vote);
    const i = votes.findIndex(v => v.appId === vote.appId && v.voterId === vote.voterId);
    if(i>=0) votes[i] = normalized as Vote; else votes.push(normalized as Vote);
    this.setLocal('votes', votes);
    return Promise.resolve();
  }

  mockGetVotes(): Promise<Vote[]> {
    return Promise.resolve(this.getLocal<Vote>('votes').map(vote => mapVoteFromFirestore(vote, vote.id)));
  }

  mockSavePublicVote(vote: PublicVote): Promise<void> {
    const votes = this.getLocal<PublicVote>('publicVotes');
    const voteId = vote.id || `${vote.applicationId}_${vote.voterId}`;
    const normalized = { ...vote, id: voteId };
    const i = votes.findIndex(v => v.applicationId === vote.applicationId && v.voterId === vote.voterId);
    if (i >= 0) {
      votes[i] = normalized;
    } else {
      votes.push(normalized);
    }
    this.setLocal('publicVotes', votes);
    return Promise.resolve();
  }

  mockGetPublicVotes(): Promise<PublicVote[]> {
    return Promise.resolve(this.getLocal<PublicVote>('publicVotes'));
  }

  mockSaveScore(s: Score): Promise<void> {
    const scores = this.getLocal<Score>('scores');
    const i = scores.findIndex(x => x.appId === s.appId && x.scorerId === s.scorerId);
    const normalized = mapScoreToFirestore(s);
    if(i>=0) scores[i] = normalized as Score; else scores.push(normalized as Score);
    this.setLocal('scores', scores);
    return Promise.resolve();
  }

  mockGetScores(): Promise<Score[]> {
    return Promise.resolve(this.getLocal<Score>('scores').map(score => mapScoreFromFirestore(score, score.id)));
  }

  mockGetUsers(): Promise<User[]> {
    const u = this.getLocal<User>('users');
    if(u.length === 0) {
      const normalized = DEMO_USERS.map(user => mapUserFromFirestore(user as User, user.uid));
      this.setLocal('users', normalized);
      return Promise.resolve(normalized);
    }
    return Promise.resolve(u.map(user => mapUserFromFirestore(user as User, user.uid)));
  }

  mockUpdateUser(u: User): Promise<void> {
    const users = this.getLocal<User>('users');
    const i = users.findIndex(x => x.uid === u.uid);
    if(i>=0) { users[i] = { ...users[i], ...u, role: toStoredRole(u.role) }; this.setLocal('users', users); }
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
      role: toStoredRole(u.role),
      isActive: true,
      createdAt: Date.now()
    };
    this.setLocal('users', [...this.getLocal('users'), newUser]);
    return Promise.resolve();
  }

  mockGetDocumentFolders(visibility?: DocumentVisibility | DocumentVisibility[]): Promise<DocumentFolder[]> {
    let folders = this.getLocal<DocumentFolder>('documentFolders');
    // Seed demo data if empty
    if (folders.length === 0) {
      this.setLocal('documentFolders', DEMO_DOCUMENT_FOLDERS);
      folders = DEMO_DOCUMENT_FOLDERS;
    }
    if (!visibility) return Promise.resolve(folders);
    const values = Array.isArray(visibility) ? visibility : [visibility];
    return Promise.resolve(folders.filter(folder => values.includes(folder.visibility)));
  }

  mockCreateDocumentFolder(folder: DocumentFolder): Promise<void> {
    this.setLocal('documentFolders', [...this.getLocal('documentFolders'), folder]);
    return Promise.resolve();
  }

  mockDeleteDocumentFolder(id: string): Promise<void> {
    this.setLocal('documentFolders', this.getLocal<DocumentFolder>('documentFolders').filter(folder => folder.id !== id));
    return Promise.resolve();
  }

  mockUpdateDocumentFolder(id: string, updates: Partial<DocumentFolder>): Promise<void> {
    const folders = this.getLocal<DocumentFolder>('documentFolders');
    const i = folders.findIndex(folder => folder.id === id);
    if (i >= 0) { folders[i] = { ...folders[i], ...updates }; this.setLocal('documentFolders', folders); }
    return Promise.resolve();
  }

  mockGetDocuments(options?: { visibility?: DocumentVisibility | DocumentVisibility[]; folderId?: string | null; }): Promise<DocumentItem[]> {
    let docs = this.getLocal<DocumentItem>('documents');
    // Seed demo data if empty
    if (docs.length === 0) {
      this.setLocal('documents', DEMO_DOCUMENTS);
      docs = DEMO_DOCUMENTS;
    }
    if (options?.visibility) {
      const values = Array.isArray(options.visibility) ? options.visibility : [options.visibility];
      docs = docs.filter(doc => values.includes(doc.visibility));
    }
    if (options?.folderId && options.folderId !== 'root') {
      docs = docs.filter(doc => doc.folderId === options.folderId);
    }
    return Promise.resolve(docs);
  }

  mockCreateDocument(docItem: DocumentItem): Promise<void> {
    this.setLocal('documents', [...this.getLocal('documents'), docItem]);
    return Promise.resolve();
  }

  mockDeleteDocument(id: string): Promise<void> {
    this.setLocal('documents', this.getLocal<DocumentItem>('documents').filter(doc => doc.id !== id));
    return Promise.resolve();
  }

  mockUpdateDocument(id: string, updates: Partial<DocumentItem>): Promise<void> {
    const docs = this.getLocal<DocumentItem>('documents');
    const i = docs.findIndex(doc => doc.id === id);
    if (i >= 0) { docs[i] = { ...docs[i], ...updates }; this.setLocal('documents', docs); }
    return Promise.resolve();
  }

  mockGetFinancials(): Promise<FinancialRecord[]> {
    let financials = this.getLocal<FinancialRecord>('financials');
    if (financials.length === 0) {
      this.setLocal('financials', DEMO_FINANCIALS);
      financials = DEMO_FINANCIALS;
    }
    return Promise.resolve(financials);
  }

  mockSaveFinancials(record: FinancialRecord): Promise<void> {
    const financials = this.getLocal<FinancialRecord>('financials');
    const i = financials.findIndex(item => item.roundId === record.roundId);
    if (i >= 0) {
      financials[i] = record;
    } else {
      financials.push(record);
    }
    this.setLocal('financials', financials);
    return Promise.resolve();
  }

  mockGetRounds(): Promise<Round[]> {
    let rounds = this.getLocal<Round>('rounds');
    if (rounds.length === 0) {
      this.setLocal('rounds', DEMO_ROUNDS);
      rounds = DEMO_ROUNDS;
    }
    return Promise.resolve(rounds);
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
    let assignments = this.getLocal<Assignment>('assignments');
    if (assignments.length === 0) {
      this.setLocal('assignments', DEMO_ASSIGNMENTS);
      assignments = DEMO_ASSIGNMENTS;
    }
    return Promise.resolve(committeeId ? assignments.filter(a => a.committeeId === committeeId) : assignments);
  }

  mockCreateAssignment(assignment: Assignment): Promise<void> {
    const id = buildAssignmentId(assignment);
    this.setLocal('assignments', [...this.getLocal('assignments'), { ...assignment, id }]);
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
    const stored = this.getLocal<PortalSettings>('portalSettings')[0];
    return Promise.resolve({ ...DEFAULT_SETTINGS, ...stored });
  }

  mockUpdateSettings(s: PortalSettings): Promise<void> {
    this.setLocal('portalSettings', [s]);
    return Promise.resolve();
  }

  mockGetAuditLogs(): Promise<AuditLog[]> {
    let logs = this.getLocal<AuditLog>('auditLogs');
    if (logs.length === 0) {
      this.setLocal('auditLogs', DEMO_AUDIT_LOGS);
      logs = DEMO_AUDIT_LOGS;
    }
    return Promise.resolve(logs);
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

// Comprehensive test data seeding function
export const seedAllTestData = async (adminId: string): Promise<{
  users: number;
  rounds: number;
  applications: number;
  assignments: number;
  auditLogs: number;
  announcements: number;
  errors: string[];
}> => {
  const result = {
    users: 0,
    rounds: 0,
    applications: 0,
    assignments: 0,
    auditLogs: 0,
    announcements: 0,
    errors: [] as string[]
  };

  const timestamp = Date.now();

  try {
    // 1. SEED USERS - Create committee members for each area
    const testUsers = [
      { uid: 'test-admin-001', displayName: 'Admin User', email: 'admin@test.local', role: 'admin', area: null },
      // Blaenavon committee
      { uid: 'test-comm-bl-001', displayName: 'Sarah Jones (Blaenavon)', email: 'sarah.jones@test.local', role: 'committee', area: 'Blaenavon' },
      { uid: 'test-comm-bl-002', displayName: 'Tom Williams (Blaenavon)', email: 'tom.williams@test.local', role: 'committee', area: 'Blaenavon' },
      // Thornhill committee
      { uid: 'test-comm-th-001', displayName: 'Emma Davies (Thornhill)', email: 'emma.davies@test.local', role: 'committee', area: 'Thornhill & Upper Cwmbran' },
      { uid: 'test-comm-th-002', displayName: 'James Morgan (Thornhill)', email: 'james.morgan@test.local', role: 'committee', area: 'Thornhill & Upper Cwmbran' },
      // Trevethin committee
      { uid: 'test-comm-tr-001', displayName: 'Lisa Evans (Trevethin)', email: 'lisa.evans@test.local', role: 'committee', area: 'Trevethin, Penygarn & St. Cadocs' },
      { uid: 'test-comm-tr-002', displayName: 'David Thomas (Trevethin)', email: 'david.thomas@test.local', role: 'committee', area: 'Trevethin, Penygarn & St. Cadocs' },
      // Applicants
      { uid: 'test-app-001', displayName: 'Applicant One', email: 'applicant1@test.local', role: 'applicant', area: 'Blaenavon' },
      { uid: 'test-app-002', displayName: 'Applicant Two', email: 'applicant2@test.local', role: 'applicant', area: 'Thornhill & Upper Cwmbran' },
    ];

    for (const user of testUsers) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          ...user,
          createdAt: timestamp,
          updatedAt: timestamp
        });
        result.users++;
      } catch (e: any) {
        result.errors.push(`User ${user.email}: ${e.message}`);
      }
    }

    // 2. SEED ROUNDS - Create funding rounds
    const testRounds = [
      {
        id: 'round-2025',
        name: "Communities' Choice 2025",
        year: 2025,
        status: 'scoring' as const,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        areas: ['Blaenavon', 'Thornhill & Upper Cwmbran', 'Trevethin, Penygarn & St. Cadocs'] as any[],
        stage1Open: true,
        stage2Open: true,
        scoringOpen: true
      },
      {
        id: 'round-2026',
        name: "Communities' Choice 2026",
        year: 2026,
        status: 'planning' as const,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        areas: [] as any[],
        stage1Open: false,
        stage2Open: false,
        scoringOpen: false
      }
    ];

    for (const round of testRounds) {
      try {
        await setDoc(doc(db, 'rounds', round.id), round);
        result.rounds++;
      } catch (e: any) {
        result.errors.push(`Round ${round.name}: ${e.message}`);
      }
    }

    // 3. SEED APPLICATIONS - Create test applications
    const testApps = [
      // Blaenavon - Stage 1
      { ref: 'TEST-BL-001', projectTitle: 'Blaenavon Youth Club Renovation', orgName: 'Blaenavon Youth Association', area: 'Blaenavon', status: 'Submitted-Stage1', amountRequested: 4500, summary: 'Renovating the local youth club to provide better facilities for young people.', priority: 'Youth Services' },
      { ref: 'TEST-BL-002', projectTitle: 'Heritage Walking Tours', orgName: 'Blaenavon Heritage Trust', area: 'Blaenavon', status: 'Submitted-Stage1', amountRequested: 2800, summary: 'Creating guided walking tours showcasing our industrial heritage.', priority: 'Culture & Heritage' },
      // Blaenavon - Stage 2
      { ref: 'TEST-BL-003', projectTitle: 'Community Garden Project', orgName: 'Blaenavon Green Spaces', area: 'Blaenavon', status: 'Submitted-Stage2', amountRequested: 5000, summary: 'Creating a community garden with growing spaces for families.', priority: 'Environment' },
      { ref: 'TEST-BL-004', projectTitle: 'Senior Fitness Classes', orgName: 'Blaenavon Active Aging', area: 'Blaenavon', status: 'Invited-Stage2', amountRequested: 3500, summary: 'Weekly fitness classes for over-60s to improve health and wellbeing.', priority: 'Health & Wellbeing' },

      // Thornhill - Stage 1
      { ref: 'TEST-TH-001', projectTitle: 'Thornhill Sports Equipment', orgName: 'Thornhill Sports Club', area: 'Thornhill & Upper Cwmbran', status: 'Submitted-Stage1', amountRequested: 3200, summary: 'Purchasing new sports equipment for community use.', priority: 'Sports & Recreation' },
      { ref: 'TEST-TH-002', projectTitle: 'Digital Skills Workshop', orgName: 'Upper Cwmbran Community Centre', area: 'Thornhill & Upper Cwmbran', status: 'Submitted-Stage1', amountRequested: 4000, summary: 'Providing digital skills training for seniors.', priority: 'Education & Training' },
      // Thornhill - Stage 2
      { ref: 'TEST-TH-003', projectTitle: 'After School Club', orgName: 'Thornhill Primary PTA', area: 'Thornhill & Upper Cwmbran', status: 'Submitted-Stage2', amountRequested: 4800, summary: 'Establishing an after-school club for working parents.', priority: 'Childcare' },
      { ref: 'TEST-TH-004', projectTitle: 'Community Bus Service', orgName: 'Cwmbran Transport Link', area: 'Thornhill & Upper Cwmbran', status: 'Invited-Stage2', amountRequested: 6000, summary: 'Running a weekly community bus to help residents access services.', priority: 'Transport' },

      // Trevethin - Stage 1
      { ref: 'TEST-TR-001', projectTitle: 'Penygarn Play Area', orgName: 'Penygarn Residents Group', area: 'Trevethin, Penygarn & St. Cadocs', status: 'Submitted-Stage1', amountRequested: 5500, summary: 'Improving the local play area with new equipment.', priority: 'Children & Families' },
      { ref: 'TEST-TR-002', projectTitle: 'St Cadocs Food Bank', orgName: 'St Cadocs Church', area: 'Trevethin, Penygarn & St. Cadocs', status: 'Submitted-Stage1', amountRequested: 2500, summary: 'Expanding food bank services to help more families.', priority: 'Community Support' },
      // Trevethin - Stage 2
      { ref: 'TEST-TR-003', projectTitle: 'Trevethin Community Cafe', orgName: 'Trevethin Community Action', area: 'Trevethin, Penygarn & St. Cadocs', status: 'Submitted-Stage2', amountRequested: 4200, summary: 'Setting up a community cafe as a social hub.', priority: 'Social Enterprise' },
      { ref: 'TEST-TR-004', projectTitle: 'Youth Music Programme', orgName: 'Trevethin Youth Music', area: 'Trevethin, Penygarn & St. Cadocs', status: 'Invited-Stage2', amountRequested: 3800, summary: 'Music lessons and instruments for local young people.', priority: 'Arts & Music' },
    ];

    for (let i = 0; i < testApps.length; i++) {
      const app = testApps[i];
      const id = `test_app_${app.ref.toLowerCase().replace(/-/g, '_')}_${timestamp}`;
      try {
        await setDoc(doc(db, 'applications', id), {
          id,
          ref: app.ref,
          projectTitle: app.projectTitle,
          orgName: app.orgName,
          area: app.area,
          status: app.status,
          amountRequested: app.amountRequested,
          summary: app.summary,
          priority: app.priority,
          roundId: 'round-2025',
          userId: `test-app-00${(i % 2) + 1}`,
          applicantName: 'Test Applicant',
          applicantEmail: 'test@example.com',
          applicantPhone: '01234 567890',
          applicantAddress: `Test Address, ${app.area}`,
          createdAt: timestamp + i,
          updatedAt: timestamp + i,
        });
        result.applications++;
      } catch (e: any) {
        result.errors.push(`App ${app.ref}: ${e.message}`);
      }
    }

    // 4. SEED ASSIGNMENTS - Create assignments for Stage 2 apps
    const stage2Apps = testApps.filter(a => a.status === 'Submitted-Stage2' || a.status === 'Invited-Stage2');
    const areaToCommittee: Record<string, string[]> = {
      'Blaenavon': ['test-comm-bl-001', 'test-comm-bl-002'],
      'Thornhill & Upper Cwmbran': ['test-comm-th-001', 'test-comm-th-002'],
      'Trevethin, Penygarn & St. Cadocs': ['test-comm-tr-001', 'test-comm-tr-002'],
    };

    for (const app of stage2Apps) {
      const appId = `test_app_${app.ref.toLowerCase().replace(/-/g, '_')}_${timestamp}`;
      const committeeIds = areaToCommittee[app.area] || [];

      for (const committeeId of committeeIds) {
        const assignmentId = `${appId}_${committeeId}`;
        try {
          await setDoc(doc(db, 'assignments', assignmentId), {
            id: assignmentId,
            applicationId: appId,
            committeeId: committeeId,
            assignedDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'assigned',
            stage: 'stage2',
            area: app.area,
            assignedBy: adminId
          });
          result.assignments++;
        } catch (e: any) {
          result.errors.push(`Assignment ${assignmentId}: ${e.message}`);
        }
      }
    }

    // 5. SEED AUDIT LOGS - Create sample audit entries
    const auditActions = [
      { action: 'USER_LOGIN', targetId: 'test-admin-001', details: { email: 'admin@test.local' } },
      { action: 'SETTINGS_UPDATE', targetId: 'global', details: { stage1VotingOpen: true, stage2ScoringOpen: true } },
      { action: 'ROUND_CREATE', targetId: 'round-2025', details: { name: "Communities' Choice 2025" } },
      { action: 'APPLICATION_STATUS_CHANGE', targetId: 'TEST-BL-003', details: { from: 'Submitted-Stage1', to: 'Submitted-Stage2' } },
      { action: 'BULK_ASSIGNMENT', targetId: 'Blaenavon', details: { stage: 'stage2', created: 4 } },
      { action: 'USER_CREATE', targetId: 'test-comm-bl-001', details: { role: 'committee', area: 'Blaenavon' } },
      { action: 'ANNOUNCEMENT_SAVE', targetId: 'announcement_1', details: { title: 'Welcome to Communities Choice' } },
    ];

    for (let i = 0; i < auditActions.length; i++) {
      const logId = `audit_seed_${timestamp}_${i}`;
      try {
        await setDoc(doc(db, 'auditLogs', logId), {
          id: logId,
          adminId: adminId,
          action: auditActions[i].action,
          targetId: auditActions[i].targetId,
          details: auditActions[i].details,
          timestamp: timestamp - (i * 3600000) // Space logs out by 1 hour each
        });
        result.auditLogs++;
      } catch (e: any) {
        result.errors.push(`AuditLog ${logId}: ${e.message}`);
      }
    }

    // 6. SEED ANNOUNCEMENTS - Create sample announcements
    const testAnnouncements = [
      {
        id: `announcement_seed_1_${timestamp}`,
        title: 'Welcome to Communities Choice 2025',
        content: 'We are excited to launch this year\'s participatory budgeting programme. Local residents can now submit applications for community projects.',
        category: 'general' as const,
        visibility: 'all' as const,
        priority: 'high' as const,
        pinned: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: adminId,
        readCount: 0
      },
      {
        id: `announcement_seed_2_${timestamp}`,
        title: 'Stage 2 Scoring Now Open',
        content: 'Committee members can now score Stage 2 applications. Please complete your assigned applications by the deadline.',
        category: 'deadline' as const,
        visibility: 'committee' as const,
        priority: 'urgent' as const,
        pinned: false,
        createdAt: timestamp - 86400000,
        updatedAt: timestamp - 86400000,
        createdBy: adminId,
        readCount: 0
      },
      {
        id: `announcement_seed_3_${timestamp}`,
        title: 'Application Tips',
        content: 'Make sure your application clearly states the community benefit and includes a realistic budget breakdown.',
        category: 'update' as const,
        visibility: 'applicants' as const,
        priority: 'normal' as const,
        pinned: false,
        createdAt: timestamp - 172800000,
        updatedAt: timestamp - 172800000,
        createdBy: adminId,
        readCount: 0
      }
    ];

    for (const announcement of testAnnouncements) {
      try {
        await setDoc(doc(db, 'announcements', announcement.id), announcement);
        result.announcements++;
      } catch (e: any) {
        result.errors.push(`Announcement ${announcement.id}: ${e.message}`);
      }
    }

  } catch (e: any) {
    result.errors.push(`General error: ${e.message}`);
  }

  return result;
};
