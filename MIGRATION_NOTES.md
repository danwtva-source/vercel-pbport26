# Migration Notes (v7 → v8 synthesis)

## Summary
This merge treats **v7-claude-copy** as the functional baseline and applies the **v8-ai-studio** visual system and expanded UI sections on top. All Firebase/Auth/Firestore logic from v7 is preserved, while navigation and branding align with the v8 look & feel.

## What Changed
- **Core logic preserved:** Firebase Auth session persistence, role-based routing, Firestore CRUD for users/applications/scores/votes/assignments/rounds/settings/docs, and audit logs.
- **UI updated:** Header/footer layout, typography, cards, and public sections updated to match the newer design system. Secure areas retain v8-style cards and spacing with v7 workflows intact.
- **Branding enforcement:** Public logo for unauthenticated pages, secure logo for committee/admin sections, DynaPuff Bold headers, and correct community area names.
- **Security rules restored:** `firestore.rules` added for production-ready access control.
- **Strict typing:** `tsconfig.json` now enforces `strict: true`.
- **Tests:** Added a minimal Vitest suite for role-based routing helpers.

## Regression Prevention
- **Auth refresh routing:** `App.tsx` listens to `auth.onAuthStateChanged` and routes users to the correct dashboard after refresh.
- **Data layer parity:** `services/firebase.ts` re-aligned with v7 APIs (votes, scores, assignments, audit logs, uploads).
- **Admin + committee tools:** All v7 dashboards and actions retained (status updates, CSV export, scoring/voting flows).

## Data Model Updates
- Area names normalized to match Communities’ Choice branding:
  - Blaenavon
  - Thornhill & Upper Cwmbran
  - Trevethin–Penygarn–St Cadoc’s

## Firestore Rules & Indexes
- Rules are defined in `firestore.rules` and mirror v7 access control.
- No additional composite indexes were required for the current queries. If future queries add `orderBy + where`, add indexes in Firebase Console as prompted.

