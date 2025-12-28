# Migration Notes: v7 to v8 Merge

This document outlines the architectural changes made during the merger of version 7 and version 8 of the Communities' Choice PB Portal.

## Overview

The merged portal combines:
- **v7 Core**: Complete Firebase backend infrastructure, data models, and business logic
- **v8 UI/UX**: Modern React Router-based routing, improved component architecture, polished UI

## Architectural Changes

### 1. Routing System: State-Based → React Router

#### v7 (Original)
```typescript
// State-based routing using useState
const [currentView, setCurrentView] = useState('landing');

const renderPage = () => {
  switch(currentView) {
    case 'login': return <LoginPage />;
    case 'dashboard': return <Dashboard />;
    // ...
  }
};
```

#### v8 (Merged)
```typescript
// URL-based routing using React Router v7
<BrowserRouter>
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/portal/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/portal/scoring" element={<ProtectedRoute requiredRole={...}><ScoringMatrix /></ProtectedRoute>} />
  </Routes>
</BrowserRouter>
```

**Benefits**:
- URLs reflect current page state (bookmarkable links)
- Browser back/forward navigation works correctly
- Better for SEO and sharing links
- Route guard component (`ProtectedRoute`) handles role-based access

### 2. Route Protection & Role-Based Access Control

#### ProtectedRoute Component
```typescript
interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: UserRole | UserRole[];
}

<ProtectedRoute requiredRole={[UserRole.COMMITTEE, UserRole.ADMIN]}>
  <ScoringMatrix />
</ProtectedRoute>
```

**Key Features**:
- Checks Firebase authentication state on mount
- Validates user role before rendering component
- Redirects to login if not authenticated
- Redirects to dashboard if insufficient permissions
- Prevents route access via direct URL manipulation

#### Route Structure

```
Public Routes (No Authentication Required):
  / (Landing Page)
  /vote (Postcode Checker)
  /priorities (Priorities)
  /timeline (Timeline)
  /documents (Documents)
  /login (Login)

Protected Routes (Authentication Required):
  /portal/dashboard (All authenticated users)
  /portal/applications (All authenticated users)
  /portal/application/:id (All authenticated users)
  /portal/scoring (Committee + Admin only)
  /portal/admin (Admin only)
```

### 3. Session Management

#### User Session Storage
```typescript
// On login, user object stored in localStorage
localStorage.setItem('pb_user', JSON.stringify(user));

// Retrieved by ProtectedRoute on page refresh
const currentUser = api.getCurrentUser(); // Reads from localStorage
```

**Page Refresh Behavior**:
- Page refresh preserves authenticated session
- ProtectedRoute automatically redirects unauthorized users to login
- All pages accessible after session restoration

### 4. Component Architecture

#### v7 Structure (Monolithic)
```
/views/
  Public.tsx (1000+ lines)
  Secure.tsx (1500+ lines)
  AdminRounds.tsx (800+ lines)
```

#### v8 Structure (Modular)
```
/pages/
  LoginPage.tsx (200 lines)
  /public/
    LandingPage.tsx
    PostcodeCheckPage.tsx
    PrioritiesPage.tsx
    TimelinePage.tsx
    DocumentsPage.tsx
  /secure/
    Dashboard.tsx
    ApplicationForm.tsx
    ApplicationsList.tsx
    ScoringMatrix.tsx
    AdminConsole.tsx

/components/
  Layout.tsx (Shared navigation, footer)
  UI.tsx (Reusable components: Button, Modal, Card, etc.)
```

**Benefits**:
- Single Responsibility Principle per file
- Easier testing and maintenance
- Clear page organization
- Reusable UI component library

### 5. Data Service Layer

#### Unchanged Core
```typescript
// Same API interface preserved from v7
import { api } from './services/firebase';

await api.createApplication(appData);
await api.saveScore(scoreData);
await api.getApplications();
// ... all v7 methods available
```

#### Export Compatibility
```typescript
// services/firebase.ts line 534-537
export const api = new AuthService(); // Primary instance
export const DataService = api;        // v8 compatibility alias
```

