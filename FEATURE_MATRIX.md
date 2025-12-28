# FEATURE INVENTORY MATRIX
## Communities' Choice Torfaen PB Portal - Branch Comparison & Merge Strategy

---

## EXECUTIVE SUMMARY

**Branch 1 (v7-claude-copy)**: Functional baseline with working Firebase integration
**Branch 2 (v8-ai-studio)**: Modern architecture with enhanced UI/UX
**Target**: Synthesize v7 functionality + v8 architecture = Production-ready portal

---

## 1. ARCHITECTURE & STRUCTURE

| Feature | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|---------|----------------|--------------|----------------|-------|
| **Routing System** | State-based (no React Router) | React Router (HashRouter) | ✅ **Use v8** | Refresh-safe routing required for production |
| **File Structure** | Monolithic (views/ folder) | Modular (pages/ folder) | ✅ **Use v8** | Better maintainability |
| **Layout Components** | Inline in each view | Separate PublicLayout/SecureLayout | ✅ **Use v8** | Proper separation of concerns |
| **Icon System** | Emojis + inline SVG | lucide-react library | ✅ **Use v8** | Professional, accessible |
| **Navigation** | State-based page switching | Sidebar + Link components | ✅ **Use v8** | Better UX, clearer navigation |
| **Component Organization** | Single UI.tsx file | UI.tsx + page-specific components | ✅ **Use v8** | Modular approach |

**Action**: Migrate to v8 architecture while preserving v7 functionality

---

## 2. FIREBASE INTEGRATION

| Feature | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|---------|----------------|--------------|----------------|-------|
| **Auth Service** | Comprehensive + demo mode | Likely simplified | ✅ **Keep v7** | Preserve working auth |
| **Firestore Services** | Full CRUD for all collections | May be partial | ✅ **Keep v7** | Ensure all operations work |
| **Security Rules** | firestore.rules present | Unknown | ✅ **Keep v7** | Critical for production |
| **Storage Integration** | File uploads implemented | Unknown | ✅ **Keep v7** | Profile images, documents |
| **Demo Mode Toggle** | USE_DEMO_MODE flag | Unknown | ✅ **Keep v7** | Useful for testing |
| **Collection Structure** | users, applications, votes, scores, rounds, assignments, adminDocuments, auditLogs, portalSettings | Need to verify | ✅ **Keep v7** | Proven data model |

**Action**: Port v7 Firebase services into v8 architecture, verify all operations

---

## 3. USER ROLES & PERMISSIONS

| Feature | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|---------|----------------|--------------|----------------|-------|
| **Role Types** | applicant, committee, admin | Same | ✅ **Keep v7** | Working role system |
| **Role-Based Routing** | useEffect guards | React Router guards needed | ✅ **Merge** | Use v8 routing + v7 logic |
| **Area Assignment** | For committee members | Same | ✅ **Keep v7** | Critical for committee scoping |
| **Auth State Persistence** | onAuthStateChanged | Need to verify | ✅ **Keep v7** | Session persistence |
| **Admin Impersonation** | Can view committee interface | Unknown | ✅ **Keep v7** | Useful feature |

**Action**: Implement v7 role guards in v8 React Router structure

---

## 4. APPLICANT FEATURES

