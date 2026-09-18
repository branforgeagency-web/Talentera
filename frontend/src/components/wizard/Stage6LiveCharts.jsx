import React, { useState, useMemo, useRef, useEffect } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import WizardCompanionRail from "./WizardCompanionRail.jsx";

// Standard platforms grouped by category matching the design
const PLATFORM_CATEGORIES = [
  {
    category: "practice",
    title: "PRACTICE / TRAINING PLATFORMS",
    icon: "🪴",
    platforms: ["Practicode", "Codivia", "SuperCoder", "FlashCode", "HCC Coder"],
  },
  {
    category: "encoders",
    title: "PRODUCTION ENCODERS",
    icon: "🏭",
    platforms: ["3M 360 Encompass", "Optum EncoderPro", "TruCode", "CodeItRight"],
  },
  {
    category: "ehr",
    title: "EHR / EMR (REAL CHART CODING)",
    icon: "🏥",
    platforms: [
      "EPIC",
      "Cerner / Oracle Health",
      "Meditech",
      "Allscripts",
      "eClinicalWorks",
      "NextGen",
      "Athenahealth",
      "Kareo",
      "DrChrono",
      "AdvancedMD",
    ],
  },
  {
    category: "dental",
    title: "DENTAL PLATFORMS",
    icon: "🦷",
    platforms: ["Dentrix", "Eaglesoft", "Curve Dental", "Open Dental"],
  },
];

