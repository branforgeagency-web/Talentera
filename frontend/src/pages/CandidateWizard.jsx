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
import Stage8Track from "../components/wizard/Stage8Track.jsx";
import VideoUploadStage from "../components/VideoUploadStage.jsx";
import Step9Verified from "./Step9Verified.jsx";

const STAGE_COMPONENTS = {
  1: Stage1Aadhaar,
  2: Stage2Training,
  3: Stage3Certification,
  4: Stage4Assessment,
  6: Stage6LiveCharts,
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
        const nextIncomplete = WIZARD_STAGES.find((s) => !res.data.candidate.completedStages.includes(s.num));
        if (nextIncomplete) setActiveStageId(nextIncomplete.num);
        if (res.data.candidate.completedStages.length >= 8) setShowComplete(true);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleStageSaved(data) {
    setProfile(data);
    if (data.candidate.completedStages.length >= 8) {
      setShowComplete(true);
      return;
    }
    const nextIncomplete = WIZARD_STAGES.find((s) => !data.candidate.completedStages.includes(s.num));
    if (nextIncomplete) setActiveStageId(nextIncomplete.num);
  }

  function handleSubmitForVerification() {
    if (!profile) return;
    const mandatoryStages = WIZARD_STAGES.filter((s) => s.mandatory);
    const missing = mandatoryStages.filter((s) => !profile.candidate.completedStages.includes(s.num));
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

  if (loading || !profile) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading your dashboard…</div>;
  }

  if (showComplete) {
    return <Step9Verified profile={profile} onOpenDashboard={() => setShowComplete(false)} />;
  }

  const activeStage = getStage(activeStageId);
  const stageKey = `stage${activeStage.num}`;
  const existingData = profile.candidate[stageKey];
  const isDone = profile.candidate.completedStages.includes(activeStage.num);
  const prevStage = WIZARD_STAGES.find((s) => s.num === activeStage.num - 1);
  const StageComponent = STAGE_COMPONENTS[activeStage.num];

  return (
    <div className="wiz-shell">
      <WizardSidebar
        completedStages={profile.candidate.completedStages}
        activeStageId={activeStageId}
        onSelect={setActiveStageId}
        earnedPoints={profile.score}
        onSubmit={handleSubmitForVerification}
        onSaveExit={handleSaveExit}
      />

      <WizardStagePane stage={activeStage} isDone={isDone} onPrev={setActiveStageId} prevNum={prevStage?.num}>
        {activeStage.num === 5 && (
          <VideoUploadStage
            stage={{ id: 5, title: activeStage.long, subtitle: activeStage.intro }}
            existingData={existingData}
            onSaved={handleStageSaved}
          />
        )}

        {activeStage.num === 7 && (
          <div className="wiz-resume-mount">
            <p>
              Talentera builds your resume automatically from the verified data in Stages 1–6 — you don't
              write or upload anything here.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <Link to="/resume" className="btn btn-gold">Open Resume Builder</Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  const res = await api.post(`/candidate/stage/7/skip`);
                  handleStageSaved(res.data);
                }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {StageComponent && <StageComponent stage={activeStage} existingData={existingData} onSaved={handleStageSaved} />}
      </WizardStagePane>
    </div>
  );
}
