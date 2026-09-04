import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/footer.css";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'privacy' | 'terms' | null
  const location = useLocation();
  const navigate = useNavigate();

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => {
      // Keep success state displayed
    }, 4000);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleFaqClick = (e) => {
    if (location.pathname === "/") {
      e.preventDefault();
      const faqEl = document.getElementById("faq");
      if (faqEl) {
        faqEl.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/#faq");
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="tal-footer" aria-label="Talentera Site Footer">
        {/* Ambient Glow Elements */}
        <div className="tal-footer-ambient-1" aria-hidden="true" />
        <div className="tal-footer-ambient-2" aria-hidden="true" />

        <div className="container">
          {/* ================================================================
              1. NEWSLETTER / RCM PULSE RIBBON
              ================================================================ */}
          <section className="tal-footer-newsletter-card" aria-labelledby="tal-newsletter-heading">
            <div className="tal-fn-grid">
              <div>
                <div className="tal-fn-badge">
                  <i className="fa-solid fa-bolt" /> Healthcare RCM Intelligence
                </div>
                <h3 id="tal-newsletter-heading" className="tal-fn-title">
                  Stay ahead in India's <span>US Healthcare RCM</span> market
                </h3>
                <p className="tal-fn-desc">
                  Curated weekly digest with active medical coding openings, AAPC &amp; AHIMA exam tips, 
                  salary benchmarks, and top employer shortlists delivered straight to your inbox.
                </p>
              </div>

              <div className="tal-fn-form-wrap">
                {subscribed ? (
                  <div className="tal-fn-success" role="status">
                    <i className="fa-solid fa-circle-check" />
                    <span>You're in! Check your inbox for this week's RCM Career Digest.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="tal-fn-form">
                    <input
                      type="email"
                      required
                      placeholder="Enter your work or personal email..."
                      className="tal-fn-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-label="Email address for weekly career digest"
                    />
                    <button type="submit" className="tal-fn-btn">
                      <span>Subscribe</span>
                      <i className="fa-solid fa-arrow-right" />
                    </button>
                  </form>
                )}

                <div className="tal-fn-tags">
                  <span className="tal-fn-tag">#MedicalCoding</span>
                  <span className="tal-fn-tag">#RiskAdjustment</span>
                  <span className="tal-fn-tag">#AAPC_CPC</span>
                  <span className="tal-fn-tag">#USHealthcare</span>
                  <span className="tal-fn-tag">#BillingCareers</span>
                </div>
              </div>
            </div>
          </section>

          {/* ================================================================
              2. MAIN MULTI-COLUMN NAVIGATION MATRIX (REDESIGNED)
              ================================================================ */}
          <div className="tal-footer-main">
            {/* Column 1: Brand, Mission & Direct Helpline */}
            <div className="tal-col-brand">
              <Link to="/" className="tal-footer-logo-link" aria-label="Talentera Home">
                <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" className="tal-footer-logo" />
              </Link>
              <p className="tal-footer-tagline">
                <strong>India's #1 Verified Skill &amp; Hiring Infrastructure</strong> for US Healthcare Revenue Cycle Management. 
                Connecting AAPC/AHIMA certified professionals with global healthcare leaders.
              </p>

              {/* Live Operational Status */}
              <div className="tal-footer-status">
                <span className="tal-status-dot" aria-hidden="true" />
                <span>All Verification Systems Operational</span>
              </div>

              {/* Contact Information */}
              <div className="tal-footer-contact">
                <a href="mailto:support@talentera.in" className="tal-contact-item">
                  <i className="fa-solid fa-envelope" />
                  <span>support@talentera.in</span>
                </a>
                <a href="tel:+914440007261" className="tal-contact-item">
                  <i className="fa-solid fa-phone" />
                  <span>+91 (044) 4000-RCM1 (Support)</span>
                </a>
                <div className="tal-contact-item">
                  <i className="fa-solid fa-clock" />
                  <span>Mon – Fri: 9:00 AM – 7:00 PM IST</span>
                </div>
              </div>

              {/* Social Channels */}
              <div className="tal-footer-socials" aria-label="Social media profiles">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tal-social-link"
                  aria-label="Talentera LinkedIn"
                >
                  <i className="fa-brands fa-linkedin-in" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tal-social-link"
                  aria-label="Talentera X Twitter"
                >
                  <i className="fa-brands fa-x-twitter" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tal-social-link"
                  aria-label="Talentera YouTube"
                >
                  <i className="fa-brands fa-youtube" />
                </a>
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tal-social-link"
                  aria-label="Talentera Community"
                >
                  <i className="fa-brands fa-discord" />
                </a>
              </div>
            </div>

            {/* Column 2: Candidates */}
            <div className="tal-footer-col">
              <h4 className="tal-col-heading">Candidates</h4>
              <ul className="tal-footer-links">
                <li>
                  <Link to="/jobs">
                    <span>Explore RCM Jobs</span>
                    <span className="tal-link-badge live">LIVE</span>
                  </Link>
                </li>
                <li>
                  <Link to="/register">Candidate Registration</Link>
                </li>
                <li>
                  <Link to="/login">Candidate Portal Login</Link>
                </li>
                <li>
                  <Link to="/dashboard">8-Stage Verification Wizard</Link>
                </li>
                <li>
                  <Link to="/resume">
                    <span>AI Resume Builder</span>
                    <span className="tal-link-badge free">FREE</span>
                  </Link>
                </li>
                <li>
                  <Link to="/assessment/run">AI Assessment Runner</Link>
                </li>
                <li>
                  <Link to="/candidates">Candidates Overview</Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Employers */}
            <div className="tal-footer-col">
              <h4 className="tal-col-heading">Employers</h4>
              <ul className="tal-footer-links">
                <li>
                  <Link to="/companies">Hire Verified Talent</Link>
                </li>
                <li>
                  <Link to="/companies/jobs">
                    <span>Post a Requirement</span>
                    <span className="tal-link-badge">24H</span>
                  </Link>
                </li>
                <li>
                  <Link to="/companies/register">Company Registration</Link>
                </li>
                <li>
                  <Link to="/companies/login">Employer Portal Login</Link>
                </li>
                <li>
                  <Link to="/companies/directory">Candidate Directory</Link>
                </li>
                <li>
                  <Link to="/companies#verification">4-Layer Verification Engine</Link>
                </li>
                <li>
                  <Link to="/companies#pricing">Zero Risk Pay-on-Placement</Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Academies */}
            <div className="tal-footer-col">
              <h4 className="tal-col-heading">Academies</h4>
              <ul className="tal-footer-links">
                <li>
                  <Link to="/academy">Academy Partnerships</Link>
                </li>
                <li>
                  <Link to="/academy/login">Academy Portal Login</Link>
                </li>
                <li>
                  <Link to="/academy#batch">
                    <span>Batch Onboarding</span>
                    <span className="tal-link-badge new">BULK</span>
                  </Link>
                </li>
                <li>
                  <Link to="/academy#curriculum">AAPC/AHIMA Alignment</Link>
                </li>
                <li>
                  <Link to="/academy#placements">Campus Placement Drives</Link>
                </li>
                <li>
                  <Link to="/academy#verification">Institutional Scorecards</Link>
                </li>
              </ul>
            </div>

            {/* Column 5: Specialties & Platform */}
            <div className="tal-footer-col">
              <h4 className="tal-col-heading">Specialties &amp; Trust</h4>
              <ul className="tal-footer-links">
                <li>
                  <Link to="/jobs">Medical Coding (CPC, COC, CIC)</Link>
                </li>
                <li>
                  <Link to="/jobs">Medical Billing &amp; AR Operations</Link>
                </li>
                <li>
                  <Link to="/jobs">Risk Adjustment &amp; HCC Coding</Link>
                </li>
                <li>
                  <Link to="/jobs">ED &amp; Inpatient Chart Audits</Link>
                </li>
                <li>
                  <Link to="/verify/DEMO-VERIFIED">
                    <span>Verify Candidate ID</span>
                    <span className="tal-link-badge new">AUDIT</span>
                  </Link>
                </li>
                <li>
                  <a href="#faq" onClick={handleFaqClick}>Frequently Asked Questions</a>
                </li>
                <li>
                  <Link to="/staff/login">Staff Operations Hub</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* ================================================================
              3. BOTTOM LEGAL & COPYRIGHT BAR (BALANCED)
              ================================================================ */}
          <div className="tal-footer-bottom">
            <div className="tal-bottom-left">
              <span>© {currentYear} Talentera Healthcare Network Private Limited. All rights reserved.</span>
              <span className="tal-bottom-divider">·</span>
              <span className="tal-bottom-flag">
                <span className="tal-flag-icon" role="img" aria-label="India flag">🇮🇳</span>
                <span>Crafted in India for Global Healthcare</span>
              </span>
            </div>

            <div className="tal-bottom-right">
              <div className="tal-bottom-links">
                <button type="button" onClick={() => setActiveModal("privacy")}>
                  Privacy Policy
                </button>
                <span>·</span>
                <button type="button" onClick={() => setActiveModal("terms")}>
                  Terms of Service
                </button>
                <span>·</span>
                <Link to="/companies/register">Employer Agreement</Link>
                <span>·</span>
                <Link to="/staff/login">Employee Access</Link>
              </div>

              <button type="button" onClick={scrollToTop} className="tal-bottom-back-to-top" aria-label="Scroll to top of page">
                <span>Back to top</span>
                <i className="fa-solid fa-arrow-up" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ================================================================
          6. INTERACTIVE LEGAL MODAL: PRIVACY POLICY
          ================================================================ */}
      {activeModal === "privacy" && (
        <div className="tal-modal-overlay" onClick={() => setActiveModal(null)} role="dialog" aria-modal="true">
          <div className="tal-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="tal-modal-header">
              <h3>
                <i className="fa-solid fa-shield-halved" /> Talentera Privacy Policy
              </h3>
              <button
                type="button"
                className="tal-modal-close-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="tal-modal-body">
              <h4>1. Overview &amp; Scope</h4>
              <p>
                Talentera Healthcare Network Private Limited ("Talentera", "we", "our") takes candidate data privacy 
                and corporate compliance with paramount responsibility. This policy details our handling of Aadhaar 
                verification, certification records, assessment results, and recruiter communications.
              </p>

              <h4>2. Aadhaar Identity &amp; Masked Data Compliance</h4>
              <p>
                In strict compliance with UIDAI regulations and India's Digital Personal Data Protection Act (DPDP), 
                we do not store your 12-digit Aadhaar number in plaintext. All OTP authentications verify identity 
                directly via authorized UIDAI API partners, and your profile stores only masked credentials 
                (e.g., XXXX XXXX 1234) along with locality details to verify commute readiness.
              </p>

              <h4>3. Candidate Confidentiality &amp; Stealth Mode</h4>
              <p>
                Candidates retain 100% control over their profile visibility. When "Stealth Privacy Mode" is toggled, 
                your current employer and blacklisted entities cannot view your profile or CV in our hiring directory.
              </p>

              <h4>4. HIPAA Compliance &amp; Assessment Test Data</h4>
              <p>
                All sample patient charts and coding audits used in our 8-Stage proctored evaluations are synthetic 
                and de-identified according to the HIPAA Safe Harbor standard (45 CFR § 164.514). No Protected Health 
                Information (PHI) from live hospital systems is ever accepted or stored.
              </p>

              <h4>5. Data Retention &amp; Erasure</h4>
              <p>
                You may request complete erasure of your candidate profile, video intros, and proctored scorecards at 
                any time by submitting a request to <strong>privacy@talentera.in</strong>.
              </p>
            </div>
            <div className="tal-modal-footer">
              <button type="button" className="tal-modal-done-btn" onClick={() => setActiveModal(null)}>
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          7. INTERACTIVE LEGAL MODAL: TERMS OF SERVICE
          ================================================================ */}
      {activeModal === "terms" && (
        <div className="tal-modal-overlay" onClick={() => setActiveModal(null)} role="dialog" aria-modal="true">
          <div className="tal-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="tal-modal-header">
              <h3>
                <i className="fa-solid fa-file-contract" /> Talentera Terms of Service
              </h3>
              <button
                type="button"
                className="tal-modal-close-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="tal-modal-body">
              <h4>1. Candidate Code of Conduct</h4>
              <p>
                All candidates using Talentera agree to provide truthful credentials. Submission of forged AAPC, 
                AHIMA, or work experience documentation leads to immediate and permanent blacklisting across all 
                partner employer portals.
              </p>

              <h4>2. Zero Fees for Candidates</h4>
              <p>
                Talentera is 100% free for job-seeking medical coders, billers, and RCM specialists. Talentera will 
                never charge candidates any registration fee, interview booking fee, or placement commission.
              </p>

              <h4>3. Employer Terms &amp; 90-Day Guarantee</h4>
              <p>
                Employers utilizing the Talentera hiring network operate under a pay-on-placement schedule with a 
                comprehensive 90-day free candidate replacement guarantee in the event of voluntary resignation 
                or performance probation failure.
              </p>

              <h4>4. Intellectual Property &amp; Platform Security</h4>
              <p>
                All proprietary assessment rubrics, typography styles, chart audit engines, and platform software 
                are copyrighted assets of Talentera Healthcare Network Private Limited. Automated scraping or 
                unauthorized data extraction is strictly prohibited.
              </p>
            </div>
            <div className="tal-modal-footer">
              <button type="button" className="tal-modal-done-btn" onClick={() => setActiveModal(null)}>
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
