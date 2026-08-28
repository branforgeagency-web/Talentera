import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useToast } from "../components/Toast.jsx";
import { WIZARD_STAGES, getStage } from "../data/wizardStages";
import WizardSidebar from "../components/WizardSidebar.jsx";
import WizardStagePane from "../components/WizardStagePane.jsx";
import Stage1Aadhaar from "../components/wizard/Stage1Aadhaar.jsx";
import Stage2Training from "../components/wizard/Stage2Training.jsx";
import Stage3Certification from "../components/wizard/Stage3Certification.jsx";
import Stage4Assessment from "../components/wizard/Stage4Assessment.jsx";
import Stage6LiveCharts from "../components/wizard/Stage6LiveCharts.jsx";
import Stage7Resume from "../components/wizard/Stage7Resume.jsx";
import Stage8Track from "../components/wizard/Stage8Track.jsx";
import VideoUploadStage from "../components/VideoUploadStage.jsx";
import Step9Verified from "./Step9Verified.jsx";

const STAGE_COMPONENTS = {
  1: Stage1Aadhaar,
  2: Stage2Training,
  3: Stage3Certification,
  4: Stage4Assessment,
  6: Stage6LiveCharts,
  7: Stage7Resume,
  8: Stage8Track,
};

export default function CandidateWizard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [activeStageId, setActiveStageId] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    api
      .get("/candidate/me")
      .then((res) => {
        setProfile(res.data);
        const candidateObj = res.data?.candidate || res.data || {};
        const completed = Array.isArray(candidateObj.completedStages) ? candidateObj.completedStages : [];
        const isStage1Done = completed.includes(1);
        if (!isStage1Done) {
          setActiveStageId(1);
        } else {
          const nextIncomplete = WIZARD_STAGES.find((s) => !completed.includes(s.num));
          if (nextIncomplete) setActiveStageId(nextIncomplete.num);
        }
        if (completed.length >= 8) setShowComplete(true);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleSelectStage(stageNum) {
    const candidateObj = profile?.candidate || profile || {};
    const completed = Array.isArray(candidateObj.completedStages) ? candidateObj.completedStages : [];
    const isStage1Done = completed.includes(1);
    if (stageNum > 1 && !isStage1Done) {
      toast("Please complete and save Stage 1 (Identity & Basics) first before moving to higher stages.", "!");
      setActiveStageId(1);
      return;
    }
    setActiveStageId(stageNum);
  }

  // `advance: false` lets a stage persist its result (score, completedStages,
  // etc.) without immediately being switched away from - used by Stage 5 so
  // its own completion report actually gets shown to the candidate instead
  // of being unmounted the instant the save succeeds (see AiVideoAssessment.jsx's
  // report step + "Continue to Next Stage" button, which re-calls onSaved
  // with advance left at its default true once the candidate is ready).
  function handleStageSaved(data, opts = {}) {
    const { advance = true, nextStage } = opts;
    
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

    if (completed.length >= 8) {
      setShowComplete(true);
      return;
    }

    if (!advance) return;

    if (nextStage) {
      setActiveStageId(nextStage);
      return;
    }

    const nextIncomplete =
      WIZARD_STAGES.find((s) => !completed.includes(s.num) && s.num > activeStageId) ||
      WIZARD_STAGES.find((s) => !completed.includes(s.num));

    if (nextIncomplete) {
      setActiveStageId(nextIncomplete.num);
    } else if (activeStageId < 8) {
      setActiveStageId(activeStageId + 1);
    }
  }

  function handleSubmitForVerification() {
    if (!profile) return;
    const candidateObj = profile?.candidate || profile || {};
    const completed = Array.isArray(candidateObj.completedStages) ? candidateObj.completedStages : [];
    const mandatoryStages = WIZARD_STAGES.filter((s) => s.mandatory);
    const missing = mandatoryStages.filter((s) => !completed.includes(s.num));
    if (missing.length > 0) {
      toast(`Finish ${missing.map((s) => s.short).join(", ")} before submitting.`, "!");
      setActiveStageId(missing[0].num);
      return;
    }
    setShowComplete(true);
  }

  function handleSaveExit() {
    navigate("/");
  }

  const candidateObj = profile?.candidate || profile;

  if (loading || !profile || !candidateObj) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading your dashboard…</div>;
  }

  if (showComplete) {
    return <Step9Verified profile={profile} onOpenDashboard={() => setShowComplete(false)} />;
  }

  const activeStage = getStage(activeStageId) || WIZARD_STAGES[0];
  const stageKey = `stage${activeStage.num}`;
  const existingData = candidateObj?.[stageKey] || {};
  const completedStages = Array.isArray(candidateObj?.completedStages) ? candidateObj.completedStages : [];
  const isDone = completedStages.includes(activeStage.num);
  const prevStage = WIZARD_STAGES.find((s) => s.num === activeStage.num - 1);
  const StageComponent = STAGE_COMPONENTS[activeStage.num];

  return (
    <div className="wiz-shell">
      <WizardSidebar
        completedStages={completedStages}
        activeStageId={activeStageId}
        onSelect={handleSelectStage}
        earnedPoints={profile?.score || profile?.earnedPoints || candidateObj?.score || 0}
        onSubmit={handleSubmitForVerification}
        onSaveExit={handleSaveExit}
      />

      <WizardStagePane stage={activeStage} isDone={isDone} onPrev={handleSelectStage} prevNum={prevStage?.num}>
        {activeStage.num === 5 && (
          <VideoUploadStage
            stage={{ id: 5, title: activeStage.long, subtitle: activeStage.intro }}
            existingData={existingData}
            onSaved={handleStageSaved}
          />
        )}

        {StageComponent && <StageComponent stage={activeStage} existingData={existingData} onSaved={handleStageSaved} />}
      </WizardStagePane>
    </div>
  );
}
