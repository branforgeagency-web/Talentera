import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function HireVerifiedTalentContent({ onPostRequirement, onPostJob }) {
  const navigate = useNavigate();

  // Typewriter rotation effect for "in your city."
  const [typewriterText, setTypewriterText] = useState("in your city.");

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Active filter dimension state for interactive demo
  const [activeDimension, setActiveDimension] = useState("specialty");

  useEffect(() => {
    const phrases = ["in your city.", "actually verified.", "ready in 24 hrs."];
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

  const handleAction = () => {
    if (onPostRequirement) {
      onPostRequirement();
    } else {
      navigate("/companies/register");
    }
  };

  const handleBrowsePool = () => {
    navigate("/companies/directory");
  };

  const handlePostJob = () => {
    if (onPostJob) {
      onPostJob();
    } else {
      navigate("/companies/register");
    }
  };

  const faqs = [
    {
      question: "How is Talentera different from regular job portals like Naukri or Indeed?",
      answer: "Traditional job portals are generic bulletin boards where anyone can upload any resume with unverified claims. Talentera is an RCM-specialized talent platform where every candidate undergoes a 4-layer verification process: Aadhaar UIDAI identity verification, direct AAPC/AHIMA certification API check, proctored specialty assessments, and past employer peer confirmation. You only receive max 5 pre-screened, audit-ready profiles instead of 1,000 unverified CVs."
    },
    {
      question: "How much does it cost to use Talentera?",
      answer: "Talentera operates strictly on a Pay-on-Placement model. There are zero subscription fees, zero posting costs, and zero upfront retainers. You only pay a standard placement fee 30 days after a candidate successfully joins your team. We also offer a Free Starter Pilot for your first hire so you can experience candidate quality risk-free."
    },
    {
      question: "What is the 90-Day Free Replacement Guarantee?",
      answer: "We stand behind the quality and retention of our candidates. If a candidate hired through Talentera leaves or fails probation within their first 90 days, we immediately provide a 100% free replacement candidate from our verified pool at zero additional cost."
    },
    {
      question: "How quickly can we receive candidate shortlists?",
      answer: "Once you post your requirement (takes under 3 minutes), Talentera's automated matching engine instantly queries 12,480+ pre-verified candidates. You will receive your curated shortlist of max 5 specialty-matched candidates within 24 hours."
    },
    {
      question: "Are candidate certifications really verified with AAPC / AHIMA?",
      answer: "Yes! We run direct API member validation against credentialing bodies (AAPC, AHIMA). We check member ID, active standing, certification issue date, and certification type (CPC, CIC, COC, CRC, CCS). Zero unverified or expired certificates make it into the verified candidate pool."
    },
    {
      question: "Can we hire for US night shifts or remote/hybrid positions?",
      answer: "Absolutely. During candidate screening, we tag candidates for US night shift willingness, notice period, location preference, and remote/on-site readiness. You can filter your shortlist specifically for night shift coders or billers."
    }
  ];

  const dimensions = [
    {
      id: "specialty",
      name: "Specialty & Sub-specialty",
      desc: "ED, Surgery, E/M, HCC Risk Adjustment, Anesthesia, Radiology",
      badge: "ED & Surgery Audit 96%"
    },
    {
      id: "cert",
      name: "Certification Status",
      desc: "AAPC CPC, CIC, COC, CRC & AHIMA CCS live API status verified",
      badge: "AAPC CPC Verified"
    },
    {
      id: "ehr",
      name: "EHR / Software Mastery",
      desc: "Hands-on experience in Epic, Cerner, AthenaHealth, Kareo, eClinicalWorks",
      badge: "Epic & Cerner Proficient"
    },
    {
      id: "ar",
      name: "Denial & AR Expertise",
      desc: "Proven denial resolution, payer rules (Medicare/Medicaid), A/R aging analysis",
      badge: "Denial Mgmt Score 94%"
    },
    {
      id: "accuracy",
      name: "Accuracy & Assessment Score",
      desc: "Proctored chart audit test score with verified 90%+ coding accuracy",
      badge: "Verified 95%+ Audit Score"
    },
    {
      id: "shift",
      name: "Shift & Commute Readiness",
      desc: "Confirmed US Night Shift readiness, immediate notice period & locality check",
      badge: "Night Shift Ready · 7-Day Notice"
    }
  ];

  return (
    <div className="hv-wrapper" style={{ background: "var(--navy-deep)", color: "#fff", fontFamily: "var(--font-body)" }}>
      
      {/* ====== HERO SECTION ====== */}
      <section className="hv-hero">
        <div className="hv-hero-bg-glow" />
        <div className="hv-hero-grid-pattern" />

        <div className="container hv-hero-container">
          {/* Eyebrow Badge */}
          <div className="hv-badge-eyebrow">
            <span className="hv-dot-pulse" />
            <span>FOR RCM HIRING TEAMS · INDIA-FIRST · PAY ON HIRE</span>
          </div>

          {/* Headline with Typewriter Effect */}
          <h1 className="hv-hero-title">
            Hire RCM talent that's <br />
            <em className="hv-gold-italic">{typewriterText}</em>
            <span className="compl-tw-cursor" />
          </h1>

          {/* Subtitle */}
          <p className="hv-hero-sub">
            Stop sifting 200 resumes for 1 hire. Talentera sends you <strong>5 verified, specialty-precise candidates</strong> — ready to interview in 24 hours.
            <br />
            <span style={{ fontSize: 13, color: "rgba(200,209,224,0.7)", display: "inline-block", marginTop: 8 }}>
              14-day average time-to-hire · 88% offer-acceptance rate · Pay only when you hire.
            </span>
          </p>

          {/* Action CTAs */}
          <div className="hv-hero-actions">
            <button className="hv-btn-gold" onClick={handlePostJob}>
              + Post a Job
            </button>
            <button className="hv-btn-outline" onClick={handleAction}>
              🔍 Hire Verified Candidates
            </button>
          </div>

          {/* Secondary Register Pill */}
          <div className="compl-register-row" style={{ marginBottom: 40 }}>
            <span>New to Talentera?</span>
            <div className="compl-register-pill" onClick={handleAction} style={{ cursor: "pointer" }}>
              <span className="compl-register-dot" />
              <span>Register your company free →</span>
            </div>
          </div>

          {/* 4 Stat Cards Grid */}
          <div className="hv-stats-grid">
            <div className="hv-stat-card">
              <div className="hv-stat-number">14</div>
              <div className="hv-stat-label">DAYS TO HIRE</div>
            </div>
            <div className="hv-stat-card">
              <div className="hv-stat-number">88%</div>
              <div className="hv-stat-label">OFFER ACCEPTANCE</div>
            </div>
            <div className="hv-stat-card">
              <div className="hv-stat-number">4-Layer</div>
              <div className="hv-stat-label">VERIFICATION</div>
            </div>
            <div className="hv-stat-card">
              <div className="hv-stat-number">30-Day</div>
              <div className="hv-stat-label">REPLACEMENT</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== SECTION 1: THE 5 ISSUES (PAIN POINTS) ====== */}
      <section className="hv-section hv-bg-navy">
        <div className="container">
          <div className="hv-section-header">
            <div className="hv-badge">THE RCM HIRING PAIN</div>
            <h2 className="hv-section-title">
              Every RCM hiring team faces the <em className="hv-gold-italic">same five issues.</em>
            </h2>
            <p className="hv-section-sub">
              Traditional portals fail RCM because generalist resumes hide true specialty competence. Here is what we fixed.
            </p>
          </div>

          <div className="hv-issues-grid">
            {/* Issue 1 */}
            <div className="hv-issue-card">
              <div className="hv-issue-stat">1000+</div>
              <h3 className="hv-issue-title">Unfiltered CVs per posting</h3>
              <p className="hv-issue-desc">
                Generic job portals flood your inbox with candidates who have never touched an ED chart or handled denial workflows.
              </p>
              <div className="hv-issue-fixed">
                <span className="hv-check-icon">✓</span>
                <span>Fixed: 5 curated matches only</span>
              </div>
            </div>

            {/* Issue 2 */}
            <div className="hv-issue-card">
              <div className="hv-issue-stat">3 Weeks</div>
              <h3 className="hv-issue-title">Background check lag time</h3>
              <p className="hv-issue-desc">
                Candidate accepts offer, but BG verification takes weeks. Last-minute dropouts reset your hiring timeline.
              </p>
              <div className="hv-issue-fixed">
                <span className="hv-check-icon">✓</span>
                <span>Fixed: Instant cross-company verification</span>
              </div>
            </div>

            {/* Issue 3 */}
            <div className="hv-issue-card">
              <div className="hv-issue-stat">8.5%</div>
              <h3 className="hv-issue-title">AAPC / AHIMA fraud rate</h3>
              <p className="hv-issue-desc">
                Unverified certification claims on resumes. Candidates list CPC/CIC without valid AAPC member verification.
              </p>
              <div className="hv-issue-fixed">
                <span className="hv-check-icon">✓</span>
                <span>Fixed: Direct API member status checks</span>
              </div>
            </div>

            {/* Issue 4 */}
            <div className="hv-issue-card">
              <div className="hv-issue-stat">40%</div>
              <h3 className="hv-issue-title">Mismatch on specialty depth</h3>
              <p className="hv-issue-desc">
                Candidates claim "Inpatient coding" but only know Outpatient E/M. Zero way to filter by sub-specialty on job boards.
              </p>
              <div className="hv-issue-fixed">
                <span className="hv-check-icon">✓</span>
                <span>Fixed: 12+ specialty depth filters</span>
              </div>
            </div>

            {/* Issue 5 */}
            <div className="hv-issue-card">
              <div className="hv-issue-stat">68%</div>
              <h3 className="hv-issue-title">90-day candidate drop-off</h3>
              <p className="hv-issue-desc">
                Hire without soft-skill or commute checks leads to early exits. High replacement cost for your operations.
              </p>
              <div className="hv-issue-fixed">
                <span className="hv-check-icon">✓</span>
                <span>Fixed: 94% 90-day retention guarantee</span>
              </div>
            </div>
          </div>

          <div className="hv-footnote">
            All metrics based on aggregated data across 177+ RCM employers on Talentera.
          </div>
        </div>
      </section>

      {/* ====== SECTION 2: WORKFLOW TIMELINE ====== */}
      <section className="hv-section hv-bg-darker">
        <div className="container">
          <div className="hv-section-header">
            <div className="hv-badge">FAST-TRACK WORKFLOW</div>
            <h2 className="hv-section-title">
              From requirement to hire in <em className="hv-gold-italic">5–7 days.</em>
            </h2>
            <p className="hv-section-sub">
              No job postings, no resume sift, no wasted interview rounds.
            </p>
          </div>

          <div className="hv-timeline-grid">
            {/* Step 1 */}
            <div className="hv-timeline-step">
              <div className="hv-step-tag">Day 1</div>
              <div className="hv-step-num">01</div>
              <h3 className="hv-step-title">Submit Requirement</h3>
              <p className="hv-step-desc">
                Tell us specialty, volume, soft skills, shift timing, and pay budget. Takes &lt;3 minutes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="hv-timeline-step">
              <div className="hv-step-tag">Day 1-2</div>
              <div className="hv-step-num">02</div>
              <h3 className="hv-step-title">Match & Shortlist (5 Max)</h3>
              <p className="hv-step-desc">
                Talentera matching engine runs across 12,480+ pre-verified candidates. You get max 5 profiles.
              </p>
            </div>

            {/* Step 3 */}
            <div className="hv-timeline-step">
              <div className="hv-step-tag">Day 3-4</div>
              <div className="hv-step-num">03</div>
              <h3 className="hv-step-title">Direct Interview Round</h3>
              <p className="hv-step-desc">
                Candidate already pre-assessed. You conduct 1 final tech/culture round.
              </p>
            </div>

            {/* Step 4 */}
            <div className="hv-timeline-step">
              <div className="hv-step-tag">Day 5</div>
              <div className="hv-step-num">04</div>
              <h3 className="hv-step-title">Instant Offer & BGV Rollout</h3>
              <p className="hv-step-desc">
                Aadhaar, AAPC, Academy, and past employer background data instantly shareable.
              </p>
            </div>

            {/* Step 5 */}
            <div className="hv-timeline-step hv-step-success">
              <div className="hv-step-tag hv-tag-success">Day 5-7</div>
              <div className="hv-step-num hv-num-success">05</div>
              <h3 className="hv-step-title">Candidate Onboards</h3>
              <p className="hv-step-desc">
                Candidate joins team. Pay placement fee ONLY after successful joining.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== SECTION 3: 12+ DIMENSIONS FILTER ====== */}
      <section className="hv-section hv-bg-navy">
        <div className="container">
          <div className="hv-section-header">
            <div className="hv-badge">DEEP MATCHING ENGINE</div>
            <h2 className="hv-section-title">
              Filter on <em className="hv-gold-italic">12+ dimensions</em> job boards can't touch.
            </h2>
            <p className="hv-section-sub">
              Stop asking "Do you know HCC coding?" during interviews. Filter by verified competence upfront.
            </p>
          </div>

          <div className="hv-filter-split">
            {/* Left Column: Dimensions Interactive List */}
            <div className="hv-filter-list">
              {dimensions.map((d) => {
                const isActive = activeDimension === d.id;
                return (
                  <div
                    key={d.id}
                    className={`hv-filter-item ${isActive ? "active" : ""}`}
                    onClick={() => setActiveDimension(d.id)}
                  >
                    <div className="hv-filter-item-head">
                      <span className="hv-filter-bullet">{isActive ? "➔" : "•"}</span>
                      <span className="hv-filter-name">{d.name}</span>
                    </div>
                    <p className="hv-filter-desc">{d.desc}</p>
                  </div>
                );
              })}
              <div className="hv-filter-hint">
                <span>Try searching in our candidate directory after setup →</span>
              </div>
            </div>

            {/* Right Column: Candidate Card Mockup Preview */}
            <div className="hv-filter-preview">
              <div className="hv-card-mockup">
                <div className="hv-card-mockup-badge">WHAT YOU GET WITH TALENTERA PRE-FILTERING</div>
                
                <div className="hv-cand-header">
                  <div className="hv-cand-avatar">AM</div>
                  <div>
                    <div className="hv-cand-name">Ananya M. <span className="hv-vcheck">✓</span></div>
                    <div className="hv-cand-sub">AAPC CPC Certified · 4.8 Yrs Exp · Chennai</div>
                  </div>
                </div>

                <div className="hv-cand-badges-row">
                  <span className="hv-cand-pill-gold">AAPC CPC Verified ✓</span>
                  <span className="hv-cand-pill-blue">Epic & Cerner Proficient</span>
                  <span className="hv-cand-pill-green">ED & Surgery Score 96%</span>
                </div>

                <div className="hv-cand-details-grid">
                  <div className="hv-cand-detail-item">
                    <span className="hv-detail-label">SPECIALTY:</span>
                    <span className="hv-detail-val">ED & Complex Surgery Coding</span>
                  </div>
                  <div className="hv-cand-detail-item">
                    <span className="hv-detail-label">SHIFT READINESS:</span>
                    <span className="hv-detail-val">US Night Shift Ready</span>
                  </div>
                  <div className="hv-cand-detail-item">
                    <span className="hv-detail-label">NOTICE PERIOD:</span>
                    <span className="hv-detail-val">7 Days (Buyout candidate)</span>
                  </div>
                  <div className="hv-cand-detail-item">
                    <span className="hv-detail-label">AUDIT VERIFICATION:</span>
                    <span className="hv-detail-val">Verified by 3 independent assessments</span>
                  </div>
                </div>

                <div className="hv-card-guarantee-pill">
                  🛡️ Talentera Guarantee: If candidate fails 90-day probation, 100% free replacement.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== SECTION 4: CROSS-COMPANY VERIFICATION ====== */}
      <section className="hv-section hv-bg-darker">
        <div className="container">
          <div className="hv-section-header">
            <div className="hv-badge">INSTANT TRUST</div>
            <h2 className="hv-section-title">
              Cross-Company Verification — <em className="hv-gold-italic">replace 3-week BG checks.</em>
            </h2>
            <p className="hv-section-sub">
              Every candidate in the verified pool has complete audit-quality proof pre-attached before you ever see their CV.
            </p>
          </div>

          <div className="hv-verify-grid">
            {/* Card 1 */}
            <div className="hv-verify-card">
              <div className="hv-verify-icon">🔒</div>
              <h3 className="hv-verify-title">Comprehensive Verification Data</h3>
              <p className="hv-verify-desc">
                Identity lock via UIDAI Aadhaar OTP, certification validation via AAPC API, proctored coding scores, and video intro pre-loaded.
              </p>
            </div>

            {/* Card 2 */}
            <div className="hv-verify-card">
              <div className="hv-verify-icon">🤝</div>
              <h3 className="hv-verify-title">Cross-Company Endorsements</h3>
              <p className="hv-verify-desc">
                Verified claims backed by previous reporting managers and partner training academies with full audit timestamps.
              </p>
            </div>

            {/* Card 3 */}
            <div className="hv-verify-card">
              <div className="hv-verify-icon">📜</div>
              <h3 className="hv-verify-title">100% Audit-Quality Proof</h3>
              <p className="hv-verify-desc">
                Direct system queries ensure zero fake experience letters or edited certificate PDFs. Zero candidate fraud.
              </p>
            </div>
          </div>

          {/* Stat Strip */}
          <div className="hv-verify-stats">
            <div className="hv-vstat">
              <div className="hv-vstat-num">100%</div>
              <div className="hv-vstat-label">Pre-screened Identity</div>
            </div>
            <div className="hv-vstat">
              <div className="hv-vstat-num">ZERO</div>
              <div className="hv-vstat-label">Fake Certifications</div>
            </div>
            <div className="hv-vstat">
              <div className="hv-vstat-num">100%</div>
              <div className="hv-vstat-label">Audit Trail</div>
            </div>
            <div className="hv-vstat">
              <div className="hv-vstat-num">0</div>
              <div className="hv-vstat-label">Unverified Claims</div>
            </div>
          </div>

          <div className="hv-callout-pill">
            Aadhaar OTP + AAPC API + Academy Confirmation = Zero hiring fraud. Ever.
          </div>
        </div>
      </section>

      {/* ====== SECTION 5: WHY HIRING TEAMS SWITCH (COMPARISON) ====== */}
      <section className="hv-section hv-bg-navy">
        <div className="container">
          <div className="hv-section-header">
            <div className="hv-badge">COMPARISON</div>
            <h2 className="hv-section-title">
              Why hiring teams switch to <em className="hv-gold-italic">Talentera.</em>
            </h2>
            <p className="hv-section-sub">
              Compare traditional hiring methods vs Talentera's Verified Pipeline.
            </p>
          </div>

          <div className="hv-comp-grid">
            {/* Column 1: Job Boards */}
            <div className="hv-comp-card">
              <div className="hv-comp-tag">JOB BOARDS</div>
              <h3 className="hv-comp-name">Traditional Job Portals</h3>
              <ul className="hv-comp-list">
                <li className="hv-bad">❌ 1,000+ unverified resumes</li>
                <li className="hv-bad">❌ 3-4 weeks of screening effort</li>
                <li className="hv-bad">❌ Up to 40% fake certification claims</li>
                <li className="hv-bad">❌ High last-minute interview dropouts</li>
                <li className="hv-bad">❌ Upfront monthly subscription cost</li>
              </ul>
            </div>

            {/* Column 2: Placement Agencies */}
            <div className="hv-comp-card">
              <div className="hv-comp-tag">AGENCIES</div>
              <h3 className="hv-comp-name">Traditional Staffing Agencies</h3>
              <ul className="hv-comp-list">
                <li className="hv-bad">❌ High success fee (15-20%)</li>
                <li className="hv-bad">❌ Slow candidate turnaround (3-5 weeks)</li>
                <li className="hv-bad">❌ Generalist recruiters with zero RCM knowledge</li>
                <li className="hv-bad">❌ No pre-assessment or chart audit scores</li>
                <li className="hv-bad">❌ Complex non-transparent contracts</li>
              </ul>
            </div>

            {/* Column 3: Talentera (Featured) */}
            <div className="hv-comp-card hv-comp-featured">
              <div className="hv-comp-popular">RECOMMENDED</div>
              <div className="hv-comp-tag hv-tag-gold">TALENTERA VERIFIED POOL</div>
              <h3 className="hv-comp-name hv-gold-text">Talentera Hiring Engine</h3>
              <ul className="hv-comp-list">
                <li className="hv-good">✓ Max 5 pre-screened, specialty-precise profiles</li>
                <li className="hv-good">✓ 5–7 days average time-to-hire</li>
                <li className="hv-good">✓ 100% Aadhaar & AAPC API verified credentials</li>
                <li className="hv-good">✓ 94% 90-day candidate retention rate</li>
                <li className="hv-good">✓ Pay ONLY on successful placement (Zero risk)</li>
              </ul>
              <button className="hv-btn-gold hv-comp-btn" onClick={handleAction}>
                Switch to Talentera Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ====== SECTION 6: RECRUITER TESTIMONIALS ====== */}
      <section className="hv-section hv-bg-darker">
        <div className="container">
          <div className="hv-section-header">
            <div className="hv-badge">PROVEN OUTCOMES</div>
            <h2 className="hv-section-title">
              Recruiters who switched and <em className="hv-gold-italic">never went back.</em>
            </h2>
          </div>

          <div className="hv-testimonials-grid">
            <div className="hv-testi-card">
              <div className="hv-testi-quote">
                "We replaced our 4 staffing vendors with Talentera. Our time-to-hire dropped from 28 days to 5 days for certified CPC coders."
              </div>
              <div className="hv-testi-author">
                <div className="hv-testi-avatar">AH</div>
                <div>
                  <div className="hv-author-name">VP of HR & Talent</div>
                  <div className="hv-author-co">Access Healthcare · 1,200+ Coders</div>
                </div>
              </div>
            </div>

            <div className="hv-testi-card">
              <div className="hv-testi-quote">
                "The zero fake CV guarantee is real. Every candidate we interviewed had verified AAPC credentials and accurate experience."
              </div>
              <div className="hv-testi-author">
                <div className="hv-testi-avatar">OH</div>
                <div>
                  <div className="hv-author-name">Director of Talent Acquisition</div>
                  <div className="hv-author-co">Omega Healthcare</div>
                </div>
              </div>
            </div>

            <div className="hv-testi-card">
              <div className="hv-testi-quote">
                "Pay-on-hire model made this a zero risk decision for our executive team. We placed 14 billing specialists in 60 days."
              </div>
              <div className="hv-testi-author">
                <div className="hv-testi-avatar">GH</div>
                <div>
                  <div className="hv-author-name">Head of People Operations</div>
                  <div className="hv-author-co">GeBBS Healthcare Solutions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== SECTION 7: FAQ ACCORDION ====== */}
      <section className="hv-section hv-bg-navy">
        <div className="container">
          <div className="hv-section-header">
            <div className="hv-badge">COMMON QUESTIONS</div>
            <h2 className="hv-section-title">
              Everything HR heads ask <em className="hv-gold-italic">before they sign up.</em>
            </h2>
          </div>

          <div className="hv-faq-container">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className={`hv-faq-item ${isOpen ? "open" : ""}`}>
                  <div className="hv-faq-question" onClick={() => setOpenFaqIndex(isOpen ? null : idx)}>
                    <span>{faq.question}</span>
                    <span className="hv-faq-arrow">{isOpen ? "▲" : "▼"}</span>
                  </div>
                  {isOpen && (
                    <div className="hv-faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====== SECTION 8: PRICING & RISK-FREE PILOT ====== */}
      <section className="hv-section hv-bg-darker">
        <div className="container">
          <div className="hv-section-header">
            <div className="hv-badge">TRANSPARENT PRICING</div>
            <h2 className="hv-section-title">
              Free pilot. Then <em className="hv-gold-italic">per-placement only.</em>
            </h2>
            <p className="hv-section-sub">
              No upfront subscription. No hidden fees. Pay only when candidate joins.
            </p>
          </div>

          <div className="hv-pricing-grid">
            {/* Tier 1: Starter Pilot */}
            <div className="hv-pricing-card">
              <div className="hv-pricing-tag">STARTER PILOT</div>
              <div className="hv-pricing-price">₹0</div>
              <div className="hv-pricing-per">For Your First Placement</div>
              <p className="hv-pricing-desc">
                Test candidate quality with zero risk. Post 1 requirement and evaluate candidate competence.
              </p>
              <ul className="hv-pricing-list">
                <li>✓ 1 Verified candidate hire</li>
                <li>✓ 5 Curated profile shortlists</li>
                <li>✓ AAPC & Aadhaar verification proof</li>
                <li>✓ 90-Day free replacement</li>
              </ul>
              <button className="hv-btn-outline hv-pricing-btn" onClick={handleAction}>
                Start Free Pilot
              </button>
            </div>

            {/* Tier 2: Pay on Placement */}
            <div className="hv-pricing-card hv-pricing-popular">
              <div className="hv-popular-pill">MOST POPULAR</div>
              <div className="hv-pricing-tag hv-tag-gold">PAY PER PLACEMENT</div>
              <div className="hv-pricing-price hv-gold-text">Pay on Hire</div>
              <div className="hv-pricing-per">Standard Success Fee</div>
              <p className="hv-pricing-desc">
                For scaling RCM teams. Pay standard success fee 30 days after candidate joining date.
              </p>
              <ul className="hv-pricing-list">
                <li>✓ Unlimited requirement postings</li>
                <li>✓ Max 5 curated matches per role</li>
                <li>✓ Dedicated account manager</li>
                <li>✓ 90-Day replacement guarantee</li>
                <li>✓ Direct phone & WhatsApp connect</li>
              </ul>
              <button className="hv-btn-gold hv-pricing-btn" onClick={handleAction}>
                Post Requirement
              </button>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="hv-pricing-card">
              <div className="hv-pricing-tag">ENTERPRISE VOLUME</div>
              <div className="hv-pricing-price">Dedicated Pipeline</div>
              <div className="hv-pricing-per">Custom Volume Pricing</div>
              <p className="hv-pricing-desc">
                For large hiring teams requiring 10+ monthly candidates with SLA guarantees.
              </p>
              <ul className="hv-pricing-list">
                <li>✓ Custom hiring pipeline SLAs</li>
                <li>✓ Academy batch reservation</li>
                <li>✓ Custom chart audit assessments</li>
                <li>✓ Executive reporting & dashboard</li>
              </ul>
              <button className="hv-btn-outline hv-pricing-btn" onClick={handleAction}>
                Contact Enterprise Team
              </button>
            </div>
          </div>

          <div className="hv-risk-banner">
            🛡️ Talentera Risk Guarantee: 90-Day Free Replacement on any placement. If a hire leaves within 30-90 days, we replace them at ₹0 extra cost.
          </div>
        </div>
      </section>

      {/* ====== SECTION 9: VALUE PROPOSITION BANNER ====== */}
      <section className="hv-section hv-bg-navy">
        <div className="container">
          <div className="hv-value-banner">
            <h2 className="hv-value-title">
              No more 1000 CVs. <br />
              <em className="hv-gold-italic">Just the right candidate.</em>
            </h2>
            
            <div className="hv-value-checklist">
              <div className="hv-vcheck-item">
                <span className="hv-vcheck-icon">✓</span>
                <span>Max 5 pre-screened, specialty-matched CVs per role</span>
              </div>
              <div className="hv-vcheck-item">
                <span className="hv-vcheck-icon">✓</span>
                <span>100% AAPC & Aadhaar identity verified</span>
              </div>
              <div className="hv-vcheck-item">
                <span className="hv-vcheck-icon">✓</span>
                <span>Zero placement fee until candidate actually joins</span>
              </div>
              <div className="hv-vcheck-item">
                <span className="hv-vcheck-icon">✓</span>
                <span>90-day free candidate replacement guarantee</span>
              </div>
              <div className="hv-vcheck-item">
                <span className="hv-vcheck-icon">🛡️</span>
                <span>Verified candidate pool updated every hour</span>
              </div>
            </div>

            <button className="hv-btn-gold" style={{ marginTop: 28 }} onClick={handleAction}>
              Post Requirement Now
            </button>
          </div>
        </div>
      </section>

      {/* ====== SECTION 10: FINAL CTA BANNER ====== */}
      <section className="hv-section hv-bg-darker hv-final-cta-section">
        <div className="container" style={{ textAlign: "center" }}>
          <h2 className="hv-final-title">
            Stop sifting. <em className="hv-gold-italic">Start hiring.</em>
          </h2>
          <p className="hv-final-sub">
            Post your first requirement in 3 minutes. Receive 5 verified candidate matches within 24 hours.
          </p>

          <div className="hv-final-actions">
            <button className="hv-btn-gold" onClick={handleAction}>
              Post a Requirement
            </button>
            <button className="hv-btn-outline" onClick={handleBrowsePool}>
              Browse Verified Pool →
            </button>
          </div>

          <div className="hv-trust-footer">
            Trusted by 177+ RCM companies across Chennai, Hyderabad, Mumbai, Bangalore & Pan-India.
          </div>
        </div>
      </section>

    </div>
  );
}
