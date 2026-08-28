import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import LiquidNavCapsule from "../components/LiquidNavCapsule";
import "../styles/forCandidates.css";

export default function ForCandidates() {
  const navigate = useNavigate();

  // Ticker state
  const pulseMessages = [
    "5 candidates verified in the last hour",
    "Priya S. (CPC) shortlisted by Access Healthcare",
    "Apex Medical Institute uploaded 42 student profiles",
    "Karthik R. (CRC) completed ED chart audit with 98% score",
    "Anitha V. (Billing & AR) matched with CorroHealth"
  ];
  const [pulseIndex, setPulseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseIndex((prev) => (prev + 1) % pulseMessages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // City Hubs & Companies Data
  const [activeCity, setActiveCity] = useState("Chennai");

  const cityHubs = [
    { city: "Chennai", num: 110, icon: "fa-solid fa-water" },
    { city: "Hyderabad", num: 68, icon: "fa-solid fa-landmark" },
    { city: "Coimbatore", num: 36, icon: "fa-solid fa-industry" },
    { city: "Bangalore", num: 34, icon: "fa-solid fa-tree" },
    { city: "Pune", num: 20, icon: "fa-solid fa-book-open" },
    { city: "Noida", num: 13, icon: "fa-solid fa-building" },
    { city: "Trichy", num: 12, icon: "fa-solid fa-gopuram" },
    { city: "Kerala", num: 11, icon: "fa-solid fa-mountain-sun" },
    { city: "Andhra Pradesh", num: 6, icon: "fa-solid fa-anchor" },
    { city: "Mumbai", num: 6, icon: "fa-solid fa-city" }
  ];

  const cityCompaniesData = {
    Chennai: [
      { name: "Access Healthcare", typeLabel: "RCM", cls: "tag-rcm" },
      { name: "Omega Healthcare", typeLabel: "MEDICAL CODING", cls: "tag-mc" },
      { name: "GeBBS Healthcare Solutions", typeLabel: "BILLING/AR", cls: "tag-bar" },
      { name: "Vee Technologies", typeLabel: "MEDICAL CODING", cls: "tag-mc" },
      { name: "AGS Health", typeLabel: "RCM", cls: "tag-rcm" },
      { name: "CareStack", typeLabel: "BILLING/AR", cls: "tag-bar" }
    ],
    Hyderabad: [
      { name: "Optum Global Solutions", typeLabel: "RCM", cls: "tag-rcm" },
      { name: "CorroHealth", typeLabel: "MEDICAL CODING", cls: "tag-mc" },
      { name: "Legato Health Technologies", typeLabel: "BILLING/AR", cls: "tag-bar" },
      { name: "R1 RCM", typeLabel: "RCM", cls: "tag-rcm" },
      { name: "Cognizant Healthcare", typeLabel: "MEDICAL CODING", cls: "tag-mc" },
      { name: "Episource", typeLabel: "RCM", cls: "tag-rcm" }
    ],
    Mumbai: [
      { name: "Atos", typeLabel: "RCM", cls: "tag-rcm" },
      { name: "H2 RCM Healthcare", typeLabel: "BILLING/AR", cls: "tag-bar" },
      { name: "Health Prime", typeLabel: "RCM", cls: "tag-rcm" },
      { name: "IKS Health Care", typeLabel: "BILLING/AR", cls: "tag-bar" },
      { name: "Sagility Healthcare", typeLabel: "BILLING/AR", cls: "tag-bar" },
      { name: "Ascent Business Solutions", typeLabel: "RCM", cls: "tag-rcm" }
    ],
    Bangalore: [
      { name: "Ajuba Solutions", typeLabel: "RCM", cls: "tag-rcm" },
      { name: "Guidehouse Healthcare", typeLabel: "MEDICAL CODING", cls: "tag-mc" },
      { name: "Navigant RCM", typeLabel: "BILLING/AR", cls: "tag-bar" },
      { name: "Firstsource Solutions", typeLabel: "RCM", cls: "tag-rcm" }
    ]
  };

  const activeCompanies = cityCompaniesData[activeCity] || [
    { name: `${activeCity} RCM Solutions`, typeLabel: "RCM", cls: "tag-rcm" },
    { name: `${activeCity} Medical Billing Inc`, typeLabel: "BILLING/AR", cls: "tag-bar" },
    { name: `Global Healthcare ${activeCity}`, typeLabel: "MEDICAL CODING", cls: "tag-mc" },
    { name: `Apex Coding Hub ${activeCity}`, typeLabel: "RCM", cls: "tag-rcm" }
  ];

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const faqs = [
    {
      q: "Is Talentera completely free for candidates?",
      a: "Yes, 100% free forever for job seekers. There are zero hidden registration charges, placement fees, or consultancy commissions."
    },
    {
      q: "Will my current company know I'm looking for a job?",
      a: "No! Stealth Mode ensures your profile, contact details, and current status are strictly hidden from your current employer's corporate account."
    },
    {
      q: "What certifications are supported on the platform?",
      a: "We verify AAPC credentials (CPC, CIC, COC, CPMA, CRC), AHIMA (CCS, CCA, RHIT), and specialized RCM/Medical Billing certifications."
    },
    {
      q: "How long does the 8-stage verification take?",
      a: "Most candidates complete the online verification within 24 to 48 hours. Stage 1 (Aadhaar OTP) takes under 2 minutes."
    },
    {
      q: "What if I score low on an assessment?",
      a: "You can re-attempt skill assessments after a 7-day refresher period. We provide free study resources to help you improve your score."
    }
  ];

  const stages = [
    { num: "01", name: "Aadhaar Identity", desc: "Government identity verification via UIDAI OTP for fraud-free hiring.", icon: "fa-solid fa-id-card" },
    { num: "02", name: "Education & Training", desc: "Verified diplomas, degrees, and certified RCM academy background.", icon: "fa-solid fa-graduation-cap" },
    { num: "03", name: "Certifications", desc: "AAPC (CPC, CIC, COC) & AHIMA credential validation & badge checks.", icon: "fa-solid fa-certificate" },
    { num: "04", name: "Skill Assessment", desc: "Specialty-specific medical coding & billing speed and accuracy tests.", icon: "fa-solid fa-laptop-code" },
    { num: "05", name: "Audio / Video Intro", desc: "60-second professional voice and communication screening for recruiters.", icon: "fa-solid fa-video" },
    { num: "06", name: "Live Chart Auditing", desc: "Real-world ED/IP/OP chart audit evaluation with instant accuracy scores.", icon: "fa-solid fa-file-waveform" },
    { num: "07", name: "ATS Resume Score", desc: "Optimized RCM resume formatted to pass enterprise recruiter ATS screeners.", icon: "fa-solid fa-file-lines" },
    { num: "08", name: "Verified Profile Badge", desc: "Public shareable verified profile & background trust index.", icon: "fa-solid fa-shield-halved" }
  ];

  return (
    <div className="fc-page">
      {/* Ticker Bar */}
      <div className="fc-ticker-bar">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <span className="fc-ticker-dot" />
            <span style={{ color: "var(--gold)", fontWeight: 700 }}>LIVE VERIFICATION FEED:</span>
            <span style={{ color: "#E2E8F0" }}>{pulseMessages[pulseIndex]}</span>
          </div>
          <div style={{ display: "flex", gap: 16, color: "#94A3B8", fontSize: 11 }}>
            <span>⚡ 94.2% Placement Rate</span>
            <span>🛡 Aadhaar Verified</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: HERO */}
      <section className="fc-hero">
        {/* Top Left Corner Back to Home Button */}
        <Link
          to="/"
          className="fc-btn-outline"
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

        <div className="fc-hero-bg-grid" />
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
          <div className="fc-eyebrow">
            <i className="fa-solid fa-user-check" /> FOR MEDICAL CODERS & BILLERS
          </div>

          <h1 className="fc-hero-title">
            Your career in RCM <br />
            <span className="fc-text-gold">begins here.</span>
          </h1>

          <p className="fc-hero-sub">
            Create a Verified Profile, take the 8-Stage Assessment, get direct access to 342+ verified RCM companies across India. Zero fees, guaranteed privacy.
          </p>

          <div className="fc-hero-ctas">
            <Link to="/register" className="fc-btn-gold" style={{ padding: "14px 32px", fontSize: 16 }}>
              Start Your Candidate Journey →
            </Link>
            <Link to="/login" className="fc-btn-outline" style={{ padding: "14px 28px", fontSize: 16 }}>
              Login to Portal
            </Link>
          </div>

          <div className="fc-hero-stats">
            <div className="fc-stat-item">
              <div className="fc-stat-num">342+</div>
              <div className="fc-stat-label">Companies Hiring</div>
            </div>
            <div className="fc-stat-item">
              <div className="fc-stat-num">14</div>
              <div className="fc-stat-label">States Covered</div>
            </div>
            <div className="fc-stat-item">
              <div className="fc-stat-num">1,800+</div>
              <div className="fc-stat-label">Candidates Placed</div>
            </div>
            <div className="fc-stat-item">
              <div className="fc-stat-num">₹0</div>
              <div className="fc-stat-label">Platform Fees</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE OLD WAY VS TALENTERA WAY */}
      <section className="fc-section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="fc-section-head">
            <div className="fc-section-eyebrow">THE OLD WAY VS THE TALENTERA WAY</div>
            <h2 className="fc-section-title">
              You've been job hunting the <span style={{ textDecoration: "line-through", color: "#ef4444" }}>wrong way.</span>
            </h2>
            <p className="fc-section-sub">
              Traditional job portals and agencies were built for generalists, not specialized healthcare RCM professionals.
            </p>
          </div>

          <div className="fc-pain-grid">
            <div className="fc-pain-card">
              <div className="fc-pain-icon"><i className="fa-solid fa-inbox" /></div>
              <h3 className="fc-pain-title">50+ Unread Applications</h3>
              <p className="fc-pain-desc">Resumes swallowed by generic automated portal black holes with zero status updates.</p>
            </div>

            <div className="fc-pain-card">
              <div className="fc-pain-icon"><i className="fa-solid fa-ghost" /></div>
              <h3 className="fc-pain-title">0 Feedback from Recruiters</h3>
              <p className="fc-pain-desc">Ghosted after multiple interview rounds without constructive closure or clarity.</p>
            </div>

            <div className="fc-pain-card">
              <div className="fc-pain-icon"><i className="fa-solid fa-triangle-exclamation" /></div>
              <h3 className="fc-pain-title">500+ Fake / Scam Jobs</h3>
              <p className="fc-pain-desc">Wasting hours dealing with unverified third-party consultancies asking for fees.</p>
            </div>

            <div className="fc-pain-card">
              <div className="fc-pain-icon"><i className="fa-solid fa-eye-slash" /></div>
              <h3 className="fc-pain-title">0 Salary Transparency</h3>
              <p className="fc-pain-desc">No visibility into true pay scale ranges, night shift allowances, or remote policies.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: 8 STAGES GRID */}
      <section className="fc-section" style={{ background: "#ffffff" }}>
        <div className="container">
          <div className="fc-section-head">
            <div className="fc-section-eyebrow">THE 8-STAGE VERIFICATION PROCESS</div>
            <h2 className="fc-section-title">
              Eight stages. <span className="fc-text-gold">100 verification points.</span>
            </h2>
            <p className="fc-section-sub">
              Our 8-stage verification proves your skills to top healthcare recruiters before they even speak to you. Stand out from thousands of unverified resumes.
            </p>
          </div>

          <div className="fc-stages-grid">
            {stages.map((stg) => (
              <div key={stg.num} className="fc-stage-card">
                <div className="fc-stage-num">Stage {stg.num}</div>
                <div className="fc-stage-icon-wrap"><i className={stg.icon} /></div>
                <h3 className="fc-stage-title">{stg.name}</h3>
                <p className="fc-stage-desc">{stg.desc}</p>
              </div>
            ))}
          </div>

          {/* Fast-Track Box */}
          <div className="fc-fasttrack-box">
            <div>
              <div className="fc-fasttrack-title">Have 10+ years experience? Jump to Fast-Track</div>
              <div className="fc-fasttrack-desc">Exemptions available for senior coders & auditors with active AAPC/AHIMA credentials.</div>
            </div>
            <Link to="/register?fasttrack=true" className="fc-btn-gold" style={{ whiteSpace: "nowrap" }}>
              Claim Fast-Track Status →
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 4: BENEFITS (DARK NAVY) */}
      <section className="fc-section fc-benefits-section">
        <div className="container">
          <div className="fc-section-head">
            <div className="fc-section-eyebrow" style={{ color: "var(--gold-bright)" }}>WHY GET VERIFIED</div>
            <h2 className="fc-section-title fc-section-title-dark">
              Once you're verified, <span className="fc-text-gold">everything changes.</span>
            </h2>
            <p className="fc-section-sub fc-section-sub-dark">
              Verified candidates skip phone screens, get priority interview callbacks, and earn 15-30% higher salary offers.
            </p>
          </div>

          <div className="fc-benefits-grid">
            <div className="fc-benefit-card">
              <div className="fc-benefit-icon"><i className="fa-solid fa-bolt" /></div>
              <h3 className="fc-benefit-title">Direct Recruiter Access</h3>
              <p className="fc-benefit-desc">Corporate recruiters approach you directly—no middleman agencies or commission cuts.</p>
            </div>

            <div className="fc-benefit-card">
              <div className="fc-benefit-icon"><i className="fa-solid fa-arrow-trend-up" /></div>
              <h3 className="fc-benefit-title">15-30% Higher Pay Offers</h3>
              <p className="fc-benefit-desc">Companies pay top-tier salary packages for pre-vetted, error-free certified coders.</p>
            </div>

            <div className="fc-benefit-card">
              <div className="fc-benefit-icon"><i className="fa-solid fa-forward-fast" /></div>
              <h3 className="fc-benefit-title">Fast-Track Hiring Process</h3>
              <p className="fc-benefit-desc">Skip initial screening rounds and move straight to technical/final hiring rounds.</p>
            </div>

            <div className="fc-benefit-card">
              <div className="fc-benefit-icon"><i className="fa-solid fa-house-laptop" /></div>
              <h3 className="fc-benefit-title">Work-From-Home Priority</h3>
              <p className="fc-benefit-desc">Unlock remote & hybrid RCM roles with leading US healthcare service providers.</p>
            </div>

            <div className="fc-benefit-card">
              <div className="fc-benefit-icon"><i className="fa-solid fa-badge-check" /></div>
              <h3 className="fc-benefit-title">Verified Candidate Badge</h3>
              <p className="fc-benefit-desc">Stand out with a green verified badge shared directly with hiring managers.</p>
            </div>

            <div className="fc-benefit-card">
              <div className="fc-benefit-icon"><i className="fa-solid fa-user-lock" /></div>
              <h3 className="fc-benefit-title">100% Privacy Control</h3>
              <p className="fc-benefit-desc">Keep your current employer from seeing your profile with stealth privacy mode.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: CITIES & COMPANY ROSTER */}
      <section className="fc-section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="fc-section-head">
            <div className="fc-section-eyebrow">PAN-INDIA REACH</div>
            <h2 className="fc-section-title">
              342 companies. <span className="fc-text-gold">14 states.</span> One platform.
            </h2>
            <p className="fc-section-sub">
              Connect with top US healthcare RCM employers in major hubs and tier-2 cities across India.
            </p>
          </div>

          {/* City Selector Pills */}
          <div className="fc-city-pills">
            {cityHubs.map((hub) => (
              <button
                key={hub.city}
                type="button"
                className={`fc-city-pill ${activeCity === hub.city ? "active" : ""}`}
                onClick={() => setActiveCity(hub.city)}
              >
                <span>{hub.city}</span>
                <span className="fc-city-pill-num">{hub.num}</span>
              </button>
            ))}
          </div>

          {/* Company Roster Grid */}
          <div className="fc-company-grid">
            {activeCompanies.map((co, idx) => (
              <div key={idx} className="fc-company-card">
                <div>
                  <div className="fc-co-name">{co.name}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{activeCity} Hub</div>
                </div>
                <span className={`fc-co-tag ${co.cls}`}>{co.typeLabel}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center" }}>
            <Link to="/register" className="fc-btn-gold" style={{ padding: "12px 28px" }}>
              View All 342 Hiring Companies →
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 6: TESTIMONIALS */}
      <section className="fc-section" style={{ background: "#ffffff" }}>
        <div className="container">
          <div className="fc-section-head">
            <div className="fc-section-eyebrow">PROVEN RESULTS</div>
            <h2 className="fc-section-title">
              Verified, matched, <span className="fc-text-gold">placed.</span>
            </h2>
            <p className="fc-section-sub">
              Read how medical coders and billers transformed their RCM careers on Talentera.
            </p>
          </div>

          <div className="fc-testi-grid">
            <div className="fc-testi-card">
              <p className="fc-testi-quote">
                "Landed a 40% salary hike within 5 days of completing my AAPC stage verification. Corporate recruiters reached out directly without any consultancy middleman."
              </p>
              <div className="fc-testi-user">
                <div className="fc-testi-avatar">PS</div>
                <div>
                  <div className="fc-testi-name">Priya Sharma</div>
                  <div className="fc-testi-role">CPC Certified Coder · Placed at Access Healthcare</div>
                  <span className="fc-testi-badge">✓ Salary +40%</span>
                </div>
              </div>
            </div>

            <div className="fc-testi-card">
              <p className="fc-testi-quote">
                "The live chart audit score proved my ED auditing accuracy to Optum hiring managers before my technical round even started. Fast-track process was seamless."
              </p>
              <div className="fc-testi-user">
                <div className="fc-testi-avatar">KR</div>
                <div>
                  <div className="fc-testi-name">Karthik R.</div>
                  <div className="fc-testi-role">Inpatient Coder · Placed at Optum Global Solutions</div>
                  <span className="fc-testi-badge">✓ Remote WFH</span>
                </div>
              </div>
            </div>

            <div className="fc-testi-card">
              <p className="fc-testi-quote">
                "No more fake agency calls asking for money. Talentera verified my experience background and matched me with top billing leads at CorroHealth."
              </p>
              <div className="fc-testi-user">
                <div className="fc-testi-avatar">AV</div>
                <div>
                  <div className="fc-testi-name">Anitha V.</div>
                  <div className="fc-testi-role">AR Lead · Placed at CorroHealth</div>
                  <span className="fc-testi-badge">✓ Verified Lead</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: RECRUITER PREVIEW */}
      <section className="fc-section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="fc-section-head">
            <div className="fc-section-eyebrow">RECRUITER VISIBILITY</div>
            <h2 className="fc-section-title">
              This is exactly what an <span className="fc-text-gold">Optum hiring manager sees about you.</span>
            </h2>
            <p className="fc-section-sub">
              Your profile highlights verified test scores, AAPC credential status, chart audit accuracy, and video intro.
            </p>
          </div>

          <div className="fc-recruiter-box">
            <div>
              <div className="fc-rec-feature-item">
                <div className="fc-rec-feature-icon"><i className="fa-solid fa-check" /></div>
                <div>
                  <div className="fc-rec-feature-title">Verified Aadhaar & AAPC Badges</div>
                  <div className="fc-rec-feature-desc">Zero doubt on your identity or credential authenticity.</div>
                </div>
              </div>

              <div className="fc-rec-feature-item">
                <div className="fc-rec-feature-icon"><i className="fa-solid fa-check" /></div>
                <div>
                  <div className="fc-rec-feature-title">Audited Chart Accuracy Score</div>
                  <div className="fc-rec-feature-desc">Shows 98%+ accuracy on real ED & Surgical charts.</div>
                </div>
              </div>

              <div className="fc-rec-feature-item">
                <div className="fc-rec-feature-icon"><i className="fa-solid fa-check" /></div>
                <div>
                  <div className="fc-rec-feature-title">1-Click Direct Shortlist</div>
                  <div className="fc-rec-feature-desc">Recruiters invite you directly for final interview rounds.</div>
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <Link to="/register" className="fc-btn-gold" style={{ padding: "12px 28px" }}>
                  Build Your Verified Profile →
                </Link>
              </div>
            </div>

            {/* Visual Mock Candidate Profile Card */}
            <div className="fc-mock-card">
              <div className="fc-mock-head">
                <div>
                  <div className="fc-mock-name">Priya Sharma, CPC</div>
                  <div className="fc-mock-title">Medical Coder · 4 Yrs Experience</div>
                </div>
                <div className="fc-mock-vbadge">
                  <i className="fa-solid fa-shield-check" /> VERIFIED
                </div>
              </div>

              <div className="fc-mock-scores">
                <div className="fc-mock-score-box">
                  <div className="fc-mock-score-val">98%</div>
                  <div className="fc-mock-score-lbl">Chart Audit Score</div>
                </div>
                <div className="fc-mock-score-box">
                  <div className="fc-mock-score-val">AAPC</div>
                  <div className="fc-mock-score-lbl">CPC Credential</div>
                </div>
                <div className="fc-mock-score-box">
                  <div className="fc-mock-score-val">94/100</div>
                  <div className="fc-mock-score-lbl">Skill Test Score</div>
                </div>
                <div className="fc-mock-score-box">
                  <div className="fc-mock-score-val">UIDAI</div>
                  <div className="fc-mock-score-lbl">Identity Verified</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="fc-btn-gold" style={{ flex: 1, padding: 8, fontSize: 13, justifyContent: "center" }}>
                  Shortlist Candidate
                </button>
                <button type="button" className="fc-btn-outline" style={{ flex: 1, padding: 8, fontSize: 13 }}>
                  View Resume
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: FAQ ACCORDION */}
      <section className="fc-section" style={{ background: "#ffffff" }}>
        <div className="container">
          <div className="fc-section-head">
            <div className="fc-section-eyebrow">GOT QUESTIONS?</div>
            <h2 className="fc-section-title">
              Everything you want to <span className="fc-text-gold">ask first.</span>
            </h2>
          </div>

          <div className="fc-faq-list">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className={`fc-faq-item ${isOpen ? "open" : ""}`}>
                  <div className="fc-faq-q" onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}>
                    <span>{faq.q}</span>
                    <i className={`fa-solid ${isOpen ? "fa-chevron-up" : "fa-chevron-down"}`} style={{ fontSize: 14, color: "var(--gold)" }} />
                  </div>
                  {isOpen && <div className="fc-faq-a">{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 9: FOOTER HERO */}
      <section className="fc-cta-hero">
        <div className="container">
          <h2 className="fc-cta-title">
            The era of talent <span className="fc-text-gold">begins with you.</span>
          </h2>
          <p className="fc-cta-sub">
            Join over 1,800+ verified medical coders & billers who landed top-tier RCM jobs.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/register" className="fc-btn-gold" style={{ padding: "14px 36px", fontSize: 16 }}>
              REGISTER NOW
            </Link>
            <Link to="/login" className="fc-btn-outline" style={{ padding: "14px 32px", fontSize: 16 }}>
              LOG IN
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
