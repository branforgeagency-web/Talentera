import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LiquidNavCapsule from "../components/LiquidNavCapsule";

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pulseText, setPulseText] = useState("5 candidates verified in the last hour");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [readinessScore, setReadinessScore] = useState(0);

  // Location hiring hubs state
  const [activeCity, setActiveCity] = useState("Mumbai");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const pulseMessages = [
    "5 candidates verified in the last hour",
    "Priya S. (CPC) shortlisted by Access Healthcare",
    "Apex Medical Institute uploaded 42 student profiles",
    "Karthik I. (CRC) completed ED chart audit with 98% score"
  ];

  const cityHubs = [
    { city: "Chennai", num: 110, landmark: "Marina Beach · Egmore", state: "TAMIL NADU", icon: "fa-solid fa-water", nearby: true },
    { city: "Hyderabad", num: 68, landmark: "Charminar · Hi-Tech City", state: "TELANGANA", icon: "fa-solid fa-landmark", nearby: false },
    { city: "Coimbatore", num: 36, landmark: "Manchester of South India", state: "TAMIL NADU", icon: "fa-solid fa-industry", nearby: true },
    { city: "Bangalore", num: 34, landmark: "Garden City · IT Capital", state: "KARNATAKA", icon: "fa-solid fa-tree", nearby: true },
    { city: "Pune", num: 20, landmark: "Oxford of the East", state: "MAHARASHTRA", icon: "fa-solid fa-book-open", nearby: true },
    { city: "Noida", num: 13, landmark: "NCR Tech Corridor", state: "UTTAR PRADESH", icon: "fa-solid fa-building", nearby: true },
    { city: "Trichy", num: 12, landmark: "Rockfort · Temple City", state: "TAMIL NADU", icon: "fa-solid fa-gopuram", nearby: true },
    { city: "Kerala", num: 11, landmark: "God's Own Country · Backwaters", state: "KERALA", icon: "fa-solid fa-mountain-sun", nearby: false },
    { city: "Andhra Pradesh", num: 6, landmark: "Coastal AP · Vizag & Tirupathi", state: "ANDHRA PRADESH", icon: "fa-solid fa-anchor", nearby: true },
    { city: "Mumbai", num: 6, landmark: "Gateway of India · Financial Capital", state: "MAHARASHTRA", icon: "fa-solid fa-city", nearby: true },
    { city: "Other Cities", num: 12, landmark: "Pan-India · Across 8 hubs", state: "PAN-INDIA", icon: "fa-solid fa-location-dot", nearby: true }
  ];

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

  useEffect(() => {
    if (location.hash === "#candidates" || location.hash === "#audiences") {
      const el = document.getElementById("candidates") || document.getElementById("audiences");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  // Platform pulse loop
  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % pulseMessages.length;
      setPulseText(pulseMessages[idx]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Career readiness score count up animation
  useEffect(() => {
    let current = 0;
    const timer = setInterval(() => {
      current += 2;
      if (current >= 92) {
        setReadinessScore(92);
        clearInterval(timer);
      } else {
        setReadinessScore(current);
      }
    }, 30);
    return () => clearInterval(timer);
  }, []);

  const activeHubData = cityHubs.find((h) => h.city === activeCity) || cityHubs[0];
  const allCompaniesForCity = cityCompaniesData[activeCity] || [
    { name: `${activeCity} RCM Solutions`, type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
    { name: `${activeCity} Medical Billing Inc`, type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
    { name: `Global Healthcare ${activeCity}`, type: "M", typeLabel: "MEDICAL CODING", cls: "loch-co-tag-mc" }
  ];

  const countAll = allCompaniesForCity.length;
  const countRCM = allCompaniesForCity.filter((c) => c.type === "R").length;
  const countMC = allCompaniesForCity.filter((c) => c.type === "M").length;
  const countBAR = allCompaniesForCity.filter((c) => c.type === "B").length;

  const filteredCompanies = allCompaniesForCity.filter((c) => {
    const matchesFilter = activeFilter === "ALL" || c.type === activeFilter;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesFilter && matchesSearch;
  });

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

      {/* ====== 1. HERO — STUDENT FIRST (70% PROMINENCE) ====== */}
      <section className="hero-clean" style={{ position: "relative", overflow: "hidden", padding: "0 0 120px" }}>
        {/* FLOATING PREMIUM LIQUID NAV CAPSULE INSIDE HERO BANNER */}
        <LiquidNavCapsule
          items={[
            { label: "For Candidates", icon: "fa-solid fa-user-graduate", link: "/candidates" },
            { label: "For Companies", icon: "fa-solid fa-building", link: "/companies" },
            { label: "For Academies", icon: "fa-solid fa-landmark", link: "/academy" },
            { label: "How it Works", icon: "fa-solid fa-circle-play", link: "#how-it-works" }
          ]}
        />

        <div className="hero-clean-bg-grid" />
        <div className="hero-clean-glow-1" />
        <div className="hero-clean-glow-1" />
        <div className="hero-clean-glow-2" />
        <div className="hero-clean-glow-3" />

        <div className="hero-particles">
          <span className="hero-particle hero-particle-1" />
          <span className="hero-particle hero-particle-2" />
          <span className="hero-particle hero-particle-3" />
          <span className="hero-particle hero-particle-4" />
          <span className="hero-particle hero-particle-5" />
          <span className="hero-particle hero-particle-6" />
        </div>

        {/* FLOATING CANDIDATE BADGES */}
        <div className="hero-float hero-float-tl">
          <div className="hero-cand-card">
            <div className="hero-cand-pill">
              <span className="hero-cand-pill-dot" />
              <span>SKILLS VERIFIED</span>
            </div>
            <div className="hero-cand-row">
              <div className="hero-cand-avatar" style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>AK</div>
              <div className="hero-cand-info">
                <div className="hero-cand-name">Arun Kumar <span className="hero-cand-verified">✓</span></div>
                <div className="hero-cand-spec">Medical Coding Pro</div>
                <div className="hero-cand-meta">Chennai · CPC · <strong>92%</strong> Match</div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-float hero-float-tr">
          <div className="hero-cand-card">
            <div className="hero-cand-pill hero-cand-pill-gold">
              <span className="hero-cand-pill-dot hero-cand-pill-dot-gold" />
              <span>AI INTERVIEW 91%</span>
            </div>
            <div className="hero-cand-row">
              <div className="hero-cand-avatar" style={{ background: "linear-gradient(135deg, #06B6D4, #0E7490)" }}>PS</div>
              <div className="hero-cand-info">
                <div className="hero-cand-name">Priya S. <span className="hero-cand-verified">✓</span></div>
                <div className="hero-cand-spec">HCC & Risk Audit</div>
                <div className="hero-cand-meta">Hyderabad · Ready to Hire</div>
              </div>
            </div>
          </div>
        </div>

        <div className="container hero-clean-inner" style={{ position: "relative", zIndex: 5, textAlign: "center" }}>
          <div className="hero-clean-eyebrow">
            <span className="hero-clean-eyebrow-dot" />
            <span>STUDENT CAREER & SKILL PLATFORM</span>
          </div>

          <h1 className="hero-clean-title" style={{ fontSize: "clamp(46px, 7.5vw, 92px)", marginBottom: 20, lineHeight: 1.05 }}>
            Your skills can take <br />
            <span className="hero-clean-accent">you further.</span>
          </h1>

          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(20px, 3vw, 30px)", color: "var(--gold-light)", fontWeight: 700, marginBottom: 24 }}>
            Build your profile. Prove your skills. Get discovered by companies.
          </h2>

          <p className="hero-clean-sub" style={{ maxWidth: 840, fontSize: 18, margin: "0 auto 40px", lineHeight: 1.6 }}>
            Talentera helps students and job seekers showcase their skills, complete assessments, practice AI interviews, build verified profiles, and discover relevant career opportunities.
          </p>

          <div className="hero-clean-ctas">
            <Link to="/register" className="btn-gold" style={{ fontSize: 16, padding: "18px 36px" }}>
              <span>Build Your Career</span>
              <i className="fa-solid fa-arrow-right" />
            </Link>
            <Link to="/jobs" className="btn-outline" style={{ fontSize: 16, padding: "18px 32px" }}>
              <span>Explore Jobs</span>
              <i className="fa-solid fa-briefcase" />
            </Link>
          </div>

          <div style={{ marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)" }}>
            ⚡ 100% Free for Students · 12,480+ Verified Candidates · 140+ Hiring Companies
          </div>
        </div>
      </section>

      {/* ====== 2. WHAT TALENTERA DOES FOR STUDENTS (6 CARDS) ====== */}
      <section className="section" id="student-features" style={{ background: "#081B33", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto 56px" }}>
            <div className="section-eyebrow">WHAT TALENTERA DOES FOR STUDENTS</div>
            <h2 className="section-title section-title-light">
              Everything you need to become job-ready.
            </h2>
            <p className="section-lead" style={{ color: "rgba(255,255,255,0.7)" }}>
              Step-by-step tools built to empower your journey from student to hired professional.
            </p>
          </div>

          <div className="grid-3-col">
            {/* Card 1 */}
            <div className="feature-card">
              <div className="feature-card-icon">
                <i className="fa-solid fa-user-gear" />
              </div>
              <h3 className="feature-card-title">Build Your Profile</h3>
              <p className="feature-card-desc">Create a professional profile that goes beyond a traditional resume.</p>
              <div className="feature-card-tag">Interactive Portfolio</div>
            </div>

            {/* Card 2 */}
            <div className="feature-card">
              <div className="feature-card-icon">
                <i className="fa-solid fa-list-check" />
              </div>
              <h3 className="feature-card-title">Skill Assessment</h3>
              <p className="feature-card-desc">Test your knowledge and understand your strengths.</p>
              <div className="feature-card-tag">Real Job Benchmarks</div>
            </div>

            {/* Card 3 */}
            <div className="feature-card">
              <div className="feature-card-icon">
                <i className="fa-solid fa-robot" />
              </div>
              <h3 className="feature-card-title">AI Mock Interview</h3>
              <p className="feature-card-desc">Practice realistic interviews with an AI interviewer.</p>
              <div className="feature-card-tag">Instant AI Feedback</div>
            </div>

            {/* Card 4 */}
            <div className="feature-card">
              <div className="feature-card-icon">
                <i className="fa-solid fa-certificate" />
              </div>
              <h3 className="feature-card-title">Skill Verification</h3>
              <p className="feature-card-desc">Show companies what you actually know.</p>
              <div className="feature-card-tag">Aadhaar & Skill Badges</div>
            </div>

            {/* Card 5 */}
            <div className="feature-card">
              <div className="feature-card-icon">
                <i className="fa-solid fa-bullseye" />
              </div>
              <h3 className="feature-card-title">Job Matching</h3>
              <p className="feature-card-desc">Discover opportunities that match your skills and profile.</p>
              <div className="feature-card-tag">AI Match Scores</div>
            </div>

            {/* Card 6 */}
            <div className="feature-card">
              <div className="feature-card-icon">
                <i className="fa-solid fa-magnifying-glass-chart" />
              </div>
              <h3 className="feature-card-title">Get Discovered</h3>
              <p className="feature-card-desc">Allow relevant companies to find your verified profile.</p>
              <div className="feature-card-tag">Recruiter Visibility</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 3. STUDENT ASSESSMENT CONTENT ====== */}
      <section className="section" id="assessments" style={{ background: "var(--navy-deep)", position: "relative" }}>
        <div className="container">
          <div className="split-grid items-center">
            <div>
              <div className="section-eyebrow">STUDENT ASSESSMENT</div>
              <h2 className="section-title section-title-light" style={{ marginBottom: 20 }}>
                Know your skills before companies do.
              </h2>
              <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 32 }}>
                Take structured assessments designed around real job requirements. Understand your performance and identify the skills you need to improve.
              </p>
              <Link to="/register" className="btn-gold">
                <span>Take an Assessment</span>
                <i className="fa-solid fa-arrow-right" />
              </Link>
            </div>

            {/* ANIMATED ASSESSMENT RESULT PREVIEW */}
            <div className="assessment-card-preview">
              <div className="preview-card-header">
                <div className="preview-card-title">LIVE ASSESSMENT BREAKDOWN</div>
                <div className="preview-card-badge">VERIFIED RESULT</div>
              </div>

              <div className="score-bars">
                <div className="score-bar-group">
                  <div className="score-bar-label">
                    <span>Technical Skills</span>
                    <strong>92%</strong>
                  </div>
                  <div className="score-bar-track">
                    <div className="score-bar-fill" style={{ width: "92%", background: "linear-gradient(90deg, #8B5CF6, #A78BFA)" }} />
                  </div>
                </div>

                <div className="score-bar-group">
                  <div className="score-bar-label">
                    <span>Communication</span>
                    <strong>87%</strong>
                  </div>
                  <div className="score-bar-track">
                    <div className="score-bar-fill" style={{ width: "87%", background: "linear-gradient(90deg, #0EA5E9, #38BDF8)" }} />
                  </div>
                </div>

                <div className="score-bar-group">
                  <div className="score-bar-label">
                    <span>Problem Solving</span>
                    <strong>90%</strong>
                  </div>
                  <div className="score-bar-track">
                    <div className="score-bar-fill" style={{ width: "90%", background: "linear-gradient(90deg, #10B981, #34D399)" }} />
                  </div>
                </div>
              </div>

              <div className="score-overall-box">
                <div className="score-overall-lbl">OVERALL ASSESSMENT SCORE</div>
                <div className="score-overall-num">91%</div>
                <div className="score-overall-sub">Top 5% Candidate Percentile</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 4. AI INTERVIEW CONTENT ====== */}
      <section className="section" id="ai-interview" style={{ background: "#081B33", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="container">
          <div className="split-grid items-center reverse-mobile">
            {/* AI INTERVIEW TERMINAL SIMULATION */}
            <div className="ai-terminal-card">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <div className="terminal-title">AI INTERVIEWER TERMINAL v2.4</div>
                <div className="terminal-live-badge"><span className="pulse-dot" /> LIVE SIMULATION</div>
              </div>

              <div className="terminal-body">
                <div className="chat-bubble chat-ai">
                  <div className="chat-sender"><i className="fa-solid fa-robot" /> AI Interviewer</div>
                  <div className="chat-text">"Tell me about your experience with medical coding."</div>
                </div>

                <div className="chat-bubble chat-user">
                  <div className="chat-sender"><i className="fa-solid fa-user-graduate" /> Student Answer</div>
                  <div className="chat-text">"I specialize in ICD-10-CM guidelines, CPT modifier application, and ED chart auditing."</div>
                </div>

                <div className="ai-eval-results">
                  <div className="eval-header">AI EVALUATION REPORT</div>
                  <div className="eval-grid">
                    <div className="eval-item">
                      <span>Technical Accuracy</span>
                      <strong>92%</strong>
                    </div>
                    <div className="eval-item">
                      <span>Communication</span>
                      <strong>88%</strong>
                    </div>
                    <div className="eval-item">
                      <span>Confidence</span>
                      <strong>90%</strong>
                    </div>
                    <div className="eval-item eval-total">
                      <span>Overall Score</span>
                      <strong>91%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="section-eyebrow">AI MOCK INTERVIEWS</div>
              <h2 className="section-title section-title-light" style={{ marginBottom: 20 }}>
                Practice the interview before the real interview.
              </h2>
              <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 32 }}>
                Meet your AI interviewer. Answer realistic questions, receive instant feedback, and improve your confidence before speaking with a real hiring team.
              </p>
              <Link to="/register" className="btn-gold">
                <span>Try AI Interview</span>
                <i className="fa-solid fa-robot" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 5. VERIFIED STUDENT PROFILE ====== */}
      <section className="section" style={{ background: "var(--navy-deep)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto 48px" }}>
            <div className="section-eyebrow">VERIFIED STUDENT CREDENTIALS</div>
            <h2 className="section-title section-title-light">
              Don't just claim your skills. Prove them.
            </h2>
          </div>

          <div className="verified-profile-card">
            <div className="profile-card-left">
              <div className="profile-avatar-large">AK</div>
              <div>
                <h3 className="profile-name">ARUN KUMAR</h3>
                <div className="profile-role">Medical Coding Professional</div>
                <div className="profile-location">Chennai, Tamil Nadu · Aadhaar Verified</div>
              </div>
            </div>

            <div className="profile-verifications">
              <span className="ver-badge"><i className="fa-solid fa-circle-check" /> Profile Verified</span>
              <span className="ver-badge"><i className="fa-solid fa-circle-check" /> Assessment Completed</span>
              <span className="ver-badge"><i className="fa-solid fa-circle-check" /> AI Interview Completed</span>
              <span className="ver-badge"><i className="fa-solid fa-circle-check" /> Skills Verified</span>
            </div>

            <div className="profile-skills-row">
              <span className="skill-pill">Medical Coding</span>
              <span className="skill-pill">ICD-10-CM</span>
              <span className="skill-pill">CPT</span>
              <span className="skill-pill">Medical Billing</span>
              <span className="skill-pill">AR Calling</span>
            </div>

            <div className="readiness-counter-box">
              <div className="readiness-num">{readinessScore}%</div>
              <div className="readiness-lbl">CAREER READINESS SCORE</div>
              <div className="readiness-track">
                <div className="readiness-fill" style={{ width: `${readinessScore}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 6. JOB MATCHING CONTENT ====== */}
      <section className="section" style={{ background: "#081B33", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto 56px" }}>
            <div className="section-eyebrow">SKILL-BASED OPPORTUNITIES</div>
            <h2 className="section-title section-title-light">
              Find opportunities that match your skills.
            </h2>
          </div>

          <div className="grid-3-col">
            {/* Job Card 1 */}
            <div className="job-match-card">
              <div className="job-card-header">
                <div>
                  <h3 className="job-title">Medical Coder</h3>
                  <div className="job-meta">Chennai · Full Time</div>
                </div>
                <div className="job-match-badge">92% Match</div>
              </div>
              <div className="job-tags">
                <span>ICD-10-CM</span>
                <span>Medical Coding</span>
                <span>CPT</span>
              </div>
              <Link to="/register" className="job-view-btn">
                <span>View Job</span>
                <span>→</span>
              </Link>
            </div>

            {/* Job Card 2 */}
            <div className="job-match-card">
              <div className="job-card-header">
                <div>
                  <h3 className="job-title">AR Caller</h3>
                  <div className="job-meta">Bangalore · Full Time</div>
                </div>
                <div className="job-match-badge job-match-badge-blue">88% Match</div>
              </div>
              <div className="job-tags">
                <span>AR Calling</span>
                <span>Communication</span>
                <span>Healthcare</span>
              </div>
              <Link to="/register" className="job-view-btn">
                <span>View Job</span>
                <span>→</span>
              </Link>
            </div>

            {/* Job Card 3 */}
            <div className="job-match-card">
              <div className="job-card-header">
                <div>
                  <h3 className="job-title">Medical Biller</h3>
                  <div className="job-meta">Hyderabad · Full Time</div>
                </div>
                <div className="job-match-badge">95% Match</div>
              </div>
              <div className="job-tags">
                <span>Charge Entry</span>
                <span>Claims</span>
                <span>Payment Posting</span>
              </div>
              <Link to="/register" className="job-view-btn">
                <span>View Job</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 7. STUDENT CAREER JOURNEY (7 STEPS) ====== */}
      <section className="section" id="how-it-works" style={{ background: "var(--navy-deep)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto 64px" }}>
            <div className="section-eyebrow">7-STEP CAREER PIPELINE</div>
            <h2 className="section-title section-title-light">
              From learning to your first opportunity.
            </h2>
          </div>

          <div className="journey-pipeline">
            <div className="journey-step-item">
              <div className="journey-num">01</div>
              <div className="journey-name">Create</div>
              <p className="journey-desc">Build your Talentera profile.</p>
            </div>
            <div className="journey-arrow">→</div>

            <div className="journey-step-item">
              <div className="journey-num">02</div>
              <div className="journey-name">Assess</div>
              <p className="journey-desc">Measure your skills.</p>
            </div>
            <div className="journey-arrow">→</div>

            <div className="journey-step-item">
              <div className="journey-num">03</div>
              <div className="journey-name">Practice</div>
              <p className="journey-desc">Complete AI mock interviews.</p>
            </div>
            <div className="journey-arrow">→</div>

            <div className="journey-step-item">
              <div className="journey-num">04</div>
              <div className="journey-name">Verify</div>
              <p className="journey-desc">Build credibility with verified results.</p>
            </div>
            <div className="journey-arrow">→</div>

            <div className="journey-step-item">
              <div className="journey-num">05</div>
              <div className="journey-name">Match</div>
              <p className="journey-desc">Find relevant opportunities.</p>
            </div>
            <div className="journey-arrow">→</div>

            <div className="journey-step-item">
              <div className="journey-num">06</div>
              <div className="journey-name">Interview</div>
              <p className="journey-desc">Connect with hiring teams.</p>
            </div>
            <div className="journey-arrow">→</div>

            <div className="journey-step-item journey-step-highlight">
              <div className="journey-num">07</div>
              <div className="journey-name">Get Hired</div>
              <p className="journey-desc">Turn your skills into a career.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 8. WHY STUDENTS SHOULD JOIN ====== */}
      <section className="section" style={{ background: "#081B33", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto 48px" }}>
            <div className="section-eyebrow">STUDENT ADVANTAGE</div>
            <h2 className="section-title section-title-light" style={{ marginBottom: 16 }}>
              Why Talentera?
            </h2>
            <div className="free-student-badge">
              <span>⚡ Students always pay ₹0.</span>
            </div>
          </div>

          <div className="benefits-grid">
            <div className="benefit-item"><i className="fa-solid fa-circle-check" /> Free student profile</div>
            <div className="benefit-item"><i className="fa-solid fa-circle-check" /> Verified skills</div>
            <div className="benefit-item"><i className="fa-solid fa-circle-check" /> AI interview practice</div>
            <div className="benefit-item"><i className="fa-solid fa-circle-check" /> Real job opportunities</div>
            <div className="benefit-item"><i className="fa-solid fa-circle-check" /> Skill-based matching</div>
            <div className="benefit-item"><i className="fa-solid fa-circle-check" /> Company visibility</div>
            <div className="benefit-item"><i className="fa-solid fa-circle-check" /> Career readiness score</div>
            <div className="benefit-item"><i className="fa-solid fa-circle-check" /> Direct hiring opportunities</div>
          </div>
        </div>
      </section>

      {/* ====== 9. STUDENT SUCCESS CONTENT ====== */}
      <section className="section" style={{ background: "var(--navy-deep)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto 56px" }}>
            <div className="section-eyebrow">CAREER PROGRESSION</div>
            <h2 className="section-title section-title-light">
              Your next opportunity could start here.
            </h2>
          </div>

          <div className="success-flow-container">
            <div className="flow-node">
              <div className="flow-icon"><i className="fa-solid fa-user-plus" /></div>
              <div className="flow-label">Profile Created</div>
            </div>
            <div className="flow-line" />

            <div className="flow-node">
              <div className="flow-icon"><i className="fa-solid fa-chart-simple" /></div>
              <div className="flow-label">Assessment 86%</div>
            </div>
            <div className="flow-line" />

            <div className="flow-node">
              <div className="flow-icon"><i className="fa-solid fa-robot" /></div>
              <div className="flow-label">AI Interview 91%</div>
            </div>
            <div className="flow-line" />

            <div className="flow-node">
              <div className="flow-icon"><i className="fa-solid fa-shield-halved" /></div>
              <div className="flow-label">Profile Verified</div>
            </div>
            <div className="flow-line" />

            <div className="flow-node">
              <div className="flow-icon"><i className="fa-solid fa-eye" /></div>
              <div className="flow-label">Shortlisted</div>
            </div>
            <div className="flow-line" />

            <div className="flow-node flow-node-success">
              <div className="flow-icon"><i className="fa-solid fa-circle-check" /></div>
              <div className="flow-label">Hired ✓</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 10. STUDENT STATISTICS ====== */}
      <section className="section" style={{ background: "#061324", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="container">
          <div className="hero-clean-stats">
            <div className="hero-clean-stat">
              <div className="hero-clean-stat-num">12,480+</div>
              <div className="hero-clean-stat-label">VERIFIED CANDIDATES</div>
            </div>
            <div className="hero-clean-stat-divider" />
            <div className="hero-clean-stat">
              <div className="hero-clean-stat-num">140+</div>
              <div className="hero-clean-stat-label">COMPANIES</div>
            </div>
            <div className="hero-clean-stat-divider" />
            <div className="hero-clean-stat">
              <div className="hero-clean-stat-num">68</div>
              <div className="hero-clean-stat-label">ACADEMIES</div>
            </div>
            <div className="hero-clean-stat-divider" />
            <div className="hero-clean-stat">
              <div className="hero-clean-stat-num">423</div>
              <div className="hero-clean-stat-label">PLACEMENTS / QUARTER</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 11. COMPANY CONTENT (15% WEIGHT) ====== */}
      <section className="section" id="companies-hiring" style={{ background: "var(--navy-deep)" }}>
        <div className="container">
          <div className="company-section-box">
            <div className="split-grid items-center">
              <div>
                <div className="section-eyebrow" style={{ color: "#38BDF8" }}>FOR HIRING COMPANIES</div>
                <h2 className="section-title section-title-light" style={{ marginBottom: 16 }}>
                  Companies are looking for verified talent.
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 28 }}>
                  Stop searching through hundreds of resumes. Discover candidates whose skills, assessments, and interview readiness are already visible.
                </p>
                <Link to="/companies" className="btn-cyan">
                  <span>Hire Verified Talent</span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
              </div>

              <div className="co-features-mini-grid">
                <div className="co-mini-card"><i className="fa-solid fa-user-check" /> Verified candidates</div>
                <div className="co-mini-card"><i className="fa-solid fa-bullseye" /> Skill-based matching</div>
                <div className="co-mini-card"><i className="fa-solid fa-chart-bar" /> Assessment results</div>
                <div className="co-mini-card"><i className="fa-solid fa-robot" /> Interview readiness</div>
                <div className="co-mini-card"><i className="fa-solid fa-briefcase" /> Relevant job openings</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 12. ACADEMY CONTENT (15% WEIGHT) ====== */}
      <section className="section" style={{ background: "#081B33", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="container">
          <div className="academy-section-box">
            <div className="split-grid items-center">
              <div>
                <div className="section-eyebrow" style={{ color: "#34D399" }}>FOR TRAINING ACADEMIES</div>
                <h2 className="section-title section-title-light" style={{ marginBottom: 16 }}>
                  Help your students go from training to employment.
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 28 }}>
                  Talentera gives academies a way to showcase student performance, assessments, verification, and career outcomes while connecting students with relevant opportunities.
                </p>
                <Link to="/academy" className="btn-emerald">
                  <span>Partner With Talentera</span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
              </div>

              <div className="academy-flow-box">
                <div className="ac-flow-step">Academy</div>
                <div className="ac-flow-arrow">↓</div>
                <div className="ac-flow-step">Students</div>
                <div className="ac-flow-arrow">↓</div>
                <div className="ac-flow-step">Assessments</div>
                <div className="ac-flow-arrow">↓</div>
                <div className="ac-flow-step">Verified Skills</div>
                <div className="ac-flow-arrow">↓</div>
                <div className="ac-flow-step ac-flow-active">Career Opportunities</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== REDESIGNED LOCATION HIRING HUBS SECTION (LOCH) ====== */}
      <section className="loch-section" id="locations">
        <div className="loch-bg" />
        <div className="loch-glow" />

        <div className="container" style={{ position: "relative", zIndex: 5 }}>
          {/* Section Header */}
          <div style={{ textAlign: "center", maxWidth: 880, margin: "0 auto 48px" }}>
            <div className="section-eyebrow">
              <span className="hero-clean-eyebrow-dot" />
              HIRING COMPANIES BY LOCATION
            </div>
            <h2 className="section-title" style={{ color: "#fff", fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1.15 }}>
              342 RCM Companies. <span style={{ color: "var(--gold)", fontStyle: "italic" }}>14 States.</span> <br />
              Hiring through Talentera.
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 16, marginTop: 14 }}>
              Explore verified healthcare & RCM corporate employers by city, state, and hiring volume across India.
            </p>
          </div>

          {/* Stats Bar */}
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

          {/* Subheader & Search Bar */}
          <div className="loch-hubs-bar">
            <div className="loch-hubs-eyebrow">— TOP HIRING HUBS · CLICK TO BROWSE —</div>
            <div className="loch-search-wrapper">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="text"
                placeholder="Search city or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="loch-search-clear">
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* City Hub Cards Grid */}
          <div className="loch-hubs-grid">
            {cityHubs
              .filter(
                (hub) =>
                  hub.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  hub.state.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((hub) => {
                const isActive = hub.city === activeCity;
                const percentage = Math.min(100, Math.round((hub.num / 110) * 100));

                return (
                  <div
                    key={hub.city}
                    className={`loch-hub-card ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setActiveCity(hub.city);
                      setActiveFilter("ALL");
                    }}
                  >
                    <div className="loch-card-top">
                      <div className="loch-hub-icon">
                        <i className={hub.icon} />
                      </div>
                      <span className="loch-state-tag">{hub.state}</span>
                    </div>

                    <div className="loch-city-title">{hub.city}</div>

                    <div className="loch-count-badge">
                      <strong>{hub.num}</strong> Companies Hiring
                    </div>

                    <div className="loch-landmark">{hub.landmark}</div>

                    {/* Hiring Density Bar */}
                    <div className="loch-density-track">
                      <div className="loch-density-fill" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Selected City Companies Drawer Panel */}
          {activeCity && (
            <div className="loch-panel">
              <div className="loch-panel-head">
                <div>
                  <div className="loch-panel-eyebrow">ACTIVE HIRING DIRECTORY</div>
                  <div className="loch-panel-city">
                    {activeCity}{" "}
                    <span style={{ color: "var(--gold-light)", fontSize: 18 }}>
                      ({cityHubs.find((h) => h.city === activeCity)?.state || "INDIA"})
                    </span>
                  </div>
                </div>

                <div className="loch-filters">
                  {["ALL", "RCM", "MEDICAL CODING", "BILLING/AR"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`loch-filter ${activeFilter === f ? "active" : ""}`}
                      onClick={() => setActiveFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Company List Grid */}
              <div className="loch-cos">
                {(cityCompaniesData[activeCity] || [
                  { name: `${activeCity} Healthcare RCM`, typeLabel: "RCM", cls: "loch-co-tag-rcm" },
                  { name: `Apex ${activeCity} Coding Institute`, typeLabel: "MEDICAL CODING", cls: "loch-co-tag-mc" },
                  { name: `Global ${activeCity} Billing Services`, typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" }
                ])
                  .filter((co) => activeFilter === "ALL" || co.typeLabel === activeFilter)
                  .map((co, idx) => (
                    <div key={idx} className="loch-co" onClick={() => navigate("/jobs")}>
                      <div className="loch-co-avatar">{co.name.substring(0, 2).toUpperCase()}</div>
                      <div className="loch-co-info">
                        <div className="loch-co-name">{co.name}</div>
                        <span className={`loch-co-tag ${co.cls}`}>{co.typeLabel}</span>
                      </div>
                    </div>
                  ))}
              </div>

              <div style={{ textAlign: "center", marginTop: 20 }}>
                <Link to="/jobs" className="btn-gold" style={{ fontSize: 14, padding: "12px 28px" }}>
                  <span>Explore {activeCity} Openings →</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="footer">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <div>
              <img src="/logo.png" alt="Talentera Logo" style={{ height: 32 }} />
              <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 8 }}>
                The Era of Talent Begins Here. India's Verified Skill & Career Engine.
              </p>
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: 13, color: "var(--text-light)" }}>
              <Link to="/jobs">Explore Jobs</Link>
              <Link to="/register">Student Registration</Link>
              <Link to="/companies">For Companies</Link>
              <Link to="/academy">For Academies</Link>
              <Link to="/staff/login">Employee Login</Link>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 32, paddingTop: 24, fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
            © {new Date().getFullYear()} Talentera Healthcare Network. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
