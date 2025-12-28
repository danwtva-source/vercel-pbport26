# QA Testing Checklist - Communities' Choice PB Portal

Comprehensive manual testing checklist for the merged PB Portal. Test with demo mode enabled for initial runs, then with production Firebase credentials.

---

## Setup Instructions

Before testing, ensure:
- [ ] Clone/pull latest code from `claude/merge-production-portal-LFX6b`
- [ ] Run `npm install` to install dependencies
- [ ] Create `.env` file with Firebase credentials (or leave empty for demo mode)
- [ ] For initial testing, set `USE_DEMO_MODE = true` in `services/firebase.ts`
- [ ] Run `npm run dev` and open browser to `http://localhost:3000`
- [ ] Clear browser cache/localStorage if previous test data conflicts

---

## 1. Authentication Tests

### 1.1 Login with Valid Credentials
- [ ] Navigate to `/login` page
- [ ] Enter valid email and password
- [ ] Click "Sign In" button
- [ ] Verify redirect to `/portal/dashboard`
- [ ] Verify user name/email displayed in header/profile
- [ ] Verify role-specific navigation appears (Committee users see "Scoring", etc.)

### 1.2 Login with Invalid Credentials
- [ ] Navigate to `/login` page
- [ ] Enter incorrect password
- [ ] Click "Sign In" button
- [ ] Verify error message appears: "Invalid credentials or user not found"
- [ ] Verify user is NOT logged in (cannot access `/portal/dashboard`)
- [ ] Verify stays on login page

### 1.3 User Registration (Applicant)
- [ ] Navigate to login page, find "Create Account" link
- [ ] Enter valid email (test@example.com)
- [ ] Enter strong password
- [ ] Enter display name
- [ ] Click "Register" button
- [ ] Verify account created and user automatically logged in
- [ ] Verify redirected to `/portal/dashboard`
- [ ] Verify user can logout and re-login with new credentials

### 1.4 Logout
- [ ] While logged in, click logout button (top right)
- [ ] Verify redirected to login page
- [ ] Verify cannot access protected routes (browser shows login page)
- [ ] Verify localStorage session cleared

### 1.5 Page Refresh - Session Persistence
- [ ] Login with valid credentials
- [ ] Verify logged in on dashboard
- [ ] Press F5 or Ctrl+R to refresh page
- [ ] Verify still logged in after refresh (no redirect to login)
- [ ] Verify dashboard content loads correctly
- [ ] Verify user info still visible in header

### 1.6 Page Refresh - Authorization Check
- [ ] Login as Committee member
- [ ] Navigate to `/portal/scoring`
- [ ] Verify page loads correctly (showing scored applications)
- [ ] Press F5 to refresh page
- [ ] Verify still on scoring page after refresh
- [ ] Verify all scoring data still visible

### 1.7 Direct URL Access - Unauthorized
- [ ] Logout or open new private/incognito browser window
- [ ] Type `/portal/admin` directly in URL bar
- [ ] Verify redirected to `/login`
- [ ] Verify cannot access admin features without authentication

