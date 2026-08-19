import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import companyApi from "../api/companyClient";
import { useCompanyAuth } from "../context/CompanyAuthContext";

// Maps a domain filter option to the words that actually show up in a
// candidate's free-text `currentRole`. Plain "includes(selectedDomain)"
// used to miss real matches - e.g. selecting "Medical Coding (CPC)"
// checked currentRole for the substring "coding", but candidates are
// listed with roles like "Medical Coder", which doesn't contain "coding"
// at all, so coders were being filtered out of their own category.
const DOMAIN_KEYWORDS = {
  Coding: ["coding", "coder", "cpc"],
  AR: ["ar caller", "ar executive", "ar follow", "accounts receivable"],
  Billing: ["billing", "claims"],
  Denial: ["denial"],
  Payment: ["payment"],
};

export default function CompanyPortal() {
  const navigate = useNavigate();
  const { company, logout } = useCompanyAuth();

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState(70);
  const [selectedExp, setSelectedExp] = useState("All");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [shortlistedIds, setShortlistedIds] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);

  // Verification & Access State
  const [companyKycStatus, setCompanyKycStatus] = useState("pending");
  const [contactCandidateModal, setContactCandidateModal] = useState(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    city: "Bengaluru",
    experience: "1-3",
    currentRole: "Medical Coder",
    academyName: "Apex Medical Coding Institute",
    certificationName: "CPC Certified (AAPC)",
    assessmentScore: 90,
    accuracyScore: 96,
    summary: "",
    noticePeriod: "Immediate Joiner",
    expectedCtc: "5.0 LPA",
  });

  useEffect(() => {
    fetchCandidates();
    fetchCompanyProfile();
  }, []);

  useEffect(() => {
    if (company?.kycStatus) {
      setCompanyKycStatus(company.kycStatus);
    }
  }, [company]);

  const fetchCompanyProfile = async () => {
    try {
      const res = await companyApi.get("/company/me");
      if (res.data?.company) {
        setCompanyKycStatus(res.data.company.kycStatus || "pending");
      }
    } catch (err) {
      console.log("No active company session or error loading profile:", err?.message);
    }
  };

  // Masking helpers for unverified companies
  const maskEmail = (email) => {
    if (!email) return "••••••••@••••.com";
    const parts = email.split("@");
    if (parts.length !== 2) return "••••••••@••••.com";
    const [name, domain] = parts;
    const maskedName = name.length > 2 ? name.substring(0, 2) + "••••" : name + "••••";
    return `${maskedName}@${domain}`;
  };

  const maskMobile = (mobile) => {
    if (!mobile) return "+91 98765 XXXXX";
    return mobile.replace(/(\+?\d{2,4}\s?\d{2,5})\d{4,5}/, "$1 XXXXX");
  };

  const isVerifiedCompany = companyKycStatus === "verified";

  const fetchCandidates = async () => {
    setLoadError(null);
    try {
      // Using companyApi (not a plain fetch) so a logged-in, verified
      // company's auth token is sent along - the backend now decides
      // server-side whether to return real or masked contact info based on
      // that token, so it has to actually reach the request.
      const res = await companyApi.get("/public/candidates");
      setCandidates(res.data?.candidates || []);
    } catch (err) {
      console.error(err);
      setLoadError("Couldn't load the candidate directory. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidateSubmit = async (e) => {
    e.preventDefault();
    if (!company) {
      alert("Please log in to your company account before adding a candidate profile.");
      setShowAddModal(false);
      navigate("/companies/login");
      return;
    }
    setAddingCandidate(true);
    try {
      const res = await companyApi.post("/public/candidate", formData);
      alert(res.data?.message || "Candidate added successfully!");
      setShowAddModal(false);
      setFormData({
        fullName: "",
        email: "",
        mobile: "",
        city: "Bengaluru",
        experience: "1-3",
        currentRole: "Medical Coder",
        academyName: "Apex Medical Coding Institute",
        certificationName: "CPC Certified (AAPC)",
        assessmentScore: 90,
        accuracyScore: 96,
        summary: "",
        noticePeriod: "Immediate Joiner",
        expectedCtc: "5.0 LPA",
      });
      fetchCandidates();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error adding candidate.");
    } finally {
      setAddingCandidate(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (c.verificationScore < minScore) return false;
    if (selectedExp !== "All" && c.experience !== selectedExp) return false;
    if (selectedDomain !== "All") {
      const roleText = c.currentRole.toLowerCase();
      const keywords = DOMAIN_KEYWORDS[selectedDomain] || [selectedDomain.toLowerCase()];
      if (!keywords.some((kw) => roleText.includes(kw))) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchRole = c.currentRole.toLowerCase().includes(q);
      const matchSummary = c.summary.toLowerCase().includes(q);
      const matchCity = c.city.toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchSummary && !matchCity) return false;
    }
    return true;
  });

  const toggleShortlist = (id, e) => {
    if (e) e.stopPropagation();
    setShortlistedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleContactClick = (candidate, e) => {
    if (e) e.stopPropagation();
    if (isVerifiedCompany) {
      setContactCandidateModal(candidate);
    } else {
      setShowUnlockModal(true);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA" }}>
      {/* ====== STICKY NAVBAR ====== */}
      <nav style={{ background: "var(--navy)", padding: "14px 36px", color: "#fff", position: "sticky", top: 0, zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-dark)" }}>
        <div style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: 16 }} onClick={() => { logout(); navigate("/"); }}>
          <img src="/logo.png" alt="Talentera" style={{ height: 38, width: "auto" }} />
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, letterSpacing: "0.14em", color: "var(--gold)" }}>
              COMPANY HIRING PORTAL
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Candidate Directory & Audit Database</div>
          </div>
        </div>

        {/* Company Verification Badge & Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              background: isVerifiedCompany ? "rgba(34, 197, 94, 0.15)" : "rgba(245, 158, 11, 0.15)",
              border: `1px solid ${isVerifiedCompany ? "#22C55E" : "#F59E0B"}`,
              fontSize: 12,
              fontWeight: 700,
              color: isVerifiedCompany ? "#4ADE80" : "#FBBF24"
            }}
          >
            <span>{isVerifiedCompany ? "✓" : "🔒"}</span>
            <span>{isVerifiedCompany ? "Verified Company (Full Access Unlocked)" : "Unverified Account (Gated Access)"}</span>
            {/* <button
              title="Toggle status for testing"
              onClick={() => setCompanyKycStatus((prev) => (prev === "verified" ? "pending" : "verified"))}
              style={{
                marginLeft: 6,
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: 4,
                color: "#fff",
                fontSize: 10,
                padding: "2px 6px",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              Demo Switch ⇄
            </button> */}
          </div>

          <Link
            to="/"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none"
            }}
          >
            ← Home
          </Link>
        </div>
      </nav>

      {/* ====== HERO HEADER BANNER ====== */}
      <section
        style={{
          background: "radial-gradient(ellipse at top, #0F2950 0%, var(--navy-deep) 100%)",
          color: "#fff",
          padding: "50px 24px 60px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            pointerEvents: "none"
          }}
        />

        <div className="container" style={{ position: "relative", zIndex: 2, maxWidth: 960, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(229,168,46,0.12)",
              border: "1px solid rgba(229,168,46,0.35)",
              color: "var(--gold-light)",
              padding: "6px 16px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              marginBottom: 18
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />
            FOR RCM HIRING TEAMS · INDIA-FIRST · VERIFIED CANDIDATE DIRECTORY
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 5vw, 64px)",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              marginBottom: 16
            }}
          >
            Browse Verified RCM Candidates <br />
            <span style={{ color: "var(--gold)", fontStyle: "italic" }}>
              {isVerifiedCompany ? "with Full Contact & Profile Access" : "🔒 Verify Account to Unlock Full Profiles"}
            </span>
          </h1>

          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", maxWidth: 720, margin: "0 auto 12px", lineHeight: 1.55 }}>
            Talentera connects healthcare hiring managers with <strong style={{ color: "#fff" }}>verified, specialty-audited candidates</strong> ready to interview in 24 hours.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginTop: 20, flexWrap: "wrap" }}>
            {!isVerifiedCompany ? (
              <button
                className="btn-gold"
                style={{ padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 800, background: "#F59E0B", color: "#1E293B" }}
                onClick={() => navigate("/companies/dashboard")}
              >
                🔒 Verify Company Account (Stage 1A KYC) →
              </button>
            ) : (
              <button
                className="btn-gold"
                style={{ padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 800 }}
                onClick={() => navigate("/companies/dashboard")}
              >
                ✓ Dashboard & Job Posting
              </button>
            )}

            <button
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer"
              }}
              onClick={() => {
                if (!company) {
                  alert("Please log in to your company account to add a candidate profile.");
                  navigate("/companies/login");
                  return;
                }
                setShowAddModal(true);
              }}
            >
              + Add Candidate Profile
            </button>
          </div>
        </div>
      </section>

      {/* ====== SEARCH & CANDIDATE DIRECTORY SECTION ====== */}
      <div id="directory" className="container" style={{ padding: "30px 0 60px" }}>
        {/* Verification Status Banner */}
        {!isVerifiedCompany ? (
          <div
            style={{
              background: "#FFFBEB",
              border: "1.5px solid #F59E0B",
              borderRadius: 12,
              padding: "18px 24px",
              marginBottom: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              boxShadow: "0 4px 14px rgba(245,158,11,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                🔒
              </div>
              <div>
                <strong style={{ fontSize: 14.5, color: "#92400E", letterSpacing: "0.02em" }}>
                  UNVERIFIED COMPANY ACCOUNT — CANDIDATE CONTACTS & PROFILES GATED
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#B45309", lineHeight: 1.45 }}>
                  Unverified companies see masked contacts & gated profiles. Complete your <strong>Account &amp; KYC Verification (Stage 1A)</strong> in your dashboard to unlock full candidate phone numbers, emails, and direct interview scheduling.
                </p>
              </div>
            </div>
            <button
              type="button"
              style={{
                background: "#D97706",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onClick={() => navigate("/companies/dashboard")}
            >
              Verify Account & Unlock Full Access →
            </button>
          </div>
        ) : (
          <div
            style={{
              background: "#F0FDF4",
              border: "1.5px solid #22C55E",
              borderRadius: 12,
              padding: "16px 24px",
              marginBottom: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              boxShadow: "0 4px 14px rgba(34,197,94,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                ✓
              </div>
              <div>
                <strong style={{ fontSize: 14, color: "#15803D" }}>
                  VERIFIED COMPANY ACCOUNT — FULL ACCESS UNLOCKED
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#166534" }}>
                  You have complete access to candidate direct contact numbers, email addresses, detailed chart audits, and interview scheduling.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="cp-directory-grid" style={{ gap: 24 }}>
          {/* FILTER SIDEBAR */}
          <aside style={{ background: "#fff", borderRadius: 12, padding: 22, border: "1px solid var(--border-light)", alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, margin: 0 }}>Filter Talent</h3>
              <button style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700, border: "none", background: "none", cursor: "pointer" }} onClick={() => { setMinScore(0); setSelectedExp("All"); setSelectedDomain("All"); setSearchQuery(""); }}>
                Reset
              </button>
            </div>

            {/* Score Slider */}
            <div style={{ marginBottom: 22, paddingBottom: 22, borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, fontWeight: 700, color: "#64748B" }}>
                <span>MIN VERIFICATION SCORE</span>
                <span style={{ color: "var(--navy)", fontFamily: "var(--font-mono)" }}>{minScore}/100</span>
              </div>
              <input
                type="range"
                min="0"
                max="95"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--gold)", cursor: "pointer" }}
              />
              <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700, marginTop: 6 }}>
                {minScore >= 75 ? "⭐ Showing Gold-Badged Verified Talent Only" : "Showing all verified scores"}
              </div>
            </div>

            {/* Experience Filter */}
            <div style={{ marginBottom: 22, paddingBottom: 22, borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", marginBottom: 12 }}>
                EXPERIENCE LEVEL
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["All", "Fresher", "1-3", "3-5", "5+"].map((exp) => (
                  <button
                    key={exp}
                    onClick={() => setSelectedExp(exp)}
                    style={{
                      padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                      background: selectedExp === exp ? "var(--navy)" : "#F1F5F9",
                      color: selectedExp === exp ? "#fff" : "var(--navy)",
                      border: "none", cursor: "pointer"
                    }}
                  >
                    {exp === "1-3" || exp === "3-5" ? `${exp} yrs` : exp === "5+" ? "5+ yrs" : exp}
                  </button>
                ))}
              </div>
            </div>

            {/* Domain Filter */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", marginBottom: 12 }}>
                RCM SPECIALIZATION
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["All", "AR", "Coding", "Billing", "Denial", "Payment"].map((domain) => (
                  <label key={domain} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="domain"
                      checked={selectedDomain === domain}
                      onChange={() => setSelectedDomain(domain)}
                      style={{ accentColor: "var(--gold)" }}
                    />
                    {domain === "AR" ? "AR Follow-up" : domain === "Coding" ? "Medical Coding (CPC)" : domain === "Billing" ? "Billing & Claims" : domain === "Denial" ? "Denial Management" : domain === "Payment" ? "Payment Posting" : "All Roles"}
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* MAIN RESULTS AREA */}
          <main>
            {/* Search Bar */}
            <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", marginBottom: 16, border: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px" }}>
                <span style={{ color: "#94A3B8" }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search by candidate name, skill (CPC, Denial, Payment Posting), or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 14, fontFamily: "var(--font-body)" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>Popular:</span>
                {["CPC Certified", "AR Caller", "Denial Management", "Bengaluru"].map((tag) => (
                  <button key={tag} onClick={() => setSearchQuery(tag)} style={{ background: "#F1F5F9", fontSize: 11, padding: "3px 8px", borderRadius: 4, color: "var(--navy)", border: "none", fontWeight: 600, cursor: "pointer" }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 }}>
                Verified Candidates <span style={{ color: "var(--gold)" }}>({filteredCandidates.length})</span>
              </h3>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                {isVerifiedCompany ? "🔓 Full Profile & Direct Contacts Unlocked" : "🔒 Contacts Masked (Unverified Account)"}
              </div>
            </div>

            {/* Candidates Grid */}
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#64748B" }}>Loading verified candidate database...</div>
            ) : loadError ? (
              <div style={{ background: "#FEF2F2", borderRadius: 12, padding: 40, textAlign: "center", border: "1px dashed #FCA5A5" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
                <h4 style={{ color: "#B91C1C" }}>{loadError}</h4>
                <button
                  onClick={() => { setLoading(true); fetchCandidates(); }}
                  style={{ marginTop: 12, background: "#B91C1C", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                >
                  Retry
                </button>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, padding: 40, textAlign: "center", border: "1px dashed var(--border-light)" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <h4>No verified candidates match your criteria.</h4>
                <p style={{ fontSize: 13, color: "#64748B" }}>Try resetting your score slider or search query.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {filteredCandidates.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCandidate(c)}
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      padding: 20,
                      border: "1px solid var(--border-light)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, fontFamily: "var(--font-display)" }}>
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--navy)", display: "flex", alignItems: "center", gap: 6 }}>
                            {c.name} {c.aadhaarVerified && <span style={{ color: "#22C55E", fontSize: 14 }} title="Aadhaar Verified">✓</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748B" }}>{c.currentRole} • {c.experience} yrs</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "var(--navy)", lineHeight: 1 }}>
                          {c.verificationScore}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--gold)", fontWeight: 800, letterSpacing: "0.06em" }}>{c.badgeLabel}</div>
                      </div>
                    </div>

                    {/* Contact Info Box - Verified vs Unverified */}
                    <div
                      style={{
                        background: isVerifiedCompany ? "#F0FDF4" : "#FFFBEB",
                        border: `1px solid ${isVerifiedCompany ? "#BBF7D0" : "#FDE68A"}`,
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: isVerifiedCompany ? "#166534" : "#92400E", fontWeight: 600 }}>
                          📧 {isVerifiedCompany ? c.email : maskEmail(c.email)}
                        </span>
                        {!isVerifiedCompany && <span style={{ fontSize: 10, background: "#F59E0B", color: "#fff", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>LOCKED</span>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: isVerifiedCompany ? "#166534" : "#92400E", fontWeight: 600 }}>
                          📞 {isVerifiedCompany ? c.mobile : maskMobile(c.mobile)}
                        </span>
                        {isVerifiedCompany && <span style={{ fontSize: 10, color: "#15803D", fontWeight: 700 }}>✓ Verified</span>}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(229,168,46,0.15)", color: "#92400E", fontWeight: 700 }}>
                        📍 {c.city}
                      </span>
                      {c.academyName && (
                        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "#DCFCE7", color: "#15803D", fontWeight: 700 }}>
                          Academy Verified
                        </span>
                      )}
                      {c.certificationName && (
                        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "#DBEAFE", color: "#1E40AF", fontWeight: 700 }}>
                          {c.certificationName}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0 }}>
                      {c.summary}
                    </p>

                    {/* Bottom Action Footer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 10, borderTop: "1px solid #F1F5F9", gap: 8 }}>
                      <button
                        onClick={(e) => handleContactClick(c, e)}
                        style={{
                          background: isVerifiedCompany ? "#166534" : "#D97706",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 12px",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {isVerifiedCompany ? "📞 Contact Candidate" : "🔒 Unlock Contact"}
                      </button>

                      <button
                        onClick={(e) => toggleShortlist(c.id, e)}
                        style={{
                          background: shortlistedIds.includes(c.id) ? "#15803D" : "var(--gold)",
                          color: shortlistedIds.includes(c.id) ? "#fff" : "var(--navy)",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {shortlistedIds.includes(c.id) ? "Shortlisted ✓" : "Shortlist"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ====== CANDIDATE RESUME / PROFILE MODAL ====== */}
      {selectedCandidate && (
        <div className="modal-overlay" onClick={() => setSelectedCandidate(null)}>
          <div className="modal-content" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <button style={{ position: "absolute", top: 16, right: 16, fontSize: 24, cursor: "pointer", background: "none", border: "none" }} onClick={() => setSelectedCandidate(null)}>
              ✕
            </button>

            <div style={{ padding: 32 }}>
              {/* Header Status Callout */}
              {!isVerifiedCompany ? (
                <div style={{ background: "#FFFBEB", border: "1px solid #F59E0B", borderRadius: 8, padding: "10px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#92400E", fontWeight: 700 }}>
                    🔒 Candidate Contacts & Full Profile Gated (Unverified Company)
                  </span>
                  <button
                    style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}
                    onClick={() => navigate("/companies/dashboard")}
                  >
                    Verify Account to Unlock →
                  </button>
                </div>
              ) : (
                <div style={{ background: "#F0FDF4", border: "1px solid #22C55E", borderRadius: 8, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#15803D", fontWeight: 800 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>
                    Full Candidate Profile & Direct Contact Details Unlocked for Verified Company
                  </span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, fontFamily: "var(--font-display)", textAlign: "center", lineHeight: "60px" }}>
                    {selectedCandidate.name.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, margin: 0 }}>
                      {selectedCandidate.name} {selectedCandidate.aadhaarVerified && <span style={{ color: "#22C55E", fontSize: 18 }} title="Aadhaar Verified">✓ Aadhaar Verified</span>}
                    </h2>
                    <div style={{ fontSize: 14, color: "#64748B" }}>{selectedCandidate.currentRole} • {selectedCandidate.city}</div>
                  </div>
                </div>

                <div style={{ background: "rgba(229,168,46,0.15)", padding: "10px 16px", borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>
                    {selectedCandidate.verificationScore}<span style={{ fontSize: 16, color: "#94A3B8" }}>/100</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--gold)", letterSpacing: "0.06em", marginTop: 4 }}>
                    {selectedCandidate.badgeLabel}
                  </div>
                </div>
              </div>

              {/* Direct Contact Info Box */}
              <div
                style={{
                  background: isVerifiedCompany ? "#F0FDF4" : "#F8FAFC",
                  border: `1.5px solid ${isVerifiedCompany ? "#86EFAC" : "#CBD5E1"}`,
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <h4 style={{ fontSize: 12, fontWeight: 800, color: isVerifiedCompany ? "#166534" : "#475569", letterSpacing: "0.08em", marginBottom: 8, margin: 0 }}>
                  {isVerifiedCompany ? "🔓 UNLOCKED CANDIDATE CONTACT DETAILS" : "🔒 CANDIDATE CONTACT DETAILS (GATED)"}
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10, fontSize: 13.5 }}>
                  <div>
                    <strong style={{ color: "#64748B" }}>EMAIL ADDRESS: </strong>
                    <span style={{ color: "var(--navy)", fontWeight: 700 }}>
                      {isVerifiedCompany ? selectedCandidate.email : maskEmail(selectedCandidate.email)}
                    </span>
                    {!isVerifiedCompany && <span style={{ marginLeft: 6, fontSize: 11, color: "#D97706", fontWeight: 700 }}>🔒 Locked</span>}
                  </div>
                  <div>
                    <strong style={{ color: "#64748B" }}>MOBILE NUMBER: </strong>
                    <span style={{ color: "var(--navy)", fontWeight: 700 }}>
                      {isVerifiedCompany ? selectedCandidate.mobile : maskMobile(selectedCandidate.mobile)}
                    </span>
                    {!isVerifiedCompany && <span style={{ marginLeft: 6, fontSize: 11, color: "#D97706", fontWeight: 700 }}>🔒 Locked</span>}
                  </div>
                  <div>
                    <strong style={{ color: "#64748B" }}>AVAILABILITY / NOTICE: </strong>
                    <span style={{ color: "var(--navy)", fontWeight: 700 }}>{selectedCandidate.noticePeriod}</span>
                  </div>
                  <div>
                    <strong style={{ color: "#64748B" }}>EXPECTED CTC: </strong>
                    <span style={{ color: "var(--navy)", fontWeight: 700 }}>{selectedCandidate.expectedCtc}</span>
                  </div>
                </div>
              </div>

              {/* Verified Audit Breakdown */}
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em", marginBottom: 10, margin: 0 }}>VERIFICATION AUDIT BREAKDOWN</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginTop: 10 }}>
                  <div>✓ Basic Identity: <strong style={{ color: "#15803D" }}>Aadhaar Verified</strong></div>
                  <div>✓ Academy Claim: <strong style={{ color: "#15803D" }}>{selectedCandidate.academyName || "Verified Partner"}</strong></div>
                  <div>✓ Proctored Test: <strong style={{ color: "#15803D" }}>{selectedCandidate.assessmentScore}% Score</strong></div>
                  <div>✓ Live Chart Audit: <strong style={{ color: "#15803D" }}>{selectedCandidate.accuracyScore}% Accuracy ({selectedCandidate.chartsAudited} Charts)</strong></div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em", marginBottom: 6 }}>CANDIDATE SUMMARY</h4>
                <p style={{ fontSize: 14, color: "var(--navy)", lineHeight: 1.6 }}>{selectedCandidate.summary}</p>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                {isVerifiedCompany ? (
                  <button
                    className="btn-gold"
                    style={{ flex: 1, minWidth: 160, justifyContent: "center" }}
                    onClick={() => setContactCandidateModal(selectedCandidate)}
                  >
                    📞 Contact Candidate
                  </button>
                ) : (
                  <button
                    type="button"
                    style={{ flex: 1, minWidth: 160, padding: 12, borderRadius: 8, background: "#D97706", color: "#fff", border: "none", fontWeight: 800, cursor: "pointer" }}
                    onClick={() => setShowUnlockModal(true)}
                  >
                    🔒 Verify Account to Unlock Contacts
                  </button>
                )}

                <button
                  style={{ flex: 1, minWidth: 140, padding: 12, borderRadius: 8, background: shortlistedIds.includes(selectedCandidate.id) ? "#15803D" : "#F1F5F9", color: shortlistedIds.includes(selectedCandidate.id) ? "#fff" : "var(--navy)", fontWeight: 700, border: "none", cursor: "pointer" }}
                  onClick={() => toggleShortlist(selectedCandidate.id)}
                >
                  {shortlistedIds.includes(selectedCandidate.id) ? "Shortlisted ✓" : "+ Shortlist Profile"}
                </button>

                <Link
                  to={`/verify/${selectedCandidate.id}`}
                  target="_blank"
                  style={{ padding: "12px 16px", borderRadius: 8, background: "var(--navy)", color: "#fff", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  🔗 Public Audit Page
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== CONTACT CANDIDATE MODAL (VERIFIED COMPANIES) ====== */}
      {contactCandidateModal && (
        <div className="modal-overlay" onClick={() => setContactCandidateModal(null)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <button style={{ position: "absolute", top: 16, right: 16, fontSize: 22, cursor: "pointer", background: "none", border: "none" }} onClick={() => setContactCandidateModal(null)}>
              ✕
            </button>
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#DCFCE7", color: "#15803D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  📞
                </div>
                <div>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>
                    Contact {contactCandidateModal.name}
                  </h3>
                  <div style={{ fontSize: 12, color: "#15803D", fontWeight: 700 }}>
                    ✓ Verified Company Direct Access
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>
                You have full verified access to candidate contact information. Use the options below to reach out directly:
              </p>

              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>MOBILE NUMBER</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", marginTop: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{contactCandidateModal.mobile}</span>
                    <a
                      href={`tel:${contactCandidateModal.mobile.replace(/\s+/g, "")}`}
                      style={{ background: "#166534", color: "#fff", textDecoration: "none", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                    >
                      Call Now
                    </a>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>EMAIL ADDRESS</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", marginTop: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{contactCandidateModal.email}</span>
                    <a
                      href={`mailto:${contactCandidateModal.email}`}
                      style={{ background: "var(--navy)", color: "#fff", textDecoration: "none", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                    >
                      Send Email
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  style={{ flex: 1, padding: 12, borderRadius: 8, background: "#F1F5F9", border: "none", fontWeight: 700, cursor: "pointer" }}
                  onClick={() => setContactCandidateModal(null)}
                >
                  Close
                </button>
                <button
                  className="btn-gold"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    alert(`Interview invitation sent to ${contactCandidateModal.name}! Candidate will receive your email/SMS prompt.`);
                    setContactCandidateModal(null);
                  }}
                >
                  Schedule Interview →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== UNLOCK PROMPT MODAL (UNVERIFIED COMPANIES) ====== */}
      {showUnlockModal && (
        <div className="modal-overlay" onClick={() => setShowUnlockModal(false)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <button style={{ position: "absolute", top: 16, right: 16, fontSize: 22, cursor: "pointer", background: "none", border: "none" }} onClick={() => setShowUnlockModal(false)}>
              ✕
            </button>
            <div style={{ padding: 28, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FEF3C7", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>
                🔒
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: "var(--navy)" }}>
                Account Verification Required
              </h3>
              <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.55, marginBottom: 20 }}>
                To view candidate phone numbers, email addresses, and schedule direct interviews, your company must complete <strong>Stage 1A Account &amp; KYC Verification</strong>.
              </p>

              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "12px 16px", marginBottom: 24, textAlign: "left", fontSize: 12.5, color: "#B45309" }}>
                <strong>Why verify?</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  <li>Direct candidate contact numbers &amp; emails</li>
                  <li>1-click interview scheduling &amp; status tracking</li>
                  <li>Full candidate video introductions &amp; chart audits</li>
                </ul>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  style={{ flex: 1, padding: 12, borderRadius: 8, background: "#F1F5F9", border: "none", fontWeight: 700, cursor: "pointer" }}
                  onClick={() => setShowUnlockModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-gold"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    setShowUnlockModal(false);
                    navigate("/companies/dashboard");
                  }}
                >
                  Verify Account Now →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== ADD CANDIDATE MODAL ====== */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddCandidateSubmit} style={{ padding: 32 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                + Add Real Candidate Profile
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
                Enter real candidate data to persist directly into MongoDB database.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>FULL NAME</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Srikant Reddy"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>EMAIL</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="srikant@example.com"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>MOBILE NUMBER</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>CITY</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Hyderabad"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>EXPERIENCE</label>
                  <select
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  >
                    <option value="Fresher">Fresher</option>
                    <option value="1-3">1-3 yrs</option>
                    <option value="3-5">3-5 yrs</option>
                    <option value="5+">5+ yrs</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>ROLE / DOMAIN</label>
                  <input
                    type="text"
                    value={formData.currentRole}
                    onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })}
                    placeholder="e.g. Senior AR Caller"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>ACADEMY NAME</label>
                  <input
                    type="text"
                    value={formData.academyName}
                    onChange={(e) => setFormData({ ...formData, academyName: e.target.value })}
                    placeholder="Apex Medical Coding Institute"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>CERTIFICATION</label>
                  <input
                    type="text"
                    value={formData.certificationName}
                    onChange={(e) => setFormData({ ...formData, certificationName: e.target.value })}
                    placeholder="CPC Certified (AAPC)"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>TEST SCORE (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.assessmentScore}
                    onChange={(e) => setFormData({ ...formData, assessmentScore: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>CHART ACCURACY (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.accuracyScore}
                    onChange={(e) => setFormData({ ...formData, accuracyScore: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>PROFILE SUMMARY</label>
                <textarea
                  rows="2"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Summary of experience and RCM expertise..."
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={addingCandidate}
                >
                  {addingCandidate ? "Saving..." : "Save Candidate →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
