# Firebase Setup & Deployment Guide

## 🔥 Connect to Live Firebase Database

Your PB Portal is now configured to connect to **pb-portal-2026** Firebase project.

---

## Step 1: Firebase Console Setup

### 1.1 Enable Firestore Database
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **pb-portal-2026**
3. Navigate to **Firestore Database** in left sidebar
4. Click **Create Database**
5. Choose **Production mode**
6. Select location: **eur3 (europe-west)** (recommended for UK)
7. Click **Enable**

### 1.2 Enable Email/Password Authentication
1. In Firebase Console, go to **Authentication**
2. Click **Get Started** (if first time)
3. Go to **Sign-in method** tab
4. Click **Email/Password**
5. Toggle **Enable** switch to ON
6. Click **Save**

### 1.3 Deploy Firestore Security Rules
```bash
# In your project directory
firebase deploy --only firestore:rules
```

Or manually copy rules from `firestore.rules` to Firebase Console:
1. Go to **Firestore Database** → **Rules** tab
2. Replace content with rules from `firestore.rules`
3. Click **Publish**

---

## Step 2: Seed Database

### 2.1 Open Seeding Tool
1. Open `seed-database.html` in your browser (double-click the file)
2. Click **🔍 Test Firebase Connection** button
3. Verify you see ✅ **Firebase connection successful!**

### 2.2 Seed Demo Data
1. Click **🌱 Seed Database Now** button
2. Wait for completion (should take 2-3 seconds)
3. Verify you see:
   - ✅ 5 users created
   - ✅ 2 demo applications
   - ✅ 3 admin folders
   - ✅ 1 portal settings document

### 2.3 Demo User Credentials
The seeding creates these users in **Firestore** (user profiles):

| Email | Password | Role | Area |
|-------|----------|------|------|
| admin@pbportal.com | Admin123! | admin | All |
| committee1@pbportal.com | Committee1! | committee | Blaenavon |
| committee2@pbportal.com | Committee2! | Thornhill & Upper Cwmbran |
| committee3@pbportal.com | Committee3! | Trevethin, Penygarn & St. Cadocs |
| applicant@example.com | Applicant1! | applicant | Blaenavon |

---

## Step 3: Create Firebase Authentication Users

⚠️ **IMPORTANT**: The seeding tool creates Firestore user profiles, but **NOT** authentication accounts.

You must create authentication users manually:

### Option A: Firebase Console (Manual)
1. Go to **Authentication** → **Users** tab
2. Click **Add User**
3. Enter email and password from table above
4. Copy the generated **User UID**
5. Go to **Firestore Database** → **users** collection
6. Find the user document (by email)
7. **Update the `uid` field** with the copied UID

Repeat for all 5 users.

### Option B: Firebase Admin SDK (Recommended for bulk creation)
Create `create-auth-users.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

const DEMO_USERS = [
  { email: 'admin@pbportal.com', password: 'Admin123!', uid: 'admin1' },
  { email: 'committee1@pbportal.com', password: 'Committee1!', uid: 'comm1' },
  { email: 'committee2@pbportal.com', password: 'Committee2!', uid: 'comm2' },
  { email: 'committee3@pbportal.com', password: 'Committee3!', uid: 'comm3' },
  { email: 'applicant@example.com', password: 'Applicant1!', uid: 'app1' }
];

async function createAuthUsers() {
  for (const user of DEMO_USERS) {
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: user.password,
        emailVerified: true
      });
      console.log(`✅ Created: ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed: ${user.email}`, error.message);
    }
  }
}

createAuthUsers();
```

Run:
```bash
npm install firebase-admin
node create-auth-users.js
```

---

## Step 4: Verify Environment Variables

The `.env` file is already configured with Firebase credentials:

