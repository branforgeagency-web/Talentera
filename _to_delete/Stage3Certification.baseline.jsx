import React, { useState, useMemo } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import { CERT_LIBRARY, CERT_ID_PATTERNS } from "../../data/certLibrary";
import DocumentVaultModal from "../DocumentVaultModal.jsx";

const REGIONS = [
  { id: "us", name: "United States", flag: '', count: "69 certs" },
  { id: "in", name: "India", flag: '', count: "55 certs" },
  { id: "ph", name: "Philippines", flag: '', count: "51 certs" },
  { id: "sa", name: "Saudi Arabia", flag: '', count: "39 certs" },
  { id: "gcc", name: "UAE / Bahrain / Kuwait / Oman / Qatar (GCC)", flag: <i className="fa-solid fa-globe" />, count: "39 certs" },
  { id: "au", name: "Australia", flag: '', count: "22 certs" },
  { id: "nz", name: "New Zealand", flag: '', count: "7 certs" },
  { id: "ca", name: "Canada", flag: '', count: "17 certs" },
  { id: "uk", name: "United Kingdom", flag: '', count: "15 certs" },
  { id: "my", name: "Malaysia", flag: '', count: "40 certs" },
  { id: "sg", name: "Singapore", flag: '', count: "17 certs" },
  { id: "za", name: "South Africa", flag: '', count: "10 certs" },
  { id: "de", name: "Germany", flag: '', count: "4 certs" },
  { id: "br", name: "Brazil", flag: '', count: "1 cert" },
  { id: "mx", name: "Mexico", flag: '', count: "35 certs" },
  { id: "ng", name: "Nigeria", flag: '', count: "35 certs" },
  { id: "th", name: "Thailand", flag: '', count: "1 cert" },
  { id: "jp", name: "Japan", flag: '', count: "1 cert" },
  { id: "fr", name: "France", flag: '', count: "2 certs" },
  { id: "ie", name: "Ireland", flag: '', count: "2 certs" },
  { id: "nl", name: "Netherlands", flag: '', count: "2 certs" },
  { id: "ch", name: "Switzerland", flag: '', count: "2 certs" },
  { id: "at", name: "Austria", flag: '', count: "2 certs" },
];

const BODIES_BY_REGION = {
  us: [
    { key: "aapc", name: "AAPC", count: 33 },
    { key: "ahima", name: "AHIMA", count: 8 },
    { key: "hfma", name: "HFMA", count: 11 },
    { key: "aaham", name: "AAHAM", count: 5 },
    { key: "nha", name: "NHA", count: 1 },
    { key: "amba", name: "AMBA", count: 1 },
    { key: "naham", name: "NAHAM", count: 2 },
    { key: "namss", name: "NAMSS", count: 2 },
    { key: "ahcc", name: "AHCC / BMSC", count: 3 },
    { key: "wellsky", name: "WellSky", count: 3 },
  ],
  in: [
    { key: "aapc", name: "AAPC", count: 33 },
    { key: "ahima", name: "AHIMA", count: 8 },
    { key: "hfma", name: "HFMA", count: 4 },
    { key: "aaham", name: "AAHAM", count: 3 },
    { key: "nha", name: "NHA", count: 1 },
    { key: "iacmc", name: "IACMC", count: 2 },
    { key: "ahcc", name: "AHCC / BMSC", count: 3 },
    { key: "wellsky", name: "WellSky", count: 1 },
  ],
  ph: [
    { key: "aapc", name: "AAPC", count: 33 },
    { key: "ahima", name: "AHIMA", count: 8 },
    { key: "hfma", name: "HFMA", count: 3 },
    { key: "nha", name: "NHA", count: 1 },
    { key: "tesda", name: "TESDA", count: 2 },
    { key: "ahcc", name: "AHCC / BMSC", count: 3 },
    { key: "wellsky", name: "WellSky", count: 1 },
  ],
  sa: [
    { key: "aapc", name: "AAPC", count: 32 },
    { key: "aapc_ksa", name: "AAPC (KSA specific)", count: 2 },
    { key: "ahima", name: "AHIMA", count: 4 },
    { key: "hfma", name: "HFMA", count: 1 },
  ],
  gcc: [
    { key: "aapc", name: "AAPC", count: 32 },
    { key: "ahima", name: "AHIMA", count: 6 },
    { key: "hfma", name: "HFMA", count: 1 },
  ],
  au: [
    { key: "himaa", name: "HIMAA", count: 9 },
    { key: "ihacpa", name: "IHACPA", count: 3 },
    { key: "aapc", name: "AAPC", count: 6 },
    { key: "ahima", name: "AHIMA", count: 4 },
  ],
  nz: [
    { key: "himaa", name: "HIMAA", count: 7 },
  ],
  ca: [
    { key: "chima", name: "CHIMA / CCHIM", count: 7 },
    { key: "aapc", name: "AAPC", count: 6 },
    { key: "ahima", name: "AHIMA", count: 4 },
  ],
  uk: [
    { key: "ihrim", name: "IHRIM / NHS", count: 7 },
    { key: "aapc", name: "AAPC", count: 4 },
    { key: "ahima", name: "AHIMA", count: 4 },
  ],
  my: [
    { key: "aapc", name: "AAPC", count: 32 },
    { key: "ahima", name: "AHIMA", count: 5 },
    { key: "hfma", name: "HFMA", count: 3 },
  ],
  sg: [
    { key: "aapc", name: "AAPC", count: 5 },
    { key: "ahima", name: "AHIMA", count: 5 },
    { key: "hfma", name: "HFMA", count: 3 },
    { key: "moh_himaa", name: "Local / MOH + HIMAA", count: 4 },
  ],
  za: [
    { key: "aapc", name: "AAPC", count: 3 },
    { key: "ahima", name: "AHIMA", count: 2 },
    { key: "hfma", name: "HFMA", count: 1 },
    { key: "saqa", name: "SAQA / Colleges", count: 1 },
    { key: "himaa", name: "HIMAA", count: 3 },
  ],
  de: [
    { key: "ihk", name: "IHK", count: 1 },
    { key: "tuv", name: "TÜV Rheinland", count: 1 },
    { key: "private_acad", name: "Private Academies", count: 1 },
    { key: "gmds", name: "GMDS / GI / BVMI", count: 1 },
  ],
  br: [
    { key: "aapc_sbais", name: "AAPC + SBAIS", count: 1 },
  ],
  mx: [
    { key: "aapc", name: "AAPC", count: 32 },
    { key: "ahima", name: "AHIMA", count: 3 },
  ],
  ng: [
    { key: "aapc", name: "AAPC", count: 32 },
    { key: "ahima", name: "AHIMA", count: 3 },
  ],
  th: [
    { key: "thcc", name: "Thai Health Coding Centre / MOPH", count: 1 },
  ],
  jp: [
    { key: "mhlw", name: "MHLW / Hospital DPC", count: 1 },
  ],
  fr: [
    { key: "atih", name: "ATIH / Hospital DIM", count: 2 },
  ],
  ie: [
    { key: "hpo", name: "HPO", count: 2 },
  ],
  nl: [
    { key: "kiwa", name: "Kiwa / Zorginfostraat / Amstelacademie", count: 2 },
  ],
  ch: [
    { key: "hospital_nat", name: "Hospital / National system", count: 2 },
  ],
  at: [
    { key: "hospital_nat", name: "Hospital / National system", count: 2 },
  ],
};

// Target certifications for the "Pursuing Details" section, split into a
// Coding tab and a Billing tab.
const PURSUING_CODING_CERTS = [
  { code: "CPC", label: "CPC — Certified Professional Coder" },
  { code: "CPC-A", label: "CPC-A — Certified Professional Coder Apprentice" },
  { code: "COC", label: "COC — Certified Outpatient Coder" },
  { code: "CIC", label: "CIC — Certified Inpatient Coder" },
  { code: "CRC", label: "CRC — Certified Risk Adjustment Coder" },
  { code: "CCS", label: "CCS — Certified Coding Specialist (AHIMA)" },
  { code: "CCS-P", label: "CCS-P — Certified Coding Specialist, Physician-based (AHIMA)" },
  { code: "CCA", label: "CCA — Certified Coding Associate (AHIMA)" },
  { code: "CPMA", label: "CPMA — Certified Professional Medical Auditor" },
  { code: "CDEO", label: "CDEO — Certified Documentation Expert Outpatient" },
  { code: "CDIP", label: "CDIP — Clinical Documentation Improvement Practitioner (AHIMA)" },
  { code: "RHIT", label: "RHIT — Registered Health Information Technician (AHIMA)" },
  { code: "CMCS", label: "CMCS — Certified Medical Coding Specialist" },
];
const PURSUING_BILLING_CERTS = [
  { code: "CPB", label: "CPB — Certified Professional Biller (AAPC)" },
  { code: "CMRS", label: "CMRS — Certified Medical Reimbursement Specialist (AMBA)" },
  { code: "CMIS", label: "CMIS — Certified Medical Insurance Specialist" },
  { code: "CBCS", label: "CBCS — Certified Billing & Coding Specialist (NHA)" },
  { code: "CRCR", label: "CRCR — Certified Revenue Cycle Representative (HFMA)" },
  { code: "CRCS", label: "CRCS — Certified Revenue Cycle Specialist" },
  { code: "CRCP", label: "CRCP — Certified Revenue Cycle Professional" },
  { code: "CRIP", label: "CRIP — Certified Revenue Integrity Professional" },
  { code: "CHAA", label: "CHAA — Certified Healthcare Access Associate" },
  { code: "CPPM", label: "CPPM — Certified Physician Practice Manager" },
  { code: "CMOM", label: "CMOM — Certified Medical Office Manager" },
];

const MONTH_OPTIONS = [
  { val: "01", label: "01 · Jan" },
  { val: "02", label: "02 · Feb" },
  { val: "03", label: "03 · Mar" },
  { val: "04", label: "04 · Apr" },
  { val: "05", label: "05 · May" },
  { val: "06", label: "06 · Jun" },
  { val: "07", label: "07 · Jul" },
  { val: "08", label: "08 · Aug" },
  { val: "09", label: "09 · Sep" },
  { val: "10", label: "10 · Oct" },
  { val: "11", label: "11 · Nov" },
  { val: "12", label: "12 · Dec" },
];

const CURRENT_YEAR = new Date().getFullYear();
const PAST_YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));
const FUTURE_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => String(CURRENT_YEAR + 10 - i));

