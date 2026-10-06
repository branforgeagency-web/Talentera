import React, { useEffect, useRef, useState } from "react";
import api from "../api/client";

const SUGGESTIONS = [
  "How are the 7 stages scored?",
  "My camera is not working in the video pitch",
  "How do I edit my resume?",
  "How do I apply for jobs?",
  "Why is a stage locked?",
];

const GREETING =
  "Hi, I am the Talentera Assistant. Ask me anything about your 7 stages, score, resume, documents, jobs or applications.";

// Minimal formatter: **bold**, "- " bullets and numbered lines, line breaks. No raw HTML is ever injected.
function renderInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={keyPrefix + i}>{part.slice(2, -2)}</strong>
    ) : (
      <React.Fragment key={keyPrefix + i}>{part}</React.Fragment>
    )
  );
}

function FormattedText({ text }) {
  const lines = String(text || "").split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const bullet = line.match(/^\s*[-*]\s+(.*)/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)/);
        if (bullet)
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginTop: 3 }}>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>{renderInline(bullet[1], `b${i}-`)}</span>
            </div>
          );
        if (numbered)
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginTop: 3 }}>
              <span style={{ fontWeight: 800, minWidth: 16 }}>{numbered[1]}.</span>
              <span>{renderInline(numbered[2], `n${i}-`)}</span>
            </div>
          );
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
        return <div key={i}>{renderInline(line, `l${i}-`)}</div>;
      })}
    </>
  );
}

export default function SupportChatBot() {
  const [messages, setMessages] = useState([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const send = async (raw) => {
    const text = String(raw ?? input).trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const payload = next.filter((m, i) => !(i === 0 && m.role === "assistant")).map(({ role, content }) => ({ role, content }));
      const { data } = await api.post("/support/chat", { messages: payload });
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "Sorry, I could not find an answer." }]);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "I could not reach the assistant right now. Please try again, or contact the Talentera team using the details in your registration email.";
      setMessages((m) => [...m, { role: "assistant", content: msg, isError: true }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const reset = () => {
    setMessages([{ role: "assistant", content: GREETING }]);
    setInput("");
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,27,61,0.1)",
        borderRadius: 18,
        boxShadow: "0 6px 24px rgba(15,27,61,0.07)",
        display: "flex",
        flexDirection: "column",
        height: "min(640px, calc(100vh - 220px))",
        minHeight: 460,
        overflow: "hidden",
        maxWidth: 900,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#0B1B3D 0%,#14295C 100%)",
          color: "#FFFFFF",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "linear-gradient(135deg,#F5B41A,#E39A0B)",
              color: "#0B1B3D",
              display: "grid",
              placeItems: "center",
              fontSize: 18,
            }}
          >
            <i className="fa-solid fa-robot" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Talentera Assistant</div>
            <div style={{ fontSize: 11.5, opacity: 0.75, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="fa-solid fa-circle" style={{ fontSize: 7, color: "#34D399" }} />
              AI help, replies instantly
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          title="Start a new chat"
          style={{
            background: "rgba(255,255,255,0.12)",
            color: "#FFFFFF",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 999,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <i className="fa-solid fa-rotate-right" /> New chat
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", background: "#F8FAFC", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => {
          const mine = m.role === "user";
          return (
            <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", gap: 10 }}>
              {!mine && (
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    background: "#0B1B3D",
                    color: "#F5B41A",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  <i className="fa-solid fa-robot" />
                </div>
              )}
              <div
                style={{
                  maxWidth: "78%",
                  padding: "10px 14px",
                  borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: mine ? "linear-gradient(135deg,#F5B41A,#E8A317)" : m.isError ? "#FEF2F2" : "#FFFFFF",
                  color: mine ? "#0B1B3D" : m.isError ? "#B91C1C" : "#1E293B",
                  border: mine ? "none" : "1px solid rgba(15,27,61,0.08)",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  fontWeight: mine ? 600 : 500,
                  boxShadow: "0 1px 3px rgba(15,27,61,0.06)",
                  wordBreak: "break-word",
                }}
              >
                <FormattedText text={m.content} />
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "#0B1B3D", color: "#F5B41A", display: "grid", placeItems: "center", fontSize: 13 }}>
              <i className="fa-solid fa-robot" />
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(15,27,61,0.08)", borderRadius: 16, padding: "12px 16px", color: "#64748B", fontSize: 13 }}>
              <i className="fa-solid fa-ellipsis fa-fade" /> Thinking
            </div>
          </div>
        )}

        {messages.length === 1 && !loading && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(15,27,61,0.15)",
                  color: "#0B1B3D",
                  borderRadius: 999,
                  padding: "8px 14px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        style={{ display: "flex", gap: 10, padding: "12px 16px", borderTop: "1px solid rgba(15,27,61,0.08)", background: "#FFFFFF" }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Type your question about Talentera..."
          disabled={loading}
          style={{
            flex: 1,
            border: "1.5px solid rgba(15,27,61,0.15)",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 14,
            outline: "none",
            background: "#F8FAFC",
            color: "#0B1B3D",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? "#CBD5E1" : "linear-gradient(135deg,#F5B41A,#E39A0B)",
            color: "#0B1B3D",
            border: "none",
            borderRadius: 12,
            padding: "0 20px",
            fontWeight: 800,
            fontSize: 14,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <i className="fa-solid fa-paper-plane" /> Send
        </button>
      </form>
    </div>
  );
}
