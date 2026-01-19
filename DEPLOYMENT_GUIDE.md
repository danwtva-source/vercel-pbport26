# Production Deployment Guide

## Overview

This guide walks through deploying the Communities' Choice Participatory Budgeting Portal to production, ensuring all features work correctly and data is properly configured.

## Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] Firebase project created (or existing project identified)
- [ ] Environment variables configured (see `.env.example`)
- [ ] Firebase Authentication enabled (Email/Password provider)
- [ ] Firestore Database created
- [ ] Firebase Storage configured

### 2. Environment Variables

Create a `.env` file (or configure in your hosting platform) with:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

**⚠️ Important**: Never commit `.env` to version control. Use `.env.example` as a template.

### 3. Firebase Configuration

#### A. Firestore Rules

Deploy security rules (see `FIRESTORE_RULES_SETUP.md` for details):

```bash
firebase deploy --only firestore:rules
```

#### B. Firestore Indexes

Deploy composite indexes for complex queries:

```bash
firebase deploy --only firestore:indexes
```

Required indexes are defined in `firestore.indexes.json`.

#### C. Storage Rules

Deploy storage rules for file uploads:

```bash
firebase deploy --only storage
```

### 4. Initial Admin User

You **must** create an initial admin user before deploying. You have two options:

#### Option A: Create via Firebase Console (Recommended)

1. Go to Firebase Console → Authentication
2. Add user manually with email/password
3. Go to Firestore Database
4. Create a document in `users` collection:
   ```json
   {
     "uid": "auth-uid-from-step-2",
     "email": "admin@example.com",
     "displayName": "Admin User",
     "role": "admin",
     "createdAt": 1737244800000,
     "isActive": true
   }
   ```

#### Option B: Create via Firebase CLI

```bash
# Install Firebase Admin SDK
npm install firebase-admin

# Create script (create-admin.js)
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createAdmin() {
  const auth = admin.auth();
  const db = admin.firestore();
  
  try {
    // Create auth user
    const userRecord = await auth.createUser({
      email: 'admin@example.com',
      password: 'SecurePassword123!',
      displayName: 'Admin User'
    });
    
    // Create Firestore document
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'admin',
      createdAt: Date.now(),
      isActive: true
    });
    
    console.log('Admin user created successfully:', userRecord.uid);
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();
```

Run: `node create-admin.js`

## Deployment Steps

### 1. Build Application

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

Verify build completes without errors. Output will be in `dist/` directory.

### 2. Deploy to Hosting

#### Option A: Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Link project:
   ```bash
   vercel link
   ```

3. Add environment variables in Vercel dashboard

4. Deploy:
   ```bash
   vercel --prod
   ```

#### Option B: Firebase Hosting

1. Configure `firebase.json`:
   ```json
   {
     "hosting": {
       "public": "dist",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ]
     }
   }
   ```

2. Deploy:
   ```bash
   firebase deploy --only hosting
   ```

#### Option C: Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

### 3. Post-Deployment Verification

After deployment, verify each component:

#### A. Authentication
- [ ] Can log in as admin user
- [ ] Can create new users from admin console
- [ ] Can log out and log back in

#### B. Dashboard Loading
- [ ] Admin dashboard loads without errors
- [ ] No "permission denied" errors in console
- [ ] All KPI cards show data (may show 0 if no data yet)

#### C. Admin Console Tabs
- [ ] Overview tab shows statistics
- [ ] Master List tab displays (empty initially)
- [ ] Users tab shows admin user
- [ ] Assignments tab loads
- [ ] Rounds tab loads
- [ ] Financials tab loads
- [ ] Coefficients tab loads
- [ ] Announcements tab loads
- [ ] Documents tab loads
- [ ] Audit Logs tab shows logs
- [ ] Settings tab loads with correct toggles

#### D. Data Seeding (Optional)

To populate with test data:

1. Log in as admin
2. Go to Settings tab
3. Scroll to "Development: Seed All Test Data"
4. Click "Seed All Test Data"
5. Verify data appears in other tabs

## Demo Mode vs Production Mode

### Demo Mode (Development)

In `services/firebase.ts`:
```typescript
export const USE_DEMO_MODE = true;
```

Features:
- No Firebase connection required
- Data stored in localStorage
- Instant responses (no network latency)
- Useful for UI development and testing

### Production Mode

In `services/firebase.ts`:
```typescript
export const USE_DEMO_MODE = false;
```

