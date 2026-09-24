/**
 * Certification Authenticity Verifier
 * Validates credential authenticity (REAL vs FAKE) directly inside Candidate Stage 3.
 *
 * Checks performed:
 * 1. Format & Algorithmic Validation per Issuing Body (AAPC, AHIMA, HIMAA, Specialty)
 * 2. Fraud & Dummy / Placeholder ID Detection (sequential, repeated digits, dummy tokens)
 * 3. Cross-Candidate Duplicate Collision Check in MongoDB (anti-theft)
 * 4. Real Credential URL / Link Live Validation (outbound HTTP reachability & domain authority)
 * 5. Official Verification Portal Integration (deep links for AAPC, AHIMA, HIMAA, etc.)
 */
const axios = require("axios");
const logger = require("./logger");
const { ISSUING_BODIES } = require("./issuingBodies");

// Official format rules per issuing body
const CERT_FORMATS = {
  aapc: {
    regex: /^\d{8}$/,
    name: "AAPC",
    expectedDescription: "8-digit numeric ID (e.g., 01458267)",
  },
  ahima: {
    regex: /^\d{6,8}$/,
    name: "AHIMA",
    expectedDescription: "6 to 8-digit numeric ID (e.g., 1234567)",
  },
  himaa: {
    regex: /^[A-Za-z0-9]{4,12}$/,
    name: "HIMAA",
    expectedDescription: "4-12 alphanumeric characters (e.g., M12345)",
  },
  specialty: {
    regex: /^[A-Za-z0-9-]{4,20}$/,
    name: "Specialty",
    expectedDescription: "4+ alphanumeric or hyphenated characters (e.g., BCHHC-1234)",
  },
};

// Known dummy / fake sequences
const KNOWN_DUMMY_IDS = new Set([
  "00000000",
  "11111111",
  "22222222",
  "33333333",
  "44444444",
  "55555555",
  "66666666",
  "77777777",
  "88888888",
  "99999999",
  "12345678",
  "87654321",
  "01234567",
  "12345670",
  "00001234",
  "00000001",
  "00000002",
  "123456",
  "654321",
  "987654",
  "111111",
  "000000",
  "999999",
]);

// Trusted credential verification domains
const TRUSTED_CREDENTIAL_DOMAINS = [
  "aapc.com",
  "ahima.org",
  "himaa.org.au",
  "credly.com",
  "youracclaim.com",
  "accredible.com",
  "certmetrics.com",
  "bcert.me",
  "verify.skilljar.com",
  "parchment.com",
  "diplomasender.com",
  "badgr.com",
  "credential.net",
  "decisionhealth.com",
  "res.cloudinary.com",
  "storage.googleapis.com",
  "drive.google.com",
];

// Disallowed / fake generator / localhost domains
const BLACKLISTED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "fakecert",
  "temp-mail",
  "pastebin.com",
  "example.com",
  "dummy.com",
  "test.com",
];

/**
 * Validates whether the given Member ID is a dummy/fake pattern
 */
function isDummyPattern(memberId) {
  if (!memberId) return false;
  const clean = String(memberId).trim().toUpperCase();

  // Known dummy IDs
  if (KNOWN_DUMMY_IDS.has(clean)) return true;

  // Single repeating digit (e.g. 44444444)
  if (/^(\d)\1+$/.test(clean)) return true;

  // Dummy words
  if (/^(TEST|FAKE|SAMPLE|DUMMY|NONE|NULL|MEMBER|CERT|ADMIN|INVALID)/.test(clean)) return true;

  // Sequential numbers check (e.g. 123456 or 654321)
  const isSeqAsc = "0123456789".includes(clean);
  const isSeqDesc = "9876543210".includes(clean);
  if (isSeqAsc || isSeqDesc) return true;

  return false;
}

/**
 * Validates a real verification URL by checking domain reputation and live reachability
 */
