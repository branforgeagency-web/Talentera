import React, { useState, useMemo } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import { CERT_LIBRARY, CERT_ID_PATTERNS } from "../../data/certLibrary";
import DocumentVaultModal from "../DocumentVaultModal.jsx";
import WizardCompanionRail from "./WizardCompanionRail.jsx";

const REGIONS = [
  { id: "us", name: "United States", flag: "🇺🇸", count: "55 certs" },
  { id: "uk", name: "United Kingdom", flag: "🇬🇧", count: "6 certs" },
  { id: "ca", name: "Canada", flag: "🇨🇦", count: "5 certs" },
  { id: "au", name: "Australia", flag: "🇦🇺", count: "4 certs" },
  { id: "other", name: "Other", flag: "🌐", count: "10+ certs" },
];

const BODIES_BY_REGION = {
  us: [
    { key: "aapc", name: "AAPC", count: 25 },
    { key: "ahima", name: "AHIMA", count: 8 },
    { key: "bmsc", name: "BMSC", count: 4 },
    { key: "acdis", name: "ACDIS", count: 2 },
    { key: "nahri", name: "NAHRI", count: 1 },
    { key: "danb", name: "DANB", count: 3 },
    { key: "aadom", name: "AADOM", count: 3 },
  ],
  uk: [
    { key: "acca", name: "NCCQ (UK)", count: 3 },
    { key: "ihed", name: "IHRIM", count: 3 },
  ],
  ca: [
    { key: "chima", name: "CHIMA", count: 5 },
  ],
  au: [
    { key: "himaa", name: "HIMAA", count: 4 },
  ],
  other: [
    { key: "who", name: "WHO / Global Coding", count: 4 },
    { key: "dha", name: "DHA / MOH / DOH (UAE)", count: 6 },
  ],
};

