// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, setPersistence, browserLocalPersistence, User as FirebaseUser } from 'firebase/auth';
import { auth, db, USE_DEMO_MODE } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load user profile from Firestore
  const loadUserProfile = async (uid: string): Promise<User | null> => {
    if (USE_DEMO_MODE) {
      // In demo mode, read from localStorage
      const stored = localStorage.getItem('pb_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
      return null;
    }

    if (!db) return null;

    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data() as User;
      }

      // Profile not found - could be a new user or data issue
      console.warn(`User profile not found for uid: ${uid}`);
      return null;
    } catch (err) {
      console.error('Error loading user profile:', err);
      return null;
    }
  };

  // Refresh user profile from Firestore
  const refreshProfile = async (): Promise<void> => {
    if (firebaseUser) {
      const profile = await loadUserProfile(firebaseUser.uid);
      setUserProfile(profile);
      // Update localStorage for backward compatibility during transition
      if (profile) {
        localStorage.setItem('pb_user', JSON.stringify(profile));
      }
    }
  };

  // Set up Firebase Auth persistence and state listener
  useEffect(() => {
    const initAuth = async () => {
      if (USE_DEMO_MODE) {
        // Demo mode: read user from localStorage
        const stored = localStorage.getItem('pb_user');
        if (stored) {
          try {
            const user = JSON.parse(stored);
            setUserProfile(user);
            // Create a mock firebase user object for demo
            setFirebaseUser({ uid: user.uid, email: user.email } as FirebaseUser);
          } catch {
            setUserProfile(null);
            setFirebaseUser(null);
          }
        }
        setLoading(false);
        setInitialized(true);
        return;
      }

      if (!auth) {
        console.error('Firebase Auth not initialized');
        setLoading(false);
        setInitialized(true);
        return;
      }

      try {
        // Set persistence to local (survives browser restarts)
        await setPersistence(auth, browserLocalPersistence);
      } catch (err) {
        console.error('Error setting auth persistence:', err);
      }

      // Listen to auth state changes
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        setFirebaseUser(fbUser);

        if (fbUser) {
          // User is signed in - load their profile
          const profile = await loadUserProfile(fbUser.uid);

          if (profile) {
            setUserProfile(profile);
            // Update localStorage for backward compatibility
            localStorage.setItem('pb_user', JSON.stringify(profile));
            setError(null);
          } else {
            // Profile not found - this could happen for new OAuth users
            // or if there's a data inconsistency
            setError('User profile not found. Please contact support.');
            setUserProfile(null);
            localStorage.removeItem('pb_user');
          }
        } else {
          // User is signed out
          setUserProfile(null);
          localStorage.removeItem('pb_user');
          setError(null);
        }

        setLoading(false);
        setInitialized(true);
      });

      return unsubscribe;
    };

    const cleanup = initAuth();

    return () => {
      cleanup?.then(unsub => unsub?.());
    };
  }, []);

  // For demo mode: watch localStorage changes
  useEffect(() => {
    if (!USE_DEMO_MODE) return;

    const handleStorageChange = () => {
      const stored = localStorage.getItem('pb_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setUserProfile(user);
          setFirebaseUser({ uid: user.uid, email: user.email } as FirebaseUser);
        } catch {
          setUserProfile(null);
          setFirebaseUser(null);
        }
      } else {
        setUserProfile(null);
        setFirebaseUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: AuthContextType = {
    firebaseUser,
    userProfile,
    loading,
    error,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export a function for backward compatibility with existing code
// This reads from the context if available, otherwise falls back to localStorage
export const getCurrentUserFromContext = (): User | null => {
  // This is a fallback for code that can't use hooks
  const stored = localStorage.getItem('pb_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export default AuthContext;
