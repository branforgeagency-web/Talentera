import React from "react";
import { useToast } from "../Toast.jsx";

const STAGE_CONFIGS = {
  1: {
    eyebrow: "CAREER PASSPORT",
    title: "You're building your passport",
    status: "🔨 Stage 01 · Identity in progress",
    desc: "Every stage adds a verified layer to your identity. Companies see your passport score — the higher, the more visibility you earn.",
    companies: [
      {
        logo: "O",
        logoBg: "linear-gradient(135deg,#F5B41A,#C99413)",
        name: "Optum India",
        hot: true,
        meta: "Hyderabad · Onsite · 5.5 – 7.0 LPA",
        tags: [{ text: "HCC", type: "gold" }, { text: "CPC", type: "green" }, { text: "12 roles", type: "blue" }],
        line: "92% verified-pool hires",
      },
      {
        logo: "A",
        logoBg: "linear-gradient(135deg,#2E8B57,#1F7A3C)",
        name: "Access Healthcare",
        hot: false,
        meta: "Chennai · Hybrid · 6.0 – 8.5 LPA",
        tags: [{ text: "Featured", type: "gold" }, { text: "CPC + CRC", type: "green" }, { text: "6 roles", type: "blue" }],
        line: "95% verified-pool hires",
      },
      {
        logo: "C",
        logoBg: "linear-gradient(135deg,#1A4FB8,#0F1B3D)",
        name: "Cognizant",
        hot: false,
        meta: "Hyderabad · Remote · 5.0 – 7.0 LPA",
        tags: [{ text: "Remote", type: "gold" }, { text: "8 roles", type: "blue" }],
        line: "88% verified-pool hires",
      },
      {
        logo: "Ω",
        logoBg: "linear-gradient(135deg,#8E44AD,#6D2C82)",
        name: "Omega Healthcare",
        hot: false,
        meta: "Bengaluru · Onsite · 4.8 – 6.5 LPA",
        tags: [{ text: "E/M", type: "gold" }, { text: "AR Calling", type: "gold" }, { text: "5 roles", type: "blue" }],
        line: "90% verified-pool hires",
      },
      {
        logo: "GD",
        logoBg: "linear-gradient(135deg,#E67E22,#C0392B)",
        name: "GEBBS Dental",
        hot: true,
        meta: "Mumbai · Onsite · 5.0 – 7.5 LPA",
        tags: [{ text: "Dental", type: "gold" }, { text: "CDC", type: "green" }, { text: "4 roles", type: "blue" }],
        line: "CDC required · you qualify ✓",
      },
    ],
    whyTitle: "Why Identity First",
    stats: [
      { big: "30s", small: "avg OTP delivery" },
      { big: "0 leaks", small: "industry record" },
      { big: "3×", small: "candidate trust" },
      { big: "100%", small: "verified pool" },
    ],
  },
  2: {
    eyebrow: "CAREER PASSPORT",
    title: "Your passport is 25% built",
    status: "🎓 Stage 02 · Foundation in progress",
    desc: "Once your academy verifies your foundation, your visibility to hiring companies jumps sharply. A verified fresher outranks 87% of Naukri profiles for RCM roles.",
    companies: [
      {
        logo: "O",
        logoBg: "linear-gradient(135deg,#F5B41A,#C99413)",
        name: "Optum India",
        hot: true,
        meta: "Hyderabad · Onsite · 5.5 – 7.0 LPA",
        tags: [{ text: "HCC", type: "gold" }, { text: "CPC", type: "green" }, { text: "12 roles", type: "blue" }],
        line: "Academy sign-off verified ✓",
      },
      {
        logo: "A",
        logoBg: "linear-gradient(135deg,#2E8B57,#1F7A3C)",
        name: "Access Healthcare",
        hot: false,
        meta: "Chennai · Hybrid · 6.0 – 8.5 LPA",
        tags: [{ text: "Featured", type: "gold" }, { text: "CPC + CRC", type: "green" }, { text: "6 roles", type: "blue" }],
        line: "95% verified-pool hires",
      },
      {
        logo: "C",
        logoBg: "linear-gradient(135deg,#1A4FB8,#0F1B3D)",
        name: "Cognizant",
        hot: false,
        meta: "Hyderabad · Remote · 5.0 – 7.0 LPA",
        tags: [{ text: "Remote", type: "gold" }, { text: "8 roles", type: "blue" }],
        line: "88% verified-pool hires",
      },
      {
        logo: "Ω",
        logoBg: "linear-gradient(135deg,#8E44AD,#6D2C82)",
        name: "Omega Healthcare",
        hot: false,
        meta: "Bengaluru · Onsite · 4.8 – 6.5 LPA",
        tags: [{ text: "E/M", type: "gold" }, { text: "AR Calling", type: "gold" }, { text: "5 roles", type: "blue" }],
        line: "90% verified-pool hires",
      },
      {
        logo: "GD",
        logoBg: "linear-gradient(135deg,#E67E22,#C0392B)",
        name: "GEBBS Dental",
        hot: true,
        meta: "Mumbai · Onsite · 5.0 – 7.5 LPA",
        tags: [{ text: "Dental", type: "gold" }, { text: "CDC", type: "green" }, { text: "4 roles", type: "blue" }],
        line: "CDC required · you qualify ✓",
      },
    ],
    whyTitle: "Why Training Pedigree Matters",
    stats: [
      { big: "400+", small: "academies mapped" },
      { big: "3.2×", small: "faster shortlist" },
      { big: "+₹85k", small: "avg salary lift" },
      { big: "Direct", small: "academy sign-off" },
    ],
  },
  3: {
    eyebrow: "CAREER PASSPORT",
    title: (props) => `${props.certCount || 1} certs registered · halfway to verified`,
    status: "🏆 Stage 03 · Certification active",
    desc: "A verified CPC coder ranks 4× higher than an uncertified one on RCM company searches. Each verified cert unlocks a new set of companies globally.",
    companies: [
      {
        logo: "O",
        logoBg: "linear-gradient(135deg,#F5B41A,#C99413)",
        name: "Optum India",
        hot: true,
        meta: "Hyderabad · Onsite · 5.5 – 7.0 LPA",
        tags: [{ text: "HCC", type: "gold" }, { text: "CPC", type: "green" }, { text: "12 roles", type: "blue" }],
        line: "CPC required · you qualify ✓",
      },
      {
        logo: "A",
        logoBg: "linear-gradient(135deg,#2E8B57,#1F7A3C)",
        name: "Access Healthcare",
        hot: false,
        meta: "Chennai · Hybrid · 6.0 – 8.5 LPA",
        tags: [{ text: "Featured", type: "gold" }, { text: "CPC + CRC", type: "green" }, { text: "6 roles", type: "blue" }],
        line: "CPC + CRC required · you qualify ✓",
      },
      {
        logo: "C",
        logoBg: "linear-gradient(135deg,#1A4FB8,#0F1B3D)",
        name: "Cognizant",
        hot: false,
        meta: "Hyderabad · Remote · 5.0 – 7.0 LPA",
        tags: [{ text: "Remote", type: "gold" }, { text: "8 roles", type: "blue" }],
        line: "88% verified-pool hires",
      },
      {
        logo: "Ω",
        logoBg: "linear-gradient(135deg,#8E44AD,#6D2C82)",
        name: "Omega Healthcare",
        hot: false,
        meta: "Bengaluru · Onsite · 4.8 – 6.5 LPA",
        tags: [{ text: "E/M", type: "gold" }, { text: "AR Calling", type: "gold" }, { text: "5 roles", type: "blue" }],
        line: "90% verified-pool hires",
      },
      {
        logo: "GD",
        logoBg: "linear-gradient(135deg,#E67E22,#C0392B)",
        name: "GEBBS Dental",
        hot: true,
        meta: "Mumbai · Onsite · 5.0 – 7.5 LPA",
        tags: [{ text: "Dental", type: "gold" }, { text: "CDC", type: "green" }, { text: "4 roles", type: "blue" }],
        line: "CDC required · you qualify ✓",
      },
    ],
    whyTitle: "Why Certification Matters",
    stats: [
      { big: "4×", small: "higher shortlist rate" },
      { big: "87%", small: "HRs filter certified only" },
      { big: "+₹1.2L", small: "avg CTC uplift" },
      { big: "80+", small: "certs recognized" },
    ],
  },
  4: {
    eyebrow: "CAREER PASSPORT",
    title: (props) => `Passport Score · ${props.score || props.candidate?.score || 50}/100`,
    status: "🧪 Stage 04 · Assessment active",
    desc: "This is the biggest single-stage points jump (+25 pts). A Silver or Gold Assessment score puts you in the top 20% of candidates on every company search.",
    companies: [
      {
        logo: "O",
        logoBg: "linear-gradient(135deg,#F5B41A,#C99413)",
        name: "Optum India",
        hot: true,
        meta: "Hyderabad · Onsite · 5.5 – 7.0 LPA",
        tags: [{ text: "HCC", type: "gold" }, { text: "CPC", type: "green" }, { text: "12 roles", type: "blue" }],
        line: "Min Assessment 70 required · you qualify ✓",
      },
      {
        logo: "A",
        logoBg: "linear-gradient(135deg,#2E8B57,#1F7A3C)",
        name: "Access Healthcare",
        hot: false,
        meta: "Chennai · Hybrid · 6.0 – 8.5 LPA",
        tags: [{ text: "Featured", type: "gold" }, { text: "CPC + CRC", type: "green" }, { text: "6 roles", type: "blue" }],
        line: "Min 80 required · you qualify ✓",
      },
      {
        logo: "C",
        logoBg: "linear-gradient(135deg,#1A4FB8,#0F1B3D)",
        name: "Cognizant",
        hot: false,
        meta: "Hyderabad · Remote · 5.0 – 7.0 LPA",
        tags: [{ text: "Remote", type: "gold" }, { text: "8 roles", type: "blue" }],
        line: "Min 65 required · you qualify ✓",
      },
      {
        logo: "Ω",
        logoBg: "linear-gradient(135deg,#8E44AD,#6D2C82)",
        name: "Omega Healthcare",
        hot: false,
        meta: "Bengaluru · Onsite · 4.8 – 6.5 LPA",
        tags: [{ text: "E/M", type: "gold" }, { text: "AR Calling", type: "gold" }, { text: "5 roles", type: "blue" }],
        line: "90% verified-pool hires",
      },
      {
        logo: "GD",
        logoBg: "linear-gradient(135deg,#E67E22,#C0392B)",
        name: "GEBBS Dental",
        hot: true,
        meta: "Mumbai · Onsite · 5.0 – 7.5 LPA",
        tags: [{ text: "Dental", type: "gold" }, { text: "CDC", type: "green" }, { text: "4 roles", type: "blue" }],
        line: "Min 70 required · you qualify ✓",
      },
    ],
    whyTitle: "Why Assessment Matters",
    stats: [
      { big: "+25 pts", small: "single stage boost" },
      { big: "94%", small: "cheat-free accuracy" },
      { big: "5×", small: "direct test shortlists" },
      { big: "Silver/Gold", small: "priority hiring tier" },
    ],
  },
  5: {
    eyebrow: "CAREER PASSPORT",
    title: (props) => props.isCompleted ? "75/100 · 3 stages to go" : "65/100 · 3 stages to go",
    status: (props) => props.isCompleted ? "🎤 Stage 05 · Video Pitch completed ✓" : "🎤 Stage 05 · Video Pitch active",
    desc: "US-payer roles filter heavily on communication. A Silver or Gold Video Pitch opens 3× more shortlists than the average fresher on Naukri or Foundit.",
    companies: [
      {
        logo: "O",
        logoBg: "linear-gradient(135deg,#F5B41A,#C99413)",
        name: "Optum India",
        hot: true,
        meta: "Hyderabad · Onsite · 5.5 – 7.0 LPA",
        tags: [{ text: "HCC", type: "gold" }, { text: "Video ≥ 75", type: "green" }, { text: "12 roles", type: "blue" }],
        line: "Video score ≥ 75 required · you qualify at 78 ✓",
      },
      {
        logo: "A",
        logoBg: "linear-gradient(135deg,#2E8B57,#1F7A3C)",
        name: "Access Healthcare",
        hot: false,
        meta: "Chennai · Hybrid · 6.0 – 8.5 LPA",
        tags: [{ text: "Featured", type: "gold" }, { text: "Live Verified", type: "green" }, { text: "6 roles", type: "blue" }],
        line: "Live Verified required · you qualify ✓",
      },
      {
        logo: "C",
        logoBg: "linear-gradient(135deg,#1A4FB8,#0F1B3D)",
        name: "Cognizant",
        hot: false,
        meta: "Hyderabad · Remote · 5.0 – 7.0 LPA",
        tags: [{ text: "Remote", type: "gold" }, { text: "Clarity ≥ 80", type: "green" }, { text: "8 roles", type: "blue" }],
        line: "Clarity ≥ 80 required · you qualify at 82 ✓",
      },
      {
        logo: "Ω",
        logoBg: "linear-gradient(135deg,#8E44AD,#6D2C82)",
        name: "Omega Healthcare",
        hot: false,
        meta: "Bengaluru · Onsite · 4.8 – 6.5 LPA",
        tags: [{ text: "E/M", type: "gold" }, { text: "AR Calling", type: "gold" }, { text: "5 roles", type: "blue" }],
        line: "90% verified-pool hires",
      },
      {
        logo: "GD",
        logoBg: "linear-gradient(135deg,#E67E22,#C0392B)",
        name: "GEBBS Dental",
        hot: true,
        meta: "Mumbai · Onsite · 5.0 – 7.5 LPA",
        tags: [{ text: "Dental", type: "gold" }, { text: "CDC", type: "green" }, { text: "4 roles", type: "blue" }],
        line: "CDC required · you qualify ✓",
      },
    ],
    whyTitle: "Why Video Pitch Matters",
    stats: [
      { big: "3×", small: "more HR callbacks" },
      { big: "2 min", small: "saves 3 rounds" },
      { big: "Top 10%", small: "fluency tier" },
      { big: "AI-scored", small: "confidence metric" },
    ],
  },
  6: {
    eyebrow: "CAREER PASSPORT",
    title: (props) => (typeof props.score === "number" ? `Live Chart Score · ${props.score}/100` : "Live Chart Score · not scored yet"),
    status: "💻 Stage 06 · Live Chart active",
    desc: "Real medical charts audited in real EHR environments. Companies shortlist coders based on audited chart accuracy over written test claims.",
    companies: [
      {
        logo: "O",
        logoBg: "linear-gradient(135deg,#F5B41A,#C99413)",
        name: "Optum India",
        hot: true,
        meta: "Hyderabad · Onsite · 5.5 – 7.0 LPA",
        tags: [{ text: "HCC", type: "gold" }, { text: "CPC", type: "green" }, { text: "12 roles", type: "blue" }],
        line: "≥90% Accuracy required · you qualify ✓",
      },
      {
        logo: "A",
        logoBg: "linear-gradient(135deg,#2E8B57,#1F7A3C)",
        name: "Access Healthcare",
        hot: false,
        meta: "Chennai · Hybrid · 6.0 – 8.5 LPA",
        tags: [{ text: "Featured", type: "gold" }, { text: "CPC + CRC", type: "green" }, { text: "6 roles", type: "blue" }],
        line: "Audited coders shortlisted first ✓",
      },
      {
        logo: "C",
        logoBg: "linear-gradient(135deg,#1A4FB8,#0F1B3D)",
        name: "Cognizant",
        hot: false,
        meta: "Hyderabad · Remote · 5.0 – 7.0 LPA",
        tags: [{ text: "Remote", type: "gold" }, { text: "8 roles", type: "blue" }],
        line: "88% verified-pool hires",
      },
      {
        logo: "Ω",
        logoBg: "linear-gradient(135deg,#8E44AD,#6D2C82)",
        name: "Omega Healthcare",
        hot: false,
        meta: "Bengaluru · Onsite · 4.8 – 6.5 LPA",
        tags: [{ text: "E/M", type: "gold" }, { text: "AR Calling", type: "gold" }, { text: "5 roles", type: "blue" }],
        line: "90% verified-pool hires",
      },
      {
        logo: "GD",
        logoBg: "linear-gradient(135deg,#E67E22,#C0392B)",
        name: "GEBBS Dental",
        hot: true,
        meta: "Mumbai · Onsite · 5.0 – 7.5 LPA",
        tags: [{ text: "Dental", type: "gold" }, { text: "CDC", type: "green" }, { text: "4 roles", type: "blue" }],
        line: "Accuracy ≥ 85% required · you qualify ✓",
      },
    ],
    whyTitle: "Why Chart Audits Matter",
    stats: [
      { big: "95%+", small: "audit accuracy" },
      { big: "5 charts", small: "live simulator" },
      { big: "Zero", small: "guess interviews" },
      { big: "Immediate", small: "job offers" },
    ],
  },
  7: {
    eyebrow: "CAREER PASSPORT",
    title: (props) => `🏆 ${props.candidate?.score || 85} / 100`,
    status: "📄 Stage 07 · Resume Builder active",
    desc: "You've completed the proof stages. Stage 07 (Resume) is auto-built from your authenticated credentials. Stage 08 (Career Passport) is one click away.",
    companies: [
      {
        logo: "O",
        logoBg: "linear-gradient(135deg,#F5B41A,#C99413)",
        name: "Optum India",
        hot: true,
        meta: "Hyderabad · Onsite · 5.5 – 7.0 LPA",
        tags: [{ text: "HCC", type: "gold" }, { text: "CPC", type: "green" }, { text: "12 roles", type: "blue" }],
        line: "Verified resume required · you qualify ✓",
      },
      {
        logo: "A",
        logoBg: "linear-gradient(135deg,#2E8B57,#1F7A3C)",
        name: "Access Healthcare",
        hot: false,
        meta: "Chennai · Hybrid · 6.0 – 8.5 LPA",
        tags: [{ text: "Featured", type: "gold" }, { text: "CPC + CRC", type: "green" }, { text: "6 roles", type: "blue" }],
        line: "Verified resume required · you qualify ✓",
      },
      {
        logo: "C",
        logoBg: "linear-gradient(135deg,#1A4FB8,#0F1B3D)",
        name: "Cognizant",
        hot: false,
        meta: "Hyderabad · Remote · 5.0 – 7.0 LPA",
        tags: [{ text: "Remote", type: "gold" }, { text: "8 roles", type: "blue" }],
        line: "88% verified-pool hires",
      },
      {
        logo: "Ω",
        logoBg: "linear-gradient(135deg,#8E44AD,#6D2C82)",
        name: "Omega Healthcare",
        hot: false,
        meta: "Bengaluru · Onsite · 4.8 – 6.5 LPA",
        tags: [{ text: "E/M", type: "gold" }, { text: "AR Calling", type: "gold" }, { text: "5 roles", type: "blue" }],
        line: "90% verified-pool hires",
      },
      {
        logo: "GD",
        logoBg: "linear-gradient(135deg,#E67E22,#C0392B)",
        name: "GEBBS Dental",
        hot: true,
        meta: "Mumbai · Onsite · 5.0 – 7.5 LPA",
        tags: [{ text: "Dental", type: "gold" }, { text: "CDC", type: "green" }, { text: "4 roles", type: "blue" }],
        line: "Verified resume required · you qualify ✓",
      },
    ],
    whyTitle: "Why Verified Resume Wins",
    stats: [
      { big: "3×", small: "shortlists via Live link" },
      { big: "Zero", small: "fake claims possible" },
      { big: "6 formats", small: "auto-picked templates" },
      { big: "Live QR", small: "one-click verification" },
    ],
  },
  8: {
    eyebrow: "CAREER PASSPORT",
    title: "🏆 Talentera Verified",
    status: (props) => props.isLiveActive ? "🟢 LIVE FOR HIRING" : "🚀 ONE CLICK FROM LIVE",
    desc: (props) => `You've built a profile with ${props.candidate?.score || 95}/100 trust points. Every claim verified. Every score real. Sourced directly from your authenticated credentials.`,
    companies: [
      {
        logo: "O",
        logoBg: "linear-gradient(135deg,#F5B41A,#C99413)",
        name: "Optum India",
        hot: true,
        meta: "Hyderabad · Onsite · 5.5 – 7.0 LPA",
        tags: [{ text: "HCC", type: "gold" }, { text: "CPC", type: "green" }, { text: "12 roles", type: "blue" }],
        line: "Verified talent pool · ready to interview ✓",
      },
      {
        logo: "A",
        logoBg: "linear-gradient(135deg,#2E8B57,#1F7A3C)",
        name: "Access Healthcare",
        hot: false,
        meta: "Chennai · Hybrid · 6.0 – 8.5 LPA",
        tags: [{ text: "Featured", type: "gold" }, { text: "CPC + CRC", type: "green" }, { text: "6 roles", type: "blue" }],
        line: "Verified talent pool · ready to interview ✓",
      },
      {
        logo: "C",
        logoBg: "linear-gradient(135deg,#1A4FB8,#0F1B3D)",
        name: "Cognizant",
        hot: false,
        meta: "Hyderabad · Remote · 5.0 – 7.0 LPA",
        tags: [{ text: "Remote", type: "gold" }, { text: "8 roles", type: "blue" }],
        line: "88% verified-pool hires",
      },
      {
        logo: "Ω",
        logoBg: "linear-gradient(135deg,#8E44AD,#6D2C82)",
        name: "Omega Healthcare",
        hot: false,
        meta: "Bengaluru · Onsite · 4.8 – 6.5 LPA",
        tags: [{ text: "E/M", type: "gold" }, { text: "AR Calling", type: "gold" }, { text: "5 roles", type: "blue" }],
        line: "90% verified-pool hires",
      },
      {
        logo: "GD",
        logoBg: "linear-gradient(135deg,#E67E22,#C0392B)",
        name: "GEBBS Dental",
        hot: true,
        meta: "Mumbai · Onsite · 5.0 – 7.5 LPA",
        tags: [{ text: "Dental", type: "gold" }, { text: "CDC", type: "green" }, { text: "4 roles", type: "blue" }],
        line: "Verified talent pool · ready to interview ✓",
      },
    ],
    whyTitle: "Your Verification Stack",
    stats: [
      { big: "100%", small: "tamper-proof passport" },
      { big: "Live", small: "search visibility" },
      { big: "Direct", small: "company shortlisting" },
      { big: "0 fee", small: "for candidates" },
    ],
  },
};

