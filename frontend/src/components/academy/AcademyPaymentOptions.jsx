import React, { useState, useEffect, useCallback } from "react";

const card = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 };
const inputStyle = { width: "100%", padding: "9px 11px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff" };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };

const MODES = [
  { id: "UPI", icon: "fa-mobile-screen", refLabel: "UPI transaction ID", refRequired: true },
  { id: "Bank Transfer / NEFT", icon: "fa-building-columns", refLabel: "UTR / reference number", refRequired: true },
  { id: "Credit Card", icon: "fa-credit-card", refLabel: "Card transaction reference", refRequired: true },
  { id: "Debit Card", icon: "fa-credit-card", refLabel: "Card transaction reference", refRequired: true },
  { id: "Cash", icon: "fa-money-bill-wave", refLabel: "Receipt number (if any)", refRequired: false },
  { id: "Cheque", icon: "fa-money-check", refLabel: "Cheque number", refRequired: true, detailLabel: "Bank name" },
  { id: "Other", icon: "fa-ellipsis", refLabel: "Reference (if any)", refRequired: false, detailLabel: "How was it paid? *" },
];

const STATUS = {
  submitted: { bg: "#FEF9C3", fg: "#A16207", label: "Awaiting verification" },
  verified: { bg: "#DCFCE7", fg: "#15803D", label: "Verified" },
  rejected: { bg: "#FEE2E2", fg: "#B91C1C", label: "Rejected" },
};