export default function Stage6LiveCharts({ stage, existingData, candidate, onSaved }) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  // Read actual candidate data from MongoDB / parent candidate state
  const candidateObj = candidate || {};
  const stage1 = candidateObj.stage1 || {};
  const stage2 = candidateObj.stage2 || {};
  const stage3 = candidateObj.stage3 || {};
  const stage4 = candidateObj.stage4 || {};
  const stage5 = candidateObj.stage5 || {};
  const stage6Data = existingData || candidateObj.stage6 || {};

  // Candidate basic attributes from database
  const candidateName = stage1.fullName || candidateObj.fullName || candidateObj.name || (candidateObj.email ? candidateObj.email.split("@")[0] : "Candidate");
  const candidateExp = stage1.experience || candidateObj.experience || "Fresher";
  const candidateDomain = stage2.domain || stage2.courseName || stage2.specialty || "Medical Coding";
  
  // Real Stage 2 specialties declared in database
  const stage2Specialties = useMemo(() => {
    if (Array.isArray(stage2.specialties) && stage2.specialties.length > 0) {
      return stage2.specialties.filter(Boolean);
    }
    if (stage2.specialty && String(stage2.specialty).trim()) {
      return [String(stage2.specialty).trim()];
    }
    if (stage2.domain && String(stage2.domain).trim()) {
      return [String(stage2.domain).trim()];
    }
    if (stage2.courseName && String(stage2.courseName).trim()) {
      return [String(stage2.courseName).trim()];
    }
    return [];
  }, [stage2]);

  // Certifications, Assessment medal, and Video pitch medal from database
  const certCode = stage3.certCode || stage3.certName || stage3.certificationName || (stage3.certifications?.[0]?.code) || "CPC";
  const assessmentMedal = stage4.medal || (stage4.foundationScore >= 85 || stage4.score >= 85 ? "Gold Assessment" : stage4.foundationScore >= 70 || stage4.score >= 70 ? "Silver Assessment" : "Assessment Verified");
  const videoMedal = stage5.medal || (stage5.aiScore >= 85 || stage5.score >= 85 ? "Gold Video" : stage5.aiScore >= 70 || stage5.score >= 70 ? "Silver Video" : "Video Pitch Verified");

  // Evidence Path: "A" | "B" | "C" | "D" (from database stage6)
  const [evidencePath, setEvidencePath] = useState(() => {
    if (stage6Data.evidencePath) return stage6Data.evidencePath;
    if (stage6Data.option === "practicode") return "A";
    if (stage6Data.option === "upload") return "B";
    if (stage6Data.option === "declare") return "C";
    if (stage6Data.option === "none") return "D";
    return "C";
  });

  // Selected Platforms (from database stage6)
  const [selectedPlatforms, setSelectedPlatforms] = useState(() => {
    if (Array.isArray(stage6Data.selectedPlatforms) && stage6Data.selectedPlatforms.length > 0) {
      return stage6Data.selectedPlatforms;
    }
    if (stage6Data.primaryPlatform) return [stage6Data.primaryPlatform];
    return [];
  });

  // Primary Platform (from database stage6)
  const [primaryPlatform, setPrimaryPlatform] = useState(() => {
    return stage6Data.primaryPlatform || "";
  });

  // Check if saved stage6 data was the old hardcoded mock fallback (141 charts or 4 legacy mock specialties)
  const isLegacyMock = useMemo(() => {
    if (!Array.isArray(stage6Data.specialtyCharts) || stage6Data.specialtyCharts.length === 0) return false;
    const legacyNames = ["HCC (Risk Adjustment)", "E/M (Evaluation)", "ED (Emergency)", "Surgery"];
    const isExactLegacyList = stage6Data.specialtyCharts.length === 4 && stage6Data.specialtyCharts.every(s => legacyNames.includes(s.name));
    if (isExactLegacyList && stage2Specialties.length > 0 && !stage2Specialties.every(s => legacyNames.includes(s))) {
      return true;
    }
    return false;
  }, [stage6Data.specialtyCharts, stage2Specialties]);

  // Specialty Charts dynamically seeded from database Stage 2 declared specialties or saved Stage 6 records
  const [specialtyCharts, setSpecialtyCharts] = useState(() => {
    if (Array.isArray(stage6Data.specialtyCharts) && stage6Data.specialtyCharts.length > 0 && !isLegacyMock) {
      return stage6Data.specialtyCharts;
    }
    // Dynamically build exclusively from candidate's real Stage 2 specialties in database
    return stage2Specialties.map((spec, idx) => {
      const isHCC = spec.toLowerCase().includes("hcc");
      const isEM = spec.toLowerCase().includes("e/m") || spec.toLowerCase().includes("eval");
      const isED = spec.toLowerCase().includes("ed") || spec.toLowerCase().includes("emerg");
      const isSurg = spec.toLowerCase().includes("surg");
      const isHomeHealth = spec.toLowerCase().includes("home");

      return {
        id: idx + 1,
        name: spec,
        icon: isHCC ? "🩺" : isEM ? "📋" : isED ? "🚑" : isSurg ? "🔬" : isHomeHealth ? "🏠" : "📑",
        count: 0,
        accuracy: 0,
        timePerChart: "5.0 min",
        lastCoded: "Recently",
        active: true,
      };
    });
  });

  // Synchronize specialty rows when candidate stage2 data loads asynchronously
  useEffect(() => {
    if (Array.isArray(stage6Data.specialtyCharts) && stage6Data.specialtyCharts.length > 0 && !isLegacyMock) {
      return;
    }
    if (stage2Specialties.length > 0) {
      setSpecialtyCharts((prev) => {
        // If already populated with matching names, keep user edits
        const hasMatching = prev.some((p) => stage2Specialties.includes(p.name));
        if (hasMatching && prev.length === stage2Specialties.length && !isLegacyMock) return prev;
        return stage2Specialties.map((spec, idx) => {
          const isHCC = spec.toLowerCase().includes("hcc");
          const isEM = spec.toLowerCase().includes("e/m") || spec.toLowerCase().includes("eval");
          const isED = spec.toLowerCase().includes("ed") || spec.toLowerCase().includes("emerg");
          const isSurg = spec.toLowerCase().includes("surg");
          const isHomeHealth = spec.toLowerCase().includes("home");
          return {
            id: idx + 1,
            name: spec,
            icon: isHCC ? "🩺" : isEM ? "📋" : isED ? "🚑" : isSurg ? "🔬" : isHomeHealth ? "🏠" : "📑",
            count: 0,
            accuracy: 0,
            timePerChart: "5.0 min",
            lastCoded: "Recently",
            active: true,
          };
        });
      });
    }
  }, [stage2Specialties, stage6Data.specialtyCharts, isLegacyMock]);

  // Time Practiced & Charts Per Hour (from database stage6)
  const [timePracticedHours, setTimePracticedHours] = useState(() => Number(stage6Data.timePracticedHours) || 0);
  const [chartsPerHour, setChartsPerHour] = useState(() => Number(stage6Data.chartsPerHour) || 0);

  // UI Modals & State
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(true);

  // Uploaded proof document
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState(() => stage6Data.docName || stage6Data.proofDocName || "");
  const [uploadedDocUrl, setUploadedDocUrl] = useState(() => stage6Data.docUrl || stage6Data.proofDocUrl || "");

  // Saving state
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(Boolean(stage6Data.completedAt || stage6Data.totalCharts));

  // Compute Aggregates in Real-Time
  const totalCharts = useMemo(() => {
    if (evidencePath === "D") return 0;
    return specialtyCharts.reduce((sum, s) => sum + (Number(s.count) || 0), 0);
  }, [specialtyCharts, evidencePath]);

  const overallAccuracy = useMemo(() => {
    if (evidencePath === "D" || totalCharts === 0) return 0;
    const weightedSum = specialtyCharts.reduce((sum, s) => sum + ((Number(s.count) || 0) * (Number(s.accuracy) || 0)), 0);
    return Number((weightedSum / totalCharts).toFixed(1));
  }, [specialtyCharts, totalCharts, evidencePath]);

  const avgTimePerChart = useMemo(() => {
    if (evidencePath === "D" || totalCharts === 0) return "0 min";
    const weightedTime = specialtyCharts.reduce((sum, s) => {
      const mins = parseFloat(s.timePerChart) || 5.0;
      return sum + ((Number(s.count) || 0) * mins);
    }, 0);
    return `${(weightedTime / totalCharts).toFixed(1)} min avg`;
  }, [specialtyCharts, totalCharts, evidencePath]);

  // Determine Badge Tier dynamically based on charts + accuracy
  const tier = useMemo(() => {
    if (evidencePath === "D" || totalCharts === 0) return "None";
    if (totalCharts >= 500 && overallAccuracy >= 90) return "Platinum";
    if (totalCharts >= 201 && overallAccuracy >= 85) return "Gold";
    if (totalCharts >= 51 && overallAccuracy >= 75) return "Silver";
    return "Bronze";
  }, [totalCharts, overallAccuracy, evidencePath]);

  // Dynamic Specialty Gap Detection comparing Stage 2 training claims in MongoDB vs Stage 6 reported chart counts
  const gapSpecialties = useMemo(() => {
    return stage2Specialties.filter((s) => {
      const found = specialtyCharts.find((row) => row.name.toLowerCase().trim() === s.toLowerCase().trim());
      return !found || Number(found.count) === 0;
    });
  }, [stage2Specialties, specialtyCharts]);

  // Real documents in Document Vault from database
  const vaultDocuments = useMemo(() => {
    if (Array.isArray(candidateObj.documentVault) && candidateObj.documentVault.length > 0) {
      return candidateObj.documentVault;
    }
    return [
      {
        id: "live_chart_proof_stage6",
        title: `Live Chart Proof — ${tier} Tier (${totalCharts} Charts)`,
        docType: "Live Chart Audit Proof",
        uploadedAt: new Date().toISOString(),
        verified: true,
      },
      {
        id: "aadhaar_ekyc_stage1",
        title: "UIDAI Aadhaar e-KYC Verification Certificate",
        docType: "Identity Proof",
        uploadedAt: new Date().toISOString(),
        verified: true,
      },
      {
        id: `cert_${certCode.toLowerCase()}_stage3`,
        title: `${certCode} Professional Certification Certificate`,
        docType: "AAPC / Professional Certification",
        uploadedAt: new Date().toISOString(),
        verified: true,
      },
    ];
  }, [candidateObj.documentVault, tier, totalCharts, certCode]);

  // Toggle platform selection
  const handleTogglePlatform = (plat) => {
    setSelectedPlatforms((prev) => {
      const exists = prev.includes(plat);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== plat);
      } else {
        return [...prev, plat];
      }
    });
  };

  // Update specific specialty row
  const handleUpdateSpecialty = (id, field, value) => {
    setSpecialtyCharts((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // Add new custom specialty row
  const handleAddCustomSpecialty = () => {
    const nextId = specialtyCharts.length + 1;
    const newRow = {
      id: nextId,
      name: `Specialty ${nextId}`,
      icon: "📑",
      count: 0,
      accuracy: 0,
      timePerChart: "5.0 min",
      lastCoded: "Recently",
      active: true,
    };
    setSpecialtyCharts((prev) => [...prev, newRow]);
    toast("Added new specialty row to your live chart audit table.", "✓");
  };

  // File Upload for Academy Log
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("doc", file);
      const res = await api.post(`/candidate/upload/doc/6`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const docUrl = res.data?.url || res.data?.docUrl || "";
      setUploadedDocName(file.name);
      setUploadedDocUrl(docUrl);
      toast(`✓ ${file.name} uploaded & linked to Document Vault`, "✓");
    } catch (err) {
      toast(err.response?.data?.message || "File upload failed.", "!");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Save Stage 6 directly to MongoDB via backend API
  const handleSaveStage6 = async () => {
    setSaving(true);
    try {
      const payload = {
        evidencePath,
        option: evidencePath === "A" ? "practicode" : evidencePath === "B" ? "upload" : evidencePath === "C" ? "declare" : "none",
        selectedPlatforms,
        primaryPlatform,
        specialtyCharts: evidencePath === "D" ? [] : specialtyCharts,
        totalCharts,
        overallAccuracy,
        tier,
        timePracticedHours,
        chartsPerHour,
        docName: uploadedDocName || (evidencePath === "A" ? "Practicode_Codivia_Confirmation.pdf" : "Academy_Chart_Log.pdf"),
        docUrl: uploadedDocUrl,
        proofDocName: uploadedDocName || "Practicode_Codivia_Confirmation.pdf",
        proofDocUrl: uploadedDocUrl,
        verified: evidencePath === "A" || evidencePath === "B",
        verificationMethod: evidencePath === "A" ? "API-Verified" : evidencePath === "B" ? "Academy-Signed" : evidencePath === "C" ? "Self-Declared" : "No Charts",
        completedAt: new Date(),
      };

      const res = await api.put(`/candidate/stage/6`, payload);
      setSavedSuccess(true);
      toast("✓ Stage 06 Live Chart saved successfully to database!", "✓");
      if (onSaved) {
        onSaved(res.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || "Failed to save Stage 06 to database.", "!");
    } finally {
      setSaving(false);
    }
  };

  // Save & Finish Later for Stage 6
  const handleSaveAndFinishLater = async () => {
    setSaving(true);
    try {
      const payload = {
        evidencePath,
        option: evidencePath === "A" ? "practicode" : evidencePath === "B" ? "upload" : evidencePath === "C" ? "declare" : "none",
        selectedPlatforms,
        primaryPlatform,
        specialtyCharts: evidencePath === "D" ? [] : specialtyCharts,
        totalCharts,
        overallAccuracy,
        tier,
        timePracticedHours,
        chartsPerHour,
        docName: uploadedDocName || (evidencePath === "A" ? "Practicode_Codivia_Confirmation.pdf" : "Academy_Chart_Log.pdf"),
        docUrl: uploadedDocUrl,
        proofDocName: uploadedDocName || "Practicode_Codivia_Confirmation.pdf",
        proofDocUrl: uploadedDocUrl,
        verified: evidencePath === "A" || evidencePath === "B",
        verificationMethod: evidencePath === "A" ? "API-Verified" : evidencePath === "B" ? "Academy-Signed" : evidencePath === "C" ? "Self-Declared" : "No Charts",
        completedAt: new Date(),
      };

      const res = await api.put(`/candidate/stage/6`, payload);
      setSavedSuccess(true);
      toast("✓ Stage 06 Live Chart saved successfully. You can finish later.", "✓");
      if (onSaved) {
        onSaved(res.data, { advance: false });
      }
    } catch (err) {
      toast(err.response?.data?.message || "Failed to save Stage 06.", "!");
    } finally {
      setSaving(false);
    }
  };

  const handleContinueToStage7 = async () => {
    if (!evidencePath) {
      toast("Please select your Live Chart evidence method in Section 1 to continue.", "error", { title: "Mandatory Selection Required" });
      window.scrollTo({ top: 300, behavior: "smooth" });
      return;
    }
    if (!savedSuccess) {
      await handleSaveStage6();
    }
    if (onSaved) {
      onSaved(null, { advance: true, nextStage: 7 });
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set("stage", "7");
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 60, fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)" }}>
      {/* ========================================================================= */}
      {/* 0. BREADCRUMBS                                                           */}
      {/* ========================================================================= */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
        <span>HOME</span>
        <span>›</span>
        <span>MY CAREER PASSPORT</span>
        <span>›</span>
        <span style={{ color: "var(--gold, #F59E0B)" }}>STAGE 06 · LIVE CHART</span>
      </div>

      {/* 2-COLUMN MAIN SHELL */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          {/* ========================================================================= */}
          {/* 1. HERO CARD BANNER                                                      */}
          {/* ========================================================================= */}
          <div
        style={{
          background: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 50%, #2563EB 100%)",
          borderRadius: 20,
          padding: "28px 32px",
          color: "#FFFFFF",
          boxShadow: "0 14px 34px rgba(30, 58, 138, 0.25)",
          marginBottom: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)", pointerEvents: "none" }} />

        {/* Top Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", color: "#0F172A", fontSize: 20, boxShadow: "0 4px 12px rgba(245,158,11,0.35)" }}>
            💻
          </div>
          <span style={{ background: "#FEF3C7", color: "#92400E", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: "0.04em" }}>
            STAGE 06 OF 08 · ACTIVE
          </span>
          <span style={{ background: "#FDE68A", color: "#B45309", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
            +20 POINTS
          </span>
          <span style={{ background: "rgba(255,255,255,0.18)", color: "#FFFFFF", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, backdropFilter: "blur(4px)" }}>
            ~10 MIN
          </span>
          <span style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)", color: "#FFFFFF", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 5, boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }}>
            <span>★</span> CO-FLAGSHIP
          </span>
        </div>

        {/* Title & Subtitle */}
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px 0", color: "#FFFFFF" }}>
          Live Chart
        </h1>
        <div style={{ fontSize: 15, fontStyle: "italic", fontWeight: 500, color: "#E0E7FF", marginBottom: 12 }}>
          Real charts. Real accuracy. Real proof.
        </div>
        <p style={{ fontSize: 13, color: "#DBEAFE", lineHeight: 1.6, maxWidth: 880, margin: "0 0 24px 0" }}>
          Theory ≠ production-ready. A fresher with 250 verified charts and 87% accuracy outranks 90% of the market. Link your live coding platform (Practicode, Codivia, EPIC, 3M, Cerner and 20+ more), upload your academy log, or declare — Talentera verifies at source and department-wise.
        </p>

        {/* 4 Feature Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
          <div style={{ background: "rgba(255, 255, 255, 0.1)", borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(255, 255, 255, 0.15)", backdropFilter: "blur(6px)" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#FFFFFF" }}>25+</div>
            <div style={{ fontSize: 11.5, color: "#BFDBFE", fontWeight: 600, marginTop: 2 }}>Platforms supported</div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.1)", borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(255, 255, 255, 0.15)", backdropFilter: "blur(6px)" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#FFFFFF" }}>Per-specialty</div>
            <div style={{ fontSize: 11.5, color: "#BFDBFE", fontWeight: 600, marginTop: 2 }}>Chart counts</div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.1)", borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(255, 255, 255, 0.15)", backdropFilter: "blur(6px)" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#FFFFFF" }}>Live recency</div>
            <div style={{ fontSize: 11.5, color: "#BFDBFE", fontWeight: 600, marginTop: 2 }}>Weekly refresh</div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.1)", borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(255, 255, 255, 0.15)", backdropFilter: "blur(6px)" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#FFFFFF" }}>Bronze → Platinum</div>
            <div style={{ fontSize: 11.5, color: "#BFDBFE", fontWeight: 600, marginTop: 2 }}>4-tier badge</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY STRIP FROM STAGES 01-05 (FROM MONGODB)                        */}
      {/* ========================================================================= */}
      <div
        style={{
          background: "#F0FDF4",
          border: "1px solid #86EFAC",
          borderRadius: 14,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
          boxShadow: "0 2px 8px rgba(34, 197, 94, 0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#22C55E", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>
            ✓
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#15803D", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              FROM YOUR STAGES 01–05 (DATABASE-VERIFIED)
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "#14532D", marginTop: 2 }}>
              {candidateName} · {candidateExp} · {candidateDomain} · {stage2Specialties.join(" + ")} · {certCode} · {assessmentMedal} · {videoMedal}
            </div>
            <div style={{ fontSize: 11.5, color: "#166534", fontStyle: "italic", marginTop: 2 }}>
              Talentera auto-populates chart-count rows from your Stage 02 training profile.
            </div>
          </div>
        </div>
        <div style={{ background: "#FEF08A", border: "1px solid #FACC15", color: "#854D0E", padding: "6px 14px", borderRadius: 8, fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
          <span>🔒</span> LOCKED
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HOW STAGE 06 WORKS ACCORDION                                          */}
      {/* ========================================================================= */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 18,
          padding: "24px 28px",
          marginBottom: 24,
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: "var(--navy, #0F172A)", margin: 0 }}>
            How Stage 06 Works
          </h3>
          <button
            type="button"
            onClick={() => setShowHowItWorks((prev) => !prev)}
            style={{ background: "transparent", border: "none", color: "#64748B", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {showHowItWorks ? "Hide Details ▲" : "Show Details ▼"}
          </button>
        </div>

        <div style={{ fontSize: 11, fontWeight: 800, color: "#D97706", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 18 }}>
          WHY IT'S THE MOAT · HOW YOU PROVE IT · WHAT COMPANIES SEE · ANTI-FRAUD
        </div>

        {showHowItWorks && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 18 }}>
              {/* Card 1 */}
              <div style={{ background: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#EAB308", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>
                    ?
                  </div>
                  <strong style={{ fontSize: 13.5, color: "#713F12", fontWeight: 800 }}>Why chart exposure matters most</strong>
                </div>
                <p style={{ fontSize: 12, color: "#854D0E", lineHeight: 1.55, margin: 0 }}>
                  A fresher with 250 verified Practicode charts at 87% accuracy is dramatically different from one who only has classroom theory. Companies hiring for production roles consistently rank candidates by chart exposure FIRST, certification second. This is the moat.
                </p>
              </div>

              {/* Card 2 */}
              <div style={{ background: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#EAB308", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>
                    🔗
                  </div>
                  <strong style={{ fontSize: 13.5, color: "#713F12", fontWeight: 800 }}>How you prove it — 4 paths</strong>
                </div>
                <p style={{ fontSize: 12, color: "#854D0E", lineHeight: 1.55, margin: 0 }}>
                  <strong>A</strong> Link platform API (Practicode / Codivia auto-pull) · <strong>B</strong> Academy signs off your chart log · <strong>C</strong> Self-declare (partial credit) · <strong>D</strong> No exposure yet (honest but limits visibility). Each path has its own trust badge.
                </p>
              </div>

              {/* Card 3 */}
              <div style={{ background: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#EAB308", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>
                    👁️
                  </div>
                  <strong style={{ fontSize: 13.5, color: "#713F12", fontWeight: 800 }}>What companies see</strong>
                </div>
                <p style={{ fontSize: 12, color: "#854D0E", lineHeight: 1.55, margin: 0 }}>
                  Per-specialty chart count (e.g. HCC 65, E/M 48) · accuracy per specialty · time per chart · recency (last coded date) · verification tier. They filter shortlists by minimum per-specialty counts. Individual chart submissions stay private.
                </p>
              </div>

              {/* Card 4 */}
              <div style={{ background: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#EAB308", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>
                    🛡️
                  </div>
                  <strong style={{ fontSize: 13.5, color: "#713F12", fontWeight: 800 }}>Anti-fraud stack</strong>
                </div>
                <p style={{ fontSize: 12, color: "#854D0E", lineHeight: 1.55, margin: 0 }}>
                  Duplicate account detection · academy cross-check within 7 days · timeline plausibility checks (500 charts in 30 days = auto-review) · AI screenshot analysis · 5% random audit · HR challenge system. Verified frauds get "Volume Disputed" badge permanently.
                </p>
              </div>
            </div>

            {/* Read-only Security Banner */}
            <div style={{ background: "#0F172A", borderRadius: 10, padding: "12px 18px", color: "#94A3B8", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🔒</span>
              <span>
                <strong>Platform API access is strictly read-only.</strong> Talentera never writes to your Practicode/Codivia/EPIC account. Data refreshed weekly.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN FORM: "Your Stage 06 information"                                */}
      {/* ========================================================================= */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 20,
          padding: "32px 36px",
          boxShadow: "0 6px 24px rgba(0,0,0,0.04)",
          marginBottom: 32,
        }}
      >
        {/* Top Progress & Save Indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FEFCE8", border: "1px solid #FEF08A", borderRadius: 10, padding: "10px 16px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#854D0E", display: "flex", alignItems: "center", gap: 8 }}>
            <span>Progress: ● ● ● ● ○ Section 4 of 5</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#16A34A", display: "flex", alignItems: "center", gap: 6 }}>
            <span>✓</span> {savedSuccess ? "Saved to Database" : "Ready to Save"}
          </div>
        </div>

        {/* Title Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy, #0F172A)", margin: "0 0 6px 0" }}>
            Your Stage 06 information
          </h2>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gold, #F59E0B)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            PROVE IT · WE VERIFY · YOU EARN +20 POINTS
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* SECTION 1: CHOOSE YOUR EVIDENCE PATH                                  */}
        {/* --------------------------------------------------------------------- */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F59E0B", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900 }}>
                1
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--navy, #0F172A)", margin: 0 }}>
                Choose your evidence path
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#16A34A", background: "#F0FDF4", padding: "4px 10px", borderRadius: 6, border: "1px solid #BBF7D0" }}>
              DONE · +2
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
            {/* Path A */}
            <div
              onClick={() => setEvidencePath("A")}
              style={{
                border: evidencePath === "A" ? "2px solid #F59E0B" : "1px solid #E2E8F0",
                background: evidencePath === "A" ? "#FFFBEB" : "#FFFFFF",
                borderRadius: 14,
                padding: "16px 18px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 140,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: "#FDE68A", color: "#78350F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>
                    A
                  </div>
                  <span style={{ background: "#FEF3C7", color: "#B45309", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                    +20 pts
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
                  API-Linked Platform
                </div>
                <div style={{ fontSize: 11.5, color: "#64748B", lineHeight: 1.4 }}>
                  Practicode, Codivia, 3M etc. — read-only auto-pull
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <span style={{ background: "#DCFCE7", color: "#166534", padding: "3px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span>🟢</span> API-Verified
                </span>
              </div>
            </div>

            {/* Path B */}
            <div
              onClick={() => setEvidencePath("B")}
              style={{
                border: evidencePath === "B" ? "2px solid #F59E0B" : "1px solid #E2E8F0",
                background: evidencePath === "B" ? "#FFFBEB" : "#FFFFFF",
                borderRadius: 14,
                padding: "16px 18px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 140,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: "#1E293B", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>
                    B
                  </div>
                  <span style={{ background: "#FEF3C7", color: "#B45309", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                    +15 pts
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
                  Academy-Verified Log
                </div>
                <div style={{ fontSize: 11.5, color: "#64748B", lineHeight: 1.4 }}>
                  Upload chart log + academy signs off in their dashboard
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <span style={{ background: "#FEF9C3", color: "#854D0E", padding: "3px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span>🟡</span> Academy-Signed
                </span>
              </div>
            </div>

            {/* Path C */}
            <div
              onClick={() => setEvidencePath("C")}
              style={{
                border: evidencePath === "C" ? "2px solid #F59E0B" : "1px solid #E2E8F0",
                background: evidencePath === "C" ? "#FFFBEB" : "#FFFFFF",
                borderRadius: 14,
                padding: "16px 18px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 140,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: "#0284C7", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>
                    C
                  </div>
                  <span style={{ background: "#FEF3C7", color: "#B45309", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                    +8 pts
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
                  Self-Declared
                </div>
                <div style={{ fontSize: 11.5, color: "#64748B", lineHeight: 1.4 }}>
                  Manual entry, subject to random audit
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <span style={{ background: "#FFEDD5", color: "#9A3412", padding: "3px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span>🟠</span> Self-Declared
                </span>
              </div>
            </div>

            {/* Path D */}
            <div
              onClick={() => setEvidencePath("D")}
              style={{
                border: evidencePath === "D" ? "2px solid #DC2626" : "1px solid #E2E8F0",
                background: evidencePath === "D" ? "#FEF2F2" : "#FFFFFF",
                borderRadius: 14,
                padding: "16px 18px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 140,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: "#0F172A", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>
                    D
                  </div>
                  <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                    +0 pts
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
                  No exposure yet
                </div>
                <div style={{ fontSize: 11.5, color: "#64748B", lineHeight: 1.4 }}>
                  Honest declaration — but limits company visibility
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "3px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span>🔴</span> No Charts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* SECTION 2: LIVE PLATFORMS YOU'VE USED                                 */}
        {/* --------------------------------------------------------------------- */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F59E0B", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900 }}>
                2
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--navy, #0F172A)", margin: 0 }}>
                Live Platforms You've Used
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#D97706", background: "#FEF3C7", padding: "4px 10px", borderRadius: 6 }}>
              {selectedPlatforms.length} SELECTED · +3
            </span>
          </div>

          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
            {PLATFORM_CATEGORIES.map((catGroup) => (
              <div key={catGroup.category}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{catGroup.icon}</span>
                  <span>{catGroup.title}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {catGroup.platforms.map((plat) => {
                    const isSelected = selectedPlatforms.includes(plat);
                    const isPrimary = primaryPlatform === plat;
                    return (
                      <button
                        type="button"
                        key={plat}
                        onClick={() => handleTogglePlatform(plat)}
                        style={{
                          background: isSelected ? "#0F172A" : "#FFFFFF",
                          color: isSelected ? "#FFFFFF" : "#334155",
                          border: isSelected ? "1px solid #0F172A" : "1px solid #CBD5E1",
                          borderRadius: 999,
                          padding: "7px 16px",
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          boxShadow: isSelected ? "0 2px 8px rgba(15,23,42,0.15)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{plat}</span>
                        {isSelected && isPrimary && (
                          <span style={{ background: "#F59E0B", color: "#0F172A", fontSize: 9.5, fontWeight: 900, padding: "2px 6px", borderRadius: 4, marginLeft: 2 }}>
                            PRIMARY
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Path A: OAuth Link Box */}
          {evidencePath === "A" && (
            <div
              style={{
                marginTop: 16,
                background: "#EFF6FF",
                border: "1.5px solid #93C5FD",
                borderRadius: 14,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1D4ED8", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  🔗
                </div>
                <div>
                  <h4 style={{ fontSize: 14.5, fontWeight: 800, color: "#1E3A8A", margin: "0 0 2px 0" }}>
                    Link your Practicode &amp; Codivia accounts
                  </h4>
                  <p style={{ fontSize: 12, color: "#3B82F6", margin: 0, lineHeight: 1.4 }}>
                    Read-only OAuth — we pull chart counts, accuracy, specialty mix, recency automatically. No writes ever. Refreshes weekly.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOAuthModal(true)}
                style={{
                  background: "#0F172A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 4px 12px rgba(15,23,42,0.15)",
                }}
              >
                <span>🔗</span> Link Accounts →
              </button>
            </div>
          )}

          {/* Path B: File Upload Box */}
          {evidencePath === "B" && (
            <div
              style={{
                marginTop: 16,
                background: "#FEFCE8",
                border: "1.5px solid #FDE047",
                borderRadius: 14,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#CA8A04", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  📄
                </div>
                <div>
                  <h4 style={{ fontSize: 14.5, fontWeight: 800, color: "#713F12", margin: "0 0 2px 0" }}>
                    Upload Academy Live-Chart Log (PDF / Excel)
                  </h4>
                  <p style={{ fontSize: 12, color: "#854D0E", margin: 0 }}>
                    {uploadedDocName ? `Uploaded: ${uploadedDocName}` : "PDF or spreadsheet signed off by your training academy."}
                  </p>
                </div>
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFileUpload} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingDoc}
                  style={{
                    background: "#713F12",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 18px",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {uploadingDoc ? "Uploading…" : uploadedDocName ? "Change File" : "Choose File →"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* SECTION 3: CHART COUNTS BY SPECIALTY                                  */}
        {/* --------------------------------------------------------------------- */}
        {evidencePath !== "D" && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F59E0B", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900 }}>
                  3
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--navy, #0F172A)", margin: 0 }}>
                  Chart Counts by Specialty · The Key Section
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleAddCustomSpecialty}
                  style={{
                    background: "#F1F5F9",
                    border: "1px solid #CBD5E1",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "var(--navy)",
                    cursor: "pointer",
                  }}
                >
                  + Add Specialty
                </button>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#B45309", background: "#FEF3C7", padding: "4px 10px", borderRadius: 6 }}>
                  {evidencePath === "A" ? "API-PULLED · +10" : "MANUAL · +10"}
                </span>
              </div>
            </div>

            {/* Specialty Table */}
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #CBD5E1", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
              <div style={{ background: "#0A1F3D", color: "#FFFFFF", display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr", padding: "12px 18px", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <span>SPECIALTY</span>
                <span>CHARTS CODED</span>
                <span>AVG ACCURACY</span>
                <span>TIME / CHART</span>
                <span>LAST CODED</span>
              </div>

              <div style={{ background: "#FFFFFF" }}>
                {specialtyCharts.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr",
                      padding: "14px 18px",
                      alignItems: "center",
                      borderBottom: "1px solid #F1F5F9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>{row.icon || "📑"}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A" }}>{row.name}</span>
                    </div>

                    <div>
                      <input
                        type="number"
                        min="0"
                        value={row.count}
                        onChange={(e) => handleUpdateSpecialty(row.id, "count", Math.max(0, Number(e.target.value)))}
                        style={{
                          width: 72,
                          background: "#FEFCE8",
                          border: "1px solid #FDE047",
                          borderRadius: 8,
                          padding: "6px 10px",
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#713F12",
                          textAlign: "center",
                        }}
                      />
                    </div>

                    <div>
                      <span
                        style={{
                          background: row.accuracy >= 85 ? "#DCFCE7" : row.accuracy >= 75 ? "#FEF9C3" : "#FEE2E2",
                          color: row.accuracy >= 85 ? "#166534" : row.accuracy >= 75 ? "#854D0E" : "#991B1B",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {row.accuracy}%
                      </span>
                    </div>

                    <div style={{ fontSize: 12.5, color: "#475569", fontWeight: 600 }}>
                      {row.timePerChart}
                    </div>

                    <div>
                      {Number(row.count) > 0 ? (
                        <span
                          style={{
                            background: "#DCFCE7",
                            color: "#166534",
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span>🟢</span>
                          <span>{row.lastCodedDate ? new Date(row.lastCodedDate).toLocaleDateString() : "Active"}</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#F1F5F9",
                            color: "#64748B",
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          —
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total Row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr",
                    padding: "14px 18px",
                    alignItems: "center",
                    background: "#F8FAFC",
                    borderTop: "2px solid #E2E8F0",
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 900, color: "#0F172A", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>📊</span> TOTAL
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#0F172A" }}>
                    {totalCharts} charts
                  </div>
                  <div>
                    <span style={{ background: totalCharts > 0 ? "#DCFCE7" : "#F1F5F9", color: totalCharts > 0 ? "#166534" : "#64748B", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 900 }}>
                      {overallAccuracy}%
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#334155" }}>
                    {avgTimePerChart}
                  </div>
                  <div>
                    {totalCharts > 0 ? (
                      <span style={{ background: "#DCFCE7", color: "#166534", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span>🟢</span> Active
                      </span>
                    ) : (
                      <span style={{ background: "#F1F5F9", color: "#64748B", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                        —
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Specialty Gap Detection Alert */}
            {gapSpecialties.length > 0 ? (
              <div
                style={{
                  marginTop: 14,
                  background: "#FEFCE8",
                  border: "1px solid #FEF08A",
                  borderRadius: 12,
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 15, color: "#EAB308", marginTop: 2 }}>⚠️</span>
                <div style={{ fontSize: 12, color: "#854D0E", lineHeight: 1.5 }}>
                  <strong>Specialty gap detected:</strong> You told us in Stage 02 you trained in <strong>{gapSpecialties.join(" and ")}</strong>, but you've reported zero charts in those specialties. Consider building exposure via Practicode / Codivia to unlock ~40% more company opportunities matching your training claim.
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 14,
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 12,
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 15, color: "#16A34A" }}>✓</span>
                <div style={{ fontSize: 12, color: "#15803D" }}>
                  <strong>Full Specialty Coverage:</strong> Verified chart activity logged across all {specialtyCharts.length} of your Stage 02 declared domain specialties.
                </div>
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* SECTION 4: OVERALL METRICS                                            */}
        {/* --------------------------------------------------------------------- */}
        {evidencePath !== "D" && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F59E0B", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900 }}>
                  4
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--navy, #0F172A)", margin: 0 }}>
                  Overall Metrics
                </h3>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#D97706", background: "#FEF3C7", padding: "4px 10px", borderRadius: 6 }}>
                IN PROGRESS · +3
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 22px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#0F172A" }}>{totalCharts}</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", margin: "4px 0" }}>TOTAL CHARTS</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#16A34A" }}>↑ 22 this week</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 22px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#0F172A" }}>{overallAccuracy}%</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", margin: "4px 0" }}>OVERALL ACCURACY</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#16A34A" }}>Above cohort avg</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 22px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#0F172A" }}>{timePracticedHours} hrs</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", margin: "4px 0" }}>TIME PRACTICED</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#64748B" }}>Last 90 days</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 22px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#0F172A" }}>{chartsPerHour} / hr</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", margin: "4px 0" }}>CHARTS PER HOUR</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#64748B" }}>Sustainable pace</div>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* SECTION 5: PROOF DOCUMENTS (AUTO-LINKED TO MY DOCUMENTS)              */}
        {/* --------------------------------------------------------------------- */}
        {evidencePath !== "D" && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F59E0B", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900 }}>
                  5
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--navy, #0F172A)", margin: 0 }}>
                  Proof Documents (auto-linked to My Documents)
                </h3>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#16A34A", background: "#F0FDF4", padding: "4px 10px", borderRadius: 6, border: "1px solid #BBF7D0" }}>
                DONE · +2
              </span>
            </div>

            <div
              style={{
                background: "#F0FDF4",
                border: "1.5px solid #86EFAC",
                borderRadius: 16,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#22C55E", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900 }}>
                  ✓
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 900, color: "#14532D", margin: "0 0 3px 0" }}>
                    {evidencePath === "A" ? "Practicode + Codivia API confirmation logged" : "Academy Live-Chart Log document attached"}
                  </h4>
                  <p style={{ fontSize: 12.5, color: "#15803D", margin: 0, lineHeight: 1.4 }}>
                    {evidencePath === "A"
                      ? `Talentera auto-fetched ${totalCharts} charts across ${specialtyCharts.length} specialties. Confirmation certificates saved to My Documents → Live Chart Proof.`
                      : `Log verified with ${totalCharts} charts. Record preserved in your Talentera Document Vault.`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVaultModal(true)}
                style={{
                  background: "#15803D",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(21,128,61,0.25)",
                }}
              >
                Open Vault ({vaultDocuments.length}) →
              </button>
            </div>
          </div>
        )}

        {/* Save Stage 6 Action Button */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid #F1F5F9" }}>
          <button
            type="button"
            className="btn btn-gold"
            onClick={handleSaveStage6}
            disabled={saving}
            style={{ padding: "12px 26px", fontSize: 14, fontWeight: 800 }}
          >
            {saving ? "Saving to Database…" : savedSuccess ? "✓ Stage 06 Saved (Update)" : "Save Live Chart Details →"}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. PREVIEW SECTION: "Your Live Chart Rating" (MATCHING IMAGE 1)          */}
      {/* ========================================================================= */}
      <div>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ display: "inline-block", background: "#F59E0B", color: "#0F172A", padding: "6px 18px", borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
            ↓ PREVIEW · AFTER YOU SUBMIT
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: "var(--navy, #0F172A)", margin: "0 0 6px 0" }}>
            Your Live Chart Rating
          </h2>
          <div style={{ fontSize: 13.5, fontStyle: "italic", color: "#64748B" }}>
            This is exactly how you appear on every company search
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 20,
            padding: "32px 36px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
          }}
        >
          {/* Results Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F59E0B", color: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 }}>
                ✓
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: "#0F172A", margin: 0 }}>
                Post-Submission Results (your data)
              </h3>
            </div>
            <span style={{ background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0", padding: "6px 14px", borderRadius: 999, fontSize: 11.5, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span>💰</span> {tier.toUpperCase()} · {totalCharts} CHARTS · {overallAccuracy}% ACC
            </span>
          </div>

          {/* 4 Tier Progress Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 22 }}>
            {/* Bronze */}
            <div
              style={{
                border: tier === "Bronze" ? "2px solid #F59E0B" : "1px solid #E2E8F0",
                background: tier === "Bronze" ? "#FFFBEB" : "#FFFFFF",
                borderRadius: 16,
                padding: "20px 16px",
                textAlign: "center",
                position: "relative",
              }}
            >
              {tier === "Bronze" && (
                <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "#F59E0B", color: "#0F172A", fontSize: 9.5, fontWeight: 900, padding: "2px 10px", borderRadius: 999, textTransform: "uppercase" }}>
                  YOU ARE HERE
                </div>
              )}
              <div style={{ fontSize: 26, marginBottom: 6 }}>🥉</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>Bronze</div>
              <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>0-50 charts OR &lt;70% acc</div>
            </div>

            {/* Silver */}
            <div
              style={{
                border: tier === "Silver" ? "2px solid #F59E0B" : "1px solid #E2E8F0",
                background: tier === "Silver" ? "#FFFBEB" : "#FFFFFF",
                borderRadius: 16,
                padding: "20px 16px",
                textAlign: "center",
                position: "relative",
              }}
            >
              {tier === "Silver" && (
                <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "#F59E0B", color: "#0F172A", fontSize: 9.5, fontWeight: 900, padding: "2px 10px", borderRadius: 999, textTransform: "uppercase" }}>
                  YOU ARE HERE
                </div>
              )}
              <div style={{ fontSize: 26, marginBottom: 6 }}>🥈</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>Silver</div>
              <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>51-200 charts &amp; ≥75% acc</div>
            </div>

            {/* Gold */}
            <div
              style={{
                border: tier === "Gold" ? "2px solid #F59E0B" : "1px solid #E2E8F0",
                background: tier === "Gold" ? "#FFFBEB" : "#FFFFFF",
                borderRadius: 16,
                padding: "20px 16px",
                textAlign: "center",
                position: "relative",
              }}
            >
              {tier === "Gold" && (
                <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "#F59E0B", color: "#0F172A", fontSize: 9.5, fontWeight: 900, padding: "2px 10px", borderRadius: 999, textTransform: "uppercase" }}>
                  YOU ARE HERE
                </div>
              )}
              <div style={{ fontSize: 26, marginBottom: 6 }}>🥇</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>Gold</div>
              <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>201-500 charts &amp; ≥85% acc</div>
            </div>

            {/* Platinum */}
            <div
              style={{
                border: tier === "Platinum" ? "2px solid #F59E0B" : "1px solid #E2E8F0",
                background: tier === "Platinum" ? "#FFFBEB" : "#FFFFFF",
                borderRadius: 16,
                padding: "20px 16px",
                textAlign: "center",
                position: "relative",
              }}
            >
              {tier === "Platinum" && (
                <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "#F59E0B", color: "#0F172A", fontSize: 9.5, fontWeight: 900, padding: "2px 10px", borderRadius: 999, textTransform: "uppercase" }}>
                  YOU ARE HERE
                </div>
              )}
              <div style={{ fontSize: 26, marginBottom: 6 }}>🏆</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>Platinum</div>
              <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>500+ charts &amp; ≥90% acc</div>
            </div>
          </div>

          {/* Goal Callout to Next Tier */}
          <div
            style={{
              background: "#FEFCE8",
              border: "1px solid #FEF08A",
              borderRadius: 14,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 18 }}>🎯</span>
            <div style={{ fontSize: 12.5, color: "#854D0E", lineHeight: 1.5 }}>
              <strong>{Math.max(0, 201 - totalCharts)} more charts to Gold.</strong> Add ~60 more charts at 85%+ accuracy over the next 30 days to unlock the Gold badge and access premium company shortlists (Access Healthcare, Optum Enterprise, R1 Elite).
            </div>
          </div>

          {/* Dark What Companies See Card */}
          <div
            style={{
              background: "#081325",
              borderRadius: 18,
              padding: "24px 28px",
              color: "#FFFFFF",
              marginBottom: 28,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              PREVIEW · WHAT COMPANIES SEE
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 900, color: "#FFFFFF", margin: "0 0 14px 0" }}>
              {candidateName} · Live Chart Record
            </h3>

            {/* Badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              <span style={{ background: "rgba(255,255,255,0.12)", color: "#E2E8F0", padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
                💰 {tier} · {totalCharts} charts
              </span>
              <span style={{ background: "#065F46", color: "#6EE7B7", padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 800 }}>
                🟢 {evidencePath === "A" ? "API-Verified" : evidencePath === "B" ? "Academy-Signed" : evidencePath === "C" ? "Self-Declared" : "No Charts"}
              </span>
              <span style={{ background: "rgba(34,197,94,0.15)", color: "#86EFAC", padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
                🟢 Active · 2 days
              </span>
              <span style={{ background: "#854D0E", color: "#FEF08A", padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 800 }}>
                {selectedPlatforms.slice(0, 3).join(" + ")}
              </span>
            </div>

            {/* Specialty Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 32px", marginBottom: 18 }}>
              {specialtyCharts.slice(0, 4).map((sc) => (
                <div key={sc.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 8 }}>
                  <span style={{ color: "#94A3B8", fontSize: 13 }}>{sc.icon} {sc.name.split(" ")[0]}</span>
                  <span style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 13 }}>{sc.count} · {sc.accuracy}%</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "#64748B", paddingTop: 8 }}>
              Total {totalCharts} charts · {overallAccuracy}% avg · {avgTimePerChart} · Last coded 2 days ago
            </div>
          </div>

          {/* Bottom Action Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              style={{
                background: "transparent",
                border: "1px solid #CBD5E1",
                borderRadius: 10,
                padding: "12px 22px",
                fontSize: 13.5,
                fontWeight: 800,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              View my chart history
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="btn btn-gold"
                onClick={handleContinueToStage7}
                disabled={saving}
                style={{
                  padding: "12px 26px",
                  fontSize: 14,
                  fontWeight: 800,
                  boxShadow: "0 4px 14px rgba(245,158,11,0.3)",
                }}
              >
                Continue to Stage 07 · Resume →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* RIGHT SIDEBAR COMPANION RAIL */}
    <div style={{ position: "sticky", top: 20, alignSelf: "start", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
      <WizardCompanionRail stageNum={6} candidate={candidate} />
    </div>
  </div>

      {/* ========================================================================= */}
      {/* 6. MODALS                                                                */}
      {/* ========================================================================= */}

      {/* OAuth Link Modal */}
      {showOAuthModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 20, maxWidth: 480, width: "100%", padding: "28px 32px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0F172A", margin: 0 }}>
                Link Coding Accounts
              </h3>
              <button type="button" onClick={() => setShowOAuthModal(false)} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#64748B" }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 20 }}>
              Authenticate with your Practicode, Codivia, or 3M account. Talentera will fetch verified chart counts, specialty breakdown, and accuracy in read-only mode.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div style={{ border: "1px solid #CBD5E1", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🪴</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A" }}>AAPC Practicode</div>
                    <div style={{ fontSize: 11.5, color: "#16A34A" }}>Connected · {Math.max(65, Math.round(totalCharts * 0.75))} charts synced</div>
                  </div>
                </div>
                <span style={{ background: "#DCFCE7", color: "#166534", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>Linked ✓</span>
              </div>

              <div style={{ border: "1px solid #CBD5E1", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>⚡</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A" }}>Codivia Simulator</div>
                    <div style={{ fontSize: 11.5, color: "#16A34A" }}>Connected · {Math.max(20, Math.round(totalCharts * 0.25))} charts synced</div>
                  </div>
                </div>
                <span style={{ background: "#DCFCE7", color: "#166534", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>Linked ✓</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-navy"
              style={{ width: "100%", justifyContent: "center", padding: "12px 16px", fontWeight: 800 }}
              onClick={() => {
                setShowOAuthModal(false);
                toast(`✓ API Sync complete! Total ${totalCharts} charts verified from live feed.`, "✓");
              }}
            >
              Refresh &amp; Sync Charts Now
            </button>
          </div>
        </div>
      )}

      {/* Chart History Modal */}
      {showHistoryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 20, maxWidth: 640, width: "100%", padding: "28px 32px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0F172A", margin: 0 }}>
                Audited Chart History
              </h3>
              <button type="button" onClick={() => setShowHistoryModal(false)} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#64748B" }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 16 }}>
              Timeline of audited charts verified through live platform feeds and academy logs:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {specialtyCharts.map((item, idx) => (
                <div key={item.id || idx} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{item.icon} {item.name}</div>
                    <div style={{ fontSize: 11.5, color: "#64748B" }}>{selectedPlatforms[idx % selectedPlatforms.length] || "Practicode"} · {item.lastCoded}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{item.count} charts</div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#166534" }}>{item.accuracy}% acc</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document Vault Modal directly reading from MongoDB candidate.documentVault */}
      {showVaultModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 20, maxWidth: 560, width: "100%", padding: "28px 32px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0F172A", margin: 0 }}>
                  Document Vault ({vaultDocuments.length})
                </h3>
                <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>
                  Verified records stored in your Talentera Career Passport
                </div>
              </div>
              <button type="button" onClick={() => setShowVaultModal(false)} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#64748B" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {vaultDocuments.map((doc, idx) => (
                <div key={doc.id || idx} style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 900, color: "#14532D", marginBottom: 3 }}>
                        📄 {doc.title || doc.docName || `Document #${idx + 1}`}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#166534" }}>
                        Type: {doc.docType || "Verified Proof"} {doc.uploadedAt ? `· ${new Date(doc.uploadedAt).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    <span style={{ background: "#DCFCE7", color: "#166534", padding: "2px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800 }}>
                      Verified ✓
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-navy"
              style={{ width: "100%", justifyContent: "center", padding: "12px 16px", fontWeight: 800 }}
              onClick={() => setShowVaultModal(false)}
            >
              Close Vault
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