| Feature | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|---------|----------------|--------------|----------------|-------|
| **Stage 1 (EOI) Form** | Comprehensive form with all fields | Need to verify | ✅ **Keep v7 data + v8 UI** | Ensure all fields preserved |
| **Stage 2 (Full App) Form** | Detailed form with uploads | Need to verify | ✅ **Keep v7 data + v8 UI** | Bank details, budget, docs |
| **Application Lifecycle** | Draft → Submitted → Invited → Funded | Same expected | ✅ **Keep v7** | Proven workflow |
| **File Uploads** | Constitution, bank statement, other | Need to verify | ✅ **Keep v7** | Firebase Storage integration |
| **Form Validation** | validateStage2() function | Unknown | ✅ **Keep v7** | Bank account format, etc. |
| **Budget Builder** | Dynamic line items | Unknown | ✅ **Keep v7** | Add/remove rows |
| **Marmot Principles** | 6 checkboxes + justifications | Need to verify | ✅ **Keep v7** | Strategic alignment |
| **WFG Goals** | 7 checkboxes + justifications | Need to verify | ✅ **Keep v7** | Strategic alignment |
| **Word Count Limits** | 250-word summary validation | Unknown | ✅ **Keep v7** | RichTextArea component |
| **Application Status Badges** | Color-coded | v8 likely has better styling | ✅ **Merge** | v8 UI + v7 logic |

**Action**: Rebuild forms in v8 structure with all v7 fields and validation

---

## 5. COMMITTEE FEATURES

| Feature | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|---------|----------------|--------------|----------------|-------|
| **Application Filtering** | By area + assignments | Need to verify | ✅ **Keep v7** | Core committee functionality |
| **Assignment System** | assignments collection | Need to verify | ✅ **Keep v7** | Task assignment |
| **Stage 1 Voting** | Yes/No quick buttons | Need to verify | ✅ **Keep v7 + v8 UI** | Simple voting interface |
| **Stage 2 Scoring** | 10-criteria weighted matrix | v8 has ScoringMatrix page | ✅ **Merge** | Combine both |
| **Scoring Criteria** | 10 criteria with weights | Need to verify matches | ✅ **Keep v7** | Proven criteria list |
| **Weighted Calculation** | (score × weight) / maxTotal × 100 | Need to verify | ✅ **Keep v7** | Accurate algorithm |
| **Score Comments** | Per-criterion notes | Need to verify | ✅ **Keep v7** | Important for transparency |
| **Committee Documents** | Access to admin-uploaded docs | Unknown | ✅ **Keep v7** | Guidance materials |
| **Cross-Area Applications** | Visible to all committee | Unknown | ✅ **Keep v7** | Important logic |

**Action**: Ensure scoring tasks are ONLY in committee scope, not admin

---

## 6. ADMIN FEATURES

| Feature | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|---------|----------------|--------------|----------------|-------|
| **Master Application List** | Full table with filters | v8 likely has admin page | ✅ **Merge** | v8 UI + v7 functionality |
| **Status Management** | Change status dropdown | Unknown | ✅ **Keep v7** | Critical admin tool |
| **User Management** | Create/edit/delete users | Need to verify | ✅ **Keep v7** | CRUD operations |
| **Round Management** | AdminRounds.tsx component | Need to verify | ✅ **Keep v7** | Funding round lifecycle |
| **Document Upload** | Admin document center | Unknown | ✅ **Keep v7** | Committee resources |
| **Audit Logs** | Action tracking | Unknown | ✅ **Keep v7** | Compliance requirement |
| **KPI Dashboard** | Overview tab with charts | v8 likely has modern version | ✅ **Merge** | v8 UI + v7 data |
| **CSV Export** | Master list export | Unknown | ✅ **Keep v7** | Reporting feature |
| **Scoring Monitor** | Real-time progress tracking | Unknown | ✅ **Keep v7** | Committee oversight |
| **Threshold Configuration** | Global scoring threshold | Unknown | ✅ **Keep v7** | Settings management |
| **🚨 Scoring Tasks in Admin** | **PRESENT (needs removal)** | Unknown | ⛔ **REMOVE** | **Committee-only feature** |

**Action**: Remove scoring task generation from admin; admin can view but not score

---

## 7. PUBLIC PAGES

