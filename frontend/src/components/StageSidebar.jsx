import React from "react";
import { STAGES } from "../data/stageConfig";

export default function StageSidebar({ completedStages, activeStageId, onSelect }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      {STAGES.map((s) => {
        const done = completedStages.includes(s.id);
        const active = activeStageId === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: active ? "rgba(229,168,46,0.15)" : "transparent",
              cursor: "pointer",
              marginBottom: 2,
              fontFamily: "var(--font-body)",
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: done ? "var(--gold)" : "rgba(10,31,61,0.08)",
                color: done ? "var(--navy)" : "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              {done ? "✓" : s.id}
            </span>
            <span style={{ fontWeight: active ? 700 : 500, fontSize: "0.9rem" }}>{s.title}</span>
            {!s.mandatory && <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "auto" }}>optional</span>}
          </button>
        );
      })}
    </div>
  );
}
