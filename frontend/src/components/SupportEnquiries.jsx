import React, { useCallback, useEffect, useState } from "react";
import api from "../api/client";

const CATEGORIES = [
  "Account & Login",
  "Stages & Score",
  "Assessment / Video Pitch",
  "Documents & Resume",
  "Jobs & Applications",
  "Referrals & Rewards",
  "Other",
];

const STATUS_STYLE = {
  OPEN: { label: "Awaiting reply", bg: "#FEF3C7", color: "#92400E", icon: "fa-clock" },
  REPLIED: { label: "Replied", bg: "#DCFCE7", color: "#166534", icon: "fa-circle-check" },
  CLOSED: { label: "Closed", bg: "#E2E8F0", color: "#475569", icon: "fa-lock" },
};

const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

const field = {
  width: "100%",
  boxSizing: "border-box",
  border: "1.5px solid rgba(15,27,61,0.15)",
  borderRadius: 10,
  padding: "11px 13px",
  fontSize: 14,
  outline: "none",
  background: "#F8FAFC",
  color: "#0B1B3D",
  fontFamily: "inherit",
};

const label = { display: "block", fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "#475569", marginBottom: 6 };

export default function SupportEnquiries() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/support/enquiries");
      setEnquiries(data.enquiries || []);
    } catch (_e) {
      // keep whatever is already shown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    if (!subject.trim() || !message.trim()) {
      setNotice({ type: "error", text: "Please enter a subject and your question." });
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const { data } = await api.post("/support/enquiries", { category, subject, message });
      setEnquiries((list) => [data.enquiry, ...list]);
      setSubject("");
      setMessage("");
      setCategory(CATEGORIES[0]);
      setOpenId(data.enquiry._id);
      setNotice({ type: "success", text: "Your enquiry has been sent. Our team will reply here soon." });
    } catch (err) {
      setNotice({ type: "error", text: err.response?.data?.message || "Could not send your enquiry. Please try again." });
    } finally {
      setSending(false);
    }
  };

  const toggle = async (enq) => {
    const opening = openId !== enq._id;
    setOpenId(opening ? enq._id : null);
    if (opening && enq.unreadByCandidate) {
      setEnquiries((list) => list.map((x) => (x._id === enq._id ? { ...x, unreadByCandidate: false } : x)));
      try {
        await api.post(`/support/enquiries/${enq._id}/seen`);
      } catch (_e) {
        // non-critical
      }
    }
  };

  const card = { background: "#FFFFFF", border: "1px solid rgba(15,27,61,0.1)", borderRadius: 16, boxShadow: "0 4px 18px rgba(15,27,61,0.06)" };

  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 900 }}>
      <form onSubmit={submit} style={{ ...card, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#F5B41A,#E39A0B)", color: "#0B1B3D", display: "grid", placeItems: "center", fontSize: 17 }}>
            <i className="fa-solid fa-circle-question" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#0B1B3D" }}>Ask us a question</div>
            <div style={{ fontSize: 12.5, color: "#64748B" }}>Our team reads every enquiry and replies here. You will also get a notification.</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={label}>Topic</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={field}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} placeholder="Short title for your question" style={field} />
          </div>
        </div>

        <label style={label}>Your question</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={5}
          placeholder="Describe your question or problem. Please do not share passwords, OTPs or your full Aadhaar number."
          style={{ ...field, resize: "vertical" }}
        />
        <div style={{ textAlign: "right", fontSize: 11.5, color: "#94A3B8", marginTop: 4 }}>{message.length}/2000</div>

        {notice && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              background: notice.type === "success" ? "#DCFCE7" : "#FEE2E2",
              color: notice.type === "success" ? "#166534" : "#991B1B",
            }}
          >
            {notice.text}
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          style={{
            marginTop: 14,
            background: sending ? "#CBD5E1" : "linear-gradient(135deg,#F5B41A,#E39A0B)",
            color: "#0B1B3D",
            border: "none",
            borderRadius: 11,
            padding: "12px 24px",
            fontWeight: 800,
            fontSize: 14,
            cursor: sending ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <i className="fa-solid fa-paper-plane" /> {sending ? "Sending..." : "Send enquiry"}
        </button>
      </form>

      <div style={{ ...card, padding: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#0B1B3D", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <i className="fa-solid fa-inbox" style={{ color: "#E39A0B" }} /> My enquiries
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{enquiries.length}</span>
        </div>

        {loading ? (
          <div style={{ color: "#64748B", fontSize: 13.5 }}>
            <i className="fa-solid fa-spinner fa-spin" /> Loading...
          </div>
        ) : enquiries.length === 0 ? (
          <div style={{ color: "#64748B", fontSize: 13.5, padding: "18px 0", textAlign: "center" }}>You have not asked anything yet. Your questions and our replies will appear here.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {enquiries.map((enq) => {
              const st = STATUS_STYLE[enq.status] || STATUS_STYLE.OPEN;
              const isOpen = openId === enq._id;
              return (
                <div key={enq._id} style={{ border: enq.unreadByCandidate ? "1.5px solid #F5B41A" : "1px solid rgba(15,27,61,0.1)", borderRadius: 12, overflow: "hidden", background: enq.unreadByCandidate ? "#FFFBEB" : "#FFFFFF" }}>
                  <button
                    type="button"
                    onClick={() => toggle(enq)}
                    style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "13px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#0B1B3D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{enq.subject}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                        {enq.category} · {fmt(enq.createdAt)}
                      </div>
                    </div>
                    {enq.unreadByCandidate && <span style={{ background: "#F5B41A", color: "#0B1B3D", fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 999 }}>NEW REPLY</span>}
                    <span style={{ background: st.bg, color: st.color, fontSize: 11.5, fontWeight: 800, padding: "4px 11px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <i className={`fa-solid ${st.icon}`} /> {st.label}
                    </span>
                    <i className={`fa-solid fa-chevron-${isOpen ? "up" : "down"}`} style={{ color: "#94A3B8", fontSize: 12 }} />
                  </button>

                  {isOpen && (
                    <div style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>
                      <div style={{ background: "#F1F5F9", borderRadius: 12, padding: "11px 14px" }}>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: "#475569", marginBottom: 4 }}>You asked</div>
                        <div style={{ fontSize: 13.5, color: "#1E293B", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{enq.message}</div>
                      </div>
                      {(enq.replies || []).map((r) => (
                        <div key={r._id} style={{ background: "#0B1B3D", borderRadius: 12, padding: "11px 14px" }}>
                          <div style={{ fontSize: 11.5, fontWeight: 800, color: "#F5B41A", marginBottom: 4 }}>
                            {r.staffName || "Talentera Support"} · {fmt(r.createdAt)}
                          </div>
                          <div style={{ fontSize: 13.5, color: "#FFFFFF", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{r.text}</div>
                        </div>
                      ))}
                      {(!enq.replies || enq.replies.length === 0) && enq.status !== "CLOSED" && (
                        <div style={{ fontSize: 12.5, color: "#64748B" }}>Our team has received your question and will reply here soon.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
