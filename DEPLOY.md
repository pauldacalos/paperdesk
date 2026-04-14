# PaperDesk — Firebase Deployment Guide

## Prerequisites

- Node.js 18+ installed
- A Firebase project created at https://console.firebase.google.com
- Firebase CLI installed globally

---

## Step 1 — Install Firebase CLI

```bash
npm install -g firebase-tools
```

Verify:
```bash
firebase --version
# Should print 13.x or higher
```

---

## Step 2 — Login

```bash
firebase login
```

This opens a browser for Google auth. Complete it, then return to the terminal.

---

## Step 3 — Set up the project folder

```bash
mkdir paperdesk-backend
cd paperdesk-backend
```

Copy these files into the folder (from the files provided):
```
paperdesk-backend/
├── firebase.json
├── storage.rules
├── firestore.rules
└── functions/
    ├── index.js
    └── package.json
```

---

## Step 4 — Connect to your Firebase project

```bash
firebase use --add
```

Select your Firebase project from the list.
Give it an alias when prompted (e.g. `default` or `paperdesk`).

---

## Step 5 — Install Cloud Function dependencies

```bash
cd functions
npm install
cd ..
```

This installs `firebase-functions`, `firebase-admin`, and `cors` into `functions/node_modules/`.

---

## Step 6 — Enable required Firebase services

In the Firebase Console (https://console.firebase.google.com), for your project:

1. **Firestore** → Click "Create database" → Start in **production mode** → Choose a region
2. **Storage** → Click "Get started" → Start in **production mode** → Same region as Firestore
3. **Functions** → Requires a **Blaze (pay-as-you-go)** plan
   - Go to Project Settings → Usage and billing → Modify plan → Blaze
   - You won't be charged for low traffic (generous free tier applies)

---

## Step 7 — Deploy everything

```bash
# From the paperdesk-backend/ root (not inside functions/)
firebase deploy
```

This deploys:
- Cloud Function (`submitPaper`)
- Storage rules
- Firestore rules

To deploy only the function (faster during iteration):
```bash
firebase deploy --only functions
```

---

## Step 8 — Get your Cloud Function URL

After deploy, the terminal prints something like:

```
✔  functions[us-central1-submitPaper]: Successful create operation.
Function URL (submitPaper(us-central1)): https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/submitPaper
```

**Copy that URL.**

---

## Step 9 — Update your frontend

Open `paperdesk_v2.html` and find this line (~line 1012):

```javascript
const CLOUD_FUNCTION_URL = 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/submitPaper';
```

Replace with your actual URL from Step 8.

Also fill in your Firebase config (~lines 986–993):

```javascript
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSy...',
  authDomain:        'your-project.firebaseapp.com',
  projectId:         'your-project-id',
  storageBucket:     'your-project.appspot.com',
  messagingSenderId: '123456789',
  appId:             '1:123456789:web:abc123'
};
```

Find these values at:
Firebase Console → Project Settings (gear icon) → General → Your apps → Web app → SDK setup

---

## Step 10 — Test locally (optional but recommended)

```bash
# From paperdesk-backend/
firebase emulators:start --only functions,storage,firestore
```

The emulator runs the function at:
```
http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1/submitPaper
```

Temporarily change `CLOUD_FUNCTION_URL` in your frontend to that local URL, open
`paperdesk_v2.html` in a browser, and submit a test paper.

---

## Final Working Flow

```
User fills form → clicks Submit
        │
        ▼
[Browser] uploadBytes() → Firebase Storage
        │                  submissions/42/1720000000000_paper.pdf
        │
        ▼
[Browser] getDownloadURL() → gets fileUrl (permanent HTTPS link)
        │
        ▼
[Browser] fetch(CLOUD_FUNCTION_URL, { method: POST, body: JSON })
        │   payload: { title, abstract, authors, keywords, fileUrl, filePath, ... }
        │
        ▼
[Cloud Function: submitPaper]
        │  validates fields
        │  logs submission
        │  (FUTURE: send email, notify admin, assign reviewer)
        │  returns { success: true, fileUrl }
        │
        ▼
[Browser] saveToFirestore({ title, abstract, authors, keywords, fileUrl, status: 'Submitted', ... })
        │
        ▼
[Firestore: submissions collection]
        document: { submissionNum, title, abstract, authors, keywords,
                    fileUrl, status: 'Submitted', createdAt: serverTimestamp() }
        │
        ▼
[Browser] showDetailView() — shows success UI with file link
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| CORS error in browser | Check `cors({ origin: true })` is in `index.js`. Redeploy. |
| `storage/unauthorized` | Check `storage.rules` — `allow write` must match your file's contentType |
| Function not found (404) | Double check `CLOUD_FUNCTION_URL` matches the deploy output exactly |
| Firestore write fails | Check `firestore.rules` — `allow create` rule must be present |
| File too large | 50 MB limit is set in both `storage.rules` and the frontend `setFile()` check |
| Free tier limit hit | Functions require Blaze plan — check Firebase Console billing |
