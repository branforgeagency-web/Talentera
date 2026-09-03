import React, { useRef, useEffect, useState, useMemo } from "react";

/**
 * VariableTypographyBanner
 *
 * Interactive variable-weight typography animation that reacts smoothly to cursor proximity.
 * Features:
 * - Direct DOM manipulation inside requestAnimationFrame for silky smooth 60fps animation
 * - Continuous distance-based falloff (soft circular field of influence)
 * - Organic lerp smoothing with gentle follow-through
 * - Genuine variable font support ('wght' 200..900)
 * - Subtle vertical displacement and optical size adjustments
 * - Responsive typography with tight negative tracking
 * - Full customization of phrase, min/max weights, radius, and supporting metadata
 */
export default function VariableTypographyBanner({
  text = "MOVE WITH INTENTION",
  minWeight = 220,
  maxWeight = 920,
  radius = 320,
  lerpSpeed = 0.12,
  fullScreen = true,
  textColor = "rgba(241, 245, 249, 0.94)",
  glowColor = "rgba(139, 92, 246, 0.22)",
  eyebrow = "CURSOR PROXIMITY EXPERIMENT",
  description = "Every letter independently becomes heavier as the cursor approaches.",
  topLabelLeft = "RESPONSIVE TYPE STUDY",
  topLabelRight = "MOVE YOUR CURSOR",
  bottomLabelLeft = "VARIABLE TYPOGRAPHY",
  bottomLabelRight = new Date().getFullYear().toString(),
  topNavSlot = null,
  actionSlot = null,
  children = null,
  className = "",
  style = {}
}) {
  const containerRef = useRef(null);
  const headlineRef = useRef(null);
  const letterRefs = useRef([]);

  // Split text into words and chars for layout preservation
  const words = useMemo(() => {
    return text.split(" ").map((w) => w.split(""));
  }, [text]);

  const totalChars = useMemo(() => {
    return words.reduce((acc, word) => acc + word.length, 0);
  }, [words]);

  // Keep physics state in refs for zero React re-render overhead during cursor motion
  const mouseRef = useRef({
    x: -9999,
    y: -9999,
    isInside: false
  });

  const physicsRef = useRef({
    currentWeights: [],
    targetWeights: [],
    currentOffsets: [],
    targetOffsets: [],
    currentScales: [],
    targetScales: []
  });

  // Initialize weights arrays
  useEffect(() => {
    physicsRef.current.currentWeights = new Array(totalChars).fill(minWeight);
    physicsRef.current.targetWeights = new Array(totalChars).fill(minWeight);
    physicsRef.current.currentOffsets = new Array(totalChars).fill(0);
    physicsRef.current.targetOffsets = new Array(totalChars).fill(0);
    physicsRef.current.currentScales = new Array(totalChars).fill(1);
    physicsRef.current.targetScales = new Array(totalChars).fill(1);
  }, [totalChars, minWeight]);

  useEffect(() => {
    let animId;
    const chars = letterRefs.current.filter(Boolean);

    const updatePhysics = () => {
      const { x: mouseX, y: mouseY, isInside } = mouseRef.current;
      const physics = physicsRef.current;

      chars.forEach((el, index) => {
        if (!el) return;

        if (isInside && mouseX > -5000 && mouseY > -5000) {
          const rect = el.getBoundingClientRect();
          const charCenterX = rect.left + rect.width / 2;
          const charCenterY = rect.top + rect.height / 2;

          const distance = Math.hypot(charCenterX - mouseX, charCenterY - mouseY);

          if (distance < radius) {
            // Smooth cosine / cubic falloff for organic circular influence
            const norm = distance / radius;
            const factor = Math.pow(Math.cos(norm * (Math.PI / 2)), 1.4);

            physics.targetWeights[index] = minWeight + (maxWeight - minWeight) * factor;
            physics.targetOffsets[index] = -2.2 * factor; // Subtle -2px upward lift
            physics.targetScales[index] = 1 + 0.03 * factor;
          } else {
            physics.targetWeights[index] = minWeight;
            physics.targetOffsets[index] = 0;
            physics.targetScales[index] = 1;
          }
        } else {
          physics.targetWeights[index] = minWeight;
          physics.targetOffsets[index] = 0;
          physics.targetScales[index] = 1;
        }

        // Lerp toward target for fluid, elastic deceleration
        const curW = physics.currentWeights[index] || minWeight;
        const tarW = physics.targetWeights[index] || minWeight;
        const nextW = curW + (tarW - curW) * lerpSpeed;
        physics.currentWeights[index] = nextW;

        const curOff = physics.currentOffsets[index] || 0;
        const tarOff = physics.targetOffsets[index] || 0;
        const nextOff = curOff + (tarOff - curOff) * lerpSpeed;
        physics.currentOffsets[index] = nextOff;

        const curSc = physics.currentScales[index] || 1;
        const tarSc = physics.targetScales[index] || 1;
        const nextSc = curSc + (tarSc - curSc) * lerpSpeed;
        physics.currentScales[index] = nextSc;

        const roundedW = Math.round(nextW);
        el.style.fontWeight = roundedW;
        el.style.fontVariationSettings = `'wght' ${roundedW}`;
        el.style.transform = `translateY(${nextOff.toFixed(2)}px) scale(${nextSc.toFixed(3)})`;
      });

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [radius, minWeight, maxWeight, lerpSpeed, totalChars]);

  // Pointer event handlers
  const handlePointerMove = (e) => {
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
    mouseRef.current.isInside = true;
  };

  const handlePointerEnter = (e) => {
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
    mouseRef.current.isInside = true;
  };

  const handlePointerLeave = () => {
    mouseRef.current.isInside = false;
    mouseRef.current.x = -9999;
    mouseRef.current.y = -9999;
  };

  let charIndexCounter = 0;

  return (
    <section
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`var-type-banner-root ${fullScreen ? "var-type-fullscreen" : "var-type-section"} ${className}`}
      style={{
        background: "#000000",
        color: textColor,
        fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
        ...style
      }}
    >
      {/* Background Subtle Violet Glow */}
      <div
        className="var-type-glow-element"
        style={{
          background: `radial-gradient(ellipse at center, ${glowColor} 0%, rgba(99, 102, 241, 0.08) 45%, transparent 72%)`,
          filter: "blur(64px)"
        }}
      />

      {/* Grid Pattern Texture Overlay (Subtle) */}
      <div className="var-type-grid-overlay" />

      {/* Top Nav Slot (e.g. LiquidNavCapsule) */}
      {topNavSlot && (
        <div className="var-type-top-nav-wrap">
          {topNavSlot}
        </div>
      )}

      {/* TOP METADATA BAR */}
      <div className="var-type-top-bar">
        <div className="var-type-meta-left">
          <span className="var-type-meta-dot" />
          <span>{topLabelLeft}</span>
        </div>
        <div className="var-type-meta-right">
          <span>{topLabelRight}</span>
          <span className="var-type-radar-dot" />
        </div>
      </div>

      {/* CENTRAL TYPOGRAPHY HERO STAGE */}
      <div className="var-type-stage-center">
        {/* Eyebrow Label */}
        {eyebrow && (
          <div className="var-type-eyebrow">
            <span>{eyebrow}</span>
          </div>
        )}

        {/* Main Reactive Typography Headline */}
        <h1
          ref={headlineRef}
          className="var-type-headline"
          aria-label={text}
        >
          {words.map((wordChars, wordIdx) => (
            <span key={wordIdx} className="var-type-word">
              {wordChars.map((char, cIdx) => {
                const globalIndex = charIndexCounter++;
                return (
                  <span
                    key={cIdx}
                    ref={(el) => (letterRefs.current[globalIndex] = el)}
                    className="var-type-letter"
                    style={{
                      fontWeight: minWeight,
                      fontVariationSettings: `'wght' ${minWeight}`
                    }}
                  >
                    {char}
                  </span>
                );
              })}
              {wordIdx < words.length - 1 && <span className="var-type-space">&nbsp;</span>}
            </span>
          ))}
        </h1>

        {/* Supporting Description Below Headline */}
        {description && (
          <p className="var-type-description">
            {description}
          </p>
        )}

        {/* Action Slot / Custom CTAs */}
        {actionSlot && (
          <div className="var-type-action-slot">
            {actionSlot}
          </div>
        )}

        {/* Children if provided */}
        {children}
      </div>

      {/* BOTTOM METADATA BAR */}
      <div className="var-type-bottom-bar">
        <div className="var-type-meta-left">
          <span>{bottomLabelLeft}</span>
        </div>
        <div className="var-type-meta-right">
          <span>{bottomLabelRight}</span>
        </div>
      </div>
    </section>
  );
}