export default function Stage3Certification({ stage, existingData = {}, candidate = {}, onSaved }) {
  const toast = useToast();

  // STAGE 1 & 2 RECAP DATA
  const s1 = candidate?.stage1 || {};
  const s2 = candidate?.stage2 || {};
  const candidateName = s1.fullName || candidate.fullName || "Candidate";
  const candidateExp = s1.experienceLevel || s1.experience || candidate?.experience || "Fresher";
  const isExperienced = /exp/i.test(String(s1.experienceLevel || s1.experience || candidate?.experience || candidateExp || ""));
  const academyName = s2.academyName || s2.instituteName || "Direct / Self-Trained";
  const specialty = s2.specialties?.[0] || s2.specialty || s2.domain || "Medical Coding";
  const candidateCity = s1.city || candidate.city || "—";

  const isPursuingFromStage2 = s2.trainingPath === "pursuing" || candidate?.stage2?.trainingPath === "pursuing" || candidate?.trainingPath === "pursuing";

  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // SECTION 1 · CERTIFICATION STATUS
  const [status, setStatus] = useState(
    existingData.certType === "non-certified" || existingData.nonCertified || existingData.isCertified === false
      ? "non-certified"
      : existingData.status || existingData.certType || (isPursuingFromStage2 ? "pursuing" : "certified")
  );

  // SECTION 2 · CERTIFICATION REGION & BODY
  const [selectedRegion, setSelectedRegion] = useState("us");
  const [selectedBodyKey, setSelectedBodyKey] = useState(existingData.body || "aapc");
  const [certSearch, setCertSearch] = useState("");
  const [regionSearch, setRegionSearch] = useState("");
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);

  const selectedRegionObj = useMemo(() => {
    return REGIONS.find((r) => r.id === selectedRegion) || REGIONS[0];
  }, [selectedRegion]);

  const filteredRegions = useMemo(() => {
    const q = regionSearch.trim().toLowerCase();
    if (!q) return REGIONS;
    return REGIONS.filter(
      (r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  }, [regionSearch]);

  const availableBodies = useMemo(() => {
    return BODIES_BY_REGION[selectedRegion] || BODIES_BY_REGION.us;
  }, [selectedRegion]);

  // Active Cert in dropdown
  const bodyData = CERT_LIBRARY[selectedBodyKey] || CERT_LIBRARY.aapc || { certs: [], name: "AAPC", fullName: "American Academy of Professional Coders" };
  const filteredCerts = useMemo(() => {
    const list = bodyData?.certs || [];
    const q = certSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) => c.code.toLowerCase().includes(q) || (c.name || "").toLowerCase().includes(q)
    );
  }, [bodyData, certSearch]);
  const [selectedCertCode, setSelectedCertCode] = useState(
    existingData.certCode && existingData.certCode !== "NON-CERT" ? existingData.certCode : (bodyData?.certs?.[0]?.code || "CPC")
  );

  const activeCertDetail = useMemo(() => {
    const list = bodyData?.certs || [];
    return list.find((c) => c.code === selectedCertCode) || list[0] || {
      code: "CPC",
      name: "Certified Professional Coder",
      target: "Physician office & outpatient coder · Flagship AAPC credential",
      time: "4 hrs",
      qs: 100,
      usd: 399,
      inr: "~₹33,500",
      renewal: "1 year",
      desc: "The flagship AAPC credential — validates expertise in physician office and outpatient CPT/ICD-10-CM/HCPCS coding.",
      prereq: "2 years coding experience recommended. Without experience, credential awarded as CPC-A until experience requirement is met.",
      bestFor: "Entry-to-mid level physician-side and outpatient (OP) coding. ~87% of RCM employers require this or an equivalent.",
    };
  }, [bodyData, selectedCertCode]);

  // Form inputs for selected cert
  const [memberId, setMemberId] = useState(existingData.memberId || "");

  const rawIssue = String(existingData.issueDate || "").trim();
  const [issueMonth, setIssueMonth] = useState(
    existingData.issueMonth || (rawIssue.includes("/") ? rawIssue.split("/")[0].padStart(2, "0") : "")
  );
  const [issueYear, setIssueYear] = useState(
    existingData.issueYear || (rawIssue.includes("/") ? rawIssue.split("/")[1] : rawIssue)
  );

  const rawExpiry = String(existingData.expiryDate || "").trim();
  const [expiryMonth, setExpiryMonth] = useState(
    existingData.expiryMonth || (rawExpiry.includes("/") ? rawExpiry.split("/")[0].padStart(2, "0") : "")
  );
  const [expiryYear, setExpiryYear] = useState(
    existingData.expiryYear || (rawExpiry.includes("/") ? rawExpiry.split("/")[1] : rawExpiry)
  );

  const [isActive, setIsActive] = useState(existingData.isActive !== undefined ? existingData.isActive : true);

  const rawLastCeu = String(existingData.lastCeu || "").trim();
  const [lastCeuMonth, setLastCeuMonth] = useState(
    existingData.lastCeuMonth || (rawLastCeu.includes("/") ? rawLastCeu.split("/")[0].padStart(2, "0") : "")
  );
  const [lastCeuYear, setLastCeuYear] = useState(
    existingData.lastCeuYear || (rawLastCeu.includes("/") ? rawLastCeu.split("/")[1] : rawLastCeu)
  );

  // Credential verification URL and Real vs Fake verification state
  const [certUrl, setCertUrl] = useState(existingData.certUrl || "");
  const [certPercentage, setCertPercentage] = useState(
    existingData.certPercentage ?? existingData.certifications?.[0]?.percentage ?? ""
  );
  const [verificationResult, setVerificationResult] = useState(existingData.verificationResult || null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Multi-cert stack with robust initialization from existingData
  const initialCertStack = useMemo(() => {
    if (Array.isArray(existingData.certifications) && existingData.certifications.length > 0) {
      return existingData.certifications;
    }
    if (existingData.certCode && existingData.memberId) {
      const isReal = existingData.isReal !== undefined ? existingData.isReal : (existingData.certStatus === "verified" ? true : null);
      const verdict = isReal === true ? "REAL" : isReal === false ? "FAKE" : "NEEDS_AUDIT";
      return [
        {
          code: existingData.certCode,
          name: existingData.certName || existingData.certificationName || "Certified Professional Coder",
          body: existingData.issuingBody || existingData.body || "AAPC",
          region: (existingData.region || "US").toUpperCase(),
          issueMonth: existingData.issueMonth || "",
          issueYear: existingData.issueYear || "",
          issueDate: existingData.issueDate || "",
          expiryMonth: existingData.expiryMonth || "",
          expiryYear: existingData.expiryYear || "",
          expiryDate: existingData.expiryDate || "",
          memberId: existingData.memberId,
          certUrl: existingData.certUrl || "",
          percentage: existingData.certPercentage ?? null,
          isReal,
          trustScore: existingData.trustScore || (isReal ? 98 : 70),
          verificationResult: existingData.verificationResult || null,
          status: isReal === true ? "Real · Verified" : (isReal === false ? "Fake · Invalid" : (existingData.certStatus === "verified" ? "Verified" : "Pending Review")),
          badgeClass: isReal === true || existingData.certStatus === "verified" ? "green" : (isReal === false ? "red" : "yellow"),
          logoClass: existingData.certCode === "CPC" ? "blue" : existingData.certCode === "CDC" ? "purple" : "",
        },
      ];
    }
    return [];
  }, [existingData]);

  const [certStack, setCertStack] = useState(initialCertStack);

  // Sync state if existingData updates from server
  React.useEffect(() => {
    if (Array.isArray(existingData.certifications) && existingData.certifications.length > 0) {
      setCertStack(existingData.certifications);
    } else if (existingData.certCode && existingData.memberId && certStack.length === 0) {
      setCertStack(initialCertStack);
    }
    if (existingData.certUrl) setCertUrl(existingData.certUrl);
    if (existingData.verificationResult) setVerificationResult(existingData.verificationResult);
  }, [existingData, initialCertStack]);

  // SECTION 3 · PURSUING DETAILS
  const initialPursuingTrack = (() => {
    if (existingData.pursuingCert) {
      return PURSUING_BILLING_CERTS.some((c) => c.code === existingData.pursuingCert) ? "billing" : "coding";
    }
    return /billing|accounts receivable|\bAR\b/i.test(String(s2.domain || "")) ? "billing" : "coding";
  })();
  const [pursuingTrack, setPursuingTrack] = useState(initialPursuingTrack);
  const [pursuingCert, setPursuingCert] = useState(
    existingData.pursuingCert || (initialPursuingTrack === "billing" ? "CPB" : "CPC")
  );

  const rawExam = String(existingData.expectedExamDate || "").trim();
  const [expectedExamMonth, setExpectedExamMonth] = useState(
    existingData.expectedExamMonth || (rawExam.includes("/") ? rawExam.split("/")[0].padStart(2, "0") : "")
  );
  const [expectedExamYear, setExpectedExamYear] = useState(
    existingData.expectedExamYear || (rawExam.includes("/") ? rawExam.split("/")[1] : rawExam)
  );

  const [prepSource, setPrepSource] = useState(existingData.prepSource || "");
  const [prepConfidence, setPrepConfidence] = useState(existingData.prepConfidence || "High");
  // Optional - a pursuing candidate may already have a membership / registration ID with the
  // issuing body (e.g. AAPC) even though the certification exam itself hasn't been passed yet.
  const [pursuingMemberId, setPursuingMemberId] = useState(existingData.pursuingMemberId || "");

  // Global Markets picker UI removed — target markets now always default to the standard set.
  const selectedMarkets = Array.isArray(existingData.targetMarkets)
    ? existingData.targetMarkets
    : ["in", "us", "ae", "global"];

  // UI state
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedBadge, setSavedBadge] = useState("✓ Saved just now");
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  function handleRegionChange(regId) {
    setSelectedRegion(regId);
    const bodies = BODIES_BY_REGION[regId] || [];
    if (bodies.length > 0) {
      handleBodySelect(bodies[0].key);
    }
  }

  function handleBodySelect(bKey) {
    setSelectedBodyKey(bKey);
    setCertSearch("");
    const bInfo = CERT_LIBRARY[bKey] || CERT_LIBRARY.aapc;
    if (bInfo?.certs?.length > 0) {
      setSelectedCertCode(bInfo.certs[0].code);
    }
  }

  // Build Payload
  function buildPayload(isDraft = false, customStack = null) {
    const isCertified = status === "certified";
    const isPursuing = status === "pursuing";
    const isNonCert = status === "non-certified";
    // "NON-CERT" is only ever a status sentinel (written below when isNonCert) - it must never be used
    // as a real certification code, even if it's still lingering in `selectedCertCode` from an earlier
    // Non-Certified save that hasn't been re-picked yet.
    const safeSelectedCertCode = selectedCertCode === "NON-CERT" ? (bodyData?.certs?.[0]?.code || "CPC") : selectedCertCode;

    const formattedIssue = issueYear ? (issueMonth ? `${issueMonth}/${issueYear}` : issueYear) : "";
    const formattedExpiry = expiryYear ? (expiryMonth ? `${expiryMonth}/${expiryYear}` : expiryYear) : "";
    const formattedLastCeu = lastCeuYear ? (lastCeuMonth ? `${lastCeuMonth}/${lastCeuYear}` : lastCeuYear) : "";
    const formattedExam = expectedExamYear ? (expectedExamMonth ? `${expectedExamMonth}/${expectedExamYear}` : expectedExamYear) : "";

    const activeStack = customStack !== null ? customStack : certStack;

    let finalStack = activeStack;
    if (isCertified && finalStack.length === 0 && (memberId.trim() || safeSelectedCertCode)) {
      const isReal = verificationResult ? verificationResult.isReal : null;
      const verdict = verificationResult ? verificationResult.verdict : "NEEDS_AUDIT";
      const statusText = verdict === "REAL" ? "Real · Verified" : (verdict === "FAKE" ? "Fake · Invalid" : "Pending Review");
      const badgeClass = verdict === "REAL" ? "green" : (verdict === "FAKE" ? "red" : "blue");
      finalStack = [
        {
          code: safeSelectedCertCode,
          name: activeCertDetail.name,
          body: bodyData.name || "AAPC",
          region: selectedRegion.toUpperCase(),
          issueMonth,
          issueYear,
          issueDate: formattedIssue,
          expiryMonth,
          expiryYear,
          expiryDate: formattedExpiry,
          memberId: memberId.trim(),
          certUrl: certUrl.trim(),
          percentage: certPercentage !== "" ? Number(certPercentage) : null,
          isReal,
          trustScore: verificationResult?.trustScore || 70,
          verificationResult,
          status: statusText,
          badgeClass,
          logoClass: selectedCertCode === "CPC" ? "blue" : selectedCertCode === "CDC" ? "purple" : "",
        },
      ];
    }

    return {
      isDraft,
      status,
      certType: status,
      isCertified,
      nonCertified: isNonCert,
      certCode: isCertified ? (finalStack[0]?.code || safeSelectedCertCode) : isPursuing ? pursuingCert : "NON-CERT",
      certName: isCertified ? (finalStack[0]?.name || activeCertDetail.name) : isPursuing ? `Pursuing ${pursuingCert}` : "Non-Certified / Trainee Coder",
      issuingBody: isCertified ? (finalStack[0]?.body || bodyData.name || "AAPC") : isPursuing ? "AAPC" : "None",
      body: isCertified ? (finalStack[0]?.body || bodyData.name || "AAPC") : isPursuing ? "AAPC" : "None",
      memberId: isCertified ? (finalStack[0]?.memberId || memberId.trim()) : "",
      certUrl: certUrl ? certUrl.trim() : (finalStack[0]?.certUrl || ""),
      verificationResult: verificationResult || (finalStack[0]?.verificationResult) || null,
      isReal: verificationResult ? verificationResult.isReal : (finalStack[0]?.isReal !== undefined ? finalStack[0].isReal : null),
      trustScore: verificationResult ? verificationResult.trustScore : (finalStack[0]?.trustScore !== undefined ? finalStack[0].trustScore : null),
      issueMonth,
      issueYear,
      issueDate: isCertified ? (finalStack[0]?.issueDate || formattedIssue) : "",
      expiryMonth,
      expiryYear,
      expiryDate: isCertified ? (finalStack[0]?.expiryDate || formattedExpiry) : "",
      certPercentage: isCertified ? (finalStack[0]?.percentage ?? (certPercentage !== "" ? Number(certPercentage) : null)) : null,
      isActive,
      lastCeuMonth,
      lastCeuYear,
      lastCeu: formattedLastCeu,
      certifications: finalStack,
      targetMarkets: isNonCert ? [] : selectedMarkets,
      pursuingDetails: isPursuing
        ? {
            cert: pursuingCert,
            expectedMonth: expectedExamMonth,
            expectedYear: expectedExamYear,
            expectedDate: formattedExam,
            prepSource,
            confidence: prepConfidence,
            memberId: pursuingMemberId.trim(),
          }
        : null,
      pursuingMemberId: isPursuing ? pursuingMemberId.trim() : "",
    };
  }

  async function handleVerifyCredential() {
    if (!memberId.trim()) {
      toast("Please enter your Member / Cert ID first.", "!");
      return;
    }
    setIsVerifying(true);
    setVerifyError("");
    try {
      const res = await api.post("/candidate/stage/3/verify-credential", {
        body: selectedBodyKey,
        certCode: selectedCertCode,
        memberId: memberId.trim(),
        certUrl: certUrl.trim(),
      });
      setVerificationResult(res.data);
      if (res.data.isReal) {
        toast("✓ Credential authenticity confirmed as REAL!", "✓");
      } else if (res.data.isFake) {
        toast("Suspicious / fake credential pattern detected.", "!");
      } else {
        toast("Format verified! Pending official URL or document proof.", <i className="fa-solid fa-circle-info" />);
      }
    } catch (err) {
      console.error("Verification check failed:", err);
      const msg = err.response?.data?.message || "Could not complete credential verification.";
      setVerifyError(msg);
      toast(msg, "!");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleAddCertToStack() {
    if (!memberId.trim()) {
      toast("Please enter your Member / Cert ID first.", "!");
      return;
    }
    const formattedIssue = issueYear ? (issueMonth ? `${issueMonth}/${issueYear}` : issueYear) : "";
    const formattedExpiry = expiryYear ? (expiryMonth ? `${expiryMonth}/${expiryYear}` : expiryYear) : "";
    const isReal = verificationResult ? verificationResult.isReal : null;
    const verdict = verificationResult ? verificationResult.verdict : "NEEDS_AUDIT";
    const statusText = verdict === "REAL" ? "Real · Verified" : (verdict === "FAKE" ? "Fake · Invalid" : "Pending Review");
    const badgeClass = verdict === "REAL" ? "green" : (verdict === "FAKE" ? "red" : "yellow");
    const newCertObj = {
      code: selectedCertCode,
      name: activeCertDetail.name,
      body: bodyData.name || "AAPC",
      region: selectedRegion.toUpperCase(),
      issueMonth,
      issueYear,
      issueDate: formattedIssue,
      expiryMonth,
      expiryYear,
      expiryDate: formattedExpiry,
      memberId: memberId.trim(),
      certUrl: certUrl.trim(),
      percentage: certPercentage !== "" ? Number(certPercentage) : null,
      isReal,
      trustScore: verificationResult?.trustScore || 70,
      verificationResult,
      status: statusText,
      badgeClass,
      logoClass: selectedCertCode === "CPC" ? "blue" : selectedCertCode === "CDC" ? "purple" : "",
    };

    const nextStack = [...certStack.filter((c) => !(c.code === selectedCertCode && c.memberId === memberId.trim())), newCertObj];
    setCertStack(nextStack);

    // Save directly to the database immediately
    try {
      const payload = buildPayload(true, nextStack);
      const res = await api.put("/candidate/stage/3", payload);
      toast(`✓ Added and saved ${selectedCertCode} to your profile!`, "✓");
      if (onSaved) onSaved(res.data, { advance: false });
    } catch (err) {
      console.warn("Auto-save on cert add fallback:", err);
      toast(`Added ${selectedCertCode} to stack.`, "✓");
    }
  }

  async function handleRemoveCertFromStack(indexToRemove) {
    const nextStack = certStack.filter((_, i) => i !== indexToRemove);
    setCertStack(nextStack);
    try {
      const payload = buildPayload(true, nextStack);
      const res = await api.put("/candidate/stage/3", payload);
      toast("Certificate removed and updated in database.", "✓");
      if (onSaved) onSaved(res.data, { advance: false });
    } catch (err) {
      console.warn("Auto-save on cert remove fallback:", err);
    }
  }

  // Save Draft
  async function handleSaveDraft() {
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload(true);
      const res = await api.put("/candidate/stage/3", payload);
      setSavedBadge("✓ Draft saved just now");
      toast("Stage 03 progress saved as draft.", "✓");
      if (onSaved) onSaved(res.data, { advance: false });
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || "Could not save draft.", "!");
    } finally {
      setSaving(false);
    }
  }

  // Final Submit & Advance to Stage 4
  async function handleSaveAndContinue() {
    setError("");
    if (status === "certified") {
      if (!memberId.trim() && certStack.length === 0) {
        setFormErrors({ memberId: "Member / Certification ID is mandatory" });
        const msg = "Please enter your Member / Certification ID in Section 2.";
        setError(msg);
        toast(msg, "error", { title: "Mandatory Fields Required" });
        window.scrollTo({ top: 400, behavior: "smooth" });
        return;
      }
      if (verificationResult?.isFake) {
        setFormErrors({ memberId: "The entered credential failed authenticity verification" });
        const msg = "The entered credential failed authenticity verification (flagged fake/dummy). Please correct your Member ID or verification link.";
        setError(msg);
        toast(msg, "error", { title: "Invalid Credential" });
        window.scrollTo({ top: 400, behavior: "smooth" });
        return;
      }
    }
    setFormErrors({});

    setSaving(true);
    try {
      const payload = buildPayload(false);
      const res = await api.put("/candidate/stage/3", payload);
      toast("Stage 03 · Certification saved successfully! (+15 pts)", "✓");
      if (onSaved) onSaved(res.data, { advance: true, nextStage: 4 });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to save Stage 3 details.");
      toast(err.response?.data?.message || "Could not save Stage 3.", "!");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stage03-wrapper">
      <style>{`
        .stage03-wrapper {
          --navy: #0F1B3D;
          --navy-deep: #08122A;
          --navy-lite: #1A2A55;
          --gold: #F5B41A;
          --gold-deep: #C99413;
          --gold-pale: #FFF6E0;
          --gold-soft: #FFEBB0;
          --white: #FFFFFF;
          --bg: #F5F7FB;
          --card: #FFFFFF;
          --border: #E5E7EB;
          --gray-txt: #3A425A;
          --gray-mute: #8A91A3;
          --gray-soft: #F2F3F5;
          --green: #1F7A3C;
          --green-soft: #E8F5E9;
          --red: #C0392B;
          --red-soft: #FDECEA;
          --blue: #1A4FB8;
          --blue-soft: #EEF2FF;
          --amber: #E08E00;
          --amber-soft: #FFF3D6;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: var(--gray-txt);
        }

        .stage03-shell {
          width: 100%;
        }

        /* BREADCRUMB */
        .s3-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--gray-mute);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 14px;
          font-weight: 600;
        }
        .s3-breadcrumb .sep { color: var(--border); }

        /* HERO */
        .s3-hero {
          background: linear-gradient(135deg, var(--navy) 0%, #1E3A8A 60%, #2A54B5 100%);
          color: var(--white);
          border-radius: 18px;
          padding: 30px 32px;
          position: relative;
          overflow: hidden;
          margin-bottom: 20px;
          box-shadow: 0 8px 24px rgba(15,27,61,.15);
        }
        .s3-hero::before {
          content: '';
          position: absolute;
          right: -80px;
          top: -80px;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(245,180,26,.16), transparent 60%);
        }
        .s3-hero-icon {
          width: 54px;
          height: 54px;
          background: var(--gold);
          color: var(--navy);
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-size: 26px;
          margin-bottom: 14px;
          box-shadow: 0 4px 12px rgba(245,180,26,.32);
        }
        .s3-hero-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .s3-hero-chip {
          background: rgba(255,255,255,.14);
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          backdrop-filter: blur(6px);
          color: #ffffff !important;
        }
        .s3-hero-chip.gold { background: var(--gold); color: var(--navy) !important; }
        .s3-hero-title,
        h1.s3-hero-title {
          font-size: 44px;
          font-weight: 800;
          letter-spacing: -1px;
          margin: 0;
          line-height: 1;
          color: #ffffff !important;
        }
        .s3-hero-subtitle {
          color: var(--gold-pale);
          font-style: italic;
          font-size: 17px;
          margin-top: 6px;
          font-weight: 500;
        }
        .s3-hero-desc {
          color: rgba(255,255,255,.85);
          font-size: 14px;
          margin-top: 16px;
          max-width: 640px;
          line-height: 1.6;
        }
        .s3-hero-tiles {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 22px;
        }
        @media (max-width: 768px) {
          .s3-hero-tiles { grid-template-columns: 1fr 1fr; }
        }
        .s3-hero-tile {
          background: rgba(255,255,255,.12);
          padding: 16px 14px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid rgba(255,255,255,.08);
          backdrop-filter: blur(8px);
        }
        .s3-hero-tile .big {
          font-size: 20px;
          font-weight: 800;
          color: var(--white);
          letter-spacing: -.3px;
        }
        .s3-hero-tile .small {
          font-size: 11px;
          color: rgba(255,255,255,.7);
          margin-top: 3px;
          letter-spacing: .3px;
        }

        /* IDENTITY RECAP BADGE */
        .s3-id-recap {
          background: linear-gradient(90deg, var(--green-soft), #F5FDF9);
          border: 1px solid var(--green);
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }
        .s3-id-recap .check {
          width: 36px;
          height: 36px;
          background: var(--green);
          color: var(--white);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 18px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .s3-id-recap .txt { flex: 1; }
        .s3-id-recap .lbl {
          font-size: 11px;
          color: var(--green);
          font-weight: 700;
          letter-spacing: .6px;
          text-transform: uppercase;
        }
        .s3-id-recap .val {
          font-size: 14px;
          color: var(--navy);
          font-weight: 800;
          margin-top: 2px;
        }
        .s3-id-recap .small {
          font-size: 11.5px;
          color: var(--gray-mute);
          margin-top: 1px;
          font-style: italic;
        }
        .s3-id-recap .locked-badge {
          background: var(--gold);
          color: var(--navy);
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: .6px;
        }

        /* RULES */
        .s3-card {
          background: var(--card);
          border-radius: 16px;
          padding: 24px 26px;
          box-shadow: 0 2px 10px rgba(15,27,61,.05);
          margin-bottom: 18px;
          border: 1px solid var(--border);
        }
        .s3-card-title { font-size: 20px; font-weight: 800; color: var(--navy); margin: 0; }
        .s3-card-eyebrow {
          font-size: 10.5px;
          letter-spacing: 1.5px;
          color: var(--gold-deep);
          text-transform: uppercase;
          font-weight: 700;
          margin-top: 8px;
        }
        .s3-rules-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 18px;
        }
        @media (max-width: 640px) {
          .s3-rules-grid { grid-template-columns: 1fr; }
        }
        .s3-rule-tile {
          background: var(--gold-pale);
          padding: 16px 18px;
          border-radius: 12px;
          border-left: 4px solid var(--gold);
        }
        .s3-rule-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .s3-rule-ico {
          width: 32px;
          height: 32px;
          background: var(--gold);
          color: var(--navy);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 15px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .s3-rule-title { font-size: 13.5px; font-weight: 800; color: var(--navy); }
        .s3-rule-body { font-size: 12.5px; color: var(--gray-txt); line-height: 1.55; }
        .s3-consent-pill {
          background: var(--navy);
          color: var(--gold-pale);
          padding: 12px 16px;
          border-radius: 12px;
          font-style: italic;
          font-size: 12.5px;
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .s3-consent-pill .ico { color: var(--gold); font-size: 16px; }

        /* FORM TOOLBAR */
        .s3-form-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, var(--gold-pale), #FFF9E0);
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 16px;
          border: 1px solid var(--gold-soft);
        }
        .s3-progress-rail {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--white);
          padding: 8px 14px;
          border-radius: 20px;
          border: 1px solid var(--border);
          font-size: 11.5px;
          color: var(--gray-mute);
          font-weight: 600;
        }
        .s3-rail-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--border); }
        .s3-rail-dot.done { background: var(--gold); }
        .s3-rail-dot.active { background: var(--gold); box-shadow: 0 0 0 3px var(--gold-pale); }
        .s3-saved-badge {
          color: var(--green);
          font-weight: 700;
          font-size: 11.5px;
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* FORM HEADERS & SECTIONS */
        .s3-form-header { margin-bottom: 16px; }
        .s3-form-header h2 { font-size: 22px; font-weight: 800; color: var(--navy); margin: 0; }
        .s3-form-header .sub {
          color: var(--gold-deep);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-top: 6px;
        }

        .s3-section {
          background: #FAFAF7;
          padding: 22px 24px;
          border-radius: 14px;
          margin-bottom: 16px;
          border: 1px solid var(--border);
          position: relative;
        }
        .s3-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px dashed var(--border);
        }
        .s3-section-num {
          width: 32px;
          height: 32px;
          background: var(--gold);
          color: var(--navy);
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 15px;
          flex-shrink: 0;
        }
        .s3-section-title { font-size: 16px; font-weight: 800; color: var(--navy); flex: 1; }
        .s3-status-chip {
          background: var(--green-soft);
          color: var(--green);
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .5px;
        }
        .s3-status-chip.pending { background: var(--gray-soft); color: var(--gray-mute); }
        .s3-status-chip.active { background: var(--gold-pale); color: var(--gold-deep); }

        /* FIELDS & INPUTS */
        .s3-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; position: relative; }
        .s3-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .s3-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        @media (max-width: 640px) {
          .s3-row, .s3-row-3 { grid-template-columns: 1fr; }
        }
        .s3-field label {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--navy);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .s3-field label .req { color: var(--red); font-weight: 700; }
        .s3-helper { font-size: 11px; color: var(--gray-mute); font-style: italic; margin-top: 2px; }

        .s3-field input[type="text"],
        .s3-field input[type="email"],
        .s3-field input[type="tel"],
        .s3-field input[type="number"],
        .s3-field select,
        .s3-field textarea {
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: 9px;
          padding: 11px 14px;
          font-size: 13.5px;
          color: var(--navy);
          outline: none;
          transition: .15s;
          width: 100%;
          box-sizing: border-box;
        }
        .s3-field input:focus,
        .s3-field select:focus,
        .s3-field textarea:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(245,180,26,.14);
        }

        /* MANDATORY FIELD ERROR HIGHLIGHTING */
        .s3-field.has-error input, .s3-field.has-error select, .s3-field.has-error textarea,
        .has-error input, .has-error select {
          border: 2px solid #EF4444 !important;
          background-color: #FEF2F2 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18) !important;
        }
        .field-error-msg {
          color: #DC2626;
          font-size: 11.5px;
          font-weight: 700;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* STATUS CHOICE CARDS (3 Col) */
        .s3-status-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        @media (max-width: 768px) {
          .s3-status-row { grid-template-columns: 1fr; }
        }
        .s3-status-card {
          background: var(--white);
          border: 2px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: .15s;
          position: relative;
        }
        .s3-status-card:hover { border-color: var(--gold-soft); background: #FDF6E4; }
        .s3-status-card.selected {
          border-color: var(--gold);
          background: var(--gold-pale);
          box-shadow: 0 4px 10px rgba(245,180,26,.15);
        }
        .s3-status-card.selected.warn { border-color: var(--amber); background: var(--amber-soft); }
        .s3-status-card .ico {
          width: 38px;
          height: 38px;
          background: var(--navy);
          color: var(--gold);
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 18px;
          margin-bottom: 8px;
        }
        .s3-status-card.selected .ico { background: var(--gold); color: var(--navy); }
        .s3-status-card .title { font-weight: 800; color: var(--navy); font-size: 14px; }
        .s3-status-card .sub { font-size: 11.5px; color: var(--gray-mute); margin-top: 4px; line-height: 1.4; }
        .s3-status-card .badge-hint {
          background: var(--green-soft);
          color: var(--green);
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 6px;
          font-weight: 700;
          letter-spacing: .3px;
          margin-top: 8px;
          display: inline-block;
        }
        .s3-status-card .badge-hint.yellow { background: #FFF3D6; color: var(--amber); }
        .s3-status-card .badge-hint.red { background: var(--red-soft); color: var(--red); }

        /* REGION CARDS */
        .s3-region-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
        @media (max-width: 640px) {
          .s3-region-row { grid-template-columns: repeat(3, 1fr); }
        }
        .s3-region-card {
          background: var(--white);
          border: 2px solid var(--border);
          border-radius: 12px;
          padding: 12px 8px;
          cursor: pointer;
          text-align: center;
          transition: .15s;
        }
        .s3-region-card:hover { border-color: var(--gold-soft); background: #FDF6E4; }
        .s3-region-card.selected {
          border-color: var(--gold);
          background: var(--gold-pale);
          box-shadow: 0 4px 10px rgba(245,180,26,.15);
        }
        .s3-region-flag { font-size: 26px; }
        .s3-region-name { font-weight: 800; color: var(--navy); font-size: 12px; margin-top: 4px; }
        .s3-region-count { font-size: 10px; color: var(--gray-mute); margin-top: 2px; }

        /* BODY PILLS */
        .s3-body-pill {
          background: var(--white);
          border: 1.5px solid var(--border);
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: .15s;
          color: var(--navy);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .s3-body-pill:hover { border-color: var(--gold); background: var(--gold-pale); }
        .s3-body-pill.selected { background: var(--navy); color: var(--white); border-color: var(--navy); }
        .s3-body-pill .count {
          background: rgba(245,180,26,.2);
          color: var(--gold-deep);
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 8px;
          font-weight: 700;
        }
        .s3-body-pill.selected .count { background: var(--gold); color: var(--navy); }

        /* CERT CARD DETAIL */
        .s3-cert-detail {
          background: var(--white);
          border: 2px solid var(--blue);
          border-radius: 12px;
          padding: 18px;
          margin-top: 12px;
          position: relative;
        }
        .s3-cert-detail::before {
          content: '';
          position: absolute;
          left: 0;
          top: 16px;
          bottom: 16px;
          width: 5px;
          background: var(--blue);
          border-radius: 0 5px 5px 0;
        }
        .s3-cert-badge-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
        .s3-cert-code-pill {
          background: var(--blue);
          color: var(--white);
          padding: 5px 12px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: .5px;
        }
        .s3-cert-tag {
          background: var(--gold-pale);
          color: var(--gold-deep);
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: .4px;
          text-transform: uppercase;
        }
        .s3-cert-title { font-weight: 800; color: var(--navy); font-size: 15px; margin-bottom: 4px; }
        .s3-cert-sub { font-size: 12px; color: var(--gray-mute); margin-bottom: 12px; }
        .s3-cert-stats {
          display: grid;
          grid-template-columns: repeat(4, auto) 1fr;
          gap: 20px;
          padding: 12px 0;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          margin-bottom: 12px;
        }
        @media (max-width: 640px) {
          .s3-cert-stats { grid-template-columns: 1fr 1fr; }
        }
        .s3-cert-stat .big { font-size: 15px; font-weight: 800; color: var(--navy); }
        .s3-cert-stat .small {
          font-size: 10px;
          color: var(--gray-mute);
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: .5px;
          font-weight: 700;
        }
        .s3-cert-desc { font-size: 12px; color: var(--gray-txt); line-height: 1.55; }
        .s3-cert-desc .lbl { font-weight: 800; color: var(--navy); }

        /* CERT STACK CARD */
        .s3-cert-stack { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
        .s3-cert-card-mini {
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: 12px;
          padding: 14px 16px;
          display: grid;
          grid-template-columns: 52px 1fr auto auto;
          gap: 14px;
          align-items: center;
          transition: .15s;
        }
        @media (max-width: 640px) {
          .s3-cert-card-mini { grid-template-columns: 1fr; }
        }
        .s3-cert-card-mini:hover { border-color: var(--gold); box-shadow: 0 4px 12px rgba(15,27,61,.05); }
        .s3-cert-mini-logo {
          width: 52px;
          height: 52px;
          background: var(--navy);
          color: var(--gold);
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 13px;
          flex-shrink: 0;
        }
        .s3-cert-mini-logo.blue { background: var(--blue); color: var(--white); }
        .s3-cert-mini-logo.purple { background: linear-gradient(135deg, #8E44AD, #6D2C82); color: var(--white); }
        .s3-cert-mini-info .title { font-weight: 800; color: var(--navy); font-size: 13.5px; }
        .s3-cert-mini-info .meta { font-size: 11.5px; color: var(--gray-mute); margin-top: 3px; }
        .s3-cert-mini-id {
          font-family: monospace;
          font-size: 11.5px;
          color: var(--gray-txt);
          background: var(--gray-soft);
          padding: 5px 10px;
          border-radius: 6px;
          font-weight: 700;
        }
        .s3-cert-mini-badge {
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .s3-cert-mini-badge.green { background: var(--green-soft); color: var(--green); }
        .s3-cert-mini-badge.yellow { background: var(--amber-soft); color: var(--amber); }
        .s3-cert-mini-badge.red { background: var(--red-soft); color: var(--red); }
        .s3-cert-mini-badge.blue { background: var(--blue-soft); color: var(--blue); }

        .s3-add-cert-btn {
          background: transparent;
          color: var(--gold-deep);
          border: 2px dashed var(--gold);
          padding: 14px;
          border-radius: 12px;
          width: 100%;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          margin-top: 12px;
          letter-spacing: .3px;
          transition: .15s;
        }
        .s3-add-cert-btn:hover { background: var(--gold-pale); }

        /* HELPER / WARN CARDS */
        .s3-helper-card {
          background: var(--blue-soft);
          border: 1.5px solid var(--blue);
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .s3-helper-card .ico {
          width: 36px;
          height: 36px;
          background: var(--blue);
          color: var(--white);
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .s3-helper-card .txt { flex: 1; font-size: 12.5px; color: var(--navy); line-height: 1.5; }

        .s3-warn-card {
          background: var(--amber-soft);
          border: 2px solid var(--amber);
          border-radius: 12px;
          padding: 16px 20px;
          margin-top: 12px;
        }
        .s3-warn-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .s3-warn-head .ico {
          width: 36px;
          height: 36px;
          background: var(--amber);
          color: var(--white);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 16px;
          font-weight: 800;
        }
        .s3-warn-title { font-weight: 800; color: var(--navy); font-size: 15px; }
        .s3-warn-body { font-size: 12.5px; color: var(--gray-txt); line-height: 1.55; }
        .s3-warn-actions { display: flex; gap: 10px; margin-top: 12px; }

        /* OPTION ITEMS (Global Markets) */
        .s3-option-list { display: flex; flex-direction: column; gap: 8px; }
        .s3-option-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: 9px;
          cursor: pointer;
          transition: .15s;
          font-size: 13px;
          color: var(--navy);
          font-weight: 600;
        }
        .s3-option-item:hover { border-color: var(--gold-soft); background: #FDF6E4; }
        .s3-option-item.selected { background: var(--gold-pale); border-color: var(--gold); }
        .s3-option-item .box {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border);
          border-radius: 4px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 800;
        }
        .s3-option-item.selected .box { background: var(--gold); border-color: var(--gold); color: var(--navy); }
        .s3-option-item .flag { font-size: 18px; }
        .s3-option-item .tail { margin-left: auto; color: var(--gray-mute); font-size: 11px; font-weight: 500; font-style: italic; }

        /* VERIFY ACTION BAR & REAL/FAKE STRIP */
        .s3-verify-action-bar {
          background: #FFFFFF;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 12px 0;
          flex-wrap: wrap;
        }
        .s3-verify-action-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .s3-verify-action-info .badge-ico {
          font-size: 22px;
          width: 38px;
          height: 38px;
          background: var(--blue-soft);
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .s3-official-link-btn {
          background: var(--blue-soft);
          color: var(--blue);
          border: 1.5px solid var(--blue);
          padding: 9px 16px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: .15s;
        }
        .s3-official-link-btn:hover { background: #DBEAFE; }
        .s3-verify-btn {
          background: var(--navy);
          color: var(--gold);
          border: none;
          padding: 10px 18px;
          border-radius: 9px;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          transition: .15s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .s3-verify-btn:hover:not(:disabled) { background: #1A2A55; }
        .s3-verify-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .s3-verify-strip {
          background: linear-gradient(90deg, var(--green-soft), #F5FDF9);
          border: 1.5px solid var(--green);
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-top: 14px;
          transition: .2s;
        }
        .s3-verify-strip.real {
          background: linear-gradient(90deg, #ECFDF5, #F0FDF4);
          border: 1.5px solid #10B981;
        }
        .s3-verify-strip.fake {
          background: linear-gradient(90deg, #FEF2F2, #FFF1F2);
          border: 1.5px solid #EF4444;
        }
        .s3-verify-strip.pending {
          background: linear-gradient(90deg, #FFFBEB, #FEF3C7);
          border: 1.5px solid #F59E0B;
        }
        .s3-verify-strip.loading {
          background: linear-gradient(90deg, #EFF6FF, #F0F9FF);
          border: 1.5px dashed #3B82F6;
        }
        .s3-verify-strip .badge-dot {
          width: 34px;
          height: 34px;
          background: var(--green);
          color: var(--white);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 15px;
          font-weight: 800;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .s3-verify-strip .badge-dot.green { background: #10B981; }
        .s3-verify-strip .badge-dot.red { background: #EF4444; }
        .s3-verify-strip .badge-dot.yellow { background: #F59E0B; }
        .s3-verify-strip .title { font-weight: 800; color: var(--navy); font-size: 13.5px; }
        .s3-verify-strip .body { font-size: 12px; color: var(--gray-txt); margin-top: 2px; line-height: 1.5; }

        .s3-doclink {
          background: var(--white);
          border: 1.5px dashed var(--gold);
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }
        .s3-doclink .ico {
          width: 32px;
          height: 32px;
          background: var(--gold-pale);
          color: var(--gold-deep);
          border-radius: 8px;
          display: grid;
          place-items: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .s3-doclink .txt { flex: 1; }
        .s3-doclink .title { font-weight: 800; color: var(--navy); font-size: 12.5px; }
        .s3-doclink .sub { font-size: 11px; color: var(--gray-mute); margin-top: 2px; }
        .s3-doclink .go { color: var(--gold-deep); font-weight: 800; font-size: 12px; cursor: pointer; }

        /* RIGHT SIDEBAR */
        .s3-right { display: flex; flex-direction: column; gap: 16px; }
        .s3-passport-card {
          background: linear-gradient(135deg, var(--navy), #1E3A8A);
          color: var(--white);
          padding: 20px;
          border-radius: 14px;
          position: relative;
          overflow: hidden;
        }
        .s3-passport-card::before {
          content: '';
          position: absolute;
          right: -30px;
          bottom: -30px;
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, rgba(245,180,26,.18), transparent 60%);
        }
        .s3-passport-eyebrow { color: var(--gold); font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
        .s3-passport-title { font-size: 17px; font-weight: 800; margin-top: 4px; color: #ffffff !important; }
        .s3-passport-status {
          background: rgba(245,180,26,.14);
          color: var(--gold);
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          margin-top: 12px;
          display: inline-block;
        }
        .s3-passport-desc { font-size: 11.5px; color: rgba(255,255,255,.75); margin-top: 10px; line-height: 1.5; }
        .s3-side-card {
          background: var(--card);
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .s3-side-card .title {
          font-size: 11px;
          letter-spacing: 1.5px;
          color: var(--gold-deep);
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .s3-company-row {
          display: grid;
          grid-template-columns: 38px 1fr;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px dashed var(--border);
          align-items: center;
        }
        .s3-company-row:last-child { border: none; padding-bottom: 0; }
        .s3-company-row:first-child { padding-top: 0; }
        .s3-company-logo {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 15px;
          color: var(--white);
        }
        .s3-company-name { font-size: 12.5px; font-weight: 800; color: var(--navy); display: flex; align-items: center; gap: 5px; }
        .s3-hot-pill {
          background: var(--red);
          color: var(--white);
          padding: 1px 6px;
          border-radius: 6px;
          font-size: 8.5px;
          letter-spacing: .5px;
          font-weight: 800;
        }
        .s3-company-meta { font-size: 10.5px; color: var(--gray-mute); margin-top: 1px; }
        .s3-company-tags { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }
        .s3-comp-tag {
          background: var(--gold-pale);
          color: var(--gold-deep);
          font-size: 9.5px;
          padding: 1px 6px;
          border-radius: 5px;
          font-weight: 700;
        }
        .s3-comp-tag.blue { background: var(--blue-soft); color: var(--blue); }
        .s3-comp-tag.green { background: var(--green-soft); color: var(--green); }
        .s3-verified-line { font-size: 10px; color: var(--green); margin-top: 4px; font-weight: 700; }

        .s3-hot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .s3-hot-stat { background: var(--gold-pale); padding: 12px; border-radius: 10px; text-align: center; }
        .s3-hot-stat .big { font-size: 18px; font-weight: 800; color: var(--navy); }
        .s3-hot-stat .small { font-size: 10px; color: var(--gray-txt); margin-top: 2px; }

        /* BOTTOM ACTION BAR */
        .s3-sticky-bar {
          background: var(--white);
          padding: 16px 24px;
          border: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 32px;
          margin-bottom: 32px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(15,27,61,.04);
        }
        .s3-sticky-progress { display: flex; align-items: center; gap: 12px; font-size: 12.5px; color: var(--gray-txt); }
        .s3-stick-bar-inner { height: 8px; width: 180px; background: var(--gray-soft); border-radius: 4px; overflow: hidden; }
        .s3-stick-bar-fill { height: 100%; width: 50%; background: linear-gradient(90deg, var(--gold), var(--gold-deep)); border-radius: 4px; }
        .s3-sticky-actions { display: flex; gap: 10px; }
        .s3-action-btn {
          background: var(--gold);
          color: var(--navy);
          padding: 11px 22px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          letter-spacing: .3px;
          transition: .15s;
        }
        .s3-action-btn:hover { background: var(--gold-soft); }
        .s3-action-btn.outline { background: transparent; color: var(--gold-deep); border: 1.5px solid var(--gold); }
        .s3-link-btn {
          background: transparent;
          color: var(--gray-txt);
          padding: 11px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          border: 1.5px solid var(--border);
          cursor: pointer;
          transition: .15s;
        }
        .s3-link-btn:hover { background: var(--white); border-color: var(--gray-mute); }
      `}</style>

      <div className="stage03-shell">
        {/* MAIN COLUMN */}
        <div className="s3-main">

          {/* HERO */}
          <div className="s3-hero">
            <div className="s3-hero-icon"><i className="fa-solid fa-trophy" /></div>
            <div className="s3-hero-badges">
              <span className="s3-hero-chip">STAGE 03 OF 07 · ACTIVE</span>
              <span className="s3-hero-chip gold">+15 POINTS</span>
            </div>
            <h1 className="s3-hero-title" style={{ color: "#ffffff" }}>Certification</h1>
            <div className="s3-hero-subtitle">The badge that follows your name — verified globally.</div>
            <div className="s3-hero-desc">
              Add every certification you hold — we verify each one at its source, so it carries real weight on every hiring team's screen.
            </div>
          </div>

          {/* ID RECAP */}
          <div className="s3-id-recap">
            <div className="check">✓</div>
            <div className="txt">
              <div className="lbl">FROM YOUR STAGE 01-02 · IDENTITY + FOUNDATION</div>
              <div className="val">{candidateName} · {candidateExp} · Trained at {academyName} · {specialty} · {candidateCity}</div>
              <div className="small">All locked. This stage adds your formal credentials on top.</div>
            </div>
            <div className="locked-badge">LOCKED</div>
          </div>

          {/* HOW STAGE 03 WORKS */}
          <div className="s3-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="s3-card-title">How Stage 03 Works</div>
              <button type="button" onClick={() => setShowHowItWorks((p) => !p)} style={{ background: "transparent", border: "none", color: "#64748B", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {showHowItWorks ? "Hide Details" : "Show Details"}
              </button>
            </div>
            {showHowItWorks && (
            <>
            <div className="s3-card-eyebrow">WHY IT MATTERS · WHAT WE VERIFY · GLOBAL · WHAT COMPANIES SEE</div>

            <div className="s3-rules-grid">
              <div className="s3-rule-tile">
                <div className="s3-rule-head">
                  <div className="s3-rule-ico">?</div>
                  <div className="s3-rule-title">Why we verify, not just accept uploads</div>
                </div>
                <div className="s3-rule-body">
                  Photoshopped certs are the #1 fraud vector in RCM hiring. We verify at
                  source: AAPC and AHIMA via live directory lookup; other bodies via Talentera
                  manual review within 3-5 days. Uploaded PDFs alone never count as verified.
                </div>
              </div>
              <div className="s3-rule-tile">
                <div className="s3-rule-head">
                  <div className="s3-rule-ico"><i className="fa-solid fa-lock" /></div>
                  <div className="s3-rule-title">What we verify</div>
                </div>
                <div className="s3-rule-body">
                  Member ID exists in the body's records · name matches your Aadhaar-locked
                  name · credential is current and active (not expired, suspended or revoked)
                  · issue date and credential type confirmed at source.
                </div>
              </div>
              <div className="s3-rule-tile">
                <div className="s3-rule-head">
                  <div className="s3-rule-ico"><i className="fa-solid fa-earth-asia" /></div>
                  <div className="s3-rule-title">Global means we surface you everywhere</div>
                </div>
                <div className="s3-rule-body">
                  Your CPC is recognized in US · your HIMAA in Australia · your CHIMA in Canada
                  · your DBP in dental practices worldwide. Talentera surfaces you to
                  companies wherever the credential is trusted — not just India.
                </div>
              </div>
              <div className="s3-rule-tile">
                <div className="s3-rule-head">
                  <div className="s3-rule-ico"><i className="fa-solid fa-eye" /></div>
                  <div className="s3-rule-title">What companies see</div>
                </div>
                <div className="s3-rule-body">
                  Body + cert name + last 4 digits of member ID + verified badge + expiry
                  date. Companies do NOT see: your full member ID, exam scores, or renewal
                  fee history. Full ID is hashed after verification.
                </div>
              </div>
            </div>
            </>
            )}

            <div className="s3-consent-pill">
              <span className="ico"><i className="fa-solid fa-globe" /></span>
              <span><i>Talentera queries AAPC and AHIMA member directories directly. Other bodies verified manually within 3-5 days.</i></span>
            </div>
          </div>

          {/* FORM TOOLBAR */}
          <div className="s3-form-toolbar">
            <div className="s3-progress-rail">
              <span>Progress:</span>
              <span className="s3-rail-dot done"></span>
              <span className="s3-rail-dot done"></span>
              <span className="s3-rail-dot active"></span>
              <span className="s3-rail-dot"></span>
              <span className="s3-rail-dot"></span>
              <span>Section 3 of 5</span>
            </div>
            <div className="s3-saved-badge">{savedBadge}</div>
          </div>

          <div className="s3-form-header">
            <h2>Your Stage 03 information</h2>
            <div className="sub">FILL IN · WE VERIFY · YOU EARN +15 POINTS</div>
          </div>

          {error && (
            <div style={{ background: "#FDECEA", color: "#C0392B", padding: "12px 16px", borderRadius: 10, fontWeight: 700, marginBottom: 16, border: "1px solid #F8D7DA" }}>
              {error}
            </div>
          )}

          {/* SECTION 1 · STATUS */}
          <div className="s3-section">
            <div className="s3-section-header">
              <div className="s3-section-num">1</div>
              <div className="s3-section-title">Certification Status</div>
              <div className="s3-status-chip">DONE · +2</div>
            </div>

            <div className="s3-field">
              <label>Where do you stand today? <span className="req">*</span></label>
              <div className="s3-helper" style={{ marginBottom: 10 }}>This branches your next steps. Change anytime.</div>
              <div className="s3-status-row">
                <div
                  className={`s3-status-card ${status === "certified" ? "selected" : ""}`}
                  onClick={() => {
                    setStatus("certified");
                    // Guard against the "NON-CERT" sentinel (written for the Non-Certified path) ever
                    // being carried over as a real, selected certification code.
                    if (selectedCertCode === "NON-CERT") {
                      setSelectedCertCode(bodyData?.certs?.[0]?.code || "CPC");
                    }
                  }}
                >
                  <div className="ico"><i className="fa-solid fa-trophy" /></div>
                  <div className="title">Certified</div>
                  <div className="sub">I already hold one or more professional certifications.</div>
                  <span className="badge-hint">Highest company visibility</span>
                </div>
                <div
                  className={`s3-status-card ${status === "pursuing" ? "selected" : ""}`}
                  onClick={() => setStatus("pursuing")}
                >
                  <div className="ico"><i className="fa-solid fa-book-open" /></div>
                  <div className="title">Pursuing</div>
                  <div className="sub">I've booked an exam or I'm actively preparing.</div>
                  <span className="badge-hint yellow">Bridging path via Assessment</span>
                </div>
                <div
                  className={`s3-status-card ${status === "non-certified" ? "selected warn" : ""}`}
                  onClick={() => setStatus("non-certified")}
                >
                  <div className="ico"></div>
                  <div className="title">Not Certified</div>
                  <div className="sub">
                    {isExperienced
                      ? "Relying on direct on-the-job coding experience and production accuracy."
                      : "No cert and no immediate plan — I'll rely on other credentials."}
                  </div>
                  <span className={`badge-hint ${isExperienced ? "blue" : "red"}`}>
                    {isExperienced ? "Evaluated on work experience" : "Lower visibility to top companies"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 · YOUR CERTIFICATIONS (Visible if certified) */}
          {status === "certified" && (
            <div className="s3-section">
              <div className="s3-section-header">
                <div className="s3-section-num">2</div>
                <div className="s3-section-title">Your Certifications</div>
                <div className="s3-status-chip active">IN PROGRESS · +15</div>
              </div>

              {/* Region Cascade */}
              <div className="s3-field" style={{ position: "relative" }}>
                <label>Step 1 · Region <span className="req">*</span></label>
                <div className="s3-helper" style={{ marginBottom: 8 }}>Where was your certification issued?</div>
                <input
                  type="text"
                  placeholder="Search country..."
                  value={regionDropdownOpen ? regionSearch : `${selectedRegionObj.flag}  ${selectedRegionObj.name}`}
                  onFocus={() => {
                    setRegionDropdownOpen(true);
                    setRegionSearch("");
                  }}
                  onChange={(e) => {
                    setRegionSearch(e.target.value);
                    setRegionDropdownOpen(true);
                  }}
                  onBlur={() => setTimeout(() => setRegionDropdownOpen(false), 150)}
                />
                {regionDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      background: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                      marginTop: 4,
                      maxHeight: 280,
                      overflowY: "auto",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    }}
                  >
                    {filteredRegions.length === 0 && (
                      <div style={{ padding: "10px 14px", color: "#64748B", fontSize: 13 }}>
                        {`No countries match "${regionSearch}"`}
                      </div>
                    )}
                    {filteredRegions.map((r) => (
                      <div
                        key={r.id}
                        onMouseDown={() => {
                          handleRegionChange(r.id);
                          setRegionDropdownOpen(false);
                          setRegionSearch("");
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: selectedRegion === r.id ? "#FDF6E4" : "transparent",
                          fontWeight: selectedRegion === r.id ? 700 : 400,
                        }}
                      >
                        <span>{r.flag}  {r.name}</span>
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>{r.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Body Pills */}
              <div className="s3-field">
                <label>Step 2 · Issuing Body <span className="req">*</span></label>
                <div className="s3-helper" style={{ marginBottom: 8 }}>Filtered by your region.</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {availableBodies.map((b) => (
                    <span
                      key={b.key}
                      className={`s3-body-pill ${selectedBodyKey === b.key ? "selected" : ""}`}
                      onClick={() => handleBodySelect(b.key)}
                    >
                      {b.name} <span className="count">{b.count}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Cert Dropdown & Interactive Card */}
              <div className="s3-field">
                <label>Step 3 · Pick your certification <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="Search certifications by code or name..."
                  value={certSearch}
                  onChange={(e) => setCertSearch(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <select
                  value={selectedCertCode}
                  onChange={(e) => setSelectedCertCode(e.target.value)}
                >
                  {filteredCerts.length === 0 && (
                    <option value="" disabled>
                      {`No certifications match "${certSearch}"`}
                    </option>
                  )}
                  {filteredCerts.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flagText ? `${c.code} — ${c.name}` : `${c.code} — ${c.name}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Member ID and Verification URL */}
              <div className="s3-row">
                <div className={`s3-field ${formErrors.memberId ? "has-error" : ""}`}>
                  <label>Step 4a · Member / Cert ID <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. 01458267 (8 characters)"
                    value={memberId}
                    onChange={(e) => {
                      setMemberId(e.target.value);
                      if (formErrors.memberId) setFormErrors((prev) => ({ ...prev, memberId: "" }));
                      if (verificationResult) setVerificationResult(null);
                    }}
                    maxLength={14}
                  />
                  {formErrors.memberId && (
                    <div className="field-error-msg">{formErrors.memberId}</div>
                  )}
                  <div className="s3-helper">
                    {bodyData.name || "AAPC"} Member IDs must follow official body formats. Dummy & duplicate IDs are auto-flagged.
                  </div>
                </div>
                <div className="s3-field">
                  <label>Step 4b · Credential URL / Digital Badge Link</label>
                  <input
                    type="url"
                    placeholder="e.g. https://www.credly.com/badges/... or registry link"
                    value={certUrl}
                    onChange={(e) => {
                      setCertUrl(e.target.value);
                      if (verificationResult) setVerificationResult(null);
                    }}
                  />
                  <div className="s3-helper">
                    Credly / Accredible badge link, public certificate page, or official verify URL.
                  </div>
                </div>
              </div>

              {/* Official Registry Link & Authenticity Action Bar */}
              <div className="s3-verify-action-bar">
                <div className="s3-verify-action-info">
                  <span className="badge-ico"><i className="fa-solid fa-landmark" /></span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "var(--navy)" }}>
                      Official {bodyData.name || "AAPC"} Verification Registry
                    </div>
                    <div style={{ fontSize: 11, color: "var(--gray-mute)" }}>
                      Check real credential records directly against the issuing authority's registry
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {bodyData.verifyUrl && (
                    <a
                      href={bodyData.verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="s3-official-link-btn"
                    >
                      Official {bodyData.name} Registry ↗
                    </a>
                  )}
                  <button
                    type="button"
                    className="s3-verify-btn"
                    disabled={!memberId.trim() || isVerifying}
                    onClick={handleVerifyCredential}
                  >
                    {isVerifying ? "Checking Authenticity…" : "Verify Credential (Real vs Fake Check)"}
                  </button>
                </div>
              </div>

              {verifyError && (
                <div style={{ background: "var(--red-soft)", color: "var(--red)", padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                  {verifyError}
                </div>
              )}

              {/* Dates */}
              <div className="s3-row-3">
                <div className="s3-field">
                  <label>Issue Month & Year <span className="req">*</span></label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <select
                      value={issueMonth}
                      onChange={(e) => setIssueMonth(e.target.value)}
                    >
                      <option value="">Month…</option>
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.val} value={m.val}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={issueYear}
                      onChange={(e) => setIssueYear(e.target.value)}
                    >
                      <option value="">Year…</option>
                      {PAST_YEAR_OPTIONS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="s3-field">
                  <label>Expiry Month & Year <span className="req">*</span></label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <select
                      value={expiryMonth}
                      onChange={(e) => setExpiryMonth(e.target.value)}
                    >
                      <option value="">Month…</option>
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.val} value={m.val}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={expiryYear}
                      onChange={(e) => setExpiryYear(e.target.value)}
                    >
                      <option value="">Year…</option>
                      {FUTURE_YEAR_OPTIONS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="s3-helper">Powers renewal reminders 60 days before expiry.</div>
                </div>
                <div className="s3-field">
                  <label>Currently active? <span className="req">*</span></label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div
                      className={`s3-option-item ${isActive ? "selected" : ""}`}
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => setIsActive(true)}
                    >
                      <div className="dot"></div>
                      <div>Yes</div>
                    </div>
                    <div
                      className={`s3-option-item ${!isActive ? "selected" : ""}`}
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => setIsActive(false)}
                    >
                      <div className="dot"></div>
                      <div>No</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="s3-field" style={{ maxWidth: 320 }}>
                <label>Exam Score / Percentage Achieved (optional)</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="e.g. 88"
                    value={certPercentage}
                    onChange={(e) => setCertPercentage(e.target.value)}
                    style={{ paddingRight: 30 }}
                  />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray-mute)", fontSize: 13, fontWeight: 700, pointerEvents: "none" }}>
                    %
                  </span>
                </div>
                <div className="s3-helper">Your exam score, shown on your resume and verified profile if provided.</div>
              </div>

              <div className="s3-field">
                <label>Last CEU Completed (Month & Year)</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 360 }}>
                  <select
                    value={lastCeuMonth}
                    onChange={(e) => setLastCeuMonth(e.target.value)}
                  >
                    <option value="">Month…</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.val} value={m.val}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={lastCeuYear}
                    onChange={(e) => setLastCeuYear(e.target.value)}
                  >
                    <option value="">Year…</option>
                    {PAST_YEAR_OPTIONS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="s3-helper">AAPC requires 36 CEUs per 2 years. AHIMA requires 20 per year. We track this for you.</div>
              </div>

              {/* Doc Link */}
              <div className="s3-doclink">
                <div className="ico"><i className="fa-solid fa-folder" /></div>
                <div className="txt">
                  <div className="title">Certificate document vault linked</div>
                  <div className="sub">Stored securely in platform vault · linked to verified credentials on your profile</div>
                </div>
                <span className="go" onClick={() => setIsVaultOpen(true)}>
                  Open Vault →
                </span>
              </div>

              {/* Dynamic Authenticity Verification Strip (Real vs Fake) */}
              {isVerifying ? (
                <div className="s3-verify-strip loading">
                  <div className="badge-dot yellow" style={{ background: "var(--blue)" }}><i className="fa-solid fa-hourglass-half" /></div>
                  <div style={{ flex: 1 }}>
                    <div className="title" style={{ color: "var(--blue)" }}>Analyzing Credential Authenticity in Real-Time…</div>
                    <div className="body">Validating ID pattern formatting, checking cross-candidate duplicate registrations, and testing live URL reachability.</div>
                  </div>
                </div>
              ) : verificationResult?.verdict === "REAL" ? (
                <div className="s3-verify-strip real">
                  <div className="badge-dot green">✓</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <div className="title" style={{ color: "var(--green)" }}>
                        REAL CREDENTIAL CONFIRMED · {verificationResult.trustScore}% Trust Score
                      </div>
                      <span className="s3-cert-tag" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
                        AUTHENTICATED
                      </span>
                    </div>
                    <div className="body" style={{ marginTop: 4 }}>
                      Member ID <b>{memberId}</b> conforms to {verificationResult.issuingBody} official standards and is unique in the Talentera registry.
                      {verificationResult.checks?.url?.reachable && (
                        <span> · Live verification link confirmed active on <b>{verificationResult.checks.url.domain}</b>.</span>
                      )}
                    </div>
                    {verificationResult.reasons && verificationResult.reasons.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "var(--green)", display: "flex", flexDirection: "column", gap: 2 }}>
                        {verificationResult.reasons.map((r, i) => (
                          <div key={i}>✓ {r}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : verificationResult?.verdict === "FAKE" ? (
                <div className="s3-verify-strip fake">
                  <div className="badge-dot red">✕</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <div className="title" style={{ color: "var(--red)" }}>
                        FAKE / SUSPICIOUS CREDENTIAL DETECTED · 0% Trust Score
                      </div>
                      <span className="s3-cert-tag" style={{ background: "var(--red-soft)", color: "var(--red)" }}>
                        FLAGGED FAKE
                      </span>
                    </div>
                    <div className="body" style={{ marginTop: 4, color: "#991B1B" }}>
                      This credential failed authenticity verification and cannot be confirmed as genuine:
                    </div>
                    {verificationResult.reasons && verificationResult.reasons.length > 0 && (
                      <div style={{ marginTop: 8, background: "#FFF", padding: "8px 12px", borderRadius: 8, border: "1px solid #FECACA", fontSize: 11.5, color: "#B91C1C", display: "flex", flexDirection: "column", gap: 3 }}>
                        {verificationResult.reasons.map((r, i) => (
                          <div key={i} style={{ fontWeight: 600 }}>• {r}</div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#7F1D1D", marginTop: 6, fontStyle: "italic" }}>
                      Warning: Submitting falsified credentials or dummy IDs violates Talentera Terms of Service and will trigger profile suspension.
                    </div>
                  </div>
                </div>
              ) : verificationResult?.verdict === "NEEDS_AUDIT" ? (
                <div className="s3-verify-strip pending">
                  <div className="badge-dot yellow"><i className="fa-solid fa-circle" /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <div className="title" style={{ color: "var(--amber)" }}>
                        FORMAT VALID · PENDING PROOF URL / AUDIT
                      </div>
                      <span className="s3-cert-tag" style={{ background: "var(--gold-pale)", color: "var(--gold-deep)" }}>
                        {verificationResult.trustScore}% Score
                      </span>
                    </div>
                    <div className="body" style={{ marginTop: 4 }}>
                      Member ID follows valid {verificationResult.issuingBody} standard format and is unique. To complete 100% automated verification, enter your digital credential link above or upload certificate document in the vault.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="s3-verify-strip" style={{ background: "#F8FAFC", border: "1.5px dashed #CBD5E1" }}>
                  <div className="badge-dot" style={{ background: "#94A3B8" }}><i className="fa-solid fa-circle-info" /></div>
                  <div style={{ flex: 1 }}>
                    <div className="title" style={{ color: "#334155" }}>Authenticity Check: Pending Test</div>
                    <div className="body">
                      Enter your Member ID and optional Credential URL above, then click <b>"Verify Credential"</b> to run the real vs fake authenticity check.
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Cert Stack */}
              <div style={{ marginTop: 24 }}>
                <label style={{ marginBottom: 10 }}>Your added certifications</label>
                {certStack.length === 0 ? (
                  <div style={{ padding: "14px 16px", background: "#F8FAFC", borderRadius: 10, border: "1px dashed #CBD5E1", fontSize: 13, color: "#64748B", marginBottom: 12 }}>
                    No additional certifications added to stack yet. Click below to stack additional credentials.
                  </div>
                ) : (
                  <div className="s3-cert-stack">
                    {certStack.map((item, idx) => (
                      <div key={idx} className="s3-cert-card-mini">
                        <div className={`s3-cert-mini-logo ${item.logoClass || ""}`}>{item.code}</div>
                        <div className="s3-cert-mini-info">
                          <div className="title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span>{item.name}</span>
                            {item.certUrl && (
                              <a
                                href={item.certUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, color: "var(--blue)", textDecoration: "none", fontWeight: 700 }}
                              >
                                Link ↗
                              </a>
                            )}
                          </div>
                          <div className="meta">
                            {item.body} · {item.region} · Issued {item.issueDate || "—"} · Renews {item.expiryDate || "—"}{Number.isFinite(item.percentage) ? ` · Score ${item.percentage}%` : ""}
                          </div>
                        </div>
                        <div className="s3-cert-mini-id">ID ****{item.memberId ? item.memberId.slice(-4) : "—"}</div>
                        <div className={`s3-cert-mini-badge ${item.badgeClass || "green"}`}>
                          {item.badgeClass === "green" ? <i className="fa-solid fa-circle" /> : item.badgeClass === "red" ? <i className="fa-solid fa-circle" /> : <i className="fa-solid fa-circle" />} {item.status || (item.isReal === true ? "Real · Verified" : item.isReal === false ? "Fake · Invalid" : "Pending Review")}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCertFromStack(idx)}
                          style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer", fontWeight: 700, padding: "0 6px", fontSize: 16 }}
                          title="Remove credential"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" className="s3-add-cert-btn" onClick={handleAddCertToStack}>
                  + Add another certification
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3 · PURSUING DETAILS (Visible if pursuing) — shown as step 2 since it's mutually exclusive with the Certified/Non-Certified sections */}
          {status === "pursuing" && (
            <div className="s3-section">
              <div className="s3-section-header">
                <div className="s3-section-num">2</div>
                <div className="s3-section-title">Pursuing Details</div>
                <div className="s3-status-chip active">IN PROGRESS · +10</div>
              </div>

              <div className="s3-row">
                <div className="s3-field">
                  <label>Target Certification <span className="req">*</span></label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {[
                      { id: "coding", label: "Coding" },
                      { id: "billing", label: "Billing" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (pursuingTrack === t.id) return;
                          setPursuingTrack(t.id);
                          setPursuingCert(t.id === "billing" ? PURSUING_BILLING_CERTS[0].code : PURSUING_CODING_CERTS[0].code);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: 13,
                          cursor: "pointer",
                          border: `1.5px solid ${pursuingTrack === t.id ? "var(--gold)" : "#E2E8F0"}`,
                          background: pursuingTrack === t.id ? "#FFFBEB" : "#fff",
                          color: "var(--navy)",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <select value={pursuingCert} onChange={(e) => setPursuingCert(e.target.value)}>
                    {(pursuingTrack === "billing" ? PURSUING_BILLING_CERTS : PURSUING_CODING_CERTS).map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                    {![...PURSUING_CODING_CERTS, ...PURSUING_BILLING_CERTS].some((c) => c.code === pursuingCert) && (
                      <option value={pursuingCert}>{pursuingCert}</option>
                    )}
                  </select>
                </div>
                <div className="s3-field">
                  <label>Expected Exam Month & Year <span className="req">*</span></label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <select
                      value={expectedExamMonth}
                      onChange={(e) => setExpectedExamMonth(e.target.value)}
                    >
                      <option value="">Month…</option>
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.val} value={m.val}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={expectedExamYear}
                      onChange={(e) => setExpectedExamYear(e.target.value)}
                    >
                      <option value="">Year…</option>
                      {FUTURE_YEAR_OPTIONS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="s3-row">
                <div className="s3-field">
                  <label>Preparation Source</label>
                  <input
                    type="text"
                    placeholder="e.g. AAPC Official Course, Academy, Self-study"
                    value={prepSource}
                    onChange={(e) => setPrepSource(e.target.value)}
                  />
                </div>
                <div className="s3-field">
                  <label>Confidence Level</label>
                  <select value={prepConfidence} onChange={(e) => setPrepConfidence(e.target.value)}>
                    <option value="High">High — Ready to test</option>
                    <option value="Medium">Medium — Halfway through syllabus</option>
                    <option value="Starting">Just starting prep</option>
                  </select>
                </div>
              </div>

              <div className="s3-row">
                <div className="s3-field">
                  <label>
                    Membership / Registration Number
                    <span className="s3-helper" style={{ fontWeight: 500, fontStyle: "normal" }}> (optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AAPC Member ID, if you already have one"
                    value={pursuingMemberId}
                    onChange={(e) => setPursuingMemberId(e.target.value)}
                  />
                  <div className="s3-helper">
                    Already registered with the issuing body while you prep for the exam? Add your member / registration ID here.
                  </div>
                </div>
              </div>

              <div className="s3-helper-card" style={{ marginTop: 14 }}>
                <div className="ico"><i className="fa-solid fa-flask" /></div>
                <div className="txt">
                  <b>Bridging Path Active:</b> As a pursuing candidate, completing Stage 04 (Foundation Assessment) unlocks your verified candidate badge while your certification exam is pending.
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4 · NON-CERTIFIED (Visible if non-certified fresher) — shown as step 2 since it's mutually exclusive with the Certified/Pursuing sections */}
          {status === "non-certified" && !isExperienced && (
            <div className="s3-section">
              <div className="s3-section-header">
                <div className="s3-section-num">2</div>
                <div className="s3-section-title">Non-Certified Decision</div>
                <div className="s3-status-chip pending">NOTICE</div>
              </div>

              <div className="s3-warn-card">
                <div className="s3-warn-head">
                  <div className="ico"><i className="fa-solid fa-triangle-exclamation" /></div>
                  <div className="s3-warn-title">What a Non-Certified Candidate Experience Looks Like</div>
                </div>
                <div className="s3-warn-body">
                  <b>~87% of RCM companies filter for certified candidates before shortlisting.</b><br />
                  Without a cert, your visibility drops sharply. You can still clear Stage 04 Assessment and stay in the pool — but top-tier companies filter uncertified freshers out at the first pass.
                </div>
                <div className="s3-warn-actions">
                  <button
                    type="button"
                    className="s3-action-btn outline"
                    onClick={() => toast("Recorded decision as Non-Certified Candidate.", <i className="fa-solid fa-circle-info" />)}
                  >
                    I understand · Proceed as Non-Certified
                  </button>
                  <button
                    type="button"
                    className="s3-link-btn"
                    onClick={() => setStatus("pursuing")}
                  >
                    ← Go back and pick Pursuing
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STICKY BOTTOM BAR */}
          <div className="s3-sticky-bar">
            <div className="s3-sticky-progress">
              <div className="s3-stick-bar-inner">
                <div className="s3-stick-bar-fill"></div>
              </div>
              <div><b>50 / 100</b> · Stage 03 in progress</div>
            </div>
            <div className="s3-sticky-actions">
              <button
                type="button"
                className="s3-action-btn"
                onClick={handleSaveAndContinue}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save & continue to Stage 04 →"}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Academic & Certification Document Vault Layout */}
      <DocumentVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        candidate={candidate}
        onVaultUpdated={(data) => {
          if (onSaved) onSaved(data, { advance: false });
        }}
      />
    </div>
  );
}
