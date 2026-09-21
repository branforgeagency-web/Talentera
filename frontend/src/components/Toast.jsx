import React, { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

/**
 * Enhanced Toast notification system.
 * Positioned on the TOP-RIGHT with smooth right-to-left slide-in animation.
 * Features specialized styles for error (prominent red toaster for mandatory fields),
 * success (emerald green), warning (amber gold), and info (midnight navy).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((msgOrObj, typeOrGlyph = "✓", options = {}) => {
    const id = ++idRef.current;
    let message = "";
    let title = "";
    let type = "info";
    let glyph = "";
    let duration = 4500;

    if (typeof msgOrObj === "object" && msgOrObj !== null) {
      message = msgOrObj.message || msgOrObj.text || "";
      title = msgOrObj.title || "";
      type = msgOrObj.type || "info";
      glyph = msgOrObj.glyph || "";
      duration = msgOrObj.duration || 4500;
    } else {
      message = String(msgOrObj || "");
      if (typeof typeOrGlyph === "object" && typeOrGlyph !== null) {
        title = typeOrGlyph.title || "";
        type = typeOrGlyph.type || "info";
        glyph = typeOrGlyph.glyph || "";
        duration = typeOrGlyph.duration || 4500;
      } else {
        const rawType = String(typeOrGlyph || "").trim().toLowerCase();
        if (rawType === "!" || rawType === "error" || rawType === "danger" || rawType === "fail" || rawType === "failed" || rawType === "✕") {
          type = "error";
          glyph = "⚠️";
          title = "Attention Required";
        } else if (rawType === "✓" || rawType === "success" || rawType === "ok" || rawType === "done") {
          type = "success";
          glyph = "✓";
          title = "Success";
        } else if (rawType === "warn" || rawType === "warning") {
          type = "warning";
          glyph = "⚡";
          title = "Attention";
        } else if (rawType === "ℹ" || rawType === "info" || rawType === "i") {
          type = "info";
          glyph = "ℹ";
          title = "Notification";
        } else {
          glyph = typeOrGlyph || "✓";
          type = "info";
        }
      }
    }

    // Auto-detect errors from message content if type is default
    const lowerMsg = message.toLowerCase();
    if (
      type === "info" &&
      (lowerMsg.includes("mandatory") ||
        lowerMsg.includes("required") ||
        lowerMsg.includes("please fill") ||
        lowerMsg.includes("failed") ||
        lowerMsg.includes("error") ||
        lowerMsg.includes("locked") ||
        lowerMsg.includes("invalid"))
    ) {
      type = "error";
      if (!glyph || glyph === "✓") glyph = "⚠️";
      if (!title) title = "Action Required";
    }

    if (options.title) title = options.title;
    if (options.type) type = options.type;
    if (options.glyph) glyph = options.glyph;
    if (options.duration) duration = options.duration;

    setToasts((t) => [...t, { id, title, message, type, glyph, createdAt: Date.now(), duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        className="talentera-toast-portal"
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 420,
          width: "calc(100vw - 40px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const isError = t.type === "error";
          const isSuccess = t.type === "success";
          const isWarning = t.type === "warning";

          // Theme backgrounds
          let bg = "linear-gradient(135deg, #06182B 0%, #0A2644 60%, #103960 100%)";
          let border = "1.5px solid rgba(245, 166, 35, 0.4)";
          let glow = "0 10px 30px rgba(0, 0, 0, 0.35)";
          let iconBg = "rgba(245, 166, 35, 0.2)";
          let iconColor = "#F5B41A";
          let titleColor = "#FFFFFF";

          if (isError) {
            bg = "linear-gradient(135deg, #7F1D1D 0%, #991B1B 50%, #B91C1C 100%)";
            border = "1.5px solid #F87171";
            glow = "0 12px 32px rgba(185, 28, 28, 0.45), 0 4px 12px rgba(0,0,0,0.3)";
            iconBg = "rgba(255, 255, 255, 0.2)";
            iconColor = "#FFFFFF";
            titleColor = "#FEE2E2";
          } else if (isSuccess) {
            bg = "linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%)";
            border = "1.5px solid #34D399";
            glow = "0 12px 32px rgba(4, 120, 87, 0.4), 0 4px 12px rgba(0,0,0,0.3)";
            iconBg = "rgba(255, 255, 255, 0.2)";
            iconColor = "#FFFFFF";
            titleColor = "#D1FAE5";
          } else if (isWarning) {
            bg = "linear-gradient(135deg, #78350F 0%, #92400E 50%, #B45309 100%)";
            border = "1.5px solid #FBBF24";
            glow = "0 12px 32px rgba(180, 83, 9, 0.4), 0 4px 12px rgba(0,0,0,0.3)";
            iconBg = "rgba(255, 255, 255, 0.2)";
            iconColor = "#FFFFFF";
            titleColor = "#FEF3C7";
          }

          return (
            <div
              key={t.id}
              className={`talentera-toast-card toast-${t.type}`}
              style={{
                background: bg,
                color: "#FFFFFF",
                padding: "14px 18px",
                borderRadius: 14,
                boxShadow: glow,
                border: border,
                display: "grid",
                gridTemplateColumns: "38px 1fr auto",
                alignItems: "start",
                gap: 12,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 13.5,
                lineHeight: 1.45,
                pointerEvents: "auto",
                animation: "toast-slide-right-in 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
                position: "relative",
                overflow: "hidden",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Icon badge */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: iconBg,
                  color: iconColor,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 17,
                  fontWeight: 900,
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                {t.glyph}
              </div>

              {/* Message body */}
              <div style={{ minWidth: 0, paddingTop: 1 }}>
                {t.title && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: titleColor,
                      letterSpacing: 0.3,
                      marginBottom: 3,
                      textTransform: isError ? "uppercase" : "none",
                    }}
                  >
                    {t.title}
                  </div>
                )}
                <div
                  style={{
                    color: isError ? "#FFFFFF" : "rgba(255, 255, 255, 0.95)",
                    fontWeight: isError ? 600 : 500,
                    fontSize: 13,
                    wordBreak: "break-word",
                  }}
                >
                  {t.message}
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Close notification"
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  border: "none",
                  color: "#FFFFFF",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1,
                  padding: 0,
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
              >
                ✕
              </button>

              {/* Progress bar animation */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  height: 3,
                  background: isError ? "rgba(255, 255, 255, 0.7)" : isSuccess ? "rgba(255, 255, 255, 0.7)" : "var(--gold, #F5B41A)",
                  width: "100%",
                  animation: `toast-progress ${t.duration}ms linear forwards`,
                  transformOrigin: "left",
                }}
              />
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-slide-right-in {
          0% {
            opacity: 0;
            transform: translateX(110%);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes toast-progress {
          0% {
            transform: scaleX(1);
          }
          100% {
            transform: scaleX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
