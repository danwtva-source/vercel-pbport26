<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Communities’ Choice PB Portal (Torfaen)

A production-ready Participatory Budgeting portal for Communities’ Choice Torfaen. This codebase merges the functional Firebase-backed prototype with the latest UI system and expanded public/secure sections.

## Tech Stack
- React + Vite + TypeScript
- Tailwind (via CDN for utility classes)
- Firebase Auth + Firestore + Storage
- Vercel-ready routing + PWA assets

## Local Setup

**Prerequisites**
- Node.js 18+
- Firebase project (Auth, Firestore, Storage enabled)

**Install**
```bash
npm install
```

**Environment Variables**
Create a `.env.local` (or `.env`) file with:
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

**Run**
```bash
npm run dev
```

## Build & Preview
```bash
npm run build
npm run preview
```

## Tests
```bash
npm run test
```

## Firebase Setup Notes
- Firestore rules are defined in `firestore.rules`.
- Collections in use: `users`, `applications`, `scores`, `votes`, `assignments`, `rounds`, `portalSettings`, `adminDocuments`, `auditLogs`.
- Storage is used for profile images and application uploads.

## Deployment (Vercel)
1. Create a new Vercel project and link this repo.
2. Add the environment variables listed above in Vercel’s Environment Variables section.
3. Deploy. Vite handles client-side routing via hash-based navigation in this app, so no extra rewrites are required.

## Brand & Assets
- Public logo: `public/images/PB English Transparent.png`
- Secure logo: `public/images/Peoples’ Committee Portal logo 2.png`
- Header font: DynaPuff Bold (loaded in `index.html`)

## Documentation
- `FEATURE_MATRIX.md` — feature inventory and final mapping
- `MIGRATION_NOTES.md` — what changed from v7 + v8, regressions prevention
- `QA_CHECKLIST.md` — manual test plan + results
