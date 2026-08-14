import React, { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

/**
 * Lightweight toast primitive. The prototype fires a toast on nearly every
 * mutating action in the candidate flow (OTP demo code, upload confirmations,
 * validation errors) — this is the equivalent for the React port.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, glyph = "✓") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, glyph }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 360,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: "var(--navy)",
              color: "#fff",
              padding: "12px 16px",
              borderRadius: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--font-body)",
              fontSize: 13.5,
              border: "1px solid rgba(229,168,46,0.3)",
              animation: "toast-in 0.2s ease-out",
            }}
          >
            <span style={{ color: "var(--gold)", fontWeight: 800, flexShrink: 0 }}>{t.glyph}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
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
