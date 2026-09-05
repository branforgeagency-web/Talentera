import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LiquidNavCapsule from "../components/LiquidNavCapsule";
import Footer from "../components/Footer.jsx";
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
      q: "1. How does Talentera's medical coding recruitment process work?",
      a: "Talentera helps healthcare companies find verified medical coders and RCM professionals based on role, specialty, experience, skills, shift preference, and other hiring requirements.",
      example: "If you're hiring 10 ED coders for a US healthcare account, you can share your requirements with Talentera and receive a shortlist of relevant candidates instead of reviewing hundreds of unrelated resumes."
    },
    {
      q: "2. What types of healthcare RCM professionals can we hire through Talentera?",
      a: "You can find talent across medical coding, medical billing, HCC coding, risk adjustment, AR, denial management, and other US Healthcare RCM roles.",
      example: "If your organization needs CPC-certified inpatient coders with 3+ years of experience, Talentera can help you identify candidates who match those requirements."
    },
    {
      q: "3. Are Talentera candidates verified before we interview them?",
      a: "Talentera uses a structured verification process covering identity, education, certifications, skills, assessments, communication, and professional information.",
      example: "Before scheduling an interview with a medical coder, your hiring team can review available credential information, assessment results, and chart-audit performance through the candidate profile."
    },
    {
      q: "4. Can we hire candidates based on a specific medical coding specialty?",
      a: "Yes. Talentera is designed for specialty-focused healthcare recruitment, allowing hiring teams to look for candidates based on relevant coding and RCM requirements.",
      example: "If you're hiring for ED, IP, OP, HCC, risk adjustment, or medical billing roles, you can define the specialty and required skills before candidates are shortlisted."
    },
    {
      q: "5. How quickly can we receive shortlisted candidates?",
      a: "Talentera aims to provide up to 5 hand-curated, relevant candidates within 24 hours, depending on the role requirements and available talent pool.",
      example: "If you suddenly need 5 experienced medical coders for a new client account, you can submit the requirement instead of waiting weeks for a traditional recruitment process to build a candidate pipeline."
    },
    {
      q: "6. How does Talentera's pay-on-placement model work?",
      a: "Talentera's hiring model is designed so companies pay when they successfully hire a candidate, rather than paying subscription or setup fees upfront.",
      example: "If you review five shortlisted candidates but hire only one, your recruitment cost is tied to the successful placement rather than paying an upfront fee for the entire candidate search."
    },
    {
      q: "7. Does Talentera provide replacement support if a candidate leaves?",
      a: "Talentera provides 90-day replacement support for eligible placements, subject to the applicable replacement terms.",
      example: "If a hired medical coder leaves during the eligible replacement period, your company can request a replacement candidate under Talentera's replacement policy instead of starting the entire medical coding recruitment process again."
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
            Stop sifting through 200 resumes to find 1 qualified hire. Talentera helps simplify your medical coding recruitment by sending you 5 hand-curated, specialty-matched verified candidates — ready to interview in as little as 24 hours. Pay only when you hire.
          </p>

          <div className="fco-hero-ctas">
            <Link to="/companies/register" className="fco-btn-gold" style={{ padding: "14px 32px", fontSize: 16 }}>
              <i className="fa-solid fa-users" style={{ marginRight: 6 }} /> Browse Candidates →
            </Link>
            <Link to="/companies/jobs" className="fco-btn-outline" style={{ padding: "14px 28px", fontSize: 16 }}>
              Post a Job / Requirement
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
              Traditional medical coding recruitment agencies can leave hiring teams sorting through large resume pools, spending weeks on screening, and manually checking whether a candidate's experience and credentials match what they claim.
            </p>
          </div>

          <div className="fco-pain-grid">
            <div className="fco-pain-card">
              <div className="fco-pain-icon"><i className="fa-solid fa-file-excel" /></div>
              <h3 className="fco-pain-title">200+ Unscreened Resumes</h3>
              <div style={{ fontWeight: 600, color: "var(--navy)", marginBottom: 6, fontSize: 14 }}>
                Too many resumes. Too little certainty.
              </div>
              <p className="fco-pain-desc">
                Recruiters spend valuable hours reviewing candidates who may not match the required RCM skills, experience, or specialty.
              </p>
            </div>

            <div className="fco-pain-card">
              <div className="fco-pain-icon"><i className="fa-solid fa-clock-three" /></div>
              <h3 className="fco-pain-title">60-Day Time to Fill</h3>
              <div style={{ fontWeight: 600, color: "var(--navy)", marginBottom: 6, fontSize: 14 }}>
                Open positions shouldn't stay open for months.
              </div>
              <p className="fco-pain-desc">
                Long screening and interview cycles can leave critical RCM roles unfilled while your existing team handles increasing workloads.
              </p>
            </div>

            <div className="fco-pain-card">
              <div className="fco-pain-icon"><i className="fa-solid fa-certificate" /></div>
              <h3 className="fco-pain-title">Unverified Credentials</h3>
              <div style={{ fontWeight: 600, color: "var(--navy)", marginBottom: 6, fontSize: 14 }}>
                Can you trust what's on the resume?
              </div>
              <p className="fco-pain-desc">
                Manually validating AAPC, AHIMA, and other professional credentials takes time and adds another step to your recruitment process.
              </p>
            </div>

            <div className="fco-pain-card">
              <div className="fco-pain-icon"><i className="fa-solid fa-money-bill-transfer" /></div>
              <h3 className="fco-pain-title">20–30% Agency Retainers</h3>
              <div style={{ fontWeight: 600, color: "var(--navy)", marginBottom: 6, fontSize: 14 }}>
                Why pay upfront before you hire?
              </div>
              <p className="fco-pain-desc">
                Traditional medical coding recruitment agency models can involve significant upfront fees before you know whether a candidate is the right fit. Talentera's model is designed around paying when you hire.
              </p>
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
              4 layers of verification. <span style={{ color: "var(--gold)" }}>100% more confidence.</span>
            </h2>
            <p className="fco-section-sub">
              Every candidate goes through structured verification before their profile reaches your hiring team — giving recruiters more visibility into identity, credentials, skills, and professional communication.
            </p>
          </div>

          <div className="fco-layers-grid">
            <div className="fco-layer-card">
              <div className="fco-layer-badge">Layer 01</div>
              <i className="fa-solid fa-id-card" style={{ fontSize: 24, color: "var(--navy)" }} />
              <h3 className="fco-layer-title">Aadhaar Identity</h3>
              <p className="fco-layer-desc">Aadhaar-based OTP verification helps confirm candidate identity and reduce duplicate or incomplete profiles.</p>
            </div>

            <div className="fco-layer-card">
              <div className="fco-layer-badge">Layer 02</div>
              <i className="fa-solid fa-shield-check" style={{ fontSize: 24, color: "var(--navy)" }} />
              <h3 className="fco-layer-title">Credential Verification</h3>
              <p className="fco-layer-desc">Verify relevant AAPC and AHIMA credentials and review available certification details before moving candidates forward in your hiring process.</p>
            </div>

            <div className="fco-layer-card">
              <div className="fco-layer-badge">Layer 03</div>
              <i className="fa-solid fa-laptop-code" style={{ fontSize: 24, color: "var(--navy)" }} />
              <h3 className="fco-layer-title">Proctored Audit Test</h3>
              <p className="fco-layer-desc">Specialty-specific medical coding and billing assessments help evaluate practical knowledge, coding accuracy, and role-relevant skills.</p>
            </div>

            <div className="fco-layer-card">
              <div className="fco-layer-badge">Layer 04</div>
              <i className="fa-solid fa-video" style={{ fontSize: 24, color: "var(--navy)" }} />
              <h3 className="fco-layer-title">Video & Voice Intro</h3>
              <p className="fco-layer-desc">A 60-second professional introduction gives your hiring team an early view of the candidate's communication skills and professional presence.</p>
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
              Hire faster, scale higher, <span style={{ color: "var(--gold-bright)" }}>with more confidence.</span>
            </h2>
            <p className="fco-section-sub fco-section-sub-dark">
              Built specifically for US healthcare RCM, medical coding, billing, and AR operations, Talentera helps hiring teams find and evaluate relevant talent with greater speed and visibility.
            </p>
          </div>

          <div className="fco-benefits-grid">
            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-user-check" /></div>
              <h3 className="fco-benefit-title">5 Hand-Curated Shortlists</h3>
              <p className="fco-benefit-desc">Receive up to 5 top-matched, pre-screened candidates within 24 hours instead of sorting through hundreds of unvetted CVs.</p>
            </div>

            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-hand-holding-dollar" /></div>
              <h3 className="fco-benefit-title">Pay-on-Placement Model</h3>
              <p className="fco-benefit-desc">No subscription fees or setup costs. Pay only after a candidate successfully joins, giving you a hiring model aligned with actual placements.</p>
            </div>

            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-arrows-rotate" /></div>
              <h3 className="fco-benefit-title">90-Day Free Replacement</h3>
              <p className="fco-benefit-desc">Get a free replacement if a hired candidate leaves or does not clear probation within 90 days, subject to Talentera's replacement terms.</p>
            </div>

            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-moon" /></div>
              <h3 className="fco-benefit-title">US Shift & Commute Ready</h3>
              <p className="fco-benefit-desc">Filter candidates based on US night-shift willingness, location, commute preferences, and notice period to improve role compatibility.</p>
            </div>

            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-comments" /></div>
              <h3 className="fco-benefit-title">Direct Contact HR Dashboard</h3>
              <p className="fco-benefit-desc">Connect with shortlisted candidates directly through WhatsApp, call, or email from your hiring dashboard.</p>
            </div>

            <div className="fco-benefit-card">
              <div className="fco-benefit-icon"><i className="fa-solid fa-file-circle-check" /></div>
              <h3 className="fco-benefit-title">Audit-Ready Compliance</h3>
              <p className="fco-benefit-desc">Access candidate assessment scorecards, chart accuracy reports, credential verification details, and verified profile information to support a more informed hiring decision.</p>
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

          <div style={{ textAlign: "center", display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/companies/register" className="fco-btn-gold" style={{ padding: "14px 32px", textDecoration: "none" }}>
              <i className="fa-solid fa-users" style={{ marginRight: 6 }} /> Browse All Candidates →
            </Link>
            <Link to="/companies/jobs" className="fco-btn-outline" style={{ padding: "14px 28px", textDecoration: "none", color: "var(--navy)", borderColor: "rgba(10,31,61,0.25)" }}>
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
              Trusted by <span style={{ color: "var(--gold)" }}>healthcare RCM hiring teams.</span>
            </h2>
          </div>

          <div className="fco-testi-grid">
            <div className="fco-testi-card">
              <p className="fco-testi-quote">
                "We filled 12 ED Coder positions in 14 days. Talentera helped us reduce the time spent screening and shortlisting candidates compared with our traditional recruitment process."
              </p>
              <div>
                <div className="fco-testi-author">Director of Talent Acquisition</div>
                <div className="fco-testi-role">Leading RCM Enterprise · 800+ Coders</div>
              </div>
            </div>

            <div className="fco-testi-card">
              <p className="fco-testi-quote">
                "The credential verification process gave our hiring team greater confidence in candidate certifications. We were able to review verified AAPC credentials before moving candidates forward."
              </p>
              <div>
                <div className="fco-testi-author">VP of Global Operations</div>
                <div className="fco-testi-role">US Healthcare Billing Services</div>
              </div>
            </div>

            <div className="fco-testi-card">
              <p className="fco-testi-quote">
                "The pay-on-placement model helped us reduce our upfront recruitment costs. The 90-day replacement support also gave our team additional confidence when making hiring decisions."
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
                  <div style={{ padding: "0 24px 20px", color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.6 }}>
                    <p style={{ margin: "0 0 12px 0" }}>{faq.a}</p>
                    {faq.example && (
                      <div style={{
                        background: "rgba(10, 31, 61, 0.03)",
                        borderLeft: "3px solid var(--gold)",
                        padding: "12px 16px",
                        borderRadius: "0 8px 8px 0",
                        fontSize: 13.5,
                        color: "var(--navy)"
                      }}>
                        <strong style={{ display: "block", color: "#b47c18", marginBottom: 4, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Real-world example:
                        </strong>
                        {faq.example}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: BOTTOM CTA HERO */}
      <section className="fco-cta-hero">
        <div className="fco-cta-bg-grid" />
        <div className="fco-cta-glow" />

        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="fco-cta-card">
            {/* Top Pill */}
            <div className="fco-cta-pill">
              <span className="fco-cta-pill-dot" />
              <span>PAY-ON-PLACEMENT · ZERO SUBSCRIPTION FEES · 90-DAY GUARANTEE</span>
            </div>

            <h2 className="fco-cta-title">
              Transform your RCM hiring <span className="fco-cta-title-highlight">today.</span>
            </h2>

            <p className="fco-cta-sub">
              Join 342+ US healthcare RCM companies hiring pre-verified medical coders, billers, and AR specialists across India.
            </p>

            {/* Micro value badges */}
            <div className="fco-cta-perks">
              <span className="fco-cta-perk">
                <i className="fa-solid fa-check" /> 5 Shortlists in 24 Hours
              </span>
              <span className="fco-cta-perk">
                <i className="fa-solid fa-check" /> 100% AAPC & AHIMA Verified
              </span>
              <span className="fco-cta-perk">
                <i className="fa-solid fa-check" /> 90-Day Free Replacement
              </span>
              <span className="fco-cta-perk">
                <i className="fa-solid fa-check" /> ₹0 Upfront Retainers
              </span>
            </div>

            {/* Action Buttons */}
            <div className="fco-cta-actions">
              <Link to="/companies/register" className="fco-cta-btn-primary">
                <i className="fa-solid fa-users" />
                <span>Browse Candidates</span>
                <i className="fa-solid fa-arrow-right fco-btn-arrow" />
              </Link>
              <Link to="/companies/jobs" className="fco-cta-btn-secondary">
                <i className="fa-solid fa-briefcase" />
                <span>Post a Job / Requirement</span>
              </Link>
            </div>

            {/* Member Sign-in Row */}
            <div className="fco-cta-login-row">
              <span>Already registered as an employer?</span>
              <Link to="/companies/login" className="fco-cta-login-link">
                Log in to Portal →
              </Link>
            </div>

            {/* Bottom trust text */}
            <div className="fco-cta-footer">
              <i className="fa-solid fa-shield-halved" />
              <span>Active hiring hubs in Chennai · Hyderabad · Bangalore · Coimbatore · Mumbai · Noida & Pan-India</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <Footer />

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
