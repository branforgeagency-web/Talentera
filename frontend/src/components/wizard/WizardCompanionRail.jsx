import React from "react";

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
  },
  4: {
    eyebrow: "CAREER PASSPORT",
    title: (props) => `Passport Score · ${props.score || props.candidate?.score || 50}/100`,
    status: "🧪 Stage 04 · Assessment active",
    desc: "This is a flagship points jump (+20 pts). A Silver or Gold Assessment score puts you in the top 20% of candidates on every company search.",
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
  },
  7: {
    eyebrow: "CAREER PASSPORT",
    title: (props) => `🏆 ${props.candidate?.score || 85} / 100`,
    status: "📄 Stage 07 · Resume Builder active",
    desc: "You've completed the proof stages. Stage 07 (Resume) is auto-built from your authenticated credentials. Activating your Career Passport is one click away.",
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

    </div>
  );
}