| Feature | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|---------|----------------|--------------|----------------|-------|
| **Landing Page** | Hero + AreaCarousel (Swiper) | Likely similar | ✅ **Use v8 UI** | Modern design |
| **Priorities Page** | Tabbed area view with charts | Likely similar | ✅ **Use v8 UI** | Color-coded per area |
| **Timeline Page** | Vertical timeline | Likely similar | ✅ **Use v8 UI** | Milestone visualization |
| **Postcode Checker** | Gradient background, validation | Likely similar | ✅ **Use v8 UI** | Eligibility tool |
| **Documents Page** | Public resource grid | Likely similar | ✅ **Use v8 UI** | PDF downloads |
| **SwiperJS Integration** | AreaCarousel component | Unknown if kept | ✅ **Keep** | Interactive area selection |

**Action**: Use v8 public pages as-is, verify data matches v7

---

## 8. DATA MODELS & TYPES

| Type | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|------|----------------|--------------|----------------|-------|
| **User** | uid, email, role, area, displayName, bio, phone, photoUrl, etc. | Need to compare | ✅ **Keep v7** | Comprehensive model |
| **Application** | Full EOI + Part 2 fields in formData | Need to compare | ✅ **Keep v7** | Proven schema |
| **Vote** | appId, voterId, decision, reason | Need to compare | ✅ **Keep v7** | Simple model |
| **Score** | appId, scorerId, weightedTotal, breakdown, notes | Need to compare | ✅ **Keep v7** | Detailed scoring |
| **Round** | name, year, status, areas, stage flags | Need to compare | ✅ **Keep v7** | Lifecycle management |
| **Assignment** | applicationId, committeeId, status | Need to compare | ✅ **Keep v7** | Task tracking |
| **PortalSettings** | stage visibility, threshold | Need to compare | ✅ **Keep v7** | Global config |
| **AuditLog** | adminId, action, targetId, details | Need to compare | ✅ **Keep v7** | Compliance tracking |
| **AdminDocument** | name, url, category | Need to compare | ✅ **Keep v7** | Document management |
| **BudgetLine** | item, note, cost | Need to compare | ✅ **Keep v7** | Dynamic budget |

**Action**: Use v7 types.ts as source of truth, merge any v8 improvements

---

## 9. UI/UX & STYLING

| Feature | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|---------|----------------|--------------|----------------|-------|
| **Design System** | Purple & Teal brand colors | Same expected | ✅ **Use v8** | Modern implementation |
| **Tailwind Config** | In index.html | Same expected | ✅ **Use v8** | DynaPuff font, colors |
| **Component Library** | UI.tsx (Button, Input, Modal, etc.) | Same + enhancements | ✅ **Merge** | Keep all components |
| **Responsive Design** | Grid layouts, mobile-first | Better in v8 | ✅ **Use v8** | Modern breakpoints |
| **Animations** | Basic transitions | Better in v8 | ✅ **Use v8** | Smooth UX |
| **Loading States** | Basic | Better in v8 | ✅ **Use v8** | Better feedback |
| **Empty States** | Basic messages | Better in v8 | ✅ **Use v8** | Improved UX |
| **Form Styling** | Functional | More polished in v8 | ✅ **Use v8** | Better forms |

**Action**: Use v8 UI components and styling throughout

---

## 10. BRANDING & ASSETS

| Asset | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|-------|----------------|--------------|----------------|-------|
| **Public Logo** | "PB English Transparent.png" | "/logo-public.png" | ✅ **Standardize** | Puzzle piece logo |
| **Secure Logo** | "Peoples' Committee Portal logo 2.png" | "/logo-secure.png" | ✅ **Standardize** | Circular portal logo |
| **Logo Placement** | Public: all unauthenticated pages | Same | ✅ **Use v8** | Clear separation |
| **Logo Placement** | Secure: all authenticated pages | Same | ✅ **Use v8** | Clear separation |
| **DynaPuff Font** | Loaded from Google Fonts | Same expected | ✅ **Keep** | Brand font for headings |
| **Area Colors** | Blaenavon: Yellow, Thornhill: Green, Trevethin: Blue | Same expected | ✅ **Keep** | Visual distinction |

