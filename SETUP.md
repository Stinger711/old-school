# Old School · Class of '86 — Setup Guide

Estimated setup time: 20–30 minutes.

---

## 0. Add the DHS crest image

Copy your `dhs-crest.png` file into the `public/` folder:

```
photo-archive/
└── public/
    └── dhs-crest.png   ← put it here
```

This image is used as the app icon, the hero on the landing page,
the WhatsApp link preview image, and the PWA home screen icon.

---

## 1. Firebase Project

### Create the project
1. Go to https://console.firebase.google.com
2. **Add project** → name it `old-school` → Continue
3. Disable Google Analytics → **Create project**

### Enable Firestore
1. **Build → Firestore Database → Create database**
2. Choose **Start in production mode** → pick a region (e.g. `europe-west1`) → **Enable**
3. **Rules** tab → paste the contents of `firestore.rules` → **Publish**

### Enable Storage
1. **Build → Storage → Get started**
2. **Start in production mode** → same region → **Done**
3. **Rules** tab → replace with:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read:  if true;
         allow write: if true;
       }
     }
   }
   ```
   Then **Publish**

### Get your config keys
1. ⚙️ gear icon → **Project settings**
2. Scroll to **Your apps** → click **</>** (Web) → register → **Register app**
3. Copy the `firebaseConfig` values

---

## 2. Fill in src/config.js

```js
export const FIREBASE_CONFIG = {
  apiKey:            "AIza...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

Also update:
- `APP_URL` → your GitHub Pages URL (e.g. `https://markbarberic.github.io/old-school`)
- `ADMIN_PIN` → change from `"1234"` to something only you know

---

## 3. EmailJS — notification emails

### Create account and Gmail service
1. https://www.emailjs.com → **Sign Up Free**
2. **Email Services → Add New Service → Gmail** → connect your account
3. Note the **Service ID**

### Create template
1. **Email Templates → Create New Template**
2. **To Email** field: `{{to_email}}`
3. **Subject**: `New photo added: {{photo_title}}`
4. **Body**:
   ```
   Hi {{to_name}},

   A new photo has been added to Old School: "{{photo_title}}"

   View it here: {{app_url}}

   Deo Fretus,
   Old School
   ```
5. **Save** → note the **Template ID**

### Get public key
**Account → General → Public Key**

### Add to config.js
```js
export const EMAILJS = {
  serviceId:  "service_abc123",
  templateId: "template_xyz789",
  publicKey:  "your_public_key",
};
```

> Free tier: 200 emails/month. Upgrade at $15/month for 1,000.

---

## 4. GitHub Repository

### Set your repo name in vite.config.js
```js
base: '/old-school/',   // must match your repo name exactly
```

### Push to GitHub
```bash
cd photo-archive
git init
git add .
git commit -m "Initial commit — Old School Class of '86"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/old-school.git
git push -u origin main
```

### Enable GitHub Pages
1. Repository → **Settings → Pages**
2. **Source → GitHub Actions**
3. Every push to `main` auto-deploys. First deploy ~2 minutes.

---

## 5. Using the app

### As admin
1. Open the app URL → tap **⚙️**  → enter your PIN
2. **+ Upload** → add a title → choose image → **Upload & Notify**
3. Open the photo → tap **+ Marker** → tap on a face
4. Search registry for existing person or create a new entry

### Sharing with your classmates
Send everyone the app URL via WhatsApp. They:
1. Tap the link → app opens in WhatsApp browser
2. Tap the photo → gold dots appear on tagged faces
3. Tap a dot → if it's them, tap **"This is me — Edit"**
4. First time: create profile with name, email, phone, city, country, fun fact + a PIN
5. Next visit from any device: same email + PIN to edit

### Install as app (optional)
On iOS: Share → Add to Home Screen
On Android: browser menu → Install App

---

## 6. File structure

```
photo-archive/
├── .github/workflows/deploy.yml   ← auto-deploys on git push
├── public/
│   ├── dhs-crest.png              ← ⚠️ add this first
│   └── manifest.json              ← PWA config
├── src/
│   ├── config.js                  ← ⚠️ fill in your keys
│   ├── firebase.js
│   ├── utils.js
│   ├── App.jsx                    ← gallery landing page
│   ├── PhotoView.jsx              ← photo + markers + pinch zoom
│   ├── PersonModal.jsx            ← view / edit profile
│   ├── PersonSearch.jsx           ← link marker to person
│   ├── AdminUpload.jsx            ← upload photo + notify
│   └── PinModal.jsx
├── firestore.rules
├── index.html
├── package.json
└── vite.config.js                 ← ⚠️ set base to your repo name
```

---

## 7. Troubleshooting

| Issue | Fix |
|---|---|
| Blank page on GitHub Pages | Check `base` in `vite.config.js` matches repo name |
| Crest not showing | Confirm `public/dhs-crest.png` exists |
| Firebase errors | Re-publish rules in Firebase Console |
| Photos not loading | Check Storage rules are published |
| Emails not sending | Verify template has `{{to_email}}` in the To field |
| Pinch zoom not working | Ensure `react-zoom-pan-pinch` installed (`npm install`) |
