import React, { useState, useEffect, useCallback } from "react";

const card = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 };
const inputStyle = { width: "100%", padding: "9px 11px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff" };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };

const STATUSES = ["Under Discussion", "Signed", "Active", "Expired"];
const STATUS_STYLE = {
  "Under Discussion": { bg: "#FEF9C3", fg: "#A16207" },
  Signed: { bg: "#DBEAFE", fg: "#1D4ED8" },
  Active: { bg: "#DCFCE7", fg: "#15803D" },
  Expired: { bg: "#FEE2E2", fg: "#B91C1C" },
};

const blank = { collegeName: "", city: "", contactPerson: "", phone: "", email: "", status: "Under Discussion", signedOn: "", validUntil: "", studentsCovered: "", scope: "", documentUrl: "", documentName: "" };
const d10 = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");
const fmt = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "—");

export default function AcademyCollegeMous({ getAuthHeader }) {
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [mous, setMous] = useState([]);
  const [totals, setTotals] = useState({ total: 0, active: 0, discussion: 0, expired: 0, studentsCovered: 0 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/academy/mous", { headers: { ...getAuthHeader() } });
      const data = await res.json();
      if (res.ok) {
        setMous(data.mous || []);
        setTotals(data.totals || {});
      }
    } catch (e) {
      flash("Could not load MoUs.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const needsSigned = form.status === "Signed" || form.status === "Active";

  const uploadDoc = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("doc", file);
      const res = await fetch("/api/academy/kyc/upload-doc", { method: "POST", headers: { ...getAuthHeader() }, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload failed.");
      setForm((f) => ({ ...f, documentUrl: data.docUrl, documentName: data.docName || file.name }));
    } catch (e) {
      flash(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setForm(blank);
    setEditingId(null);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch(editingId ? `/api/academy/mous/${editingId}` : "/api/academy/mous", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not save the MoU.");
      flash(editingId ? "MoU updated." : "MoU added.");
      reset();
      load();
    } catch (e) {
      flash(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const edit = (m) => {
    setEditingId(m._id);
    setForm({
      collegeName: m.collegeName || "", city: m.city || "", contactPerson: m.contactPerson || "", phone: m.phone || "", email: m.email || "",
      status: m.status === "Expired" ? "Expired" : m.status, signedOn: d10(m.signedOn), validUntil: d10(m.validUntil),
      studentsCovered: m.studentsCovered || "", scope: m.scope || "", documentUrl: m.documentUrl || "", documentName: m.documentName || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (m) => {
    if (!window.confirm(`Remove the MoU with ${m.collegeName}?`)) return;
    try {
      const res = await fetch(`/api/academy/mous/${m._id}`, { method: "DELETE", headers: { ...getAuthHeader() } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not remove.");
      if (editingId === m._id) reset();
      load();
    } catch (e) {
      flash(e.message, "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>College MoUs</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>Keep a record of the colleges your academy has a tie-up with, and the MoU document for each.</p>
      </div>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: msg.type === "error" ? "#FEE2E2" : "#DCFCE7", color: msg.type === "error" ? "#B91C1C" : "#15803D" }}>{msg.text}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {[["Total MoUs", totals.total, "#06152A"], ["Signed / Active", totals.active, "#15803D"], ["Under discussion", totals.discussion, "#A16207"], ["Students covered", totals.studentsCovered, "#2563EB"]].map(([l, v, c]) => (
          <div key={l} style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c, marginTop: 4 }}>{v || 0}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#06152A", marginBottom: 12 }}>{editingId ? "Edit MoU" : "Add a college MoU"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div><label style={labelStyle}>College name *</label><input style={inputStyle} value={form.collegeName} onChange={set("collegeName")} maxLength={150} /></div>
          <div><label style={labelStyle}>City</label><input style={inputStyle} value={form.city} onChange={set("city")} maxLength={80} /></div>
          <div><label style={labelStyle}>Contact person</label><input style={inputStyle} value={form.contactPerson} onChange={set("contactPerson")} maxLength={100} /></div>
          <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={set("phone")} maxLength={20} inputMode="tel" /></div>
          <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={set("email")} maxLength={120} /></div>
          <div>
            <label style={labelStyle}>MoU status</label>
            <select style={inputStyle} value={form.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div><label style={labelStyle}>Signed on{needsSigned ? " *" : ""}</label><input style={inputStyle} type="date" value={form.signedOn} onChange={set("signedOn")} /></div>
          <div><label style={labelStyle}>Valid until</label><input style={inputStyle} type="date" value={form.validUntil} onChange={set("validUntil")} /></div>
          <div><label style={labelStyle}>Students covered</label><input style={inputStyle} type="number" min="0" value={form.studentsCovered} onChange={set("studentsCovered")} /></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Scope of the MoU</label>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.scope} onChange={set("scope")} maxLength={300} placeholder="e.g. campus training batches, placement drives, internships" />
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>MoU document (PDF / image)</label>
          <input type="file" accept=".pdf,image/*" onChange={(e) => uploadDoc(e.target.files[0])} disabled={busy} style={{ fontSize: 12 }} />
          {form.documentUrl && (
            <div style={{ fontSize: 12, color: "#15803D", marginTop: 4 }}>
              Attached: <a href={form.documentUrl} target="_blank" rel="noreferrer">{form.documentName || "document"}</a>
              {" · "}<span style={{ color: "#B91C1C", cursor: "pointer" }} onClick={() => setForm({ ...form, documentUrl: "", documentName: "" })}>remove</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn btn-navy" style={{ fontSize: 13 }} onClick={submit} disabled={busy}>{busy ? "Saving..." : editingId ? "Update MoU" : "Add MoU"}</button>
          {editingId && <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={reset}>Cancel</button>}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#06152A", marginBottom: 10 }}>Your college MoUs</div>
        {mous.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94A3B8", padding: "14px 0" }}>No MoUs added yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#64748B", fontSize: 11, textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 6px" }}>College</th><th style={{ padding: "8px 6px" }}>Contact</th><th style={{ padding: "8px 6px" }}>Signed</th><th style={{ padding: "8px 6px" }}>Valid until</th><th style={{ padding: "8px 6px" }}>Students</th><th style={{ padding: "8px 6px" }}>Status</th><th style={{ padding: "8px 6px" }}>Document</th><th />
                </tr>
              </thead>
              <tbody>
                {mous.map((m) => {
                  const st = STATUS_STYLE[m.status] || STATUS_STYLE["Under Discussion"];
                  return (
                    <tr key={m._id} style={{ borderTop: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "10px 6px", fontWeight: 700, color: "#06152A" }}>{m.collegeName}<div style={{ fontSize: 11, color: "#64748B", fontWeight: 400 }}>{m.city}</div></td>
                      <td style={{ padding: "10px 6px" }}>{m.contactPerson || "—"}<div style={{ fontSize: 11, color: "#64748B" }}>{m.phone}</div></td>
                      <td style={{ padding: "10px 6px" }}>{fmt(m.signedOn)}</td>
                      <td style={{ padding: "10px 6px" }}>{fmt(m.validUntil)}</td>
                      <td style={{ padding: "10px 6px" }}>{m.studentsCovered || "—"}</td>
                      <td style={{ padding: "10px 6px" }}><span style={{ background: st.bg, color: st.fg, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>{m.status}</span></td>
                      <td style={{ padding: "10px 6px" }}>{m.documentUrl ? <a href={m.documentUrl} target="_blank" rel="noreferrer">View</a> : "—"}</td>
                      <td style={{ padding: "10px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px", marginRight: 6 }} onClick={() => edit(m)}>Edit</button>
                        <button className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => remove(m)}>Remove</button>
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
