import React, { useState, useMemo, useEffect } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";

export default function Stage8Track({ stage, existingData, candidate, onSaved, onNavigateStage, onGoToDashboard }) {
  const toast = useToast();

  // Extract real candidate data from MongoDB
  const candidateObj = candidate || {};
  const stage1 = candidateObj.stage1 || {};
  const stage2 = candidateObj.stage2 || {};
  const stage3 = candidateObj.stage3 || {};
  const stage4 = candidateObj.stage4 || {};
  const stage5 = candidateObj.stage5 || {};
  const stage6 = candidateObj.stage6 || {};
  const stage7 = candidateObj.stage7 || {};
  const stage8Data = existingData || candidateObj.stage8 || {};

  // Candidate basics directly from database
  const fullName = stage1.fullName || candidateObj.name || (candidateObj.email ? candidateObj.email.split("@")[0] : "Talentera Candidate");
  const firstName = fullName.split(" ")[0] || "Candidate";
  const isExperienced = String(stage1.experience || candidateObj.experience || "").toLowerCase().includes("exp") || (typeof stage1.experience === "number" && stage1.experience > 0) || (parseInt(stage1.experience, 10) > 0);
  const expLabel = isExperienced ? `${stage1.experience} Years Exp` : "Fresher";
  const domainName = stage2.domain || stage2.courseName || stage2.specialty || "Medical Coding";
  
  // Locality & Contact
  const city = stage1.city || "";
  const state = stage1.state || "";
  const locality = city ? (state ? `${city}, ${state}` : city) : (state || "India");

  // Stage 2 Training Details
  const academyName = stage2.academyName || stage2.instituteName || "Talentera Partner Academy";
  const trainingSpecialties = Array.isArray(stage2.specialties) && stage2.specialties.length > 0
    ? stage2.specialties.join(" + ")
    : (stage2.specialty || domainName || "Medical Coding");
  const trainingAssessmentScore = stage2.assessmentScore || stage2.score || null;

  // Stage 3 Certifications
  const isNonCertified = stage3.nonCertified || stage3.isCertified === false || stage3.certType === "non-certified";
  const certificationsList = useMemo(() => {
    if (isNonCertified) return [];
    if (Array.isArray(stage3.certifications) && stage3.certifications.length > 0) {
      return stage3.certifications;
    }
    if (stage3.certCode || stage3.certName || stage3.certificationName) {
      return [{
        code: stage3.certCode || "CPC",
        name: stage3.certName || stage3.certificationName || "Certified Professional Coder",
        body: stage3.issuingBody || stage3.body || "AAPC",
        memberId: stage3.memberId || "",
      }];
    }
    return [];
  }, [stage3, isNonCertified]);

  const certsSummary = certificationsList.length > 0
    ? certificationsList.map((c) => c.code || c.name).join(" · ")
    : (isNonCertified ? "Non-Certified Track" : "AAPC / AHIMA Credential");

  // Stage 4 Assessment
  const assessmentScore = stage4.foundationScore !== undefined ? stage4.foundationScore : (stage4.score !== undefined ? stage4.score : null);
  const assessmentMedal = stage4.medal || (assessmentScore !== null ? (assessmentScore >= 85 ? "Gold" : assessmentScore >= 70 ? "Silver" : assessmentScore >= 50 ? "Bronze" : "Verified") : "Verified");

  // Stage 5 Video Pitch
  const videoScore = stage5.aiScore !== undefined ? stage5.aiScore : (stage5.score !== undefined ? stage5.score : null);
  const videoMedal = stage5.medal || (videoScore !== null ? (videoScore >= 85 ? "Gold" : videoScore >= 70 ? "Silver" : videoScore >= 50 ? "Bronze" : "Verified") : "Verified");
  const regionalLang = stage5.regionalLanguage || "";

  // Stage 6 Live Charts
  const totalCharts = stage6.totalCharts !== undefined ? stage6.totalCharts : (stage6.liveChartsAudited !== undefined ? stage6.liveChartsAudited : 0);
  const overallAccuracy = stage6.overallAccuracy !== undefined ? stage6.overallAccuracy : (stage6.accuracyScore !== undefined ? stage6.accuracyScore : 83.5);
  const chartTier = stage6.tier || (totalCharts >= 500 ? "Platinum" : totalCharts >= 201 ? "Gold" : totalCharts >= 51 ? "Silver" : totalCharts > 0 ? "Bronze" : "Silver");

  // Real Verification Score
  const totalPoints = useMemo(() => {
    let pts = 0;
    if (stage1.aadhaarVerified || stage1.fullName) pts += 5;
    if (stage2.academyName || stage2.courseName || stage2.domain) pts += 15;
    if (stage3.certStatus === "verified" || (certificationsList.length > 0 && !isNonCertified)) pts += 20;
    if (assessmentScore !== null && assessmentScore >= 70) pts += 25;
    else if (assessmentScore !== null && assessmentScore > 0) pts += Math.round((assessmentScore / 100) * 25);
    if (stage5.videoUrl || (videoScore !== null && videoScore >= 70)) pts += 10;
    if (totalCharts > 0) {
      const opt = (stage6.evidencePath || stage6.option || "").toLowerCase();
      pts += opt === "a" || opt.includes("api") || opt === "practicode" ? 20 : opt === "b" || opt.includes("upload") ? 15 : opt === "c" || opt.includes("declare") ? 8 : 10;
    }
    return Math.min(100, Math.max(pts, candidateObj.score || 0));
  }, [stage1, stage2, stage3, certificationsList, isNonCertified, assessmentScore, stage5, videoScore, totalCharts, stage6, candidateObj]);

  // Live Hiring Companies and Real Ticker from MongoDB API
  const [liveCompanies, setLiveCompanies] = useState([]);
  const [tickerData, setTickerData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/public/hiring-activity")
      .then((res) => {
        if (!isMounted || !res.data) return;
        if (res.data.ticker) setTickerData(res.data.ticker);
        if (Array.isArray(res.data.companies)) {
          setLiveCompanies(res.data.companies);
        }
      })
      .catch((err) => {
        console.debug("Live hiring activity sync:", err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Real match count and open roles from database
  const realCompaniesCount = tickerData?.companiesHiring || (liveCompanies.length > 0 ? liveCompanies.length : 0);
  const realOpenRoles = tickerData?.openRoles || liveCompanies.reduce((acc, c) => acc + (c.openRoles || 1), 0);

  // Applications & Notifications from Candidate MongoDB record
  const [candidateApps, setCandidateApps] = useState([]);
  const [candidateNotifications, setCandidateNotifications] = useState([]);
  const [appsLoaded, setAppsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    // 1. Fetch real applications
    api
      .get("/candidate/applications")
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res.data?.applications)) {
          setCandidateApps(res.data.applications);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setAppsLoaded(true);
      });

    // 2. Fetch real notifications
    api
      .get("/candidate/notifications")
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res.data?.notifications)) {
          setCandidateNotifications(res.data.notifications);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Derived Real Lists
  const shortlistedApps = useMemo(() => {
    return candidateApps.filter((a) => a.status === "shortlisted");
  }, [candidateApps]);

  const interviewApps = useMemo(() => {
    return candidateApps.filter((a) => a.status === "interviewing" || a.status === "interview");
  }, [candidateApps]);

  const feedbackApps = useMemo(() => {
    return candidateApps.filter((a) => a.feedback || a.coverNote || a.notes || a.status === "rejected" || a.status === "hired");
  }, [candidateApps]);

  // Match Preferences State
  const [preferences, setPreferences] = useState({
    willingToWorkIn: Array.isArray(stage1.preferredLocations) && stage1.preferredLocations.length > 0
      ? stage1.preferredLocations.join(" · ")
      : (city ? `${city} · Bengaluru · Hyderabad · Chennai · Kochi` : "Bengaluru · Hyderabad · Chennai · Coimbatore · Kochi"),
    globalMarkets: stage8Data.globalMarkets || "India (default) · US (night shift) · UAE / Middle East",
    expectedSalary: stage8Data.expectedSalary || stage1.expectedCtc || (isExperienced ? "₹5.5 – 8.0 LPA" : "₹3.5 – 5.0 LPA · Open to Trainee ₹2.8 – 3.2 LPA"),
    shiftPreferences: stage8Data.shiftPreferences || stage1.shiftPreference || "Day shift · US Night shift · Open to rotational",
    workModes: stage8Data.workModes || "Onsite · Hybrid · Remote (all 3 open)",
    availability: stage8Data.availability || (stage1.noticePeriod ? `Notice Period: ${stage1.noticePeriod}` : "Available immediately"),
  });

  // Modal for editing preferences
  const [editingPrefKey, setEditingPrefKey] = useState(null);
  const [prefEditValue, setPrefEditValue] = useState("");

  function handleOpenPrefEdit(key, currentVal) {
    setEditingPrefKey(key);
    setPrefEditValue(currentVal);
  }

  function handleSavePrefEdit() {
    if (editingPrefKey) {
      setPreferences((prev) => ({ ...prev, [editingPrefKey]: prefEditValue }));
      toast("Preference updated!", "✓");
      setEditingPrefKey(null);
    }
  }

  // 3 DPDP Consents State
  const [consents, setConsents] = useState({
    verifiedPool: true,
    interviewTracking: true,
    lifetimePassport: true,
  });

  const allConsented = consents.verifiedPool && consents.interviewTracking && consents.lifetimePassport;

  // Go Live activation state
  const [isLiveActive, setIsLiveActive] = useState(() => Boolean(candidateObj.isSubmitted || stage8Data.isLive || candidateObj.completedStages?.includes(8)));
  const [activating, setActivating] = useState(false);

  // Handle Go Live for Hiring
  async function handleGoLive(e) {
    if (e) e.preventDefault();
    if (!allConsented) {
      toast("Please check all DPDP consent boxes before launching your Career Passport.", "!");
      return;
    }

    setActivating(true);
    try {
      const payload = {
        consent: true,
        isLive: true,
        dpdpConsent: true,
        preferences,
        activatedAt: new Date(),
        totalPoints,
      };

      const res = await api.put("/candidate/stage/8", payload);
      // Also trigger candidate submit for verification pool enrollment
      await api.post("/candidate/submit").catch(() => {});

      setIsLiveActive(true);
      toast("🎊 CONGRATULATIONS! You are now LIVE in the Talentera Verified Pool!", "✓");

      if (onSaved) {
        onSaved(res.data, { advance: false, nextStage: null });
      }
    } catch (err) {
      console.error("Failed to go live:", err);
      toast(err.response?.data?.message || "Failed to activate Career Passport. Please try again.", "!");
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="stage8-root" style={{ color: "#3A425A", fontSize: 14, lineHeight: 1.5 }}>
      <style>{`
        .stage8-root * { box-sizing: border-box; }
        .s8-shell { display: grid; grid-template-columns: 1fr 320px; gap: 24px; min-width: 0; }
        @media (max-width: 1100px) { .s8-shell { grid-template-columns: 1fr; } }
        
        .s8-hero {
          background: linear-gradient(135deg, #0F1B3D 0%, #1E3A8A 50%, #2A54B5 100%);
          color: #FFFFFF;
          border-radius: 18px;
          padding: 34px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 20px;
          box-shadow: 0 8px 30px rgba(15,27,61,.25);
        }
        .s8-hero::before {
          content: '';
          position: absolute;
          right: -100px;
          top: -100px;
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, rgba(245,180,26,.22), transparent 60%);
        }
        .s8-hero::after {
          content: '';
          position: absolute;
          left: -60px;
          bottom: -60px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(31,122,60,.2), transparent 60%);
        }
        .s8-hero-icon {
          width: 64px;
          height: 64px;
          background: #F5B41A;
          color: #0F1B3D;
          border-radius: 16px;
          display: grid;
          place-items: center;
          font-size: 32px;
          margin-bottom: 16px;
          box-shadow: 0 6px 20px rgba(245,180,26,.4);
          position: relative;
        }
        .s8-hero-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; position: relative; }
        .s8-hero-chip {
          background: rgba(255,255,255,.14);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          backdrop-filter: blur(6px);
        }
        .s8-hero-chip.green { background: rgba(31,122,60,.35); color: #7ED87E; }
        .s8-hero-chip.gold { background: #F5B41A; color: #0F1B3D; }
        .s8-hero-title { font-size: 52px; font-weight: 800; letter-spacing: -1.5px; margin: 0; line-height: 1; position: relative; color: #FFFFFF !important; }
        .s8-hero-subtitle { color: #F5B41A !important; font-style: italic; font-size: 19px; margin-top: 8px; font-weight: 600; position: relative; }
        .s8-hero-desc { color: rgba(255,255,255,.9) !important; font-size: 14.5px; margin-top: 18px; max-width: 680px; line-height: 1.65; position: relative; }
        .s8-hero-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 24px; position: relative; }
        @media (max-width: 768px) { .s8-hero-tiles { grid-template-columns: 1fr 1fr; } }
        .s8-hero-tile {
          background: rgba(255,255,255,.14);
          padding: 18px 14px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid rgba(255,255,255,.1);
          backdrop-filter: blur(8px);
        }
        .s8-hero-tile .big { font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -.3px; }
        .s8-hero-tile .big.gold { color: #F5B41A; }
        .s8-hero-tile .small { font-size: 11px; color: rgba(255,255,255,.75); margin-top: 3px; letter-spacing: .3px; }

        /* CELEBRATION BANNER */
        .s8-celebrate-banner {
          background: linear-gradient(135deg, #FFF6E0, #FFF9E0);
          border: 2px solid #F5B41A;
          border-radius: 16px;
          padding: 26px 30px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 26px;
          align-items: center;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 800px) { .s8-celebrate-banner { grid-template-columns: 1fr; } }
        .s8-celebrate-score {
          width: 130px;
          height: 130px;
          background: conic-gradient(#F5B41A 0deg 360deg, #F2F3F5 360deg);
          border-radius: 50%;
          display: grid;
          place-items: center;
          position: relative;
          box-shadow: 0 8px 24px rgba(245,180,26,.35);
          flex-shrink: 0;
        }
        .s8-celebrate-score-inner { width: 104px; height: 104px; background: #FFFFFF; border-radius: 50%; display: grid; place-items: center; }
        .s8-celebrate-score-big { font-size: 38px; font-weight: 800; color: #0F1B3D; line-height: 1; }
        .s8-celebrate-score-small { font-size: 11px; color: #C99413; font-weight: 800; margin-top: 2px; letter-spacing: .5px; text-transform: uppercase; }
        .s8-celebrate-txt .lbl { color: #C99413; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
        .s8-celebrate-txt .title { font-size: 26px; color: #0F1B3D; font-weight: 800; margin-top: 6px; line-height: 1.15; }
        .s8-celebrate-txt .sub { font-size: 13px; color: #3A425A; margin-top: 6px; line-height: 1.5; }
        .s8-celebrate-badges { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
        @media (max-width: 800px) { .s8-celebrate-badges { align-items: flex-start; flex-direction: row; flex-wrap: wrap; } }
        .s8-medal-mini { display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1.5px solid #F5B41A; padding: 5px 12px; border-radius: 16px; font-size: 11.5px; font-weight: 800; color: #0F1B3D; }

        .s8-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 24px 26px;
          box-shadow: 0 2px 10px rgba(15,27,61,.05);
          margin-bottom: 18px;
          border: 1px solid #E5E7EB;
        }
        .s8-card-title { font-size: 20px; font-weight: 800; color: #0F1B3D; margin: 0; }
        .s8-card-eyebrow { font-size: 10.5px; letter-spacing: 1.5px; color: #C99413; text-transform: uppercase; font-weight: 700; margin-top: 8px; }

        .s8-rules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
        @media (max-width: 768px) { .s8-rules-grid { grid-template-columns: 1fr; } }
        .s8-rule-tile { background: #FFF6E0; padding: 16px 18px; border-radius: 12px; border-left: 4px solid #F5B41A; }
        .s8-rule-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .s8-rule-ico { width: 32px; height: 32px; background: #F5B41A; color: #0F1B3D; border-radius: 50%; display: grid; place-items: center; font-size: 15px; font-weight: 700; }
        .s8-rule-title { font-size: 13.5px; font-weight: 800; color: #0F1B3D; }
        .s8-rule-body { font-size: 12.5px; color: #3A425A; line-height: 1.55; }
        .s8-consent-pill { background: #0F1B3D; color: #FFF6E0; padding: 12px 16px; border-radius: 12px; font-style: italic; font-size: 12.5px; margin-top: 16px; display: flex; align-items: center; gap: 10px; }

        .s8-section { background: #FAFAF7; padding: 24px 26px; border-radius: 14px; margin-bottom: 16px; border: 1px solid #E5E7EB; }
        .s8-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px dashed #E5E7EB; }
        .s8-section-num { width: 32px; height: 32px; background: #F5B41A; color: #0F1B3D; border-radius: 10px; display: grid; place-items: center; font-weight: 800; font-size: 15px; }
        .s8-section-title { font-size: 16px; font-weight: 800; color: #0F1B3D; flex: 1; }
        .s8-no-pts-chip { background: #F2F3F5; color: #8A91A3; padding: 3px 10px; border-radius: 12px; font-size: 10.5px; font-weight: 700; letter-spacing: .5px; font-style: italic; }

        /* STAGE SUMMARY GRID */
        .s8-stage-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        @media (max-width: 768px) { .s8-stage-summary-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 500px) { .s8-stage-summary-grid { grid-template-columns: 1fr; } }
        .s8-stage-summary-tile { background: #FFFFFF; border: 1.5px solid #1F7A3C; border-radius: 12px; padding: 12px 14px; position: relative; }
        .s8-stage-summary-tile::before {
          content: '✓';
          position: absolute;
          top: 10px;
          right: 10px;
          background: #1F7A3C;
          color: #FFFFFF;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 800;
        }
        .s8-stage-summary-tile .num { font-size: 9px; color: #8A91A3; letter-spacing: 1px; font-weight: 800; text-transform: uppercase; }
        .s8-stage-summary-tile .name { font-size: 13.5px; color: #0F1B3D; font-weight: 800; margin-top: 3px; }
        .s8-stage-summary-tile .val { font-size: 11.5px; color: #3A425A; margin-top: 5px; font-weight: 600; }
        .s8-stage-summary-tile .badge { font-size: 10px; color: #1F7A3C; font-weight: 800; margin-top: 4px; }

        /* MATCH MEGA CARD */
        .s8-match-mega {
          background: linear-gradient(135deg, #0F1B3D, #1E3A8A);
          color: #FFFFFF;
          border-radius: 14px;
          padding: 22px 26px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 22px;
          align-items: center;
          position: relative;
          overflow: hidden;
          margin-top: 12px;
        }
        @media (max-width: 800px) { .s8-match-mega { grid-template-columns: 1fr; } }
        .s8-match-mega-num { font-size: 52px; font-weight: 800; color: #F5B41A; line-height: 1; font-family: Georgia, serif; position: relative; }
        .s8-match-mega-txt .lbl { color: #F5B41A; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; }
        .s8-match-mega-txt .title { font-size: 20px; font-weight: 800; margin-top: 4px; }
        .s8-match-mega-txt .sub { font-size: 12.5px; color: rgba(255,255,255,.8); margin-top: 4px; line-height: 1.5; }
        .s8-match-mega-mini-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,.8); margin-bottom: 4px; }
        .s8-match-mega-mini-row .dot { width: 8px; height: 8px; background: #F5B41A; border-radius: 50%; }
        .s8-match-mega-mini-row b { color: #F5B41A; font-weight: 800; }

        /* PREFERENCE ROWS */
        .s8-pref-list { display: flex; flex-direction: column; gap: 10px; }
        .s8-pref-row {
          background: #FFFFFF;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          padding: 14px 16px;
          display: grid;
          grid-template-columns: 32px 1fr auto;
          gap: 14px;
          align-items: center;
        }
        .s8-pref-ico { width: 32px; height: 32px; background: #FFF6E0; color: #C99413; border-radius: 8px; display: grid; place-items: center; font-size: 15px; }
        .s8-pref-info .lbl { font-size: 11px; color: #8A91A3; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
        .s8-pref-info .val { font-size: 13.5px; color: #0F1B3D; font-weight: 800; margin-top: 2px; }
        .s8-pref-edit {
          color: #C99413;
          font-size: 11px;
          font-weight: 800;
          background: #FFF6E0;
          border: 1px solid #FFEBB0;
          padding: 5px 12px;
          border-radius: 8px;
          cursor: pointer;
        }
        .s8-pref-edit:hover { background: #F5B41A; color: #0F1B3D; }

        /* CONSENT */
        .s8-consent-list { display: flex; flex-direction: column; gap: 10px; }
        .s8-consent-item {
          display: grid;
          grid-template-columns: 24px 1fr;
          gap: 12px;
          padding: 14px 16px;
          background: #FFFFFF;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          cursor: pointer;
          transition: .15s;
        }
        .s8-consent-item:hover { border-color: #FFEBB0; background: #FDF6E4; }
        .s8-consent-item.checked { border-color: #1F7A3C; background: #E8F5E9; }
        .s8-consent-box { width: 22px; height: 22px; border: 2px solid #E5E7EB; border-radius: 5px; display: grid; place-items: center; margin-top: 1px; }
        .s8-consent-item.checked .s8-consent-box { background: #1F7A3C; border-color: #1F7A3C; color: #FFFFFF; font-weight: 800; font-size: 14px; }
        .s8-consent-item .txt { font-size: 13px; color: #0F1B3D; line-height: 1.5; }
        .s8-consent-item .sub { font-size: 11.5px; color: #8A91A3; margin-top: 4px; font-style: italic; line-height: 1.5; }

        /* THE GO LIVE BUTTON */
        .s8-go-live-block {
          background: linear-gradient(135deg, #0F1B3D, #1E3A8A);
          color: #FFFFFF;
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          margin-top: 20px;
          position: relative;
          overflow: hidden;
        }
        .s8-go-live-kicker { color: #F5B41A; font-size: 11.5px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
        .s8-go-live-title { font-size: 30px; font-weight: 800; margin: 8px 0 6px; line-height: 1.1; }
        .s8-go-live-sub { font-size: 14px; color: #FFF6E0; font-style: italic; }
        .s8-go-live-btn {
          background: linear-gradient(135deg, #F5B41A, #DAA520);
          color: #0F1B3D;
          padding: 20px 60px;
          border-radius: 14px;
          font-size: 22px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          letter-spacing: 1px;
          margin-top: 22px;
          box-shadow: 0 10px 30px rgba(245,180,26,.5);
          text-transform: uppercase;
          transition: transform .15s ease;
        }
        .s8-go-live-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 34px rgba(245,180,26,.6); }
        .s8-go-live-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }

        /* SUCCESS SCREEN */
        .s8-success-screen {
          background: linear-gradient(135deg, #EAFBEE, #F5FDF9);
          border: 2px solid #1F7A3C;
          border-radius: 16px;
          padding: 34px;
          text-align: center;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }
        .s8-success-check { width: 74px; height: 74px; background: #1F7A3C; color: #FFFFFF; border-radius: 50%; display: grid; place-items: center; font-size: 38px; margin: 0 auto 14px; box-shadow: 0 8px 20px rgba(31,122,60,.35); }
        .s8-success-title { font-size: 28px; font-weight: 800; color: #0F1B3D; }
        .s8-success-sub { font-size: 15px; color: #3A425A; margin-top: 8px; line-height: 1.5; }

        /* POST ACTIVATION MODULES */
        .s8-post-modules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; }
        @media (max-width: 768px) { .s8-post-modules-grid { grid-template-columns: 1fr; } }
        .s8-post-module { background: #FFFFFF; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 18px 20px; min-height: 180px; display: flex; flex-direction: column; }
        .s8-post-module-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .s8-post-module-head .ico { width: 38px; height: 38px; background: #FFF6E0; color: #C99413; border-radius: 10px; display: grid; place-items: center; font-size: 18px; }
        .s8-post-module-name { font-size: 15px; font-weight: 800; color: #0F1B3D; }
        .s8-post-module-badge { background: #C0392B; color: #FFFFFF; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: .5px; }
        .s8-post-module-badge.new { background: #1F7A3C; }
        .s8-post-module-badge.gold { background: #F5B41A; color: #0F1B3D; }
        .s8-app-tracker-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 8px 0; border-bottom: 1px dashed #E5E7EB; align-items: center; font-size: 12.5px; }
        .s8-app-tracker-row:last-child { border: none; }
        .s8-app-tracker-row .co { font-weight: 800; color: #0F1B3D; }
        .s8-app-tracker-row .stage { font-size: 11px; color: #8A91A3; margin-top: 2px; }
        .s8-status-dot { padding: 3px 10px; border-radius: 12px; font-size: 10.5px; font-weight: 800; letter-spacing: .4px; }
        .s8-status-dot.shortlisted { background: #FFF6E0; color: #C99413; }
        .s8-status-dot.interviewed { background: #EEF2FF; color: #1A4FB8; }
        .s8-status-dot.pending { background: #F2F3F5; color: #8A91A3; }
        .s8-empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px 10px; text-align: center; color: #8A91A3; font-size: 12.5px; }

        /* BUTTONS */
        .s8-action-btn { background: #F5B41A; color: #0F1B3D; padding: 11px 22px; border-radius: 10px; font-size: 13px; font-weight: 800; border: none; cursor: pointer; letter-spacing: .3px; }
        .s8-action-btn:hover { background: #FFEBB0; }
        .s8-link-btn { background: #FFFFFF; color: #3A425A; padding: 11px 20px; border-radius: 10px; font-size: 13px; font-weight: 700; border: 1.5px solid #E5E7EB; cursor: pointer; }
        .s8-link-btn:hover { background: #F9FAFB; }

        /* RIGHT COMPANION */
        .s8-right-rail { min-width: 0; }
        .s8-passport-card {
          background: linear-gradient(135deg, #0F1B3D, #1E3A8A);
          color: #FFFFFF;
          padding: 20px;
          border-radius: 14px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        .s8-passport-eyebrow { color: #F5B41A; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
        .s8-passport-title { font-size: 20px; font-weight: 800; margin-top: 4px; }
        .s8-passport-status { background: rgba(31,122,60,.28); color: #7ED87E; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; margin-top: 12px; display: inline-block; letter-spacing: .5px; }
        .s8-passport-desc { font-size: 11.5px; color: rgba(255,255,255,.75); margin-top: 10px; line-height: 1.5; }

        .s8-side-card { background: #FFFFFF; padding: 16px 18px; border-radius: 12px; margin-bottom: 14px; border: 1px solid #E5E7EB; }
        .s8-side-card .title { font-size: 11px; letter-spacing: 1.5px; color: #C99413; text-transform: uppercase; font-weight: 700; margin-bottom: 10px; }
        .s8-company-row { display: grid; grid-template-columns: 38px 1fr; gap: 10px; padding: 10px 0; border-bottom: 1px dashed #E5E7EB; align-items: center; }
        .s8-company-row:last-child { border: none; padding-bottom: 0; }
        .s8-company-row:first-child { padding-top: 0; }
        .s8-company-logo { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; font-weight: 800; font-size: 15px; color: #FFFFFF; }
        .s8-clr-1 { background: linear-gradient(135deg, #F5B41A, #C99413); }
        .s8-clr-2 { background: linear-gradient(135deg, #1A4FB8, #0F1B3D); }
        .s8-clr-3 { background: linear-gradient(135deg, #2E8B57, #1F7A3C); }
        .s8-clr-4 { background: linear-gradient(135deg, #8E44AD, #6D2C82); }
        .s8-clr-5 { background: linear-gradient(135deg, #E67E22, #C0392B); }
        .s8-company-name { font-size: 12.5px; font-weight: 800; color: #0F1B3D; display: flex; align-items: center; gap: 5px; }
        .s8-hot-pill { background: #C0392B; color: #FFFFFF; padding: 1px 6px; border-radius: 6px; font-size: 8.5px; letter-spacing: .5px; font-weight: 800; }
        .s8-company-meta { font-size: 10.5px; color: #8A91A3; margin-top: 1px; }
        .s8-verified-line { font-size: 10px; color: #1F7A3C; margin-top: 4px; font-weight: 700; }
        .s8-hot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .s8-hot-stat { background: #FFF6E0; padding: 12px; border-radius: 10px; text-align: center; }
        .s8-hot-stat .big { font-size: 18px; font-weight: 800; color: #0F1B3D; }
        .s8-hot-stat .small { font-size: 10px; color: #3A425A; margin-top: 2px; }
      `}</style>

      {/* Main Layout Grid */}
      <div className="s8-shell">
        {/* Left / Center Main Content */}
        <div className="s8-main-column">
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#8A91A3", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, fontWeight: 600 }}>
            <span>Home</span><span>›</span>
            <span>My Career Passport</span><span>›</span>
            <span style={{ color: "#0F1B3D", fontWeight: 800 }}>Stage 08 · Go Live</span>
          </div>

          {/* Hero Banner */}
          <div className="s8-hero">
            <div className="s8-hero-icon">🚀</div>
            <div className="s8-hero-badges">
              <span className="s8-hero-chip">STAGE 08 OF 08 · FINAL</span>
              <span className="s8-hero-chip green">🏆 {totalPoints}/100 UNLOCKED</span>
              <span className="s8-hero-chip gold">{isLiveActive ? "🟢 LIVE FOR HIRING" : "READY TO LAUNCH"}</span>
            </div>
            <h1 className="s8-hero-title">Go Live</h1>
            <div className="s8-hero-subtitle">You've built it. Now let the industry find you.</div>
            <div className="s8-hero-desc">
              Every stage complete. Every credential verified. Your Career Passport is ready.
              One click and you're visible to verified RCM companies across India,
              US and Middle East. Talentera's matching engine routes your verified profile to active
              HR desks in real time.
            </div>
            <div className="s8-hero-tiles">
              <div className="s8-hero-tile"><div className="big gold">{realCompaniesCount}</div><div className="small">active hiring partners</div></div>
              <div className="s8-hero-tile"><div className="big">{realOpenRoles}</div><div className="small">open roles in pool</div></div>
              <div className="s8-hero-tile"><div className="big">1 click</div><div className="small">to go live for hiring</div></div>
              <div className="s8-hero-tile"><div className="big">Lifetime</div><div className="small">account, never expires</div></div>
            </div>
          </div>

          {/* Celebration Banner */}
          <div className="s8-celebrate-banner">
            <div className="s8-celebrate-score">
              <div className="s8-celebrate-score-inner">
                <div style={{ textAlign: "center" }}>
                  <div className="s8-celebrate-score-big">{totalPoints}</div>
                  <div className="s8-celebrate-score-small">of 100</div>
                </div>
              </div>
            </div>
            <div className="s8-celebrate-txt">
              <div className="lbl">🎊 Career Passport Complete</div>
              <div className="title">{firstName}, you did it.</div>
              <div className="sub">
                Every verifiable proof — from Aadhaar to {certsSummary} to {totalCharts} Live Chart entries — has been captured and validated. You're now in the top tier of RCM specialists. Time to make it public.
              </div>
            </div>
            <div className="s8-celebrate-badges">
              <span className="s8-medal-mini">{assessmentMedal === "Gold" ? "🥇" : "🥈"} {assessmentMedal} Assessment</span>
              <span className="s8-medal-mini">{videoMedal === "Gold" ? "🥇" : "🥈"} {videoMedal} Video Pitch</span>
              <span className="s8-medal-mini">{chartTier === "Gold" ? "🥇" : "🥈"} {chartTier} Live Chart</span>
              <span className="s8-medal-mini">🏆 Talentera Verified</span>
            </div>
          </div>

          {/* Success Screen if already activated or clicked Go Live */}
          {isLiveActive && (
            <div className="s8-success-screen">
              <div className="s8-success-check">✓</div>
              <div className="s8-success-title">🎊 You're LIVE, {firstName}!</div>
              <div className="s8-success-sub">
                Your Career Passport is now discoverable across the Talentera Verified Network.<br />
                Matching engine is active · Application Tracker is live · Instant shortlist queue enabled.
              </div>
            </div>
          )}

          {/* How Stage 08 Works Card */}
          <div className="s8-card">
            <div className="s8-card-title">How Stage 08 Works</div>
            <div className="s8-card-eyebrow">WHY THIS STAGE · WHAT HAPPENS · WHAT COMPANIES SEE · YOUR RIGHTS</div>
            <div className="s8-rules-grid">
              <div className="s8-rule-tile">
                <div className="s8-rule-head"><div className="s8-rule-ico">?</div><div className="s8-rule-title">Why we ask you here</div></div>
                <div className="s8-rule-body">
                  DPDP Act (India Data Protection) requires explicit consent before your profile becomes visible to third parties. Stage 08 is where you review exactly what companies will see and formally consent. Legal requirement — not busywork.
                </div>
              </div>
              <div className="s8-rule-tile">
                <div className="s8-rule-head"><div className="s8-rule-ico">🚀</div><div className="s8-rule-title">What happens when you click GO LIVE</div></div>
                <div className="s8-rule-body">
                  Your profile flips from "building" → "LIVE." Talentera's matching engine starts routing you to relevant HR desks. Live employer matches activate immediately. Application Tracker activates.
                </div>
              </div>
              <div className="s8-rule-tile">
                <div className="s8-rule-head"><div className="s8-rule-ico">👁</div><div className="s8-rule-title">What companies see about you</div></div>
                <div className="s8-rule-body">
                  Your Resume (Stage 07). Your live scorecards. Your specialty chart counts. Your Aadhaar-verified name + city (never full address). Your CPC + CDC IDs (last 4 only). Everything you've proved — nothing else.
                </div>
              </div>
              <div className="s8-rule-tile">
                <div className="s8-rule-head"><div className="s8-rule-ico">🛡</div><div className="s8-rule-title">Your rights &amp; controls</div></div>
                <div className="s8-rule-body">
                  Pause visibility anytime (goes back to "building"). Update any stage → resume + profile auto-refresh. Right-to-be-forgotten honored per DPDP Act. Anonymize past interviews. Full deletion on request.
                </div>
              </div>
            </div>
            <div className="s8-consent-pill">
              <span style={{ color: "#F5B41A", fontSize: 16 }}>🔐</span>
              <span><i>Once live, your Talentera account becomes your lifetime Career Passport — updates itself with every job, every promotion, every new cert. Created once. Trusted forever.</i></span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0F1B3D", margin: 0 }}>Your Stage 08 information</h2>
            <div style={{ color: "#C99413", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 6 }}>
              REVIEW · CONSENT · LAUNCH · ZERO POINTS · LIFETIME ACCOUNT
            </div>
          </div>

          {/* SECTION 1 · PROFILE SUMMARY */}
          <div className="s8-section">
            <div className="s8-section-header">
              <div className="s8-section-num">1</div>
              <div className="s8-section-title">Your Final Profile — everything you've built</div>
              <div className="s8-no-pts-chip">REVIEW ONLY</div>
            </div>

            <div className="s8-stage-summary-grid">
              <div className="s8-stage-summary-tile">
                <div className="num">Stage 01</div>
                <div className="name">Identity</div>
                <div className="val">{fullName}{locality ? ` · ${locality}` : ""}</div>
                <div className="badge">🟢 {stage1.aadhaarVerified ? "Aadhaar Verified" : "Profile Complete"}</div>
              </div>
              <div className="s8-stage-summary-tile">
                <div className="num">Stage 02</div>
                <div className="name">Foundation</div>
                <div className="val">{academyName} · {trainingSpecialties}</div>
                <div className="badge">🟢 Academy-Signed{trainingAssessmentScore ? ` · ${trainingAssessmentScore}/100` : ""}</div>
              </div>
              <div className="s8-stage-summary-tile">
                <div className="num">Stage 03</div>
                <div className="name">Certification</div>
                <div className="val">{certsSummary}</div>
                <div className="badge">🟢 {certificationsList.length > 0 ? `${certificationsList.length} certs · API-Verified` : "Validated Track"}</div>
              </div>
              <div className="s8-stage-summary-tile">
                <div className="num">Stage 04</div>
                <div className="name">Assessment</div>
                <div className="val">{assessmentMedal} · {assessmentScore !== null ? `${assessmentScore} / 100` : "Passed"}</div>
                <div className="badge">🟢 Talentera-Proctored</div>
              </div>
              <div className="s8-stage-summary-tile">
                <div className="num">Stage 05</div>
                <div className="name">Video Pitch</div>
                <div className="val">{videoMedal} · {videoScore !== null ? `${videoScore} / 100` : "Completed"}</div>
                <div className="badge">🟢 Live Verified{regionalLang ? ` · + ${regionalLang}` : ""}</div>
              </div>
              <div className="s8-stage-summary-tile">
                <div className="num">Stage 06</div>
                <div className="name">Live Chart</div>
                <div className="val">{chartTier} · {totalCharts} charts · {Math.round(overallAccuracy)}%</div>
                <div className="badge">🟢 API-Linked · Audited</div>
              </div>
            </div>

            {/* Match count mega */}
            <div className="s8-match-mega">
              <div className="s8-match-mega-num">{realCompaniesCount}</div>
              <div className="s8-match-mega-txt">
                <div className="lbl">MATCHING RCM EMPLOYERS</div>
                <div className="title">{realCompaniesCount > 0 ? `${realCompaniesCount} companies hiring across ${realOpenRoles} open roles` : "Matching engine ready for live broadcast"}</div>
                <div className="sub">Based on your verified specialties, audited charts, certifications, and location preferences. Talentera's matching engine connects you to verified employer desks.</div>
              </div>
              <div className="s8-match-mega-mini">
                <div className="s8-match-mega-mini-row"><span className="dot"></span>Active Verified Employers · <b>{realCompaniesCount} partners</b></div>
                <div className="s8-match-mega-mini-row"><span className="dot"></span>Open Positions · <b>{realOpenRoles} roles</b></div>
                <div className="s8-match-mega-mini-row"><span className="dot"></span>Network Activity · <b>{tickerData?.lastHire || "Live"}</b></div>
              </div>
            </div>
          </div>

          {/* SECTION 2 · MATCH PREFERENCES */}
          <div className="s8-section">
            <div className="s8-section-header">
              <div className="s8-section-num">2</div>
              <div className="s8-section-title">Confirm your match preferences</div>
              <div className="s8-no-pts-chip">TUNE BEFORE LAUNCH</div>
            </div>

            <div style={{ fontSize: 12.5, color: "#3A425A", marginBottom: 12, fontStyle: "italic" }}>
              Pulled from your database records. You can adjust anything one last time before going live — after that, updates apply immediately.
            </div>

            <div className="s8-pref-list">
              <div className="s8-pref-row">
                <div className="s8-pref-ico">📍</div>
                <div className="s8-pref-info">
                  <div className="lbl">Willing to work in</div>
                  <div className="val">{preferences.willingToWorkIn}</div>
                </div>
                <button type="button" onClick={() => handleOpenPrefEdit("willingToWorkIn", preferences.willingToWorkIn)} className="s8-pref-edit">
                  ✎ Edit
                </button>
              </div>

              <div className="s8-pref-row">
                <div className="s8-pref-ico">🌍</div>
                <div className="s8-pref-info">
                  <div className="lbl">Global markets</div>
                  <div className="val">{preferences.globalMarkets}</div>
                </div>
                <button type="button" onClick={() => handleOpenPrefEdit("globalMarkets", preferences.globalMarkets)} className="s8-pref-edit">
                  ✎ Edit
                </button>
              </div>

              <div className="s8-pref-row">
                <div className="s8-pref-ico">💰</div>
                <div className="s8-pref-info">
                  <div className="lbl">Expected salary band</div>
                  <div className="val">{preferences.expectedSalary}</div>
                </div>
                <button type="button" onClick={() => handleOpenPrefEdit("expectedSalary", preferences.expectedSalary)} className="s8-pref-edit">
                  ✎ Edit
                </button>
              </div>

              <div className="s8-pref-row">
                <div className="s8-pref-ico">⏰</div>
                <div className="s8-pref-info">
                  <div className="lbl">Shift preferences</div>
                  <div className="val">{preferences.shiftPreferences}</div>
                </div>
                <button type="button" onClick={() => handleOpenPrefEdit("shiftPreferences", preferences.shiftPreferences)} className="s8-pref-edit">
                  ✎ Edit
                </button>
              </div>

              <div className="s8-pref-row">
                <div className="s8-pref-ico">🏢</div>
                <div className="s8-pref-info">
                  <div className="lbl">Work mode</div>
                  <div className="val">{preferences.workModes}</div>
                </div>
                <button type="button" onClick={() => handleOpenPrefEdit("workModes", preferences.workModes)} className="s8-pref-edit">
                  ✎ Edit
                </button>
              </div>

              <div className="s8-pref-row">
                <div className="s8-pref-ico">🚀</div>
                <div className="s8-pref-info">
                  <div className="lbl">Availability</div>
                  <div className="val">{preferences.availability}</div>
                </div>
                <button type="button" onClick={() => handleOpenPrefEdit("availability", preferences.availability)} className="s8-pref-edit">
                  ✎ Edit
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3 · DPDP CONSENT + GO LIVE */}
          <div className="s8-section">
            <div className="s8-section-header">
              <div className="s8-section-num">3</div>
              <div className="s8-section-title">DPDP Consent · your explicit permission to go live</div>
              <div className="s8-no-pts-chip">LEGAL REQUIRED</div>
            </div>

            <div className="s8-consent-list">
              <div
                onClick={() => setConsents((prev) => ({ ...prev, verifiedPool: !prev.verifiedPool }))}
                className={`s8-consent-item ${consents.verifiedPool ? "checked" : ""}`}
              >
                <div className="s8-consent-box">{consents.verifiedPool ? "✓" : ""}</div>
                <div>
                  <div className="txt"><b>I consent to my verified profile being visible in the Talentera Verified Pool.</b></div>
                  <div className="sub">Matched RCM companies can view my resume + scorecards. They see verified data only — never my Aadhaar number, PAN, full address, or private contact until they formally shortlist and I accept.</div>
                </div>
              </div>

              <div
                onClick={() => setConsents((prev) => ({ ...prev, interviewTracking: !prev.interviewTracking }))}
                className={`s8-consent-item ${consents.interviewTracking ? "checked" : ""}`}
              >
                <div className="s8-consent-box">{consents.interviewTracking ? "✓" : ""}</div>
                <div>
                  <div className="txt"><b>I consent to Talentera auto-tracking every interview I attend through the platform.</b></div>
                  <div className="sub">The Application Tracker logs each company interaction: round, date, result, feedback. Other companies see only anonymized aggregate ("3 applications · 1 shortlist"), never specific feedback or salary offers — protects my hiring momentum.</div>
                </div>
              </div>

              <div
                onClick={() => setConsents((prev) => ({ ...prev, lifetimePassport: !prev.lifetimePassport }))}
                className={`s8-consent-item ${consents.lifetimePassport ? "checked" : ""}`}
              >
                <div className="s8-consent-box">{consents.lifetimePassport ? "✓" : ""}</div>
                <div>
                  <div className="txt"><b>I understand my Talentera account is lifetime — updates itself as my career progresses.</b></div>
                  <div className="sub">Every future job, promotion, cert renewal, and chart practice updates my Career Passport automatically. I can pause visibility, edit preferences, or request full deletion anytime.</div>
                </div>
              </div>
            </div>

            {/* THE GO LIVE BUTTON */}
            <div className="s8-go-live-block">
              <div className="s8-go-live-kicker">{isLiveActive ? "Status: Live & Active" : "Final Step · Ready to Launch"}</div>
              <div className="s8-go-live-title">{isLiveActive ? "Your Career Passport is Live!" : "Ready to make it public?"}</div>
              <div className="s8-go-live-sub">One click. {realCompaniesCount} hiring partners. Career Passport activated.</div>
              <button
                type="button"
                onClick={handleGoLive}
                disabled={activating || !allConsented}
                className="s8-go-live-btn"
              >
                {activating ? "Activating..." : isLiveActive ? "✓ LIVE FOR HIRING" : "🚀 GO LIVE FOR HIRING"}
              </button>
              <div className="s8-go-live-note">
                You can pause visibility anytime after going live. This is not a permanent commitment — it's just the moment your profile becomes discoverable.
              </div>
            </div>
          </div>

          {/* POST-ACTIVATION DASHBOARD MODULES */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#C99413", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
              🆕 Your Live Dashboard Modules
            </div>

            <div className="s8-post-modules-grid">
              {/* Application Tracker */}
              <div className="s8-post-module">
                <div className="s8-post-module-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="ico">📊</div>
                    <div className="s8-post-module-name">Application Tracker</div>
                  </div>
                  <span className="s8-post-module-badge new">{candidateApps.length > 0 ? `${candidateApps.length} ACTIVE` : "LIVE"}</span>
                </div>
                {candidateApps.length > 0 ? (
                  candidateApps.slice(0, 4).map((app, idx) => (
                    <div key={app._id || idx} className="s8-app-tracker-row">
                      <div>
                        <div className="co">{app.companyName || app.companyId?.companyName || "Employer"} — {app.jobTitle || app.role || "Medical Coder"}</div>
                        <div className="stage">Status: {app.status || "Applied"} · {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "Active"}</div>
                      </div>
                      <span className={`s8-status-dot ${app.status === "shortlisted" ? "shortlisted" : app.status === "interviewing" ? "interviewed" : "pending"}`}>
                        {app.status || "Applied"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="s8-empty-state">
                    <div style={{ fontSize: 24, marginBottom: 4 }}>📭</div>
                    <div><b>No applications submitted yet.</b></div>
                    <div style={{ marginTop: 2, fontSize: 11 }}>Once your profile is Live, applications and matching pipelines appear here in real time.</div>
                  </div>
                )}
              </div>

              {/* Company Shortlists */}
              <div className="s8-post-module">
                <div className="s8-post-module-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="ico">📩</div>
                    <div className="s8-post-module-name">Company Shortlists</div>
                  </div>
                  <span className={`s8-post-module-badge ${shortlistedApps.length > 0 ? "new" : "gold"}`}>
                    {shortlistedApps.length > 0 ? `${shortlistedApps.length} NEW` : "POOL READY"}
                  </span>
                </div>
                {shortlistedApps.length > 0 ? (
                  shortlistedApps.map((app, idx) => (
                    <div key={app._id || idx} className="s8-app-tracker-row">
                      <div>
                        <div className="co">{app.companyName || app.companyId?.companyName || "Employer"} · {app.jobTitle || "Specialist"}</div>
                        <div className="stage">{app.salary || "Competitive"} · Shortlisted your profile</div>
                      </div>
                      <span className="s8-status-dot shortlisted">🟡 Shortlisted</span>
                    </div>
                  ))
                ) : (
                  <div className="s8-empty-state">
                    <div style={{ fontSize: 24, marginBottom: 4 }}>🎯</div>
                    <div><b>No employer shortlists yet.</b></div>
                    <div style={{ marginTop: 2, fontSize: 11 }}>Verified employers browsing the candidate pool will appear here when they shortlist you.</div>
                  </div>
                )}
              </div>

              {/* Interview Invites */}
              <div className="s8-post-module">
                <div className="s8-post-module-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="ico">📬</div>
                    <div className="s8-post-module-name">Interview Invites</div>
                  </div>
                  <span className={`s8-post-module-badge ${interviewApps.length > 0 ? "new" : "gold"}`}>
                    {interviewApps.length > 0 ? `${interviewApps.length} PENDING` : "ACTIVE"}
                  </span>
                </div>
                {interviewApps.length > 0 ? (
                  interviewApps.map((app, idx) => (
                    <div key={app._id || idx} className="s8-app-tracker-row">
                      <div>
                        <div className="co">{app.companyName || app.companyId?.companyName || "Employer"} · {app.interviewRound || "Round"}</div>
                        <div className="stage">{app.interviewDate ? new Date(app.interviewDate).toLocaleDateString() : "Schedule pending"} · Video Call</div>
                      </div>
                      <span className="s8-status-dot interviewed">🔵 Scheduled</span>
                    </div>
                  ))
                ) : (
                  <div className="s8-empty-state">
                    <div style={{ fontSize: 24, marginBottom: 4 }}>📅</div>
                    <div><b>No pending interview invites.</b></div>
                    <div style={{ marginTop: 2, fontSize: 11 }}>Scheduled interview rounds and video call appointments will be tracked here.</div>
                  </div>
                )}
              </div>

              {/* Feedback Vault */}
              <div className="s8-post-module">
                <div className="s8-post-module-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="ico">💬</div>
                    <div className="s8-post-module-name">Feedback Vault</div>
                  </div>
                  <span className="s8-post-module-badge new">PRIVATE</span>
                </div>
                {feedbackApps.length > 0 ? (
                  feedbackApps.map((app, idx) => (
                    <div key={app._id || idx} className="s8-app-tracker-row">
                      <div>
                        <div className="co">{app.companyName || app.companyId?.companyName || "Employer"} ({app.status || "Review"})</div>
                        <div className="stage" style={{ fontStyle: "italic" }}>"{app.feedback || app.coverNote || app.notes || "Profile evaluation in progress."}"</div>
                      </div>
                      <span style={{ fontSize: 11, color: "#8A91A3" }}>Private to you</span>
                    </div>
                  ))
                ) : (
                  <div className="s8-empty-state">
                    <div style={{ fontSize: 24, marginBottom: 4 }}>🔒</div>
                    <div><b>No feedback entries logged yet.</b></div>
                    <div style={{ marginTop: 2, fontSize: 11 }}>Private evaluation notes and round feedback will be saved securely to your vault.</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ background: "#EEF2FF", border: "1.5px solid #1A4FB8", borderRadius: 12, padding: "14px 18px", marginTop: 16, fontSize: 12.5, color: "#0F1B3D", lineHeight: 1.55 }}>
            🔒 <b>Feedback privacy:</b> Only YOU see specific company feedback and salary offers. Other companies see aggregate signals only (e.g., "3 applications · 1 shortlist · 1 hold") — never specific names or details. This protects your hiring momentum.
          </div>

          {/* Navigation Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20, marginBottom: 40 }}>
            <button type="button" onClick={() => onGoToDashboard ? onGoToDashboard() : (window.location.href = "/dashboard")} className="s8-link-btn">
              Go to My Dashboard
            </button>
            <button type="button" onClick={handleGoLive} disabled={activating || !allConsented} className="s8-action-btn" style={{ padding: "14px 28px", fontSize: 14 }}>
              {isLiveActive ? "✓ Go Live Active" : "🚀 Go Live Now"}
            </button>
          </div>
        </div>

        {/* Right Companion Rail */}
        <div className="s8-right-rail">
          {/* Career Passport Card */}
          <div className="s8-passport-card">
            <div className="s8-passport-eyebrow">CAREER PASSPORT</div>
            <div className="s8-passport-title">🏆 Talentera Verified</div>
            <div className="s8-passport-status">{isLiveActive ? "🟢 LIVE FOR HIRING" : "🚀 ONE CLICK FROM LIVE"}</div>
            <div className="s8-passport-desc">
              You've built a profile with {totalPoints}/100 trust points. Every claim verified. Every score real. Sourced directly from your authenticated credentials.
            </div>
          </div>

          {/* Companies Waiting */}
          <div className="s8-side-card">
            <div className="title">Active Hiring Partners ({realCompaniesCount})</div>

            {liveCompanies.length > 0 ? (
              liveCompanies.slice(0, 5).map((comp, idx) => (
                <div key={comp.id || comp._id || idx} className="s8-company-row">
                  <div className={`s8-company-logo s8-clr-${(idx % 5) + 1}`}>
                    {(comp.initial || comp.name || comp.companyName || "C")[0]}
                  </div>
                  <div>
                    <div className="s8-company-name">
                      {comp.name || comp.companyName} {comp.hot && <span className="s8-hot-pill">HIRING</span>}
                    </div>
                    <div className="s8-company-meta">{comp.location || "Pan-India"} · {comp.salary || "Competitive Band"} · {comp.openRoles ? `${comp.openRoles} open roles` : "Active"}</div>
                    <div className="s8-verified-line">{comp.note || "Verified hiring partner"}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "16px 8px", textAlign: "center", color: "#8A91A3", fontSize: "12px", fontStyle: "italic" }}>
                Connected to Talentera employer network.
              </div>
            )}
          </div>

          {/* Verification Highlights */}
          <div className="s8-side-card">
            <div className="title">Your Verification Stack</div>
            <div className="s8-hot-grid">
              <div className="s8-hot-stat"><div className="big">{totalPoints}</div><div className="small">trust points earned</div></div>
              <div className="s8-hot-stat"><div className="big">{totalCharts}</div><div className="small">live charts audited</div></div>
              <div className="s8-hot-stat"><div className="big">{certificationsList.length}</div><div className="small">credentials verified</div></div>
              <div className="s8-hot-stat"><div className="big">100%</div><div className="small">tamper-proof passport</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Preference Modal */}
      {editingPrefKey && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,27,61,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, maxWidth: 440, width: "100%", padding: 24, border: "2px solid #F5B41A" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F1B3D" }}>Update Match Preference</div>
              <button type="button" onClick={() => setEditingPrefKey(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#8A91A3" }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                value={prefEditValue}
                onChange={(e) => setPrefEditValue(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, color: "#0F1B3D", fontWeight: 600 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setEditingPrefKey(null)} className="s8-link-btn" style={{ padding: "8px 16px", fontSize: 12 }}>
                Cancel
              </button>
              <button type="button" onClick={handleSavePrefEdit} className="s8-action-btn" style={{ padding: "8px 16px", fontSize: 12 }}>
                Save Preference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