Both import styles work:
```typescript
import { api } from './services/firebase';
import { DataService } from './services/firebase'; // Still works
```

## v7 Features Preserved

### Authentication
- Email/password login and registration ✓
- Role-based user creation (Applicant, Committee, Admin) ✓
- User profile management ✓
- Session persistence ✓

### Application Management
- Two-stage application process (EOI → Full Proposal) ✓
- Application status tracking ✓
- Draft/submitted state management ✓
- Document uploads to Firebase Storage ✓
- Area-based filtering and assignment ✓

### Voting System (Stage 1)
- Community voting on EOI submissions ✓
- Vote counting and aggregation ✓
- Area-based application visibility ✓
- Vote persistence in Firestore ✓

### Scoring System (Stage 2)
- Weighted scoring matrix (5 criteria) ✓
- Committee member scoring ✓
- Score aggregation across committee ✓
- Scoring notes and comments ✓
- Score persistence in Firestore ✓

### Administration
- User account creation and management ✓
- Round configuration (dates, settings) ✓
- Portal settings (stage visibility, thresholds) ✓
- Document management (guidelines, resources) ✓
- Audit logging of admin actions ✓
- CSV export functionality ✓

### Demo Mode
- `USE_DEMO_MODE` toggle in services/firebase.ts ✓
- Demo data from constants.ts (DEMO_USERS, DEMO_APPS) ✓
- Mock implementations for all Firebase operations ✓
- localStorage-based persistence ✓

## v8 Features Adopted

### Modern UI/UX
- Tailwind CSS utility-first styling
- lucide-react icons throughout
- Responsive design (mobile, tablet, desktop)
- Consistent color scheme and typography
- Smooth animations and transitions

### Component Library
- Reusable Button, Card, Modal, Form components
- Layout wrapper with navigation and footer
- Loading states and error handling
- Accessibility improvements

