# PB Portal Changes (Upgrade v3 Preview)

This document summarises the key changes made to extend the Communities’ Choice Participatory Budgeting portal to support funding rounds and task assignments for committee members while preserving the existing look and feel.

## New Types

### Round
Added a `Round` interface in `types.ts` representing a funding round. Each round includes:

- `id`: document ID
- `name`: human‑readable round name
- `startDate`/`endDate`: ISO strings controlling application windows
- `areas`: list of areas the round applies to
- `stage1Open`/`stage2Open`/`scoringOpen`: booleans controlling visibility of each stage
- Optional `scoringCriteria` and `scoringThreshold` fields for per‑round configuration
- `createdAt`: timestamp

### Assignment
Added an `Assignment` interface to link an application to a committee member. Fields include `id`, `applicationId`, `committeeId`, `assignedDate`, optional `dueDate` and a `status` field (`assigned` | `draft` | `submitted` | `rescore`).

### AuditLog
Added an `AuditLog` interface for future audit trail support; it captures the admin performing an action, a description, optional target ID and a timestamp.

## Service Layer Updates

`services/firebase.ts` now imports `Round` and `Assignment` types and exposes new asynchronous methods:

- `getRounds()` – fetch all round documents.
- `createRound(round)` – save a new round document.
- `updateRound(id, updates)` – merge updates onto an existing round.
- `deleteRound(id)` – remove a round document.
- `getAssignments(committeeId?)` – fetch assignments, optionally filtered by committee member.
- `createAssignment(assignment)` – save a new assignment document.
- `updateAssignment(id, updates)` – update an assignment.
- `deleteAssignment(id)` – delete an assignment.

These functions use Firestore collections `rounds` and `assignments` and can be secured with rules to restrict access.

## New Component: `AdminRounds`

Created `views/AdminRounds.tsx`, an admin interface for managing funding rounds. Features:

- Lists existing rounds in a table with name, dates, areas and lifecycle flags.
- “New Round” button opens a modal form to create a new round.
- “Edit” and “Delete” actions for each round.
- Round form captures name, start/end dates, applicable areas, and toggles for stage visibility (Stage 1, Stage 2, Scoring).

The component uses existing UI primitives (`Card`, `Button`, `Input`, `Modal`, `Badge`) to match the portal’s aesthetics.

## Admin Dashboard Changes

`views/Secure.tsx` (AdminDashboard) now:

- Imports `AdminRounds` and adds a new tab labelled **rounds** to the tab strip.
- Renders `<AdminRounds />` when the rounds tab is active.

This allows admins to manage funding rounds without leaving the console.

## Committee Dashboard Changes

`CommitteeDashboard` has been extended to support task assignments:

- Added an `assignments` state array and fetches assignments for the logged‑in committee member via `api.getAssignments(user.uid)`.
- Filters the application list so committee members only see applications they have been assigned to. Admin users still see all relevant applications.
- Shows a message when a committee member has no assignments.

## Usage Notes

These changes introduce new Firestore collections (`rounds`, `assignments`) and new data models (`Round`, `Assignment`, `AuditLog`). Before deploying, ensure your Firebase security rules permit appropriate reads/writes for these collections:

- Only admins should be allowed to create, update or delete rounds and assignments.
- Committee members should only read assignments where `committeeId` matches their UID.
- Applicants should have no access to these collections.

Further enhancements could include per‑round scoring criteria editing, budget per area, audit logging, and deeper integration of round stages into applicant flows.

## 2025‑12‑09 Updates

### Role persistence and routing

* Added a `getUserById(uid)` method to **AuthService** in `services/firebase.ts`. This helper fetches a user document from Firestore by UID (and supports demo mode). It is used when restoring a session after a page reload.
* Updated **App.tsx** to import `useEffect` and `auth` from the Firebase service. The app now listens for authentication state changes via `auth.onAuthStateChanged` and, when a user is authenticated, retrieves their profile using `getUserById()`. This ensures that the correct dashboard is displayed on refresh or direct navigation.
* Added a secondary `useEffect` to keep the visible page in sync with the user’s role whenever it changes. If a user is an admin, the page automatically becomes `admin`, and similarly for committee or applicant roles.

These changes fix a bug where committee users sometimes saw the applicant dashboard after logging in or refreshing the page. They also make the login state persistent across page reloads.

### Notes

These updates are backward compatible and do not alter existing UI structure or styling. They simply improve the authentication flow and routing logic so the portal behaves consistently.