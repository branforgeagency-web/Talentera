import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import LiquidNavCapsule from "../components/LiquidNavCapsule";
import Footer from "../components/Footer.jsx";
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
      q: "1. Who can create a candidate profile on Talentera?",
      a: "Medical coders, medical billers, HCC coders, risk adjustment professionals, AR professionals, and other US Healthcare RCM professionals can create a Talentera candidate profile."
    },
    {
      q: "2. Do I need an AAPC or AHIMA certification to register?",
      a: "Not necessarily. You can create a profile based on your education, experience, and skills. If you have credentials such as CPC, CIC, COC, or AHIMA certifications, you can add them to your profile for verification."
    },
    {
      q: "3. What does Talentera verify?",
      a: "Talentera verifies key parts of your professional profile through an 8-stage, 100-point verification process, including identity, education, certifications, skills, communication, chart auditing, resume quality, and your verified profile."
    },
    {
      q: "4. How can I prove my medical coding skills to employers?",
      a: "You can demonstrate your knowledge through skill assessments and live chart auditing. Your results can become part of your verified professional profile, giving employers more insight than a resume alone."
    },
    {
      q: "5. Can I find US healthcare jobs for medical coders on Talentera?",
      a: "Yes. Talentera helps candidates discover relevant US Healthcare RCM opportunities, including medical coding, medical billing, HCC, risk adjustment, AR, and other related roles."
    },
    {
      q: "6. Can I use Talentera while I am currently working?",
      a: "Yes. If you are looking for your next opportunity while employed, you can use Talentera's available privacy controls to manage how your professional information is shared."
    },
    {
      q: "7. Does getting verified guarantee me a job?",
      a: "No. Verification does not guarantee a job, interview, or specific salary. It helps you present your verified credentials, skills, experience, and assessment results to potential employers. Final hiring decisions depend on the employer and role requirements."
    }
  ];

  const stages = [
    {
      num: "01",
      name: "Identity Verification",
      desc: "Verify your identity through Aadhaar-based OTP verification and create a candidate profile with verified identity information.",
      icon: "fa-solid fa-id-card"
    },
    {
      num: "02",
      name: "Education & Training",
      desc: "Showcase your degrees, diplomas, and healthcare RCM training so employers can understand your educational and professional background.",
      icon: "fa-solid fa-graduation-cap"
    },
    {
      num: "03",
      name: "Certifications",
      desc: "Add relevant AAPC and AHIMA credentials, including CPC, CIC, and COC certifications, to your professional profile.",
      icon: "fa-solid fa-certificate"
    },
    {
      num: "04",
      name: "Skill Assessment",
      desc: "Demonstrate your knowledge through medical coding and billing assessments based on relevant healthcare RCM skills.",
      icon: "fa-solid fa-laptop-code"
    },
    {
      num: "05",
      name: "Audio / Video Introduction",
      desc: "Record a 60-second professional introduction to give employers a quick understanding of your communication and professional presence.",
      icon: "fa-solid fa-video"
    },
    {
      num: "06",
      name: "Live Chart Auditing",
      desc: "Demonstrate practical coding ability through ED, IP, and OP chart audit evaluations and receive an accuracy score.",
      icon: "fa-solid fa-file-waveform"
    },
    {
      num: "07",
      name: "ATS Resume Score",
      desc: "Build an ATS-friendly medical coding resume that clearly highlights your experience, certifications, skills, and professional strengths.",
      icon: "fa-solid fa-file-lines"
    },
    {
      num: "08",
      name: "Verified Profile Badge",
      desc: "Complete the verification process and receive a Verified Profile Badge that makes your Talentera profile easier for employers to identify.",
      icon: "fa-solid fa-shield-halved"
    }
  ];

  const benefits = [
    {
      tag: "GET SEEN BY THE RIGHT RECRUITERS",
      title: "Let Your Profile Do the Talking",
      desc: "Stop sending the same resume everywhere and hoping the right recruiter notices you. Your Talentera profile brings together your medical coding skills, certifications, experience, and assessment results, helping relevant healthcare recruiters understand your professional background.",
      icon: "fa-solid fa-bullhorn"
    },
    {
      tag: "SHOW WHAT YOU REALLY KNOW",
      title: "Don't Just List Your Skills. Show Them.",
      desc: "Anyone can add “Medical Coding” to a resume. Talentera lets you showcase your coding assessments, chart audit performance, verified credentials, and professional experience, giving employers more information than a traditional resume alone.",
      icon: "fa-solid fa-laptop-code"
    },
    {
      tag: "SPEND LESS TIME ON IRRELEVANT APPLICATIONS",
      title: "Find Opportunities That Match Your Profile",
      desc: "Your time matters. A complete profile helps present your skills, certifications, experience, and career preferences when you're exploring medical coding and US Healthcare RCM opportunities.",
      icon: "fa-solid fa-crosshairs"
    },
    {
      tag: "EXPLORE MORE WAYS TO WORK",
      title: "Remote, Hybrid & On-Site RCM Opportunities",
      desc: "Looking for flexibility? Depending on the employer and role, explore remote, hybrid, and on-site opportunities across medical coding, medical billing, risk adjustment, HCC coding, and other healthcare RCM roles.",
      icon: "fa-solid fa-house-laptop"
    },
    {
      tag: "MAKE YOUR PROFILE STAND OUT",
      title: "Earn Your Verified Candidate Badge",
      desc: "Complete all 8 verification stages and 100 verification points to earn your Talentera Verified Profile Badge. It gives employers a quick way to recognize that you've completed Talentera's verification process.",
      icon: "fa-solid fa-shield-halved"
    },
    {
      tag: "YOUR PROFILE. YOUR PRIVACY.",
      title: "Stay in Control of Your Information",
      desc: "Exploring a new opportunity while you're currently employed? Use Talentera's available privacy controls to manage how your professional information is shared while you search for your next career opportunity.",
      icon: "fa-solid fa-user-lock"
    }
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
            Begin your RCM career <br />
            <span className="fc-text-gold">with confidence.</span>
          </h1>

          <p className="fc-hero-sub">
            Create your verified profile, complete the 8-stage assessment, and unlock direct access to 342+ verified RCM companies across India—opening the door to real US healthcare jobs for medical coders. Zero fees. Full privacy.
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
              Tired of the Same Old <span className="fc-text-gold">Job Search?</span>
            </h2>
            <p className="fc-section-sub">
              Finding US healthcare jobs for medical coders shouldn't mean endlessly applying, waiting for replies, or wondering whether a job is even genuine.
              <br />
              Traditional job portals and agencies are built for everyone. Your healthcare RCM career needs a more focused approach.
            </p>
          </div>

          <div className="fc-pain-grid">
            <div className="fc-pain-card">
              <div className="fc-pain-icon"><i className="fa-solid fa-inbox" /></div>
              <h3 className="fc-pain-title">50+ Unread Applications</h3>
              <div style={{ fontWeight: 600, color: "var(--navy)", marginBottom: 6, fontSize: 14 }}>
                You apply. Then you wait.
              </div>
              <p className="fc-pain-desc">
                Your resume gets buried among hundreds of applications with little to no visibility into your application status.
              </p>
            </div>

            <div className="fc-pain-card">
              <div className="fc-pain-icon"><i className="fa-solid fa-ghost" /></div>
              <h3 className="fc-pain-title">0 Feedback From Recruiters</h3>
              <div style={{ fontWeight: 600, color: "var(--navy)", marginBottom: 6, fontSize: 14 }}>
                Interview done. Response? Nothing.
              </div>
              <p className="fc-pain-desc">
                You spend time preparing for interviews, only to be left waiting without clear feedback or knowing what happens next.
              </p>
            </div>

            <div className="fc-pain-card">
              <div className="fc-pain-icon"><i className="fa-solid fa-triangle-exclamation" /></div>
              <h3 className="fc-pain-title">500+ Fake / Scam Jobs</h3>
              <div style={{ fontWeight: 600, color: "var(--navy)", marginBottom: 6, fontSize: 14 }}>
                Not every job posting is worth your time.
              </div>
              <p className="fc-pain-desc">
                Unverified recruiters and third-party consultancies can make it difficult to know which opportunities are genuine — especially when you're searching for US healthcare jobs for medical coders.
              </p>
            </div>

            <div className="fc-pain-card">
              <div className="fc-pain-icon"><i className="fa-solid fa-eye-slash" /></div>
              <h3 className="fc-pain-title">0 Salary Transparency</h3>
              <div style={{ fontWeight: 600, color: "var(--navy)", marginBottom: 6, fontSize: 14 }}>
                What does the job actually offer?
              </div>
              <p className="fc-pain-desc">
                Candidates often struggle to find clear information about salary ranges, night-shift allowances, work-from-home options, and other important job details before applying.
              </p>
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
              8 Stages. 100 Verification Points. <span className="fc-text-gold">One Trusted Profile.</span>
            </h2>
            <p className="fc-section-sub">
              Finding the right US healthcare jobs for medical coders starts with a profile that clearly shows who you are, what you know, and what you can do.
              <br />
              Talentera's 8-stage verification process covers 100 verification points across your identity, education, certifications, skills, communication, coding ability, resume, and professional profile — helping you present your qualifications with greater clarity and confidence to healthcare employers.
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

          {/* Meaning for Candidates Box */}
          <div className="fc-fasttrack-box">
            <div style={{ maxWidth: 760 }}>
              <div className="fc-fasttrack-title">What Does Talentera's 8-Stage Verification Mean for Candidates?</div>
              <div className="fc-fasttrack-desc" style={{ marginTop: 8, lineHeight: 1.6 }}>
                It brings your identity, education, certifications, skills, assessments, and professional information together in one candidate profile.
                <br />
                Instead of relying only on a resume, you can build a profile that gives employers a clearer picture of your qualifications when you're looking for medical coding and US Healthcare RCM opportunities.
              </div>
            </div>
            <Link to="/register" className="fc-btn-gold" style={{ whiteSpace: "nowrap" }}>
              Complete Your 100-Point Verification →
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
              Make Your Medical Coding <span className="fc-text-gold">Profile Stand Out.</span>
            </h2>
            <p className="fc-section-sub fc-section-sub-dark">
              When you're looking for US healthcare jobs for medical coders, your resume is only part of your story. A verified Talentera profile brings your skills, certifications, experience, and assessments together so employers can get a clearer picture of what you bring to the role.
              <br />
              Complete your verification and build a profile that goes beyond a resume.
            </p>
          </div>

          <div className="fc-benefits-grid">
            {benefits.map((b, idx) => (
              <div key={idx} className="fc-benefit-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div className="fc-benefit-icon" style={{ marginBottom: 0 }}><i className={b.icon} /></div>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: "var(--gold-bright)",
                    background: "rgba(229, 168, 46, 0.12)",
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(229, 168, 46, 0.25)",
                    textTransform: "uppercase"
                  }}>
                    {b.tag}
                  </span>
                </div>
                <h3 className="fc-benefit-title">{b.title}</h3>
                <p className="fc-benefit-desc">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom callout */}
          <div className="fc-fasttrack-box" style={{ marginTop: 40, background: "rgba(255, 255, 255, 0.03)", borderColor: "rgba(229, 168, 46, 0.3)" }}>
            <div style={{ maxWidth: 740 }}>
              <div className="fc-fasttrack-title">Why Get Verified With Talentera?</div>
              <div className="fc-fasttrack-desc" style={{ marginTop: 6, lineHeight: 1.6 }}>
                Because your next opportunity should see more than just your resume.
                <br />
                Show employers your skills, credentials, experience, and what you're ready to do next.
              </div>
            </div>
            <Link to="/register" className="fc-btn-gold" style={{ whiteSpace: "nowrap" }}>
              Get Verified & Build Your Profile →
            </Link>
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
                "Got placed within days of completing my verification on Talentera. My verified profile helped corporate recruiters see my AAPC certification and experience without going through a consultancy."
              </p>
              <div className="fc-testi-user">
                <div className="fc-testi-avatar">PS</div>
                <div>
                  <div className="fc-testi-name">Priya Sharma</div>
                  <div className="fc-testi-role">CPC Certified Coder · Placed at Access Healthcare</div>
                  <span className="fc-testi-badge">✓ Verified & Placed</span>
                </div>
              </div>
            </div>

            <div className="fc-testi-card">
              <p className="fc-testi-quote">
                "My live chart audit score gave Optum hiring managers a clear view of my ED coding accuracy before the technical round. The hiring process was quick and straightforward."
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
                "No more wasting time on random agency calls. Talentera verified my experience and connected me with genuine billing opportunities at CorroHealth."
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
            <div className="fc-section-eyebrow">FREQUENTLY ASKED QUESTIONS</div>
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

      {/* ====== FOOTER ====== */}
      <Footer />
    </div>
  );
}