**Action**: Ensure logo files are named consistently (/logo-public.png, /logo-secure.png)

---

## 11. GEOGRAPHIC AREAS

| Area | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|------|----------------|--------------|----------------|-------|
| **Blaenavon** | ✅ Present | Expected | ✅ **Keep** | Core area |
| **Thornhill & Upper Cwmbran** | ✅ Present | Expected | ✅ **Keep** | Core area |
| **Trevethin–Penygarn–St Cadoc's** | ✅ Present | Expected | ✅ **Keep** | Core area |
| **Cross-Area** | ✅ Supported | Unknown | ✅ **Keep** | Multi-area projects |
| **Postcode Database** | constants.ts | Unknown | ✅ **Keep v7** | Eligibility checker |

**Action**: Verify area names are EXACTLY as specified in brief

---

## 12. SECURITY & COMPLIANCE

| Feature | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|---------|----------------|--------------|----------------|-------|
| **Firestore Security Rules** | firestore.rules file present | Unknown | ✅ **Keep v7** | Production-critical |
| **Role-Based Access Control** | Enforced in client + rules | Unknown | ✅ **Keep v7** | Multi-layer security |
| **Auth Guards** | Route protection | Need v8 implementation | ✅ **Implement** | React Router guards |
| **Data Isolation** | Committee sees only assigned area | Unknown | ✅ **Keep v7** | Privacy requirement |
| **Audit Logging** | Admin actions tracked | Unknown | ✅ **Keep v7** | Compliance feature |
| **GDPR Compliance** | Consent checkboxes in forms | Unknown | ✅ **Keep v7** | Legal requirement |
| **File Upload Security** | Firebase Storage rules needed | Unknown | ✅ **Implement** | Prevent unauthorized access |

**Action**: Deploy v7 security rules, implement proper guards in v8 routing

---

## 13. BUILD & DEPLOYMENT

| Feature | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|---------|----------------|--------------|----------------|-------|
| **Build Tool** | Vite 5.2.0 | Same expected | ✅ **Keep** | Fast, modern |
| **TypeScript** | tsconfig.json | Same expected | ✅ **Enable strict** | Type safety |
| **React Version** | 18.3.1 | Same expected | ✅ **Keep** | Modern React |
| **PWA Support** | sw.js + manifest.json | Unknown | ✅ **Keep v7** | Installable app |
| **Environment Variables** | VITE_FIREBASE_* | Same expected | ✅ **Keep** | Configuration |
| **Vercel Deployment** | Should work | Should work | ✅ **Test** | Refresh-safe routing |
| **Hash Routing** | Not used | HashRouter | ✅ **Use v8** | Required for Vercel SPA |

**Action**: Verify build succeeds, test deployment to Vercel

---

## 14. DEPENDENCIES

| Package | v7-claude-copy | v8-ai-studio | Final Decision | Notes |
|---------|----------------|--------------|----------------|-------|
| **react** | 18.3.1 | Same expected | ✅ **Keep** | - |
| **react-dom** | 18.3.1 | Same expected | ✅ **Keep** | - |
| **firebase** | 10.x+ | Same expected | ✅ **Keep** | - |
| **tailwindcss** | CDN (in HTML) | CDN expected | ✅ **Keep** | - |
| **react-router-dom** | ❌ Not present | ✅ Present | ✅ **Add** | Required for v8 |
| **lucide-react** | ❌ Not present | ✅ Present | ✅ **Add** | Icons |
| **SwiperJS** | CDN (dynamic load) | Unknown | ✅ **Keep v7** | AreaCarousel |

**Action**: Install react-router-dom and lucide-react

---

## 15. CRITICAL GAPS TO CLOSE

