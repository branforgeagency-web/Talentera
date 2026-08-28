/**
 * Live, human-operated browser verification sessions for Stage 3
 * certification review (Staff Hub - Certification Document Audit Queue).
 *
 * WHY THIS EXISTS: AAPC's and AHIMA's real credential-verification pages
 * cannot be checked by server-side code or unattended browser automation -
 * AAPC's page is reCAPTCHA-protected specifically to block that, and
 * neither body publishes a bulk/API verification option (confirmed by
 * fetching both organizations' own employer-verification help pages,
 * 2026-08-27). So instead of faking a check (see the deleted
 * backend/utils/certVerifier.js for what that looked like and why it was
 * wrong), this opens a REAL remote browser session that a staff member
 * drives themselves - they solve the CAPTCHA and read the real result -
 * while this module gives them a head start (pre-filling what it can) and
 * captures a screenshot + page text as durable evidence once they're done.
 *
 * This intentionally never sets certStatus. The captured evidence is
 * attached to candidate.stage3 for staff to see, but the actual
 * verified/rejected decision still only happens through the existing
 * POST /verify-certification route - a human confirms it, same as before.
 *
 * Requires a Browserbase account (https://browserbase.com) - a third-party
 * remote-browser service - configured via BROWSERBASE_API_KEY (and
 * optionally BROWSERBASE_PROJECT_ID) in backend/.env. See .env.example.
 * Without it, startLiveVerifySession throws a clear, catchable error
 * rather than crashing the server; nothing else in the app depends on
 * this being configured.
 *
 * In-memory session registry: fine for a single backend instance (this
 * project runs on Render). If the backend ever scales to multiple
 * instances, a session captured on instance A won't be visible to a
 * capture/close request routed to instance B - would need a shared store
 * (Redis, etc.) at that point. Flagging rather than solving now since the
 * project isn't there yet.
 */
const logger = require("./logger");
const { ISSUING_BODIES } = require("./issuingBodies");

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const sessions = new Map(); // sessionId -> { browser, page, candidateId, createdAt }

// Best-effort selectors for the two fields AAPC/AHIMA's forms are known (per
// aapc.com's own page copy) to ask for: "Member ID" / credential number, and
// "Last Name". These are guesses at common input name/id/placeholder
// patterns, not verified against the live DOM (verifying that would require
// actually loading the page in a real browser, which this module can now
// do, but hasn't been dry-run this pass - see project memory). Failing to
// find a field is silently non-fatal: the staff member just types it in
// themselves, same as before this feature existed.
const PREFILL_TARGETS = [
  { value: "memberId", selectors: ['input[name*="member" i]', 'input[id*="member" i]', 'input[placeholder*="member" i]', 'input[placeholder*="credential" i]'] },
  { value: "lastName", selectors: ['input[name*="last" i]', 'input[id*="last" i]', 'input[placeholder*="last name" i]'] },
];

function sweepExpiredSessions() {
  const now = Date.now();
  for (const [id, entry] of sessions.entries()) {
    if (now - entry.createdAt > SESSION_TTL_MS) {
      entry.browser.close().catch(() => {});
      sessions.delete(id);
      logger.info(`[LIVE VERIFY] Session ${id} expired and was closed.`);
    }
  }
}
setInterval(sweepExpiredSessions, 60 * 1000).unref();

function loadDrivers() {
  let chromium, Browserbase;
  try {
    ({ chromium } = require("playwright-core"));
    Browserbase = require("@browserbasehq/sdk");
  } catch (err) {
    throw new Error(
      "Live verification isn't installed yet. Run `npm install` in backend/ to pull in playwright-core and @browserbasehq/sdk."
    );
  }
  return { chromium, Browserbase };
}

async function startLiveVerifySession({ candidateId, body, memberId, lastName }) {
  if (!process.env.BROWSERBASE_API_KEY) {
    throw new Error(
      "Live verification isn't configured yet. Add BROWSERBASE_API_KEY (and optionally BROWSERBASE_PROJECT_ID) to backend/.env - see .env.example for where to get one."
    );
  }

  const meta = ISSUING_BODIES[body] || ISSUING_BODIES.aapc;
  if (!meta.verifyUrl) {
    throw new Error(`No official verification page is on file for ${meta.name}.`);
  }

  const { chromium, Browserbase } = loadDrivers();
  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });

  const session = await bb.sessions.create(
    process.env.BROWSERBASE_PROJECT_ID ? { projectId: process.env.BROWSERBASE_PROJECT_ID } : {}
  );

  let browser;
  try {
    browser = await chromium.connectOverCDP(session.connectUrl);
    const context = browser.contexts()[0];
    const page = context.pages()[0] || (await context.newPage());

    await page.goto(meta.verifyUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Best-effort pre-fill - see PREFILL_TARGETS comment above. Never lets a
    // failure here block starting the session; staff can always type it in.
    const values = { memberId, lastName };
    for (const target of PREFILL_TARGETS) {
      const val = values[target.value];
      if (!val) continue;
      for (const selector of target.selectors) {
        try {
          const locator = page.locator(selector).first();
          if (await locator.count()) {
            await locator.fill(String(val), { timeout: 3000 });
            break;
          }
        } catch (err) {
          // Selector didn't match or field wasn't fillable - try the next one.
        }
      }
    }

    const debugUrls = await bb.sessions.debug(session.id);

    sessions.set(session.id, { browser, page, candidateId, createdAt: Date.now() });

    return {
      sessionId: session.id,
      liveViewUrl: debugUrls.debuggerFullscreenUrl,
      verifyUrl: meta.verifyUrl,
      issuingBodyName: meta.name,
      memberId: memberId || "",
      lastName: lastName || "",
    };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    throw err;
  }
}

async function captureLiveVerifyResult(sessionId) {
  const entry = sessions.get(sessionId);
  if (!entry) {
    throw new Error("This live verification session has ended or was not found. Start a new one.");
  }

  const { page, candidateId } = entry;
  const pageText = await page.evaluate(() => (document.body ? document.body.innerText : "")).catch(() => "");
  const screenshotBuffer = await page.screenshot({ fullPage: true });
  const currentUrl = page.url();

  return { candidateId, pageText: (pageText || "").slice(0, 4000), screenshotBuffer, currentUrl };
}

async function closeLiveVerifySession(sessionId) {
  const entry = sessions.get(sessionId);
  if (!entry) return;
  await entry.browser.close().catch(() => {});
  sessions.delete(sessionId);
}

module.exports = { startLiveVerifySession, captureLiveVerifyResult, closeLiveVerifySession };