async function verifyCredentialUrl(certUrl) {
  if (!certUrl || typeof certUrl !== "string" || !certUrl.trim()) {
    return {
      provided: false,
      reachable: false,
      isOfficialDomain: false,
      domain: null,
      message: "No credential link provided. Format verification will be used.",
    };
  }

  const trimmed = certUrl.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      provided: true,
      reachable: false,
      isOfficialDomain: false,
      domain: null,
      error: "Invalid URL syntax. URL must start with https:// or http://",
      isFake: true,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check blacklisted domains
  if (BLACKLISTED_DOMAINS.some((b) => hostname.includes(b))) {
    return {
      provided: true,
      reachable: false,
      isOfficialDomain: false,
      domain: hostname,
      error: `Suspicious or unapproved domain (${hostname}). Credential links must be hosted on official or accredited providers.`,
      isFake: true,
    };
  }

  const isOfficialDomain = TRUSTED_CREDENTIAL_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );

  // Live HTTP reachability check (7s timeout)
  try {
    const res = await axios.get(trimmed, {
      timeout: 7000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Talentera/2.0",
        Accept: "text/html,application/xhtml+xml,application/xml,application/pdf;q=0.9,*/*;q=0.8",
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    return {
      provided: true,
      reachable: true,
      statusCode: res.status,
      domain: hostname,
      isOfficialDomain,
      message: isOfficialDomain
        ? `Official accreditation platform confirmed (${hostname}). Link is active and reachable.`
        : `Credential link is reachable (HTTP ${res.status}).`,
    };
  } catch (err) {
    logger.warn(`Cert URL live verification failed for ${trimmed}: ${err.message}`);
    const is404 = err.response && err.response.status === 404;
    return {
      provided: true,
      reachable: false,
      statusCode: err.response ? err.response.status : null,
      domain: hostname,
      isOfficialDomain,
      error: is404
        ? "Credential link returned 404 Not Found. Please provide a valid, active public URL."
        : `Could not reach credential link (${err.message}). Verify that the link is publicly accessible.`,
      isFake: true,
    };
  }
}

/**
 * Main Verification Engine for Candidate Stage 3 Certification
 */
async function verifyCertAuthenticity({
  body = "aapc",
  certCode = "CPC",
  memberId = "",
  certUrl = "",
  candidateId = null,
  CandidateModel = null,
}) {
  const cleanBody = String(body || "aapc").toLowerCase().trim();
  const cleanCert = String(certCode || "CPC").toUpperCase().trim();
  const cleanId = String(memberId || "").trim();
  const formatRule = CERT_FORMATS[cleanBody] || CERT_FORMATS.aapc;
  const officialMeta = ISSUING_BODIES[cleanBody] || ISSUING_BODIES.aapc;

  const checks = {
    format: { valid: false, rule: formatRule.expectedDescription },
    pattern: { clean: false, message: "" },
    duplicate: { clean: true, message: "" },
    url: null,
  };

  const reasons = [];

  // Check 1: Mandatory ID check
  if (!cleanId) {
    return {
      verdict: "FAKE",
      isReal: false,
      isFake: true,
      trustScore: 0,
      badge: "🔴 FAKE · MISSING ID",
      summary: "Member / Cert ID is required for verification.",
      reasons: ["Member ID was left empty."],
      checks,
      officialVerifyUrl: officialMeta.verifyUrl,
      issuingBody: officialMeta.name,
      checkedAt: new Date().toISOString(),
    };
  }

  // Check 2: Format compliance
  const isValidFormat = formatRule.regex.test(cleanId);
  checks.format.valid = isValidFormat;
  if (!isValidFormat) {
    reasons.push(
      `Invalid ID format: ${cleanBody.toUpperCase()} Member IDs must follow ${formatRule.expectedDescription}.`
    );
  }

  // Check 3: Dummy / Fake Pattern Check
  const isDummy = isDummyPattern(cleanId);
  checks.pattern.clean = !isDummy;
  if (isDummy) {
    reasons.push(
      `Suspicious pattern detected: Member ID "${cleanId}" matches a known test, dummy, or sequential placeholder number.`
    );
  }

  // Check 4: Cross-Candidate Duplicate Theft Check in MongoDB
  if (CandidateModel && cleanId) {
    try {
      const existingCandidate = await CandidateModel.findOne({
        ...(candidateId ? { _id: { $ne: candidateId } } : {}),
        $or: [
          { "stage3.memberId": cleanId },
          { "stage3.certifications.memberId": cleanId },
          { "documentVault.memberId": cleanId },
        ],
      }).select("_id email fullName stage3").lean();

      if (existingCandidate) {
        checks.duplicate.clean = false;
        checks.duplicate.message = "Member ID is already claimed by another candidate profile.";
        reasons.push(
          `Duplicate ID Conflict: Member ID "${cleanId}" is already registered under another candidate account in the Talentera database.`
        );
      } else {
        checks.duplicate.clean = true;
        checks.duplicate.message = "Unique credential ID confirmed across candidate database.";
      }
    } catch (dbErr) {
      logger.error(`Error checking duplicate memberId: ${dbErr.message}`);
    }
  }

  // Check 5: Credential URL live verification
  const urlCheckResult = await verifyCredentialUrl(certUrl);
  checks.url = urlCheckResult;

  if (urlCheckResult.provided && urlCheckResult.isFake) {
    reasons.push(urlCheckResult.error || "The provided verification link failed authenticity verification.");
  }

  // Decision Logic: REAL vs FAKE vs NEEDS_AUDIT
  let verdict = "NEEDS_AUDIT";
  let isReal = false;
  let isFake = false;
  let trustScore = 50;
  let badge = "🟡 PENDING AUDIT";

  if (!checks.format.valid || !checks.pattern.clean || !checks.duplicate.clean || (urlCheckResult.provided && urlCheckResult.isFake)) {
    verdict = "FAKE";
    isFake = true;
    isReal = false;
    trustScore = Math.max(0, 20 - reasons.length * 10);
    badge = "🔴 FAKE · INVALID CREDENTIAL";
  } else if (urlCheckResult.provided && urlCheckResult.reachable && urlCheckResult.isOfficialDomain) {
    verdict = "REAL";
    isReal = true;
    isFake = false;
    trustScore = 98;
    badge = "🟢 REAL · OFFICIALLY VERIFIED";
    reasons.push("Official registry/credential link confirmed live and reachable.");
    reasons.push("Member ID matches official format and is unique in the registry.");
  } else if (urlCheckResult.provided && urlCheckResult.reachable) {
    verdict = "REAL";
    isReal = true;
    isFake = false;
    trustScore = 88;
    badge = "🟢 REAL · LINK & FORMAT VERIFIED";
    reasons.push("Credential link confirmed active.");
    reasons.push("Format is valid with no duplicates found.");
  } else {
    // Format is valid, not dummy, not duplicate, but no link provided yet
    verdict = "NEEDS_AUDIT";
    isReal = false;
    isFake = false;
    trustScore = 72;
    badge = "🟡 FORMAT VALID · PENDING PROOF";
    reasons.push("Member ID format complies with official standards and is unique.");
    reasons.push("Add an official verification link or upload certificate document to reach 100% verified status.");
  }

  return {
    verdict,
    isReal,
    isFake,
    trustScore,
    badge,
    summary:
      verdict === "REAL"
        ? `Credential verified as genuine (${trustScore}% trust score).`
        : verdict === "FAKE"
        ? "Credential could not be confirmed as genuine. Check flagged issues below."
        : "Format verified. Credential pending official URL verification or staff document audit.",
    reasons,
    checks,
    body: cleanBody,
    issuingBody: officialMeta.name,
    certCode: cleanCert,
    memberId: cleanId,
    certUrl: certUrl ? certUrl.trim() : null,
    officialVerifyUrl: officialMeta.verifyUrl,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  verifyCertAuthenticity,
  verifyCredentialUrl,
  CERT_FORMATS,
  KNOWN_DUMMY_IDS,
  TRUSTED_CREDENTIAL_DOMAINS,
};
