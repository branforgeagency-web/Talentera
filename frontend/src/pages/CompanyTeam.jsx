import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import companyApi from "../api/companyClient";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";

const ROLE_LABELS = {
  branch_admin: "Branch Admin",
  recruiter: "Recruiter",
  viewer: "View only",
};
const ROLE_HELP = {
  branch_admin: "Posts jobs and manages applicants for the company.",
  recruiter: "Posts jobs and handles applicants.",
  viewer: "Can look at everything but cannot change anything.",
};

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(10);
  (window.crypto || window.msCrypto).getRandomValues(arr);
  arr.forEach((n) => { out += chars[n % chars.length]; });
  return out + "#7";
}

export default function CompanyTeam() {
  const navigate = useNavigate();
  const { company, logout } = useCompanyAuth();
  const [users, setUsers] = useState([]);
  const [limits, setLimits] = useState({ perBranch: 5, total: 50 });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);
  const emptyForm = { name: "", email: "", mobile: "", designation: "", branch: "", role: "recruiter", password: "" };
  const [form, setForm] = useState(emptyForm);

  async function load() {
    try {
      const res = await companyApi.get("/company/team");
      setUsers(res.data.users || []);
      if (res.data.limits) setLimits(res.data.limits);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Could not load team logins." });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const branches = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const key = u.branch;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(u);
    });
    return [...map.entries()];
  }, [users]);

  async function handleCreate(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    setSaving(true);
    try {
      const res = await companyApi.post("/company/team", form);
      setLastCreated({ email: form.email, password: form.password, name: form.name });
      setForm({ ...emptyForm, branch: form.branch });
      setMsg({ type: "ok", text: res.data.message || "Login created." });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Could not create the login." });
    } finally {
      setSaving(false);
    }
  }

  async function update(u, patch, okText) {
    setMsg({ type: "", text: "" });
    try {
      await companyApi.put(`/company/team/${u._id}`, patch);
      setMsg({ type: "ok", text: okText || "Updated." });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Could not update this login." });
    }
  }

  async function resetPassword(u) {
    const pw = window.prompt(`New password for ${u.name} (min 8 characters):`, genPassword());
    if (!pw) return;
    if (pw.length < 8) { setMsg({ type: "error", text: "Password must be at least 8 characters." }); return; }
    await update(u, { password: pw }, `Password changed for ${u.name}. New password: ${pw}`);
  }

  async function remove(u) {
    if (!window.confirm(`Remove ${u.name}'s login? They will lose access immediately.`)) return;
    setMsg({ type: "", text: "" });
    try {
      await companyApi.delete(`/company/team/${u._id}`);
      setMsg({ type: "ok", text: `${u.name}'s login was removed.` });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Could not remove this login." });
    }
  }

  const inputStyle = { width: "100%", padding: "11px 13px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, color: "var(--navy)", outline: "none", boxSizing: "border-box", background: "#fff" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 5, letterSpacing: "0.04em" };
  const navLink = { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" };

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", color: "var(--navy)" }}>
      <header style={{ background: "var(--navy)", padding: "16px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap", gap: 12 }}>
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/companies/jobs")}>
          <img src="/logo-white.png" alt="Talentera" style={{ height: 36, width: "auto" }} />
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold)", marginTop: 4 }}>TEAM LOGINS</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/companies/directory" style={navLink}>Hire Verified Talent</Link>
          <Link to="/companies/jobs" style={navLink}>Job Posts</Link>
          <Link to="/companies/applicants" style={navLink}>Applicants</Link>
          <Link to="/companies/hiring" style={navLink}>Hiring Flow</Link>
          <Link to="/companies/team" style={{ ...navLink, color: "var(--gold)", padding: "6px 12px", background: "rgba(229,168,46,0.12)", borderRadius: 6 }}>Team Logins</Link>
          <Link to="/companies/dashboard" style={navLink}>Edit Profile</Link>
          {company && (
            <button type="button" onClick={() => { logout(); navigate("/companies"); }} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              Logout
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px 80px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Team Logins</h1>
        <p style={{ color: "#64748B", fontSize: 14, marginBottom: 22, maxWidth: 720 }}>
          You are the head admin of {company?.companyName || "this company"}. Create separate logins for each branch (up to {limits.perBranch} per branch) and choose what each person can do. They sign in at the normal company login page with the email and password you set here.
        </p>

        {msg.text && (
          <div role="status" style={{ marginBottom: 16, padding: "11px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.type === "error" ? "#FEF2F2" : "#F0FDF4", border: `1px solid ${msg.type === "error" ? "#FECACA" : "#BBF7D0"}`, color: msg.type === "error" ? "#B91C1C" : "#15803D" }}>
            {msg.text}
          </div>
        )}

        {lastCreated && (
          <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A", fontSize: 13 }}>
            <strong>Share with {lastCreated.name}:</strong> login <code>{lastCreated.email}</code> · password <code>{lastCreated.password}</code>
            <span style={{ color: "#92400E" }}> (shown only now - the password is not stored in readable form)</span>
          </div>
        )}

        <form onSubmit={handleCreate} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 22, marginBottom: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 14px" }}>Add a login</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div>
              <label style={labelStyle}>FULL NAME *</label>
              <input style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Priya Sharma" />
            </div>
            <div>
              <label style={labelStyle}>WORK EMAIL (LOGIN ID) *</label>
              <input style={inputStyle} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="priya@company.com" />
            </div>
            <div>
              <label style={labelStyle}>BRANCH / LOCATION *</label>
              <input style={inputStyle} required list="team-branches" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="e.g. Hyderabad - Ameerpet" />
              <datalist id="team-branches">{branches.map(([b]) => <option key={b} value={b} />)}</datalist>
            </div>
            <div>
              <label style={labelStyle}>ACCESS LEVEL *</label>
              <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{ROLE_HELP[form.role]}</div>
            </div>
            <div>
              <label style={labelStyle}>DESIGNATION</label>
              <input style={inputStyle} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. HR Manager" />
            </div>
            <div>
              <label style={labelStyle}>MOBILE</label>
              <input style={inputStyle} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="10-digit mobile" />
            </div>
            <div>
              <label style={labelStyle}>PASSWORD (MIN 8) *</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={inputStyle} required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set a password" autoComplete="new-password" />
                <button type="button" onClick={() => setForm({ ...form, password: genPassword() })} style={{ whiteSpace: "nowrap", padding: "0 12px", borderRadius: 10, border: "1.5px solid #CBD5E1", background: "#F8FAFC", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  Generate
                </button>
              </div>
            </div>
          </div>
          <button type="submit" disabled={saving} style={{ marginTop: 18, background: "var(--navy)", color: "var(--gold)", border: "none", padding: "12px 22px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Creating…" : "Create login →"}
          </button>
        </form>

        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Logins by branch</h2>
        {loading ? (
          <div style={{ color: "#64748B" }}>Loading…</div>
        ) : branches.length === 0 ? (
          <div style={{ background: "#fff", border: "1px dashed #CBD5E1", borderRadius: 12, padding: 24, textAlign: "center", color: "#64748B", fontSize: 14 }}>
            No team logins yet. Add the first one above.
          </div>
        ) : (
          branches.map(([branch, list]) => (
            <div key={branch} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, marginBottom: 16, overflow: "hidden" }}>
              <div style={{ padding: "12px 18px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 14 }}>{branch}</strong>
                <span style={{ fontSize: 12, fontWeight: 700, color: list.length >= limits.perBranch ? "#B91C1C" : "#64748B" }}>{list.length} / {limits.perBranch} logins</span>
              </div>
              {list.map((u) => (
                <div key={u._id} style={{ padding: "14px 18px", borderTop: "1px solid #F1F5F9", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", opacity: u.active ? 1 : 0.55 }}>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}{!u.active && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: "#B91C1C", background: "#FEE2E2", padding: "2px 6px", borderRadius: 4 }}>DISABLED</span>}</div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>{u.email}{u.designation ? ` · ${u.designation}` : ""}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{u.lastLoginAt ? `Last login ${new Date(u.lastLoginAt).toLocaleString()}` : "Never logged in"}</div>
                  </div>
                  <select value={u.role} onChange={(e) => update(u, { role: e.target.value }, `${u.name} is now ${ROLE_LABELS[e.target.value]}.`)} style={{ ...inputStyle, width: 150, padding: "8px 10px", fontSize: 13 }}>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button type="button" onClick={() => update(u, { active: !u.active }, u.active ? `${u.name} can no longer log in.` : `${u.name} can log in again.`)} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #CBD5E1", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {u.active ? "Disable" : "Enable"}
                  </button>
                  <button type="button" onClick={() => resetPassword(u)} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #CBD5E1", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Reset password
                  </button>
                  <button type="button" onClick={() => remove(u)} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #FCA5A5", background: "#fff", color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
