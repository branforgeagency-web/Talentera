import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TABS = [
  { id: "ALL", label: "All" },
  { id: "OPEN", label: "Awaiting reply" },
  { id: "REPLIED", label: "Replied" },
  { id: "CLOSED", label: "Closed" },
];

const STATUS = {
  OPEN: { label: "Awaiting reply", bg: "#FEF3C7", color: "#92400E" },
  REPLIED: { label: "Replied", bg: "#DCFCE7", color: "#166534" },
  CLOSED: { label: "Closed", bg: "#E2E8F0", color: "#475569" },
};

const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

export default function StaffEnquiries({ getAuthHeader, showToast, onCounts }) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [list, setList] = useState([]);
  const [counts, setCounts] = useState({ open: 0, replied: 0, closed: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  // The parent re-creates these callbacks on every render, so keep them in refs
  // to stop the fetch effect from re-running (and looping) each time.
  const authRef = useRef(getAuthHeader);
  const countsRef = useRef(onCounts);
  authRef.current = getAuthHeader;
  countsRef.current = onCounts;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/enquiries", { headers: { ...authRef.current() } });
      if (res.ok) {
        const data = await res.json();
        setList(data.enquiries || []);
        if (data.counts) {
          setCounts(data.counts);
          if (countsRef.current) countsRef.current(data.counts);
        }
      }
    } catch (_e) {
      // ignore, user can refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return list.filter((e) => {
      if (filter !== "ALL" && e.status !== filter) return false;
      if (!s) return true;
      return [e.candidateName, e.candidateEmail, e.subject, e.message].some((v) => (v || "").toLowerCase().includes(s));
    });
  }, [list, filter, search]);

  const selected = list.find((e) => e._id === selectedId) || null;

  const patch = (updated) => {
    setList((l) => l.map((x) => (x._id === updated._id ? updated : x)));
    load();
  };

  const sendReply = async () => {
    if (!selected || !reply.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/enquiries/${selected._id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authRef.current() },
        body: JSON.stringify({ text: reply }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not send the reply.");
      } else {
        setReply("");
        patch(data.enquiry);
        showToast("Reply sent. The candidate has been notified.");
      }
    } catch (_e) {
      showToast("Could not send the reply.");
    } finally {
      setBusy(false);
    }
  };

  const closeEnquiry = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/enquiries/${selected._id}/close`, { method: "POST", headers: { ...authRef.current() } });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        patch(data.enquiry);
        showToast("Enquiry closed.");
      } else {
        showToast(data.message || "Could not close the enquiry.");
      }
    } catch (_e) {
      showToast("Could not close the enquiry.");
    } finally {
      setBusy(false);
    }
  };

  const pill = (active) => ({
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    border: active ? "1.5px solid #0A1F3D" : "1px solid #E2E8F0",
    background: active ? "#0A1F3D" : "#F8FAFC",
    color: active ? "#fff" : "#475569",
    cursor: "pointer",
  });

  return (
    <div className="tt-content">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0A1F3D", display: "flex", alignItems: "center", gap: 10 }}>
          <i className="fa-solid fa-circle-question" style={{ color: "#D97706" }} /> Candidate Enquiries
        </div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
          Questions sent from the candidate Help &amp; Support page. Reply here and the candidate sees your answer in their portal and gets a notification.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", fontSize: 12.5, fontWeight: 800 }}>
          <span style={{ background: "#FEF3C7", color: "#92400E", padding: "4px 12px", borderRadius: 999 }}>{counts.open} AWAITING REPLY</span>
          <span style={{ background: "#DCFCE7", color: "#166534", padding: "4px 12px", borderRadius: 999 }}>{counts.replied} REPLIED</span>
          <span style={{ background: "#E2E8F0", color: "#475569", padding: "4px 12px", borderRadius: 999 }}>{counts.closed} CLOSED</span>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "12px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setFilter(t.id)} style={pill(filter === t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or question..."
            style={{ minWidth: 240, padding: "7px 12px", fontSize: 12.5, borderRadius: 8, border: "1px solid #CBD5E1", outline: "none" }}
          />
          <button type="button" onClick={load} disabled={loading} style={{ padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", color: "#334155", cursor: "pointer" }}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 380px) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", maxHeight: "70vh", overflowY: "auto" }}>
          {visible.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "#64748B", fontSize: 13 }}>{loading ? "Loading..." : "No enquiries to show."}</div>
          ) : (
            visible.map((e) => {
              const st = STATUS[e.status] || STATUS.OPEN;
              const active = e._id === selectedId;
              return (
                <button
                  key={e._id}
                  type="button"
                  onClick={() => {
                    setSelectedId(e._id);
                    setReply("");
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", border: "none", borderBottom: "1px solid #F1F5F9", background: active ? "#FFF7E0" : "#fff", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: 13.5, color: "#0A1F3D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</span>
                    <span style={{ background: st.bg, color: st.color, fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
                    {e.candidateName || "Candidate"} · {e.category}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>{fmt(e.createdAt)}</div>
                </button>
              );
            })
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: 20, minHeight: 280 }}>
          {!selected ? (
            <div style={{ color: "#64748B", fontSize: 13.5, textAlign: "center", padding: "60px 0" }}>Select an enquiry on the left to read and reply.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: "#0A1F3D" }}>{selected.subject}</div>
                  <div style={{ fontSize: 12.5, color: "#475569", marginTop: 4 }}>
                    {selected.candidateName || "Candidate"}
                    {selected.candidateEmail ? ` · ${selected.candidateEmail}` : ""}
                    {selected.candidateMobile ? ` · ${selected.candidateMobile}` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                    {selected.category} · {fmt(selected.createdAt)}
                  </div>
                </div>
                {selected.status !== "CLOSED" && (
                  <button type="button" onClick={closeEnquiry} disabled={busy} style={{ alignSelf: "flex-start", padding: "7px 14px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", color: "#334155", cursor: "pointer" }}>
                    Close enquiry
                  </button>
                )}
              </div>

              <div style={{ background: "#F1F5F9", borderRadius: 12, padding: "12px 15px", marginBottom: 10 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#475569", marginBottom: 4 }}>Candidate's question</div>
                <div style={{ fontSize: 14, color: "#1E293B", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{selected.message}</div>
              </div>

              {(selected.replies || []).map((r) => (
                <div key={r._id} style={{ background: "#0A1F3D", borderRadius: 12, padding: "12px 15px", marginBottom: 10 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: "#F5B41A", marginBottom: 4 }}>
                    {r.staffName} · {fmt(r.createdAt)}
                  </div>
                  <div style={{ fontSize: 14, color: "#fff", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{r.text}</div>
                </div>
              ))}

              <div style={{ marginTop: 14 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 800, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  {selected.replies?.length ? "Send another reply" : "Your reply"}
                </label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="Type your answer to the candidate..."
                  style={{ width: "100%", boxSizing: "border-box", padding: "11px 13px", fontSize: 14, borderRadius: 10, border: "1.5px solid #CBD5E1", outline: "none", fontFamily: "inherit", resize: "vertical" }}
                />
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={busy || !reply.trim()}
                  style={{ marginTop: 10, padding: "10px 22px", fontSize: 13.5, fontWeight: 800, borderRadius: 10, border: "none", background: busy || !reply.trim() ? "#CBD5E1" : "linear-gradient(135deg,#F5B41A,#E39A0B)", color: "#0A1F3D", cursor: busy || !reply.trim() ? "not-allowed" : "pointer" }}
                >
                  <i className="fa-solid fa-paper-plane" /> {busy ? "Sending..." : "Send reply"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
