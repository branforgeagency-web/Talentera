import React, { useState, useMemo, useRef } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import WizardCompanionRail from "./WizardCompanionRail.jsx";
import { computeStage6Result, EVIDENCE_LABELS, STAGE6_MAX_POINTS } from "../../utils/stage6Score.js";

/**
 * Stage 06 · Live Chart
 *
 * Self-contained: every input on this page is entered here and saved under candidate.stage6.
 * Nothing is read from Stages 1-5. The score and result are computed from these inputs only
 * (see utils/stage6Score.js; the backend recomputes the same score on save).
 */

const PLATFORM_CATEGORIES = [
  { category: "practice", title: "PRACTICE / TRAINING PLATFORMS", icon: "🪴", platforms: ["Practicode", "Codivia", "SuperCoder", "FlashCode", "HCC Coder"] },
  { category: "encoders", title: "PRODUCTION ENCODERS", icon: "🏭", platforms: ["3M 360 Encompass", "Optum EncoderPro", "TruCode", "CodeItRight"] },
  {
    category: "ehr",
    title: "EHR / EMR (REAL CHART CODING)",
    icon: "🏥",
    platforms: ["EPIC", "Cerner / Oracle Health", "Meditech", "Allscripts", "eClinicalWorks", "NextGen", "Athenahealth", "Kareo", "DrChrono", "AdvancedMD"],
  },
  { category: "dental", title: "DENTAL PLATFORMS", icon: "🦷", platforms: ["Dentrix", "Eaglesoft", "Curve Dental", "Open Dental"] },
];

const PATHS = [
  { id: "A", title: "Platform-Reported", sub: "Practicode, Codivia, 3M etc. — figures from your platform dashboard", credit: "100% credit", badge: "🟡 Self-Reported (Platform)", badgeBg: "#FEF9C3", badgeFg: "#854D0E", chipBg: "#FDE68A", chipFg: "#78350F" },
  { id: "B", title: "Academy-Verified Log", sub: "Upload your chart log signed off by your academy", credit: "100% with proof · 60% without", badge: "🟢 Academy-Signed", badgeBg: "#DCFCE7", badgeFg: "#166534", chipBg: "#1E293B", chipFg: "#FFFFFF" },
  { id: "C", title: "Self-Declared", sub: "Manual entry, subject to random audit", credit: "70% credit", badge: "🟠 Self-Declared", badgeBg: "#FFEDD5", badgeFg: "#9A3412", chipBg: "#0284C7", chipFg: "#FFFFFF" },
  { id: "D", title: "No exposure yet", sub: "Honest declaration — but limits company visibility", credit: "0 pts", badge: "🔴 No Charts", badgeBg: "#FEE2E2", badgeFg: "#991B1B", chipBg: "#0F172A", chipFg: "#FFFFFF" },
];

const SPECIALTY_OPTIONS = [
  "HCC (Risk Adjustment)",
  "E/M (Evaluation & Management)",
  "ED (Emergency Department)",
  "Surgery",
  "Inpatient (IP-DRG)",
  "Outpatient / Ambulatory",
  "Radiology",
  "Pathology & Lab",
  "Cardiology",
  "Orthopedics",
  "Oncology",
  "Gastroenterology",
  "Neurology",
  "Pediatrics",
  "OB/GYN",
  "Anesthesia",
  "Dental",
  "Physical Therapy / Rehab",
  "Behavioral Health",
  "Dermatology",
  "Ophthalmology",
  "ICD-10-CM Diagnosis",
  "CPT / HCPCS Procedure",
];

const PERIOD_PRESETS = [30, 60, 90, 180, 365];

const TIER_TARGETS = [
  { tier: "Silver", charts: 51, acc: 75 },
  { tier: "Gold", charts: 201, acc: 85 },
  { tier: "Platinum", charts: 500, acc: 90 },
];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const toDateInput = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const blankRow = (id) => ({ id, name: "", icon: "📑", count: "", accuracy: "", timePerChart: "", lastCodedDate: "", active: true });

// ---- shared styles -------------------------------------------------------------------------
const INPUT = { width: "100%", boxSizing: "border-box", border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 600, color: "#0F172A", background: "#FFFFFF", fontFamily: "inherit" };
const INPUT_ERR = { ...INPUT, border: "1.5px solid #DC2626", background: "#FEF2F2" };
const LABEL = { display: "block", fontSize: 11, fontWeight: 800, color: "#475569", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 5 };
const HINT = { fontSize: 11, color: "#64748B", marginTop: 4, lineHeight: 1.4 };
const CARD = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 18, boxShadow: "0 4px 16px rgba(0,0,0,0.03)" };

function Field({ label, hint, error, children, required }) {
  return (
    <div>
      <label style={LABEL}>
        {label}
        {required && <span style={{ color: "#DC2626" }}> *</span>}
      </label>
      {children}
      {error ? <div style={{ ...HINT, color: "#DC2626", fontWeight: 700 }}>{error}</div> : hint ? <div style={HINT}>{hint}</div> : null}
    </div>
  );
}

function SectionHeader({ n, title, badge, badgeTone = "amber", right }) {
  const tones = {
    amber: { bg: "#FEF3C7", fg: "#B45309", bd: "transparent" },
    green: { bg: "#F0FDF4", fg: "#16A34A", bd: "#BBF7D0" },
    red: { bg: "#FEF2F2", fg: "#B91C1C", bd: "#FECACA" },
  };
  const t = tones[badgeTone] || tones.amber;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F59E0B", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900 }}>{n}</div>
        <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--navy, #0F172A)", margin: 0 }}>{title}</h3>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {right}
        {badge && <span style={{ fontSize: 11, fontWeight: 800, color: t.fg, background: t.bg, border: `1px solid ${t.bd}`, padding: "4px 10px", borderRadius: 6 }}>{badge}</span>}
      </div>
    </div>
  );
}

