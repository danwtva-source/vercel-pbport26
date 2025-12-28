# Communities' Choice Participatory Budgeting Portal

A modern, role-based Participatory Budgeting (PB) application built with React, TypeScript, and Firebase. This portal enables applicants to submit project  proposals, committees to score and vote on them, and administrators to manage the entire process.

## Project Overview

The Communities' Choice PB Portal is a two-stage application system where:

- **Stage 1 (EOI)**: Applicants submit Expressions of Interest, community members vote on projects
- **Stage 2 (Full Proposal)**: Selected applicants refine their proposals, committee members score them using a weighted matrix

The portal supports three primary user roles with distinct workflows:
- **Applicants**: Submit and manage project proposals
- **Committee Members**: Review applications, vote, and score proposals
- **Administrators**: Manage users, configure portal settings, manage application rounds

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.4.0 | Type-safe development |
| **Vite** | 5.2.0 | Build tool and dev server |
| **React Router** | 7.11.0 | Client-side routing with HashRouter |
| **Firebase** | 10.12.2 | Backend services (Auth, Firestore, Storage) |
| **Tailwind CSS** | Latest | Utility-first styling |
| **lucide-react** | 0.562.0 | Icon library |

## Project Structure

```
/home/user/vercel-pbport26/
├── App.tsx                    # Main routing configuration
├── index.tsx                  # React app entry point
├── types.ts                   # TypeScript type definitions & enums
├── constants.ts               # Demo data and scoring criteria
│
├── pages/
│   ├── LoginPage.tsx         # Authentication page
│   ├── public/               # Public-facing pages
│   │   ├── LandingPage.tsx   # Home page with project info
│   │   ├── PostcodeCheckPage.tsx  # Postcode eligibility checker
│   │   ├── PrioritiesPage.tsx     # Project priorities display
│   │   ├── TimelinePage.tsx       # Project timeline
│   │   └── DocumentsPage.tsx      # Resource documents
│   └── secure/               # Role-protected pages
│       ├── Dashboard.tsx      # User dashboard (all authenticated users)
│       ├── ApplicationForm.tsx # Create/edit applications
│       ├── ApplicationsList.tsx # View submitted applications
│       ├── ScoringMatrix.tsx  # Committee scoring interface
│       └── AdminConsole.tsx   # Admin user & round management
│
├── components/
│   ├── Layout.tsx            # Shared layout wrapper
│   └── UI.tsx                # Reusable UI components
│
├── services/
│   └── firebase.ts           # Firebase initialization & API service
│
├── views/                    # Legacy view wrappers (v7 compatibility)
│   ├── Public.tsx
│   ├── Secure.tsx
│   └── AdminRounds.tsx
│
├── public/                   # Static assets
├── dist/                     # Build output (generated)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
└── .gitignore                # Git ignore rules
```

## Environment Setup

### Required Environment Variables

Create a `.env` file in the project root with Firebase configuration:

```bash
# Firebase Configuration (get from Firebase Console)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Demo Mode Toggle

To test the application without Firebase:

1. Open `/home/user/vercel-pbport26/services/firebase.ts`
2. Change line 11: `export const USE_DEMO_MODE = true;`
3. Demo data will load from `constants.ts` into browser localStorage
4. Demo login credentials are available in `constants.ts` (DEMO_USERS array)

## Installation & Development

### Prerequisites
- Node.js 18+
- npm 9+
- Firebase project with authentication and Firestore enabled

### Installation Steps

```bash
# Navigate to project directory
cd /home/user/vercel-pbport26

# Install dependencies
npm install

# Create .env file with Firebase credentials
echo "VITE_FIREBASE_API_KEY=your_key" > .env
# ... add remaining env vars

# Start development server (port 3000)
npm run dev

# Open browser to http://localhost:3000
```

### Development Server

The dev server runs on `http://localhost:3000` with:
- Hot Module Replacement (HMR) enabled
- TypeScript type checking
- Automatic CSS processing

```bash
npm run dev
```

### Production Build

Build optimized production bundles:

```bash
npm run build
```

Output is in `/dist` directory ready for deployment.

