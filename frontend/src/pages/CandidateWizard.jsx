import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { useToast } from "../components/Toast.jsx";
import { WIZARD_STAGES, getStage, isStage6Optional, getWizardStages, isExperiencedCandidate, isLiveChartExemptDomain } from "../data/wizardStages";
import WizardSidebar from "../components/WizardSidebar.jsx";
import WizardStagePane from "../components/WizardStagePane.jsx";
import Stage1Aadhaar from "../components/wizard/Stage1Aadhaar.jsx";
import Stage2Training from "../components/wizard/Stage2Training.jsx";
import Stage3Certification from "../components/wizard/Stage3Certification.jsx";
import Stage4Assessment from "../components/wizard/Stage4Assessment.jsx";
import Stage5VideoPitch from "../components/wizard/Stage5VideoPitch.jsx";
import Stage6LiveCharts from "../components/wizard/Stage6LiveCharts.jsx";
import Stage7Resume from "../components/wizard/Stage7Resume.jsx";
import Step9Verified from "./Step9Verified.jsx";
import CandidateDashboard from "./CandidateDashboard.jsx";

const STAGE_COMPONENTS = {
  1: Stage1Aadhaar,
  2: Stage2Training,
  3: Stage3Certification,
  4: Stage4Assessment,
  5: Stage5VideoPitch,
  6: Stage6LiveCharts,
  7: Stage7Resume,
};

export function isStageUnlocked(stageNum, completedStages = [], isSelfTrained = false) {
  if (stageNum <= 1) return true;
  for (let i = 1; i < stageNum; i++) {
    if (isSelfTrained && i === 6) continue;
    if (!completedStages.includes(i)) {
      return false;
    }
  }
  return true;
}

