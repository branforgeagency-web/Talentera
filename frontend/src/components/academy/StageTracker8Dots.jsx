import React, { useState } from "react";

export default function StageTracker8Dots({ stages = [], size = 10, showLabels = false, onStageClick }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const defaultStageDefs = [
    { num: 1, title: "1. Basic + Aadhaar", desc: "Identity & Indian ID Verified" },
    { num: 2, title: "2. Academy & Training", desc: "Course Hours & Path B Sign-off" },
    { num: 3, title: "3. Certifications", desc: "AAPC / AHIMA Cert Numbers" },
    { num: 4, title: "4. Assessment", desc: "Talentera MCQ & Proctored Score" },
    { num: 5, title: "5. Portfolio Video", desc: "2-Min Video & AI Score" },
    { num: 6, title: "6. Live Chart Practice", desc: "10 Coded Medical Charts" },
    { num: 7, title: "7. References", desc: "Trainer & Peer Endorsements" },
    { num: 8, title: "8. Review & Publish", desc: "Talentera Score & Live Profile" },
  ];

  const stageList = defaultStageDefs.map((def, idx) => {
    const existing = stages.find((s) => s.stageNumber === def.num) || {};
    return {
      ...def,
      isDone: existing.isDone || false,
      inProgress: existing.inProgress || false,
      needsApproval: existing.needsApproval || false,
      score: existing.score || "",
      meta: existing.meta || def.desc,
    };
  });

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {stageList.map((st, idx) => {
          let dotBg = "#CBD5E1"; // grey
          let dotBorder = "none";

          if (st.isDone) {
            dotBg = "#22C55E"; // green
          } else if (st.needsApproval) {
            dotBg = "#EF4444"; // red needs approval
          } else if (st.inProgress) {
            dotBg = "#E5A82E"; // gold
          }

          return (
            <div
              key={st.num}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onStageClick && onStageClick(st)}
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: dotBg,
                border: dotBorder,
                cursor: "pointer",
                transition: "all 0.15s ease",
                transform: hoveredIdx === idx ? "scale(1.35)" : "scale(1)",
                boxShadow: hoveredIdx === idx ? "0 0 6px rgba(0,0,0,0.2)" : "none",
              }}
              title={`${st.title}: ${st.isDone ? "Done" : st.needsApproval ? "Needs Academy Sign-off" : st.inProgress ? "In Progress" : "Pending"}`}
            />
          );
        })}
      </div>

      {/* Interactive Tooltip Card on Hover */}
      {hoveredIdx !== null && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: Math.max(0, hoveredIdx * 14 - 40),
            zIndex: 99,
            background: "#06152A",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 11,
            boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
            pointerEvents: "none",
            minWidth: 160,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontWeight: 800, color: "#E5A82E", marginBottom: 2 }}>
            {stageList[hoveredIdx].title}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>
            {stageList[hoveredIdx].meta}
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, marginTop: 4, color: stageList[hoveredIdx].isDone ? "#4ADE80" : stageList[hoveredIdx].needsApproval ? "#F87171" : "#FDE047" }}>
            {stageList[hoveredIdx].isDone ? "✓ COMPLETED" : stageList[hoveredIdx].needsApproval ? "⚠️ AWAITING ACADEMY APPROVAL" : "⏳ IN PROGRESS"}
          </div>
        </div>
      )}

      {showLabels && (
        <div style={{ fontSize: 10, color: "#64748B", fontWeight: 700 }}>
          {stageList.filter((s) => s.isDone).length}/8 stages completed
        </div>
      )}
    </div>
  );
}