export default function WizardCompanionRail({
  stageNum = 1,
  candidate = {},
  certCount = 1,
  score = null,
  isCompleted = false,
  isLiveActive = false,
}) {
  const toast = useToast();
  const cfg = STAGE_CONFIGS[stageNum] || STAGE_CONFIGS[1];

  const title = typeof cfg.title === "function"
    ? cfg.title({ candidate, certCount, score, isCompleted, isLiveActive })
    : cfg.title;

  const status = typeof cfg.status === "function"
    ? cfg.status({ candidate, certCount, score, isCompleted, isLiveActive })
    : cfg.status;

  const desc = typeof cfg.desc === "function"
    ? cfg.desc({ candidate, certCount, score, isCompleted, isLiveActive })
    : cfg.desc;

  const handleSeeAllJobs = (e) => {
    e.preventDefault();
    toast("Browse all verified hiring partner roles in the Jobs tab.", "ℹ");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {/* ─── 1. CAREER PASSPORT CARD ─── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0F1B3D 0%, #1E3A8A 100%)",
          color: "#FFFFFF",
          padding: 20,
          borderRadius: 14,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 6px 20px rgba(15, 27, 61, 0.15)",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -30,
            bottom: -30,
            width: 120,
            height: 120,
            background: "radial-gradient(circle, rgba(245, 180, 26, 0.22), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ color: "var(--gold, #F5B41A)", fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
          {cfg.eyebrow}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4, color: "#FFFFFF", lineHeight: 1.3 }}>
          {title}
        </div>
        <div
          style={{
            background: "rgba(245, 180, 26, 0.16)",
            color: "var(--gold, #F5B41A)",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 11.5,
            fontWeight: 700,
            marginTop: 12,
            display: "inline-block",
            border: "1px solid rgba(245, 180, 26, 0.25)",
          }}
        >
          {status}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.8)", marginTop: 12, lineHeight: 1.55 }}>
          {desc}
        </div>
      </div>

      {/* ─── 2. HIRING RIGHT NOW CARD ─── */}
      <div
        style={{
          background: "#FFFFFF",
          padding: "18px 20px",
          borderRadius: 14,
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 14px rgba(15, 27, 61, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            letterSpacing: 1.5,
            color: "#D97706",
            textTransform: "uppercase",
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          <span>HIRING RIGHT NOW</span>
          <a
            href="/jobs"
            onClick={handleSeeAllJobs}
            style={{
              color: "#64748B",
              fontSize: 11,
              fontWeight: 700,
              textDecoration: "none",
              letterSpacing: 0.5,
              cursor: "pointer",
            }}
          >
            SEE ALL →
          </a>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {cfg.companies.map((comp, idx) => (
            <div
              key={comp.name + idx}
              style={{
                display: "grid",
                gridTemplateColumns: "38px 1fr",
                gap: 12,
                padding: "11px 0",
                borderBottom: idx === cfg.companies.length - 1 ? "none" : "1px dashed #E5E7EB",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#FFFFFF",
                  background: comp.logoBg,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                }}
              >
                {comp.logo}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--navy, #0F1B3D)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span>{comp.name}</span>
                  {comp.hot && (
                    <span
                      style={{
                        background: "#DC2626",
                        color: "#FFFFFF",
                        padding: "1px 6px",
                        borderRadius: 5,
                        fontSize: 8.5,
                        fontWeight: 800,
                        letterSpacing: 0.5,
                      }}
                    >
                      HOT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  {comp.meta}
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                  {comp.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      style={{
                        fontSize: 9.5,
                        padding: "2px 7px",
                        borderRadius: 5,
                        fontWeight: 700,
                        background:
                          tag.type === "green"
                            ? "#DCFCE7"
                            : tag.type === "blue"
                            ? "#EFF6FF"
                            : "#FEF3C7",
                        color:
                          tag.type === "green"
                            ? "#15803D"
                            : tag.type === "blue"
                            ? "#1D4ED8"
                            : "#B45309",
                      }}
                    >
                      {tag.text}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: "#16A34A", marginTop: 5, fontWeight: 700 }}>
                  {comp.line}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 3. WHY IT MATTERS CARD ─── */}
      <div
        style={{
          background: "#FFFFFF",
          padding: "18px 20px",
          borderRadius: 14,
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 14px rgba(15, 27, 61, 0.04)",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#0F1B3D", textTransform: "uppercase", fontWeight: 800, marginBottom: 12 }}>
          {cfg.whyTitle}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {cfg.stats.map((stat, sIdx) => (
            <div
              key={sIdx}
              style={{
                background: "#FFFBEB",
                border: "1px solid #FEF3C7",
                padding: "12px 8px",
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--navy, #0F1B3D)" }}>
                {stat.big}
              </div>
              <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 2 }}>
                {stat.small}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
