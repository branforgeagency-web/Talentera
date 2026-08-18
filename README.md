# Talentera — MERN Rebuild

This is a MERN-stack (MongoDB, Express, React, Node) rebuild of the candidate
portal originally prototyped as a single Firebase-backed `index.html`. It
follows the architecture recommended in `DEVELOPER_HANDOFF.md` section 6.

## What's here

```
talentera-mern/
├── backend/            Express API + MongoDB models (replaces Firebase Auth/Firestore/Storage)
│   ├── config/db.js        Mongo connection
│   ├── models/Candidate.js Mirrors the original candidates/{uid} Firestore shape
│   ├── middleware/auth.js  JWT auth (replaces Firebase Auth sessions)
│   ├── middleware/upload.js Multer local disk storage (replaces Firebase Storage)
│   ├── routes/auth.js      register / login / me
│   ├── routes/candidate.js profile, stage save/skip, video upload, resume data
│   └── server.js
└── frontend/           React (Vite) app
    ├── src/pages/Landing.jsx         marketing page
    ├── src/pages/Login.jsx / Register.jsx
    ├── src/pages/Dashboard.jsx       8-stage verification journey
    ├── src/pages/ResumeBuilder.jsx   3 resume templates + PDF export (print)
    ├── src/data/stageConfig.js       field definitions per stage (source of truth)
    └── src/context/AuthContext.jsx   session handling (JWT in localStorage)
```

## What was ported vs. rebuilt

- **Data model, auth flow, 8-stage pipeline, skip-stage system, verification
  scoring (5/15/20/25/10/10/10/5 → 100, 75+ = gold badge), and the
  "generate-not-upload" resume rule** are ported 1:1 from the Firebase
  prototype and `DEVELOPER_HANDOFF.md`.
- **The marketing landing page** was rebuilt as a clean, on-brand page using
  the same copy, colors (Navy `#0A1F3D`, Gold `#E5A82E`, Cream `#FAF7F0`) and
  fonts (Bricolage Grotesque / Space Grotesk / Manrope) — but without
  hand-porting the original's decorative animation CSS (floating cards,
  particles, orbs). Restyle `src/pages/Landing.jsx` freely; it's plain React
  + CSS, no framework lock-in.
- **Stage 2/3/4/6 field names** were not fully specified in the handoff doc
  ("...training fields...", "...certification..."). Reasonable field sets are
  defined in `frontend/src/data/stageConfig.js` — confirm with the founder
  before shipping, per handoff doc section 5 ("Field-mapping cleanup").
- **Aadhaar/UIDAI verification, the real proctored assessment engine, and
  live-chart mechanics** remain unbuilt, same as the original prototype
  (handoff doc section 5). Stage 4 and Stage 6 forms currently just record
  self-reported values — swap in real integrations behind the same
  `PUT /api/candidate/stage/:n` contract.

## Local setup

### 1. MongoDB
Use MongoDB Atlas (recommended, matches "Region: asia-south1" intent — pick
the closest Atlas region, e.g. Mumbai) or run MongoDB locally.

### 2. Backend
```bash
cd backend
cp .env.example .env
# fill in MONGO_URI and a real JWT_SECRET in .env
npm install
npm run dev        # nodemon, http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev         # http://localhost:5173, proxies /api to :5000
```

Register a candidate at `/register`, complete stages, then open `/resume`.

## Login OTP (MSG91 Widget)

Every login flow (Candidate, Company, Staff, Academy Partner) now requires
a second-factor OTP after the initial credentials step, delivered via the
[MSG91 OTP Widget](https://docs.msg91.com/otp-widget). The widget itself
(loaded client-side) generates, sends (SMS/email/WhatsApp - whichever
channel the person picks) and does first-pass verification of the code; it
then hands the frontend a signed access-token, which
`backend/utils/msg91Widget.js` re-verifies server-side via MSG91's
`verifyAccessToken` API before a session is issued. See that file and
`frontend/src/utils/msg91Widget.js` for the shared implementation.

Setup:
1. In the MSG91 dashboard, create (or reuse) a widget under **Widgets** and
   note its **Widget ID** and **tokenAuth** from the embed snippet.
2. Add those two values to `frontend/.env` as `VITE_MSG91_WIDGET_ID` and
   `VITE_MSG91_TOKEN_AUTH` (see `frontend/.env.example`).
3. Add your account **authkey** (Settings -> Security -> Authkey) to
   `backend/.env` as `MSG91_AUTHKEY` (see `backend/.env.example`). This one
   is server-only - never put it in frontend code or commit it.
4. If MSG91's IP Security is enabled on your account, whitelist the
   backend server's public IP (or disable IP security while developing).
5. `npm install` in `backend/` to pick up the new `axios` dependency.

Notes:
- The widget sends to one identifier (mobile or email) per login attempt -
  the person picks the channel in the widget's own popup; it isn't
  simultaneous dual-channel delivery.
- Candidate accounts collect an optional `mobile` at signup
  (`frontend/src/pages/Register.jsx`) so SMS is available as a channel;
  Company accounts already required one at registration. Staff and
  Academy logins let the widget capture the identifier directly.
- Company login previously had a backend endpoint
  (`/api/company/auth/login`) with no frontend page calling it - this pass
  adds `frontend/src/pages/CompanyLogin.jsx` (route: `/companies/login`) as
  that missing entry point.
- `frontend/src/pages/Login.jsx` (candidate login) exists but isn't wired
  into any route in `App.jsx` - only `Register.jsx`'s "Log in" tab and
  `/login` -> `StaffLogin.jsx` are reachable. Pre-existing routing quirk,
  left as-is since fixing it wasn't part of this change.

## Production notes

- Swap `backend/middleware/upload.js`'s disk storage for an S3/GCS
  multer-storage adapter — route logic (`req.file.filename`) won't need to
  change.
- Move `JWT_SECRET` / `MONGO_URI` to your hosting provider's secret manager.
- The rest of `DEVELOPER_HANDOFF.md` section 5 (Company portal, Academy
  portal, Admin panel, application/matching flow, DPDP privacy pages) is
  still on the roadmap — this rebuild only covers the candidate side, matching
  the original prototype's scope.
