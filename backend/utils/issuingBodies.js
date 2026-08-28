/**
 * Minimal registry of certifying-body metadata used to point staff (and,
 * on the frontend, candidates) at the REAL official verification page for
 * a credential. Deliberately contains no verification logic of its own -
 * see git history / project memory "talentera_certification_verification"
 * for why a prior version of this file (backend/utils/certVerifier.js,
 * deleted 2026-08-27) that tried to auto-verify and auto-generate a
 * "confirmed" certificate PDF was a fabrication bug, not a real check.
 *
 * URLs below were confirmed live (not 404) by fetching them directly on
 * 2026-08-27 - AAPC's and AHIMA's previously-hardcoded verify URLs were
 * both dead links. AAPC's real page is reCAPTCHA-protected, so it can
 * only be completed by a human (see routes/staff.js live-verify routes +
 * utils/liveVerifySession.js, which open it in a real, human-operated
 * browser session rather than trying to submit it programmatically).
 */
const ISSUING_BODIES = {
  aapc: {
    name: "AAPC",
    fullName: "American Academy of Professional Coders",
    verifyUrl: "https://www.aapc.com/certification/credential-verification.aspx",
  },
  ahima: {
    name: "AHIMA",
    fullName: "American Health Information Management Association",
    verifyUrl: "https://my.ahima.org/credential-verification",
  },
  himaa: {
    name: "HIMAA",
    fullName: "Health Information Management Association of Australia",
    verifyUrl: "https://www.himaa.org.au/",
  },
  specialty: {
    name: "Specialty Board",
    fullName: "Specialty & Healthcare Certification Board",
    verifyUrl: null,
  },
};

module.exports = { ISSUING_BODIES };
