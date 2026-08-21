# Talentera: What to Fix and What to Build Next

*Codebase review — August 21, 2026. Covers `backend` (Express/Mongoose) and `frontend` (React/Vite) across all four portals: candidate, company, academy, staff.*

This picks up from the security audit and AI-interview work done earlier this week — those items are folded in below rather than repeated separately, and marked accordingly.

## How to read this

Four sections, roughly in the order to tackle them: fix-now security and correctness bugs, then missing features by portal, then engineering foundations (the stuff with no user-facing surface but that everything else depends on), then a suggested sequence. Every item names the file it lives in.

---

## 1. Fix now — security and correctness

These aren't "nice to have" — a couple are live bugs already shipping to production.

**CORS accepts every origin, silently.** `backend/server.js` builds an `allowedOrigins` whitelist and checks `allowedOrigins.includes(origin)` — but the callback below it is hardcoded to `callback(null, true)` no matter what the check returned. Combined with `credentials: true`, every origin is currently allowed; the whitelist is dead code. Given the two recent commits titled "changes in cors," this looks like an in-progress fix that didn't land. The one-line correction: return `callback(new Error("Not allowed by CORS"))` on the non-matching branch instead of `true`.

**Candidates have no working `/login` page.** `frontend/src/App.jsx` routes `/login` to `StaffLogin.jsx`. The actual candidate login page, `Login.jsx`, is imported but never mounted on any route — a candidate can only reach it through Register's "Log in" tab. Anyone who types `talentera.in/login` expecting to sign in as a candidate lands on the staff portal instead. This has been sitting in the README as a known quirk; worth just fixing — mount `Login.jsx` at `/login` and move `StaffLogin` fully under `/staff/login` (it's already duplicated there).

**Candidates can't reset a forgotten password.** `companyAuth.js` has a full OTP-based `forgot-password` / `reset-password` pair; `auth.js` (candidate) has neither. Any candidate who forgets their password is stuck — this is likely already generating support requests.

**OTP codes are written to server logs.** `backend/routes/otp.js` logs the literal OTP value (`console.log([BREVO OTP CODE]: ${generatedOtp})`) in both the failure-fallback path and a permanent dev-log line that isn't gated behind `NODE_ENV`. Anyone with log access (hosting dashboard, log aggregator, a misconfigured public logging endpoint) can read live OTP codes and take over any account mid-login. Gate this behind `NODE_ENV !== "production"` at minimum; better, drop it entirely and rely on the email/SMS delivery.

