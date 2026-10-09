import React, { useState, useEffect, useCallback } from "react";

const card = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 };
const inputStyle = { width: "100%", padding: "9px 11px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff" };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };

const STATUS = {
  submitted: { bg: "#FEF9C3", fg: "#A16207", label: "Submitted" },
  contacted: { bg: "#DBEAFE", fg: "#1D4ED8", label: "Talentera contacted" },
  onboarded: { bg: "#DCFCE7", fg: "#15803D", label: "Onboarded" },
  declined: { bg: "#FEE2E2", fg: "#B91C1C", label: "Not taken forward" },
};

const blank = { referredAcademyName: "", contactPerson: "", phone: "", email: "", city: "", studentsPerYear: "", notes: "" };

export default function AcademyReferrals({ getAuthHeader }) {
  const [form, setForm] = useState(blank);
  const [referrals, setReferrals] = useState([]);
  const [totals, setTotals] = useState({ total: 0, onboarded: 0, pending: 0 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/academy/referrals", { headers: { ...getAuthHeader() } });
      const data = await res.json();
      if (res.ok) {
        setReferrals(data.referrals || []);
        setTotals(data.totals || { total: 0, onboarded: 0, pending: 0 });
      }
    } catch (e) {
      flash("Could not load referrals.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/academy/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not submit the referral.");
      flash("Referral submitted. The Talentera team will reach out to this academy.");
      setForm(blank);
      load();
    } catch (e) {
      flash(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (r) => {
    if (!window.confirm("Remove this referral?")) return;
    try {
      const res = await fetch(`/api/academy/referrals/${r._id}`, { method: "DELETE", headers: { ...getAuthHeader() } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not remove.");
      load();
    } catch (e) {
      flash(e.message, "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Academy Referrals</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>Know another academy that should be on Talentera? Refer them here and track where it stands.</p>
      </div>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: msg.type === "error" ? "#FEE2E2" : "#DCFCE7", color: msg.type === "error" ? "#B91C1C" : "#15803D" }}>{msg.text}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {[["Referred", totals.total, "#06152A"], ["In progress", totals.pending, "#A16207"], ["Onboarded", totals.onboarded, "#15803D"]].map(([l, v, c]) => (
          <div key={l} style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#06152A", marginBottom: 12 }}>Refer an academy</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div><label style={labelStyle}>Academy name *</label><input style={inputStyle} value={form.referredAcademyName} onChange={set("referredAcademyName")} maxLength={150} /></div>
          <div><label style={labelStyle}>Contact person *</label><input style={inputStyle} value={form.contactPerson} onChange={set("contactPerson")} maxLength={100} /></div>
          <div><label style={labelStyle}>Phone *</label><input style={inputStyle} value={form.phone} onChange={set("phone")} maxLength={20} inputMode="tel" /></div>
          <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={set("email")} maxLength={120} /></div>
          <div><label style={labelStyle}>City</label><input style={inputStyle} value={form.city} onChange={set("city")} maxLength={80} /></div>
          <div><label style={labelStyle}>Students per year (approx.)</label><input style={inputStyle} value={form.studentsPerYear} onChange={set("studentsPerYear")} maxLength={30} /></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={set("notes")} maxLength={300} placeholder="Anything that helps us approach them" />
        </div>
        <button className="btn btn-navy" style={{ marginTop: 14, fontSize: 13 }} onClick={submit} disabled={busy}>
          {busy ? "Submitting..." : "Submit Referral"}
        </button>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#06152A", marginBottom: 10 }}>Your referrals</div>
        {referrals.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94A3B8", padding: "14px 0" }}>No referrals yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#64748B", fontSize: 11, textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 6px" }}>Academy</th><th style={{ padding: "8px 6px" }}>Contact</th><th style={{ padding: "8px 6px" }}>City</th><th style={{ padding: "8px 6px" }}>Referred on</th><th style={{ padding: "8px 6px" }}>Status</th><th />
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => {
                  const st = STATUS[r.status] || STATUS.submitted;
                  return (
                    <tr key={r._id} style={{ borderTop: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "10px 6px", fontWeight: 700, color: "#06152A" }}>{r.referredAcademyName}</td>
                      <td style={{ padding: "10px 6px" }}>{r.contactPerson}<div style={{ fontSize: 11, color: "#64748B" }}>{r.phone}</div></td>
                      <td style={{ padding: "10px 6px" }}>{r.city || "—"}</td>
                      <td style={{ padding: "10px 6px" }}>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
                      <td style={{ padding: "10px 6px" }}><span style={{ background: st.bg, color: st.fg, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>{st.label}</span></td>
                      <td style={{ padding: "10px 6px", textAlign: "right" }}>
                        {r.status === "submitted" && <button className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => withdraw(r)}>Remove</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
