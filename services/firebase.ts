import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut as firebaseSignOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  addDoc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { useState, useEffect } from 'react';
import { 
  UserProfile, 
  Application, 
  Round, 
  UserRole, 
  DocumentFolder, 
  PBDocument, 
  CommitteeAssignment,
  PortalSettings,
  AuditLog
} from '../types';

// --- Configuration ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- Auth Hook ---
export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setUser({ ...userData, uid: firebaseUser.uid });
            setRole(userData.role);
          } else {
            // Fallback for new users not yet in Firestore
            setUser({ 
                uid: firebaseUser.uid, 
                email: firebaseUser.email || '', 
                role: 'applicant', 
                displayName: firebaseUser.displayName || '' 
            });
            setRole('applicant');
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = () => firebaseSignOut(auth);

  return { user, role, loading, logout };
};

// --- Applications Hook (CRITICAL FIX FOR CRASH) ---
export const useApplications = (assignedAreaId?: string) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 1. Build the query
    // Default: Sort by newest first
    let q = query(collection(db, 'applications'), orderBy('createdAt', 'desc'));

    // 2. If a specific area is assigned (Committee), filter server-side
    //    This ensures they only download relevant data.
    if (assignedAreaId) {
       q = query(
         collection(db, 'applications'), 
         where('areaId', '==', assignedAreaId),
         orderBy('createdAt', 'desc')
       );
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const apps = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as Application));
        setApplications(apps);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to fetch applications:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [assignedAreaId]);

  const updateStatus = async (id: string, status: Application['status']) => {
    try {
      await updateDoc(doc(db, 'applications', id), { status });
    } catch (err) {
      console.error("Error updating status:", err);
      throw err;
    }
  };

  return { applications, loading, error, updateStatus };
};

// --- Users Hook (For Admin Console) ---
export const useUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    const q = query(collection(db, 'users'));
    return onSnapshot(q, 
        (snapshot) => {
            const userList = snapshot.docs.map(doc => ({ 
                uid: doc.id, 
                ...doc.data() 
            } as UserProfile));
            setUsers(userList);
            setLoading(false);
        },
        (err) => {
            console.error("Error fetching users:", err);
            setError(err);
            setLoading(false);
        }
    );
  };

  useEffect(() => {
    const unsubscribe = fetchUsers();
    return () => unsubscribe();
  }, []);

  return { users, loading, error, refresh: fetchUsers };
};

// --- Rounds Hook (For Admin Rounds) ---
export const useRounds = () => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'rounds'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roundsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Round));
      setRounds(roundsData);
      setLoading(false);
    }, (err) => {
        setError(err);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { rounds, loading, error };
};

// --- Portal Settings Hook (Restored) ---
export const usePortalSettings = () => {
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'global'); // Assumes singleton settings doc
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as PortalSettings);
      } else {
        // Init default if missing
        setSettings({ maintenanceMode: false, currentRoundId: 'round-1' });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: Partial<PortalSettings>) => {
    await setDoc(doc(db, 'settings', 'global'), newSettings, { merge: true });
  };

  return { settings, loading, updateSettings };
};

// --- Stats Hook (Restored) ---
export const useStats = () => {
    const [stats, setStats] = useState<any>({
        totalApplications: 0,
        totalBudget: 0,
        applicationsByStatus: {},
        applicationsByArea: {}
    });

    useEffect(() => {
        // This is a simplified client-side aggregation. 
        // In production with thousands of docs, use Firebase Aggregation Queries or Cloud Functions.
        const q = query(collection(db, 'applications'));
        const unsubscribe = onSnapshot(q, (snap) => {
            let totalApps = 0;
            let totalReq = 0;
            const byStatus: any = {};
            const byArea: any = {};

            snap.forEach(doc => {
                const data = doc.data();
                totalApps++;
                totalReq += (data.amountRequested || 0);
                
                // Count Status
                const s = data.status || 'draft';
                byStatus[s] = (byStatus[s] || 0) + 1;

                // Count Area
                const a = data.areaId || 'unassigned';
                byArea[a] = (byArea[a] || 0) + 1;
            });

            setStats({
                totalApplications: totalApps,
                totalBudget: totalReq,
                applicationsByStatus: byStatus,
                applicationsByArea: byArea
            });
        });

        return () => unsubscribe();
    }, []);

    return stats;
};