### Preview Locally

Test production build locally:

```bash
npm run preview
```

## Deployment to Vercel

### Automatic Deployment (Recommended)

1. Push code to GitHub repository
2. Connect repository to Vercel
3. Vercel automatically builds and deploys on each push

### Manual Steps

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project directory
vercel

# Add environment variables during deployment
# Or configure in Vercel project settings
```

### Vercel Configuration

Add to `vercel.json` for optimal settings:

```json
{
  "framework": "react",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_FIREBASE_API_KEY": "@vite_firebase_api_key",
    "VITE_FIREBASE_AUTH_DOMAIN": "@vite_firebase_auth_domain",
    "VITE_FIREBASE_PROJECT_ID": "@vite_firebase_project_id",
    "VITE_FIREBASE_STORAGE_BUCKET": "@vite_firebase_storage_bucket",
    "VITE_FIREBASE_MESSAGING_SENDER_ID": "@vite_firebase_messaging_sender_id",
    "VITE_FIREBASE_APP_ID": "@vite_firebase_app_id"
  }
}
```

### Environment Variables in Vercel

1. Go to Vercel project settings
2. Navigate to "Environment Variables"
3. Add all VITE_FIREBASE_* variables
4. Redeploy production branch

## Key Features by Role

### Applicant Features

- **User Registration**: Email-based account creation
- **Expression of Interest (Stage 1)**:
  - Create new EOI submission
  - Upload supporting documents
  - Save drafts
  - Submit for voting
- **Project Proposal (Stage 2)**:
  - Fill detailed proposal form (budget, timeline, team)
  - Upload budget breakdown
  - Add project documents
  - Submit for committee review
- **Application Management**:
  - View all personal applications
  - Track application status
  - Receive notifications on stage transitions
  - Update application information

### Committee Member Features

- **Dashboard**: Overview of assigned applications and voting status
- **Voting (Stage 1)**:
  - Review EOI submissions from assigned area
  - Cast votes for selected projects
  - View vote counts in real-time
- **Scoring (Stage 2)**:
  - Score Stage 2 proposals using weighted matrix
  - Scoring criteria include:
    - Alignment with priorities (weight: 25%)
    - Community impact (weight: 25%)
    - Feasibility (weight: 20%)
    - Innovation (weight: 15%)
    - Team capacity (weight: 15%)
  - Add detailed scoring notes
  - View other committee member scores
- **Application Review**:
  - Filter applications by area, status, round
  - Download application documents
  - View applicant contact information

### Administrator Features

- **User Management**:
  - Create and delete user accounts
  - Assign roles (Applicant, Committee, Admin)
  - Assign committee members to geographic areas
  - Update user profiles and contact information
  - View user activity logs
- **Portal Configuration**:
  - Enable/disable Stage 1 (EOI) submissions
  - Enable/disable Stage 2 (Proposal) submissions
  - Open/close voting periods
  - Set scoring threshold for applications
  - Manage scoring round configuration
- **Application Management**:
  - View all applications across all stages
  - Manually update application status
  - Export applications to CSV
  - Filter by status, area, round
- **Round Management**:
  - Create new application rounds
  - Configure round dates and rules
  - Assign applications to rounds
  - Manage applications per round
- **Document Management**:
  - Upload portal documents (guidelines, criteria, etc.)
  - Manage downloadable resources
  - Set document visibility
- **Audit & Reporting**:
  - View audit logs of all admin actions
  - Monitor user activity
  - Export data for analysis

## API Service Reference

The application uses a centralized Firebase service (`/services/firebase.ts`) exported as `api`:

```typescript
import { api } from './services/firebase';

// Authentication
await api.login(email, password);
await api.register(email, password, displayName);
await api.logout();
api.getCurrentUser();

// Applications
await api.getApplications(area?);
await api.createApplication(applicationData);
await api.updateApplication(appId, updates);
await api.deleteApplication(appId);

// Scoring & Voting
await api.saveScore(scoreData);
await api.getScores();
await api.saveVote(voteData);
await api.getVotes();

// User Management
await api.getUsers();
await api.updateUser(userData);
await api.getUserById(uid);
await api.deleteUser(uid);

