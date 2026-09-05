import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LiquidNavCapsule from "../components/LiquidNavCapsule";
import Footer from "../components/Footer.jsx";
import "../styles/forAcademies.css";
import { startOtpWidget } from "../utils/msg91Widget.js";
import { safeJson } from "../utils/safeJson.js";

export default function ForAcademies() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePartnerLogin = async (e) => {
    e.preventDefault();
    if (!fullName || !academyName || !email) {
      setError("Please fill in all required fields.");
      return;
    }
    const cleanEmailStr = email.trim().toLowerCase();
    if (!cleanEmailStr || !cleanEmailStr.includes("@")) {
      setError("A valid work email is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const accessToken = await startOtpWidget(cleanEmailStr);
      const res = await fetch("/api/academy/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, fullName, academyName, email: cleanEmailStr, mobile })
      });
      const data = await safeJson(res);
      if (res.ok) {
        localStorage.setItem("talentera_academy_token", data.token);
        localStorage.setItem("talentera_academy_info", JSON.stringify(data.academy));
        navigate("/academy/dashboard");
      } else {
        setError(data.message || "Login failed.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    document.title = "Medical Coding Institute Partnership | Talentera";
  }, []);

  const faqs = [
    {
      q: "1. What is a medical coding institute partnership?",
      a: "A medical coding institute partnership connects your academy with Talentera's healthcare talent and hiring ecosystem, helping qualified students move from training and certification toward verified employment opportunities."
    },
    {
      q: "2. How can my medical coding institute partner with Talentera?",
      a: "Your institute can partner with Talentera to onboard student batches, verify credentials, assess candidate readiness, and connect eligible medical coding professionals with verified healthcare employers."
    },
    {
      q: "3. Can Talentera help with medical coding student placements?",
      a: "Yes. Talentera helps create a structured pathway between medical coding students and healthcare employers, giving qualified candidates access to relevant medical coding and US healthcare RCM opportunities."
    },
    {
      q: "4. Can we upload an entire student batch at once?",
      a: "Yes. Partner institutes can use batch upload to add multiple student profiles through supported Excel or CSV formats, reducing manual data entry and simplifying student onboarding."
    },
    {
      q: "5. Does Talentera verify AAPC and AHIMA certifications?",
      a: "Talentera's verification process is designed to help validate relevant AAPC and AHIMA credentials, giving employers greater confidence when evaluating certified medical coding candidates."
    },
    {
      q: "6. What types of healthcare roles can our students find?",
      a: "Depending on qualifications and employer requirements, students may find opportunities across medical coding, medical billing, US healthcare RCM, risk adjustment, HCC coding, and related healthcare operations."
    },
    {
      q: "7. Why should a medical coding academy partner with Talentera?",
      a: "A medical coding academy partnership with Talentera can help strengthen your placement ecosystem by combining batch onboarding, candidate verification, assessments, employer connections, and structured medical coding placement opportunities."
    }
  ];
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="fa-page">
      {/* HERO SECTION */}
      <section className="fa-hero">
        {/* Top Left Corner Back to Home Button */}
        <Link
          to="/"
          className="fa-btn-outline"
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
          <div className="fa-eyebrow">
            <i className="fa-solid fa-graduation-cap" /> MEDICAL CODING INSTITUTE PARTNERSHIP
          </div>

          <h1 className="fa-hero-title">
            Your Students. <span style={{ color: "var(--gold-bright)" }}>Their Careers.</span> <br />
            One Powerful Medical Coding Institute Partnership.
          </h1>

          <p className="fa-hero-sub">
            Partner with India's #1 RCM talent platform. Upload student batches, verify AAPC/AHIMA credentials, assess candidate readiness, and connect qualified graduates with 342+ verified hiring companies.
            <span style={{ display: "block", marginTop: 10, color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
              From classroom to career — build your institute's placement network with Talentera.
            </span>
          </p>

          <div className="fa-stats-grid">
            <div>
              <div className="fa-stat-num">₹2,500</div>
              <div className="fa-stat-lbl">Placement Reward Per Candidate</div>
            </div>
            <div>
              <div className="fa-stat-num">342+</div>
              <div className="fa-stat-lbl">Verified Hiring Companies</div>
            </div>
            <div>
              <div className="fa-stat-num">1-Click</div>
              <div className="fa-stat-lbl">Batch Profile Upload</div>
            </div>
            <div>
              <div className="fa-stat-num">Instant</div>
              <div className="fa-stat-lbl">AAPC & AHIMA Verification</div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY PARTNER SECTION */}
      <section className="fa-section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="fa-section-head">
            <div className="fa-section-eyebrow">WHY MEDICAL CODING INSTITUTES CHOOSE TALENTERA</div>
            <h2 className="fa-section-title">
              A medical coding institute partnership built for{" "}
              <span style={{ color: "var(--gold)" }}>student placement and career growth.</span>
            </h2>
          </div>

          <div className="fa-cards-grid">
            <div className="fa-card">
              <div className="fa-card-icon"><i className="fa-solid fa-upload" /></div>
              <h3 className="fa-card-title">1-Click Batch Upload</h3>
              <p className="fa-card-desc">
                Upload 50+ medical coding student profiles through Excel or CSV in seconds. Bring your entire batch onto Talentera without manual form filling.
              </p>
            </div>

            <div className="fa-card">
              <div className="fa-card-icon"><i className="fa-solid fa-shield-halved" /></div>
              <h3 className="fa-card-title">Instant AAPC & AHIMA Verification</h3>
              <p className="fa-card-desc">
                Verify AAPC and AHIMA credentials through automated verification, helping healthcare employers identify qualified and certified medical coding professionals.
              </p>
            </div>

            <div className="fa-card">
              <div className="fa-card-icon"><i className="fa-solid fa-building-user" /></div>
              <h3 className="fa-card-title">Direct Recruiter Access</h3>
              <p className="fa-card-desc">
                Connect your medical coding academy with verified healthcare employers actively hiring medical coding and US healthcare RCM professionals.
              </p>
            </div>

            <div className="fa-card">
              <div className="fa-card-icon"><i className="fa-solid fa-sack-dollar" /></div>
              <h3 className="fa-card-title">₹2,500 Placement Reward</h3>
              <p className="fa-card-desc">
                Strengthen your medical coding placement program and earn ₹2,500 for every eligible candidate hired through your academy partnership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FORM & LOGIN SECTION */}
      <section id="partner-form" className="fa-section" style={{ background: "#ffffff" }}>
        <div className="container">
          <div className="fa-section-head">
            <div className="fa-section-eyebrow">GET STARTED TODAY</div>
            <h2 className="fa-section-title">Partner with Talentera in <span style={{ color: "var(--gold)" }}>2 minutes.</span></h2>
          </div>

          <div className="fa-auth-box">
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--gold-bright)" }}>
              Academy Partner Sign Up / Login
            </h3>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24 }}>
              Enter your institute details to log in or register a new academy account.
            </p>

            {error && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handlePartnerLogin}>
              <input
                type="text"
                className="fa-input"
                placeholder="Full Name (Director / Coordinator)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <input
                type="text"
                className="fa-input"
                placeholder="Academy / Institute Name"
                value={academyName}
                onChange={(e) => setAcademyName(e.target.value)}
                required
              />
              <input
                type="email"
                className="fa-input"
                placeholder="Official Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="tel"
                className="fa-input"
                placeholder="Mobile Number (for OTP verification)"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />

              <button type="submit" className="fa-btn-gold" style={{ width: "100%", justifyContent: "center", padding: 14, fontSize: 15 }} disabled={loading}>
                {loading ? "Verifying OTP..." : "Verify & Access Academy Portal →"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="fa-section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="fa-section-head">
            <div className="fa-section-eyebrow">FREQUENTLY ASKED QUESTIONS</div>
            <h2 className="fa-section-title">Frequently asked questions.</h2>
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

      {/* ====== FOOTER ====== */}
      <Footer />
    </div>
  );
}
