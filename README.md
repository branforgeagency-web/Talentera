# Talentera — MERN Talent Verification Platform

A MERN-stack (MongoDB, Express, React, Node) platform that verifies
Healthcare RCM / medical coding / medical billing candidates through an
8-stage identity, skills, and interview pipeline, then connects verified
candidates with hiring employers. Started as a rebuild of a
Firebase-backed prototype (see `DEVELOPER_HANDOFF.md` for the original
spec) and has since grown well past the candidate-only scope that
implies.

> This file was out of date for a while - it described the company,
> academy, and admin portals as "still on the roadmap" when they were
> already built. Corrected below as of the Aug 2026 engineering pass; see
> `IMPROVEMENT_ROADMAP.md` for the fuller audit this correction came out of.

## What's here

Four portals, all live:

```
Talentera/
├── backend/                 Express API + MongoDB models
│   ├── config/               Mongo connection, Cloudinary, plan catalog
│   ├── middleware/            JWT auth, upload handling, rate limiting
│   ├── models/                 Candidate, Company, Academy, Staff, Job,
│   │                            Application, Notification, InterviewQuestion,
│   │                            AuditLog
│   ├── routes/                 auth, candidate, company(+auth), academy,
│   │                            staff, public, otp, aadhaar
│   ├── utils/                   logger, email, password reset, encryption,
│   │                            AI assessment scoring, Aadhaar/eKYC, MSG91
│   ├── tests/                   Jest unit tests
│   └── server.js
└── frontend/                 React (Vite) app
    ├── src/pages/               Landing, Login/Register/ForgotPassword,
    │                            candidate Dashboard/Wizard, Jobs, Resume
    │                            Builder, Company portal + onboarding,
    │                            Academy portal, Staff Hub
    ├── src/components/          AI video/audio interview components,
    │                            wizard stage forms, shared UI
    ├── src/context/              AuthContext (candidate), CompanyAuthContext
    └── src/data/                  Stage/field config (source of truth for
                                    onboarding forms)
```

- **Candidate portal** (`/dashboard`) — the original 8-stage identity,
  training, certification, assessment, AI video/audio interview, live
  charts, resume, and employment-tracking pipeline. Verification scoring
  (5/15/20/25/10/10/10/5 → 100, 75+ = gold badge) is ported from the
  original Firebase prototype.
- **Company portal** (`/companies/*`) — 9-stage employer onboarding + KYC,
  job posting, applicant ATS with contact-masking until KYC verification,
  candidate directory search.
- **Academy portal** (`/academy/*`) — training-partner dashboards, bulk
  student roster upload, placement tracking.
- **Staff Operations Hub** (`/staff/*`) — verification queues (candidate,
  company KYC, video interviews, text assessments), the interview
  question bank (staff write the exact questions and correct answers the
  AI asks candidates), reports, and an audit log of staff actions.

## Local setup

### 1. MongoDB

Use MongoDB Atlas (recommended) or run MongoDB locally.

### 2. Backend

```bash
cd backend
cp .env.example .env
# fill in MONGO_URI and a real JWT_SECRET (server refuses to start without
# JWT_SECRET - see backend/middleware/auth.js)
npm install
npm run dev        # nodemon, http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev         # http://localhost:5173, proxies /api to :5000
```

Register a candidate at `/register`, complete stages, then open `/resume`.

### 4. Linting, formatting, and tests

Both `backend/` and `frontend/` have ESLint + Prettier configured, and a
starter test suite (Jest for the backend, Vitest for the frontend):

```bash
npm run lint        # in backend/ or frontend/
npm run format
npm test
```

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint + tests
(+ a production build for the frontend) on every push/PR to `main`.

## Login OTP (MSG91 Widget)

Every login flow (Candidate, Company, Staff, Academy Partner) requires a
second-factor OTP after the initial credentials step, delivered via the
[MSG91 OTP Widget](https://docs.msg91.com/otp-widget). The widget itself
(loaded client-side) generates, sends (SMS/email/WhatsApp — whichever
channel the person picks) and does first-pass verification of the code; it
then hands the frontend a signed access-token, which
`backend/utils/msg91Widget.js` re-verifies server-side via MSG91's
`verifyAccessToken` API before a session is issued.

Setup:
1. In the MSG91 dashboard, create (or reuse) a widget under **Widgets** and
   note its **Widget ID** and **tokenAuth** from the embed snippet.
2. Add those two values to `frontend/.env` as `VITE_MSG91_WIDGET_ID` and
   `VITE_MSG91_TOKEN_AUTH` (see `frontend/.env.example`).
3. Add your account **authkey** (Settings → Security → Authkey) to
   `backend/.env` as `MSG91_AUTHKEY` (see `backend/.env.example`). This one
   is server-only — never put it in frontend code or commit it.
4. If MSG91's IP Security is enabled on your account, whitelist the
   backend server's public IP (or disable IP security while developing).

Candidates and companies can also reset a forgotten password directly
(`/forgot-password`, or `/forgot-password?type=company`) via a one-time
email code — see `backend/utils/passwordReset.js`.

## Transactional email (Brevo)

`backend/utils/email.js` is the shared sender used for OTP codes, password
reset codes, and candidate application-lifecycle emails (application
received, status changed). Set `BREVO_API_KEY` in `backend/.env`; without
it, emails are logged instead of sent so local dev keeps working.

## Company plans (billing scaffolding)

`backend/config/plans.js` defines a small static plan catalog (`free`,
`growth`, `enterprise`) that gates how many active job posts a company can
have and whether they can search the full verified-candidate pool. Staff
assign a company's plan from the Staff Hub (`POST
/api/staff/companies/:id/assign-plan`). **No payment gateway is wired up
yet** — this is data-model and gating scaffolding only, ready for a real
checkout flow (Razorpay is the natural fit given the India focus) to be
added later without touching the gating logic.

## Security notes

- Rate limiting (`backend/middleware/rateLimit.js`) is applied to every
  login, registration, OTP, and password-reset endpoint.
- `helmet` is applied globally in `server.js`; CORS enforces the
  `CLIENT_ORIGINS` allowlist (plus any `*.vercel.app` origin).
- Uploads are restricted by MIME type per field
  (`backend/middleware/upload.js`), on top of the existing size cap.
- OTP codes are never logged in production (`NODE_ENV=production`).
- See `IMPROVEMENT_ROADMAP.md` for the full audit history and what's still
  open (JWT rotation/revocation, Aadhaar-adjacent PII field encryption,
  broader test coverage, etc).

## Production notes

- Swap `backend/middleware/upload.js`'s disk-storage fallback for Cloudinary
  (already wired — set the `CLOUDINARY_*` env vars) or another S3/GCS
  adapter for anything beyond a single-instance deploy.
- Move `JWT_SECRET` / `MONGO_URI` / `ENCRYPTION_KEY` to your hosting
  provider's secret manager rather than a checked-in `.env`.
- `DEVELOPER_HANDOFF.md`'s original "still on the roadmap" list (company
  portal, academy portal, admin panel, application/matching flow) is done;
  what's actually still open is tracked in `IMPROVEMENT_ROADMAP.md`.
