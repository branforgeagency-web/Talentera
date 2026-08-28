import React, { useRef, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/liquidNavCapsule.css";

export default function LiquidNavCapsule({
  activeTab = 0,
  onTabChange,
  items = [
    { label: "For Candidates", icon: "fa-solid fa-user-graduate", link: "/candidates" },
    { label: "For Companies", icon: "fa-solid fa-building", link: "/companies" },
    { label: "For Academies", icon: "fa-solid fa-landmark", link: "/academy" },
    { label: "How it Works", icon: "fa-solid fa-circle-play", link: "#how-it-works" }
  ]
}) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(activeTab);
  const [isHovered, setIsHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const canvasRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0, isOver: false, clickBurst: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let time = 0;

    const particles = Array.from({ length: 14 }, () => ({
      x: (Math.random() - 0.5) * 24,
      y: (Math.random() - 0.5) * 24,
      size: Math.random() * 1.8 + 0.8,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.7 + 0.3
    }));

    const render = () => {
      time += 0.03;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = 20;

      ctx.clearRect(0, 0, width, height);

      const hoverScale = isHovered ? 1.08 : 1.0;
      let leanX = 0;
      let leanY = 0;
      if (mousePosRef.current.isOver) {
        leanX = mousePosRef.current.x * 3;
        leanY = mousePosRef.current.y * 3;
      }

      const orbX = centerX + leanX;
      const orbY = centerY + leanY;

      if (mousePosRef.current.clickBurst > 0) {
        mousePosRef.current.clickBurst -= 0.04;
      }
      const burstFactor = Math.max(0, mousePosRef.current.clickBurst);

      // 1. Soft Blue Aura
      const auraGrad = ctx.createRadialGradient(orbX, orbY, baseRadius * 0.5, orbX, orbY, baseRadius * 2.2);
      auraGrad.addColorStop(0, "rgba(14, 165, 233, 0.4)");
      auraGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.15)");
      auraGrad.addColorStop(1, "rgba(14, 165, 233, 0)");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(orbX, orbY, baseRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Jelly Edge Wobble Path
      ctx.save();
      ctx.beginPath();
      const numPoints = 32;
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const wobble = Math.sin(angle * 4 + time * 2.5) * 1.2 + Math.cos(angle * 3 - time * 1.8) * 0.8;
        const r = (baseRadius + wobble + burstFactor * 3) * hoverScale;
        const px = orbX + Math.cos(angle) * r;
        const py = orbY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Core Gradient
      const coreGrad = ctx.createRadialGradient(
        orbX - 5,
        orbY - 5,
        2,
        orbX,
        orbY,
        baseRadius * hoverScale
      );
      coreGrad.addColorStop(0, "#38BDF8");
      coreGrad.addColorStop(0.3, "#0EA5E9");
      coreGrad.addColorStop(0.75, "#0369A1");
      coreGrad.addColorStop(1, "#061A3A");

      ctx.fillStyle = coreGrad;
      ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 + burstFactor * 0.3})`;
      ctx.stroke();
      ctx.clip();

      // 3. Swirling Currents
      ctx.beginPath();
      for (let i = -baseRadius; i <= baseRadius; i += 4) {
        const waveY = orbY + i + Math.sin(i * 0.2 + time * 3) * 3;
        ctx.moveTo(orbX - baseRadius, waveY);
        ctx.bezierCurveTo(
          orbX - 8, waveY + Math.sin(time * 2) * 6,
          orbX + 8, waveY - Math.cos(time * 2) * 6,
          orbX + baseRadius, waveY
        );
      }
      ctx.strokeStyle = "rgba(186, 230, 253, 0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Micro Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (Math.hypot(p.x, p.y) > baseRadius - 3) {
          p.vx *= -1;
          p.vy *= -1;
        }
        ctx.fillStyle = `rgba(224, 242, 254, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(orbX + p.x, orbY + p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (burstFactor > 0) {
        ctx.beginPath();
        ctx.arc(orbX, orbY, baseRadius * (1 - burstFactor), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${burstFactor})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Glass Highlight
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(orbX - 7, orbY - 7, 6, 3, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.fill();
    };

    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isHovered]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    mousePosRef.current = { ...mousePosRef.current, x, y, isOver: true };
  };

  const handleMouseLeave = () => {
    mousePosRef.current = { ...mousePosRef.current, x: 0, y: 0, isOver: false };
    setIsHovered(false);
  };

  const handleOrbClick = () => {
    mousePosRef.current.clickBurst = 1.0;
  };

  const handleSelect = (index, item) => {
    setSelected(index);
    handleOrbClick();
    if (item.link) {
      if (item.link.startsWith("#")) {
        const el = document.querySelector(item.link);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate(item.link);
      }
    }
    if (onTabChange) onTabChange(index, item);
  };

  return (
    <div className="liquid-nav-scene sticky-liquid-nav">
      {/* Floating Capsule Container */}
      <div className="liquid-capsule-shell">
        {/* Left Side: Orb + Logo */}
        <div className="liquid-nav-left" onClick={() => navigate("/")}>
          <div
            className="liquid-orb-wrapper"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onClick={handleOrbClick}
            title="Click to trigger liquid energy burst"
          >
            <canvas ref={canvasRef} width={64} height={64} className="liquid-orb-canvas" />
          </div>
          <img src="/logo.png" alt="Talentera Logo" className="liquid-nav-logo" />
        </div>

        {/* Center: Navigation Buttons */}
        <div className={`liquid-nav-buttons ${mobileOpen ? "mobile-open" : ""}`}>
          {items.map((item, idx) => (
            <button
              key={item.label}
              type="button"
              className={`liquid-nav-btn ${selected === idx ? "active" : ""}`}
              onClick={() => {
                setMobileOpen(false);
                handleSelect(idx, item);
              }}
            >
              <i className={`${item.icon} liquid-btn-icon`} />
              <span className="liquid-btn-text">{item.label}</span>
              <span className="liquid-btn-sheen" />
            </button>
          ))}

          {/* Mobile Only Action Links */}
          <div className="liquid-mobile-ctas">
            <Link to="/staff/login" className="liquid-mobile-login" onClick={() => setMobileOpen(false)}>
              Employee Login
            </Link>
            <Link to="/companies/directory" className="btn-gold" onClick={() => setMobileOpen(false)}>
              Hire Verified Talent →
            </Link>
          </div>
        </div>

        {/* Right Side: Desktop Action Buttons */}
        <div className="liquid-nav-actions">
          <Link to="/staff/login" className="liquid-action-link">
            Employee Login
          </Link>
          <Link to="/companies/directory" className="btn-gold liquid-action-cta">
            Hire Verified Talent →
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          className="liquid-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>
    </div>
  );
}