export default function CandidateWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [activeStageId, setActiveStageId] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [stage6Preview, setStage6Preview] = useState(null);
  const [showVerifiedPool, setShowVerifiedPool] = useState(false);

  useEffect(() => {
    api
      .get("/candidate/me")
      .then((res) => {
        setProfile(res.data);
        const candidateObj = res.data?.candidate || res.data || {};
        const completed = Array.isArray(candidateObj.completedStages) ? candidateObj.completedStages : [];
        const stageParam = Number(searchParams.get("stage"));
        const viewParam = searchParams.get("view");

        if (viewParam === "verified") {
          setShowVerifiedPool(true);
          setShowDashboard(false);
        } else if (viewParam === "dashboard" || candidateObj.isSubmitted) {
          setShowDashboard(true);
        } else if (completed.length >= 8) {
          setShowDashboard(true);
        }

        // Determine the earliest incomplete stage in sequential order
        const isSelf = isStage6Optional(candidateObj);
        let firstIncompleteStage = 1;
        for (let i = 1; i <= 7; i++) {
          if (!completed.includes(i)) {
            firstIncompleteStage = i;
            break;
          }
        }
        if (completed.length >= 8) firstIncompleteStage = 7;

        const savedActiveStage = Number(localStorage.getItem("talentera_active_stage"));

        if (
          stageParam >= 1 &&
          stageParam <= 7 &&
          (isStageUnlocked(stageParam, completed, isSelf) || completed.includes(stageParam))
        ) {
          setActiveStageId(stageParam);
          localStorage.setItem("talentera_active_stage", String(stageParam));
          if (!viewParam) {
            setShowDashboard(false);
            setShowVerifiedPool(false);
          }
        } else if (
          savedActiveStage >= 1 &&
          savedActiveStage <= 7 &&
          (isStageUnlocked(savedActiveStage, completed, isSelf) || completed.includes(savedActiveStage))
        ) {
          setActiveStageId(savedActiveStage);
        } else {
          setActiveStageId(firstIncompleteStage);
          localStorage.setItem("talentera_active_stage", String(firstIncompleteStage));
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const stageParam = Number(searchParams.get("stage"));
    if (stageParam >= 1 && stageParam <= 7) {
      setActiveStageId(stageParam);
      try {
        localStorage.setItem("talentera_active_stage", String(stageParam));
      } catch (e) {}
      if (!searchParams.get("view")) {
        setShowDashboard(false);
        setShowVerifiedPool(false);
      }
    }
  }, [searchParams]);

  function handleSelectStage(stageNum) {
    const candidateObj = profile?.candidate || profile || {};
    const completed = Array.isArray(candidateObj.completedStages) ? candidateObj.completedStages : [];
    const isSelf = isStage6Optional(candidateObj);

    const isUnlocked = isStageUnlocked(stageNum, completed, isSelf) || completed.includes(stageNum);
    if (!isUnlocked) {
      let firstMissing = 1;
      for (let i = 1; i < stageNum; i++) {
        if (isSelf && i === 6) continue;
        if (!completed.includes(i)) {
          firstMissing = i;
          break;
        }
      }
      toast(
        `Please complete Stage ${firstMissing} before opening Stage ${stageNum}.`,
        { title: "Stage Locked", type: "warning", glyph: <i className="fa-solid fa-triangle-exclamation" /> }
      );
      return;
    }
    setActiveStageId(stageNum);
    localStorage.setItem("talentera_active_stage", String(stageNum));
  }

  // `advance: false` lets a stage persist its result (score, completedStages,
  // etc.) without immediately being switched away from - used by Stage 5 so
  // its own completion report actually gets shown to the candidate instead
  // of being unmounted the instant the save succeeds (see AiVideoAssessment.jsx's
  // report step + "Continue to Next Stage" button, which re-calls onSaved
  // with advance left at its default true once the candidate is ready).
  function handleStageSaved(data, opts = {}) {
    const { advance = true } = opts;
    let { nextStage } = opts;

    let mergedProfile = profile;
    if (data?.candidate) {
      mergedProfile = data;
    } else if (data) {
      mergedProfile = {
        ...profile,
        candidate: {
          ...(profile?.candidate || profile || {}),
          ...(data?.candidate || data || {}),
        },
      };
    }
    setProfile(mergedProfile);

    const candidateObj = mergedProfile?.candidate || mergedProfile || {};
    const completed = Array.isArray(candidateObj.completedStages) ? candidateObj.completedStages : [];
    // Experienced candidates have no Stage 4 (Assessment) - go straight to Stage 5
    if (nextStage === 4 && isExperiencedCandidate(candidateObj)) nextStage = 5;

    if (completed.length >= 8) {
      setShowVerifiedPool(false);
      setShowDashboard(true);
      return;
    }

    if (!advance) return;

    const isSelf = isStage6Optional(candidateObj);
    if (nextStage && (isStageUnlocked(nextStage, completed, isSelf) || completed.includes(nextStage))) {
      setActiveStageId(nextStage);
      localStorage.setItem("talentera_active_stage", String(nextStage));
      return;
    }

    let nextIncomplete = 1;
    for (let i = 1; i <= 7; i++) {
      if (!completed.includes(i)) {
        nextIncomplete = i;
        break;
      }
    }

    if (completed.length < 8) {
      setActiveStageId(nextIncomplete);
      localStorage.setItem("talentera_active_stage", String(nextIncomplete));
    }
  }

  async function handleSubmitForVerification() {
    if (!profile) return;
    const candidateObj = profile?.candidate || profile || {};
    const completed = Array.isArray(candidateObj.completedStages) ? candidateObj.completedStages : [];
    const stagesList = getWizardStages(candidateObj);
    const mandatoryStages = stagesList.filter((s) => s.mandatory);
    const missing = mandatoryStages.filter((s) => !completed.includes(s.num));
    if (missing.length > 0) {
      toast(`Finish ${missing.map((s) => s.short).join(", ")} before submitting.`, "!");
      setActiveStageId(missing[0].num);
      return;
    }

    try {
      const res = await api.post("/candidate/submit");
      if (res.data) setProfile(res.data);
    } catch (err) {
      console.warn("Submit endpoint fallback:", err);
    }

    toast("Profile submitted for verification!", "✓");
    setShowVerifiedPool(false);
    setShowDashboard(true);
  }

  function handleSaveExit() {
    toast("Progress saved. Returning to your dashboard...", "✓");
    setShowDashboard(true);
  }

  const candidateObj = profile?.candidate || profile;

  if (loading || !profile || !candidateObj) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading your dashboard…</div>;
  }

  if (showVerifiedPool) {
    return (
      <Step9Verified
        profile={profile}
        onOpenDashboard={() => {
          setShowVerifiedPool(false);
          setShowDashboard(true);
        }}
      />
    );
  }

  if (showDashboard) {
    return (
      <CandidateDashboard
        profile={profile}
        onEditStage={(stageNum) => {
          setActiveStageId(stageNum || 1);
          setShowDashboard(false);
          setShowVerifiedPool(false);
        }}
      />
    );
  }

  const isSelfTrained = isStage6Optional(candidateObj);
  const skipStage4 = isExperiencedCandidate(candidateObj);
  // Never land on the (removed) Assessment stage for an experienced candidate
  const shownStageId = skipStage4 && activeStageId === 4 ? 5 : activeStageId;
  const activeStage = getStage(shownStageId, candidateObj) || WIZARD_STAGES[0];
  const stageKey = `stage${activeStage.num}`;
  const existingData = candidateObj?.[stageKey] || {};
  const completedStages = Array.isArray(candidateObj?.completedStages) ? candidateObj.completedStages : [];
  const isDone = completedStages.includes(activeStage.num);
  const prevStage = WIZARD_STAGES.find((s) => s.num === activeStage.num - 1);
  const StageComponent = STAGE_COMPONENTS[activeStage.num];
  const canViewDashboard = Boolean(candidateObj?.isSubmitted || completedStages.length >= 1);

  // Base score from the server + live Stage 6 preview delta (typed but not yet saved)
  const baseScore = profile?.score || profile?.earnedPoints || candidateObj?.score || 0;
  const savedS6Pts = (candidateObj?.stage6 && !candidateObj.stage6.skipped && (candidateObj.completedStages || []).includes(6) && typeof candidateObj.stage6.verificationPoints === "number")
    ? Math.round((candidateObj.stage6.verificationPoints / 10) * 20)
    : 0;
  const displayedScore = stage6Preview !== null && shownStageId === 6
    ? Math.min(100, Math.max(0, baseScore - savedS6Pts + stage6Preview))
    : baseScore;

  const stagesCount = completedStages.length;
  const isAadhaarDone = candidateObj?.stage1?.aadhaarVerified === true || candidateObj?.stage1?.aadhaarStatus === "VERIFIED";
  const isCandidateVerified = Boolean(
    candidateObj?.isVerified ||
    candidateObj?.verificationReadiness?.readinessStatus === "VERIFIED" ||
    candidateObj?.verificationReadiness?.readinessStatus === "INTERVIEW_READY" ||
    (candidateObj?.isSubmitted && displayedScore >= 70 && isAadhaarDone) ||
    (stagesCount >= (skipStage4 ? 5 : 6) && candidateObj?.isSubmitted && isAadhaarDone)
  );
  const isCandidateSubmitted = Boolean(candidateObj?.isSubmitted);

  return (
    <div className="wiz-shell">
      <WizardSidebar
        completedStages={completedStages}
        activeStageId={shownStageId}
        onSelect={handleSelectStage}
        earnedPoints={displayedScore}
        onSubmit={handleSubmitForVerification}
        onSaveExit={handleSaveExit}
        onViewDashboard={canViewDashboard ? () => setShowDashboard(true) : null}
        isSelfTrained={isSelfTrained}
        hiddenStages={skipStage4 ? [4] : []}
        bonusStages={isLiveChartExemptDomain(candidateObj) ? [6] : []}
        stageScores={profile?.stageScores || candidateObj?.stageScores || null}
        experienced={isExperiencedCandidate(candidateObj)}
        isVerified={isCandidateVerified}
        isSubmitted={isCandidateSubmitted}
      />

      {shownStageId >= 1 && shownStageId <= 7 ? (
        <div style={{ flex: 1, minWidth: 0, padding: "20px 28px", overflowY: "auto", height: "100vh" }}>
          {canViewDashboard && (
            <div style={{ marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setShowDashboard(true)}
                style={{
                  background: "#0A1F3D",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ← Back to My Dashboard
              </button>
            </div>
          )}
          {shownStageId === 1 ? (
            <Stage1Aadhaar
              stage={activeStage}
              existingData={existingData}
              candidate={candidateObj}
              onSaved={handleStageSaved}
            />
          ) : shownStageId === 2 ? (
            <Stage2Training
              stage={activeStage}
              existingData={existingData}
              candidate={candidateObj}
              onSaved={handleStageSaved}
            />
          ) : shownStageId === 3 ? (
            <Stage3Certification
              stage={activeStage}
              existingData={existingData}
              candidate={candidateObj}
              onSaved={handleStageSaved}
            />
          ) : shownStageId === 4 ? (
            <Stage4Assessment
              stage={activeStage}
              existingData={existingData}
              candidate={candidateObj}
              onSaved={handleStageSaved}
            />
          ) : shownStageId === 5 ? (
            <Stage5VideoPitch
              stage={activeStage}
              existingData={existingData}
              candidate={candidateObj}
              onSaved={handleStageSaved}
            />
          ) : shownStageId === 6 ? (
            <Stage6LiveCharts
              stage={activeStage}
              existingData={existingData}
              candidate={candidateObj}
              onSaved={handleStageSaved}
            />
          ) : (
            <Stage7Resume
              stage={activeStage}
              existingData={existingData}
              candidate={candidateObj}
              onSaved={handleStageSaved}
              onNavigateStage={handleSelectStage}
              onGoToDashboard={() => setShowDashboard(true)}
            />
          )}
        </div>
      ) : (
        <WizardStagePane
          stage={activeStage}
          isDone={isDone}
          onPrev={handleSelectStage}
          prevNum={prevStage?.num}
          onBackToDashboard={canViewDashboard ? () => setShowDashboard(true) : null}
        >
          {StageComponent && (
            <StageComponent
              stage={activeStage}
              existingData={existingData}
              candidate={candidateObj}
              onSaved={handleStageSaved}
              {...(activeStage?.num === 6 ? { onPreviewPoints: setStage6Preview } : {})}
            />
          )}
        </WizardStagePane>
      )}
    </div>
  );
}