| Gap | Status in v7 | Status in v8 | Final Decision | Priority |
|-----|--------------|--------------|----------------|----------|
| **Scoring in Admin UI** | 🚨 Present | Unknown | ⛔ **REMOVE** | 🔴 HIGH |
| **Scoring in Committee UI** | ✅ Present | ✅ Present | ✅ **KEEP** | 🔴 HIGH |
| **Assignment CRUD** | Partial | Unknown | 📝 **Implement carefully** | 🟡 MED |
| **Round Lifecycle** | Basic | Unknown | 📝 **Document only** | 🟢 LOW |
| **Real-time Updates** | ❌ Manual refresh | ❌ Expected | 📝 **Future enhancement** | 🟢 LOW |
| **Email Notifications** | ❌ Not present | ❌ Expected | 📝 **Future enhancement** | 🟢 LOW |

**Action**: Focus on scoring relocation; document other gaps for future work

---

## MERGE STRATEGY SUMMARY

### Phase 1: Foundation (Architecture Transition)
1. ✅ Install v8 dependencies (react-router-dom, lucide-react)
2. ✅ Port Layout components (PublicLayout, SecureLayout)
3. ✅ Set up React Router structure
4. ✅ Create empty page component files

### Phase 2: Data Layer (Preserve v7 Functionality)
5. ✅ Copy v7 types.ts (source of truth)
6. ✅ Copy v7 services/firebase.ts (all CRUD operations)
7. ✅ Copy v7 constants.ts (scoring criteria, areas, postcodes)
8. ✅ Verify demo mode toggle works

### Phase 3: UI Migration (Component by Component)
9. ✅ Migrate public pages (Landing, Priorities, Timeline, Postcode, Documents)
10. ✅ Migrate Login page
11. ✅ Build ApplicantDashboard with v7 form logic + v8 UI
12. ✅ Build CommitteeDashboard with v7 voting/scoring logic + v8 UI
13. ✅ Build AdminConsole WITHOUT scoring tasks

### Phase 4: Critical Features
14. ✅ Implement proper route guards (role-based access)
15. ✅ Relocate ALL scoring task UI to committee pages only
16. ✅ Ensure admin can VIEW scoring progress but not submit scores
17. ✅ Test assignment filtering (committee sees only assigned apps)

### Phase 5: Quality Assurance
18. ✅ Enable TypeScript strict mode
19. ✅ Fix all type errors
20. ✅ Run build (npm run build)
21. ✅ Test all flows manually
22. ✅ Verify refresh-safe routing works

### Phase 6: Documentation & Delivery
23. ✅ Write README.md
24. ✅ Write MIGRATION_NOTES.md
25. ✅ Write QA_CHECKLIST.md (with test results)
26. ✅ Commit and push to claude/merge-production-portal-LFX6b

---

## SUCCESS CRITERIA

✅ **Looks like v8-ai-studio** (modern UI, React Router, modular architecture)
✅ **Works like v7-claude-copy** (all Firebase operations, all features preserved)
✅ **Scoring tasks ONLY in committee scope** (relocated from admin)
✅ **Zero regressions** (every v7 feature still works)
✅ **Production-ready** (builds successfully, refresh-safe, TypeScript strict)
✅ **Fully documented** (setup steps, migration notes, QA checklist)

---

## RISK MITIGATION

🔴 **HIGH RISK**: Breaking Firebase operations during architecture change
→ Mitigation: Copy v7 services layer completely, test each operation

🔴 **HIGH RISK**: Losing form fields during UI migration
→ Mitigation: Field-by-field checklist for EOI and Part 2 forms

🟡 **MEDIUM RISK**: Route guard implementation errors
→ Mitigation: Test each role thoroughly, implement fallback redirects

🟡 **MEDIUM RISK**: Missing v7 features in final product
→ Mitigation: This matrix serves as checklist; verify each item

🟢 **LOW RISK**: Build errors from TypeScript strict mode
→ Mitigation: Fix incrementally, use `any` sparingly with justification

---

**Document Version**: 1.0
**Date**: 2025-12-28
**Status**: Pre-Implementation Baseline
