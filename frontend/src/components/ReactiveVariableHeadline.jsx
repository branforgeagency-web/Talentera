import React, { useRef, useEffect, useMemo } from "react";

/**
 * ReactiveVariableHeadline
 *
 * Smooth cursor-reactive variable font weight animation that preserves
 * all existing typography styles, line breaks, accents, and colors.
 */
export default function ReactiveVariableHeadline({
  lines = [
    { text: "Your skills can take", isAccent: false },
    { text: "you further.", isAccent: true }
  ],
  minWeight = 300,
  maxWeight = 800,
  radius = 300,
  lerpSpeed = 0.14,
  className = "hero-clean-title",
  style = {}
}) {
  const containerRef = useRef(null);
  const letterRefs = useRef([]);

  // Flatten words and chars with metadata
  const lineData = useMemo(() => {
    return lines.map((line) => {
      const words = line.text.split(" ").map((w) => w.split(""));
      return { ...line, words };
    });
  }, [lines]);

  const totalChars = useMemo(() => {
    let count = 0;
    lineData.forEach((line) => {
      line.words.forEach((word) => {
        count += word.length;
      });
    });
    return count;
  }, [lineData]);

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

    const handlePointerMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.isInside = true;
    };

    const handlePointerLeave = () => {
      mouseRef.current.isInside = false;
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    const updatePhysics = () => {
      const { x: mouseX, y: mouseY, isInside } = mouseRef.current;
      const physics = physicsRef.current;
      const chars = letterRefs.current.filter(Boolean);

      chars.forEach((el, index) => {
        if (!el) return;

        if (isInside && mouseX > -5000 && mouseY > -5000) {
          const rect = el.getBoundingClientRect();
          const charCenterX = rect.left + rect.width / 2;
          const charCenterY = rect.top + rect.height / 2;

          const distance = Math.hypot(charCenterX - mouseX, charCenterY - mouseY);

          if (distance < radius) {
            const norm = distance / radius;
            const factor = Math.pow(Math.cos(norm * (Math.PI / 2)), 1.35);

            physics.targetWeights[index] = minWeight + (maxWeight - minWeight) * factor;
            physics.targetOffsets[index] = -2.2 * factor;
            physics.targetScales[index] = 1 + 0.02 * factor;
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
        el.style.fontVariationSettings = `'wght' ${roundedW}, 'opsz' 72`;
        el.style.transform = `translateY(${nextOff.toFixed(2)}px) scale(${nextSc.toFixed(3)})`;
      });

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      cancelAnimationFrame(animId);
    };
  }, [radius, minWeight, maxWeight, lerpSpeed, totalChars]);

  let globalCharCounter = 0;

  return (
    <h1
      ref={containerRef}
      className={className}
      style={{
        fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)",
        letterSpacing: "-0.035em",
        userSelect: "none",
        cursor: "default",
        ...style
      }}
    >
      {lineData.map((line, lineIdx) => {
        const lineContent = line.words.map((wordChars, wordIdx) => (
          <span key={wordIdx} className="reactive-word" style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {wordChars.map((char, cIdx) => {
              const charIndex = globalCharCounter++;
              return (
                <span
                  key={cIdx}
                  ref={(el) => (letterRefs.current[charIndex] = el)}
                  className="reactive-char"
                  style={{
                    display: "inline-block",
                    fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)",
                    fontWeight: minWeight,
                    fontVariationSettings: `'wght' ${minWeight}, 'opsz' 72`,
                    willChange: "font-weight, transform",
                    transition: "none",
                    transformOrigin: "center bottom"
                  }}
                >
                  {char}
                </span>
              );
            })}
            {wordIdx < line.words.length - 1 && (
              <span className="reactive-space" style={{ display: "inline-block", width: "0.22em" }}>
                &nbsp;
              </span>
            )}
          </span>
        ));

        if (line.isAccent) {
          return (
            <div key={lineIdx} style={{ display: "block", marginTop: 4 }}>
              <span className="hero-clean-accent reactive-accent" style={{ display: "inline-block" }}>
                {lineContent}
              </span>
            </div>
          );
        }

        return (
          <div key={lineIdx} style={{ display: "block" }}>
            {lineContent}
          </div>
        );
      })}
    </h1>
  );
}
