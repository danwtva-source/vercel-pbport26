import { User, UserRole, Application, ScoringState, Criterion } from '../types';
import { DEMO_USERS, DEMO_APPLICATIONS, SCORING_CRITERIA } from '../constants';

// SIMULATED LATENCY
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// AUTH SERVICE
export const AuthService = {
  login: async (email: string): Promise<User> => {
    await delay(500);
    const user = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error("User not found");
    // Persist to local storage for "session"
    localStorage.setItem('pb_user', JSON.stringify(user));
    return user;
  },
  
  logout: async () => {
    localStorage.removeItem('pb_user');
  },

  getCurrentUser: (): User | null => {
    const u = localStorage.getItem('pb_user');
    return u ? JSON.parse(u) : null;
  }
};

// DATA SERVICE
export const DataService = {
  getApplications: async (user: User): Promise<Application[]> => {
    await delay(300);
    if (user.role === UserRole.ADMIN) return DEMO_APPLICATIONS;
    if (user.role === UserRole.COMMITTEE) {
      // In a real repo, this would be a Firestore query using `where('area', '==', user.area)`
      // or handling cross-area logic securely server-side.
      return DEMO_APPLICATIONS.filter(app => app.area === user.area || app.area === 'Cross-Area Application');
    }
    if (user.role === UserRole.APPLICANT) {
      // Filter by applicant name/ID - simplistic for mock
      return DEMO_APPLICATIONS.filter(app => app.applicant === user.name);
    }
    return [];
  },

  getScoringState: async (user: User, ref: string): Promise<ScoringState | null> => {
    await delay(200);
    const key = `scoring_${user.name.replace(/\s+/g, '_')}_${ref}`;
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    
    // Return empty template
    return {
      ref,
      scorer: user.name,
      criteria: SCORING_CRITERIA.map(c => ({...c, score: 0, notes: ''})),
      isFinal: false,
      updatedAt: new Date().toISOString()
    };
  },

  saveScoringState: async (state: ScoringState): Promise<void> => {
    await delay(400);
    const key = `scoring_${state.scorer.replace(/\s+/g, '_')}_${state.ref}`;
    localStorage.setItem(key, JSON.stringify(state));
    
    // Also update "Master Tracker" if final
    if (state.isFinal) {
      const master = JSON.parse(localStorage.getItem('scoring_masterTracker') || '[]');
      const entry = {
        ref: state.ref,
        scorer: state.scorer,
        totalScore: state.criteria.reduce((acc, c) => acc + ((c.score || 0) / 3) * c.weight, 0),
        timestamp: new Date().toISOString(),
        scores: state.criteria.map(c => ({ id: c.id, score: c.score, notes: c.notes }))
      };
      
      const idx = master.findIndex((m: any) => m.ref === state.ref && m.scorer === state.scorer);
      if (idx !== -1) master[idx] = entry;
      else master.push(entry);
      
      localStorage.setItem('scoring_masterTracker', JSON.stringify(master));
    }
  }
};