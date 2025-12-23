# QA Checklist

> Status key: ✅ Pass, ⚠️ Not run (needs Firebase credentials), ❌ Fail

## Authentication
- ⚠️ Login/logout flow (email + username) — requires Firebase credentials.
- ⚠️ Role-based redirect after refresh (admin/committee/applicant).

## Applicant Portal
- ⚠️ Create new Stage 1 EOI.
- ⚠️ Save draft, edit, and submit EOI.
- ⚠️ Invited Stage 2: complete full application + upload attachments.

## Committee Portal
- ⚠️ View assigned applications.
- ⚠️ Submit Stage 1 vote (yes/no).
- ⚠️ Submit Stage 2 scoring matrix.

## Admin Console
- ⚠️ Manage rounds (create/edit/delete).
- ⚠️ Manage assignments (create/edit/delete).
- ⚠️ Manage users (create/edit).
- ⚠️ Update portal settings (stage visibility, thresholds).
- ⚠️ Upload/view admin documents.
- ⚠️ Review audit logs.

## Public Pages
- ✅ Landing page layout renders.
- ✅ Priorities, timeline, documents, and postcode checker render.
