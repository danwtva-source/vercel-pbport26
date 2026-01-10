# Claude Code Directive: Premium PB Portal Finalisation (v6)

You are Claude Code. Re-analyse the entire repository end-to-end, then execute the remaining work to ship a **production-ready, pilot-grade PB Portal** by the end of the weekend. Do not remove any existing functionality—only enhance, fix, and align with the PRD (PRD.txt v6).

## 0) Mandatory first steps
1. **Read and summarise** the following files, then confirm alignment or note deltas:
   - `PRD.txt` (v6)
   - `README.md`
   - `vercel.json`
   - `package.json`
   - `App.tsx`
   - `services/firebase.ts`
   - `context/AuthContext.tsx`
   - `utils.ts`
   - `constants.ts`
   - `pages/secure/*` and `pages/public/*`
2. **Map the current route graph** (public + portal) using `ROUTES` in `utils.ts`. Confirm that every navigation uses `Link` / `useNavigate` and never raw `<a href>` for internal routes.
3. **Record all current user journeys** (public, applicant, committee, admin) and list the exact files or components responsible.

## 1) Required user journeys (must pass)
### Public
- Landing → Priorities → Voting Zone → Resources/Documents → Login.
- Document downloads (public visibility only). Fallback seeded docs must show category filtering when no Firestore docs exist.

### Applicant
- Login → Applicant dashboard → New application → Submit Stage 1 → See submission status.
- Stage 2 gating respects portal settings (stage2 open) and status transitions.

### Committee
- Login → Dashboard → Assigned applications → Vote (Stage 1) → Score (Stage 2) → Submit scoring.
- Assignments list must be scoped by area and assignments; empty state when none.

### Admin
- Login → Admin Console → Manage users/rounds/applications/assignments/documents.
- Documents: folder CRUD + visibility; documents appear on public resources if marked `public`.

## 2) Role handling and guards
- Validate `toUserRole`, `toStoredRole`, and `isStoredRole` usage across secure pages. No missing imports or undefined helpers.
- Ensure authenticated users are never redirected to `/login` unless their session is invalid or profile missing.
- If a user hits an unauthorized route, redirect to their correct dashboard (applicant → `/portal/applicant`, committee → `/portal/dashboard`).

## 3) Firebase + data model alignment
- Compare Firestore collections in `services/firebase.ts` to PRD Section 6; ensure canonical fields are mapped.
- Confirm that `mapUserFromFirestore`, `mapApplicationFromFirestore`, `mapScoreFromFirestore`, and `mapVoteFromFirestore` preserve backwards compatibility and correct canonical mappings.
- Validate that document folders + documents collections are present and used for visibility filtering.

## 4) Navigation + internal link audits
- Verify every application card/row links to `/portal/applications/:id` (no public landing redirects).
- Validate all public CTA buttons match `ROUTES` constants (`/priorities`, `/resources`, etc.).

## 5) UI/UX quality and design requirements
- UK English copy throughout.
- Preserve existing Tailwind styling; only improve spacing, contrast, and hierarchy where needed.
- Do not regress existing layouts or remove helpful UI hints.
- Keep accessibility improvements (focus states, labels, consistent button usage).

## 6) Security, safety, and production checks
- Validate Firestore rules (`firestore.rules`) align to the PRD permission matrix.
- Confirm that service worker registration loads `/sw.js` from `public/` (correct MIME) and does not break routing.
- Ensure no secrets or API keys are exposed in the repo.

## 7) Exhaustive test checklist (must run or explain)
Run at least:
- `npm run build`
- `npm run preview` (smoke test locally if possible)
- Any lint/typecheck scripts if available
If tests cannot run, state the reason explicitly.

## 8) Required deliverables
- **Code fixes** for all bugs found.
- **PRD updates** (keep `PRD.txt` truthful to implementation).
- **Implementation notes** summarising what changed and why.
- **Migration notes** if data structure changes are required.

## 9) Specific expected outcomes
- Zero build errors on Vercel.
- Zero console errors on login for any role.
- Admin can fully operate without editing Firestore manually.
- Public documents load with correct visibility and folder filters.
- The portal is ready for a real pilot by end of weekend.

## 10) Guardrails
- Do **not** re-scaffold.
- Do **not** remove working features.
- Do **not** change route patterns without updating `ROUTES` and the PRD.
- Keep changes additive and safe.

Deliver the final results with clear summaries, tests run, and any remaining risks.
