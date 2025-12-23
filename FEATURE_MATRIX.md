# Feature Inventory Matrix

Branch 1 (v7-claude-copy) is treated as the functional baseline. Branch 2 (v8-ai-studio) provides the UI system and expanded layouts. The final column reflects the merged outcome.

| Feature / Flow / Service | Branch 1 Status | Branch 2 Status | Final (kept / replaced / merged) | Notes |
| --- | --- | --- | --- | --- |
| Firebase Auth login/register | ✅ Working | ⚠️ UI-only | **Kept (v7)** | Auth persistence and profile lookup retained from v7. |
| Role-based routing + guard on refresh | ✅ Working | ❌ Missing | **Kept (v7)** | `App.tsx` enforces dashboard routing by role. |
| Applicants: Stage 1 EOI (digital) | ✅ Working | ⚠️ UI only | **Kept (v7)** | Preserves form data + submissions. |
| Applicants: Stage 2 Full Application | ✅ Working | ⚠️ UI only | **Kept (v7)** | Includes budget breakdown + uploads. |
| Committee voting (Stage 1 yes/no) | ✅ Working | ❌ Missing | **Kept (v7)** | Restored vote collection + UI. |
| Committee scoring matrix (Stage 2) | ✅ Working | ⚠️ UI only | **Kept (v7)** | Weighted scoring + per-criterion notes. |
| Assignments (admin -> committee) | ✅ Working | ❌ Missing | **Kept (v7)** | CRUD restored. |
| Admin settings (stage toggles) | ✅ Working | ⚠️ Partial | **Kept (v7)** | Stage visibility, scoring threshold. |
| Admin rounds lifecycle | ✅ Working | ⚠️ Partial | **Kept (v7)** | Planning/open/scoring/voting/closed. |
| Admin documents | ✅ Working | ❌ Missing | **Kept (v7)** | Uploads + doc center restored. |
| Audit logs | ✅ Working | ❌ Missing | **Kept (v7)** | Admin-only log view. |
| Public landing sections | ✅ Working | ✅ Enhanced UI | **Merged** | Branch 2 visual system adopted in styling/sections. |
| Navigation / layout system | ✅ Basic | ✅ New UI | **Merged** | Updated header/footer styling + branding. |
| Branding (logos + DynaPuff) | ⚠️ Inconsistent | ✅ Intended | **Merged** | Public vs secure logo rules enforced. |
| Firestore security rules | ✅ Provided | ❌ Missing | **Kept (v7)** | `firestore.rules` restored. |
| Firestore collections | ✅ Working | ⚠️ UI only | **Kept (v7)** | Users, apps, scores, votes, rounds, settings, docs, assignments. |
| CSV export for admin | ✅ Working | ❌ Missing | **Kept (v7)** | Export retains admin workflows. |
| PWA assets & service worker | ✅ Working | ✅ Working | **Kept** | Assets retained from baseline. |