**No rate limiting anywhere.** Login, OTP request/verify, and password-reset endpoints have no throttling (`express-rate-limit` isn't even a dependency). All of them are brute-forceable today. This was flagged in the security audit two days ago and is still open — worth prioritizing given the OTP-logging issue above compounds it.

**Uploads aren't type-checked.** `backend/middleware/upload.js` enforces a 50MB size cap but no MIME-type or extension allowlist — a candidate "resume" or "video" upload can be any file type. Add a `fileFilter` in the multer config restricting to the expected types per field (PDF/DOCX for resumes, WebM/MP4 for interview recordings, images for photos).

**No security headers.** `helmet` isn't installed or used in `server.js`. Fifteen minutes of work (`app.use(helmet())`) closes a batch of low-effort issues (clickjacking, MIME-sniffing, missing CSP baseline) for free.

**Aadhaar numbers: no visible encryption-at-rest.** `backend/utils/aadhaarService.js` and `routes/aadhaar.js` process and presumably store Aadhaar data with no encryption calls beyond generating a random transaction ID. Given the Aadhaar Act and DPDP Act both impose specific handling obligations, this deserves a dedicated pass — encrypt the field at the Mongoose-schema level (e.g., `mongoose-encryption` or manual AES-256 in a pre-save hook) and write down a retention/deletion policy.

*(Carried over from the prior audit, still unfixed: 30-day JWTs with no rotation/revocation on logout, and no documented `.env.example` — both READMEs reference one that doesn't exist in the repo, so a new environment setup means grepping `.env` by hand.)*

---

## 2. Missing features, by portal

### Candidate side
- **No job search or filtering.** `Jobs.jsx` renders whatever the API returns with no keyword, location, or category filter — despite the landing page's own copy promising companies can "filter by score, location, domain," candidates browsing jobs get no equivalent. Given the RCM/medical-billing niche, filters by domain (billing, coding, AR, claims) and experience level would directly help match quality.
- **No application-status notifications.** The `Notification` model exists and is written to from `company.js`/`staff.js`, but there's no email touchpoint for candidates ("your application moved to interview," "you were shortlisted") — Brevo is wired for OTP only. This is exactly the kind of silent-funnel problem that quietly kills conversion; candidates who don't check the dashboard daily just churn.
- **Dead code left from an earlier interview design.** `backend/utils/aiInterviewConversation.js` is unused since the question-bank rework — flagged before, still on disk since this tool can't delete files on your machine. Worth a manual delete next time you're in the repo.

### Company side
- **No plans, seats, or billing.** There's no subscription, usage cap, or payment integration anywhere in the codebase — every "billing"/"payment" string that turns up in a search is RCM domain vocabulary (job categories), not a monetization feature. If the business model depends on company accounts eventually paying, that's currently entirely unbuilt: no Razorpay/Stripe integration, no plan tiers, no seat limits on staff users per company.
- **No candidate search across the applicant pool.** `CompanyApplicants.jsx` and `company.js` return applicants scoped to a company's own jobs with no scoring/skill/location search — for a platform whose pitch is "pre-verified talent," letting companies search the broader verified pool (with appropriate gating) is a natural growth feature, not just a per-job applicant list.

### Staff / admin side
- **"Reports & Metrics" tab has no charts.** `StaffHub.jsx` has a dedicated reports tab, but there's no charting library in `frontend/package.json` (no Recharts, Chart.js, or D3) — metrics are presumably rendered as raw numbers. Given this is the ops team's main visibility into pipeline health, even a lightweight sparkline/bar setup here would pay for itself quickly.
- **No audit trail on staff actions.** Staff can edit interview questions, override scores, and move candidates through stages, but nothing logs *who* changed *what* and *when* — worth a simple `AuditLog` model if more than one staff member has write access, both for accountability and for debugging "why did this candidate's score change."

### Academy portal
- Lighter footprint than the others in this review; worth a closer look in a follow-up pass once the above is triaged — flag if you want that done next.

---

## 3. Engineering foundations

None of these are visible to an end user, but they're the reason each of the fixes above will be slow and risky to make without them.

- **Zero automated tests, no CI.** No test framework in either `package.json`, no `.github/workflows`. Every change — including the fixes in this document — is currently verified by hand. Given four portals and shared logic (`aiAssessment.js`, `msg91Widget.js`) that many routes depend on, even a thin layer of tests around scoring logic and auth would catch regressions the manual QA misses.
- **No lint or format config.** No `.eslintrc`, no Prettier config, in a codebase edited by more than one person concurrently (per the earlier audit's note that another developer works on this repo in parallel). This is the cheapest investment on this whole list — a shared ESLint + Prettier setup takes under an hour and immediately reduces merge-conflict noise and style drift between contributors.
- **No structured logging.** Every route uses raw `console.log`/`console.error`. That's fine locally, but in production there's no way to search, filter by severity, or alert on errors without a log aggregation service reading unstructured text. A lightweight `winston` or `pino` setup with log levels would also make it natural to *remove* the OTP-logging problem above rather than just hiding it.
- **No error monitoring.** Nothing like Sentry is wired in — the only record of a production crash is whatever's in the hosting provider's console log, if it's even retained. Given `server.js`'s central error handler already funnels every error through one function, adding a Sentry/error-tracker call there is a small, high-leverage change.
- **Almost no database indexes.** Across every model, there's exactly one index (`Application`'s compound `candidateId`+`jobId`). Fields queried constantly — candidate email lookups on login, job status filters, company approval state — have no index, which will show up as slow queries as the candidate/application tables grow past a few thousand rows. Worth an index-planning pass now, before it's a production incident.
- **No pagination on list endpoints.** `academy.js`, `company.js`, and `staff.js` mostly hardcode `.limit(30)` or `.limit(50)` with no `skip`/page parameter — once any of these collections pass that count, users silently stop seeing the tail of the list with no indication more exists.
- **Stale documentation.** The root `README.md` still describes the company, academy, and admin portals as "still on the roadmap" — they're built and in the routes today. A five-minute pass to bring this in line with reality will save the next person (or the next Claude session) from re-discovering what's actually shipped.
- **No SEO surface on the marketing site.** `frontend/index.html` has a title and favicon but no meta description, Open Graph tags, `robots.txt`, or sitemap — for a page whose whole job is candidate/company acquisition via search and social shares, this is currently invisible to both.

---

## 4. Suggested sequence

**This week:** the CORS bug, the OTP-in-logs issue, and rate limiting on auth endpoints — these three combined are the actual account-takeover risk surface right now. The `/login` routing fix and candidate forgot-password flow are both small and high-visibility; bundle them together.

**Next couple of weeks:** ESLint/Prettier setup (low cost, immediate payoff on a multi-developer repo), upload type-checking, helmet, database indexes, and candidate job search/filtering — this last one is the most impactful pure-feature addition for the money since it directly affects conversion on the core candidate flow.

**Before the next scale-up:** pagination across list endpoints, structured logging plus an error monitor, and a first pass at automated tests around the scoring/auth logic specifically (highest blast-radius code, per the audit history of bugs already found there).

**When the business model needs it:** the billing/plans/subscription system for company accounts — currently a from-scratch build, so worth scoping deliberately (Stripe vs. Razorpay given the India focus, seat-based vs. usage-based) rather than bolting on ad hoc.

---

*Everything above was found by reading the current code directly (`backend/routes`, `backend/models`, `backend/middleware`, `frontend/src/App.jsx`, `server.js`, `package.json` in both halves, and the two READMEs) on 2026-08-21, cross-checked against the security audit and AI-interview fix notes from the prior two sessions. No live browser testing was done this pass — the routing and CORS findings are static-analysis-certain; the UX gaps (search, notifications, charts) are inferred from what the code does and doesn't call, and worth a quick click-through to confirm before treating them as final.*