const today = () => new Date().toISOString().slice(0, 10);
const blank = { amount: "", purpose: "", paidOn: today(), reference: "", detail: "", notes: "", proofUrl: "", proofName: "" };
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function AcademyPaymentOptions({ getAuthHeader }) {
  const [mode, setMode] = useState("");
  const [form, setForm] = useState(blank);
  const [payments, setPayments] = useState([]);
  const [totals, setTotals] = useState({ submitted: 0, verified: 0 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/academy/payments", { headers: { ...getAuthHeader() } });
      const data = await res.json();
      if (res.ok) {
        setPayments(data.payments || []);
        setTotals(data.totals || { submitted: 0, verified: 0 });
      }
    } catch (e) {
      flash("Could not load payments.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cfg = MODES.find((m) => m.id === mode);

  const uploadProof = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("doc", file);
      const res = await fetch("/api/academy/kyc/upload-doc", { method: "POST", headers: { ...getAuthHeader() }, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload failed.");
      setForm((f) => ({ ...f, proofUrl: data.docUrl, proofName: data.docName || file.name }));
    } catch (e) {
      flash(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/academy/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ ...form, mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not record the payment.");
      flash("Payment recorded. Talentera will verify it and mark it as verified.");
      setForm({ ...blank, paidOn: today() });
      setMode("");
      load();
    } catch (e) {
      flash(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (p) => {
    if (!window.confirm("Remove this payment entry?")) return;
    try {
      const res = await fetch(`/api/academy/payments/${p._id}`, { method: "DELETE", headers: { ...getAuthHeader() } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not remove.");
      load();
    } catch (e) {
      flash(e.message, "error");
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Payment Options</h3>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, maxWidth: 620 }}>
          Choose how you paid Talentera and record the details. Talentera verifies each entry against its records.
        </div>
      </div>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: msg.type === "error" ? "#FEF2F2" : "#F0FDF4", color: msg.type === "error" ? "#B91C1C" : "#15803D", border: `1px solid ${msg.type === "error" ? "#FECACA" : "#BBF7D0"}` }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ ...card, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: 0.4 }}>AWAITING VERIFICATION</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#A16207" }}>{inr(totals.submitted)}</div>
        </div>
        <div style={{ ...card, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: 0.4 }}>VERIFIED PAYMENTS</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#15803D" }}>{inr(totals.verified)}</div>
        </div>
      </div>

      <div style={card}>
        <h4 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "#06152A" }}>Mode of Payment</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                style={{ padding: "14px 10px", borderRadius: 10, cursor: "pointer", textAlign: "center", border: `2px solid ${active ? "#E5A82E" : "#E2E8F0"}`, background: active ? "#FFFBEB" : "#fff", fontWeight: 700, fontSize: 12, color: "#06152A" }}
              >
                <i className={`fa-solid ${m.icon}`} style={{ display: "block", fontSize: 20, marginBottom: 6, color: active ? "#B45309" : "#475569" }} />
                {m.id}
              </button>
            );
          })}
        </div>

        {cfg && (
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Amount paid (₹) *</label>
              <input style={inputStyle} type="number" min="1" value={form.amount} onChange={set("amount")} />
            </div>
            <div>
              <label style={labelStyle}>Date of payment</label>
              <input style={inputStyle} type="date" max={today()} value={form.paidOn} onChange={set("paidOn")} />
            </div>
            <div>
              <label style={labelStyle}>{cfg.refLabel}{cfg.refRequired ? " *" : ""}</label>
              <input style={inputStyle} value={form.reference} onChange={set("reference")} />
            </div>
            {cfg.detailLabel ? (
              <div>
                <label style={labelStyle}>{cfg.detailLabel}</label>
                <input style={inputStyle} value={form.detail} onChange={set("detail")} />
              </div>
            ) : (
              <div>
                <label style={labelStyle}>Payment for</label>
                <input style={inputStyle} value={form.purpose} onChange={set("purpose")} placeholder="e.g. Annual partnership fee" />
              </div>
            )}
            {cfg.detailLabel && (
              <div>
                <label style={labelStyle}>Payment for</label>
                <input style={inputStyle} value={form.purpose} onChange={set("purpose")} placeholder="e.g. Annual partnership fee" />
              </div>
            )}
            <div>
              <label style={labelStyle}>Proof (screenshot / receipt, optional)</label>
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" style={{ fontSize: 12 }} onChange={(e) => uploadProof(e.target.files[0])} />
              {form.proofName && <div style={{ fontSize: 11, color: "#15803D", marginTop: 3 }}>Attached: {form.proofName}</div>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Notes (optional)</label>
              <input style={inputStyle} value={form.notes} onChange={set("notes")} maxLength={300} />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
              <button
                disabled={busy || !form.amount}
                onClick={submit}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#06152A", color: "#E5A82E", fontWeight: 800, fontSize: 12, cursor: "pointer", opacity: busy || !form.amount ? 0.6 : 1 }}
              >
                {busy ? "Please wait..." : "Submit payment details"}
              </button>
              <button onClick={() => { setMode(""); setForm({ ...blank, paidOn: today() }); }} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 11, color: "#64748B" }}>Never enter card numbers, CVV or PINs here - only the transaction reference.</div>
      </div>

      <div style={card}>
        <h4 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "#06152A" }}>Payment history ({payments.length})</h4>
        {payments.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "#64748B" }}>No payments recorded yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#64748B", fontSize: 11 }}>
                  {["Date", "Mode", "Amount", "Reference", "For", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "6px 8px", borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const st = STATUS[p.status] || STATUS.submitted;
                  return (
                    <tr key={p._id}>
                      <td style={{ padding: "8px", borderBottom: "1px solid #F1F5F9" }}>{new Date(p.paidOn).toLocaleDateString("en-IN")}</td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #F1F5F9" }}>{p.mode}{p.detail ? ` (${p.detail})` : ""}</td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #F1F5F9", fontWeight: 800 }}>{inr(p.amount)}</td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #F1F5F9" }}>
                        {p.reference || "-"}
                        {p.proofUrl && (
                          <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 6, color: "#2563EB", fontWeight: 700 }}>proof</a>
                        )}
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #F1F5F9" }}>{p.purpose || "-"}</td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #F1F5F9" }}>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: st.bg, color: st.fg }}>{st.label}</span>
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #F1F5F9" }}>
                        {p.status !== "verified" && (
                          <button onClick={() => withdraw(p)} style={{ border: "none", background: "none", color: "#B91C1C", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>Remove</button>
                        )}
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