Features:
- Full Firebase integration
- Real-time data synchronization
- Proper authentication
- Firestore security rules enforced

**⚠️ Important**: Always set `USE_DEMO_MODE = false` before deploying to production.

## Data Migration

### Migrating from v7 to v8

If you have data from a previous version:

1. **Backup existing data**:
   ```bash
   # Export Firestore data
   gcloud firestore export gs://your-bucket/backup-$(date +%Y%m%d)
   ```

2. **Run migration utilities** (in Admin Console → Users tab):
   - Click "Normalize Roles & UID" to standardize user roles
   - Click "Recheck Auth Consistency" to verify auth accounts

3. **Verify data integrity**:
   - Check Applications tab - ensure all apps have `userId` and `area`
   - Check Assignments tab - verify committee assignments
   - Check Scores/Votes - ensure proper linking

## Troubleshooting

### Issue: Dashboard shows "Error Loading Dashboard"

**Cause**: Missing Firestore rules for announcements, notifications, or financials  
**Solution**: Deploy complete firestore.rules file (see `FIRESTORE_RULES_SETUP.md`)

```bash
firebase deploy --only firestore:rules
```

### Issue: "Firebase not initialized" errors

**Cause**: Missing or incorrect environment variables  
**Solution**: 
1. Verify all `VITE_FIREBASE_*` variables are set
2. Check `.env` file matches Firebase project config
3. Rebuild application after changing environment variables

### Issue: Admin can't create users

**Cause**: Secondary auth instance not initialized  
**Solution**:
1. Verify Firebase config includes all required fields
2. Check browser console for initialization errors
3. Ensure `secondaryAuth` in firebase.ts is configured

### Issue: Committee members see no applications

**Cause**: Missing assignments or incorrect area mapping  
**Solution**:
1. Verify committee member has `area` field set
2. Create assignments in Assignments tab
3. Use bulk assignment feature for efficiency

### Issue: Build fails with "Duplicate member" errors

**Cause**: Duplicate method definitions in services/firebase.ts  
**Solution**: Already fixed in latest version. Pull latest code.

### Issue: Performance - Large bundle size

**Cause**: All code in single bundle  
**Solution** (optional):
1. Enable code splitting in vite.config.ts:
   ```javascript
   export default {
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom', 'react-router-dom'],
             firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
           }
         }
       }
     }
   }
   ```

## Monitoring & Maintenance

### 1. Regular Checks

Daily:
- [ ] Check Firestore usage (avoid exceeding quotas)
- [ ] Monitor authentication errors
- [ ] Review audit logs for suspicious activity

Weekly:
- [ ] Backup Firestore data
- [ ] Review error logs
- [ ] Check storage usage

Monthly:
- [ ] Update dependencies
- [ ] Review and optimize Firestore indexes
- [ ] Audit user accounts

### 2. Firestore Usage Limits

Free tier limits:
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1 GB storage

Monitor usage in Firebase Console → Usage and billing

### 3. Performance Optimization

- Enable Firestore caching in production
- Use pagination for large lists (already implemented)
- Optimize images before upload
- Enable GZIP compression on hosting

### 4. Security Best Practices

- [ ] Enable Firebase App Check (prevents abuse)
- [ ] Set up Cloud Functions for sensitive operations
- [ ] Regular security audits of Firestore rules
- [ ] Rotate admin passwords regularly
- [ ] Monitor for unauthorized access attempts

## Rollback Procedure

If deployment fails or causes issues:

### 1. Hosting Rollback

**Vercel**:
```bash
vercel rollback
```

**Firebase Hosting**:
```bash
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION DESTINATION_SITE_ID
```

### 2. Rules Rollback

```bash
# Restore previous rules
firebase deploy --only firestore:rules
```

### 3. Data Rollback

```bash
# Import from backup
gcloud firestore import gs://your-bucket/backup-20260118
```

## Support & Resources

### Documentation
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)

### Project Documentation
- `README.md` - Project overview
- `FIRESTORE_RULES_SETUP.md` - Firestore rules guide
- `PRD.txt` - Product requirements
- `FEATURE_MATRIX.md` - Feature documentation

### Getting Help

1. Check browser console for specific errors
2. Review Firebase logs in Firebase Console
3. Check GitHub issues in repository
4. Consult audit logs in Admin Console

---

**Last Updated**: 2026-01-18  
**Version**: 1.0.0  
**Deployment Target**: Production-ready build with graceful error handling
