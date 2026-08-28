import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LiquidNavCapsule from "../components/LiquidNavCapsule";
import "../styles/forCompaniesPage.css";

export default function ForCompanies() {
  const navigate = useNavigate();

  // Demo Filter State
  const [activeTab, setActiveTab] = useState("all");

  // Inline Job Posting Modal / Form State
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobSubmitted, setJobSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [jobForm, setJobForm] = useState({
    companyName: "",
    workEmail: "",
    mobile: "",
    jobTitle: "",
    specialty: "Medical Coding",
    expRequired: "3-5 Yrs",
    certsNeeded: ["CPC"],
    positions: "2",
    shift: "US Night Shift",
    workModel: "Remote / WFH",
    description: ""
  });

  const toggleCert = (cert) => {
    setJobForm((prev) => {
      const exists = prev.certsNeeded.includes(cert);
      return {
        ...prev,
        certsNeeded: exists ? prev.certsNeeded.filter((c) => c !== cert) : [...prev.certsNeeded, cert]
      };
    });
  };

  const handleJobSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setJobSubmitted(true);
    }, 1000);
  };

  const openPostJob = (e) => {
    if (e) e.preventDefault();
    setShowJobModal(true);
    setJobSubmitted(false);
  };

  const candidatesDemo = [
    { name: "Priya S.", title: "ED Medical Coder", exp: "4 Yrs Exp", cert: "AAPC CPC Verified", audit: "98% ED Audit Score", shift: "Night Shift Ready", city: "Chennai", spec: "coding" },
    { name: "Karthik R.", title: "Inpatient Coder", exp: "6 Yrs Exp", cert: "AHIMA CCS Verified", audit: "96% IP Audit Score", shift: "Immediate Notice", city: "Hyderabad", spec: "auditing" },
    { name: "Anitha V.", title: "Billing & AR Specialist", exp: "5 Yrs Exp", cert: "RCM Certified", audit: "94% Denial Score", shift: "WFH / Hybrid", city: "Coimbatore", spec: "billing" },
    { name: "Suresh M.", title: "HCC Risk Adjustment", exp: "3 Yrs Exp", cert: "AAPC CRC Verified", audit: "95% Risk Score", shift: "Night Shift Ready", city: "Bangalore", spec: "hcc" },
    { name: "Deepika P.", title: "Surgical Coder", exp: "7 Yrs Exp", cert: "AAPC COC Verified", audit: "99% Surg Score", shift: "15-Day Notice", city: "Mumbai", spec: "coding" },
    { name: "Rahul T.", title: "AR Follow-up Lead", exp: "4 Yrs Exp", cert: "Billing Lead", audit: "93% AR Collection", shift: "Night Shift Ready", city: "Noida", spec: "billing" }
  ];

  const filteredCandidates = candidatesDemo.filter((c) => activeTab === "all" || c.spec === activeTab);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: "How is Talentera different from generic job portals like Naukri or Indeed?",
      a: "Traditional job portals are generic bulletin boards where anyone can upload unverified CVs. Talentera is an RCM-specialized talent platform where every candidate undergoes a 4-layer verification process: Aadhaar UIDAI identity verification, direct AAPC/AHIMA live API check, proctored specialty assessments, and 60-second video screening. You receive max 5 pre-screened, audit-ready profiles within 24 hours instead of 500 unvetted CVs."
    },
    {
      q: "How much does it cost to use Talentera?",
      a: "Talentera operates strictly on a Pay-on-Placement model. There are zero subscription fees, zero posting costs, and zero upfront retainers. You only pay a standard placement fee 30 days after a candidate successfully joins your team."
    },
    {
      q: "What is the 90-Day Free Replacement Guarantee?",
      a: "We stand behind candidate quality and retention. If a candidate hired through Talentera leaves or fails probation within their first 90 days, we immediately provide a 100% free replacement candidate from our verified pool."
    },
    {
      q: "Are candidate certifications really verified directly with AAPC & AHIMA?",
      a: "Yes! We run direct API validation checks against AAPC and AHIMA databases to verify member ID, active standing, certification type (CPC, CIC, COC, CRC, CCS), and issue dates. Zero expired certificates make it into the verified pool."
    },
    {
      q: "Can we hire candidates specifically for US night shifts?",
      a: "Absolutely. Candidates are pre-tagged for US night shift willingness, notice period, location preference, and remote/on-site readiness. You can filter your shortlist specifically for night shift coders or billers."
    }
  ];

  return (
    <div className="fco-page">
      {/* SECTION 1: HERO */}
      <section className="fco-hero">
        {/* Top Left Corner Back to Home Button */}
        <Link
          to="/"
          className="fco-btn-outline"
          style={{
            position: "absolute",
            top: 20,
            left: 24,
            zIndex: 100,
            display: "inline-flex",
            alignItems: "center",
            gap: 6
          }}
        >
          ← Back to Home
        </Link>

        <div className="fco-hero-bg-grid" />
        <div className="hero-clean-glow-1" />
        <div className="hero-clean-glow-2" />

        <div className="hero-particles">
          <span className="hero-particle hero-particle-1" />
          <span className="hero-particle hero-particle-2" />
          <span className="hero-particle hero-particle-3" />
          <span className="hero-particle hero-particle-4" />
          <span className="hero-particle hero-particle-5" />
          <span className="hero-particle hero-particle-6" />
        </div>

        <div className="container" style={{ position: "relative", zIndex: 2, paddingTop: 60 }}>
          <div className="fco-eyebrow">
            <i className="fa-solid fa-building-user" /> FOR RCM HIRING TEAMS · INDIA-FIRST
          </div>

          <h1 className="fco-hero-title">
            Hire RCM talent that's <br />
            <span style={{ color: "var(--gold-bright)" }}>actually verified.</span>
          </h1>

          <p className="fco-hero-sub">
            Stop sifting 200 resumes for 1 hire. Talentera sends you 5 hand-curated, specialty-precise verified candidates — ready to interview in 24 hours. Pay only when you hire.
          </p>

          <div className="fco-hero-ctas">
            <Link to="/companies/jobs" className="fco-btn-gold" style={{ padding: "14px 32px", fontSize: 16 }}>
              Post a Job / Requirement →
            </Link>
            <Link to="/companies/login" className="fco-btn-outline" style={{ padding: "14px 28px", fontSize: 16 }}>
              Access Hiring Portal
            </Link>
          </div>

          <div className="fco-stats-grid">
            <div>
              <div className="fco-stat-num">14 Days</div>
              <div className="fco-stat-lbl">Average Time to Hire</div>
            </div>
            <div>
              <div className="fco-stat-num">88%</div>
              <div className="fco-stat-lbl">Offer Acceptance Rate</div>
            </div>
            <div>
              <div className="fco-stat-num">12,480+</div>
              <div className="fco-stat-lbl">Verified RCM Candidates</div>
            </div>
            <div>
              <div className="fco-stat-num">₹0</div>
              <div className="fco-stat-lbl">Upfront Setup Cost</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE OLD WAY VS TALENTERA */}
      <section className="fco-section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="fco-section-head">
            <div className="fco-section-eyebrow">THE OLD HIRING WAY VS TALENTERA</div>
            <h2 className="fco-section-title">
              You've been hiring RCM talent the <span style={{ textDecoration: "line-through", color: "#ef4444" }}>wrong way.</span>
            </h2>
            <p className="fco-section-sub">
              Traditional agencies take 60 days and charge massive upfront fees for unverified resumes with fake experience claims.
            </p>
          </div>

          <div className="fco-pain-grid">
            <div className="fco-pain-card">
              <div className="fco-pain-icon"><i className="fa-solid fa-file-excel" /></div>
              <h3 className="fco-pain-title">200+ Unscreened Resumes</h3>
              <p className="fco-pain-desc">Wasting hiring manager hours interviewing candidates with fabricated CV experience claims.</p>
            </div>

            <div className="fco-pain-card">
              <div className="fco-pain-icon"><i className="fa-solid fa-clock-three" /></div>
              <h3 className="fco-pain-title">60-Day Time to Fill</h3>
              <p className="fco-pain-desc">Dragging out open seats while revenue cycle billing backlogs pile up and client SLAs slip.</p>
            </div>

            <div className="fco-pain-card">
              <div className="fco-pain-icon"><i className="fa-solid fa-certificate" /></div>
              <h3 className="fco-pain-title">Expired Credentials</h3>
              <p className="fco-pain-desc">Candidates claiming AAPC CPC or AHIMA CCS credentials that expired or were forged.</p>
            </div>

            <div className="fco-pain-card">
              <div className="fco-pain-icon"><i className="fa-solid fa-money-bill-transfer" /></div>
              <h3 className="fco-pain-title">20-30% Agency Retainers</h3>
              <p className="fco-pain-desc">Heavy upfront consultancy fees with zero retention guarantee if a candidate leaves in 30 days.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: 4-LAYER VERIFICATION PROCESS */}
      <section className="fco-section" style={{ background: "#ffffff" }}>
        <div className="container">
          <div className="fco-section-head">
            <div className="fco-section-eyebrow">OUR VERIFICATION ENGINE</div>
            <h2 className="fco-section-title">
              4 layers of verification. <span style={{ color: "var(--gold)" }}>100% audit-ready.</span>
            </h2>
            <p className="fco-section-sub">
              Every candidate in our pool undergoes rigorous multi-layer screening before their profile ever reaches your hiring desk.
            </p>
          </div>

          <div className="fco-layers-grid">
            <div className="fco-layer-card">
              <div className="fco-layer-badge">Layer 01</div>
              <i className="fa-solid fa-id-card" style={{ fontSize: 24, color: "var(--navy)" }} />
              <h3 className="fco-layer-title">Aadhaar Identity</h3>
              <p className="fco-layer-desc">Instant UIDAI OTP identity check eliminating ghost profiles & duplicate consultancy submissions.</p>
            </div>

            <div className="fco-layer-card">
              <div className="fco-layer-badge">Layer 02</div>
              <i className="fa-solid fa-shield-check" style={{ fontSize: 24, color: "var(--navy)" }} />
              <h3 className="fco-layer-title">Live Cert API Check</h3>
              <p className="fco-layer-desc">Direct API verification against AAPC & AHIMA databases for active member standing & cert dates.</p>
            </div>

            <div className="fco-layer-card">
              <div className="fco-layer-badge">Layer 03</div>
              <i className="fa-solid fa-laptop-code" style={{ fontSize: 24, color: "var(--navy)" }} />
              <h3 className="fco-layer-title">Proctored Audit Test</h3>
              <p className="fco-layer-desc">Specialty-specific coding & billing speed tests with verified 90%+ chart accuracy scores.</p>
            </div>

            <div className="fco-layer-card">
              <div className="fco-layer-badge">Layer 04</div>
              <i className="fa-solid fa-video" style={{ fontSize: 24, color: "var(--navy)" }} />
              <h3 className="fco-layer-title">Video & Voice Intro</h3>
              <p className="fco-layer-desc">60-second professional communication and domain screening verified by RCM domain experts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: BENEFITS (DARK NAVY) */}
      <section className="fco-section fco-benefits-section">
        <div className="container">
          <div className="fco-section-head">
            <div className="fco-section-eyebrow" style={{ color: "var(--gold-bright)" }}>WHY TRUST TALENTERA</div>
            <h2 className="fco-section-title fco-section-title-dark">
              Hire faster, scale higher, <span style={{ color: "var(--gold-bright)" }}>zero risk.</span>
            </h2>
            <p className="fco-section-sub fco-section-sub-dark">
              Built specifically for US healthcare RCM, medical coding, billing, and AR operations.
            </p>
          </div>

          <div className="fco-benefits-grid">
            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-user-check" /></div>
              <h3 className="fco-benefit-title">5 Hand-Curated Shortlists</h3>
              <p className="fco-benefit-desc">Receive max 5 top-matched, pre-screened candidates within 24 hours instead of 500 unvetted CVs.</p>
            </div>

            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-hand-holding-dollar" /></div>
              <h3 className="fco-benefit-title">Pay-on-Placement Model</h3>
              <p className="fco-benefit-desc">Zero subscription fees or setup costs. Pay only 30 days after a candidate successfully joins.</p>
            </div>

            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-arrows-rotate" /></div>
              <h3 className="fco-benefit-title">90-Day Free Replacement</h3>
              <p className="fco-benefit-desc">100% free replacement guarantee if a candidate leaves or fails probation within 90 days.</p>
            </div>

            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-moon" /></div>
              <h3 className="fco-benefit-title">US Shift & Commute Ready</h3>
              <p className="fco-benefit-desc">Filter candidates specifically for US night shift willingness, locality commute, and notice period.</p>
            </div>

            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-comments" /></div>
              <h3 className="fco-benefit-title">Direct Contact HR Dashboard</h3>
              <p className="fco-benefit-desc">Reach shortlisted candidates directly via WhatsApp, call, or email from your dashboard.</p>
            </div>

            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-file-circle-check" /></div>
              <h3 className="fco-benefit-title">Audit-Ready Compliance</h3>
              <p className="fco-benefit-desc">Instant access to candidate test scorecards, chart accuracy reports, and AAPC verified badges.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: TALENT DIRECTORY DEMO */}
      <section className="fco-section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="fco-section-head">
            <div className="fco-section-eyebrow">EXPLORE VERIFIED POOL</div>
            <h2 className="fco-section-title">
              Search 12,480+ pre-vetted <span style={{ color: "var(--gold)" }}>RCM professionals.</span>
            </h2>
            <p className="fco-section-sub">
              Preview verified profiles available for immediate interview across top RCM hubs.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="fco-filter-tabs">
            <button type="button" className={`fco-tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>All Specialties</button>
            <button type="button" className={`fco-tab ${activeTab === "coding" ? "active" : ""}`} onClick={() => setActiveTab("coding")}>Medical Coding</button>
            <button type="button" className={`fco-tab ${activeTab === "billing" ? "active" : ""}`} onClick={() => setActiveTab("billing")}>Medical Billing & AR</button>
            <button type="button" className={`fco-tab ${activeTab === "auditing" ? "active" : ""}`} onClick={() => setActiveTab("auditing")}>Chart Auditing</button>
            <button type="button" className={`fco-tab ${activeTab === "hcc" ? "active" : ""}`} onClick={() => setActiveTab("hcc")}>Risk Adjustment (HCC)</button>
          </div>

          {/* Candidate Cards Grid */}
          <div className="fco-cand-grid">
            {filteredCandidates.map((c, idx) => (
              <div key={idx} className="fco-cand-card">
                <div className="fco-cand-head">
                  <div className="fco-cand-name">{c.name}</div>
                  <span className="fco-cand-badge">{c.cert}</span>
                </div>
                <div className="fco-cand-meta">
                  {c.title} · {c.exp} · {c.city}
                </div>
                <div className="fco-cand-tags">
                  <span className="fco-cand-chip">{c.audit}</span>
                  <span className="fco-cand-chip">{c.shift}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center" }}>
            <Link to="/companies/jobs" className="fco-btn-gold" style={{ padding: "14px 32px", textDecoration: "none" }}>
              Request Candidate Shortlist / Post Job →
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 6: TESTIMONIALS */}
      <section className="fco-section" style={{ background: "#ffffff" }}>
        <div className="container">
          <div className="fco-section-head">
            <div className="fco-section-eyebrow">PROVEN CORPORATE RESULTS</div>
            <h2 className="fco-section-title">
              Trusted by leading <span style={{ color: "var(--gold)" }}>US healthcare RCM firms.</span>
            </h2>
          </div>

          <div className="fco-testi-grid">
            <div className="fco-testi-card">
              <p className="fco-testi-quote">
                "We filled 12 ED Coder seats in 14 days — would have taken our internal talent acquisition team 60 days the traditional agency way."
              </p>
              <div>
                <div className="fco-testi-author">Director of Talent Acquisition</div>
                <div className="fco-testi-role">Leading RCM Enterprise · 800+ Coders</div>
              </div>
            </div>

            <div className="fco-testi-card">
              <p className="fco-testi-quote">
                "The live AAPC credential API check eliminated fake certificate submissions completely. Every candidate interviewed was genuinely certified."
              </p>
              <div>
                <div className="fco-testi-author">VP of Global Operations</div>
                <div className="fco-testi-role">US Healthcare Billing Services</div>
              </div>
            </div>

            <div className="fco-testi-card">
              <p className="fco-testi-quote">
                "The pay-on-placement model with 90-day replacement guarantee saved us over ₹15 Lakhs in upfront consultancy retainers."
              </p>
              <div>
                <div className="fco-testi-author">Head of Human Resources</div>
                <div className="fco-testi-role">Healthcare Solutions Firm · Hyderabad</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: FAQ ACCORDION */}
      <section className="fco-section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="fco-section-head">
            <div className="fco-section-eyebrow">COMPANY FAQ</div>
            <h2 className="fco-section-title">Everything hiring managers ask.</h2>
          </div>

          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {faqs.map((faq, idx) => (
              <div key={idx} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div
                  style={{ padding: "18px 24px", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                >
                  <span>{faq.q}</span>
                  <span style={{ color: "var(--gold)" }}>{openFaq === idx ? "▲" : "▼"}</span>
                </div>
                {openFaq === idx && (
                  <div style={{ padding: "0 24px 18px", color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: BOTTOM CTA HERO */}
      <section className="fco-cta-hero">
        <div className="container">
          <h2 className="fco-hero-title">
            Transform your RCM hiring <span style={{ color: "var(--gold-bright)" }}>today.</span>
          </h2>
          <p className="fco-hero-sub">
            Join 342+ RCM companies hiring pre-verified coders and billers across India.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/companies/jobs" className="fco-btn-gold" style={{ padding: "14px 36px", fontSize: 16, textDecoration: "none" }}>
              + POST A JOB / REQUIREMENT NOW
            </Link>
            <Link to="/companies/login" className="fco-btn-outline" style={{ padding: "14px 32px", fontSize: 16 }}>
              COMPANY LOGIN
            </Link>
          </div>
        </div>
      </section>

      {/* INLINE JOB POSTING MODAL ON SAME PAGE */}
      {showJobModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(6, 21, 42, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: 24,
            maxWidth: 720,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            position: "relative",
            padding: 36
          }}>
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowJobModal(false)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "#f1f5f9",
                border: "none",
                width: 36,
                height: 36,
                borderRadius: "50%",
                fontSize: 18,
                fontWeight: 700,
                cursor: "pointer",
                color: "#64748b"
              }}
            >
              ✕
            </button>

            {!jobSubmitted ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ background: "rgba(229,168,46,0.15)", color: "var(--gold)", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                    ⚡ INSTANT REQUIREMENT POSTING
                  </span>
                </div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--navy)", marginBottom: 8 }}>
                  Post Your Job Requirement
                </h2>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
                  Fill out your hiring details below. Talentera will generate your curated 5-candidate shortlist within 24 hours.
                </p>

                <form onSubmit={handleJobSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                        Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Optum Global / Access Healthcare"
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }}
                        value={jobForm.companyName}
                        onChange={(e) => setJobForm({ ...jobForm, companyName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                        Work Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="hr@yourcompany.com"
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }}
                        value={jobForm.workEmail}
                        onChange={(e) => setJobForm({ ...jobForm, workEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                        Contact Mobile *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }}
                        value={jobForm.mobile}
                        onChange={(e) => setJobForm({ ...jobForm, mobile: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                        Job Title / Role *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Senior ED Coder / AR Specialist"
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }}
                        value={jobForm.jobTitle}
                        onChange={(e) => setJobForm({ ...jobForm, jobTitle: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                        Specialty
                      </label>
                      <select
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, background: "#fff" }}
                        value={jobForm.specialty}
                        onChange={(e) => setJobForm({ ...jobForm, specialty: e.target.value })}
                      >
                        <option value="Medical Coding">Medical Coding</option>
                        <option value="Medical Billing & AR">Medical Billing & AR</option>
                        <option value="ED Chart Auditing">ED Chart Auditing</option>
                        <option value="Inpatient Coding">Inpatient Coding</option>
                        <option value="HCC Risk Adjustment">HCC Risk Adjustment</option>
                        <option value="Denial Management">Denial Management</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                        Experience Required
                      </label>
                      <select
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, background: "#fff" }}
                        value={jobForm.expRequired}
                        onChange={(e) => setJobForm({ ...jobForm, expRequired: e.target.value })}
                      >
                        <option value="1-3 Yrs">1-3 Yrs</option>
                        <option value="3-5 Yrs">3-5 Yrs</option>
                        <option value="5-8 Yrs">5-8 Yrs</option>
                        <option value="8+ Yrs">8+ Yrs (Senior/Lead)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                        Positions
                      </label>
                      <input
                        type="number"
                        min="1"
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
                        value={jobForm.positions}
                        onChange={(e) => setJobForm({ ...jobForm, positions: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                      Required Certifications (Click to Select)
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {["CPC", "CIC", "COC", "CRC", "CCS", "CCA", "CPMA"].map((cert) => {
                        const active = jobForm.certsNeeded.includes(cert);
                        return (
                          <button
                            key={cert}
                            type="button"
                            onClick={() => toggleCert(cert)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 999,
                              border: active ? "1.5px solid var(--navy)" : "1.5px solid #cbd5e1",
                              background: active ? "var(--navy)" : "#fff",
                              color: active ? "#ffffff" : "#475569",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            {cert} {active ? "✓" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                        Shift Preference
                      </label>
                      <select
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, background: "#fff" }}
                        value={jobForm.shift}
                        onChange={(e) => setJobForm({ ...jobForm, shift: e.target.value })}
                      >
                        <option value="US Night Shift">US Night Shift</option>
                        <option value="Day Shift (India)">Day Shift (India)</option>
                        <option value="Flexible Shift">Flexible Shift</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                        Work Model
                      </label>
                      <select
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, background: "#fff" }}
                        value={jobForm.workModel}
                        onChange={(e) => setJobForm({ ...jobForm, workModel: e.target.value })}
                      >
                        <option value="Remote / WFH">Remote / WFH</option>
                        <option value="On-site Office">On-site Office</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                      Key Responsibilities / Role Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Minimum 3 years experience in ED chart auditing with Epic EHR..."
                      style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }}
                      value={jobForm.description}
                      onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: "100%",
                      padding: 16,
                      background: "linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%)",
                      color: "var(--navy-deep)",
                      border: "none",
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: 16,
                      cursor: "pointer",
                      boxShadow: "0 6px 20px rgba(229,168,46,0.4)"
                    }}
                  >
                    {submitting ? "Submitting Requirement..." : "Submit Job Requirement →"}
                  </button>
                </form>
              </div>
            ) : (
              /* Instant Success State */
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", color: "#16a34a", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 16 }}>
                  ✓
                </div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--navy)", marginBottom: 8 }}>
                  Requirement Submitted!
                </h2>
                <p style={{ fontSize: 15, color: "var(--text-muted)", maxWidth: 500, margin: "0 auto 24px", lineHeight: 1.6 }}>
                  Our RCM talent team is matching your requirement against 12,480+ pre-verified coders and billers. Your curated 5-candidate shortlist will be sent to <strong>{jobForm.workEmail}</strong> within 24 hours.
                </p>

                <div style={{ background: "#f8fafc", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0", maxWidth: 480, margin: "0 auto 24px", textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 8 }}>Submitted Summary:</div>
                  <div style={{ fontSize: 13, color: "#64748b", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div><strong>Company:</strong> {jobForm.companyName}</div>
                    <div><strong>Role:</strong> {jobForm.jobTitle}</div>
                    <div><strong>Positions:</strong> {jobForm.positions}</div>
                    <div><strong>Shift:</strong> {jobForm.shift}</div>
                    <div><strong>Model:</strong> {jobForm.workModel}</div>
                    <div><strong>Certifications:</strong> {jobForm.certsNeeded.join(", ") || "Any"}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => setShowJobModal(false)}
                    style={{ padding: "12px 24px", borderRadius: 10, background: "var(--navy)", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}
                  >
                    Done
                  </button>
                  <Link
                    to="/companies/register"
                    style={{ padding: "12px 24px", borderRadius: 10, background: "var(--gold)", color: "var(--navy)", fontWeight: 800, fontSize: 14, textDecoration: "none", display: "inline-block" }}
                  >
                    Register Company Account →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