### 1.8 Direct URL Access - Wrong Role
- [ ] Login as Applicant
- [ ] Type `/portal/admin` directly in URL bar
- [ ] Verify redirected to `/portal/dashboard` (not admin page)
- [ ] Verify error message or tooltip about insufficient permissions
- [ ] Login as Committee member
- [ ] Type `/portal/admin` directly in URL bar
- [ ] Verify redirected to `/portal/dashboard` (Committees can't access admin)

### 1.9 Multiple Concurrent Sessions
- [ ] Open application in two browser windows (same browser)
- [ ] Login with different user accounts in each window
- [ ] Verify each window maintains its own session
- [ ] Make changes in Window 1 (e.g., score an application)
- [ ] Verify Window 2 doesn't see changes until refresh
- [ ] Verify no session conflicts or data corruption

---

## 2. Applicant Workflow Tests

### 2.1 Create Expression of Interest (Stage 1)
- [ ] Login as Applicant
- [ ] Navigate to `/portal/applications`
- [ ] Click "New Application" or "Create EOI" button
- [ ] Fill in application form:
  - [ ] Enter project title
  - [ ] Select geographic area
  - [ ] Enter project description (min 100 chars)
  - [ ] Upload supporting document (PDF, image, or doc)
  - [ ] Enter contact email and phone
- [ ] Click "Save as Draft"
- [ ] Verify draft saved (appears in application list with "Draft" status)
- [ ] Verify can return to edit draft

### 2.2 Submit EOI (Stage 1)
- [ ] From draft application, click "Edit"
- [ ] Verify all fields still populated
- [ ] Click "Submit Application"
- [ ] Verify confirmation dialog appears
- [ ] Click "Confirm Submit"
- [ ] Verify status changed to "Submitted-Stage1"
- [ ] Verify application locked (cannot edit submitted fields)
- [ ] Verify cannot delete submitted application

### 2.3 Upload Supporting Documents
- [ ] While creating/editing application:
  - [ ] Click "Upload Document" button
  - [ ] Select valid file (PDF, DOCX, PNG, JPG)
  - [ ] Verify file appears in document list
  - [ ] Verify file size shown correctly
  - [ ] Click X to remove document
  - [ ] Verify document removed from list
- [ ] Upload file > 10MB
- [ ] Verify error message about file size
- [ ] Try uploading unsupported file type (.exe, .zip)
- [ ] Verify error message about file type

### 2.4 View Application Status
- [ ] Navigate to `/portal/applications`
- [ ] View list of all personal applications
- [ ] Verify each application shows:
  - [ ] Project title
  - [ ] Status badge (Draft, Submitted-Stage1, etc.)
  - [ ] Area name
  - [ ] Last updated date
  - [ ] Edit/View button
- [ ] Filter by area (if multiple areas available)
- [ ] Verify filtering works correctly

### 2.5 Stage 1 to Stage 2 Progression
- [ ] Admin changes application status to "Invited-Stage2"
- [ ] Applicant logs in and views application
- [ ] Verify application shows "Stage 2 Invitation" message
- [ ] Verify new form fields available for Stage 2 submission:
  - [ ] Full proposal description
  - [ ] Budget breakdown (with line items)
  - [ ] Timeline/milestones
  - [ ] Team member information
- [ ] Fill in Stage 2 form fields
- [ ] Click "Submit Stage 2"
- [ ] Verify status changed to "Submitted-Stage2"
- [ ] Verify Stage 2 fields locked from editing

### 2.6 Budget Breakdown
- [ ] In Stage 2 application form, find Budget section
- [ ] Click "Add Budget Item"
- [ ] Enter item name (e.g., "Materials")
- [ ] Enter cost (e.g., "500.00")
- [ ] Enter description/note
- [ ] Click Add
- [ ] Verify item appears in budget list
- [ ] Verify total budget updates at bottom
- [ ] Add multiple items and verify total calculates correctly
- [ ] Click X to remove item
- [ ] Verify item removed and total recalculates

### 2.7 View Application Details Page
- [ ] Click on application from list (or "View Details")
- [ ] Verify read-only view of all application data
- [ ] Verify supporting documents display with download links
- [ ] Verify document preview loads correctly
- [ ] Verify applicant contact information shown
- [ ] Click "Edit" button
- [ ] Verify redirected to edit form (if application is not submitted)

### 2.8 Applicant Dashboard
- [ ] Navigate to `/portal/dashboard`
- [ ] Verify displays:
  - [ ] Total applications count
  - [ ] Applications by stage (Stage 1, Stage 2)
  - [ ] Applications by status
  - [ ] Recent activity/updates
  - [ ] Quick action buttons (Create New, View All)
- [ ] Verify statistics match actual application count
- [ ] Click on stage card to filter list

### 2.9 Applicant Notifications
- [ ] Admin changes application status
- [ ] Applicant views dashboard
- [ ] Verify notification/badge shows about status change
- [ ] Click notification
- [ ] Verify relevant application details load
- [ ] Verify can dismiss notification

---

## 3. Committee Workflow Tests

### 3.1 Committee Dashboard Access
- [ ] Login as Committee member
- [ ] Navigate to `/portal/dashboard`
- [ ] Verify displays:
  - [ ] Committee member information
  - [ ] Assigned geographic area
  - [ ] Applications to review (for assigned area)
  - [ ] Applications to score (Stage 2)
  - [ ] Voting statistics
  - [ ] Scoring statistics
- [ ] Verify "Scoring" link in navigation menu visible
- [ ] Verify "Admin" link NOT in navigation menu

### 3.2 Vote on Expression of Interest (Stage 1)
- [ ] Navigate to `/portal/applications`
- [ ] Verify only EOI applications from assigned area visible
- [ ] Click on application to view details
- [ ] Find "Vote" button or voting section
- [ ] Click "Vote For" or similar button
- [ ] Verify vote recorded (button changes to "Unvote")
- [ ] Click "Unvote"
- [ ] Verify vote removed (button returns to "Vote For")
- [ ] Vote on multiple applications
- [ ] Navigate away and back to list
- [ ] Verify vote state persists correctly

### 3.3 View Vote Results
- [ ] Navigate to `/portal/applications`
- [ ] Click on any EOI application
- [ ] Verify vote count displayed:
  - [ ] Number of votes received
  - [ ] Percentage of total votes
  - [ ] Visual representation (progress bar or chart)
- [ ] Verify your own vote status visible (indicates whether you voted)

### 3.4 Access Scoring Interface
- [ ] Navigate to `/portal/scoring`
- [ ] Verify page loads with list of applications to score
- [ ] Verify only Stage 2 applications visible
- [ ] Verify only applications from assigned area visible
- [ ] Verify applications sorted by:
  - [ ] Most recent
  - [ ] Highest votes (Stage 1 votes carried over)
  - [ ] Unscored first

### 3.5 Score Application with Scoring Matrix
- [ ] From `/portal/scoring`, click on application to score
- [ ] Verify scoring matrix displays with criteria:
  - [ ] Alignment with Priorities (25%)
  - [ ] Community Impact (25%)
  - [ ] Feasibility (20%)
  - [ ] Innovation (15%)
  - [ ] Team Capacity (15%)
- [ ] For each criterion:
  - [ ] Verify score range is 0-10
  - [ ] Click on score (e.g., 8)
  - [ ] Verify score highlighted/selected
  - [ ] Verify weight applied to total calculation
- [ ] Enter notes/comments in text field
- [ ] Verify notes saved with score
- [ ] Click "Submit Score" or "Save"
- [ ] Verify score persisted in database

### 3.6 Update Existing Score
- [ ] Return to same application
- [ ] Verify previous score still populated
- [ ] Change score for one criterion
- [ ] Update notes
- [ ] Click "Update Score"
- [ ] Verify changes saved and persisted

### 3.7 View Scores from Other Committee Members
- [ ] Score an application
- [ ] Navigate to view other scores on same application
- [ ] Verify displays:
  - [ ] Committee member name
  - [ ] Their individual scores per criterion
  - [ ] Their notes (if visible)
  - [ ] Average score across all scorers
  - [ ] Score distribution graph
- [ ] Verify personal score also visible for comparison

### 3.8 View Aggregated Scores
- [ ] Navigate to scoring dashboard/list
- [ ] Verify shows aggregated information per application:
  - [ ] Application title
  - [ ] Average score from all committee members
  - [ ] Number of committee members who scored
  - [ ] Scoring status (complete if all have scored)
  - [ ] Application rank by average score

### 3.9 Filter Assigned Applications
- [ ] Navigate to `/portal/applications`
- [ ] Verify filter by:
  - [ ] Stage (EOI, Full Proposal)
  - [ ] Status (Draft, Submitted, etc.)
  - [ ] Area (auto-filtered to assigned area)
- [ ] Apply filters and verify results update
- [ ] Clear filters and verify all assigned applications visible

### 3.10 Committee Member Profile
- [ ] Navigate to profile/settings
- [ ] Verify displays:
  - [ ] Committee member name
  - [ ] Email
  - [ ] Assigned area(s)
  - [ ] Role designation
- [ ] Click edit (if permitted)
- [ ] Verify can update:
  - [ ] Display name
  - [ ] Phone number
  - [ ] Profile bio/description
- [ ] Save changes and verify persisted

---

## 4. Admin Workflow Tests

### 4.1 Admin Dashboard Access
- [ ] Login as Admin user
- [ ] Navigate to `/portal/admin`
- [ ] Verify page loads with admin menu/sidebar
- [ ] Verify access to:
  - [ ] User Management
  - [ ] Portal Settings
  - [ ] Round Management
  - [ ] Document Management
  - [ ] Audit Logs

### 4.2 Create New User
- [ ] In Admin Console, find "Users" section
- [ ] Click "Create New User"
- [ ] Fill in form:
  - [ ] Email address
  - [ ] Full name
  - [ ] Role (Applicant, Committee, Admin)
  - [ ] If Committee: assign geographic area(s)
  - [ ] Temporary password or password rules
- [ ] Click "Create User"
- [ ] Verify user appears in user list
- [ ] Verify user receives notification/email (or password shared)
- [ ] Verify new user can login with provided credentials

### 4.3 Edit User Information
- [ ] In Users list, click Edit on a user
- [ ] Verify can update:
  - [ ] Display name
  - [ ] Email
  - [ ] Role
  - [ ] Assigned area (for committee)
  - [ ] Active/inactive status
- [ ] Make changes and click "Save"
- [ ] Verify changes persisted
- [ ] Verify user can still login (or cannot if deactivated)

### 4.4 Delete User Account
- [ ] In Users list, click Delete on a user
- [ ] Verify confirmation dialog appears
- [ ] Click "Confirm Delete"
- [ ] Verify user removed from list
- [ ] Verify user cannot login anymore
- [ ] Verify user's applications/scores preserved (not deleted)

### 4.5 Change Application Status
- [ ] Navigate to Applications list
- [ ] Click on application
- [ ] Find "Status" field or "Change Status" button
- [ ] Change status (e.g., from "Submitted-Stage1" to "Invited-Stage2")
- [ ] Click "Update"
- [ ] Verify status changes in database
- [ ] Verify applicant can see new status
- [ ] Verify appropriate UI changes (e.g., Stage 2 form becomes available)

### 4.6 Configure Portal Settings
- [ ] In Admin Console, find "Portal Settings"
- [ ] Verify toggles for:
  - [ ] Stage 1 Visible (EOI submissions open)
  - [ ] Stage 2 Visible (Full proposals open)
  - [ ] Voting Open (Community voting enabled)
- [ ] Verify numeric settings:
  - [ ] Scoring Threshold (min average score to fund)
- [ ] Change a setting (e.g., Stage 1 Visible → OFF)
- [ ] Click "Save Settings"
- [ ] Verify setting applied:
  - [ ] If Stage 1 off, applicant can't create new EOI
  - [ ] If voting closed, committee can't vote
  - [ ] If Stage 2 off, invited applicants can't submit Stage 2

### 4.7 Create Application Round
- [ ] In Admin Console, find "Rounds" section
- [ ] Click "Create New Round"
- [ ] Fill in form:
  - [ ] Round name (e.g., "2025 Spring Round")
  - [ ] Budget/funding amount
  - [ ] Start date (Stage 1)
  - [ ] Stage 1 end date
  - [ ] Stage 2 start date
  - [ ] Stage 2 end date
  - [ ] Voting deadline
  - [ ] Scoring deadline
- [ ] Click "Create"
- [ ] Verify round appears in list
- [ ] Verify can edit round (update dates, budget, etc.)

### 4.8 Assign Committee Members to Round
- [ ] Click on a round to view details
- [ ] Find "Assign Committee Members" section
- [ ] Find "Add Assignment"
- [ ] Select committee member from dropdown
- [ ] Select area(s) they'll review
- [ ] Click "Assign"
- [ ] Verify committee member appears in assignments list
- [ ] Verify can remove assignment (X button)

### 4.9 Assign Applications to Round
- [ ] Click on a round
- [ ] Find "Applications" section
- [ ] Verify shows applications in this round
- [ ] If needed, click "Add Applications"
- [ ] Select applications from list
- [ ] Click "Assign to Round"
- [ ] Verify applications added to round

### 4.10 Upload Portal Documents
- [ ] In Admin Console, find "Documents" section
- [ ] Click "Upload New Document"
- [ ] Select file (PDF, DOCX, Image)
- [ ] Enter title (e.g., "Application Guidelines")
- [ ] Enter description (optional)
- [ ] Select visibility (Public, Committee Only, Admin Only)
- [ ] Click "Upload"
- [ ] Verify document appears in list
- [ ] Verify appears on `/documents` page if marked Public
- [ ] Verify Committee members can download if marked Committee Only

### 4.11 Delete Document
- [ ] In Documents list, find document
- [ ] Click Delete/X
- [ ] Verify confirmation dialog
- [ ] Confirm deletion
- [ ] Verify document removed from list
- [ ] Verify no longer accessible on `/documents` page

### 4.12 View Audit Logs
- [ ] In Admin Console, find "Audit Logs"
- [ ] Verify log entries for:
  - [ ] User created
  - [ ] Status changed
  - [ ] Settings updated
  - [ ] Documents uploaded/deleted
- [ ] Verify each log entry shows:
  - [ ] Admin who made change
  - [ ] Action description
  - [ ] Target (which user/application/document)
  - [ ] Timestamp
- [ ] Filter logs by:
  - [ ] Admin user
  - [ ] Action type
  - [ ] Date range

### 4.13 Export Data to CSV
- [ ] In Applications list, find "Export" button
- [ ] Click "Export to CSV"
- [ ] Verify CSV file downloads
- [ ] Open CSV file in spreadsheet application
- [ ] Verify all application data present:
  - [ ] Application ID, title, area
  - [ ] Applicant name, contact
  - [ ] Status, dates
  - [ ] Scores/votes (if applicable)
- [ ] Verify formatting is correct
- [ ] Verify can import data into analysis tool

---

## 5. Public Pages Tests

### 5.1 Landing Page (`/`)
- [ ] Navigate to `/` (no login required)
- [ ] Verify page loads and displays:
  - [ ] Hero section with project title/description
  - [ ] Call-to-action buttons:
    - [ ] "Submit Idea" (links to login/register)
    - [ ] "Explore Ideas" (links to applications list)
    - [ ] "Vote" (links to postcode checker)
  - [ ] About section explaining the project
  - [ ] Timeline of current round
  - [ ] Featured/recent applications
  - [ ] Contact information
- [ ] Click "Submit Idea" button
- [ ] Verify redirected to login or application form
- [ ] Click "Vote" button
- [ ] Verify redirected to postcode checker

### 5.2 Postcode Checker (`/vote`)
- [ ] Navigate to `/vote`
- [ ] Verify displays:
  - [ ] Postcode entry form
  - [ ] Instructions on how postcode affects voting
  - [ ] Geographic areas and their postcodes
- [ ] Enter valid postcode
- [ ] Click "Check"
- [ ] Verify shows:
  - [ ] Geographic area(s) eligible for voting
  - [ ] Eligible applications for that area
  - [ ] "View Eligible Applications" button
- [ ] Click "View Eligible Applications"
- [ ] Verify shows list of applications for that postcode/area
- [ ] Enter invalid/out-of-area postcode
- [ ] Verify shows message: "No eligible applications for this postcode"
- [ ] Verify shows nearby areas available for voting

### 5.3 Priorities Page (`/priorities`)
- [ ] Navigate to `/priorities`
- [ ] Verify page displays:
  - [ ] List of community priorities
  - [ ] Description for each priority
  - [ ] Icons or visual indicators
  - [ ] Funding allocated per priority
  - [ ] Sample projects that address each priority
- [ ] Verify responsive layout (works on mobile)
- [ ] Verify links to related applications work

### 5.4 Timeline Page (`/timeline`)
- [ ] Navigate to `/timeline`
- [ ] Verify displays:
  - [ ] Current round timeline
  - [ ] Key dates (submission deadlines, voting dates, etc.)
  - [ ] Current status highlighted
  - [ ] Upcoming milestones
  - [ ] Visual timeline representation
- [ ] Verify timestamps are accurate
- [ ] Verify can view past rounds (if applicable)

### 5.5 Documents Page (`/documents`)
- [ ] Navigate to `/documents`
- [ ] Verify displays:
  - [ ] Public documents uploaded by admin
  - [ ] Document titles and descriptions
  - [ ] Download buttons for each document
  - [ ] Document types (Guidelines, Budget Templates, etc.)
- [ ] Click "Download" on document
- [ ] Verify file downloads to computer
- [ ] Verify file opens correctly (PDF opens in browser, etc.)
- [ ] Verify non-public documents NOT visible
  - [ ] Committee-only documents hidden
  - [ ] Admin-only documents hidden

### 5.6 Navigation Between Public Pages
- [ ] Start on Landing page
- [ ] Click navigation to Priorities
- [ ] Verify Priorities page loads
- [ ] Click navigation to Timeline
- [ ] Verify Timeline page loads
- [ ] Use browser back button
- [ ] Verify Timeline still visible (no page reload)
- [ ] Click footer link
- [ ] Verify appropriate page loads

### 5.7 Responsive Design on Public Pages
- [ ] Open landing page on desktop (1920x1080)
- [ ] Verify layout is optimized for desktop
- [ ] Verify multi-column layouts display correctly
- [ ] Open same page on tablet (iPad, 768x1024)
- [ ] Verify layout adjusts (single or two columns)
- [ ] Verify navigation adapts
- [ ] Open on mobile (iPhone, 375x667)
- [ ] Verify responsive navigation menu (hamburger)
- [ ] Verify content stacks vertically
- [ ] Verify buttons and forms are touch-friendly (large tap targets)

---

## 6. Refresh-Safe Routing Tests

### 6.1 Public Page Refresh
- [ ] Navigate to `/`
- [ ] Press F5 (or Ctrl+R)
- [ ] Verify page reloads and shows same content
- [ ] Navigate to `/priorities`
- [ ] Refresh with F5
- [ ] Verify priorities still visible
- [ ] No redirect to login

### 6.2 Login Page Refresh
- [ ] Navigate to `/login`
- [ ] Refresh page
- [ ] Verify login form still visible
- [ ] Fill form and login

### 6.3 Protected Route Refresh (Authenticated)
- [ ] Login as Applicant
- [ ] Navigate to `/portal/dashboard`
- [ ] Verify dashboard loads
- [ ] Press F5
- [ ] Verify still on dashboard (no redirect to login)
- [ ] Verify dashboard data still visible
- [ ] Navigate to `/portal/applications`
- [ ] Refresh page
- [ ] Verify applications list loads
- [ ] Verify application data visible

### 6.4 Protected Route Refresh (Unauthenticated)
- [ ] Open new private/incognito browser window
- [ ] Type `/portal/dashboard` in address bar
- [ ] Press Enter
- [ ] Verify redirected to `/login`
- [ ] Verify login form shows
- [ ] Type `/portal/admin` in address bar
- [ ] Verify redirected to `/login`

### 6.5 Role-Based Route Refresh
- [ ] Login as Committee member
- [ ] Navigate to `/portal/scoring`
- [ ] Verify scoring matrix loads
- [ ] Refresh page (F5)
- [ ] Verify still on scoring page
- [ ] Verify scoring data still visible
- [ ] Logout and login as different role (Admin)
- [ ] Navigate to `/portal/admin`
- [ ] Refresh page
- [ ] Verify still on admin console
- [ ] Verify all admin functions available

### 6.6 Application Detail Page Refresh
- [ ] Navigate to `/portal/application/[app-id]`
- [ ] Verify application detail loads
- [ ] Refresh page (F5)
- [ ] Verify still on same application detail page
- [ ] Verify all application data visible
- [ ] Verify edit functionality works (if permitted)

### 6.7 Hash Route Validation
- [ ] Note URL structure uses # (HashRouter)
  - Examples: `localhost:3000/#/`, `localhost:3000/#/login`
- [ ] Verify refresh works with hash routes
- [ ] Verify browser back button works correctly
- [ ] Verify browser forward button works correctly
- [ ] Bookmark a route (e.g., `/#/portal/scoring`)
- [ ] Close browser
- [ ] Reopen bookmark
- [ ] Verify correct page loads

---

## 7. Responsive Design Tests

### 7.1 Desktop (1920x1080)
- [ ] Landing page layout uses full width properly
- [ ] Navigation bar horizontal with all menu items visible
- [ ] Multi-column layouts display correctly
- [ ] Forms have adequate spacing
- [ ] Buttons and interactive elements properly sized
- [ ] Text is readable without horizontal scrolling

### 7.2 Tablet (iPad, 768x1024 portrait)
- [ ] Landing page content reorganizes for tablet width
- [ ] Navigation adapts (hamburger menu or condensed)
- [ ] Two-column layouts may convert to single column
- [ ] Tables may require horizontal scroll or collapse
- [ ] Touch targets are at least 44x44px
- [ ] Forms are accessible and fillable

### 7.3 Mobile (iPhone, 375x667)
- [ ] All content accessible without pinch/zoom
- [ ] Navigation menu collapses to hamburger/drawer
- [ ] Vertical stacking of content
- [ ] Single-column layouts throughout
- [ ] Buttons sized for touch (minimum 44x44px)
- [ ] Forms don't require horizontal scrolling
- [ ] Modals/overlays sized appropriately for small screen

### 7.4 Dashboard Responsiveness
- [ ] Desktop: Statistics cards in row, applications in table
- [ ] Tablet: Cards may stack, table may show fewer columns
- [ ] Mobile: Single column, table converts to cards
- [ ] All interactive elements touch-friendly on mobile

### 7.5 Application Form Responsiveness
- [ ] Desktop: Two-column form layout
- [ ] Tablet: Single column with wider form fields
- [ ] Mobile: Single column, full-width form fields
- [ ] File upload button properly sized on all devices
- [ ] Validation messages display clearly on mobile

### 7.6 Scoring Matrix Responsiveness
- [ ] Desktop: Full matrix visible with all columns
- [ ] Tablet: Matrix may scroll horizontally
- [ ] Mobile: Simplified scoring interface (accordion or vertical)
- [ ] Criterion names and weight percentages visible
- [ ] Scoring buttons accessible on all screen sizes

### 7.7 Public Pages Responsiveness
- [ ] Landing page hero section scales on all devices
- [ ] CTAs (Call-to-action buttons) visible and clickable
- [ ] Timeline adapts to screen width
- [ ] Postcode checker input full width on mobile
- [ ] Document list scrollable on small screens

### 7.8 Typography & Legibility
- [ ] Headings use appropriate font sizes (desktop: 32px, mobile: 24px)
- [ ] Body text is readable (desktop: 16px, mobile: 14px)
- [ ] Line height provides comfortable reading (1.5-1.8x)
- [ ] Color contrast meets WCAG AA standards (4.5:1 for text)

### 7.9 Images & Icons Responsiveness
- [ ] Images scale properly (responsive max-width: 100%)
- [ ] lucide-react icons scale with text
- [ ] PNG/JPG assets compress for mobile
- [ ] Hero images don't break layout on mobile

---

## 8. Data Persistence & Sync Tests

### 8.1 Application Data Persists
- [ ] Create new application as Applicant
- [ ] Save as draft
- [ ] Logout
- [ ] Login with same user
- [ ] Navigate to applications
- [ ] Verify draft application still exists with all data
- [ ] Verify timestamps unchanged

### 8.2 Vote Data Persists
- [ ] Login as Committee
- [ ] Vote for an application
- [ ] Logout
- [ ] Login with same user
- [ ] Navigate to same application
- [ ] Verify vote still recorded and visible

### 8.3 Score Data Persists
- [ ] Login as Committee
- [ ] Score an application
- [ ] Logout
- [ ] Login with same user
- [ ] Navigate to `/portal/scoring`
- [ ] Find same application
- [ ] Verify score still present with all criteria and notes

### 8.4 Multi-Device Sync
- [ ] Login on Device A (desktop)
- [ ] Create application as Applicant
- [ ] Save as draft
- [ ] On Device B (mobile), login with same account
- [ ] Verify draft application visible on Device B
- [ ] Edit application on Device B
- [ ] On Device A, refresh browser
- [ ] Verify edits from Device B are visible

### 8.5 Settings Persist After Admin Update
- [ ] Admin disables Stage 1
- [ ] Logout and re-login as Applicant
- [ ] Navigate to create new application
- [ ] Verify can't create new EOI (Stage 1 disabled)
- [ ] Admin enables Stage 1 again
- [ ] Applicant refreshes browser
- [ ] Verify can create new application again

---

## 9. Error Handling & Edge Cases

### 9.1 Network Error During Login
- [ ] Open DevTools (F12)
- [ ] Go to Network tab
- [ ] Throttle to "Offline"
- [ ] Attempt login
- [ ] Verify error message: "Network error" or similar
- [ ] Re-enable network
- [ ] Retry login - verify it works

### 9.2 Upload File - Network Interruption
- [ ] Start uploading large document
- [ ] During upload, disconnect internet (DevTools or WiFi)
- [ ] Verify upload fails gracefully
- [ ] Verify error message displayed
- [ ] Verify can retry upload
- [ ] Reconnect and retry

### 9.3 Missing Required Field
- [ ] In application form, leave required field blank
- [ ] Click Submit
- [ ] Verify error message appears on field
- [ ] Verify form doesn't submit
- [ ] Fill in field
- [ ] Verify can submit successfully

### 9.4 Invalid Email Format
- [ ] In registration form, enter invalid email (e.g., "notanemail")
- [ ] Click Register
- [ ] Verify error message: "Invalid email format"
- [ ] Enter valid email
- [ ] Verify can register

### 9.5 Password Mismatch (if applicable)
- [ ] In registration form, enter password and confirmation
- [ ] Enter different confirmation password
- [ ] Click Register
- [ ] Verify error message: "Passwords don't match"
- [ ] Match passwords and retry

### 9.6 Duplicate Email Registration
- [ ] Register with test@example.com
- [ ] Logout
- [ ] Try registering again with same email
- [ ] Verify error message: "Email already in use"

### 9.7 Non-Existent Application ID
- [ ] Type URL: `/portal/application/nonexistent123`
- [ ] Verify error message or empty state
- [ ] Verify redirects to applications list or shows 404

### 9.8 Expired Session
- [ ] Login and get session token
- [ ] Wait for token to expire (or manually simulate in DevTools)
- [ ] Try to perform action (vote, score, etc.)
- [ ] Verify redirected to login
- [ ] Verify error message about expired session

### 9.9 Concurrent Edits
- [ ] Open same application in two browser windows
- [ ] In Window 1, edit field and save
- [ ] In Window 2, edit same field differently and save
- [ ] Verify both saves complete without error
- [ ] Refresh both windows
- [ ] Verify most recent save is visible (last-write-wins or conflict message)

### 9.10 Very Large Application List
- [ ] Admin creates 500+ applications
- [ ] Open applications list page
- [ ] Verify page loads without crashing
- [ ] Verify pagination or lazy loading works
- [ ] Verify filtering still works with large dataset
- [ ] Verify sorting (by date, status) is responsive

---

## 10. Security Tests

### 10.1 XSS Prevention (Script Injection)
- [ ] In application description field, enter: `<script>alert('XSS')</script>`
- [ ] Submit application
- [ ] View application
- [ ] Verify script doesn't execute
- [ ] Verify HTML entities escaped and displayed as text

### 10.2 SQL Injection Prevention
- [ ] In search/filter field, enter: `' OR '1'='1`
- [ ] Verify search works correctly (not bypassed)
- [ ] Verify no database exposure

### 10.3 CSRF Protection
- [ ] While logged in, open developer tools
- [ ] Examine form requests
- [ ] Verify CSRF tokens present (if applicable)
- [ ] Try performing action from external site
- [ ] Verify action blocked or fails

### 10.4 Admin Function Access Control
- [ ] Login as Applicant
- [ ] Try accessing `/portal/admin` directly
- [ ] Verify redirected to dashboard
- [ ] Verify cannot perform admin actions via API calls
- [ ] Try performing admin API calls via DevTools console
- [ ] Verify Firebase security rules block unauthorized calls

### 10.5 Data Privacy - Applicant Cannot See Others' Data
- [ ] Login as Applicant A
- [ ] Try accessing `/portal/application/[applicant-b-app-id]`
- [ ] Verify cannot access other applicant's application
- [ ] Try viewing other applicant's profile
- [ ] Verify personal data hidden (email, phone)

### 10.6 Committee Cannot Modify Applications
- [ ] Login as Committee
- [ ] Open application in edit mode via URL
- [ ] Verify edit form doesn't load (or shows read-only)
- [ ] Try submitting form data via DevTools
- [ ] Verify Firebase rules reject edit attempt

### 10.7 Password Security
- [ ] During registration, enter weak password (e.g., "123456")
- [ ] Verify error message about password strength
- [ ] Enter strong password (12+ chars, mixed case, symbols)
- [ ] Verify registration succeeds
- [ ] Check `.env` file is in `.gitignore`
- [ ] Verify credentials not logged in console

---

## 11. Performance Tests

### 11.1 Page Load Time
- [ ] Open DevTools (F12) → Network tab
- [ ] Disable cache: Settings → Disable cache (while DevTools open)
- [ ] Reload landing page
- [ ] Verify page fully loads in < 3 seconds
- [ ] Navigate to applications list
- [ ] Verify loads in < 2 seconds
- [ ] Check bundle size in dist/ folder
- [ ] Verify main bundle < 200KB gzipped

### 11.2 Search/Filter Performance
- [ ] Navigate to applications list
- [ ] With 100+ applications, filter by area
- [ ] Verify results show instantly (< 1 second)
- [ ] Try multiple filter combinations
- [ ] Verify no lag or freezing

### 11.3 Scoring Matrix Load Time
- [ ] Navigate to `/portal/scoring`
- [ ] Verify page with 50+ applications loads in < 2 seconds
- [ ] Click to score an application
- [ ] Verify scoring form renders smoothly
- [ ] No lag when clicking score buttons

### 11.4 Image Load Performance
- [ ] Navigate to pages with multiple images
- [ ] Verify images load progressively (not all at once)
- [ ] Verify images don't cause layout shift (CLS)
- [ ] Check image file sizes
- [ ] Verify images are appropriately sized (responsive)

### 11.5 Database Query Performance
- [ ] Open DevTools → Network tab
- [ ] Navigate to applications list
- [ ] Check network requests
- [ ] Verify Firebase queries complete in < 1 second
- [ ] With large dataset (1000+ docs), verify query still fast

### 11.6 Memory Usage
- [ ] Open DevTools → Memory tab
- [ ] Take heap snapshot on landing page
- [ ] Navigate to various pages
- [ ] Take another heap snapshot
- [ ] Verify memory doesn't continuously grow
- [ ] Verify no memory leaks

---

## 12. Cross-Browser Testing

### 12.1 Chrome
- [ ] Test login, application creation, voting, scoring
- [ ] Test file uploads
- [ ] Verify all features work
- [ ] Check console for errors

### 12.2 Firefox
- [ ] Test same workflow as Chrome
- [ ] Verify responsive design
- [ ] Verify form inputs (date, file)
- [ ] Check console for errors

### 12.3 Safari
- [ ] Test on Safari (macOS)
- [ ] Test on Safari (iOS)
- [ ] Verify touch interactions work
- [ ] Verify modals/overlays display correctly
- [ ] Check console for errors

### 12.4 Edge
- [ ] Test login workflow
- [ ] Test application form
- [ ] Verify CSS renders correctly
- [ ] Check console for errors

---

## 13. Demo Mode Verification

### 13.1 Demo Mode Enabled
- [ ] Set `USE_DEMO_MODE = true` in services/firebase.ts
- [ ] Restart dev server (`npm run dev`)
- [ ] Verify app loads without Firebase credentials
- [ ] Try login with demo user (check DEMO_USERS in constants.ts)
- [ ] Verify login succeeds with demo data

### 13.2 Demo Data Persistence
- [ ] With demo mode enabled, create new application
- [ ] Refresh page
- [ ] Verify application still exists (localStorage)
- [ ] Create vote/score
- [ ] Refresh page
- [ ] Verify vote/score persisted

### 13.3 Demo to Production Switch
- [ ] Set `USE_DEMO_MODE = false` in services/firebase.ts
- [ ] Restart dev server
- [ ] Login with valid Firebase credentials
- [ ] Verify Firebase calls work
- [ ] Create application in production
- [ ] Verify appears in Firestore console

---

## 14. New Component Tests (Post-Merge Enhancements)

### 14.1 ScoringModal (Committee Inline Scoring)
- [ ] Login as Committee member
- [ ] Navigate to Dashboard
- [ ] Find a Stage 2 application that needs scoring
- [ ] Click "Score App" button on the card
- [ ] Verify ScoringModal opens as overlay
- [ ] Verify all 10 scoring criteria are displayed with weights
- [ ] Verify sliders work (0-100 range, step 5)
- [ ] Verify weighted total calculates in real-time
- [ ] Add optional notes for at least one criterion
- [ ] Click "Submit Score" button
- [ ] Verify modal closes
- [ ] Verify dashboard refreshes
- [ ] Verify application card now shows "Scored" status (green border)
- [ ] Verify cannot score the same application twice (button changes or disabled)

### 14.2 ScoringMonitor (Admin Scoring Progress Tracking)
- [ ] Login as Admin
- [ ] Navigate to `/portal/admin` (Master Console)
- [ ] Verify "Enter Scoring Mode" button is visible on Overview tab
- [ ] Click "Enter Scoring Mode" button
- [ ] Verify ScoringMonitor interface loads
- [ ] Verify only Stage 2 applications are displayed
- [ ] Verify area filter dropdown works (Blaenavon, Thornhill & Upper Cwmbran, Trevethin–Penygarn–St Cadoc's)
- [ ] Verify each application card shows:
  - [ ] Application ref number (e.g., "APP-001")
  - [ ] Project title and organization name
  - [ ] Progress indicator (e.g., "5 / 8" scores submitted)
  - [ ] Average score percentage
  - [ ] Color coding: Green if ≥50%, Red if <50%
- [ ] Click on an application card to expand
- [ ] Verify committee member breakdown appears
- [ ] Verify individual scores shown for members who have scored
- [ ] Verify "Pending" status shown for members who haven't scored
- [ ] Verify green checkmark indicator for completed scores
- [ ] Click "Exit Scoring Mode" button
- [ ] Verify returns to Admin Console Overview tab

### 14.3 BarChart Visualization (Admin Analytics)
- [ ] Login as Admin
- [ ] Navigate to `/portal/admin`
- [ ] On Overview tab, locate "Application Status Distribution" section
- [ ] Verify BarChart displays with all application statuses
- [ ] Verify bar widths are proportional to counts
- [ ] Verify labels are clear (Draft, Stage 1, Stage 2, Funded, etc.)
- [ ] Verify counts are accurate (compare to Master List tab)
- [ ] Verify purple color scheme matches branding

### 14.4 Data Enrichment (Admin Master List)
- [ ] Login as Admin
- [ ] Navigate to `/portal/admin` → Master List tab
- [ ] Verify Master List table includes these columns:
  - [ ] Ref Number
  - [ ] Project Title / Organization
  - [ ] Area
  - [ ] Amount Requested
  - [ ] **Stage 1 (Votes)** - shows "X Yes | Y No" format
  - [ ] **Stage 2 (Score)** - shows "Z% (N)" format (average % with scorer count)
  - [ ] Status
  - [ ] Actions
- [ ] Verify vote counts are accurate:
  - [ ] Create test votes for an application
  - [ ] Refresh page
  - [ ] Verify vote column updates correctly
- [ ] Verify score analytics are accurate:
  - [ ] Create test scores for an application
  - [ ] Refresh page
  - [ ] Verify score column shows average % and count
  - [ ] Verify badge color: Green if ≥threshold, Red if <threshold
- [ ] Verify status dropdown allows changing application status
- [ ] Verify View/Edit buttons work for each application

### 14.5 Committee Inline Voting & Color-Coded Cards
- [ ] Login as Committee member
- [ ] Navigate to Dashboard
- [ ] Verify application cards have color-coded left borders:
  - [ ] **Orange border** = Vote Needed (Stage 1, not voted yet)
  - [ ] **Purple border** = Score Needed (Stage 2, not scored yet)
  - [ ] **Green border** = Already voted/scored
  - [ ] **Gray border** = No action required
- [ ] Find a Stage 1 application that needs voting (orange border)
- [ ] Verify "Yes" and "No" buttons are visible on the card
- [ ] Click "Yes" button
- [ ] Verify page refreshes
- [ ] Verify card border changes to green
- [ ] Verify status badge shows "Voted"
- [ ] Find a Stage 2 application that needs scoring (purple border)
- [ ] Verify "Score App" button is visible
- [ ] Click "Score App" button
- [ ] Verify ScoringModal opens (tested in 14.1 above)

### 14.6 Matrix Evaluation Page (Committee & Admin)
- [ ] Login as Committee member
- [ ] Click "Matrix Evaluation" in sidebar navigation
- [ ] Verify navigates to `/portal/scoring`
- [ ] Verify page loads without errors
- [ ] Verify assigned applications are displayed
- [ ] Verify scoring interface works (same functionality as ScoringMatrix)
- [ ] Logout and login as Admin
- [ ] Click "Matrix Evaluation" in sidebar navigation
- [ ] Verify Admin can access the page
- [ ] Verify Admin sees all applications (not area-filtered)
- [ ] Verify Admin can VIEW scoring data but check if submit is restricted

### 14.7 Master Console Navigation (Admin)
- [ ] Login as Admin
- [ ] Click "Master Console" in sidebar navigation
- [ ] Verify navigates to `/portal/admin`
- [ ] Verify all 7 tabs are visible and clickable:
  - [ ] Overview
  - [ ] Master List
  - [ ] Users
  - [ ] Rounds
  - [ ] Documents
  - [ ] Settings
  - [ ] Audit Logs
- [ ] Click each tab and verify content loads correctly
- [ ] Verify no logout or navigation errors occur

### 14.8 DynaPuff Font Verification
- [ ] Open application in browser
- [ ] Open DevTools (F12) → Elements tab
- [ ] Find an element with `font-display` class (e.g., page heading)
- [ ] Verify Computed Style shows "DynaPuff" as the font family
- [ ] Verify text displays with the correct decorative font (not Arial)
- [ ] Check public pages (landing, priorities) for DynaPuff usage
- [ ] Check secure pages (dashboard, admin console) for DynaPuff usage

### 14.9 Refresh-Safe Routing (Vercel Deployment)
- [ ] Deploy application to Vercel (or test with production build preview)
- [ ] Navigate to `/portal/dashboard`
- [ ] Press F5 to refresh page
- [ ] Verify page loads correctly (no 404 error)
- [ ] Navigate to `/portal/admin`
- [ ] Press F5 to refresh page
- [ ] Verify page loads correctly (no 404 error)
- [ ] Navigate to `/portal/scoring`
- [ ] Press F5 to refresh page
- [ ] Verify page loads correctly (no 404 error)
- [ ] Verify vercel.json rewrites configuration is working

---

## 15. Final Sign-Off

### Tester Information
- [ ] Tester Name: _____________________
- [ ] Date Tested: _____________________
- [ ] Environment: [ ] Demo Mode [ ] Production
- [ ] Browser/OS: _____________________

### Issues Found
- [ ] Number of Critical Issues: _____
- [ ] Number of High Priority Issues: _____
- [ ] Number of Medium Priority Issues: _____
- [ ] Number of Low Priority Issues: _____

### Test Results
- [ ] All critical tests passed
- [ ] All high priority tests passed
- [ ] Medium/low priority issues documented
- [ ] Ready for deployment: [ ] YES [ ] NO

### Notes
```
[Additional notes about testing, issues discovered, etc.]
```

### Sign-Off
- [ ] Tester verifies: All tested features work as expected
- [ ] Tester confirms: Ready to proceed to next phase
- [ ] Date: _____________________

---

**Testing Guide Completed**: 2025-12-28
**Version**: 2.0 (includes post-merge enhancements)
**Total Test Cases**: 250+ (including new component tests)
**Estimated Testing Time**: 10-12 hours per tester (comprehensive)
**Critical Tests**: 80+ (auth, workflows, scoring, admin functions)
**Enhancement Tests**: 50+ (ScoringModal, ScoringMonitor, inline voting, data enrichment)
