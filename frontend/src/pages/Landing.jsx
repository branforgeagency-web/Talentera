import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeJourney, setActiveJourney] = useState("candidate");
  const [typewriterText, setTypewriterText] = useState("Begins Here.");
  const [pulseText, setPulseText] = useState("5 candidates verified in the last hour");
  
  // Location hiring hubs state
  const [activeCity, setActiveCity] = useState("Mumbai");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  const pulseMessages = [
    "5 candidates verified in the last hour",
    "Priya S. (CPC) shortlisted by Access Healthcare",
    "Apex Medical Institute uploaded 42 student profiles",
    "Karthik I. (CRC) completed ED chart audit with 98% score"
  ];

  const cityHubs = [
    { city: "Chennai", num: 110, landmark: "Marina Beach · Egmore", state: "TAMIL NADU", icon: "♒", nearby: true },
    { city: "Hyderabad", num: 68, landmark: "Charminar · Hi-Tech City", state: "TELANGANA", icon: "🏛", nearby: false },
    { city: "Coimbatore", num: 36, landmark: "Manchester of South India", state: "TAMIL NADU", icon: "🏭", nearby: true },
    { city: "Bangalore", num: 34, landmark: "Garden City · IT Capital", state: "KARNATAKA", icon: "🌴", nearby: true },
    { city: "Pune", num: 20, landmark: "Oxford of the East", state: "MAHARASHTRA", icon: "📖", nearby: true },
    { city: "Noida", num: 13, landmark: "NCR Tech Corridor", state: "UTTAR PRADESH", icon: "🏢", nearby: true },
    { city: "Trichy", num: 12, landmark: "Rockfort · Temple City", state: "TAMIL NADU", icon: "🛕", nearby: true },
    { city: "Kerala", num: 11, landmark: "God's Own Country · Backwaters", state: "KERALA", icon: "🌴", nearby: false },
    { city: "Andhra Pradesh", num: 6, landmark: "Coastal AP · Vizag & Tirupathi", state: "ANDHRA PRADESH", icon: "⚓", nearby: true },
    { city: "Mumbai", num: 6, landmark: "Gateway of India · Financial Capital", state: "MAHARASHTRA", icon: "🏠", nearby: true },
    { city: "Other Cities", num: 12, landmark: "Pan-India · Across 8 hubs", state: "PAN-INDIA", icon: "📍", nearby: true }
  ];

  // Comprehensive Company Roster per City
  const cityCompaniesData = {
    Mumbai: [
      { name: "Atos", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
      { name: "H2 RCM Healthcare", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
      { name: "Health Prime", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
      { name: "IKS Health Care", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
      { name: "Sagility Healthcare", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
      { name: "Ascent Business Solutions", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" }
    ],
    Chennai: [
      { name: "Access Healthcare", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
      { name: "Omega Healthcare", type: "M", typeLabel: "MEDICAL CODING", cls: "loch-co-tag-mc" },
      { name: "GeBBS Healthcare Solutions", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
      { name: "Vee Technologies", type: "M", typeLabel: "MEDICAL CODING", cls: "loch-co-tag-mc" },
      { name: "AGS Health", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
      { name: "CareStack", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" }
    ],
    Hyderabad: [
      { name: "Optum Global Solutions", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
      { name: "CorroHealth", type: "M", typeLabel: "MEDICAL CODING", cls: "loch-co-tag-mc" },
      { name: "Legato Health Technologies", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
      { name: "R1 RCM", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" }
    ]
  };

  // Check URL hash for smooth scrolling to candidates section
  useEffect(() => {
    if (location.hash === "#candidates" || location.hash === "#audiences") {
      const el = document.getElementById("candidates") || document.getElementById("audiences");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  // Hero Typewriter Effect
  useEffect(() => {
    const phrases = ["Begins Here.", "Starts Now.", "Is Verified.", "Has Arrived."];
    let phraseIdx = 0;
    let charIdx = phrases[0].length;
    let isDeleting = false;
    let timer;

    const tick = () => {
      const currentPhrase = phrases[phraseIdx];
      if (!isDeleting) {
        setTypewriterText(currentPhrase.substring(0, charIdx));
        charIdx++;
        if (charIdx > currentPhrase.length) {
          timer = setTimeout(() => {
            isDeleting = true;
            tick();
          }, 2400);
          return;
        }
        timer = setTimeout(tick, 90);
      } else {
        setTypewriterText(currentPhrase.substring(0, charIdx));
        charIdx--;
        if (charIdx < 0) {
          isDeleting = false;
          charIdx = 0;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          timer = setTimeout(tick, 250);
          return;
        }
        timer = setTimeout(tick, 45);
      }
    };

    timer = setTimeout(tick, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Platform pulse loop
  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % pulseMessages.length;
      setPulseText(pulseMessages[idx]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeHubData = cityHubs.find((h) => h.city === activeCity) || cityHubs[0];
  const allCompaniesForCity = cityCompaniesData[activeCity] || [
    { name: `${activeCity} RCM Solutions`, type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
    { name: `${activeCity} Medical Billing Inc`, type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
    { name: `Global Healthcare ${activeCity}`, type: "M", typeLabel: "MEDICAL CODING", cls: "loch-co-tag-mc" }
  ];

  // Filter calculations
  const countAll = allCompaniesForCity.length;
  const countRCM = allCompaniesForCity.filter((c) => c.type === "R").length;
  const countMC = allCompaniesForCity.filter((c) => c.type === "M").length;
  const countBAR = allCompaniesForCity.filter((c) => c.type === "B").length;

  const filteredCompanies = allCompaniesForCity.filter((c) => {
    const matchesFilter = activeFilter === "ALL" || c.type === activeFilter;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesFilter && matchesSearch;
  });

  const scrollToCandidates = (e) => {
    if (e) e.preventDefault();
    const el = document.getElementById("candidates") || document.getElementById("audiences");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--navy-deep)", color: "#fff", position: "relative" }}>
      {/* ====== LIVE RECENT ACTIVITY TICKER BAR ====== */}
      <div className="ticker-bar" style={{ background: "#061324", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 0", fontSize: 12, fontFamily: "var(--font-mono)" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 8px #22C55E", flexShrink: 0 }} />
            <span style={{ color: "var(--gold)", fontWeight: 700, letterSpacing: "0.06em", flexShrink: 0 }}>LIVE VERIFICATION FEED:</span>
            <span style={{ color: "#E2E8F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pulseText}</span>
          </div>
          <div className="ticker-stats-right" style={{ display: "flex", gap: 16, color: "#94A3B8", fontSize: 11, flexShrink: 0 }}>
            <span>⚡ 94.2% Placement Rate</span>
            <span>🛡 Aadhaar Verified</span>
          </div>
        </div>
      </div>

      {/* ====== STICKY NAVBAR ====== */}
      <header className="nav">
        <div className="nav-container container">
          {/* Logo Block */}
          <div className="nav-logo" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" />
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>

          {/* Center Links */}
          <nav className={`nav-menu ${mobileMenuOpen ? "open" : ""}`}>
            <Link to="/companies" onClick={() => setMobileMenuOpen(false)}>
              For Companies
            </Link>
            <a href="#candidates" onClick={(e) => { setMobileMenuOpen(false); scrollToCandidates(e); }}>
              For Candidates
            </a>
            <Link to="/academy" onClick={() => setMobileMenuOpen(false)}>
              For Academies
            </Link>
            <Link to="/jobs" onClick={() => setMobileMenuOpen(false)}>
              Browse Jobs
            </Link>
            <a href="#how" onClick={() => setMobileMenuOpen(false)}>
              How it Works
            </a>
            
            {/* Mobile CTAs visible inside mobile menu */}
            <div className="nav-mobile-ctas">
              <Link to="/login" className="nav-mobile-login" onClick={() => setMobileMenuOpen(false)}>
                Employee Login
              </Link>
              <Link to="/companies/register" className="btn-gold" onClick={() => setMobileMenuOpen(false)}>
                Hire Verified Talent →
              </Link>
            </div>
          </nav>

          {/* Desktop Right Action CTAs */}
          <div className="nav-actions">
            <Link to="/login" className="nav-login-link">
              Employee Login
            </Link>
            <Link to="/companies/register" className="btn-gold nav-cta-btn">
              Hire Verified Talent →
            </Link>
          </div>
        </div>
      </header>

      {/* ====== HERO V4 ANIMATED DYNAMIC HERO ====== */}
      <section className="hero-clean" style={{ position: "relative", overflow: "hidden", padding: "90px 0 110px" }}>
        <div className="hero-clean-bg-grid" />
        <div className="hero-clean-glow-1" />
        <div className="hero-clean-glow-2" />
        <div className="hero-clean-glow-3" />

        {/* Animated Particle Dots */}
        <div className="hero-particles">
          <span className="hero-particle hero-particle-1" />
          <span className="hero-particle hero-particle-2" />
          <span className="hero-particle hero-particle-3" />
          <span className="hero-particle hero-particle-4" />
          <span className="hero-particle hero-particle-5" />
          <span className="hero-particle hero-particle-6" />
          <span className="hero-particle hero-particle-7" />
          <span className="hero-particle hero-particle-8" />
        </div>

        {/* Giant Monogram TT Watermark */}
        <div className="hero-clean-mark" aria-hidden="true" style={{ position: "absolute", right: -40, bottom: -40, opacity: 0.15, pointerEvents: "none" }}>
          <svg width="400" height="400" viewBox="0 0 80 80" fill="none">
            <path d="M28 8 L72 8 L72 22 L56 22 L56 72 L42 72 L42 22 L28 22 Z" fill="rgba(229,168,46,0.3)"/>
            <path d="M8 14 L52 14 L52 28 L36 28 L36 70 L22 70 L22 28 L8 28 Z" fill="rgba(255,255,255,0.2)"/>
          </svg>
        </div>

        {/* TOP-LEFT FLOATING CANDIDATE CARD */}
        <div className="hero-float hero-float-tl">
          <div className="hero-cand-card">
            <div className="hero-cand-pill">
              <span className="hero-cand-pill-dot" />
              <span>READY TO HIRE</span>
            </div>
            <div className="hero-cand-row">
              <div className="hero-cand-avatar" style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>PS</div>
              <div className="hero-cand-info">
                <div className="hero-cand-name">Priya S. <span className="hero-cand-verified">✓</span></div>
                <div className="hero-cand-spec">HCC / Risk Adjustment</div>
                <div className="hero-cand-meta">Hyderabad · CPC · <strong>78</strong>/100</div>
              </div>
            </div>
          </div>
        </div>

        {/* TOP-RIGHT FLOATING CANDIDATE CARD */}
        <div className="hero-float hero-float-tr">
          <div className="hero-cand-card">
            <div className="hero-cand-pill hero-cand-pill-gold">
              <span className="hero-cand-pill-dot hero-cand-pill-dot-gold" />
              <span>TOP 10% · STRONG MATCH</span>
            </div>
            <div className="hero-cand-row">
              <div className="hero-cand-avatar" style={{ background: "linear-gradient(135deg, #06B6D4, #0E7490)" }}>KI</div>
              <div className="hero-cand-info">
                <div className="hero-cand-name">Karthik I. <span className="hero-cand-verified">✓</span></div>
                <div className="hero-cand-spec">HCC + IP-DRG · 3.5 yrs</div>
                <div className="hero-cand-meta">Chennai · CPC, CRC · <strong>88</strong>/100</div>
              </div>
            </div>
          </div>
        </div>

        {/* MID-LEFT STAMP CARD */}
        <div className="hero-float hero-float-ml">
          <div className="hero-cand-stamp">
            <div className="hero-cand-stamp-icon">⚡</div>
            <div>
              <div className="hero-cand-stamp-num">+47</div>
              <div className="hero-cand-stamp-lbl">VERIFIED TODAY</div>
            </div>
          </div>
        </div>

        {/* MID-RIGHT STAMP CARD */}
        <div className="hero-float hero-float-mr">
          <div className="hero-cand-stamp hero-cand-stamp-gold">
            <div className="hero-cand-stamp-icon">🛡</div>
            <div>
              <div className="hero-cand-stamp-num">4-Layer</div>
              <div className="hero-cand-stamp-lbl">SCREENING</div>
            </div>
          </div>
        </div>

        {/* BOTTOM-LEFT FLOATING CARD */}
        <div className="hero-float hero-float-bl">
          <div className="hero-cand-card">
            <div className="hero-cand-pill hero-cand-pill-emerald">
              <span className="hero-cand-pill-dot hero-cand-pill-dot-emerald" />
              <span>JUST PLACED · ₹5.5 LPA</span>
            </div>
            <div className="hero-cand-row">
              <div className="hero-cand-avatar" style={{ background: "linear-gradient(135deg, #22C55E, #15803D)" }}>MR</div>
              <div className="hero-cand-info">
                <div className="hero-cand-name">Meera R. <span className="hero-cand-verified">✓</span></div>
                <div className="hero-cand-spec">HCC Coding Lead · 5 yrs</div>
                <div className="hero-cand-meta">Bangalore · CCS, CRC · <strong>92</strong>/100</div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM-RIGHT FLOATING CARD */}
        <div className="hero-float hero-float-br">
          <div className="hero-cand-card">
            <div className="hero-cand-pill">
              <span className="hero-cand-pill-dot" />
              <span>IN PIPELINE</span>
            </div>
            <div className="hero-cand-row">
              <div className="hero-cand-avatar" style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>AM</div>
              <div className="hero-cand-info">
                <div className="hero-cand-name">Arjun M. <span className="hero-cand-verified">✓</span></div>
                <div className="hero-cand-spec">ED Coding · Fresher</div>
                <div className="hero-cand-meta">Kochi · CPC-A · <strong>65</strong>/100</div>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER HERO CONTENT */}
        <div className="container hero-clean-inner" style={{ position: "relative", zIndex: 5 }}>
          {/* Eyebrow */}
          <div className="hero-clean-eyebrow">
            <span className="hero-clean-eyebrow-dot" />
            <span>INDIA'S VERIFIED RCM HIRING ENGINE</span>
          </div>

          {/* Title with Typewriter Accent */}
          <h1 className="hero-clean-title" style={{ fontSize: "clamp(48px, 7.5vw, 104px)", marginBottom: 20 }}>
            The Era of Talent <br />
            <span className="hero-clean-accent">{typewriterText}</span>
            <span className="hero-tw-cursor" />
          </h1>

          {/* Subtitle */}
          <p className="hero-clean-sub" style={{ maxWidth: 740, fontSize: 18, margin: "0 auto 36px" }}>
            Your career in healthcare starts here. <strong style={{ color: "var(--gold-light)" }}>Pick your path</strong> below — get trained, get verified, get placed. <br />
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 8, display: "inline-block" }}>
              Free for students · 12,480+ verified peers · 140+ hiring companies
            </span>
          </p>

          {/* ====== 3 SPECIALTY PATH CARDS SECTION ====== */}
          <div className="hero-paths">
            <div className="hero-paths-eyebrow">— CHOOSE YOUR PATH INTO HEALTHCARE —</div>
            <div className="hero-paths-grid">
              {/* Path 1: Medical Coding */}
              <div className="hero-path-card hero-path-coding" onClick={() => navigate("/register")}>
                <div className="hero-path-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 2h6a1 1 0 0 1 1 1v1H8V3a1 1 0 0 1 1-1z"/>
                    <rect x="5" y="4" width="14" height="18" rx="2"/>
                    <path d="M9 11h6M9 15h4"/>
                    <path d="M9 8l-1 1 1 1M15 8l1 1-1 1"/>
                  </svg>
                </div>
                <div className="hero-path-name">Medical Coding</div>
                <div className="hero-path-desc">Convert medical records into billing codes (CPT, ICD-10).</div>
                <div className="hero-path-tags">ED · Surgery · IP/DRG · OP · HCC</div>
                <div className="hero-path-cta">
                  <span>Start as a Medical Coder</span>
                  <span>→</span>
                </div>
              </div>

              {/* Path 2: Medical Billing */}
              <div className="hero-path-card hero-path-billing" onClick={() => navigate("/register")}>
                <div className="hero-path-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2v20l2-2 2 2 2-2 2 2 2-2 2 2V2z"/>
                    <path d="M9 7h6M9 11h6M9 15h4"/>
                  </svg>
                </div>
                <div className="hero-path-name">Medical Billing</div>
                <div className="hero-path-desc">Process insurance claims, post payments, manage denials.</div>
                <div className="hero-path-tags">Charge Entry · Payment Posting · Claims</div>
                <div className="hero-path-cta">
                  <span>Start as Medical Biller</span>
                  <span>→</span>
                </div>
              </div>

              {/* Path 3: AR Calling */}
              <div className="hero-path-card hero-path-arcalling" onClick={() => navigate("/register")}>
                <div className="hero-path-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 0 1 18 0"/>
                    <path d="M3 12v5a2 2 0 0 0 2 2h2v-7"/>
                    <path d="M21 12v5a2 2 0 0 1-2 2h-2v-7"/>
                    <path d="M14 19h2a2 2 0 0 0 2-2"/>
                    <circle cx="13" cy="20" r="1"/>
                  </svg>
                </div>
                <div className="hero-path-name">AR Calling</div>
                <div className="hero-path-desc">Recover unpaid claims by working US insurance accounts.</div>
                <div className="hero-path-tags">Voice · Email · Denial Mgmt</div>
                <div className="hero-path-cta">
                  <span>Start as AR Caller</span>
                  <span>→</span>
                </div>
              </div>
            </div>

            {/* Hiring companies secondary pill */}
            <div className="hero-paths-secondary">
              <span className="hero-paths-recruiter">
                Hiring companies?{" "}
                <Link to="/companies/directory">Browse 12,480+ verified candidates →</Link>
              </span>
            </div>
          </div>

          {/* ====== 4-STAT COUNTER BOX ====== */}
          <div className="hero-clean-stats">
            <div className="hero-clean-stat">
              <div className="hero-clean-stat-num">12,480</div>
              <div className="hero-clean-stat-label">VERIFIED CANDIDATES</div>
            </div>
            <div className="hero-clean-stat-divider" />
            <div className="hero-clean-stat">
              <div className="hero-clean-stat-num">140+</div>
              <div className="hero-clean-stat-label">HIRING COMPANIES</div>
            </div>
            <div className="hero-clean-stat-divider" />
            <div className="hero-clean-stat">
              <div className="hero-clean-stat-num">68</div>
              <div className="hero-clean-stat-label">ACADEMY PARTNERS</div>
            </div>
            <div className="hero-clean-stat-divider" />
            <div className="hero-clean-stat">
              <div className="hero-clean-stat-num">423</div>
              <div className="hero-clean-stat-label">PLACEMENTS / QUARTER</div>
            </div>
          </div>

          {/* ====== PLATFORM PULSE BADGE ====== */}
          <div className="hero-clean-pulse">
            <span className="hero-clean-pulse-dot" />
            <span className="hero-clean-pulse-label">PLATFORM PULSE</span>
            <span className="hero-clean-pulse-text">{pulseText}</span>
          </div>

          {/* ====== SCROLL TO EXPLORE HINT ====== */}
          <div className="hero-scroll-hint">
            <span className="hero-scroll-text">SCROLL TO EXPLORE</span>
            <span className="hero-scroll-arrow">↓</span>
          </div>
        </div>
      </section>

      {/* ====== LOCATION HIRING HUBS SECTION (LOCH) ====== */}
      <section className="loch-section">
        <div className="loch-bg" />
        <div className="loch-glow" />
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 840, margin: "0 auto 40px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "var(--gold-light)", textTransform: "uppercase", marginBottom: 12 }}>
              HIRING COMPANIES BY LOCATION
            </div>
            <h2 className="section-title" style={{ color: "#fff", fontSize: "clamp(34px, 5vw, 56px)" }}>
              342 RCM companies. <span style={{ color: "var(--gold)", fontStyle: "italic" }}>14 states.</span> <br />
              Hiring through Talentera.
            </h2>
            <p style={{ fontSize: 17, color: "rgba(200,209,224,0.8)", marginTop: 16, lineHeight: 1.6 }}>
              From Chennai's 111 hiring companies to Vizag's 4 — Talentera's curated database covers India's entire RCM ecosystem.{" "}
              <strong style={{ color: "var(--gold-light)" }}>Click any city to see who's hiring there.</strong>
            </p>
          </div>

          {/* Stats strip */}
          <div className="loch-stats">
            <div className="loch-stat">
              <div className="loch-stat-num">342</div>
              <div className="loch-stat-label">Companies</div>
            </div>
            <div className="loch-stat">
              <div className="loch-stat-num">14</div>
              <div className="loch-stat-label">States</div>
            </div>
            <div className="loch-stat">
              <div className="loch-stat-num">30+</div>
              <div className="loch-stat-label">Cities</div>
            </div>
            <div className="loch-stat">
              <div className="loch-stat-num">4,800+</div>
              <div className="loch-stat-label">Open Seats</div>
            </div>
          </div>

          {/* Top hiring hubs header */}
          <div className="loch-hubs-eyebrow">— TOP HIRING HUBS · CLICK TO BROWSE —</div>

          {/* City Hub Cards Grid */}
          <div className="loch-hubs">
            {cityHubs.map((hub) => {
              const isActive = activeCity === hub.city;
              return (
                <div
                  key={hub.city}
                  className={`loch-hub ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setActiveCity(hub.city);
                    setActiveFilter("ALL");
                    setSearchQuery("");
                  }}
                >
                  <div className="loch-hub-icon">{hub.icon}</div>
                  <div className="loch-hub-num">{hub.num}</div>
                  <div className="loch-hub-city">
                    {hub.city} {hub.nearby && <span style={{ fontSize: 10, color: isActive ? "var(--navy)" : "var(--gold)", opacity: 0.8 }}>+ NEARBY</span>}
                  </div>
                  <div className="loch-hub-landmark">{hub.landmark}</div>
                  <div className="loch-hub-companies-label">{hub.state} · COMPANIES</div>
                </div>
              );
            })}
          </div>

          {/* Interactive Companies List Panel */}
          <div className="loch-panel">
            <div className="loch-panel-head">
              <div className="loch-panel-loc">
                <div className="loch-panel-eyebrow">
                  {activeHubData.icon} {activeHubData.landmark} · incl. nearby
                </div>
                <div className="loch-panel-city">
                  {activeHubData.city} <span style={{ fontSize: "0.55em", opacity: 0.6 }}>+ NEARBY</span> •{" "}
                  <span className="gold">{allCompaniesForCity.length} Companies</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="loch-panel-search">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="loch-filters">
              <div className={`loch-filter ${activeFilter === "ALL" ? "active" : ""}`} onClick={() => setActiveFilter("ALL")}>
                All <span className="loch-filter-count">{countAll}</span>
              </div>
              <div className={`loch-filter ${activeFilter === "R" ? "active" : ""}`} onClick={() => setActiveFilter("R")}>
                RCM <span className="loch-filter-count">{countRCM}</span>
              </div>
              <div className={`loch-filter ${activeFilter === "M" ? "active" : ""}`} onClick={() => setActiveFilter("M")}>
                Medical Coding <span className="loch-filter-count">{countMC}</span>
              </div>
              <div className={`loch-filter ${activeFilter === "B" ? "active" : ""}`} onClick={() => setActiveFilter("B")}>
                Billing/AR <span className="loch-filter-count">{countBAR}</span>
              </div>
            </div>

            {/* Company Cards List */}
            <div className="loch-cos">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((co, idx) => {
                  const initials = co.name.replace(/[^A-Za-z]/g, "").substring(0, 2).toUpperCase();
                  return (
                    <div key={idx} className="loch-co" onClick={() => navigate("/companies/directory")}>
                      <div className="loch-co-avatar">{initials}</div>
                      <div className="loch-co-info">
                        <div className="loch-co-name">{co.name}</div>
                        <div className={`loch-co-tag ${co.cls}`}>{co.typeLabel}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "#94A3B8", gridColumn: "1/-1", textAlign: "center", padding: "20px" }}>
                  No matching companies found in {activeCity}.
                </div>
              )}
            </div>

            {/* Bottom Action CTAs */}
            <div className="loch-cta-row">
              <Link to="/companies/register" className="loch-cta-btn loch-cta-primary">
                Hire from these companies →
              </Link>
              <Link to="/register" className="loch-cta-btn loch-cta-ghost">
                Get hired at these companies ›
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====== BUILT FOR FOUR (AUDIENCES SECTION) ====== */}
      <section className="section section-cream" id="audiences" style={{ padding: "80px 0" }}>
        <div className="container">
          <div style={{ textAlign: "left", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 12 }}>
              — BUILT FOR FOUR —
            </div>
            <h2 className="section-title" style={{ fontSize: "clamp(36px, 5vw, 56px)", margin: 0 }}>
              One platform. <span style={{ color: "var(--gold)" }}>Four winners.</span>
            </h2>
            <p style={{ fontSize: 17, color: "#64748B", marginTop: 12, lineHeight: 1.6 }}>
              Whoever you are — company, candidate, academy, or Talentera team — there's a dedicated entry built for you.{" "}
              <strong style={{ color: "var(--navy)" }}>Pick your path below.</strong>
            </p>
          </div>

          <div className="aud-grid">
            {/* Card 1: Companies (Featured Dark Navy Card) */}
            <div className="aud-card featured" onClick={() => navigate("/companies/register")}>
              <div className="aud-priority-tag">★ PRIORITY</div>
              <div className="aud-icon-box featured">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#0A1F3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <line x1="15" y1="3" x2="15" y2="21"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                </svg>
              </div>
              <div className="aud-tag featured">01 · COMPANIES</div>
              <h3 className="aud-title">Hire Verified RCM Talent</h3>
              <p className="aud-body featured">
                Browse pre-verified RCM, coding, billing, and AR talent. Filter by score, location, domain. Call, text, WhatsApp directly from your dashboard.
              </p>
              <Link to="/companies/register" className="aud-cta featured">
                Post a Requirement →
              </Link>
            </div>

            {/* Card 2: Candidates (White Card) */}
            <div className="aud-card" id="candidates" onClick={() => navigate("/register")}>
              <div className="aud-icon-box normal">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#E5A82E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="aud-tag normal">02 · CANDIDATES</div>
              <h3 className="aud-title">Get Hired in RCM Free</h3>
              <p className="aud-body normal">
                Build your verified profile in 30 mins. Assessment, video, Aadhaar — all free. Get placed faster. No spam, no junk calls, no fees.
              </p>
              <Link to="/register" className="aud-cta normal">
                Build My Profile →
              </Link>
            </div>

            {/* Card 3: Academies (White Card) */}
            <div className="aud-card" id="academies" onClick={() => navigate("/academy")}>
              <div className="aud-icon-box normal">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#E5A82E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 10-10-5L2 10l10 5 10-5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <div className="aud-tag normal">03 · ACADEMIES</div>
              <h3 className="aud-title">Place Your Students Faster</h3>
              <p className="aud-body normal">
                Upload student batches. We verify and match them to live RCM openings. Earn ₹2,500 per placement, automatically. Free to join.
              </p>
              <Link to="/academy" className="aud-cta normal">
                Partner With Us →
              </Link>
            </div>

            {/* Card 4: Talentera Team (White Card) */}
            <div className="aud-card" onClick={() => navigate("/login")}>
              <div className="aud-icon-box normal">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#E5A82E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <div className="aud-tag normal">04 · TALENTERA TEAM</div>
              <h3 className="aud-title">Staff Operations Hub</h3>
              <p className="aud-body normal">
                Talentera staff — upload candidate resumes, send for verification, manage company leads, track your daily KPIs and placements.
              </p>
              <Link to="/login" className="aud-cta normal">
                Open Staff Portal →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====== THREE USER JOURNEYS INTERACTIVE SECTION ====== */}
      <section id="how" className="section section-cream">
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 740, margin: "0 auto 48px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 12 }}>
              PLATFORM JOURNEYS
            </div>
            <h2 className="section-title">
              Three clear paths built for <br />
              <span style={{ color: "var(--gold)" }}>candidates, companies, & academies.</span>
            </h2>
          </div>

          {/* Tabs selector */}
          <div className="journey-tabs">
            <button className={`journey-tab ${activeJourney === "candidate" ? "active" : ""}`} onClick={() => setActiveJourney("candidate")}>
              <span className="journey-tab-icon">🎓</span>
              <div>
                <div className="journey-tab-eyebrow">PATHWAY A</div>
                <div className="journey-tab-label">For Candidates</div>
              </div>
            </button>

            <button className={`journey-tab ${activeJourney === "company" ? "active" : ""}`} onClick={() => setActiveJourney("company")}>
              <span className="journey-tab-icon">🏢</span>
              <div>
                <div className="journey-tab-eyebrow">PATHWAY B</div>
                <div className="journey-tab-label">For Companies</div>
              </div>
            </button>

            <button className={`journey-tab ${activeJourney === "academy" ? "active" : ""}`} onClick={() => setActiveJourney("academy")}>
              <span className="journey-tab-icon">🏛️</span>
              <div>
                <div className="journey-tab-eyebrow">PATHWAY C</div>
                <div className="journey-tab-label">For Academies</div>
              </div>
            </button>
          </div>

          {/* Journey 1: Candidate */}
          {activeJourney === "candidate" && (
            <div className="journey-flow active">
              <div className="journey-flow-headline">
                From registration to <strong>verified hire</strong> in 4 simple stages
              </div>
              <div className="journey-steps">
                <div className="journey-step">
                  <div className="journey-step-num">01 REGISTRATION</div>
                  <div className="journey-step-icon-box">📝</div>
                  <div className="journey-step-title">Create Free Profile</div>
                  <div className="journey-step-body">Enter basic details, upload AAPC/AHIMA certificates, and verify Aadhaar identity.</div>
                  <div className="journey-step-time">Day 1 · 3 mins</div>
                </div>
                <div className="journey-arrow">→</div>
                <div className="journey-step">
                  <div className="journey-step-num">02 ASSESSMENT</div>
                  <div className="journey-step-icon-box">🧠</div>
                  <div className="journey-step-title">Proctored AAPC Test</div>
                  <div className="journey-step-body">Take proctored online medical coding & AR knowledge test to calculate your base score.</div>
                  <div className="journey-step-time">Day 1 · 25 mins</div>
                </div>
                <div className="journey-arrow">→</div>
                <div className="journey-step journey-step-engine">
                  <div className="journey-step-num">03 CHART AUDIT</div>
                  <div className="journey-step-icon-box journey-step-icon-engine">📊</div>
                  <div className="journey-step-title">Live Chart Audit</div>
                  <div className="journey-step-body">Audit 45 real ED & Surgery charts. Score 95%+ chart accuracy to unlock Gold Verified Badge.</div>
                  <div className="journey-step-time">Day 2 · Verified</div>
                </div>
                <div className="journey-arrow">→</div>
                <div className="journey-step journey-step-success">
                  <div className="journey-step-num">04 PLACEMENT</div>
                  <div className="journey-step-icon-box journey-step-icon-success">🎯</div>
                  <div className="journey-step-title">Direct Interview</div>
                  <div className="journey-step-body">Top RCM companies view your verified score and invite you for direct final interviews.</div>
                  <div className="journey-step-time">Day 3-7 · Placed</div>
                </div>
              </div>
              <div className="journey-cta">
                <Link to="/register" className="journey-cta-btn">
                  Start Candidate Verification Journey →
                </Link>
                <div className="journey-cta-note">100% Free for all students and jobseekers</div>
              </div>
            </div>
          )}

          {/* Journey 2: Company */}
          {activeJourney === "company" && (
            <div className="journey-flow active">
              <div className="journey-flow-headline">
                Hire verified RCM talent in <strong>24-48 hours</strong> with zero risk
              </div>
              <div className="journey-steps">
                <div className="journey-step">
                  <div className="journey-step-num">01 REQUIREMENT</div>
                  <div className="journey-step-icon-box">💼</div>
                  <div className="journey-step-title">Post Requirement</div>
                  <div className="journey-step-body">Specify role, specialty (ED, Surgery, Billing), experience, and salary range.</div>
                  <div className="journey-step-time">90 Seconds</div>
                </div>
                <div className="journey-arrow">→</div>
                <div className="journey-step journey-step-engine">
                  <div className="journey-step-num">02 MATCHING</div>
                  <div className="journey-step-icon-box journey-step-icon-engine">🔍</div>
                  <div className="journey-step-title">5 Verified Matches</div>
                  <div className="journey-step-body">Receive 5 hand-curated candidate profiles with audited chart accuracy and proctored scores.</div>
                  <div className="journey-step-time">Within 24 Hrs</div>
                </div>
                <div className="journey-arrow">→</div>
                <div className="journey-step">
                  <div className="journey-step-num">03 INTERVIEW</div>
                  <div className="journey-step-icon-box">📞</div>
                  <div className="journey-step-title">Final Interview</div>
                  <div className="journey-step-body">Conduct 1-2 final technical rounds with pre-screened, high-intent candidates.</div>
                  <div className="journey-step-time">Day 2-4</div>
                </div>
                <div className="journey-arrow">→</div>
                <div className="journey-step journey-step-success">
                  <div className="journey-step-num">04 PAY-ON-HIRE</div>
                  <div className="journey-step-icon-box journey-step-icon-success">🤝</div>
                  <div className="journey-step-title">Pay Only On Join</div>
                  <div className="journey-step-body">Candidate joins your team. Pay standard success fee only after join. 30-day replacement guarantee.</div>
                  <div className="journey-step-time">Zero Risk</div>
                </div>
              </div>
              <div className="journey-cta">
                <Link to="/companies/register" className="journey-cta-btn">
                  Register Hiring Account →
                </Link>
                <div className="journey-cta-note">No upfront cost. Pay only when you hire.</div>
              </div>
            </div>
          )}

          {/* Journey 3: Academy */}
          {activeJourney === "academy" && (
            <div className="journey-flow active">
              <div className="journey-flow-headline">
                Prove academy quality and <strong>track 100% placements</strong>
              </div>
              <div className="journey-steps">
                <div className="journey-step">
                  <div className="journey-step-num">01 PARTNER LOGIN</div>
                  <div className="journey-step-icon-box">🏛️</div>
                  <div className="journey-step-title">Academy Register</div>
                  <div className="journey-step-body">Access your dedicated academy partner portal with OTP verification.</div>
                  <div className="journey-step-time">Instant</div>
                </div>
                <div className="journey-arrow">→</div>
                <div className="journey-step">
                  <div className="journey-step-num">02 BATCH UPLOAD</div>
                  <div className="journey-step-icon-box">📤</div>
                  <div className="journey-step-title">Bulk Student Upload</div>
                  <div className="journey-step-body">Upload student batches via CSV or single-entry to initiate candidate verification.</div>
                  <div className="journey-step-time">Batch Level</div>
                </div>
                <div className="journey-arrow">→</div>
                <div className="journey-step journey-step-engine">
                  <div className="journey-step-num">03 VERIFICATION</div>
                  <div className="journey-step-icon-box journey-step-icon-engine">🏅</div>
                  <div className="journey-step-title">Badge Certification</div>
                  <div className="journey-step-body">Talentera conducts bias-free Path B assessments and issues verified academy badges.</div>
                  <div className="journey-step-time">Bias-Free</div>
                </div>
                <div className="journey-arrow">→</div>
                <div className="journey-step journey-step-success">
                  <div className="journey-step-num">04 PLACEMENT TRACKING</div>
                  <div className="journey-step-icon-box journey-step-icon-success">📈</div>
                  <div className="journey-step-title">Track Outcomes</div>
                  <div className="journey-step-body">Monitor student interview shortlists, hiring companies, and month-wise placement rates.</div>
                  <div className="journey-step-time">Live Dashboard</div>
                </div>
              </div>
              <div className="journey-cta">
                <Link to="/academy/login" className="journey-cta-btn">
                  Access Academy Partner Portal →
                </Link>
                <div className="journey-cta-note">177+ verified training academies active</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="footer">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 36, width: "auto" }} />
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
              The Era of Verified Healthcare Talent Begins Here.
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, fontSize: 13, color: "var(--text-light)" }}>
            <Link to="/companies">For Companies</Link>
            <a href="#candidates" onClick={scrollToCandidates}>For Candidates</a>
            <Link to="/academy">For Academies</Link>
            <Link to="/jobs">Browse Jobs</Link>
            <Link to="/login">Employee Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
