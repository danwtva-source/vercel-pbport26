# Communities' Choice Portal - Audit & Optimisation Report

## Phase 1: Exhaustive Audit

### A) Architecture Map
*   **Current State:** The provided "attached files" represent a monolithic React approach (`PublicApp.js`, `SecureApp.js`) relying on internal state for page navigation (`currentPage` string) rather than client-side routing.
*   **Target Architecture:**
    *   **Routing:** Migrate to `HashRouter` (React Router) for distinct, linkable paths (e.g., `/`, `/vote`, `/portal/dashboard`).
    *   **Roles:** Distinct layouts for `Public` (Unauthenticated), `Applicant` (Auth), `Committee` (Auth + RBAC), and `Admin` (Auth + RBAC).
    *   **State:** Move from component-local state to a Context-based `AuthProvider` for user sessions and a `DataProvider` (or Service layer) for fetching application/scoring data.

### B) Data Model & Persistence
*   **Current State:** Data is hardcoded in constant arrays (`SCORING_DATA`, `areaData`) or stored in `localStorage` for scoring progress.
*   **Security Risk:** Client-side filtering (`getFilteredAppsForMember`) is insecure; a savvy user could modify the JS to see other areas.
*   **Optimisation:** Implement a Service Layer pattern. While we simulate the backend here, the structure must enforce that data fetching requests include the user's role and area context, preparing for strict Firestore security rules.

### C) Security & RBAC
*   **Current State:** "Login" is currently a dropdown menu selecting a user name. This bypasses all authentication.
*   **Optimisation:**
    *   Implement a proper Login screen simulating Firebase Auth.
    *   Enforce RBAC Guards (`RequireAuth` component) that checks `user.role` and `user.area` before rendering routes.
    *   Admin view must be explicitly separated from Committee view.

### D) UX & Accessibility
*   **Styling:** The provided CSS uses custom properties (`--primary-purple`) and specific font families (`DynaPuff`). These need to be integrated into the Tailwind configuration to ensure consistency without external CSS files.
*   **Feedback:** Loading states and "toast" notifications for saving scores are minimal. We will enhance these using a UI Context.

### E) Refactoring Plan (The "Final" Build)
1.  **Structure:** Modularise `components/`, `pages/`, `services/`, `hooks/`.
2.  **Theme:** Inject the custom design tokens (colors, fonts, shadows) via Tailwind config.
3.  **Logic:** Centralise the "Business Logic" (Scoring calculations, Status determination) into utility functions or custom hooks to decouple UI from logic.

---

## Phase 2: Implementation Details

*   **Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React icons.
*   **Storage:** `services/mockFirebase.ts` will serve as the "Repo" abstraction, simulating Firestore/Auth methods. This ensures the UI code is "Firebase-ready" by simply swapping this file for the real SDK implementation later.
*   **Styling:** Custom `tailwind.config` script injected in HTML to match the specific "Communities' Choice" branding (Purple/Teal gradients, rounded UI).

**Status:** Optimised code generated below.