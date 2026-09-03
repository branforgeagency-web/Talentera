import React, { useState } from "react";
import { Link } from "react-router-dom";
import VariableTypographyBanner from "../components/VariableTypographyBanner";

export default function TypographyShowcase() {
  const [customText, setCustomText] = useState("MOVE WITH INTENTION");
  const [showControls, setShowControls] = useState(false);

  const samplePhrases = [
    "MOVE WITH INTENTION",
    "THE ERA OF TALENT",
    "PROVE YOUR SKILLS",
    "BEYOND TRADITIONAL RESUMES",
    "PRECISION HEALTHCARE RCM"
  ];

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#000" }}>
      {/* Floating Back to Home Link */}
      <div
        style={{
          position: "fixed",
          top: 24,
          left: 32,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 12
        }}
      >
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "rgba(255, 255, 255, 0.6)",
            textDecoration: "none",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            padding: "6px 14px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 999,
            backdropFilter: "blur(8px)",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          }}
        >
          <i className="fa-solid fa-arrow-left" />
          <span>BACK TO TALENTERA</span>
        </Link>
      </div>

      {/* Floating Phrase Customizer Toggle */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 32,
          zIndex: 50
        }}
      >
        <button
          type="button"
          onClick={() => setShowControls(!showControls)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "rgba(255, 255, 255, 0.7)",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            padding: "8px 16px",
            borderRadius: 999,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
            cursor: "pointer",
            backdropFilter: "blur(10px)"
          }}
        >
          <i className="fa-solid fa-sliders" />
          <span>{showControls ? "HIDE CONTROLS" : "CUSTOMIZE TEXT"}</span>
        </button>

        {showControls && (
          <div
            style={{
              position: "absolute",
              bottom: 48,
              right: 0,
              background: "#08080C",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 16,
              padding: 20,
              width: 320,
              boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
              backdropFilter: "blur(20px)"
            }}
          >
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.5)", marginBottom: 12, letterSpacing: "0.1em" }}>
              CHANGE PHRASE
            </div>
            
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value.toUpperCase())}
              placeholder="ENTER CUSTOM PHRASE"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#fff",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                marginBottom: 14,
                outline: "none",
                boxSizing: "border-box"
              }}
            />

            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
              QUICK PRESETS:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {samplePhrases.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => setCustomText(phrase)}
                  style={{
                    textAlign: "left",
                    background: customText === phrase ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${customText === phrase ? "rgba(139, 92, 246, 0.5)" : "rgba(255,255,255,0.08)"}`,
                    color: customText === phrase ? "#C084FC" : "rgba(255,255,255,0.7)",
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer"
                  }}
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Variable Typography Banner */}
      <VariableTypographyBanner
        text={customText}
        fullScreen={true}
        minWeight={220}
        maxWeight={920}
        radius={320}
        lerpSpeed={0.12}
        eyebrow="CURSOR PROXIMITY EXPERIMENT"
        description="Every letter independently becomes heavier as the cursor approaches."
        topLabelLeft="RESPONSIVE TYPE STUDY"
        topLabelRight="MOVE YOUR CURSOR"
        bottomLabelLeft="VARIABLE TYPOGRAPHY"
        bottomLabelRight={new Date().getFullYear().toString()}
      />
    </div>
  );
}
