# Firestore Security Rules Setup Guide

## Overview

The Communities' Choice Participatory Budgeting Portal requires specific Firestore security rules to function correctly in production. This document explains the rules and how to deploy them.

## Required Collections

The application uses the following Firestore collections:

1. **users** - User profiles and authentication data
2. **applications** - Funding applications (EOI and Full)
3. **votes** - Committee votes on Stage 1 (EOI) applications
4. **scores** - Committee scores on Stage 2 (Full) applications
5. **rounds** - Funding rounds configuration
6. **assignments** - Committee member assignments to applications
7. **portalSettings** - Global portal configuration
8. **documentFolders** - Document folder structure
9. **documents** - Uploaded documents and resources
10. **auditLogs** - Admin action audit trail
11. **announcements** - System announcements
12. **notifications** - User notifications
13. **financials** - Financial tracking per round
14. **publicVotes** - Public votes on funded applications

## Deploying Firestore Rules

### Method 1: Firebase Console (Recommended for Quick Setup)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` from this repository
5. Paste into the Firebase Rules editor
6. Click **Publish**

### Method 2: Firebase CLI

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

## Permission Structure

### Admin Permissions
Admins have full read/write access to:
- All collections (users, applications, votes, scores, etc.)
- Can create, update, and delete resources
- Can view audit logs

### Committee Permissions
Committee members can:
- **Read**: Applications in their assigned area (via assignments)
- **Create/Update**: Votes for applications in their area
- **Create/Update**: Scores for assigned applications (if not final)
- **Read**: Their own assignments
- **Read**: Portal settings (for feature toggles)
- **Read**: Documents and folders (visibility: public or committee)
- **Read**: Announcements
- **Read**: Their own notifications

### Applicant Permissions
Applicants can:
- **Create**: Their own applications
- **Read/Update**: Their own applications
- **Delete**: Their own draft applications
- **Read**: Portal settings
- **Read**: Documents (visibility: public)
- **Read**: Announcements
- **Read**: Their own notifications

### Public Permissions
- **Read**: Rounds (for public information)
- **Read**: Portal settings (for feature flags like voting windows)
- **Read**: Public announcements

## Critical Rules for Dashboard Loading

The following rules are **essential** for preventing the "Error Loading Dashboard" issue:

### 1. Announcements Collection

```javascript
match /announcements/{announcementId} {
  // Anyone can read public announcements
  allow read: if true;
  
  // Only admins can create, update, delete announcements
  allow create, update, delete: if isAdmin();
}
```

**Why**: Admin dashboard needs to load announcements without permission errors.

### 2. Notifications Collection

```javascript
match /notifications/{notificationId} {
  // Users can read their own notifications
  allow read: if isAuthenticated() && 
                 resource.data.recipientId == request.auth.uid;
  
  // Admins can read all notifications
  allow read: if isAdmin();
  
  // Only admins and system can create notifications
  allow create: if isAdmin();
  
  // Users can mark their own notifications as read
  allow update: if isAuthenticated() && 
                   resource.data.recipientId == request.auth.uid &&
                   request.resource.data.keys().hasOnly(['read', 'readAt']) &&
                   request.resource.data.read == true;
  
  // Admins can update any notification
  allow update: if isAdmin();
  
  // Only admins can delete notifications
  allow delete: if isAdmin();
}
```

**Why**: Notifications must be readable by users and admins for the bell icon to work.

### 3. Financials Collection

```javascript
match /financials/{roundId} {
  // Anyone authenticated can read financial summaries
  allow read: if isAuthenticated();
  
  // Only admins can create, update, delete financial records
  allow create, update, delete: if isAdmin();
}
```

**Why**: Admin console Financials tab needs read access.

### 4. Public Votes Collection

```javascript
match /publicVotes/{voteId} {
  // Anyone authenticated can read vote counts (aggregated)
  allow read: if isAuthenticated();
  
  // Anyone authenticated can create a public vote (during voting period)
  allow create: if isAuthenticated() &&
                   request.resource.data.voterId == request.auth.uid;
  
  // Users cannot update their votes once cast
  allow update: if false;
  
  // Only admins can delete public votes
  allow delete: if isAdmin();
}
```

**Why**: Public voting page and admin console need to read vote counts.

## Troubleshooting

### Issue: "Permission denied" errors in console

**Solution**: 
1. Check that all collections listed above have appropriate rules
2. Verify that the `isAdmin()`, `isCommittee()`, and `isApplicant()` helper functions are defined
3. Ensure the `users` collection has a document for each authenticated user with the correct `role` field

### Issue: Dashboard shows "Error Loading Dashboard"

**Solution**:
1. Open browser console (F12) and check for specific permission errors
2. Verify Firestore rules include all collections (especially announcements, notifications, financials)
3. Check that the authenticated user has a valid role in the `users` collection

### Issue: Committee members can't see applications

**Solution**:
1. Ensure committee member has `area` field set in their user profile
2. Verify assignments exist linking committee member to applications
3. Check that application documents have correct `area` and `areaId` fields

### Issue: Admin can't create users

**Solution**:
1. Verify admin role is correctly set in Firestore: `role: 'admin'`
2. Check that secondary Firebase auth app is initialized (in firebase.ts)
3. Ensure `users` collection has create permission for admins

## Testing Rules

### Test 1: Admin Access
```bash
# As admin user, should succeed:
- Read all applications
- Read all audit logs
- Create/update/delete announcements
- Read all notifications
```

### Test 2: Committee Access
```bash
# As committee member, should succeed:
- Read applications in assigned area
- Create votes for applications in area
- Read own assignments

# Should fail:
- Read applications in other areas (without assignments)
- Create users
- Delete audit logs
```

### Test 3: Applicant Access
```bash
# As applicant, should succeed:
- Create own applications
- Read/update own applications
- Delete own draft applications

# Should fail:
- Read other users' applications
- Update portal settings
- Create announcements
```

## Security Best Practices

1. **Never disable rules completely** - Always maintain some level of access control
2. **Audit regularly** - Review audit logs for suspicious activity
3. **Test in staging first** - Always test rule changes in a staging environment
4. **Use indexes** - Create Firestore indexes for all queries (see firestore.indexes.json)
5. **Limit data exposure** - Only return data users need to see
6. **Validate inputs** - Use request.resource.data validation where appropriate

## Migration from Old Rules

If you have existing rules, follow these steps:

1. **Backup current rules**:
   ```bash
   firebase firestore:rules:get > firestore.rules.backup
   ```

2. **Review breaking changes**: Compare new rules with old rules to identify differences

3. **Deploy with care**:
   ```bash
   # Test in staging first
   firebase use staging
   firebase deploy --only firestore:rules
   
   # If successful, deploy to production
   firebase use production
   firebase deploy --only firestore:rules
   ```

4. **Monitor errors**: Watch Firestore logs for permission denied errors after deployment

## Support

If you encounter issues with Firestore rules:

1. Check the browser console for specific error messages
2. Review the [Firebase Security Rules documentation](https://firebase.google.com/docs/firestore/security/get-started)
3. Test rules using the [Firebase Rules Playground](https://firebase.google.com/docs/rules/simulator)
4. Refer to the `firestore.rules` file in this repository for the complete ruleset

## Related Files

- `firestore.rules` - Complete Firestore security rules
- `firestore.indexes.json` - Required Firestore indexes
- `services/firebase.ts` - Firebase service implementation
- `DEPLOYMENT_GUIDE.md` - Full deployment guide

---

**Last Updated**: 2026-01-18  
**Version**: 1.0.0
