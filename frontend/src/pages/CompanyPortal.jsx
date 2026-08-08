import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function CompanyPortal() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState(70);
  const [selectedExp, setSelectedExp] = useState("All");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [shortlistedIds, setShortlistedIds] = useState([]);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await fetch("/api/public/candidates");
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (c.verificationScore < minScore) return false;
    if (selectedExp !== "All" && c.experience !== selectedExp) return false;
    if (selectedDomain !== "All" && !c.currentRole.toLowerCase().includes(selectedDomain.toLowerCase())) return false;
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

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA" }}>
      {/* ====== STICKY NAVBAR ====== */}
      <nav style={{ background: "var(--navy)", padding: "16px 36px", color: "#fff", position: "sticky", top: 0, zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-dark)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => navigate("/")}>
          <svg width="40" height="40" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 8H46V18H32V44H20V18H6V8Z" fill="#E5A82E"/>
            <path d="M6 8L20 18V44L6 34V8Z" fill="#FFFFFF"/>
            <path d="M32 8L46 18H32V8Z" fill="#F5C95B"/>
          </svg>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "#fff", lineHeight: 1 }}>
              Talentera
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold)", marginTop: 4 }}>
              COMPANY HIRING PORTAL
            </div>
          </div>
        </div>

        <Link
          to="/"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            padding: "8px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none"
          }}
        >
          ← Back to Home
        </Link>
      </nav>

      {/* ====== HERO HEADER BANNER ====== */}
      <section
        style={{
          background: "radial-gradient(ellipse at top, #0F2950 0%, var(--navy-deep) 100%)",
          color: "#fff",
          padding: "70px 24px 80px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Background Grid Pattern */}
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
          {/* Eyebrow Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(229,168,46,0.12)",
              border: "1px solid rgba(229,168,46,0.35)",
              color: "var(--gold-light)",
              padding: "7px 18px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              marginBottom: 24
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />
            FOR RCM HIRING TEAMS · INDIA-FIRST · PAY ON HIRE
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(42px, 6vw, 76px)",
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              marginBottom: 20
            }}
          >
            Hire RCM talent that's <br />
            <span style={{ color: "var(--gold)", fontStyle: "italic" }}>in your city.</span>
            <span style={{ color: "var(--gold)", fontWeight: 300, marginLeft: 4 }}>|</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", maxWidth: 720, margin: "0 auto 12px", lineHeight: 1.55 }}>
            Stop sifting 200 resumes for 1 hire. Talentera sends you <strong style={{ color: "#fff" }}>5 verified, specialty-precise candidates</strong> — ready to interview in 24 hours.
          </p>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 32 }}>
            14-day average time-to-hire · 88% offer-acceptance rate · Pay only when you hire.
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginBottom: 28 }}>
            <button
              className="btn-gold"
              style={{ padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 800 }}
              onClick={() => navigate("/companies/register")}
            >
              + Post a Job
            </button>
            <button
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                padding: "14px 24px",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer"
              }}
              onClick={() => navigate("/companies/register")}
            >
              🔍 Hire Verified Candidates
            </button>
          </div>

          {/* Registration Sub-link */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 40, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            <span>New to Talentera?</span>
            <Link
              to="/companies/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(229,168,46,0.1)",
                border: "1px solid rgba(229,168,46,0.3)",
                color: "var(--gold)",
                padding: "5px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none"
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--gold)" }} />
              Register your company free →
            </Link>
          </div>

          {/* Stats Card */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: "18px 12px",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              maxWidth: 720,
              margin: "0 auto",
              backdropFilter: "blur(10px)"
            }}
          >
            <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>14</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.65)", letterSpacing: "0.1em", marginTop: 6 }}>DAYS TO HIRE</div>
            </div>
            <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>88%</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.65)", letterSpacing: "0.1em", marginTop: 6 }}>OFFER ACCEPTANCE</div>
            </div>
            <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>4-Layer</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.65)", letterSpacing: "0.1em", marginTop: 6 }}>VERIFICATION</div>
            </div>
            <div style={{ padding: "4px 8px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>30-Day</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.65)", letterSpacing: "0.1em", marginTop: 6 }}>REPLACEMENT</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== SEARCH & CANDIDATE DIRECTORY SECTION ====== */}
      <div id="directory" className="container" style={{ padding: "36px 0 60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
          {/* FILTER SIDEBAR */}
          <aside style={{ background: "#fff", borderRadius: 12, padding: 22, border: "1px solid var(--border-light)", alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, margin: 0 }}>Filter Talent</h3>
              <button style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }} onClick={() => { setMinScore(0); setSelectedExp("All"); setSelectedDomain("All"); setSearchQuery(""); }}>
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
                      border: "none"
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
                  <button key={tag} onClick={() => setSearchQuery(tag)} style={{ background: "#F1F5F9", fontSize: 11, padding: "3px 8px", borderRadius: 4, color: "var(--navy)", border: "none", fontWeight: 600 }}>
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
            </div>

            {/* Candidates Grid */}
            {loading ? (
              <div style={{ textAlign: "center", padding: 40 }}>Loading candidates...</div>
            ) : filteredCandidates.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, padding: 40, textAlign: "center", border: "1px dashed var(--border-light)" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <h4>No verified candidates match your criteria.</h4>
                <p style={{ fontSize: 13, color: "#64748B" }}>Try resetting your score slider or search query.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {filteredCandidates.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCandidate(c)}
                    style={{
                      background: "#fff", borderRadius: 12, padding: 20, border: "1px solid var(--border-light)",
                      cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 12
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, fontFamily: "var(--font-display)" }}>
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--navy)", display: "flex", alignItems: "center", gap: 6 }}>
                            {c.name} {c.aadhaarVerified && <span style={{ color: "#22C55E", fontSize: 14 }}>✓</span>}
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

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(229,168,46,0.15)", color: "#92400E", fontWeight: 700 }}>
                        {c.city}
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

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)" }}>View Verified Profile →</span>
                      <button
                        onClick={(e) => toggleShortlist(c.id, e)}
                        style={{
                          background: shortlistedIds.includes(c.id) ? "#15803D" : "var(--gold)",
                          color: shortlistedIds.includes(c.id) ? "#fff" : "var(--navy)",
                          padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700
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

      {/* ====== CANDIDATE RESUME MODAL ====== */}
      {selectedCandidate && (
        <div className="modal-overlay" onClick={() => setSelectedCandidate(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button style={{ position: "absolute", top: 16, right: 16, fontSize: 24, cursor: "pointer", background: "none", border: "none" }} onClick={() => setSelectedCandidate(null)}>
              ✕
            </button>

            <div style={{ padding: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, fontFamily: "var(--font-display)", textAlign: "center", lineHeight: "60px" }}>
                    {selectedCandidate.name.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, margin: 0 }}>
                      {selectedCandidate.name} {selectedCandidate.aadhaarVerified && <span style={{ color: "#22C55E" }}>✓ Aadhaar Verified</span>}
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

              {/* Verified Checklist */}
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em", marginBottom: 10 }}>VERIFICATION AUDIT BREAKDOWN</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
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

              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button className="btn-gold" style={{ flex: 1, justifyContent: "center" }} onClick={() => alert(`Connecting with ${selectedCandidate.name}...`)}>
                  📞 Contact Candidate
                </button>
                <button
                  style={{ flex: 1, padding: 12, borderRadius: 8, background: shortlistedIds.includes(selectedCandidate.id) ? "#15803D" : "#F1F5F9", color: shortlistedIds.includes(selectedCandidate.id) ? "#fff" : "var(--navy)", fontWeight: 700 }}
                  onClick={() => toggleShortlist(selectedCandidate.id)}
                >
                  {shortlistedIds.includes(selectedCandidate.id) ? "Shortlisted ✓" : "+ Shortlist Profile"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
