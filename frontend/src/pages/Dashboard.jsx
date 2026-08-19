import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { STAGES } from "../data/stageConfig";
import StageSidebar from "../components/StageSidebar.jsx";
import StageForm from "../components/StageForm.jsx";
import VideoUploadStage from "../components/VideoUploadStage.jsx";

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null); // { candidate, score, maxScore, badgeTier, isGoldBadge }
  const [activeStageId, setActiveStageId] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/candidate/me")
      .then((res) => setProfile(res.data))
      .finally(() => setLoading(false));
  }, []);

  function handleStageSaved(data) {
    setProfile(data);
    const nextIncomplete = STAGES.find((s) => !data.candidate.completedStages.includes(s.id));
    if (nextIncomplete) setActiveStageId(nextIncomplete.id);
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  if (loading || !profile) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading your dashboard…</div>;
  }

  const activeStage = STAGES.find((s) => s.id === activeStageId);
  const existingData = profile.candidate[activeStage.key];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <header style={{ background: "var(--navy)", padding: "16px 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 36, width: "auto" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className={profile.isGoldBadge ? "badge-gold" : "badge-progress"}>
              {profile.score}/{profile.maxScore} · {profile.badgeTier}
            </span>
            <button className="btn btn-ghost" style={{ color: "var(--white)", borderColor: "rgba(255,255,255,0.3)" }} onClick={handleLogout}>
              Log Out
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: "32px 24px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 24 }}>
        <StageSidebar
          completedStages={profile.candidate.completedStages}
          activeStageId={activeStageId}
          onSelect={setActiveStageId}
        />

        <div>
          {activeStage.isVideoUpload && (
            <VideoUploadStage stage={activeStage} existingData={existingData} onSaved={handleStageSaved} />
          )}

          {activeStage.isResumeStage && (
            <div className="card">
              <h3>Stage {activeStage.id}: {activeStage.title}</h3>
              <p style={{ color: "var(--text-muted)" }}>{activeStage.subtitle}</p>
              <p>
                Talentera builds your resume automatically from the verified data in Stages 1–6 —
                you don't write or upload anything here.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <Link to="/resume" className="btn btn-gold">Open Resume Builder</Link>
                <button
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

          {activeStage.fields && (
            <StageForm stage={activeStage} existingData={existingData} onSaved={handleStageSaved} />
          )}
        </div>
      </div>
    </div>
  );
}
