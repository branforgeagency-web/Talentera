import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LiquidNavCapsule from "../components/LiquidNavCapsule";
import ReactiveVariableHeadline from "../components/ReactiveVariableHeadline";

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pulseText, setPulseText] = useState("5 candidates verified in the last hour");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);

  // Location hiring hubs state
  const [activeCity, setActiveCity] = useState("Mumbai");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobCategory, setSelectedJobCategory] = useState("ALL");

  const matchedOpportunities = [
    {
      id: "job-1",
      category: "CODING",
      title: "Medical Coder (CPC / CIC)",
      company: "Optum Global Solutions",
      companyInitial: "OG",
      companyGradient: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
      location: "Chennai (OMR)",
      workModel: "Hybrid",
      exp: "2-4 Yrs",
      shift: "US Night Shift",
      salary: "₹4.8L - ₹6.5L / yr",
      matchPercent: 96,
      urgency: "🔥 High Demand",
      skills: ["ICD-10-CM", "CPT-4", "ED Coding", "AAPC CPC"],
      reasons: ["AAPC CPC Verified Credential", "96% Proctored Chart Audit", "Epic EHR Certified"]
    },
    {
      id: "job-2",
      category: "AR",
      title: "AR Caller & Denial Specialist",
      company: "Omega Healthcare",
      companyInitial: "OH",
      companyGradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
      location: "Bangalore (Whitefield)",
      workModel: "On-site",
      exp: "1-3 Yrs",
      shift: "US Night Shift",
      salary: "₹3.8L - ₹5.2L / yr",
      matchPercent: 92,
      urgency: "⚡ Fast Track",
      skills: ["AR Calling", "Payer Rules", "Denial Resolution", "Communication"],
      reasons: ["AI Voice Readiness 94%", "A/R Aging Resolution Certified", "US Payer Portal Ready"]
    },
    {
      id: "job-3",
      category: "BILLING",
      title: "Medical Biller & Claims Lead",
      company: "Access Healthcare",
      companyInitial: "AH",
      companyGradient: "linear-gradient(135deg, #10B981 0%, #047857 100%)",
      location: "Hyderabad (HITEC City)",
      workModel: "Full Time",
      exp: "3-5 Yrs",
      shift: "Flexible Shift",
      salary: "₹4.5L - ₹6.0L / yr",
      matchPercent: 95,
      urgency: "⚡ Immediate Joiner",
      skills: ["Charge Entry", "Claims", "Payment Posting", "AthenaHealth"],
      reasons: ["Zero Claims Error History", "Clearinghouse EDI 837/835", "98% Clean Claim Rate"]
    },
    {
      id: "job-4",
      category: "AUDIT",
      title: "IP-DRG Chart Quality Auditor",
      company: "GeBBS Healthcare",
      companyInitial: "GH",
      companyGradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      location: "Mumbai (Andheri)",
      workModel: "Hybrid",
      exp: "4-6 Yrs",
      shift: "Day Shift (India)",
      salary: "₹6.5L - ₹8.8L / yr",
      matchPercent: 91,
      urgency: "🏆 Premium Role",
      skills: ["Inpatient DRG", "AHIMA CCS", "Clinical Audit", "3M 360"],
      reasons: ["AHIMA CCS Active Standing", "98% IP Audit Accuracy", "Surgical Coding Depth"]
    },
    {
      id: "job-5",
      category: "HCC",
      title: "HCC Risk Adjustment Specialist",
      company: "Episource Healthcare",
      companyInitial: "EH",
      companyGradient: "linear-gradient(135deg, #EC4899 0%, #BE185D 100%)",
      location: "Coimbatore",
      workModel: "Remote / WFH",
      exp: "2-5 Yrs",
      shift: "Flexible Shift",
      salary: "₹4.2L - ₹5.8L / yr",
      matchPercent: 94,
      urgency: "🏠 Remote Friendly",
      skills: ["HCC / RAF", "AAPC CRC", "MEAT Criteria", "Risk Adjustment"],
      reasons: ["CRC Verified Credential", "Risk Score Optimization", "100% Home Office Ready"]
    },
    {
      id: "job-6",
      category: "CODING",
      title: "Surgery & Anesthesia Coder",
      company: "R1 RCM Global",
      companyInitial: "R1",
      companyGradient: "linear-gradient(135deg, #E5A82E 0%, #B47C18 100%)",
      location: "Noida / Delhi NCR",
      workModel: "Hybrid",
      exp: "3-5 Yrs",
      shift: "US Shift",
      salary: "₹5.5L - ₹7.5L / yr",
      matchPercent: 89,
      urgency: "🔥 High Package",
      skills: ["Surgical Coding", "Anesthesia CPT", "ASA Modifiers", "Cerner"],
      reasons: ["ASA Crosswalk Mastery", "Op-Note Interpretation", "Proctored Test Verified"]
    }
  ];

  const jobCategoryTabs = [
    { id: "ALL", label: "All Roles", count: "420+" },
    { id: "CODING", label: "Medical Coding", count: "184" },
    { id: "AR", label: "AR Calling", count: "96" },
    { id: "BILLING", label: "Billing & Claims", count: "78" },
    { id: "AUDIT", label: "Quality Audit", count: "34" },
    { id: "HCC", label: "Risk Adjustment (HCC)", count: "28" },
  ];

  // Hero Banner Audience Switcher State (Students/Candidates, Companies, Academies)
  const [heroAudience, setHeroAudience] = useState("candidates");
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const faqs = [
    {
      q: "What is Talentera?",
      a: "Talentera is a verified talent ecosystem for the Healthcare RCM industry, connecting candidates, hiring companies, and academies through a structured verification journey."
    },
    {
      q: "Is Talentera a job portal?",
      a: "Talentera goes beyond a traditional job portal. Candidates build structured profiles and demonstrate their journey, helping companies understand talent with greater context."
    },
    {
      q: "How does Talentera verification work?",
      a: "Candidates progress through structured stages including profile information, training, certifications, assessments, practical evaluation, and professional profile building. Each stage adds more context and credibility."
    },
    {
      q: "Is Talentera free for candidates?",
      a: "Yes. Candidates can register and begin building their professional profile on Talentera for free."
    },
    {
      q: "How can I find Healthcare RCM jobs on Talentera?",
      a: "Candidates can build their profile, complete relevant verification stages, and explore Healthcare RCM job opportunities based on their skills and professional journey."
    },
    {
      q: "What is a Talentera Verified Resume?",
      a: "A Talentera Verified Resume is generated using structured information from a candidate's professional and verification journey, creating a profile that goes beyond self-written claims."
    },
    {
      q: "How can Healthcare RCM companies hire through Talentera?",
      a: "Companies can discover structured candidate profiles, review relevant verification information, shortlist suitable talent, and hire based on their requirements."
    }
  ];

  const heroAudiences = {
    candidates: {
      key: "candidates",
      tabLabel: "For Candidates",
      tabIcon: "fa-solid fa-user-graduate",
      activeClass: "active",
      eyebrow: "STUDENT & CANDIDATE CAREER ENGINE",
      eyebrowDotColor: "var(--gold)",
      tagline: "Build Your Profile. Prove Your Skills. Get Discovered.",
      description: "Talentera connects Healthcare RCM candidates, hiring companies, and academies through a structured verification ecosystem built on proof and trust.",
      primaryCta: { label: "Build Your Career →", link: "/register", icon: "", cls: "btn-gold" },
      secondaryCta: { label: "Explore Healthcare RCM Jobs", link: "/jobs", icon: "fa-solid fa-briefcase", cls: "btn-outline" },
      ticker: "Free for Candidates • Verified Talent Profiles • Healthcare RCM Opportunities",
      leftCard: {
        pill: "SKILLS VERIFIED",
        pillCls: "",
        avatarBg: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
        initials: "AK",
        name: "Arun Kumar",
        spec: "Medical Coding Pro",
        meta: "Chennai · CPC · 92% Match"
      },
      rightCard: {
        pill: "AI INTERVIEW 94%",
        pillCls: "hero-cand-pill-gold",
        avatarBg: "linear-gradient(135deg, #06B6D4, #0E7490)",
        initials: "PS",
        name: "Priya S.",
        spec: "HCC & Risk Audit",
        meta: "Hyderabad · Ready to Hire"
      }
    },
    companies: {
      key: "companies",
      tabLabel: "For Companies",
      tabIcon: "fa-solid fa-building",
      activeClass: "active-companies",
      eyebrow: "ENTERPRISE RCM HIRING PORTAL",
      eyebrowDotColor: "#38BDF8",
      tagline: "Hire Verified Healthcare RCM Talent With Greater Confidence.",
      description: "Discover structured candidate profiles with deeper visibility into skills, verification, and professional readiness — and pay only on successful placement.",
      primaryCta: { label: "Browse Verified Candidates", link: "/companies/register", icon: "fa-solid fa-users", cls: "btn-gold" },
      secondaryCta: { label: "Post a Requirement", link: "/companies/jobs", icon: "fa-solid fa-file-invoice", cls: "btn-outline" },
      ticker: "Free for Candidates • Verified Talent Profiles • Healthcare RCM Opportunities",
      leftCard: {
        pill: "TOP EMPLOYER",
        pillCls: "hero-cand-pill-gold",
        avatarBg: "linear-gradient(135deg, #0284C7, #0369A1)",
        initials: "OG",
        name: "Optum Healthcare",
        spec: "12 Coders Hired in 14 Days",
        meta: "OMR Chennai · 800+ Coders"
      },
      rightCard: {
        pill: "LIVE AAPC / AHIMA API",
        pillCls: "hero-cand-pill-emerald",
        avatarBg: "linear-gradient(135deg, #10B981, #047857)",
        initials: "AP",
        name: "Verified Credentials",
        spec: "Zero Fake Resumes",
        meta: "100% Audit-Ready Profiles"
      }
    },
    academies: {
      key: "academies",
      tabLabel: "For Academies",
      tabIcon: "fa-solid fa-landmark",
      activeClass: "active-academies",
      eyebrow: "INSTITUTIONAL ACADEMY NETWORK",
      eyebrowDotColor: "#34D399",
      tagline: "Turn Training Into Verified Outcomes.",
      description: "Partner with Talentera to help students demonstrate their skills, build credible professional profiles, and connect training with Healthcare RCM career opportunities.",
      primaryCta: { label: "Partner With Talentera", link: "/academy", icon: "fa-solid fa-handshake", cls: "btn-gold" },
      secondaryCta: { label: "Academy Portal Login", link: "/academy/login", icon: "fa-solid fa-graduation-cap", cls: "btn-outline" },
      ticker: "Free for Candidates • Verified Talent Profiles • Healthcare RCM Opportunities",
      leftCard: {
        pill: "COHORT COCKPIT",
        pillCls: "hero-cand-pill-emerald",
        avatarBg: "linear-gradient(135deg, #10B981, #059669)",
        initials: "AC",
        name: "Apex RCM Academy",
        spec: "Batch #24 · 48 Students",
        meta: "46 / 48 Certified (96%)"
      },
      rightCard: {
        pill: "CAMPUS PLACEMENT",
        pillCls: "hero-cand-pill-gold",
        avatarBg: "linear-gradient(135deg, #F59E0B, #D97706)",
        initials: "PL",
        name: "Partner Placement Drive",
        spec: "85.4% Placement Rate",
        meta: "Direct Partner Placements"
      }
    }
  };

  const currentAudience = heroAudiences[heroAudience] || heroAudiences.candidates;

  const studentFeatures = [
    {
      id: "profile",
      title: "Build Your Profile",
      desc: "Create a professional profile that goes beyond a traditional resume.",
      tag: "INTERACTIVE PROFILE",
      badgeColor: "#E5A82E",
      icon: "fa-solid fa-user-gear",
      points: [
        "Interactive digital portfolio with verified clinical chart experience",
        "Aadhaar e-KYC instant verification & employer trust badge",
        "Dynamic specialty credentials (CPC, CRC, CPB, Inpatient & ED)",
        "Shareable verified link with 1-click direct recruiter applications",
      ],
      ctaText: "Create Your Free Profile",
      ctaLink: "/register",
      previewType: "profile",
    },
    {
      id: "assessment",
      title: "Skill Assessment",
      desc: "Test your knowledge and understand your professional strengths.",
      tag: "REAL JOB BENCHMARKS",
      badgeColor: "#8B5CF6",
      icon: "fa-solid fa-list-check",
      points: [
        "Real-world chart audit scenarios based on hospital benchmarks",
        "Instant national percentile ranking against 12,480+ peer candidates",
        "Automated sub-skill breakdown: ICD-10-CM, CPT, Modifiers & HCPCS",
        "Actionable skill gap roadmap with focused improvement guides",
      ],
      ctaText: "Take Free Assessment",
      ctaLink: "/register",
      previewType: "assessment",
    },
    {
      id: "interview",
      title: "AI Mock Interview",
      desc: "Practice realistic interviews and improve your professional confidence.",
      tag: "INSTANT AI FEEDBACK",
      badgeColor: "#06B6D4",
      icon: "fa-solid fa-robot",
      points: [
        "Conversational AI simulates real technical RCM & coding rounds",
        "Real-time evaluation of terminology accuracy, clarity & pacing",
        "Audio voice response analysis with confidence metrics",
        "Question-by-question model answers and targeted coaching",
      ],
      ctaText: "Practice AI Interview",
      ctaLink: "/register",
      previewType: "interview",
    },
    {
      id: "verification",
      title: "Skill Verification",
      desc: "Add structured proof to the skills behind your professional profile.",
      tag: "SKILL & PROFILE VERIFICATION",
      badgeColor: "#10B981",
      icon: "fa-solid fa-certificate",
      points: [
        "Tamper-proof digital credentials verified with Government ID",
        "Proctored assessment audit trail with anti-cheating verification",
        "Endorsed by leading healthcare training academies & institutes",
        "Ranked among top verified talent pipelines across India",
      ],
      ctaText: "Get Verified Now",
      ctaLink: "/register",
      previewType: "verification",
    },
    {
      id: "matching",
      title: "Job Matching",
      desc: "Discover Healthcare RCM jobs relevant to your skills and profile.",
      tag: "AI MATCH SCORES",
      badgeColor: "#EC4899",
      icon: "fa-solid fa-bullseye",
      points: [
        "Algorithmic matching against 140+ active hiring companies",
        "Transparent match percentage scores for every job opening",
        "Specialty filters for Medical Coding, Billing, AR & Chart Auditing",
        "Clear salary transparency, shift details & work-from-home options",
      ],
      ctaText: "Explore Matched Jobs",
      ctaLink: "/jobs",
      previewType: "matching",
    },
    {
      id: "discovered",
      title: "Get Discovered",
      desc: "Make your verified profile visible to relevant hiring companies.",
      tag: "RECRUITER VISIBILITY",
      badgeColor: "#3B82F6",
      icon: "fa-solid fa-magnifying-glass-chart",
      points: [
        "Direct recruiter search & filter spotlight for verified graduates",
        "Receive direct interview invitations skipping basic initial screenings",
        "4.2x faster hiring turnaround from application to offer letter",
        "Real-time alerts when top healthcare companies view your profile",
      ],
      ctaText: "Get Discovered by Recruiters",
      ctaLink: "/register",
      previewType: "discovered",
    },
  ];

  const renderStudentDetailPanel = (feat, idx) => (
    <div className="student-preview-panel bento-detail-panel" key={feat.id}>
      <div
        className="student-preview-glow"
        style={{ background: `radial-gradient(circle at 80% 20%, ${feat.badgeColor}22 0%, transparent 70%)` }}
      />

      <button
        type="button"
        className="bento-detail-close"
        onClick={() => setActiveFeatureTab(null)}
        aria-label="Collapse"
      >
        <i className="fa-solid fa-xmark" />
      </button>

      {/* PREVIEW HEADER */}
      <div className="student-preview-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            className="student-preview-pill"
            style={{ borderColor: `${feat.badgeColor}66`, color: feat.badgeColor, background: `${feat.badgeColor}15` }}
          >
            <i className={feat.icon} style={{ marginRight: 6 }} />
            {feat.tag}
          </span>
          <span className="student-preview-live-badge">
            <span className="live-dot" /> LIVE INTERACTIVE PREVIEW
          </span>
        </div>
        <div className="student-preview-step-count">FEATURE 0{idx + 1} OF 06</div>
      </div>

      <div className="student-preview-headline-wrap">
        <h3 className="student-preview-main-title">{feat.title}</h3>
        <p className="student-preview-main-desc">{feat.desc}</p>
      </div>

      <div className="student-preview-visual-stage">
        {/* 1. BUILD YOUR PROFILE */}
        {feat.previewType === "profile" && (
          <div className="st-mock-profile-card">
            <div className="st-mock-profile-top">
              <div className="st-mock-avatar">AK</div>
              <div className="st-mock-user-info">
                <div className="st-mock-name-row">
                  <span className="st-mock-name">Arun Kumar</span>
                  <span className="st-mock-verified-pill">
                    <i className="fa-solid fa-circle-check" /> Aadhaar Verified
                  </span>
                </div>
                <div className="st-mock-sub">Medical Coding Specialist · Chennai, TN</div>
              </div>
              <div className="st-mock-cert-pill">
                <i className="fa-solid fa-award" /> CPC Certified
              </div>
            </div>

            <div className="st-mock-strength-bar">
              <div className="st-mock-strength-label">
                <span>
                  Profile Strength: <strong>All Star</strong>
                </span>
                <span style={{ color: "#E5A82E", fontWeight: 700 }}>98% Complete</span>
              </div>
              <div className="st-mock-progress-track">
                <div
                  className="st-mock-progress-fill"
                  style={{ width: "98%", background: "linear-gradient(90deg, #E5A82E, #FCD34D)" }}
                />
              </div>
            </div>

            <div className="st-mock-skills-row">
              <span className="st-skill-chip">
                <i className="fa-solid fa-code" /> ICD-10-CM
              </span>
              <span className="st-skill-chip">
                <i className="fa-solid fa-file-medical" /> CPT Coding
              </span>
              <span className="st-skill-chip">
                <i className="fa-solid fa-hospital-user" /> ED Auditing
              </span>
              <span className="st-skill-chip">
                <i className="fa-solid fa-notes-medical" /> E/M Guidelines
              </span>
              <span className="st-skill-chip">
                <i className="fa-solid fa-shield-halved" /> HIPAA
              </span>
            </div>

            <div className="st-mock-meta-footer">
              <span>
                <i className="fa-solid fa-eye" /> 24 Recruiters viewed profile this week
              </span>
              <span className="st-mock-active-dot">● Active for Direct Hire</span>
            </div>
          </div>
        )}

        {/* 2. SKILL ASSESSMENT */}
        {feat.previewType === "assessment" && (
          <div className="st-mock-assessment-card">
            <div className="st-mock-assessment-head">
              <div>
                <div className="st-mock-test-title">Clinical Chart Audit & Coding Benchmark</div>
                <div className="st-mock-test-meta">Timed Proctored Exam · 50 Clinical Scenarios</div>
              </div>
              <div className="st-mock-score-badge">
                <div className="st-mock-score-val">94%</div>
                <div className="st-mock-score-lbl">Top 5% National</div>
              </div>
            </div>

            <div className="st-mock-bars-list">
              <div className="st-bar-item">
                <div className="st-bar-header">
                  <span>Technical Guidelines & ICD-10</span>
                  <strong>96%</strong>
                </div>
                <div className="st-bar-track">
                  <div
                    className="st-bar-fill"
                    style={{ width: "96%", background: "linear-gradient(90deg, #8B5CF6, #C084FC)" }}
                  />
                </div>
              </div>

              <div className="st-bar-item">
                <div className="st-bar-header">
                  <span>CPT Modifiers & Mutually Exclusive Edits</span>
                  <strong>91%</strong>
                </div>
                <div className="st-bar-track">
                  <div
                    className="st-bar-fill"
                    style={{ width: "91%", background: "linear-gradient(90deg, #6366F1, #818CF8)" }}
                  />
                </div>
              </div>

              <div className="st-bar-item">
                <div className="st-bar-header">
                  <span>Audit Speed & Accuracy Rate</span>
                  <strong>95%</strong>
                </div>
                <div className="st-bar-track">
                  <div
                    className="st-bar-fill"
                    style={{ width: "95%", background: "linear-gradient(90deg, #10B981, #34D399)" }}
                  />
                </div>
              </div>
            </div>

            <div className="st-mock-benchmark-note">
              <i className="fa-solid fa-bolt" style={{ color: "#8B5CF6" }} />
              <span>
                Scored higher than <strong>95% of candidates</strong> across Pan-India hiring benchmarks.
              </span>
            </div>
          </div>
        )}

        {/* 3. AI MOCK INTERVIEW */}
        {feat.previewType === "interview" && (
          <div className="st-mock-interview-card">
            <div className="st-ai-bubble-wrap">
              <div className="st-ai-bubble-avatar">
                <i className="fa-solid fa-robot" />
              </div>
              <div className="st-ai-bubble-content">
                <div className="st-ai-bubble-author">AI Technical Evaluator · RCM & Coding</div>
                <p className="st-ai-bubble-text">
                  "In an emergency department encounter, how do you determine if modifier -25 is appropriate for a
                  separate E/M service on the same day?"
                </p>
              </div>
            </div>

            <div className="st-audio-visualizer-box">
              <div className="st-audio-label">
                <span>
                  <i className="fa-solid fa-microphone-lines" /> Voice Response Stream
                </span>
                <span className="st-audio-rec">● LIVE RECORDING</span>
              </div>
              <div className="st-waveform-bars">
                {[35, 60, 45, 80, 95, 70, 50, 85, 90, 65, 40, 75, 100, 85, 60, 90, 70, 45, 65, 80, 55, 30].map(
                  (h, i) => (
                    <span
                      key={i}
                      className="st-wave-bar"
                      style={{ height: `${h}%`, animationDelay: `${(i % 5) * 0.15}s` }}
                    />
                  )
                )}
              </div>
            </div>

            <div className="st-ai-metrics-grid">
              <div className="st-ai-metric-box">
                <span className="st-ai-m-val" style={{ color: "#06B6D4" }}>
                  95%
                </span>
                <span className="st-ai-m-lbl">Guideline Accuracy</span>
              </div>
              <div className="st-ai-metric-box">
                <span className="st-ai-m-val" style={{ color: "#10B981" }}>
                  94%
                </span>
                <span className="st-ai-m-lbl">Clinical Terminology</span>
              </div>
              <div className="st-ai-metric-box">
                <span className="st-ai-m-val" style={{ color: "#E5A82E" }}>
                  92%
                </span>
                <span className="st-ai-m-lbl">Confidence & Clarity</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. SKILL VERIFICATION */}
        {feat.previewType === "verification" && (
          <div className="st-mock-verify-card">
            <div className="st-verify-badges-grid">
              <div className="st-verify-badge-item">
                <div
                  className="st-verify-icon-circle"
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#10B981",
                    borderColor: "rgba(16, 185, 129, 0.4)",
                  }}
                >
                  <i className="fa-solid fa-id-card-clip" />
                </div>
                <div className="st-verify-badge-info">
                  <div className="st-verify-b-name">
                    Aadhaar e-KYC Verified <i className="fa-solid fa-circle-check" style={{ color: "#10B981" }} />
                  </div>
                  <div className="st-verify-b-sub">100% Identity Authenticated</div>
                </div>
                <span className="st-verify-b-tag" style={{ color: "#10B981" }}>
                  GOVT VALIDATED
                </span>
              </div>

              <div className="st-verify-badge-item">
                <div
                  className="st-verify-icon-circle"
                  style={{
                    background: "rgba(229, 168, 46, 0.15)",
                    color: "#E5A82E",
                    borderColor: "rgba(229, 168, 46, 0.4)",
                  }}
                >
                  <i className="fa-solid fa-certificate" />
                </div>
                <div className="st-verify-badge-info">
                  <div className="st-verify-b-name">
                    AAPC / CPC Professional Coder{" "}
                    <i className="fa-solid fa-circle-check" style={{ color: "#E5A82E" }} />
                  </div>
                  <div className="st-verify-b-sub">Credential #849204 · Active Verified</div>
                </div>
                <span className="st-verify-b-tag" style={{ color: "#E5A82E" }}>
                  GOLD TIER
                </span>
              </div>

              <div className="st-verify-badge-item">
                <div
                  className="st-verify-icon-circle"
                  style={{
                    background: "rgba(139, 92, 246, 0.15)",
                    color: "#8B5CF6",
                    borderColor: "rgba(139, 92, 246, 0.4)",
                  }}
                >
                  <i className="fa-solid fa-award" />
                </div>
                <div className="st-verify-badge-info">
                  <div className="st-verify-b-name">
                    Proctored Chart Audit Badge <i className="fa-solid fa-circle-check" style={{ color: "#8B5CF6" }} />
                  </div>
                  <div className="st-verify-b-sub">Anti-Fraud Proctor Verified · 98% Accuracy</div>
                </div>
                <span className="st-verify-b-tag" style={{ color: "#8B5CF6" }}>
                  ACADEMY ENDORSED
                </span>
              </div>
            </div>

            <div className="st-verify-security-footer">
              <i className="fa-solid fa-lock" />
              <span>Cryptographically secured digital credentials trusted by 140+ verified employers.</span>
            </div>
          </div>
        )}

        {/* 5. JOB MATCHING */}
        {feat.previewType === "matching" && (
          <div className="st-mock-jobs-card">
            <div className="st-job-match-item">
              <div className="st-job-match-top">
                <div>
                  <div className="st-job-company">Access Healthcare</div>
                  <div className="st-job-role">Medical Coder II · Inpatient & ED</div>
                </div>
                <div
                  className="st-job-match-score"
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#10B981",
                    borderColor: "rgba(16, 185, 129, 0.4)",
                  }}
                >
                  <i className="fa-solid fa-bolt" /> 96% MATCH
                </div>
              </div>
              <div className="st-job-meta-row">
                <span>
                  <i className="fa-solid fa-location-dot" /> Chennai / Hybrid
                </span>
                <span>
                  <i className="fa-solid fa-money-bill-wave" /> ₹4.8 - ₹6.5 LPA
                </span>
                <span>
                  <i className="fa-solid fa-briefcase" /> Full Time
                </span>
              </div>
            </div>

            <div className="st-job-match-item">
              <div className="st-job-match-top">
                <div>
                  <div className="st-job-company">Omega Healthcare</div>
                  <div className="st-job-role">RCM Quality Analyst & Billing Specialist</div>
                </div>
                <div
                  className="st-job-match-score"
                  style={{
                    background: "rgba(6, 182, 212, 0.15)",
                    color: "#06B6D4",
                    borderColor: "rgba(6, 182, 212, 0.4)",
                  }}
                >
                  <i className="fa-solid fa-bolt" /> 92% MATCH
                </div>
              </div>
              <div className="st-job-meta-row">
                <span>
                  <i className="fa-solid fa-location-dot" /> Bangalore / Remote
                </span>
                <span>
                  <i className="fa-solid fa-money-bill-wave" /> ₹4.2 - ₹5.8 LPA
                </span>
                <span>
                  <i className="fa-solid fa-briefcase" /> Full Time
                </span>
              </div>
            </div>

            <div className="st-jobs-footer-note">
              <i className="fa-solid fa-circle-nodes" />
              <span>AI matches your verified score directly with hiring requisitions — zero spam applications.</span>
            </div>
          </div>
        )}

        {/* 6. GET DISCOVERED */}
        {feat.previewType === "discovered" && (
          <div className="st-mock-discovered-card">
            <div className="st-recruiter-alert-bar">
              <span className="st-rec-pulse" />
              <span>
                <strong>3 Healthcare Recruiters</strong> viewed your verified profile in the last 2 hours
              </span>
            </div>

            <div className="st-recruiter-invite-box">
              <div className="st-invite-header">
                <div className="st-invite-co-logo">CH</div>
                <div className="st-invite-co-meta">
                  <div className="st-invite-co-name">CorroHealth Talent Acquisition</div>
                  <div className="st-invite-time">Direct Interview Invitation · 15m ago</div>
                </div>
                <span className="st-invite-badge">PRIORITY INVITE</span>
              </div>

              <p className="st-invite-msg">
                "We reviewed your 94% Chart Audit Benchmark and CPC Certification. We would like to fast-track your
                application for the Senior Coder role."
              </p>

              <div className="st-invite-actions">
                <button type="button" className="btn-gold" style={{ padding: "8px 18px", fontSize: 13 }}>
                  <span>Accept Interview</span>
                  <i className="fa-solid fa-calendar-check" />
                </button>
                <button type="button" className="btn-outline" style={{ padding: "8px 16px", fontSize: 13 }}>
                  <span>View Job Requisition</span>
                </button>
              </div>
            </div>

            <div className="st-discovered-stat-row">
              <div className="st-disc-stat">
                <strong>4.2x</strong>
                <span>Faster Placement</span>
              </div>
              <div className="st-disc-stat">
                <strong>140+</strong>
                <span>Hiring Partners</span>
              </div>
              <div className="st-disc-stat">
                <strong>0</strong>
                <span>Recruiter Middlemen</span>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* KEY HIGHLIGHTS / BULLET POINTS */}
      <div className="student-preview-points-wrap">
        <div className="student-preview-points-title">KEY CAPABILITIES & BENEFITS</div>
        <div className="student-preview-points-grid">
          {feat.points.map((pt, i) => (
            <div key={i} className="student-preview-point-item">
              <span className="st-point-check" style={{ color: feat.badgeColor }}>
                <i className="fa-solid fa-check" />
              </span>
              <span className="st-point-text">{pt}</span>
            </div>
          ))}
        </div>
      </div>
      {/* PREVIEW BOTTOM ACTION BAR */}
      <div className="student-preview-action-footer">
        <Link to={feat.ctaLink} className="btn-gold" style={{ fontSize: 15, padding: "14px 28px" }}>
          <span>{feat.ctaText}</span>
          <i className="fa-solid fa-arrow-right" />
        </Link>
        <div className="student-preview-guarantee">
          <i className="fa-solid fa-shield-check" style={{ color: "var(--gold)" }} />
          <span>100% Free for Students & Job Seekers</span>
        </div>
      </div>
    </div>
  );

  const pulseMessages = [
    "5 candidates verified in the last hour",
    "Priya S. (CPC) shortlisted by Access Healthcare",
    "Apex Medical Institute uploaded 42 student profiles",
    "Karthik I. (CRC) completed ED chart audit with 98% score",
  ];

  const cityHubs = [
    {
      city: "Chennai",
      num: 110,
      landmark: "Marina Beach · Egmore",
      state: "TAMIL NADU",
      icon: "fa-solid fa-water",
      nearby: true,
    },
    {
      city: "Hyderabad",
      num: 68,
      landmark: "Charminar · Hi-Tech City",
      state: "TELANGANA",
      icon: "fa-solid fa-landmark",
      nearby: false,
    },
    {
      city: "Coimbatore",
      num: 36,
      landmark: "Manchester of South India",
      state: "TAMIL NADU",
      icon: "fa-solid fa-industry",
      nearby: true,
    },
    {
      city: "Bangalore",
      num: 34,
      landmark: "Garden City · IT Capital",
      state: "KARNATAKA",
      icon: "fa-solid fa-tree",
      nearby: true,
    },
    {
      city: "Pune",
      num: 20,
      landmark: "Oxford of the East",
      state: "MAHARASHTRA",
      icon: "fa-solid fa-book-open",
      nearby: true,
    },
    {
      city: "Noida",
      num: 13,
      landmark: "NCR Tech Corridor",
      state: "UTTAR PRADESH",
      icon: "fa-solid fa-building",
      nearby: true,
    },
    {
      city: "Trichy",
      num: 12,
      landmark: "Rockfort · Temple City",
      state: "TAMIL NADU",
      icon: "fa-solid fa-gopuram",
      nearby: true,
    },
    {
      city: "Kerala",
      num: 11,
      landmark: "God's Own Country · Backwaters",
      state: "KERALA",
      icon: "fa-solid fa-mountain-sun",
      nearby: false,
    },
    {
      city: "Andhra Pradesh",
      num: 6,
      landmark: "Coastal AP · Vizag & Tirupathi",
      state: "ANDHRA PRADESH",
      icon: "fa-solid fa-anchor",
      nearby: true,
    },
    {
      city: "Mumbai",
      num: 6,
      landmark: "Gateway of India · Financial Capital",
      state: "MAHARASHTRA",
      icon: "fa-solid fa-city",
      nearby: true,
    },
    {
      city: "Other Cities",
      num: 12,
      landmark: "Pan-India · Across 8 hubs",
      state: "PAN-INDIA",
      icon: "fa-solid fa-location-dot",
      nearby: true,
    },
  ];

  const cityCompaniesData = {
    Mumbai: [
      { name: "Atos", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
      { name: "H2 RCM Healthcare", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
      { name: "Health Prime", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
      { name: "IKS Health Care", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
      { name: "Sagility Healthcare", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
      { name: "Ascent Business Solutions", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
    ],
    Chennai: [
      { name: "Access Healthcare", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
      { name: "Omega Healthcare", type: "M", typeLabel: "MEDICAL CODING", cls: "loch-co-tag-mc" },
      { name: "GeBBS Healthcare Solutions", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
      { name: "Vee Technologies", type: "M", typeLabel: "MEDICAL CODING", cls: "loch-co-tag-mc" },
      { name: "AGS Health", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
      { name: "CareStack", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
    ],
    Hyderabad: [
      { name: "Optum Global Solutions", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
      { name: "CorroHealth", type: "M", typeLabel: "MEDICAL CODING", cls: "loch-co-tag-mc" },
      { name: "Legato Health Technologies", type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
      { name: "R1 RCM", type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
    ],
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

  const activeHubData = cityHubs.find((h) => h.city === activeCity) || cityHubs[0];
  const allCompaniesForCity = cityCompaniesData[activeCity] || [
    { name: `${activeCity} RCM Solutions`, type: "R", typeLabel: "RCM", cls: "loch-co-tag-rcm" },
    { name: `${activeCity} Medical Billing Inc`, type: "B", typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
    { name: `Global Healthcare ${activeCity}`, type: "M", typeLabel: "MEDICAL CODING", cls: "loch-co-tag-mc" },
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
      <div
        className="ticker-bar"
        style={{
          background: "#061324",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "8px 0",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
        }}
      >
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22C55E",
                boxShadow: "0 0 8px #22C55E",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "var(--gold)", fontWeight: 700, letterSpacing: "0.06em", flexShrink: 0 }}>
              LIVE VERIFICATION FEED:
            </span>
            <span style={{ color: "#E2E8F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {pulseText}
            </span>
          </div>
          <div
            className="ticker-stats-right"
            style={{ display: "flex", gap: 16, color: "#94A3B8", fontSize: 11, flexShrink: 0 }}
          >
            <span>⚡ 94.2% Placement Rate</span>
            <span>🛡 Aadhaar Verified</span>
          </div>
        </div>
      </div>

      {/* ====== 1. HERO — STUDENT FIRST (ORIGINAL COLORS & CONTENT + REACTIVE VARIABLE TYPOGRAPHY) ====== */}
      <section className="hero-clean" style={{ position: "relative", overflow: "hidden", padding: "0 0 120px" }}>
        {/* FLOATING PREMIUM LIQUID NAV CAPSULE INSIDE HERO BANNER */}
        <LiquidNavCapsule
          items={[
            { label: "For Candidates", icon: "fa-solid fa-user-graduate", link: "/candidates" },
            { label: "For Companies", icon: "fa-solid fa-building", link: "/companies" },
            { label: "For Academies", icon: "fa-solid fa-landmark", link: "/academy" },
            { label: "How it Works", icon: "fa-solid fa-circle-play", link: "#how-it-works" },
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

        {/* FLOATING ECOSYSTEM BADGES (DYNAMIC TO SELECTED AUDIENCE) */}
        <div className="hero-float hero-float-tl">
          <div className="hero-cand-card">
            <div className={`hero-cand-pill ${currentAudience.leftCard.pillCls}`}>
              <span className="hero-cand-pill-dot" />
              <span>{currentAudience.leftCard.pill}</span>
            </div>
            <div className="hero-cand-row">
              <div className="hero-cand-avatar" style={{ background: currentAudience.leftCard.avatarBg }}>
                {currentAudience.leftCard.initials}
              </div>
              <div className="hero-cand-info">
                <div className="hero-cand-name">
                  {currentAudience.leftCard.name} <span className="hero-cand-verified">✓</span>
                </div>
                <div className="hero-cand-spec">{currentAudience.leftCard.spec}</div>
                <div className="hero-cand-meta">{currentAudience.leftCard.meta}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-float hero-float-tr">
          <div className="hero-cand-card">
            <div className={`hero-cand-pill ${currentAudience.rightCard.pillCls}`}>
              <span className="hero-cand-pill-dot" />
              <span>{currentAudience.rightCard.pill}</span>
            </div>
            <div className="hero-cand-row">
              <div className="hero-cand-avatar" style={{ background: currentAudience.rightCard.avatarBg }}>
                {currentAudience.rightCard.initials}
              </div>
              <div className="hero-cand-info">
                <div className="hero-cand-name">
                  {currentAudience.rightCard.name} <span className="hero-cand-verified">✓</span>
                </div>
                <div className="hero-cand-spec">{currentAudience.rightCard.spec}</div>
                <div className="hero-cand-meta">{currentAudience.rightCard.meta}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="container hero-clean-inner" style={{ position: "relative", zIndex: 5, textAlign: "center", paddingTop: 24 }}>
          {/* CURSOR REACTIVE VARIABLE TYPOGRAPHY HEADLINE */}
          <ReactiveVariableHeadline
            lines={[
              { text: "Where Talent Becomes", isAccent: false },
              { text: "Trusted.", isAccent: true },
            ]}
            minWeight={300}
            maxWeight={800}
            radius={300}
            className="hero-clean-title"
            style={{ fontSize: "clamp(46px, 7.5vw, 92px)", marginBottom: 20, lineHeight: 1.05 }}
          />

          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(20px, 3vw, 30px)",
              color: "var(--gold-light)",
              fontWeight: 700,
              marginBottom: 20,
              transition: "all 0.3s ease",
            }}
          >
            {currentAudience.tagline}
          </h2>

          <p className="hero-clean-sub" style={{ maxWidth: 840, fontSize: 17, margin: "0 auto 36px", lineHeight: 1.6 }}>
            {currentAudience.description}
          </p>

          <div className="hero-clean-ctas">
            <Link to={currentAudience.primaryCta.link} className={currentAudience.primaryCta.cls} style={{ fontSize: 16, padding: "18px 36px" }}>
              <span>{currentAudience.primaryCta.label}</span>
              {currentAudience.primaryCta.icon && <i className={currentAudience.primaryCta.icon} style={{ marginLeft: 8 }} />}
            </Link>
            <Link to={currentAudience.secondaryCta.link} className={currentAudience.secondaryCta.cls} style={{ fontSize: 16, padding: "18px 32px" }}>
              <span>{currentAudience.secondaryCta.label}</span>
              {currentAudience.secondaryCta.icon && <i className={currentAudience.secondaryCta.icon} style={{ marginLeft: 8 }} />}
            </Link>
          </div>

          {/* SIMULTANEOUS 3-PILLAR LAUNCHPAD STRIP (ALWAYS VISIBLE IN BANNER) */}
          <div className="hero-audience-strip">
            <div
              className={`hero-audience-card ${heroAudience === "candidates" ? "active" : ""}`}
              onClick={() => setHeroAudience("candidates")}
            >
              <div className="hero-aud-icon" style={{ background: "rgba(229,168,46,0.15)", color: "var(--gold)" }}>
                <i className="fa-solid fa-user-graduate" />
              </div>
              <div className="hero-aud-text">
                <div className="hero-aud-title">For Candidates</div>
                <div className="hero-aud-desc">Build proof. Get verified. Get discovered.</div>
              </div>
              <Link to="/candidates" className="hero-aud-arrow" onClick={(e) => e.stopPropagation()} title="Candidate Hub">
                <i className="fa-solid fa-arrow-right" />
              </Link>
            </div>

            <div
              className={`hero-audience-card ${heroAudience === "companies" ? "active active-companies" : ""}`}
              onClick={() => setHeroAudience("companies")}
            >
              <div className="hero-aud-icon" style={{ background: "rgba(56,189,248,0.15)", color: "#38BDF8" }}>
                <i className="fa-solid fa-building" />
              </div>
              <div className="hero-aud-text">
                <div className="hero-aud-title">For Companies</div>
                <div className="hero-aud-desc">Discover verified talent. Hire with confidence.</div>
              </div>
              <Link to="/companies" className="hero-aud-arrow" onClick={(e) => e.stopPropagation()} title="Company Portal">
                <i className="fa-solid fa-arrow-right" />
              </Link>
            </div>

            <div
              className={`hero-audience-card ${heroAudience === "academies" ? "active active-academies" : ""}`}
              onClick={() => setHeroAudience("academies")}
            >
              <div className="hero-aud-icon" style={{ background: "rgba(52,211,153,0.15)", color: "#34D399" }}>
                <i className="fa-solid fa-landmark" />
              </div>
              <div className="hero-aud-text">
                <div className="hero-aud-title">For Academies</div>
                <div className="hero-aud-desc">Strengthen outcomes. Build credibility.</div>
              </div>
              <Link to="/academy" className="hero-aud-arrow" onClick={(e) => e.stopPropagation()} title="Academy Network">
                <i className="fa-solid fa-arrow-right" />
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)" }}>
            Free for Candidates • Verified Talent Profiles • Healthcare RCM Opportunities
          </div>
        </div>
      </section>

      {/* ====== 2. WHAT TALENTERA DOES FOR CANDIDATES (BENTO GRID SHOWCASE) ====== */}
      <section
        className="section"
        id="student-features"
        style={{
          background: "#081B33",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
        }}
      >
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 820, margin: "0 auto 52px" }}>
            <div className="section-eyebrow">WHAT TALENTERA DOES FOR CANDIDATES</div>
            <h2
              className="section-title section-title-light"
              style={{ fontSize: "clamp(28px, 4.2vw, 46px)", marginBottom: 16 }}
            >
              Everything You Need to Build a Career Beyond Your Resume.
            </h2>
            <p
              className="section-lead"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 18, maxWidth: 680, margin: "0 auto" }}
            >
              Build your profile, prove your skills, and prepare for relevant Healthcare RCM career opportunities.
            </p>
          </div>

          <div className="bento-grid-wrap">
            {[studentFeatures.slice(0, 3), studentFeatures.slice(3, 6)].map((rowFeats, rowIdx) => {
              const rowStart = rowIdx * 3;
              const spanClasses = [
                "bento-span-2",
                "bento-span-1",
                "bento-span-1",
                "bento-span-1",
                "bento-span-1",
                "bento-span-2",
              ];
              const activeIdxInRow =
                activeFeatureTab !== null && activeFeatureTab >= rowStart && activeFeatureTab < rowStart + 3
                  ? activeFeatureTab
                  : null;
              return (
                <React.Fragment key={rowIdx}>
                  <div className="bento-row">
                    {rowFeats.map((feat, i) => {
                      const idx = rowStart + i;
                      const isActive = idx === activeFeatureTab;
                      return (
                        <button
                          key={feat.id}
                          type="button"
                          className={`bento-card ${spanClasses[idx]} ${isActive ? "active" : ""}`}
                          style={{ "--card-accent": feat.badgeColor }}
                          onClick={() => setActiveFeatureTab(isActive ? null : idx)}
                          aria-expanded={isActive}
                        >
                          <div className="bento-card-top">
                            <div className="bento-card-icon">
                              <i className={feat.icon} />
                            </div>
                            <span className="bento-card-num">0{idx + 1}</span>
                          </div>
                          <span className="bento-card-tag">{feat.tag}</span>
                          <h3 className="bento-card-title">{feat.title}</h3>
                          <p className="bento-card-desc">{feat.desc}</p>
                          <div className="bento-card-expand">
                            <i className={`fa-solid fa-chevron-down${isActive ? " flip" : ""}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {activeIdxInRow !== null && renderStudentDetailPanel(studentFeatures[activeIdxInRow], activeIdxInRow)}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====== 3. JOB MATCHING CONTENT ====== */}
      <section className="job-match-section-root" id="opportunities">
        <div className="job-match-bg-grid" />
        <div className="job-match-ambient-glow-1" />
        <div className="job-match-ambient-glow-2" />

        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div style={{ textAlign: "center", maxWidth: 840, margin: "0 auto 40px" }}>
            <div
              className="section-eyebrow"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(229,168,46,0.12)",
                border: "1px solid rgba(229,168,46,0.3)",
                color: "var(--gold-light)",
                padding: "7px 18px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                marginBottom: 20,
              }}
            >
              <span
                className="live-dot"
                style={{ background: "var(--gold)", boxShadow: "0 0 10px var(--gold)" }}
              />
              SKILL-BASED OPPORTUNITIES · SMARTER MATCHING
            </div>
            <h2
              className="section-title section-title-light"
              style={{ fontSize: "clamp(30px, 4.4vw, 48px)", lineHeight: 1.15, marginBottom: 16 }}
            >
              Find Healthcare RCM Jobs That Match Your Skills.
            </h2>
            <p style={{ color: "rgba(200, 209, 224, 0.8)", fontSize: 16, lineHeight: 1.6, maxWidth: 680, margin: "0 auto" }}>
              Explore relevant Healthcare RCM and medical coding opportunities based on your skills, profile, and professional readiness.
            </p>
          </div>

          {/* Interactive Category Filter Pills */}
          <div className="job-filter-bar">
            {jobCategoryTabs.map((tab) => {
              const isActive = selectedJobCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`job-filter-pill ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedJobCategory(tab.id)}
                >
                  <span>{tab.label}</span>
                  <span className="job-filter-count">{tab.count}</span>
                </button>
              );
            })}
          </div>

          {/* Cards Grid */}
          <div className="job-cards-grid-v2">
            {matchedOpportunities
              .filter((j) => selectedJobCategory === "ALL" || j.category === selectedJobCategory)
              .map((job) => {
                const isVeryHigh = job.matchPercent >= 93;
                return (
                  <div key={job.id} className="job-match-card-v2">
                    <div>
                      {/* Top Header */}
                      <div className="job-card-top-v2">
                        <div className="job-employer-wrap">
                          <div
                            className="job-employer-logo"
                            style={{ background: job.companyGradient }}
                          >
                            {job.companyInitial}
                          </div>
                          <div className="job-employer-info">
                            <span className="job-employer-name">{job.company}</span>
                            <h3 className="job-role-title">{job.title}</h3>
                          </div>
                        </div>

                        <div
                          className="job-match-pill-v2"
                          style={{
                            background: isVeryHigh ? "rgba(34, 197, 94, 0.15)" : "rgba(14, 165, 233, 0.15)",
                            border: `1px solid ${isVeryHigh ? "rgba(34, 197, 94, 0.4)" : "rgba(14, 165, 233, 0.4)"}`,
                            color: isVeryHigh ? "#4ade80" : "#38bdf8",
                          }}
                        >
                          <span
                            className="job-match-pulse-dot"
                            style={{ background: isVeryHigh ? "#22c55e" : "#0ea5e9" }}
                          />
                          <span>{job.matchPercent}% Match</span>
                        </div>
                      </div>

                      {/* Meta Chips */}
                      <div className="job-meta-chips-v2">
                        <span className="job-meta-chip job-meta-salary">
                          <i className="fa-solid fa-indian-rupee-sign" style={{ fontSize: 10 }} />
                          {job.salary}
                        </span>
                        <span className="job-meta-chip">
                          <i className="fa-solid fa-location-dot" style={{ fontSize: 10, color: "var(--gold)" }} />
                          {job.location} ({job.workModel})
                        </span>
                        <span className="job-meta-chip">
                          <i className="fa-solid fa-briefcase" style={{ fontSize: 10, color: "#38bdf8" }} />
                          {job.exp}
                        </span>
                        <span className="job-meta-chip">
                          <i className="fa-solid fa-moon" style={{ fontSize: 10, color: "#a855f7" }} />
                          {job.shift}
                        </span>
                      </div>

                      {/* Why You Match Reasons */}
                      <div className="job-match-reasons-box">
                        <div className="job-reasons-title">
                          <i className="fa-solid fa-certificate" /> Why You Match:
                        </div>
                        <ul className="job-reasons-list">
                          {job.reasons.map((r, i) => (
                            <li key={i}>
                              <i className="fa-solid fa-circle-check" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Skill Tags */}
                      <div className="job-skill-tags-v2">
                        {job.skills.map((s, i) => (
                          <span key={i} className="job-skill-tag">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="job-card-footer-v2">
                      <span className="job-urgency-badge">
                        <span>{job.urgency}</span>
                      </span>
                      <Link to="/register" className="job-apply-link">
                        <span>View Role</span>
                        <i className="fa-solid fa-arrow-right" />
                      </Link>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Bottom Live Metrics & Explore All Bar */}
          <div className="job-match-bottom-bar">
            <div className="job-bottom-stats">
              <div className="job-bottom-stat-item">
                <i className="fa-solid fa-briefcase" />
                <div className="job-bottom-stat-info">
                  <strong>420+ Open Positions</strong>
                  <span>Across 14 Tier-1 RCM Hubs</span>
                </div>
              </div>
              <div className="job-bottom-stat-item">
                <i className="fa-solid fa-shield-halved" />
                <div className="job-bottom-stat-info">
                  <strong>100% Pre-Screened</strong>
                  <span>Verified Employers Only</span>
                </div>
              </div>
              <div className="job-bottom-stat-item">
                <i className="fa-solid fa-bolt" />
                <div className="job-bottom-stat-info">
                  <strong>24-Hour Shortlist</strong>
                  <span>Direct Recruiter Interview</span>
                </div>
              </div>
            </div>

            <Link to="/jobs" className="job-bottom-cta-btn">
              <span>Explore All 420+ Live Openings</span>
              <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      {/* ====== 7. STUDENT CAREER JOURNEY (7 STEPS) ====== */}
      <section className="pipeline-section-root" id="how-it-works">
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 840, margin: "0 auto 54px" }}>
            <div className="section-eyebrow" style={{ color: "var(--gold)" }}>
              <span
                className="live-dot"
                style={{ background: "var(--gold)", boxShadow: "0 0 8px var(--gold)", marginRight: 6 }}
              />
              7-STEP CAREER PIPELINE
            </div>
            <h2
              className="section-title section-title-light"
              style={{ fontSize: "clamp(28px, 4.2vw, 44px)", marginBottom: 16 }}
            >
              From First Code to Verified Job Offer in 7 Steps.
            </h2>
            <p
              className="section-lead"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, maxWidth: 660, margin: "0 auto" }}
            >
              A structured career journey designed to help Healthcare RCM candidates build skills, demonstrate readiness, and get discovered by hiring companies.
            </p>
          </div>

          {/* 7-STEP HORIZONTAL INTERACTIVE TIMELINE */}
          <div className="pipeline-7step-grid">
            {/* Step 1 */}
            <div
              className="pipeline-step-card"
              style={{ "--step-color": "#06B6D4", "--step-glow": "rgba(6, 182, 212, 0.35)" }}
            >
              <div className="pipe-step-top">
                <span className="pipe-step-num">STEP 01</span>
                <div
                  className="pipe-step-icon"
                  style={{
                    background: "rgba(6, 182, 212, 0.12)",
                    borderColor: "rgba(6, 182, 212, 0.3)",
                    color: "#06B6D4",
                  }}
                >
                  <i className="fa-solid fa-user-pen" />
                </div>
              </div>
              <h3 className="pipe-step-title">Create Profile</h3>
              <p className="pipe-step-desc">Build your professional identity and create the foundation for your career journey.</p>
              <div>
                <span className="pipe-step-tag">2 MIN SETUP</span>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className="pipeline-step-card"
              style={{ "--step-color": "#8B5CF6", "--step-glow": "rgba(139, 92, 246, 0.35)" }}
            >
              <div className="pipe-step-top">
                <span className="pipe-step-num">STEP 02</span>
                <div
                  className="pipe-step-icon"
                  style={{
                    background: "rgba(139, 92, 246, 0.12)",
                    borderColor: "rgba(139, 92, 246, 0.3)",
                    color: "#A78BFA",
                  }}
                >
                  <i className="fa-solid fa-chart-simple" />
                </div>
              </div>
              <h3 className="pipe-step-title">Benchmark Audit</h3>
              <p className="pipe-step-desc">Measure your knowledge and understand how your skills compare.</p>
              <div>
                <span className="pipe-step-tag">NATIONAL RANK</span>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className="pipeline-step-card"
              style={{ "--step-color": "#F59E0B", "--step-glow": "rgba(245, 158, 11, 0.35)" }}
            >
              <div className="pipe-step-top">
                <span className="pipe-step-num">STEP 03</span>
                <div
                  className="pipe-step-icon"
                  style={{
                    background: "rgba(245, 158, 11, 0.12)",
                    borderColor: "rgba(245, 158, 11, 0.3)",
                    color: "#FBBF24",
                  }}
                >
                  <i className="fa-solid fa-headset" />
                </div>
              </div>
              <h3 className="pipe-step-title">AI Mock Voice</h3>
              <p className="pipe-step-desc">Practice professional communication and prepare for real interview conversations.</p>
              <div>
                <span className="pipe-step-tag">AUDIO COACH</span>
              </div>
            </div>

            {/* Step 4 */}
            <div
              className="pipeline-step-card"
              style={{ "--step-color": "#10B981", "--step-glow": "rgba(16, 185, 129, 0.35)" }}
            >
              <div className="pipe-step-top">
                <span className="pipe-step-num">STEP 04</span>
                <div
                  className="pipe-step-icon"
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    borderColor: "rgba(16, 185, 129, 0.3)",
                    color: "#34D399",
                  }}
                >
                  <i className="fa-solid fa-shield-halved" />
                </div>
              </div>
              <h3 className="pipe-step-title">Verify Skills</h3>
              <p className="pipe-step-desc">Demonstrate your capabilities and add more credibility to your profile.</p>
              <div>
                <span className="pipe-step-tag">GOLD BADGE</span>
              </div>
            </div>

            {/* Step 5 */}
            <div
              className="pipeline-step-card"
              style={{ "--step-color": "#38BDF8", "--step-glow": "rgba(56, 189, 248, 0.35)" }}
            >
              <div className="pipe-step-top">
                <span className="pipe-step-num">STEP 05</span>
                <div
                  className="pipe-step-icon"
                  style={{
                    background: "rgba(56, 189, 248, 0.12)",
                    borderColor: "rgba(56, 189, 248, 0.3)",
                    color: "#38BDF8",
                  }}
                >
                  <i className="fa-solid fa-bullseye" />
                </div>
              </div>
              <h3 className="pipe-step-title">AI Job Match</h3>
              <p className="pipe-step-desc">Discover Healthcare RCM opportunities matched to your skills and profile.</p>
              <div>
                <span className="pipe-step-tag">94%+ ACCURACY</span>
              </div>
            </div>

            {/* Step 6 */}
            <div
              className="pipeline-step-card"
              style={{ "--step-color": "#EC4899", "--step-glow": "rgba(236, 72, 153, 0.35)" }}
            >
              <div className="pipe-step-top">
                <span className="pipe-step-num">STEP 06</span>
                <div
                  className="pipe-step-icon"
                  style={{
                    background: "rgba(236, 72, 153, 0.12)",
                    borderColor: "rgba(236, 72, 153, 0.3)",
                    color: "#F472B6",
                  }}
                >
                  <i className="fa-solid fa-video" />
                </div>
              </div>
              <h3 className="pipe-step-title">Fast Interview</h3>
              <p className="pipe-step-desc">Move forward with relevant opportunities and connect with hiring companies.</p>
              <div>
                <span className="pipe-step-tag">DIRECT INVITE</span>
              </div>
            </div>

            {/* Step 7 */}
            <div
              className="pipeline-step-card"
              style={{
                "--step-color": "#22C55E",
                "--step-glow": "rgba(34, 197, 94, 0.45)",
                background: "linear-gradient(180deg, rgba(34, 197, 94, 0.14) 0%, rgba(10, 27, 51, 0.88) 100%)",
                borderColor: "rgba(34, 197, 94, 0.45)",
              }}
            >
              <div className="pipe-step-top">
                <span className="pipe-step-num" style={{ color: "#4ADE80" }}>
                  STEP 07
                </span>
                <div
                  className="pipe-step-icon"
                  style={{
                    background: "linear-gradient(135deg, #22C55E, #16A34A)",
                    borderColor: "#22C55E",
                    color: "#052e16",
                  }}
                >
                  <i className="fa-solid fa-trophy" />
                </div>
              </div>
              <h3 className="pipe-step-title" style={{ color: "#86EFAC" }}>
                Get Hired
              </h3>
              <p className="pipe-step-desc">Take the next step towards your Healthcare RCM career opportunity.</p>
              <div>
                <span
                  className="pipe-step-tag"
                  style={{
                    background: "rgba(34, 197, 94, 0.2)",
                    borderColor: "rgba(34, 197, 94, 0.4)",
                    color: "#4ADE80",
                  }}
                >
                  OFFER SECURED ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 8. WHY STUDENTS SHOULD JOIN (STUDENT ADVANTAGE BENTO) ====== */}
      <section className="advantage-section-root">
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 840, margin: "0 auto 52px" }}>
            <div className="section-eyebrow" style={{ color: "var(--gold)" }}>
              THE TALENTERA STUDENT ADVANTAGE
            </div>
            <h2
              className="section-title section-title-light"
              style={{ fontSize: "clamp(28px, 4.2vw, 44px)", marginBottom: 18 }}
            >
              Why 12,480+ Candidates Build Their Careers on Talentera.
            </h2>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(229, 168, 46, 0.12)",
                border: "1.5px solid var(--gold)",
                padding: "8px 22px",
                borderRadius: 999,
                color: "var(--gold-light)",
                fontFamily: "var(--font-heading)",
                fontSize: 14.5,
                fontWeight: 700,
              }}
            >
              <i className="fa-solid fa-bolt" />
              <span>100% Free to Register • Build Proof Beyond Your Resume</span>
            </div>
          </div>

          {/* 8 BENTO BENEFIT CARDS */}
          <div className="advantage-bento-grid">
            {/* Card 1 */}
            <div
              className="adv-bento-card"
              style={{ "--adv-color": "#E5A82E", "--adv-glow": "rgba(229, 168, 46, 0.35)" }}
            >
              <div className="adv-card-header">
                <div
                  className="adv-icon-wrap"
                  style={{
                    background: "rgba(229, 168, 46, 0.14)",
                    borderColor: "rgba(229, 168, 46, 0.35)",
                    color: "#E5A82E",
                  }}
                >
                  <i className="fa-solid fa-gift" />
                </div>
                <span className="adv-badge-chip">100% FREE</span>
              </div>
              <h3 className="adv-card-title">Free Lifetime Profile</h3>
              <p className="adv-card-desc">
                Create and build your professional Healthcare RCM profile without registration fees.
              </p>
            </div>

            {/* Card 2 */}
            <div
              className="adv-bento-card"
              style={{ "--adv-color": "#10B981", "--adv-glow": "rgba(16, 185, 129, 0.35)" }}
            >
              <div className="adv-card-header">
                <div
                  className="adv-icon-wrap"
                  style={{
                    background: "rgba(16, 185, 129, 0.14)",
                    borderColor: "rgba(16, 185, 129, 0.35)",
                    color: "#34D399",
                  }}
                >
                  <i className="fa-solid fa-shield-halved" />
                </div>
                <span className="adv-badge-chip">KYC VERIFIED</span>
              </div>
              <h3 className="adv-card-title">Tamper-Proof Badging</h3>
              <p className="adv-card-desc">
                Add structured verification and credibility to your professional journey.
              </p>
            </div>

            {/* Card 3 */}
            <div
              className="adv-bento-card"
              style={{ "--adv-color": "#F59E0B", "--adv-glow": "rgba(245, 158, 11, 0.35)" }}
            >
              <div className="adv-card-header">
                <div
                  className="adv-icon-wrap"
                  style={{
                    background: "rgba(245, 158, 11, 0.14)",
                    borderColor: "rgba(245, 158, 11, 0.35)",
                    color: "#FBBF24",
                  }}
                >
                  <i className="fa-solid fa-robot" />
                </div>
                <span className="adv-badge-chip">AI EVALUATOR</span>
              </div>
              <h3 className="adv-card-title">AI Mock Interviews</h3>
              <p className="adv-card-desc">
                Practice realistic interview scenarios and improve professional confidence.
              </p>
            </div>

            {/* Card 4 */}
            <div
              className="adv-bento-card"
              style={{ "--adv-color": "#06B6D4", "--adv-glow": "rgba(6, 182, 212, 0.35)" }}
            >
              <div className="adv-card-header">
                <div
                  className="adv-icon-wrap"
                  style={{
                    background: "rgba(6, 182, 212, 0.14)",
                    borderColor: "rgba(6, 182, 212, 0.35)",
                    color: "#06B6D4",
                  }}
                >
                  <i className="fa-solid fa-bullseye" />
                </div>
                <span className="adv-badge-chip">SKILL MATCH</span>
              </div>
              <h3 className="adv-card-title">Clinical Job Matching</h3>
              <p className="adv-card-desc">
                Discover relevant Healthcare RCM and medical coding job opportunities.
              </p>
            </div>

            {/* Card 5 */}
            <div
              className="adv-bento-card"
              style={{ "--adv-color": "#8B5CF6", "--adv-glow": "rgba(139, 92, 246, 0.35)" }}
            >
              <div className="adv-card-header">
                <div
                  className="adv-icon-wrap"
                  style={{
                    background: "rgba(139, 92, 246, 0.14)",
                    borderColor: "rgba(139, 92, 246, 0.35)",
                    color: "#A78BFA",
                  }}
                >
                  <i className="fa-solid fa-eye" />
                </div>
                <span className="adv-badge-chip">3.8X RADAR</span>
              </div>
              <h3 className="adv-card-title">Priority Recruiter Radar</h3>
              <p className="adv-card-desc">
                Increase your profile visibility with relevant hiring companies.
              </p>
            </div>

            {/* Card 6 */}
            <div
              className="adv-bento-card"
              style={{ "--adv-color": "#EC4899", "--adv-glow": "rgba(236, 72, 153, 0.35)" }}
            >
              <div className="adv-card-header">
                <div
                  className="adv-icon-wrap"
                  style={{
                    background: "rgba(236, 72, 153, 0.14)",
                    borderColor: "rgba(236, 72, 153, 0.35)",
                    color: "#F472B6",
                  }}
                >
                  <i className="fa-solid fa-bolt-lightning" />
                </div>
                <span className="adv-badge-chip">FAST TRACK</span>
              </div>
              <h3 className="adv-card-title">Skip Basic Phone Screens</h3>
              <p className="adv-card-desc">
                Help recruiters understand more about your profile before the first conversation.
              </p>
            </div>

            {/* Card 7 */}
            <div
              className="adv-bento-card"
              style={{ "--adv-color": "#38BDF8", "--adv-glow": "rgba(56, 189, 248, 0.35)" }}
            >
              <div className="adv-card-header">
                <div
                  className="adv-icon-wrap"
                  style={{
                    background: "rgba(56, 189, 248, 0.14)",
                    borderColor: "rgba(56, 189, 248, 0.35)",
                    color: "#38BDF8",
                  }}
                >
                  <i className="fa-solid fa-chart-line" />
                </div>
                <span className="adv-badge-chip">PERCENTILE</span>
              </div>
              <h3 className="adv-card-title">Career Readiness Score</h3>
              <p className="adv-card-desc">
                Get a clearer view of your professional readiness and development journey.
              </p>
            </div>

            {/* Card 8 */}
            <div
              className="adv-bento-card"
              style={{ "--adv-color": "#22C55E", "--adv-glow": "rgba(34, 197, 94, 0.35)" }}
            >
              <div className="adv-card-header">
                <div
                  className="adv-icon-wrap"
                  style={{
                    background: "rgba(34, 197, 94, 0.14)",
                    borderColor: "rgba(34, 197, 94, 0.35)",
                    color: "#4ADE80",
                  }}
                >
                  <i className="fa-solid fa-award" />
                </div>
                <span className="adv-badge-chip">DIRECT HIRES</span>
              </div>
              <h3 className="adv-card-title">Direct Placement Drives</h3>
              <p className="adv-card-desc">
                Access relevant hiring opportunities across the Healthcare RCM industry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 9. ANIMATED CAREER PROGRESSION & LIVE STATS HUB ====== */}
      <section className="progression-section-root" id="progression">
        <div className="progression-ambient-glow" />

        <div className="container" style={{ position: "relative", zIndex: 5 }}>
          <div style={{ textAlign: "center", maxWidth: 820, margin: "0 auto 56px" }}>
            <div className="section-eyebrow" style={{ color: "var(--gold-light)" }}>
              <span
                className="live-dot"
                style={{ background: "#06B6D4", boxShadow: "0 0 8px #06B6D4", marginRight: 6 }}
              />
              PROVEN CAREER PROGRESSION PIPELINE
            </div>
            <h2
              className="section-title section-title-light"
              style={{ fontSize: "clamp(28px, 4.2vw, 46px)", marginBottom: 16 }}
            >
              From Verified Candidate to Hired Professional.
            </h2>
            <p
              className="section-lead"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 17, maxWidth: 660, margin: "0 auto" }}
            >
              A structured journey that helps Healthcare RCM candidates build credibility, demonstrate readiness, and become visible to hiring companies.
            </p>
          </div>

          {/* 6-STAGE ANIMATED MULTI-COLOR PROGRESSION FLIGHTPATH */}
          <div className="progression-flow-grid">
            {/* Stage 1 - Cyan */}
            <div
              className="progression-card-node"
              style={{ "--node-color": "#06B6D4", "--node-glow": "rgba(6, 182, 212, 0.3)" }}
            >
              <div className="prog-node-top">
                <span className="prog-step-num">STAGE 01</span>
                <span className="prog-tag-pill">AADHAAR KYC</span>
              </div>
              <div
                className="prog-icon-box"
                style={{
                  background: "rgba(6, 182, 212, 0.14)",
                  borderColor: "rgba(6, 182, 212, 0.35)",
                  color: "#06B6D4",
                }}
              >
                <i className="fa-solid fa-id-card-clip" />
              </div>
              <div className="prog-node-body">
                <h3 className="prog-node-title">Profile & KYC</h3>
                <p className="prog-node-sub">Build a verified professional profile with authenticated identity details.</p>
              </div>
              <div className="prog-node-footer">
                <span className="prog-metric-chip">
                  <i className="fa-solid fa-bolt" /> &lt; 2 Mins
                </span>
                <span className="prog-status-dot" />
              </div>
            </div>

            {/* Stage 2 - Purple */}
            <div
              className="progression-card-node"
              style={{ "--node-color": "#8B5CF6", "--node-glow": "rgba(139, 92, 246, 0.3)" }}
            >
              <div className="prog-node-top">
                <span className="prog-step-num">STAGE 02</span>
                <span className="prog-tag-pill">BENCHMARK</span>
              </div>
              <div
                className="prog-icon-box"
                style={{
                  background: "rgba(139, 92, 246, 0.14)",
                  borderColor: "rgba(139, 92, 246, 0.35)",
                  color: "#A78BFA",
                }}
              >
                <i className="fa-solid fa-chart-line" />
              </div>
              <div className="prog-node-body">
                <h3 className="prog-node-title">Chart Audit Test</h3>
                <p className="prog-node-sub">Demonstrate your medical coding knowledge through structured assessment.</p>
              </div>
              <div className="prog-node-footer">
                <span className="prog-metric-chip">
                  <i className="fa-solid fa-trophy" /> Top 5% Rank
                </span>
                <span className="prog-status-dot" />
              </div>
            </div>

            {/* Stage 3 - Amber */}
            <div
              className="progression-card-node"
              style={{ "--node-color": "#F59E0B", "--node-glow": "rgba(245, 158, 11, 0.3)" }}
            >
              <div className="prog-node-top">
                <span className="prog-step-num">STAGE 03</span>
                <span className="prog-tag-pill">AI INTERVIEW</span>
              </div>
              <div
                className="prog-icon-box"
                style={{
                  background: "rgba(245, 158, 11, 0.14)",
                  borderColor: "rgba(245, 158, 11, 0.35)",
                  color: "#FBBF24",
                }}
              >
                <i className="fa-solid fa-robot" />
              </div>
              <div className="prog-node-body">
                <h3 className="prog-node-title">AI Voice Round</h3>
                <p className="prog-node-sub">Practice communication and prepare for professional interview scenarios.</p>
              </div>
              <div className="prog-node-footer">
                <span className="prog-metric-chip">
                  <i className="fa-solid fa-sparkles" /> 92% Ready
                </span>
                <span className="prog-status-dot" />
              </div>
            </div>

            {/* Stage 4 - Emerald */}
            <div
              className="progression-card-node"
              style={{ "--node-color": "#10B981", "--node-glow": "rgba(16, 185, 129, 0.3)" }}
            >
              <div className="prog-node-top">
                <span className="prog-step-num">STAGE 04</span>
                <span className="prog-tag-pill">BADGED</span>
              </div>
              <div
                className="prog-icon-box"
                style={{
                  background: "rgba(16, 185, 129, 0.14)",
                  borderColor: "rgba(16, 185, 129, 0.35)",
                  color: "#34D399",
                }}
              >
                <i className="fa-solid fa-certificate" />
              </div>
              <div className="prog-node-body">
                <h3 className="prog-node-title">Verified Badges</h3>
                <p className="prog-node-sub">Add visible proof and credibility to your professional profile.</p>
              </div>
              <div className="prog-node-footer">
                <span className="prog-metric-chip">
                  <i className="fa-solid fa-shield-check" /> Gold Tier
                </span>
                <span className="prog-status-dot" />
              </div>
            </div>

            {/* Stage 5 - Rose */}
            <div
              className="progression-card-node"
              style={{ "--node-color": "#EC4899", "--node-glow": "rgba(236, 72, 153, 0.3)" }}
            >
              <div className="prog-node-top">
                <span className="prog-step-num">STAGE 05</span>
                <span className="prog-tag-pill">SPOTLIGHT</span>
              </div>
              <div
                className="prog-icon-box"
                style={{
                  background: "rgba(236, 72, 153, 0.14)",
                  borderColor: "rgba(236, 72, 153, 0.35)",
                  color: "#F472B6",
                }}
              >
                <i className="fa-solid fa-bullseye" />
              </div>
              <div className="prog-node-body">
                <h3 className="prog-node-title">Recruiter Radar</h3>
                <p className="prog-node-sub">Increase visibility among relevant Healthcare RCM hiring companies.</p>
              </div>
              <div className="prog-node-footer">
                <span className="prog-metric-chip">
                  <i className="fa-solid fa-eye" /> 3.8x Views
                </span>
                <span className="prog-status-dot" />
              </div>
            </div>

            {/* Stage 6 - Electric Green */}
            <div
              className="progression-card-node"
              style={{
                "--node-color": "#22C55E",
                "--node-glow": "rgba(34, 197, 94, 0.4)",
                background: "linear-gradient(180deg, rgba(34, 197, 94, 0.12) 0%, rgba(10, 27, 51, 0.85) 100%)",
                borderColor: "rgba(34, 197, 94, 0.4)",
              }}
            >
              <div className="prog-node-top">
                <span className="prog-step-num" style={{ color: "#4ADE80" }}>
                  STAGE 06
                </span>
                <span
                  className="prog-tag-pill"
                  style={{
                    background: "rgba(34, 197, 94, 0.2)",
                    borderColor: "rgba(34, 197, 94, 0.45)",
                    color: "#4ADE80",
                  }}
                >
                  HIRED ✓
                </span>
              </div>
              <div
                className="prog-icon-box"
                style={{
                  background: "linear-gradient(135deg, #22C55E, #16A34A)",
                  borderColor: "#22C55E",
                  color: "#052e16",
                }}
              >
                <i className="fa-solid fa-award" />
              </div>
              <div className="prog-node-body">
                <h3 className="prog-node-title" style={{ color: "#86EFAC" }}>
                  Job Offer Issued
                </h3>
                <p className="prog-node-sub">Move forward with relevant opportunities and take the next step in your career.</p>
              </div>
              <div className="prog-node-footer">
                <span className="prog-metric-chip" style={{ color: "#4ADE80" }}>
                  <i className="fa-solid fa-circle-check" /> 4.2x Faster
                </span>
                <span className="prog-status-dot" style={{ background: "#22C55E", boxShadow: "0 0 10px #22C55E" }} />
              </div>
            </div>
          </div>

          {/* COMBINED ANIMATED IMPACT METRICS GRID */}
          <div className="progression-stats-hub">
            <div className="prog-stat-box">
              <div className="prog-stat-icon-num">
                <i className="fa-solid fa-user-check" style={{ color: "#06B6D4", fontSize: 20 }} />
                <span className="prog-stat-num" style={{ color: "#E0F2FE" }}>
                  12,480+
                </span>
              </div>
              <div className="prog-stat-lbl">VERIFIED CANDIDATES</div>
              <div className="prog-stat-sub" style={{ color: "#38BDF8" }}>
                ▲ 18% monthly growth
              </div>
            </div>

            <div className="prog-stat-box">
              <div className="prog-stat-icon-num">
                <i className="fa-solid fa-building" style={{ color: "#8B5CF6", fontSize: 20 }} />
                <span className="prog-stat-num" style={{ color: "#EDE9FE" }}>
                  140+
                </span>
              </div>
              <div className="prog-stat-lbl">HIRING EMPLOYERS</div>
              <div className="prog-stat-sub">Across 8 major hubs</div>
            </div>

            <div className="prog-stat-box">
              <div className="prog-stat-icon-num">
                <i className="fa-solid fa-landmark" style={{ color: "#F59E0B", fontSize: 20 }} />
                <span className="prog-stat-num" style={{ color: "#FEF3C7" }}>
                  68
                </span>
              </div>
              <div className="prog-stat-lbl">PARTNER ACADEMIES</div>
              <div className="prog-stat-sub">Industry aligned syllabus</div>
            </div>

            <div className="prog-stat-box">
              <div className="prog-stat-icon-num">
                <i className="fa-solid fa-circle-check" style={{ color: "#10B981", fontSize: 20 }} />
                <span className="prog-stat-num" style={{ color: "#D1FAE5" }}>
                  94.2%
                </span>
              </div>
              <div className="prog-stat-lbl">PLACEMENT RATE</div>
              <div className="prog-stat-sub" style={{ color: "#34D399" }}>
                Direct offers issued
              </div>
            </div>

            <div className="prog-stat-box">
              <div className="prog-stat-icon-num">
                <i className="fa-solid fa-bolt-lightning" style={{ color: "#22C55E", fontSize: 20 }} />
                <span className="prog-stat-num" style={{ color: "#DCFCE7" }}>
                  4.2x
                </span>
              </div>
              <div className="prog-stat-lbl">FASTER TURNAROUND</div>
              <div className="prog-stat-sub">From test to offer letter</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 11. COMPANY CONTENT (FOR HIRING COMPANIES) ====== */}
      <section className="partner-showcase-section" id="companies-hiring">
        <div className="container">
          <div className="partner-card-split partner-card-company">
            <div>
              <div className="section-eyebrow" style={{ color: "#38BDF8" }}>
                <span
                  className="live-dot"
                  style={{ background: "#38BDF8", boxShadow: "0 0 8px #38BDF8", marginRight: 6 }}
                />
                FOR HEALTHCARE & RCM EMPLOYERS
              </div>
              <h2
                className="section-title section-title-light"
                style={{ fontSize: "clamp(26px, 3.8vw, 42px)", marginBottom: 16 }}
              >
                Hire Pre-Verified, Benchmarked Talent in Record Time.
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 0 }}>
                Stop filtering unverified resumes. Access clinical chart audit scores, AI interview voice evaluations,
                and Aadhaar-verified credentials before your first meeting.
              </p>

              {/* 4 Feature Chips */}
              <div className="partner-feature-grid">
                <div className="partner-feat-chip">
                  <i className="fa-solid fa-user-shield partner-feat-icon" style={{ color: "#38BDF8" }} />
                  <div className="partner-feat-text">
                    <strong>100% Verified Profiles</strong>
                    <span>Aadhaar KYC & credentials verified</span>
                  </div>
                </div>
                <div className="partner-feat-chip">
                  <i className="fa-solid fa-bullseye partner-feat-icon" style={{ color: "#38BDF8" }} />
                  <div className="partner-feat-text">
                    <strong>Skill-Based Matching</strong>
                    <span>Algorithmic match against job specs</span>
                  </div>
                </div>
                <div className="partner-feat-chip">
                  <i className="fa-solid fa-chart-pie partner-feat-icon" style={{ color: "#38BDF8" }} />
                  <div className="partner-feat-text">
                    <strong>Proctored Audit Scores</strong>
                    <span>Hospital benchmark chart testing</span>
                  </div>
                </div>
                <div className="partner-feat-chip">
                  <i className="fa-solid fa-robot partner-feat-icon" style={{ color: "#38BDF8" }} />
                  <div className="partner-feat-text">
                    <strong>AI Voice Readiness</strong>
                    <span>Instant audio interview evaluation</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <Link to="/companies/register" className="btn-cyan" style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-bright) 100%)", color: "var(--navy)", border: "none", fontWeight: 700 }}>
                  <i className="fa-solid fa-users" style={{ marginRight: 6 }} />
                  <span>Browse Candidates</span>
                  <i className="fa-solid fa-arrow-right" style={{ marginLeft: 6 }} />
                </Link>
                <Link to="/companies" className="btn-outline-white">
                  <span>Hire Verified Talent</span>
                  <i className="fa-solid fa-arrow-right" style={{ marginLeft: 6 }} />
                </Link>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)" }}>
                  ⚡ Over 140+ active enterprise employers
                </span>
              </div>
            </div>

            {/* Recruiter Live Radar Dashboard Preview */}
            <div className="co-radar-card">
              <div className="co-radar-top">
                <div className="co-radar-title">
                  <span className="co-radar-live-dot" />
                  <span>TALENTERA RECRUITER RADAR</span>
                </div>
                <div className="co-radar-inbound-badge">
                  <i className="fa-solid fa-bolt" style={{ color: "#38BDF8", marginRight: 4 }} />
                  34 NEW TODAY
                </div>
              </div>

              {/* Candidate 1 */}
              <div className="co-cand-item">
                <div className="co-cand-head">
                  <div className="co-cand-profile">
                    <div className="co-cand-avatar" style={{ background: "linear-gradient(135deg, #0284C7, #0369A1)" }}>
                      DR
                    </div>
                    <div>
                      <div className="co-cand-name">
                        Deepika R. <i className="fa-solid fa-circle-check co-cand-verified-icon" />
                      </div>
                      <div className="co-cand-role">Senior ED Chart Auditor · Chennai</div>
                    </div>
                  </div>
                  <div className="co-cand-match-pill">96% Match</div>
                </div>
                <div className="co-cand-tags">
                  <span className="co-cand-tag">CPC Certified</span>
                  <span className="co-cand-tag">Chart Audit: 94%</span>
                  <span className="co-cand-tag" style={{ color: "#38BDF8" }}>
                    Immediate Joiner
                  </span>
                </div>
              </div>

              {/* Candidate 2 */}
              <div className="co-cand-item">
                <div className="co-cand-head">
                  <div className="co-cand-profile">
                    <div className="co-cand-avatar" style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
                      KM
                    </div>
                    <div>
                      <div className="co-cand-name">
                        Karthik M. <i className="fa-solid fa-circle-check co-cand-verified-icon" />
                      </div>
                      <div className="co-cand-role">Risk Adjustment Specialist · Hyd</div>
                    </div>
                  </div>
                  <div
                    className="co-cand-match-pill"
                    style={{
                      color: "#A78BFA",
                      background: "rgba(139, 92, 246, 0.15)",
                      borderColor: "rgba(139, 92, 246, 0.35)",
                    }}
                  >
                    92% Match
                  </div>
                </div>
                <div className="co-cand-tags">
                  <span className="co-cand-tag">HCC & Risk</span>
                  <span className="co-cand-tag">AI Interview: 91%</span>
                  <span className="co-cand-tag">Aadhaar Verified</span>
                </div>
              </div>

              {/* Recruiter Guarantee Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <span>🛡 Zero Unverified Profiles</span>
                <span style={{ color: "#38BDF8" }}>⚡ 70% Faster Pipeline</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 12. ACADEMY CONTENT (FOR TRAINING ACADEMIES) ====== */}
      <section className="partner-showcase-section" style={{ background: "#040D1C" }}>
        <div className="container">
          <div className="partner-card-split partner-card-academy">
            <div>
              <div className="section-eyebrow" style={{ color: "#34D399" }}>
                <span
                  className="live-dot"
                  style={{ background: "#34D399", boxShadow: "0 0 8px #34D399", marginRight: 6 }}
                />
                FOR TRAINING INSTITUTES & ACADEMIES
              </div>
              <h2
                className="section-title section-title-light"
                style={{ fontSize: "clamp(26px, 3.8vw, 42px)", marginBottom: 16 }}
              >
                Transform Student Training into Verified Career Placements.
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 0 }}>
                Provide your students with structured national assessments, AI mock interviews, and tamper-proof
                credential badges that connect entire batches directly to hiring employers.
              </p>

              {/* 4 Feature Chips */}
              <div className="partner-feature-grid">
                <div className="partner-feat-chip">
                  <i className="fa-solid fa-landmark partner-feat-icon" style={{ color: "#34D399" }} />
                  <div className="partner-feat-text">
                    <strong>Batch Management</strong>
                    <span>Real-time student cohort dashboard</span>
                  </div>
                </div>
                <div className="partner-feat-chip">
                  <i className="fa-solid fa-chart-line partner-feat-icon" style={{ color: "#34D399" }} />
                  <div className="partner-feat-text">
                    <strong>Benchmark Testing</strong>
                    <span>Standardized proctored exams</span>
                  </div>
                </div>
                <div className="partner-feat-chip">
                  <i className="fa-solid fa-certificate partner-feat-icon" style={{ color: "#34D399" }} />
                  <div className="partner-feat-text">
                    <strong>Institutional Badging</strong>
                    <span>Tamper-proof verifiable certificates</span>
                  </div>
                </div>
                <div className="partner-feat-chip">
                  <i className="fa-solid fa-briefcase partner-feat-icon" style={{ color: "#34D399" }} />
                  <div className="partner-feat-text">
                    <strong>Corporate Placement</strong>
                    <span>Direct partner hiring drives</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <Link to="/academy" className="btn-emerald">
                  <span>Partner With Talentera</span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)" }}>
                  🎓 68 Partner Institutes Across India
                </span>
              </div>
            </div>

            {/* Academy Placement Cockpit Live Card */}
            <div className="ac-cockpit-card">
              <div className="ac-cockpit-top">
                <div className="ac-cockpit-title">
                  <span className="ac-cockpit-live-dot" />
                  <span>ACADEMY COHORT COCKPIT</span>
                </div>
                <div className="ac-cohort-badge">
                  <i className="fa-solid fa-graduation-cap" style={{ marginRight: 4 }} />
                  BATCH #24 (48 STUDENTS)
                </div>
              </div>

              {/* Progress 1: Assessments */}
              <div className="ac-funnel-step-item">
                <div className="ac-funnel-info">
                  <span>Proctored Chart Audit Completion</span>
                  <strong>46 / 48 (96%)</strong>
                </div>
                <div className="ac-funnel-track">
                  <div
                    className="ac-funnel-fill"
                    style={{ width: "96%", background: "linear-gradient(90deg, #10B981, #34D399)" }}
                  />
                </div>
              </div>

              {/* Progress 2: AI Interviews */}
              <div className="ac-funnel-step-item">
                <div className="ac-funnel-info">
                  <span>AI Mock Interview Readiness</span>
                  <strong>44 / 48 (91%)</strong>
                </div>
                <div className="ac-funnel-track">
                  <div
                    className="ac-funnel-fill"
                    style={{ width: "91%", background: "linear-gradient(90deg, #059669, #10B981)" }}
                  />
                </div>
              </div>

              {/* Progress 3: Placement Offers */}
              <div className="ac-funnel-step-item">
                <div className="ac-funnel-info">
                  <span>Placement Offers Secured</span>
                  <strong>41 / 48 (85.4%)</strong>
                </div>
                <div className="ac-funnel-track">
                  <div
                    className="ac-funnel-fill"
                    style={{ width: "85.4%", background: "linear-gradient(90deg, #34D399, #6EE7B7)" }}
                  />
                </div>
              </div>

              {/* Guarantee Box */}
              <div className="ac-partner-guarantee">
                <div className="ac-partner-lbl">
                  <i className="fa-solid fa-shield-halved" />
                  <span>Institutional Credential Network</span>
                </div>
                <div className="ac-partner-hire-rate">85.4% Placement</div>
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
            <h2
              className="section-title"
              style={{ color: "#fff", fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1.15 }}
            >
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
                {(
                  cityCompaniesData[activeCity] || [
                    { name: `${activeCity} Healthcare RCM`, typeLabel: "RCM", cls: "loch-co-tag-rcm" },
                    { name: `Apex ${activeCity} Coding Institute`, typeLabel: "MEDICAL CODING", cls: "loch-co-tag-mc" },
                    { name: `Global ${activeCity} Billing Services`, typeLabel: "BILLING/AR", cls: "loch-co-tag-bar" },
                  ]
                )
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

      {/* ====== 10. FAQ SECTION ====== */}
      <section className="section" id="faq" style={{ background: "#051329", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "90px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 820, margin: "0 auto 52px" }}>
            <div className="section-eyebrow" style={{ color: "var(--gold)" }}>
              FREQUENTLY ASKED QUESTIONS
            </div>
            <h2
              className="section-title section-title-light"
              style={{ fontSize: "clamp(28px, 4.2vw, 44px)", marginBottom: 16 }}
            >
              Frequently Asked Questions
            </h2>
            <p
              className="section-lead"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, maxWidth: 660, margin: "0 auto" }}
            >
              Everything you need to know about Talentera and how our verified ecosystem works.
            </p>
          </div>

          <div className="hv-faq-container">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className={`hv-faq-item ${isOpen ? "open" : ""}`}>
                  <div
                    className="hv-faq-question"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  >
                    <span>{idx + 1}. {faq.q}</span>
                    <span className="hv-faq-arrow">{isOpen ? "▲" : "▼"}</span>
                  </div>
                  {isOpen && (
                    <div className="hv-faq-answer">
                      <p style={{ margin: 0 }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="footer">
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            <div>
              <img src="/logo.png" alt="Talentera Logo" style={{ height: 32 }} />
              <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 8 }}>
                The Era of Talent Begins Here. India's Verified Skill & Career Engine.
              </p>
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: 13, color: "var(--text-light)", flexWrap: "wrap" }}>
              <Link to="/jobs">Explore Jobs</Link>
              <Link to="/register">Student Registration</Link>
              <Link to="/companies">For Companies</Link>
              <Link to="/academy">For Academies</Link>
              <a href="#faq">FAQ</a>
              <Link to="/typography">Interactive Typography</Link>
              <Link to="/staff/login">Employee Login</Link>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              marginTop: 32,
              paddingTop: 24,
              fontSize: 12,
              color: "var(--text-faint)",
              textAlign: "center",
            }}
          >
            © {new Date().getFullYear()} Talentera Healthcare Network. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