// --- Utility Functions ---

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
};

export const updateRound = async (id: string, data: Partial<Round>) => {
    const roundRef = doc(db, 'rounds', id);
    await updateDoc(roundRef, data);
};

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

export const deleteFile = async (path: string): Promise<void> => {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
};

export const createApplication = async (data: Partial<Application>) => {
  const colRef = collection(db, 'applications');
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    status: 'draft'
  });
  return docRef.id;
};

export const getApplication = async (id: string): Promise<Application | null> => {
    const docRef = doc(db, 'applications', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Application;
    }
    return null;
};

// --- Documents & Folders Management (Restored) ---

export const useDocumentFolders = () => {
    const [folders, setFolders] = useState<DocumentFolder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'documentFolders'), orderBy('order', 'asc'));
        return onSnapshot(q, (snapshot) => {
            setFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentFolder)));
            setLoading(false);
        });
    }, []);

    const createFolder = async (name: string, visibility: 'public' | 'committee' | 'admin') => {
        await addDoc(collection(db, 'documentFolders'), {
            name,
            visibility,
            order: folders.length,
            createdAt: serverTimestamp()
        });
    };

    const deleteFolder = async (id: string) => {
        await deleteDoc(doc(db, 'documentFolders', id));
    };

    return { folders, loading, createFolder, deleteFolder };
};

export const useDocuments = (folderId: string) => {
    const [documents, setDocuments] = useState<PBDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!folderId) return;
        const q = query(collection(db, 'documents'), where('folderId', '==', folderId), orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
            setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PBDocument)));
            setLoading(false);
        });
    }, [folderId]);

    const uploadDocument = async (file: File, name: string) => {
        const path = `documents/${folderId}/${Date.now()}_${file.name}`;
        const url = await uploadFile(file, path);
        await addDoc(collection(db, 'documents'), {
            folderId,
            name,
            url,
            storagePath: path,
            type: file.type,
            size: file.size,
            createdAt: serverTimestamp()
        });
    };

    const removeDocument = async (id: string, storagePath: string) => {
        await deleteFile(storagePath);
        await deleteDoc(doc(db, 'documents', id));
    };

    return { documents, loading, uploadDocument, removeDocument };
};

// --- Audit Logging (Restored) ---
export const logAuditEvent = async (userId: string, action: string, details: any) => {
    try {
        await addDoc(collection(db, 'auditLogs'), {
            userId,
            action,
            details,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log audit event", e);
    }
};

// --- Committee Assignments (Restored) ---
export const useAssignments = () => {
    const [assignments, setAssignments] = useState<CommitteeAssignment[]>([]);
    
    useEffect(() => {
        const q = query(collection(db, 'assignments'));
        return onSnapshot(q, (snap) => {
            setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommitteeAssignment)));
        });
    }, []);

    const assignCommittee = async (userId: string, areaId: string) => {
        await addDoc(collection(db, 'assignments'), {
            userId,
            areaId,
            assignedAt: serverTimestamp()
        });
    };

    return { assignments, assignCommittee };
};

// --- My Votes (Restored) ---
export const useMyVotes = () => {
    const [votes, setVotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Query scores where scorerId == user.uid
        // Note: Requires index on 'scores' collection
        const q = query(collection(db, 'scores'), where('scorerId', '==', user.uid));
        
        return onSnapshot(q, (snapshot) => {
            const myVotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setVotes(myVotes);
            setLoading(false);
        }, (err) => {
            console.error("Failed to load my votes", err);
            setLoading(false);
        });
    }, [user]);

    return { votes, loading };
};