// Distance to the next tier, computed only from the candidate's Stage 6 numbers
function nextTierGoal(total, acc, tier) {
  const next = TIER_TARGETS.find((t) => t.tier === (tier === "Platinum" ? null : tier === "Gold" ? "Platinum" : tier === "Silver" ? "Gold" : "Silver"));
  if (!next) return { done: true, text: "You are at the top tier. Keep your recency fresh to hold it." };
  const needCharts = Math.max(0, next.charts - total);
  const needAcc = Math.max(0, next.acc - acc);
  const parts = [];
  if (needCharts > 0) parts.push(`${needCharts} more chart${needCharts === 1 ? "" : "s"}`);
  if (needAcc > 0) parts.push(`+${needAcc.toFixed(1)}% accuracy`);
  return { done: false, next: next.tier, text: `${parts.join(" and ")} to reach ${next.tier} (${next.charts}+ charts at ${next.acc}%+ accuracy).` };
}

export default function Stage6LiveCharts({ existingData, candidate, onSaved }) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  // Stage 6 data only - what the candidate previously saved on this stage.
  const s6 = existingData || candidate?.stage6 || {};

  const [evidencePath, setEvidencePath] = useState(() => (["A", "B", "C", "D"].includes(s6.evidencePath) ? s6.evidencePath : s6.option === "practicode" ? "A" : s6.option === "upload" ? "B" : s6.option === "none" ? "D" : "C"));
  const [selectedPlatforms, setSelectedPlatforms] = useState(() => (Array.isArray(s6.selectedPlatforms) ? s6.selectedPlatforms : s6.primaryPlatform ? [s6.primaryPlatform] : []));
  const [primaryPlatform, setPrimaryPlatform] = useState(s6.primaryPlatform || "");
  const [platformProfileId, setPlatformProfileId] = useState(s6.platformProfileId || "");
  const [academyName, setAcademyName] = useState(s6.academyName || "");
  const [signedOffBy, setSignedOffBy] = useState(s6.signedOffBy || "");
  const [signOffDate, setSignOffDate] = useState(toDateInput(s6.signOffDate));
  const [timePracticedHours, setTimePracticedHours] = useState(s6.timePracticedHours ? String(s6.timePracticedHours) : "");
  const [practicePeriodDays, setPracticePeriodDays] = useState(s6.practicePeriodDays ? String(s6.practicePeriodDays) : "");
  const [declarationAccepted, setDeclarationAccepted] = useState(!!s6.declarationAccepted);
  const [additionalNotes, setAdditionalNotes] = useState(s6.additionalNotes || "");

  // The old auto-seeded mock (4 fixed rows with zero counts) is not real candidate data.
  const [specialtyCharts, setSpecialtyCharts] = useState(() => {
    const saved = Array.isArray(s6.specialtyCharts) ? s6.specialtyCharts : [];
    const legacy = ["HCC (Risk Adjustment)", "E/M (Evaluation)", "ED (Emergency)", "Surgery"];
    const isLegacyMock = saved.length === 4 && saved.every((r) => legacy.includes(r.name) && !Number(r.count));
    if (saved.length === 0 || isLegacyMock) return [blankRow(1)];
    return saved.map((r, i) => ({
      id: r.id || i + 1,
      name: r.name || "",
      icon: r.icon || "📑",
      count: r.count ? String(r.count) : "",
      accuracy: r.accuracy ? String(r.accuracy) : "",
      timePerChart: parseFloat(r.timePerChart) ? String(parseFloat(r.timePerChart)) : "",
      lastCodedDate: toDateInput(r.lastCodedDate),
      active: true,
    }));
  });

  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState(s6.docName || s6.proofDocName || "");
  const [uploadedDocUrl, setUploadedDocUrl] = useState(s6.docUrl || s6.proofDocUrl || "");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(Boolean(s6.completedAt || s6.totalCharts));
  const [showErrors, setShowErrors] = useState(false);

  // ---- live score & result, from Stage 6 inputs only -------------------------------------
  const result = useMemo(
    () => computeStage6Result({ evidencePath, specialtyCharts, timePracticedHours, practicePeriodDays, hasProofDoc: !!uploadedDocUrl }),
    [evidencePath, specialtyCharts, timePracticedHours, practicePeriodDays, uploadedDocUrl]
  );
  const { totalCharts, overallAccuracy, tier } = result;
  const goal = useMemo(() => nextTierGoal(totalCharts, overallAccuracy, tier), [totalCharts, overallAccuracy, tier]);
  const pathMeta = PATHS.find((p) => p.id === evidencePath) || PATHS[2];

  // Only Live Chart proof documents - not the rest of the vault
  const vaultDocuments = useMemo(
    () => (Array.isArray(candidate?.documentVault) ? candidate.documentVault : []).filter((d) => d.id === "live_chart_proof_stage6" || d.docType === "Live Chart Proof"),
    [candidate?.documentVault]
  );

  // ---- validation -------------------------------------------------------------------------
  const errors = useMemo(() => {
    const e = { rows: {} };
    if (evidencePath === "D") return e;
    const counted = specialtyCharts.filter((r) => Number(r.count) > 0);
    if (counted.length === 0) e.charts = "Enter at least one specialty with a chart count.";
    specialtyCharts.forEach((r) => {
      const re = {};
      const hasAny = Number(r.count) > 0 || r.name.trim() || r.accuracy !== "" || r.timePerChart !== "";
      if (!hasAny) return;
      if (!r.name.trim()) re.name = "Name the specialty";
      if (!(Number(r.count) > 0)) re.count = "Charts > 0";
      const acc = Number(r.accuracy);
      if (r.accuracy === "" || acc <= 0 || acc > 100) re.accuracy = "1–100%";
      const t = Number(r.timePerChart);
      if (r.timePerChart === "" || t <= 0 || t > 240) re.time = "Minutes";
      if (!r.lastCodedDate) re.date = "Pick date";
      else if (r.lastCodedDate > todayISO()) re.date = "Not future";
      if (Object.keys(re).length) e.rows[r.id] = re;
    });
    if (Number(timePracticedHours) <= 0) e.hours = "Enter total hours practiced.";
    if (Number(practicePeriodDays) <= 0) e.period = "Enter the period these charts were coded in.";
    if (evidencePath === "A" && !platformProfileId.trim()) e.profile = "Enter your platform username / profile ID so it can be spot-checked.";
    if (evidencePath === "B") {
      if (!academyName.trim()) e.academy = "Enter your academy name.";
      if (!signedOffBy.trim()) e.signedBy = "Enter who signed off the log.";
      if (!signOffDate) e.signDate = "Enter the sign-off date.";
    }
    if (!declarationAccepted) e.declaration = "Please confirm the declaration.";
    return e;
  }, [evidencePath, specialtyCharts, timePracticedHours, practicePeriodDays, platformProfileId, academyName, signedOffBy, signOffDate, declarationAccepted]);

  const hasErrors = Boolean(errors.charts || errors.hours || errors.period || errors.profile || errors.academy || errors.signedBy || errors.signDate || errors.declaration || Object.keys(errors.rows).length);
  const showErr = (key) => (showErrors ? errors[key] : undefined);
  const rowErr = (id, key) => (showErrors ? errors.rows[id]?.[key] : undefined);

  // ---- handlers ---------------------------------------------------------------------------
  const handleTogglePlatform = (plat) => {
    setSelectedPlatforms((prev) => {
      const next = prev.includes(plat) ? prev.filter((p) => p !== plat) : [...prev, plat];
      setPrimaryPlatform((pp) => (next.includes(pp) ? pp : next[0] || ""));
      return next;
    });
  };
  const updateRow = (id, field, value) => setSpecialtyCharts((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const addRow = () => setSpecialtyCharts((prev) => [...prev, blankRow(prev.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1)]);
  const removeRow = (id) => setSpecialtyCharts((prev) => (prev.length === 1 ? [blankRow(1)] : prev.filter((r) => r.id !== id)));

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("doc", file);
      const res = await api.post(`/candidate/upload/doc/6`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setUploadedDocName(file.name);
      setUploadedDocUrl(res.data?.url || res.data?.docUrl || "");
      toast(`✓ ${file.name} uploaded & linked to Document Vault`, "✓");
    } catch (err) {
      toast(err.response?.data?.message || "File upload failed.", "!");
    } finally {
      setUploadingDoc(false);
    }
  };

  const buildPayload = () => ({
    evidencePath,
    option: evidencePath === "A" ? "practicode" : evidencePath === "B" ? "upload" : evidencePath === "C" ? "declare" : "none",
    selectedPlatforms: evidencePath === "D" ? [] : selectedPlatforms,
    primaryPlatform: evidencePath === "D" ? "" : primaryPlatform || selectedPlatforms[0] || "",
    platformProfileId: evidencePath === "A" ? platformProfileId.trim() : "",
    academyName: evidencePath === "B" ? academyName.trim() : "",
    signedOffBy: evidencePath === "B" ? signedOffBy.trim() : "",
    signOffDate: evidencePath === "B" ? signOffDate : "",
    specialtyCharts:
      evidencePath === "D"
        ? []
        : specialtyCharts
            .filter((r) => Number(r.count) > 0)
            .map((r) => ({ id: r.id, name: r.name.trim(), icon: r.icon, count: Number(r.count), accuracy: Number(r.accuracy), timePerChart: Number(r.timePerChart), lastCodedDate: r.lastCodedDate, active: true })),
    timePracticedHours: evidencePath === "D" ? 0 : Number(timePracticedHours) || 0,
    practicePeriodDays: evidencePath === "D" ? 0 : Number(practicePeriodDays) || 0,
    declarationAccepted: evidencePath === "D" ? false : declarationAccepted,
    additionalNotes: additionalNotes.trim(),
    // The backend recomputes totals / score / tier from the raw inputs above; these are for preview parity only.
    totalCharts,
    overallAccuracy,
    tier,
    stageScore: result.stageScore,
    docName: uploadedDocName || undefined,
    docUrl: uploadedDocUrl || undefined,
    proofDocName: uploadedDocName || undefined,
    proofDocUrl: uploadedDocUrl || undefined,
    completedAt: new Date(),
  });

  const saveStage6 = async ({ silent = false } = {}) => {
    setShowErrors(true);
    if (hasErrors) {
      toast("Please fix the highlighted Stage 06 fields.", "!");
      return false;
    }
    setSaving(true);
    try {
      const res = await api.put(`/candidate/stage/6`, buildPayload());
      setSavedSuccess(true);
      if (!silent) toast("✓ Stage 06 Live Chart saved.", "✓");
      // Stay on this stage so the candidate sees their result below; "Continue" advances.
      if (onSaved) onSaved(res.data, { advance: false });
      return true;
    } catch (err) {
      toast(err.response?.data?.message || "Failed to save Stage 06.", "!");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleContinueToStage7 = async () => {
    const ok = await saveStage6({ silent: true });
    if (!ok) return;
    if (onSaved) {
      onSaved(null, { advance: true, nextStage: 7 });
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set("stage", "7");
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const HOW_CARDS = [
    { icon: "?", title: "Why chart exposure matters most", text: "A fresher with 250 verified charts at 87% accuracy is dramatically different from one who only has classroom theory. Companies hiring for production roles rank candidates by chart exposure first, certification second. This is the moat." },
    { icon: "🔗", title: "How you prove it — 4 paths", text: "A Platform-reported figures · B Academy signs off your chart log · C Self-declare (partial credit) · D No exposure yet (honest but limits visibility). Each path has its own trust level and score multiplier." },
    { icon: "🧮", title: "How your score is made", text: "Volume 40 · Accuracy 30 · Breadth 10 · Speed 10 · Recency 10 — all from the numbers you enter on this page — then multiplied by your evidence trust level. Up to 10 points go to your Career Passport." },
    { icon: "🛡️", title: "Anti-fraud stack", text: "Academy cross-check within 7 days · timeline plausibility checks (500 charts in 30 days = auto-review) · 5% random audit · HR challenge system. Verified frauds get a 'Volume Disputed' badge permanently." },
  ];

  const scoreColor = result.stageScore >= 75 ? "#16A34A" : result.stageScore >= 45 ? "#D97706" : "#64748B";
  const BREAKDOWN = [
    { key: "volume", label: "Volume", hint: `${totalCharts} charts (500 = full)` },
    { key: "accuracy", label: "Accuracy", hint: `${overallAccuracy}% weighted (95% = full)` },
    { key: "breadth", label: "Breadth", hint: `${result.activeSpecialties} specialt${result.activeSpecialties === 1 ? "y" : "ies"} (4 = full)` },
    { key: "speed", label: "Speed", hint: result.avgTimePerChart ? `${result.avgTimePerChart} min/chart (≤8 = full)` : "enter minutes per chart" },
    { key: "recency", label: "Recency", hint: result.daysSinceLast === null ? "enter last coded dates" : `last coded ${result.daysSinceLast}d ago (≤30d = full)` },
  ];

  const formVisible = evidencePath !== "D";

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 60, fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
        <span>HOME</span><span>›</span><span>MY CAREER PASSPORT</span><span>›</span>
        <span style={{ color: "var(--gold, #F59E0B)" }}>STAGE 06 · LIVE CHART</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 24, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          {/* HERO */}
          <div style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 50%, #2563EB 100%)", borderRadius: 20, padding: "28px 32px", color: "#FFFFFF", boxShadow: "0 14px 34px rgba(30, 58, 138, 0.25)", marginBottom: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)", pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", color: "#0F172A", fontSize: 20 }}>💻</div>
              <span style={{ background: "#FEF3C7", color: "#92400E", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: "0.04em" }}>STAGE 06 OF 08 · ACTIVE</span>
              <span style={{ background: "#FDE68A", color: "#B45309", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>UP TO +{STAGE6_MAX_POINTS} POINTS</span>
              <span style={{ background: "rgba(255,255,255,0.18)", color: "#FFFFFF", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>~10 MIN</span>
              <span style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)", color: "#FFFFFF", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>★ CO-FLAGSHIP</span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px 0", color: "#FFFFFF" }}>Live Chart</h1>
            <div style={{ fontSize: 15, fontStyle: "italic", fontWeight: 500, color: "#E0E7FF", marginBottom: 12 }}>Real charts. Real accuracy. Real proof.</div>
            <p style={{ fontSize: 13, color: "#DBEAFE", lineHeight: 1.6, maxWidth: 880, margin: 0 }}>
              Tell us the charts you have actually coded — per specialty, with accuracy, time per chart and when you last coded. Your Live Chart score and tier are calculated only from what you enter on this page.
            </p>
          </div>

          {/* HOW IT WORKS */}
          <div style={{ ...CARD, padding: "20px 28px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--navy, #0F172A)", margin: 0 }}>How Stage 06 Works</h3>
              <button type="button" onClick={() => setShowHowItWorks((p) => !p)} style={{ background: "transparent", border: "none", color: "#64748B", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {showHowItWorks ? "Hide Details ▲" : "Show Details ▼"}
              </button>
            </div>
            {showHowItWorks && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 16 }}>
                {HOW_CARDS.map((c) => (
                  <div key={c.title} style={{ background: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 14, padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#EAB308", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>{c.icon}</div>
                      <strong style={{ fontSize: 13.5, color: "#713F12", fontWeight: 800 }}>{c.title}</strong>
                    </div>
                    <p style={{ fontSize: 12, color: "#854D0E", lineHeight: 1.55, margin: 0 }}>{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================== INPUT FORM ================== */}
          <div style={{ ...CARD, borderRadius: 20, padding: "32px 36px", boxShadow: "0 6px 24px rgba(0,0,0,0.04)", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FEFCE8", border: "1px solid #FEF08A", borderRadius: 10, padding: "10px 16px", marginBottom: 24, gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#854D0E" }}>All fields on this form are Stage 06 inputs · fields marked * are required</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: savedSuccess ? "#16A34A" : "#B45309" }}>{savedSuccess ? "✓ Saved — edits need re-saving" : "Not saved yet"}</div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy, #0F172A)", margin: "0 0 6px 0" }}>Your Stage 06 information</h2>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gold, #F59E0B)", letterSpacing: "0.08em", textTransform: "uppercase" }}>PROVE IT · WE SCORE IT · YOU EARN UP TO +{STAGE6_MAX_POINTS} POINTS</div>
            </div>

            {/* 1. EVIDENCE PATH */}
            <div style={{ marginBottom: 36 }}>
              <SectionHeader n={1} title="Choose your evidence path" badge={`${Math.round(result.multiplier * 100)}% trust credit`} badgeTone={evidencePath === "D" ? "red" : "green"} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
                {PATHS.map((p) => {
                  const sel = evidencePath === p.id;
                  const danger = p.id === "D";
                  return (
                    <div key={p.id} role="button" tabIndex={0} onClick={() => setEvidencePath(p.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setEvidencePath(p.id)}
                      style={{ border: sel ? `2px solid ${danger ? "#DC2626" : "#F59E0B"}` : "1px solid #E2E8F0", background: sel ? (danger ? "#FEF2F2" : "#FFFBEB") : "#FFFFFF", borderRadius: 14, padding: "16px 18px", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 140 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 6, background: p.chipBg, color: p.chipFg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>{p.id}</div>
                          <span style={{ background: danger ? "#FEE2E2" : "#FEF3C7", color: danger ? "#991B1B" : "#B45309", padding: "3px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800 }}>{p.credit}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>{p.title}</div>
                        <div style={{ fontSize: 11.5, color: "#64748B", lineHeight: 1.4 }}>{p.sub}</div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <span style={{ background: p.badgeBg, color: p.badgeFg, padding: "3px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800 }}>{p.badge}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {evidencePath === "D" && (
                <div style={{ marginTop: 14, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", fontSize: 12.5, color: "#991B1B", lineHeight: 1.5 }}>
                  You have chosen “No exposure yet”. Stage 06 scores 0 and companies will see “No Charts”. You can come back and update this any time after you start coding live charts.
                </div>
              )}
            </div>

            {formVisible && (
              <>
                {/* 2. PLATFORMS */}
                <div style={{ marginBottom: 36 }}>
                  <SectionHeader n={2} title="Platforms & systems you coded on (optional)" badge={selectedPlatforms.length > 0 ? `${selectedPlatforms.length} selected` : "OPTIONAL"} />
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
                    {PLATFORM_CATEGORIES.map((g) => (
                      <div key={g.category}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", letterSpacing: "0.06em", marginBottom: 10 }}>{g.icon} {g.title}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {g.platforms.map((plat) => {
                            const on = selectedPlatforms.includes(plat);
                            return (
                              <button type="button" key={plat} onClick={() => handleTogglePlatform(plat)}
                                style={{ background: on ? "#0F172A" : "#FFFFFF", color: on ? "#FFFFFF" : "#334155", border: on ? "1px solid #0F172A" : "1px solid #CBD5E1", borderRadius: 999, padding: "7px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                                {plat}
                                {on && primaryPlatform === plat && <span style={{ background: "#F59E0B", color: "#0F172A", fontSize: 9.5, fontWeight: 900, padding: "2px 6px", borderRadius: 4 }}>PRIMARY</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedPlatforms.length > 1 && (
                    <div style={{ marginTop: 14, maxWidth: 320 }}>
                      <Field label="Primary platform" hint="The one you coded the most charts on.">
                        <select value={primaryPlatform} onChange={(e) => setPrimaryPlatform(e.target.value)} style={INPUT}>
                          {selectedPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </Field>
                    </div>
                  )}
                </div>

                {/* 3. CHART COUNTS */}
                <div style={{ marginBottom: 36 }}>
                  <SectionHeader n={3} title="Chart counts by specialty · The key section" badge="DRIVES YOUR SCORE" right={
                    <button type="button" onClick={addRow} style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 6, padding: "4px 10px", fontSize: 11.5, fontWeight: 700, color: "var(--navy)", cursor: "pointer" }}>+ Add Specialty</button>
                  } />
                  {showErr("charts") && <div style={{ ...HINT, color: "#DC2626", fontWeight: 700, marginBottom: 8 }}>{errors.charts}</div>}
                  <div style={{ borderRadius: 14, border: "1px solid #CBD5E1", overflowX: "auto" }}>
                    <div style={{ minWidth: 780 }}>
                      <div style={{ background: "#0A1F3D", color: "#FFFFFF", display: "grid", gridTemplateColumns: "1.9fr 0.9fr 0.9fr 0.9fr 1.2fr 34px", gap: 10, padding: "12px 16px", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        <span>Specialty *</span><span>Charts coded *</span><span>Accuracy % *</span><span>Min / chart *</span><span>Last coded *</span><span />
                      </div>
                      {specialtyCharts.map((r) => {
                        const msgs = showErrors ? Object.values(errors.rows[r.id] || {}) : [];
                        return (
                          <div key={r.id} style={{ borderBottom: "1px solid #F1F5F9", padding: "12px 16px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1.9fr 0.9fr 0.9fr 0.9fr 1.2fr 34px", gap: 10, alignItems: "start" }}>
                              <select value={r.name} onChange={(e) => updateRow(r.id, "name", e.target.value)} style={rowErr(r.id, "name") ? INPUT_ERR : INPUT}>
                                <option value="">Select specialty…</option>
                                {/* a previously saved name that is not in the standard list stays selectable */}
                                {r.name && !SPECIALTY_OPTIONS.includes(r.name) && <option value={r.name}>{r.name}</option>}
                                {SPECIALTY_OPTIONS.map((o) => (
                                  <option key={o} value={o} disabled={o !== r.name && specialtyCharts.some((x) => x.id !== r.id && x.name === o)}>{o}</option>
                                ))}
                              </select>
                              <input type="number" min="0" step="1" value={r.count} onChange={(e) => updateRow(r.id, "count", e.target.value === "" ? "" : String(Math.max(0, Math.floor(Number(e.target.value)))))} placeholder="0" style={rowErr(r.id, "count") ? INPUT_ERR : INPUT} />
                              <input type="number" min="0" max="100" step="0.1" value={r.accuracy} onChange={(e) => updateRow(r.id, "accuracy", e.target.value === "" ? "" : String(Math.min(100, Math.max(0, Number(e.target.value)))))} placeholder="e.g. 88" style={rowErr(r.id, "accuracy") ? INPUT_ERR : INPUT} />
                              <input type="number" min="0" step="0.5" value={r.timePerChart} onChange={(e) => updateRow(r.id, "timePerChart", e.target.value)} placeholder="e.g. 8" style={rowErr(r.id, "time") ? INPUT_ERR : INPUT} />
                              <input type="date" max={todayISO()} value={r.lastCodedDate} onChange={(e) => updateRow(r.id, "lastCodedDate", e.target.value)} style={rowErr(r.id, "date") ? INPUT_ERR : INPUT} />
                              <button type="button" aria-label="Remove specialty" onClick={() => removeRow(r.id)} style={{ background: "transparent", border: "none", color: "#94A3B8", fontSize: 16, cursor: "pointer" }}>✕</button>
                            </div>
                            {msgs.length > 0 && <div style={{ ...HINT, color: "#DC2626", fontWeight: 700 }}>{msgs.join(" · ")}</div>}
                          </div>
                        );
                      })}
                      <div style={{ display: "grid", gridTemplateColumns: "1.9fr 0.9fr 0.9fr 0.9fr 1.2fr 34px", gap: 10, padding: "14px 16px", background: "#F8FAFC", borderTop: "2px solid #E2E8F0", fontSize: 13, fontWeight: 900, color: "#0F172A", alignItems: "center" }}>
                        <span>📊 TOTAL</span><span>{totalCharts}</span><span>{overallAccuracy}%</span><span>{result.avgTimePerChart || 0} avg</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{result.lastCodedDate ? new Date(result.lastCodedDate).toLocaleDateString() : "—"}</span><span />
                      </div>
                    </div>
                  </div>
                  <div style={HINT}>Accuracy is the average % from your platform / QA feedback for that specialty. Rows with no charts are ignored.</div>
                </div>

                {/* 4. PRACTICE METRICS */}
                <div style={{ marginBottom: 36 }}>
                  <SectionHeader n={4} title="Practice time & pace" badge="CALCULATED FROM YOUR INPUTS" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
                    <Field label="Total time practiced (hours)" required error={showErr("hours")} hint="Across all the charts you entered above.">
                      <input type="number" min="0" step="0.5" value={timePracticedHours} onChange={(e) => setTimePracticedHours(e.target.value)} placeholder="e.g. 60" style={showErr("hours") ? INPUT_ERR : INPUT} />
                    </Field>
                    <Field label="Coded over the last (days)" required error={showErr("period")} hint="The period in which you coded these charts.">
                      <input type="number" min="1" step="1" value={practicePeriodDays} onChange={(e) => setPracticePeriodDays(e.target.value)} placeholder="e.g. 90" style={showErr("period") ? INPUT_ERR : INPUT} />
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {PERIOD_PRESETS.map((d) => (
                          <button type="button" key={d} onClick={() => setPracticePeriodDays(String(d))} style={{ background: String(d) === practicePeriodDays ? "#0F172A" : "#F1F5F9", color: String(d) === practicePeriodDays ? "#FFFFFF" : "#334155", border: "none", borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{d}d</button>
                        ))}
                      </div>
                    </Field>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
                    {[
                      { v: totalCharts, l: "Total charts" },
                      { v: `${overallAccuracy}%`, l: "Overall accuracy" },
                      { v: `${result.chartsPerHour} / hr`, l: "Charts per hour" },
                      { v: `${result.chartsPerDay} / day`, l: "Charts per day" },
                    ].map((m) => (
                      <div key={m.l} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 18px", textAlign: "center" }}>
                        <div style={{ fontSize: 26, fontWeight: 900, color: "#0F172A" }}>{m.v}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                  {result.needsReview && (
                    <div style={{ marginTop: 14, background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: "12px 16px", fontSize: 12.5, color: "#92400E", lineHeight: 1.5 }}>
                      ⚠ {totalCharts} charts in {practicePeriodDays} days is above our plausibility limit (500 in 30 days). You can still save — this submission will be queued for manual review.
                    </div>
                  )}
                </div>

                {/* 5. EVIDENCE DETAILS & DECLARATION */}
                <div style={{ marginBottom: 32 }}>
                  <SectionHeader n={5} title={evidencePath === "B" ? "Academy log & sign-off" : evidencePath === "A" ? "Platform account details" : "Declaration"} badge={evidencePath === "B" ? (uploadedDocUrl ? "PROOF UPLOADED" : "UPLOAD PROOF FOR 100%") : undefined} badgeTone={uploadedDocUrl ? "green" : "amber"} />

                  {evidencePath === "A" && (
                    <div style={{ background: "#EFF6FF", border: "1.5px solid #93C5FD", borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                        <p style={{ fontSize: 12, color: "#1E40AF", margin: 0, lineHeight: 1.5, flex: 1, minWidth: 220 }}>Live platform sync isn&apos;t available yet. Enter the figures from your platform dashboard above and your account ID here so your academy or Talentera staff can spot-check them.</p>
                        <button type="button" onClick={() => setShowOAuthModal(true)} style={{ background: "#0F172A", color: "#FFFFFF", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>ℹ️ How this works →</button>
                      </div>
                      <Field label={`${primaryPlatform || selectedPlatforms[0] || "Platform"} username / profile ID`} required error={showErr("profile")}>
                        <input type="text" value={platformProfileId} maxLength={80} onChange={(e) => setPlatformProfileId(e.target.value)} placeholder="Your login ID or public profile link" style={showErr("profile") ? INPUT_ERR : INPUT} />
                      </Field>
                    </div>
                  )}

                  {evidencePath === "B" && (
                    <div style={{ background: "#FEFCE8", border: "1.5px solid #FDE047", borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 16 }}>
                        <Field label="Academy name" required error={showErr("academy")}>
                          <input type="text" value={academyName} maxLength={100} onChange={(e) => setAcademyName(e.target.value)} placeholder="Academy that signed the log" style={showErr("academy") ? INPUT_ERR : INPUT} />
                        </Field>
                        <Field label="Signed off by" required error={showErr("signedBy")} hint="Trainer / coordinator name">
                          <input type="text" value={signedOffBy} maxLength={100} onChange={(e) => setSignedOffBy(e.target.value)} placeholder="Full name" style={showErr("signedBy") ? INPUT_ERR : INPUT} />
                        </Field>
                        <Field label="Sign-off date" required error={showErr("signDate")}>
                          <input type="date" max={todayISO()} value={signOffDate} onChange={(e) => setSignOffDate(e.target.value)} style={showErr("signDate") ? INPUT_ERR : INPUT} />
                        </Field>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#713F12" }}>Academy live-chart log (PDF / Excel)</div>
                          <div style={{ fontSize: 12, color: "#854D0E" }}>{uploadedDocName ? `Uploaded: ${uploadedDocName}` : "Without the signed log, Path B scores at 60%."}</div>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFileUpload} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc} style={{ background: "#713F12", color: "#FFFFFF", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                          {uploadingDoc ? "Uploading…" : uploadedDocName ? "Change File" : "Choose File →"}
                        </button>
                      </div>
                    </div>
                  )}

                  <Field label="Anything else we should know? (optional)" hint="e.g. the EHR modules you coded in, supervisor feedback, audit outcomes.">
                    <textarea value={additionalNotes} maxLength={500} onChange={(e) => setAdditionalNotes(e.target.value)} rows={3} style={{ ...INPUT, resize: "vertical", fontWeight: 500 }} />
                  </Field>

                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 16, padding: "12px 14px", borderRadius: 12, border: showErr("declaration") ? "1.5px solid #DC2626" : "1px solid #E2E8F0", background: showErr("declaration") ? "#FEF2F2" : "#F8FAFC", cursor: "pointer" }}>
                    <input type="checkbox" checked={declarationAccepted} onChange={(e) => setDeclarationAccepted(e.target.checked)} style={{ marginTop: 3 }} />
                    <span style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.5 }}>
                      <strong>I confirm</strong> the chart counts, accuracy, time and dates above are true and from charts I coded myself. I understand they may be audited and that false claims permanently add a “Volume Disputed” badge to my profile. <span style={{ color: "#DC2626" }}>*</span>
                      {showErr("declaration") && <span style={{ display: "block", color: "#DC2626", fontWeight: 700, marginTop: 4 }}>{errors.declaration}</span>}
                    </span>
                  </label>
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, paddingTop: 16, borderTop: "1px solid #F1F5F9", flexWrap: "wrap" }}>
              {showErrors && hasErrors && <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626" }}>Some required fields need attention.</span>}
              <button type="button" className="btn btn-gold" onClick={() => saveStage6()} disabled={saving} style={{ padding: "12px 26px", fontSize: 14, fontWeight: 800 }}>
                {saving ? "Saving…" : savedSuccess ? "✓ Save changes & recalculate" : "Save & calculate my score →"}
              </button>
            </div>
          </div>

          {/* ================== RESULT ================== */}
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ display: "inline-block", background: savedSuccess ? "#16A34A" : "#F59E0B", color: savedSuccess ? "#FFFFFF" : "#0F172A", padding: "6px 18px", borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                {savedSuccess ? "✓ SAVED RESULT" : "↓ LIVE PREVIEW · UPDATES AS YOU TYPE"}
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: "var(--navy, #0F172A)", margin: "0 0 6px 0" }}>Your Live Chart Result</h2>
              <div style={{ fontSize: 13.5, fontStyle: "italic", color: "#64748B" }}>Calculated only from the Stage 06 inputs above</div>
            </div>

            <div style={{ ...CARD, borderRadius: 20, padding: "32px 36px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
              {/* Score + breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 240px) minmax(0,1fr)", gap: 28, marginBottom: 26 }}>
                <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>Live Chart Score</div>
                  <div style={{ fontSize: 54, fontWeight: 900, color: scoreColor, lineHeight: 1.1, margin: "6px 0 2px" }}>{result.stageScore}<span style={{ fontSize: 20, color: "#94A3B8" }}> /100</span></div>
                  <div style={{ display: "inline-block", background: "#FEF3C7", color: "#92400E", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, margin: "6px 0" }}>+{result.points} / {result.maxPoints} Passport points</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>
                    {tier === "None" ? "No tier yet" : `${tier} tier`} · {pathMeta.title}
                  </div>
                </div>
                <div>
                  {BREAKDOWN.map((b) => {
                    const it = result.breakdown[b.key];
                    return (
                      <div key={b.key} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 800, color: "#0F172A" }}>
                          <span>{b.label} <span style={{ fontWeight: 600, color: "#64748B" }}>· {b.hint}</span></span>
                          <span>{it.score} / {it.max}</span>
                        </div>
                        <div style={{ height: 8, background: "#E2E8F0", borderRadius: 999, marginTop: 5, overflow: "hidden" }}>
                          <div style={{ width: `${(it.score / it.max) * 100}%`, height: "100%", background: "#F59E0B", borderRadius: 999, transition: "width 0.25s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 12, color: "#475569", borderTop: "1px dashed #CBD5E1", paddingTop: 10, marginTop: 4, lineHeight: 1.5 }}>
                    Raw {result.rawScore} × evidence trust {Math.round(result.multiplier * 100)}% ({EVIDENCE_LABELS[evidencePath]}
                    {evidencePath === "B" && !uploadedDocUrl ? " — no signed log uploaded yet" : ""}) = <strong>{result.stageScore}</strong>
                  </div>
                </div>
              </div>

              {/* Tier cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 20 }}>
                {[
                  { t: "Bronze", i: "🥉", d: "Any charts coded" },
                  { t: "Silver", i: "🥈", d: "51+ charts & ≥75% acc" },
                  { t: "Gold", i: "🥇", d: "201+ charts & ≥85% acc" },
                  { t: "Platinum", i: "🏆", d: "500+ charts & ≥90% acc" },
                ].map((c) => (
                  <div key={c.t} style={{ border: tier === c.t ? "2px solid #F59E0B" : "1px solid #E2E8F0", background: tier === c.t ? "#FFFBEB" : "#FFFFFF", borderRadius: 16, padding: "18px 14px", textAlign: "center", position: "relative" }}>
                    {tier === c.t && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "#F59E0B", color: "#0F172A", fontSize: 9.5, fontWeight: 900, padding: "2px 10px", borderRadius: 999 }}>YOU ARE HERE</div>}
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{c.i}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>{c.t}</div>
                    <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>{c.d}</div>
                  </div>
                ))}
              </div>

              {evidencePath !== "D" && totalCharts > 0 && (
                <div style={{ background: "#FEFCE8", border: "1px solid #FEF08A", borderRadius: 14, padding: "14px 20px", display: "flex", gap: 12, marginBottom: 24 }}>
                  <span style={{ fontSize: 18 }}>🎯</span>
                  <div style={{ fontSize: 12.5, color: "#854D0E", lineHeight: 1.5 }}>{goal.done ? goal.text : <><strong>Next tier: {goal.next}.</strong> {goal.text}</>}</div>
                </div>
              )}

              {/* What companies see */}
              <div style={{ background: "#081325", borderRadius: 18, padding: "24px 28px", color: "#FFFFFF", marginBottom: 28 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>PREVIEW · WHAT COMPANIES SEE</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: "#FFFFFF", margin: "0 0 14px 0" }}>Live Chart Record</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                  <span style={{ background: "rgba(255,255,255,0.12)", color: "#E2E8F0", padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>💰 {tier} · {totalCharts} charts · {overallAccuracy}% acc</span>
                  <span style={{ background: evidencePath === "B" && uploadedDocUrl ? "#065F46" : "#78350F", color: evidencePath === "B" && uploadedDocUrl ? "#6EE7B7" : "#FDE68A", padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 800 }}>
                    {evidencePath === "A" ? "🟡 Self-Reported (Platform)" : evidencePath === "B" ? (uploadedDocUrl ? "🟢 Academy-Signed" : "🟡 Pending Upload") : evidencePath === "C" ? "🟡 Self-Declared" : "⚪ No Charts"}
                  </span>
                  {selectedPlatforms.length > 0 && evidencePath !== "D" && <span style={{ background: "#854D0E", color: "#FEF08A", padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 800 }}>{selectedPlatforms.slice(0, 3).join(" + ")}</span>}
                  {result.needsReview && <span style={{ background: "#7C2D12", color: "#FED7AA", padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 800 }}>Under review</span>}
                </div>
                {evidencePath !== "D" && totalCharts > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px 32px", marginBottom: 18 }}>
                    {specialtyCharts.filter((r) => Number(r.count) > 0 && r.name.trim()).slice(0, 6).map((r) => (
                      <div key={r.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 8 }}>
                        <span style={{ color: "#94A3B8", fontSize: 13 }}>{r.icon} {r.name}</span>
                        <span style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 13 }}>{r.count} · {r.accuracy || 0}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 18 }}>{evidencePath === "D" ? "No chart exposure declared." : "Enter your chart counts to see your record."}</div>
                )}
                <div style={{ fontSize: 12, color: "#64748B" }}>Total {totalCharts} charts · {overallAccuracy}% avg · {result.avgTimePerChart || 0} min/chart{result.lastCodedDate ? ` · last coded ${new Date(result.lastCodedDate).toLocaleDateString()}` : ""}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setShowHistoryModal(true)} style={{ background: "transparent", border: "1px solid #CBD5E1", borderRadius: 10, padding: "12px 22px", fontSize: 13.5, fontWeight: 800, color: "#334155", cursor: "pointer" }}>View my chart history</button>
                  {evidencePath === "B" && <button type="button" onClick={() => setShowVaultModal(true)} style={{ background: "transparent", border: "1px solid #CBD5E1", borderRadius: 10, padding: "12px 22px", fontSize: 13.5, fontWeight: 800, color: "#334155", cursor: "pointer" }}>Proof documents ({vaultDocuments.length})</button>}
                </div>
                <button type="button" className="btn btn-gold" onClick={handleContinueToStage7} disabled={saving} style={{ padding: "12px 26px", fontSize: 14, fontWeight: 800 }}>
                  {saving ? "Saving…" : "Save & continue to Stage 07 · Resume →"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: "sticky", top: 20, alignSelf: "start", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
          <WizardCompanionRail stageNum={6} score={result.stageScore} />
        </div>
      </div>

      {/* MODALS */}
      {(showOAuthModal || showHistoryModal || showVaultModal) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)", padding: 20 }}
          onClick={() => { setShowOAuthModal(false); setShowHistoryModal(false); setShowVaultModal(false); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 20, maxWidth: 560, width: "100%", padding: "28px 32px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0F172A", margin: 0 }}>
                {showOAuthModal ? "How Platform Reporting Works" : showHistoryModal ? "Your chart history" : `Live Chart proof documents (${vaultDocuments.length})`}
              </h3>
              <button type="button" aria-label="Close" onClick={() => { setShowOAuthModal(false); setShowHistoryModal(false); setShowVaultModal(false); }} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#64748B" }}>✕</button>
            </div>

            {showOAuthModal && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["1. Open your platform's own dashboard", "Log in to Practicode / Codivia / your EHR and note your charts, accuracy % and time per chart."],
                  ["2. Enter it in the specialty table", "Fill in count, accuracy, minutes per chart and last coded date per specialty. This is saved as self-reported data."],
                  ["3. Your academy can spot-check it", "Your numbers show as “Self-Reported” until an academy or Talentera staff member confirms them against your platform login."],
                ].map(([t, d]) => (
                  <div key={t} style={{ border: "1px solid #CBD5E1", borderRadius: 12, padding: "12px 16px" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A", marginBottom: 3 }}>{t}</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>{d}</div>
                  </div>
                ))}
              </div>
            )}

            {showHistoryModal && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {specialtyCharts.filter((r) => Number(r.count) > 0).length === 0 && <div style={{ fontSize: 13, color: "#64748B" }}>No charts entered yet.</div>}
                {specialtyCharts.filter((r) => Number(r.count) > 0).map((r) => (
                  <div key={r.id} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{r.icon} {r.name || "Unnamed specialty"}</div>
                      <div style={{ fontSize: 11.5, color: "#64748B" }}>{r.timePerChart || "—"} min/chart · last coded {r.lastCodedDate ? new Date(r.lastCodedDate).toLocaleDateString() : "—"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{r.count} charts</div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#166534" }}>{r.accuracy || 0}% acc</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showVaultModal && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {vaultDocuments.length === 0 && <div style={{ textAlign: "center", color: "#64748B", fontSize: 12.5, padding: "20px 10px" }}>No Live Chart proof uploaded yet.</div>}
                {vaultDocuments.map((doc, i) => (
                  <div key={doc.id || i} style={{ background: doc.verified ? "#F0FDF4" : "#FFFBEB", border: doc.verified ? "1px solid #86EFAC" : "1px solid #FDE68A", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 900, color: "#14532D" }}>📄 {doc.title || doc.docName || `Document #${i + 1}`}</div>
                      <div style={{ fontSize: 11.5, color: "#166534" }}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ""}</div>
                    </div>
                    <span style={{ background: doc.verified ? "#DCFCE7" : "#FEF3C7", color: doc.verified ? "#166534" : "#92400E", padding: "2px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800, alignSelf: "flex-start" }}>{doc.verified ? "Verified ✓" : "Pending"}</span>
                  </div>
                ))}
              </div>
            )}

            <button type="button" className="btn btn-navy" style={{ width: "100%", justifyContent: "center", padding: "12px 16px", fontWeight: 800, marginTop: 18 }}
              onClick={() => { setShowOAuthModal(false); setShowHistoryModal(false); setShowVaultModal(false); }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