const GLOBAL_MARKETS = [
  { id: "in", flag: "🇮🇳", label: "India offshore RCM (default)", tail: "CPC · CDC recognized" },
  { id: "us", flag: "🇺🇸", label: "United States — offshore night shift", tail: "CPC · CRC · CDC recognized" },
  { id: "uk", flag: "🇬🇧", label: "United Kingdom", tail: "May need UK-specific coding cert" },
  { id: "ae", flag: "🇦🇪", label: "UAE · Saudi · Middle East", tail: "AAPC recognized in most healthcare hubs" },
  { id: "ca", flag: "🇨🇦", label: "Canada", tail: "May need CHIMA equivalent" },
  { id: "au", flag: "🇦🇺", label: "Australia", tail: "May need HIMAA equivalent" },
  { id: "global", flag: "🌐", label: "Any global remote / hybrid opportunity", tail: "We'll surface anything with visa sponsorship" },
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
  const candidateExp = s1.experienceLevel || s1.experience || "Fresher";
  const academyName = s2.academyName || s2.instituteName || "Direct / Self-Trained";
  const specialty = s2.specialties?.[0] || s2.specialty || s2.domain || "Medical Coding";
  const candidateCity = s1.city || candidate.city || "—";

  // SECTION 1 · CERTIFICATION STATUS
  const [status, setStatus] = useState(
    existingData.certType === "non-certified" || existingData.nonCertified || existingData.isCertified === false
      ? "non-certified"
      : existingData.status || existingData.certType || "certified"
  );

  // SECTION 2 · CERTIFICATION REGION & BODY
  const [selectedRegion, setSelectedRegion] = useState("us");
  const [selectedBodyKey, setSelectedBodyKey] = useState(existingData.body || "aapc");

  const availableBodies = useMemo(() => {
    return BODIES_BY_REGION[selectedRegion] || BODIES_BY_REGION.us;
  }, [selectedRegion]);

  // Active Cert in dropdown
  const bodyData = CERT_LIBRARY[selectedBodyKey] || CERT_LIBRARY.aapc || { certs: [], name: "AAPC", fullName: "American Academy of Professional Coders" };
  const [selectedCertCode, setSelectedCertCode] = useState(existingData.certCode || bodyData?.certs?.[0]?.code || "CPC");

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
  const [pursuingCert, setPursuingCert] = useState(existingData.pursuingCert || "CPC");

  const rawExam = String(existingData.expectedExamDate || "").trim();
  const [expectedExamMonth, setExpectedExamMonth] = useState(
    existingData.expectedExamMonth || (rawExam.includes("/") ? rawExam.split("/")[0].padStart(2, "0") : "")
  );
  const [expectedExamYear, setExpectedExamYear] = useState(
    existingData.expectedExamYear || (rawExam.includes("/") ? rawExam.split("/")[1] : rawExam)
  );

  const [prepSource, setPrepSource] = useState(existingData.prepSource || "");
  const [prepConfidence, setPrepConfidence] = useState(existingData.prepConfidence || "High");

  // SECTION 5 · GLOBAL MARKETS
  const [selectedMarkets, setSelectedMarkets] = useState(
    Array.isArray(existingData.targetMarkets) && existingData.targetMarkets.length > 0
      ? existingData.targetMarkets
      : ["in", "us", "ae", "global"]
  );

  // UI state
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedBadge, setSavedBadge] = useState("✓ Saved just now");
  const [error, setError] = useState("");

  function handleRegionChange(regId) {
    setSelectedRegion(regId);
    const bodies = BODIES_BY_REGION[regId] || [];
    if (bodies.length > 0) {
      handleBodySelect(bodies[0].key);
    }
  }

  function handleBodySelect(bKey) {
    setSelectedBodyKey(bKey);
    const bInfo = CERT_LIBRARY[bKey] || CERT_LIBRARY.aapc;
    if (bInfo?.certs?.length > 0) {
      setSelectedCertCode(bInfo.certs[0].code);
    }
  }

  function handleToggleMarket(marketId) {
    if (selectedMarkets.includes(marketId)) {
      if (selectedMarkets.length === 1) {
        toast("Please keep at least one market selected.", "!");
        return;
      }
      setSelectedMarkets(selectedMarkets.filter((m) => m !== marketId));
    } else {
      setSelectedMarkets([...selectedMarkets, marketId]);
    }
  }

  // Build Payload
  function buildPayload(isDraft = false, customStack = null) {
    const isCertified = status === "certified";
    const isPursuing = status === "pursuing";
    const isNonCert = status === "non-certified";

    const formattedIssue = issueYear ? (issueMonth ? `${issueMonth}/${issueYear}` : issueYear) : "";
    const formattedExpiry = expiryYear ? (expiryMonth ? `${expiryMonth}/${expiryYear}` : expiryYear) : "";
    const formattedLastCeu = lastCeuYear ? (lastCeuMonth ? `${lastCeuMonth}/${lastCeuYear}` : lastCeuYear) : "";
    const formattedExam = expectedExamYear ? (expectedExamMonth ? `${expectedExamMonth}/${expectedExamYear}` : expectedExamYear) : "";

    const activeStack = customStack !== null ? customStack : certStack;

    let finalStack = activeStack;
    if (isCertified && finalStack.length === 0 && (memberId.trim() || selectedCertCode)) {
      const isReal = verificationResult ? verificationResult.isReal : null;
      const verdict = verificationResult ? verificationResult.verdict : "NEEDS_AUDIT";
      const statusText = verdict === "REAL" ? "Real · Verified" : (verdict === "FAKE" ? "Fake · Invalid" : "Pending Review");
      const badgeClass = verdict === "REAL" ? "green" : (verdict === "FAKE" ? "red" : "blue");
      finalStack = [
        {
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
      certCode: isCertified ? (finalStack[0]?.code || selectedCertCode) : isPursuing ? pursuingCert : "NON-CERT",
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
      isActive,
      lastCeuMonth,
      lastCeuYear,
      lastCeu: formattedLastCeu,
      certifications: finalStack,
      targetMarkets: selectedMarkets,
      pursuingDetails: isPursuing
        ? {
            cert: pursuingCert,
            expectedMonth: expectedExamMonth,
            expectedYear: expectedExamYear,
            expectedDate: formattedExam,
            prepSource,
            confidence: prepConfidence,
          }
        : null,
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
        toast("⚠️ Suspicious / fake credential pattern detected.", "!");
      } else {
        toast("Format verified! Pending official URL or document proof.", "ℹ");
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
        const msg = "Please enter your Member / Certification ID in Section 2.";
        setError(msg);
        toast(msg, "error", { title: "Mandatory Fields Required" });
        window.scrollTo({ top: 400, behavior: "smooth" });
        return;
      }
      if (verificationResult?.isFake) {
        const msg = "The entered credential failed authenticity verification (flagged fake/dummy). Please correct your Member ID or verification link.";
        setError(msg);
        toast(msg, "error", { title: "Invalid Credential" });
        window.scrollTo({ top: 400, behavior: "smooth" });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = buildPayload(false);
      const res = await api.put("/candidate/stage/3", payload);
      toast("Stage 03 · Certification saved successfully! (+20 pts)", "✓");
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
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          max-width: 1380px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 1080px) {
          .stage03-shell {
            grid-template-columns: 1fr;
          }
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
          {/* BREADCRUMB */}
          <div className="s3-breadcrumb">
            <span>Home</span>
            <span className="sep">›</span>
            <span>My Career Passport</span>
            <span className="sep">›</span>
            <span style={{ color: "var(--navy)", fontWeight: 800 }}>Stage 03 · Certification</span>
          </div>

          {/* HERO */}
          <div className="s3-hero">
            <div className="s3-hero-icon">🏆</div>
            <div className="s3-hero-badges">
              <span className="s3-hero-chip">STAGE 03 OF 08 · ACTIVE</span>
              <span className="s3-hero-chip gold">+20 POINTS</span>
              <span className="s3-hero-chip">~10 MIN</span>
            </div>
            <h1 className="s3-hero-title" style={{ color: "#ffffff" }}>Certification</h1>
            <div className="s3-hero-subtitle">The badge that follows your name — verified globally.</div>
            <div className="s3-hero-desc">
              Add every professional certification you hold — from AAPC and AHIMA to BMSC,
              DANB, HIMAA, CHIMA and beyond. We verify each one at its source, so your
              credentials carry the weight they deserve on every hiring team's screen.
            </div>
            <div className="s3-hero-tiles">
              <div className="s3-hero-tile">
                <div className="big">80+</div>
                <div className="small">certifications in library</div>
              </div>
              <div className="s3-hero-tile">
                <div className="big">API-Verified</div>
                <div className="small">AAPC + AHIMA at source</div>
              </div>
              <div className="s3-hero-tile">
                <div className="big">Multi-cert</div>
                <div className="small">stack all your credentials</div>
              </div>
              <div className="s3-hero-tile">
                <div className="big">Global</div>
                <div className="small">US · UK · CA · AU · UAE</div>
              </div>
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
            <div className="locked-badge">🔒 LOCKED</div>
          </div>

          {/* HOW STAGE 03 WORKS */}
          <div className="s3-card">
            <div className="s3-card-title">How Stage 03 Works</div>
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
                  <div className="s3-rule-ico">🔒</div>
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
                  <div className="s3-rule-ico">🌍</div>
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
                  <div className="s3-rule-ico">👁</div>
                  <div className="s3-rule-title">What companies see</div>
                </div>
                <div className="s3-rule-body">
                  Body + cert name + last 4 digits of member ID + verified badge + expiry
                  date. Companies do NOT see: your full member ID, exam scores, or renewal
                  fee history. Full ID is hashed after verification.
                </div>
              </div>
            </div>

            <div className="s3-consent-pill">
              <span className="ico">🌐</span>
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
            <div className="sub">FILL IN · WE VERIFY · YOU EARN +20 POINTS</div>
          </div>

          {error && (
            <div style={{ background: "#FDECEA", color: "#C0392B", padding: "12px 16px", borderRadius: 10, fontWeight: 700, marginBottom: 16, border: "1px solid #F8D7DA" }}>
              ⚠️ {error}
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
                  onClick={() => setStatus("certified")}
                >
                  <div className="ico">🏆</div>
                  <div className="title">Certified</div>
                  <div className="sub">I already hold one or more professional certifications.</div>
                  <span className="badge-hint">🟢 Highest company visibility</span>
                </div>
                <div
                  className={`s3-status-card ${status === "pursuing" ? "selected" : ""}`}
                  onClick={() => setStatus("pursuing")}
                >
                  <div className="ico">📖</div>
                  <div className="title">Pursuing</div>
                  <div className="sub">I've booked an exam or I'm actively preparing.</div>
                  <span className="badge-hint yellow">🟡 Bridging path via Assessment</span>
                </div>
                <div
                  className={`s3-status-card ${status === "non-certified" ? "selected warn" : ""}`}
                  onClick={() => setStatus("non-certified")}
                >
                  <div className="ico">⛔</div>
                  <div className="title">Not Certified</div>
                  <div className="sub">No cert and no immediate plan — I'll rely on other credentials.</div>
                  <span className="badge-hint red">🔴 Lower visibility to top companies</span>
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
              <div className="s3-field">
                <label>Step 1 · Region <span className="req">*</span></label>
                <div className="s3-helper" style={{ marginBottom: 8 }}>Where was your certification issued?</div>
                <div className="s3-region-row">
                  {REGIONS.map((r) => (
                    <div
                      key={r.id}
                      className={`s3-region-card ${selectedRegion === r.id ? "selected" : ""}`}
                      onClick={() => handleRegionChange(r.id)}
                    >
                      <div className="s3-region-flag">{r.flag}</div>
                      <div className="s3-region-name">{r.name}</div>
                      <div className="s3-region-count">{r.count}</div>
                    </div>
                  ))}
                </div>
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
                <select
                  value={selectedCertCode}
                  onChange={(e) => setSelectedCertCode(e.target.value)}
                >
                  {(bodyData?.certs || []).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flagText ? `⭐ ${c.code} — ${c.name}` : `${c.code} — ${c.name}`}
                    </option>
                  ))}
                </select>

                {/* Detail Card */}
                <div className="s3-cert-detail">
                  <div className="s3-cert-badge-row">
                    <span className="s3-cert-code-pill">{activeCertDetail.code}</span>
                    <span className="s3-cert-tag">⭐ Most Popular</span>
                    <span className="s3-cert-tag" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
                      🟢 API-Verified
                    </span>
                  </div>
                  <div className="s3-cert-title">{activeCertDetail.name}</div>
                  <div className="s3-cert-sub">{activeCertDetail.target}</div>
                  <div className="s3-cert-stats">
                    <div className="s3-cert-stat">
                      <div className="big">{activeCertDetail.time || "4 hrs"}</div>
                      <div className="small">Exam time</div>
                    </div>
                    <div className="s3-cert-stat">
                      <div className="big">{activeCertDetail.qs || 100}</div>
                      <div className="small">Questions</div>
                    </div>
                    <div className="s3-cert-stat">
                      <div className="big">${activeCertDetail.usd || 399}</div>
                      <div className="small">Exam fee ({activeCertDetail.inr || "~₹33,500"})</div>
                    </div>
                    <div className="s3-cert-stat">
                      <div className="big">2 yrs</div>
                      <div className="small">Renewal cycle</div>
                    </div>
                  </div>
                  <div className="s3-cert-desc">
                    {activeCertDetail.desc}
                    <br /><br />
                    <span className="lbl">Prerequisites: </span>{activeCertDetail.prereq}
                    <br />
                    <span className="lbl">Best for: </span>{activeCertDetail.bestFor}
                  </div>
                </div>
              </div>

              {/* Member ID and Verification URL */}
              <div className="s3-row">
                <div className="s3-field">
                  <label>Step 4a · Member / Cert ID <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. 01458267 (8 characters)"
                    value={memberId}
                    onChange={(e) => {
                      setMemberId(e.target.value);
                      if (verificationResult) setVerificationResult(null);
                    }}
                    maxLength={14}
                  />
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
                  <span className="badge-ico">🏛️</span>
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
                    {isVerifying ? "Checking Authenticity…" : "🔍 Verify Credential (Real vs Fake Check)"}
                  </button>
                </div>
              </div>

              {verifyError && (
                <div style={{ background: "var(--red-soft)", color: "var(--red)", padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                  ⚠️ {verifyError}
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
                <div className="ico">📁</div>
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
                  <div className="badge-dot yellow" style={{ background: "var(--blue)" }}>⏳</div>
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
                        🟢 REAL CREDENTIAL CONFIRMED · {verificationResult.trustScore}% Trust Score
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
                        🔴 FAKE / SUSPICIOUS CREDENTIAL DETECTED · 0% Trust Score
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
                      ⚠️ Warning: Submitting falsified credentials or dummy IDs violates Talentera Terms of Service and will trigger profile suspension.
                    </div>
                  </div>
                </div>
              ) : verificationResult?.verdict === "NEEDS_AUDIT" ? (
                <div className="s3-verify-strip pending">
                  <div className="badge-dot yellow">🟡</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <div className="title" style={{ color: "var(--amber)" }}>
                        🟡 FORMAT VALID · PENDING PROOF URL / AUDIT
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
                  <div className="badge-dot" style={{ background: "#94A3B8" }}>ℹ️</div>
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
                                🔗 Link ↗
                              </a>
                            )}
                          </div>
                          <div className="meta">
                            {item.body} · {item.region} · Issued {item.issueDate || "—"} · Renews {item.expiryDate || "—"}
                          </div>
                        </div>
                        <div className="s3-cert-mini-id">ID ****{item.memberId ? item.memberId.slice(-4) : "—"}</div>
                        <div className={`s3-cert-mini-badge ${item.badgeClass || "green"}`}>
                          {item.badgeClass === "green" ? "🟢" : item.badgeClass === "red" ? "🔴" : "🟡"} {item.status || (item.isReal === true ? "Real · Verified" : item.isReal === false ? "Fake · Invalid" : "Pending Review")}
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

          {/* SECTION 3 · PURSUING DETAILS (Visible if pursuing) */}
          {status === "pursuing" && (
            <div className="s3-section">
              <div className="s3-section-header">
                <div className="s3-section-num">3</div>
                <div className="s3-section-title">Pursuing Details</div>
                <div className="s3-status-chip active">IN PROGRESS · +10</div>
              </div>

              <div className="s3-row">
                <div className="s3-field">
                  <label>Target Certification <span className="req">*</span></label>
                  <select value={pursuingCert} onChange={(e) => setPursuingCert(e.target.value)}>
                    <option value="CPC">CPC — Certified Professional Coder</option>
                    <option value="CPC-A">CPC-A — Certified Professional Coder Apprentice</option>
                    <option value="COC">COC — Certified Outpatient Coder</option>
                    <option value="CIC">CIC — Certified Inpatient Coder</option>
                    <option value="CRC">CRC — Certified Risk Adjustment Coder</option>
                    <option value="CCS">CCS — Certified Coding Specialist (AHIMA)</option>
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

              <div className="s3-helper-card" style={{ marginTop: 14 }}>
                <div className="ico">🧪</div>
                <div className="txt">
                  <b>Bridging Path Active:</b> As a pursuing candidate, completing Stage 04 (Foundation Assessment) unlocks your verified candidate badge while your certification exam is pending.
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4 · NON-CERTIFIED (Visible if non-certified) */}
          {status === "non-certified" && (
            <div className="s3-section">
              <div className="s3-section-header">
                <div className="s3-section-num">4</div>
                <div className="s3-section-title">Non-Certified Decision</div>
                <div className="s3-status-chip pending">NOTICE</div>
              </div>

              <div className="s3-warn-card">
                <div className="s3-warn-head">
                  <div className="ico">⚠️</div>
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
                    onClick={() => toast("Recorded decision as Non-Certified Candidate.", "ℹ")}
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

          {/* SECTION 5 · GLOBAL MARKETS */}
          <div className="s3-section">
            <div className="s3-section-header">
              <div className="s3-section-num">5</div>
              <div className="s3-section-title">Global Markets — where should your certs work?</div>
              <div className="s3-status-chip">DONE · +3</div>
            </div>

            <div className="s3-field">
              <label>I'd like to be surfaced to companies in <span className="req">*</span></label>
              <div className="s3-helper" style={{ marginBottom: 8 }}>
                Pick every market where you want to be considered. Your certs get matched to the right regional bodies.
              </div>
              <div className="s3-option-list">
                {GLOBAL_MARKETS.map((m) => (
                  <div
                    key={m.id}
                    className={`s3-option-item ${selectedMarkets.includes(m.id) ? "selected" : ""}`}
                    onClick={() => handleToggleMarket(m.id)}
                  >
                    <div className="box">{selectedMarkets.includes(m.id) ? "✓" : ""}</div>
                    <span className="flag">{m.flag}</span>
                    <div>{m.label}</div>
                    <div className="tail">{m.tail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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

        {/* RIGHT SIDEBAR COLUMN */}
        <div className="s3-right" style={{ position: "sticky", top: 20, alignSelf: "start", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
          <WizardCompanionRail stageNum={3} candidate={candidate} certCount={certStack?.length || 1} />
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