### Navigation
- React Router-based routing (v7.11.0)
- HashRouter for static deployments (#-based URLs)
- Breadcrumb navigation on detail pages
- Automatic redirect based on user role

### Type Safety
- TypeScript interfaces for all data types
- UserRole enum for stricter type checking (line 6-11 in types.ts)
- Optional fields properly marked
- Better IDE autocomplete and error detection

## Key Changes

### 1. Scoring Tasks Relocation

**v7**: Committee members could score directly on dashboard
**v8**: Scoring moved to dedicated `/portal/scoring` page

- Reduces clutter on main dashboard
- Better UX for reviewing and scoring applications
- Dedicated scoring matrix with visual feedback
- Clear separation of concerns (view apps vs. score apps)

### 2. Import Path Changes

All imports now use modular structure:

```typescript
// v7 (Monolithic)
import { Dashboard } from './views/Secure';

// v8 (Modular)
import Dashboard from './pages/secure/Dashboard';
```

### 3. File Structure Changes

```diff
- /views/
+ /pages/
  + /public/
  + /secure/
+ /components/
  + UI.tsx
  + Layout.tsx
+ /services/
  + firebase.ts (moved from root)
```

### 4. Branding Updates

- Standardized logo paths: `public/logo.png`
- Icon files: `icon-192.png`, `icon-512.png`
- Favicon: `public/favicon.ico`
- Manifest: `public/manifest.json`

Update imports:
```typescript
// v7
import logo from './logo.png';

// v8
import logo from '/logo.png'; // Public directory
```

### 5. Constants Organization

All application constants in `constants.ts`:
- DEMO_USERS (demo login accounts)
- DEMO_APPS (sample applications)
- SCORING_CRITERIA (weighted criteria)
- AREAS (geographic areas)

```typescript
import { DEMO_USERS, DEMO_APPS, SCORING_CRITERIA } from '../constants';
```

### 6. Environment Variables

No changes to required variables:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

## TypeScript Improvements

### UserRole Enum
```typescript
// v8 addition: Strict enum for roles
export enum UserRole {
  PUBLIC = 'PUBLIC',
  APPLICANT = 'APPLICANT',
  COMMITTEE = 'COMMITTEE',
  ADMIN = 'ADMIN'
}

// v7 compatibility: String union still available
export type Role = 'applicant' | 'committee' | 'admin';
```

### Data Models
All types in `/types.ts` with proper documentation:
- User (with optional fields)
- Application (two-stage status)
- Score, Vote, Round, Assignment
- PortalSettings, AdminDocument, AuditLog

## Demo Mode Migration

Demo mode functionality preserved with no changes:

```typescript
// services/firebase.ts line 11
export const USE_DEMO_MODE = false; // Set to true for demo

// All methods check:
if (USE_DEMO_MODE) return this.mockLogin(...);
// ... then Firebase operations
```

**Demo Features**:
- Works completely offline (no Firebase needed)
- Uses localStorage for persistence
- Same data structures as production
- Useful for development and testing

## Testing Recommendations

### Before Production Deployment

1. **Test Auth Flow**
   - Login with existing accounts
   - Create new accounts
   - Logout and re-login
   - Page refresh maintains session

2. **Test Route Protection**
   - Direct URL access to /portal/admin (should redirect)
   - Access /portal/scoring as Applicant (should redirect)
   - All routes work after page refresh

3. **Test Application Workflow**
   - Create new application (Stage 1)
   - Submit Stage 1
   - Progress to Stage 2
   - Submit Stage 2
   - Admin status changes

4. **Test Scoring**
   - Committee member can access /portal/scoring
   - Scoring matrix loads assigned applications
   - Scores save to Firestore
   - Other committee scores visible

5. **Test File Uploads**
   - Upload supporting documents
   - Upload budget breakdown
   - Verify files in Firebase Storage
   - Download documents works

6. **Test Admin Operations**
   - Create/delete users
   - Update portal settings
   - Create/manage rounds
   - View audit logs
   - Export to CSV

## Backward Compatibility

- v7 data in Firestore remains unchanged
- Existing user accounts work with new routing
- All business logic identical
- Demo data structures preserved
- API service interface unchanged

## Performance Considerations

**Improved**:
- Modular components enable code splitting
- React Router lazy loading support
- Smaller component bundles
- Better component re-render performance

**Maintained**:
- Firebase query performance unchanged
- Storage upload/download speeds unchanged
- Authentication latency unchanged

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Uses HashRouter (#) for compatibility with static hosting (Vercel, etc.)

## Deployment Notes

### Vercel Deployment

Build command remains: `npm run build`
Framework detection: Automatically detects Vite + React

### Environment Setup

Add to Vercel project environment variables:
- All VITE_FIREBASE_* variables
- No changes to variable names

### Routing Note

HashRouter uses `#` in URLs:
- `example.com/` → `example.com/#/`
- `example.com/login` → `example.com/#/login`

This is intentional for static site hosting and doesn't affect functionality.

## Breaking Changes

**None** - Full backward compatibility maintained

- All existing API calls work unchanged
- All data structures identical
- Authentication flow unchanged
- Database schema unchanged
- Permission logic unchanged

## Rollback Procedure

If needed to revert to v7:

```bash
git log --oneline  # Find v7 commit
git checkout <v7-commit-hash>
git push origin main --force  # Only if absolutely necessary
```

## Migration Completion Checklist

- [x] Routing system migrated to React Router v7
- [x] All pages refactored to modular structure
- [x] Role-based route protection implemented
- [x] Session management via ProtectedRoute
- [x] Component library created (UI.tsx, Layout.tsx)
- [x] All v7 data operations preserved
- [x] Demo mode functionality preserved
- [x] TypeScript types enhanced
- [x] Constants organized (constants.ts)
- [x] Firebase service interface unchanged
- [x] Styling updated to Tailwind CSS
- [x] Icons updated to lucide-react
- [x] Build system verified (Vite 5.2.0)
- [x] Package.json dependencies updated
- [x] Environment variables documented
- [x] Deployment guide created
- [x] QA testing guide created

---

**Migration Completed**: December 2025
**Version**: 1.0.0
**Status**: Production Ready