// Admin Operations
await api.getPortalSettings();
await api.updatePortalSettings(settings);
await api.getRounds();
await api.createRound(roundData);
await api.updateRound(roundId, updates);
```

## Database Schema (Firestore)

### Collections

- **users**: User profiles with role and area assignments
- **applications**: Application submissions with metadata
- **votes**: Stage 1 voting records
- **scores**: Stage 2 scoring records
- **rounds**: Application round configurations
- **assignments**: Committee member area assignments
- **portalSettings**: Global portal configuration
- **adminDocuments**: Downloadable documents
- **auditLogs**: Administrative action audit trail

## Authentication

The portal uses Firebase Authentication with:

- **Email/Password**: Primary authentication method
- **Session Management**: User session stored in localStorage
- **Role-Based Access Control**: Routes protected by user role
- **Protected Routes**:
  - Admin-only: `/portal/admin`
  - Committee+Admin: `/portal/scoring`
  - All authenticated: `/portal/dashboard`, `/portal/application/:id`
  - Public: All other routes accessible without authentication

## File Upload & Storage

- **Profile Images**: Stored in Firebase Storage under `profile-images/`
- **Application Documents**: Stored under `applications/`
- **Budget Files**: Stored under `budgets/`
- **File Limits**: Currently limited by Firebase quotas (1GB uploads)

## Styling

The application uses **Tailwind CSS** for all styling:

- **Colors**: Purple (#7c3aed) primary, Gray for neutrals
- **Layout**: Responsive design (mobile-first approach)
- **Components**: Pre-built Tailwind components in `components/UI.tsx`
- **Dark Mode**: Can be implemented using Tailwind's dark mode class

### Customization

To customize branding:

1. Update color palette in component className attributes
2. Change logo images in public/ directory
3. Update application title in index.html
4. Modify constants.ts for demo data and copy

## Troubleshooting

### Common Issues

**Issue**: "Firebase not initialized" error
- **Solution**: Verify all VITE_FIREBASE_* environment variables are set

**Issue**: Login fails with valid credentials
- **Solution**: Ensure user exists in Firestore and Firebase Auth is enabled

**Issue**: File uploads fail
- **Solution**: Check Firebase Storage rules allow authenticated uploads

**Issue**: Routing not working after page refresh
- **Solution**: Using HashRouter (#) for client-side routing - this is intentional for static deployments

**Issue**: Demo mode not loading
- **Solution**: Set `USE_DEMO_MODE = true` in services/firebase.ts and refresh browser

## Performance Optimization

- **Code Splitting**: Pages are lazy-loaded (ready for React.lazy implementation)
- **Production Build**: Minified and optimized for ~200KB gzipped
- **Caching**: Static assets cached by Vercel CDN
- **Bundle Analysis**: Run `npm run build` to see bundle size

## Security Considerations

- **Never commit .env files**: Add to .gitignore (already configured)
- **Firebase Rules**: Implement proper Firestore security rules in production
- **HTTPS Only**: Enforce HTTPS in production (Vercel does this automatically)
- **XSS Protection**: React's built-in JSX escaping prevents most XSS vectors
- **CSRF Protection**: Not needed with stateless API design

## Git Workflow

Current branch: `claude/merge-production-portal-LFX6b`

To merge to main:

```bash
git checkout main
git pull origin main
git merge claude/merge-production-portal-LFX6b
git push origin main
```

## Support & Maintenance

For issues and feature requests:

1. Check existing issues in GitHub
2. Test with demo mode enabled first
3. Check browser console for error messages
4. Review Firebase console for quota/permission issues

## Documentation

- **[MIGRATION_NOTES.md](./MIGRATION_NOTES.md)** - Detailed architectural changes from v7 to v8
- **[QA_CHECKLIST.md](./QA_CHECKLIST.md)** - Comprehensive manual testing guide

## License

[Your License Here]

## Contributors

- Development team
- Community feedback and testing

---

**Last Updated**: December 2025
**Version**: 1.0.0 (Merged v7+v8)
**Status**: Production Ready