```env
VITE_FIREBASE_API_KEY=AIzaSyBH4fnIKGK4zyY754ahI5NBiayBCcAU7UU
VITE_FIREBASE_AUTH_DOMAIN=pb-portal-2026.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pb-portal-2026
VITE_FIREBASE_STORAGE_BUCKET=pb-portal-2026.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=810167292126
VITE_FIREBASE_APP_ID=1:810167292126:web:91128e5a8c67e4b6fb324f
VITE_FIREBASE_MEASUREMENT_ID=G-9L1GX3J9H7
```

⚠️ **Security Note**: `.env` is gitignored (not committed to repository). This is correct!

---

## Step 5: Deploy to Vercel

### 5.1 Install Vercel CLI (if not installed)
```bash
npm i -g vercel
```

### 5.2 Deploy
```bash
vercel --prod
```

### 5.3 Configure Environment Variables in Vercel
During deployment, Vercel will detect your `.env` file and ask to import variables.

**OR** manually add in Vercel Dashboard:
1. Go to your project in Vercel Dashboard
2. Settings → Environment Variables
3. Add each variable from `.env` file:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`

### 5.4 Redeploy After Adding Variables
```bash
vercel --prod
```

---

## Step 6: Test Live Application

Once deployed, your Vercel preview URL will be like:
```
https://vercel-pbport26-xxx.vercel.app
```

### Test Login:
1. Go to your Vercel URL
2. Click **Sign In / Register**
3. Try logging in with: `admin@pbportal.com` / `Admin123!`
4. Should see Admin Dashboard

### Test Application Flow:
1. Log out
2. Log in as: `applicant@example.com` / `Applicant1!`
3. Click **Create New Application**
4. Fill out form and submit
5. Verify in Admin Console

---

## Alternative: Local Testing First

Before deploying, test locally with Firebase:

```bash
npm run dev
```

Open http://localhost:3000 and test login with demo credentials.

---

## Troubleshooting

### "Firebase not initialized"
- Check `.env` file exists in project root
- Verify all environment variables start with `VITE_`
- Restart dev server after changing `.env`

### "Permission denied" in Firestore
- Deploy security rules from `firestore.rules`
- Check rules in Firebase Console → Firestore → Rules tab

### "Email already exists" when creating auth users
- User already exists in Authentication
- Either use existing UID or delete and recreate

### "Cannot read properties of undefined (reading 'uid')"
- User profile exists in Firestore but not in Authentication
- Create authentication account with matching UID

---

## Firebase Security Rules Summary

The `firestore.rules` file ensures:

✅ **Users collection**: Users can only read/update own profile; admins have full access
✅ **Applications collection**: Area-scoped access for committees; own applications for applicants
✅ **Scores collection**: Committee can create/update own scores only
✅ **Portal settings**: Public read, admin write
✅ **Admin documents**: Role-based access

---

## Current Configuration Status

| Component | Status |
|-----------|--------|
| Environment Variables | ✅ Configured in `.env` |
| Demo Mode | ✅ Disabled (`USE_DEMO_MODE = false`) |
| Firebase Config | ✅ Points to pb-portal-2026 |
| Seeding Tool | ✅ Ready (`seed-database.html`) |
| Vercel Config | ✅ Ready (`vercel.json`) |
| Security Rules | ✅ Ready (`firestore.rules`) |

---

## Next Steps Checklist

- [ ] Enable Firestore Database in Firebase Console
- [ ] Enable Email/Password Authentication in Firebase Console
- [ ] Deploy Firestore security rules
- [ ] Open `seed-database.html` and test connection
- [ ] Seed database with demo data
- [ ] Create Firebase Authentication users (manual or Admin SDK)
- [ ] Deploy to Vercel with environment variables
- [ ] Test live application with demo credentials
- [ ] Create production users and disable demo accounts

---

## Support

For issues:
1. Check browser DevTools console for errors
2. Verify Firebase Console shows data in Firestore
3. Confirm authentication users exist in Firebase Auth
4. Check Vercel deployment logs
5. Review `SYNTHESIS_REPORT.md` for architecture details

---

**🎉 Your PB Portal is ready for live Firebase deployment!**

Built with Firebase 10.12.2, React 18.3.1, and Vite 5.2.0.
