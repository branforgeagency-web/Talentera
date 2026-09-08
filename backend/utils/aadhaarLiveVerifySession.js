/* global document */
/**
 * Live, human-operated browser verification sessions for candidate Aadhaar
 * number verification (Stage 1 - Contact & Identity).
 *
 * WHY THIS EXISTS: there is no real backend API - from UIDAI or any
 * reseller - that hands back a person's age band/gender/state (let alone a
 * mobile number) from a bare Aadhaar number without an OTP round-trip.
 * UIDAI does run one genuine, official, free tool that does this:
 * https://myaadhaar.uidai.gov.in/verifyAadhaar - but it's a human-facing,
 * CAPTCHA-gated web form with no API, meant for one-off manual checks
 * (confirmed via UIDAI's own site and third-party explainers, 2026-09-08).
 * It returns a coarse age band, gender, and state - and, per UIDAI's own
 * description of the tool, never a mobile number, masked or otherwise.
 *
 * So instead of faking a check (see git history of backend/utils/
 * aadhaarService.js for what that looked like and why it was wrong - it
 * derived "demographics" from the Aadhaar number's own digits, which is
 * meaningless since UIDAI numbers don't encode any such thing), this opens
 * a REAL remote browser session on UIDAI's own official page that the
 * candidate drives themselves - they type their own Aadhaar number and
 * solve UIDAI's real CAPTCHA, exactly as if they'd opened the page
 * directly - while this module captures a screenshot + page text once
 * they're done, and makes a best-effort attempt to read the Age Band /
 * Gender / State values back out of the rendered result text.
 *
 * The field-extraction regexes below are a best-effort guess at UIDAI's
 * result wording, not verified against the live DOM (this session's
 * outbound network access can't reach Browserbase to dry-run it - see
 * project memory). Failing to match is silently non-fatal: the candidate
 * still gets the real screenshot + text as evidence, aadhaarVerified just
 * isn't set until a match is found. If UIDAI's actual wording turns out to
 * differ, only EXTRACTION_PATTERNS below needs adjusting.
 *
 * Requires a Browserbase account (https://browserbase.com) configured via
 * BROWSERBASE_API_KEY (and optionally BROWSERBASE_PROJECT_ID) in
 * backend/.env - same account already used for Stage 3 certification live
 * verification (see utils/liveVerifySession.js). Without it,
 * startLiveVerifySession throws a clear, catchable error.
 *
 * In-memory session registry: fine for a single backend instance (this
 * project runs on Render) - see utils/liveVerifySession.js for the same
 * caveat if the backend ever scales to multiple instances.
 */
const logger = require("./logger");

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const VERIFY_URL = "https://myaadhaar.uidai.gov.in/verifyAadhaar";
const sessions = new Map(); // sessionId -> { browser, page, candidateId, createdAt }

// Best-effort selector guesses for the Aadhaar number input on UIDAI's form.
const AADHAAR_INPUT_SELECTORS = [
  'input[name*="aadhaar" i]',
  'input[id*="aadhaar" i]',
  'input[placeholder*="aadhaar" i]',
  'input[maxlength="12"]',
];

// Best-effort guesses at how UIDAI's result panel words each field. Order
// matters only in that the first capturing group of each regex is taken as
// the value - these are intentionally loose (case-insensitive, flexible
// whitespace/punctuation) since the exact markup can't be dry-run from here.
const EXTRACTION_PATTERNS = {
  ageBand: /age\s*band[:\s]*([0-9]{1,2}\s*-\s*[0-9]{1,2})/i,
  gender: /gender[:\s]*(male|female|transgender)/i,
  state: /state[:\s]*([A-Za-z][A-Za-z &]{2,40})/i,
};

// Phrases that suggest UIDAI actually rendered a positive "this Aadhaar
// number exists" result (as opposed to an error, an unfilled form, or an
// "invalid/not found" result). Deliberately conservative: aadhaarVerified
// only ever gets set when this AND at least one demographic field matched.
const POSITIVE_RESULT_HINTS = /aadhaar\s*number\s*(exists|is\s*valid|found)|verification\s*successful/i;
const NEGATIVE_RESULT_HINTS = /does\s*not\s*exist|invalid\s*aadhaar|not\s*found|no\s*record/i;

function sweepExpiredSessions() {
  const now = Date.now();
  for (const [id, entry] of sessions.entries()) {
    if (now - entry.createdAt > SESSION_TTL_MS) {
      entry.browser.close().catch(() => {});
      sessions.delete(id);
      logger.info(`[AADHAAR LIVE VERIFY] Session ${id} expired and was closed.`);
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
      "Live Aadhaar verification isn't installed yet. Run `npm install` in backend/ to pull in playwright-core and @browserbasehq/sdk."
    );
  }
  return { chromium, Browserbase };
}

