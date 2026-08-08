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

## Production notes

- Swap `backend/middleware/upload.js`'s disk storage for an S3/GCS
  multer-storage adapter — route logic (`req.file.filename`) won't need to
  change.
- Move `JWT_SECRET` / `MONGO_URI` to your hosting provider's secret manager.
- The rest of `DEVELOPER_HANDOFF.md` section 5 (Company portal, Academy
  portal, Admin panel, application/matching flow, DPDP privacy pages) is
  still on the roadmap — this rebuild only covers the candidate side, matching
  the original prototype's scope.
