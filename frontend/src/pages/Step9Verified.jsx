import React from "react";
import { Link } from "react-router-dom";

const SEES = [
  "Assessment scores (Foundation + Specialty, per-topic)",
  "Academy / trainer / cert ID (last 4 digits)",
  "90-sec video + AI mock interview score",
  "Aadhaar-verified locality (city only) + KYC badge",
  "Interview track — anonymized summary",
];

const PRIVATE = [
  "Mobile number (revealed only after shortlist)",
  "Email (same gate)",
  "Full Aadhaar / PAN (locality only, never the number)",
  "Detailed mock interview feedback (score only)",
  "Your data — junk consultancies never get it",
];

export default function Step9Verified({ profile, onOpenDashboard }) {
  const firstName = (profile?.candidate?.stage1?.fullName || "").split(" ")[0] || "there";

  return (
    <div className="wiz-verified-shell">
      <section className="wiz-verified-hero">
        <div className="wiz-verified-badge"><i className="fa-solid fa-check"></i></div>
        <h1>
          Welcome to the <span className="gold-text">Verified Pool</span>, {firstName}
        </h1>
        <p>
          All 8 stages complete. Your profile has just entered the Talentera Verified Pool — the only RCM
          hiring pool in India where every candidate is gate-verified before companies ever see them.
        </p>
        <div className="wiz-verified-points">100 OF 100 POINTS</div>
      </section>

      <section className="wiz-mission-card">
        <div className="wiz-rail-eyebrow">HOW TALENTERA IS DIFFERENT</div>
        <h2>Your resume does <strong>not</strong> get sent out. Companies come find you.</h2>
        <p>
          On Naukri, LinkedIn, and WhatsApp consultancies, your resume gets sprayed everywhere — spam calls,
          junk recruiters, frauds. Talentera works the opposite way. Only when a hiring manager actively
          shortlists you do they get a callback channel. Your contact info stays private until that moment.
        </p>
        <div className="wiz-pool-grid">
          <div className="wiz-pool-card">
            <div className="wiz-pool-num">47</div>
            <div className="wiz-pool-label">RIGHT NOW · IN YOUR SPECIALTY</div>
            <div className="wiz-pool-sub">RCM companies hiring HCC coders this week. You're already in their search pool.</div>
          </div>
          <div className="wiz-pool-card">
            <div className="wiz-pool-num">12</div>
            <div className="wiz-pool-label">IN YOUR LOCALITY</div>
            <div className="wiz-pool-sub">Companies within your Aadhaar-verified locality. No 80-km surprise commutes.</div>
          </div>
        </div>
      </section>

      <section className="wiz-visibility-grid">
        <div className="wiz-visibility-col wiz-visibility-see">
          <div className="wiz-visibility-head"><i className="fa-solid fa-check" style={{ marginRight: 6 }}></i> What companies see</div>
          <ul>{SEES.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div className="wiz-visibility-col wiz-visibility-hide">
          <div className="wiz-visibility-head"><i className="fa-solid fa-lock" style={{ marginRight: 6 }}></i> What stays private</div>
          <ul>{PRIVATE.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </section>

      <div className="wiz-verified-cta" style={{ marginTop: 28, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/jobs" className="btn btn-gold" style={{ padding: "12px 24px", fontWeight: 800 }}>
          Browse open jobs →
        </Link>
        <Link
          to="/resume"
          style={{
            background: "#0A1F3D",
            color: "#FAF7F0",
            border: "1px solid #0A1F3D",
            padding: "12px 20px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center"
          }}
        >
          📄 Open my verified resume
        </Link>
        <button
          type="button"
          onClick={onOpenDashboard}
          style={{
            background: "#ffffff",
            color: "#0A1F3D",
            border: "1.5px solid #0A1F3D",
            padding: "12px 20px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center"
          }}
        >
          ← Back to verification wizard
        </button>
      </div>
    </div>
  );
}