async function startLiveVerifySession({ candidateId, aadhaarNumber }) {
  if (!process.env.BROWSERBASE_API_KEY) {
    throw new Error(
      "Live Aadhaar verification isn't configured yet. Add BROWSERBASE_API_KEY (and optionally BROWSERBASE_PROJECT_ID) to backend/.env."
    );
  }

  const cleanAadhaar = String(aadhaarNumber || "").replace(/\D/g, "");
  const maskedAadhaar = cleanAadhaar.length >= 4 ? `XXXX XXXX ${cleanAadhaar.slice(-4)}` : "XXXX XXXX XXXX";

  const { chromium, Browserbase } = loadDrivers();
  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });

  // UIDAI's own portal is an Indian government identity site and, like
  // most of them, appears to block or silently stall connections from
  // non-Indian / datacenter IPs rather than returning an error page - that's
  // the likely cause if page.goto below times out with no HTTP error at
  // all. Routing through a Browserbase proxy geolocated to India fixes
  // that; it requires a Browserbase Developer plan or higher (not
  // available on the free/starter tier - see
  // https://docs.browserbase.com/platform/identity/proxies). If session
  // creation is rejected because of that, we retry once without the
  // geolocation hint so accounts without proxy access still get the
  // (likely to still fail) default behavior rather than a hard crash.
  let session;
  try {
    session = await bb.sessions.create({
      ...(process.env.BROWSERBASE_PROJECT_ID ? { projectId: process.env.BROWSERBASE_PROJECT_ID } : {}),
      proxies: [{ type: "browserbase", geolocation: { country: "IN" } }],
    });
  } catch (err) {
    logger.warn(`[AADHAAR LIVE VERIFY] India-geolocated proxy request failed (${err.message}); retrying without it - UIDAI's site may still be unreachable as a result. This usually means the Browserbase account isn't on a plan that supports geolocation proxies.`);
    session = await bb.sessions.create(
      process.env.BROWSERBASE_PROJECT_ID ? { projectId: process.env.BROWSERBASE_PROJECT_ID } : {}
    );
  }

  let browser;
  try {
    browser = await chromium.connectOverCDP(session.connectUrl);
    const context = browser.contexts()[0];
    const page = context.pages()[0] || (await context.newPage());

    try {
      await page.goto(VERIFY_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    } catch (navErr) {
      throw new Error(
        "UIDAI's verification page didn't respond in time. This government site is known to block or stall connections from outside India / from datacenter IPs rather than showing an error - if this keeps happening, the Browserbase session needs an India-geolocated proxy (Developer plan or higher on Browserbase), or its own network access to uidai.gov.in may be blocked entirely."
      );
    }

    // Best-effort pre-fill so the candidate doesn't have to retype their
    // number - see AADHAAR_INPUT_SELECTORS comment above. Never lets a
    // failure here block starting the session; they can always type it in
    // themselves on the real page.
    if (cleanAadhaar.length === 12) {
      for (const selector of AADHAAR_INPUT_SELECTORS) {
        try {
          const locator = page.locator(selector).first();
          if (await locator.count()) {
            await locator.fill(cleanAadhaar, { timeout: 3000 });
            break;
          }
        } catch (err) {
          // Selector didn't match or field wasn't fillable - try the next one.
        }
      }
    }

    const debugUrls = await bb.sessions.debug(session.id);

    sessions.set(session.id, { browser, page, candidateId, maskedAadhaar, createdAt: Date.now() });

    return {
      sessionId: session.id,
      liveViewUrl: debugUrls.debuggerFullscreenUrl,
      verifyUrl: VERIFY_URL,
      maskedAadhaar,
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

  const { page, candidateId, maskedAadhaar } = entry;
  const pageText = await page.evaluate(() => (document.body ? document.body.innerText : "")).catch(() => "");
  const screenshotBuffer = await page.screenshot({ fullPage: true });
  const currentUrl = page.url();

  const text = pageText || "";
  const extracted = {};
  for (const [field, pattern] of Object.entries(EXTRACTION_PATTERNS)) {
    const match = text.match(pattern);
    if (match && match[1]) {
      extracted[field] = match[1].trim();
    }
  }

  const hasNegativeHint = NEGATIVE_RESULT_HINTS.test(text);
  const hasPositiveHint = POSITIVE_RESULT_HINTS.test(text);
  const fieldsFound = Object.keys(extracted).length;
  // Conservative: only call it confirmed when we're not seeing an explicit
  // "invalid/not found" phrase AND we actually matched at least one real
  // demographic field (a page that only has generic UI chrome text but no
  // "Age Band"/"Gender"/"State" values shouldn't count as a positive result).
  const confirmed = !hasNegativeHint && (hasPositiveHint || fieldsFound > 0) && fieldsFound > 0;

  return {
    candidateId,
    maskedAadhaar,
    pageText: text.slice(0, 4000),
    screenshotBuffer,
    currentUrl,
    extracted,
    confirmed,
  };
}

async function closeLiveVerifySession(sessionId) {
  const entry = sessions.get(sessionId);
  if (!entry) return;
  await entry.browser.close().catch(() => {});
  sessions.delete(sessionId);
}

module.exports = { startLiveVerifySession, captureLiveVerifyResult, closeLiveVerifySession, VERIFY_URL };
