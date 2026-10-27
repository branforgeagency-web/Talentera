import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import companyApi from "../api/companyClient";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import HeadOnly from "../components/company/HeadOnly.jsx";
import { StageBadge, Pill, Card, Btn, Field, Modal, Table, td, inputStyle, fmtDate, fmtDay } from "../components/hiring/hiringUi.jsx";

const TABS = [
  ["applicants", "1 · Applicants"],
  ["exams", "2 · Assessment & results"],
  ["technical", "3 · Technical round"],
  ["hr", "4 · HR round"],
  ["bgv", "5 · BGV"],
  ["approval", "6 · Final approval"],
  ["offers", "7 · Offer letter & audit"],
  ["setup", "Setup"],
];

// BGV cleared = verified, or deferred to onboarding (records without BGV info are not blocked)
const bgvOk = (a) => !a.hr?.bgv || a.hr.bgv.status === "verified" || a.hr.bgv.status === "deferred";

// ISO -> value for <input type="datetime-local"> in the viewer's own timezone
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toIso = (local) => { if (!local) return ""; const d = new Date(local); return Number.isNaN(d.getTime()) ? "" : d.toISOString(); };

const errMsg = (e, d) => e?.response?.data?.message || d;

// Hiring flow: 100 pre-screened applicants -> batch hires in one sprint.
export default function CompanyHiring() {
  const navigate = useNavigate();
  const { company, logout } = useCompanyAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialTab = new URLSearchParams(window.location.search).get("tab");
  const [tab, setTab] = useState(initialTab && TABS.some(([k]) => k === initialTab) ? initialTab : "applicants");
  const [jobId, setJobId] = useState("");
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState({}); // selected application ids
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await companyApi.get("/company/notifications");
      setNotifications(res.data.notifications || []);
    } catch (_) {}
  }, []);

  const markNotifsRead = async () => {
    try {
      await companyApi.post("/company/notifications/mark-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (_) {}
  };

  const load = useCallback(async () => {
    try {
      const res = await companyApi.get("/company/hiring/overview", { params: jobId ? { jobId } : {} });
      setData(res.data);
      loadNotifications();
    } catch (e) {
      toast(errMsg(e, "Could not load the hiring flow."), "!");
    } finally {
      setLoading(false);
    }
  }, [jobId, loadNotifications]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSel({}); }, [tab, jobId]);

  // Sync tab with URL search if changed
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && TABS.some(([k]) => k === t)) {
      setTab(t);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      if (okMsg) toast(typeof okMsg === "function" ? okMsg(res.data) : okMsg, "✓");
      await load();
      return res.data;
    } catch (e) {
      toast(errMsg(e, "Something went wrong."), "!");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const apps = data?.applications || [];
  const byStage = useMemo(() => {
    const m = {};
    apps.forEach((a) => { (m[a.stage] = m[a.stage] || []).push(a); });
    return m;
  }, [apps]);
  const selIds = Object.keys(sel).filter((k) => sel[k]);
  const toggle = (id) => setSel((s) => ({ ...s, [id]: !s[id] }));
  const toggleAll = (list) => setSel(list.every((a) => sel[a.id]) ? {} : Object.fromEntries(list.map((a) => [a.id, true])));

  const f = data?.funnel || {};
  const funnelSteps = [
    ["Applied", f.applied], ["Exam allocated", f.examAllocated], ["Exam taken", f.examTaken], ["Cleared cutoff", f.examPassed],
    ["Cleared technical", f.techCleared], ["HR recommended", f.hrCleared], ["Approved", f.approved], ["Offers sent", f.offered],
  ];

  const navLink = { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" };
  const common = { data, apps, byStage, sel, toggle, toggleAll, selIds, act, busy, jobId, setTab, reload: load, toast };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <header style={{ background: "var(--navy)", padding: "16px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap", gap: 10 }}>
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/companies/dashboard")}>
          <img src="/logo-white.png" alt="Talentera" style={{ height: 36, width: "auto" }} />
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold)", marginTop: 4 }}>HIRING FLOW</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", position: "relative" }}>
          <Link to="/companies/directory" style={navLink}>Hire Verified Talent</Link>
          <Link to="/companies/jobs" style={navLink}>Job Posts</Link>
          <Link to="/companies/applicants" style={navLink}>Applicants</Link>
          <Link to="/companies/hiring" style={{ ...navLink, color: "var(--gold)", padding: "6px 12px", background: "rgba(229,168,46,0.12)", borderRadius: 6 }}>Hiring Flow</Link>
          <HeadOnly><Link to="/companies/team" style={navLink}>Team Logins</Link></HeadOnly>
          <HeadOnly><Link to="/companies/dashboard" style={navLink}>Edit Profile</Link></HeadOnly>

          {/* Notifications Bell */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setShowNotifs((s) => !s);
                if (!showNotifs && unreadCount > 0) markNotifsRead();
              }}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#fff",
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
              }}
              title="Notifications"
            >
              <i className="fa-solid fa-bell" style={{ fontSize: 14 }}></i>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    background: "#EF4444",
                    color: "#fff",
                    borderRadius: "50%",
                    fontSize: 10,
                    fontWeight: 800,
                    width: 17,
                    height: 17,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid var(--navy)",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div
                style={{
                  position: "absolute",
                  top: 44,
                  right: 0,
                  width: 360,
                  maxWidth: "90vw",
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                  border: "1px solid #E2E8F0",
                  zIndex: 200,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    background: "var(--navy)",
                    color: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong style={{ fontSize: 13 }}>RECRUITER NOTIFICATIONS</strong>
                  <span style={{ fontSize: 10.5, background: "rgba(255,255,255,0.2)", padding: "2px 7px", borderRadius: 4 }}>
                    {notifications.length} Total
                  </span>
                </div>

                <div style={{ maxHeight: 340, overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                      No notifications yet. Candidate assessment results will appear here.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isAssessment = n.type?.startsWith("assessment");
                      return (
                        <div
                          key={n._id}
                          onClick={() => {
                            setShowNotifs(false);
                            if (isAssessment) {
                              setTab("technical");
                            }
                          }}
                          style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid #F1F5F9",
                            background: n.read ? "#fff" : "#FEFCE8",
                            cursor: isAssessment ? "pointer" : "default",
                            transition: "background 0.15s",
                          }}
                        >
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--navy)", marginBottom: 2 }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.4 }}>{n.message}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
                            <div style={{ fontSize: 10, color: "#94A3B8" }}>
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                              {new Date(n.createdAt).toLocaleDateString()}
                            </div>
                            {isAssessment && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8" }}>
                                Open Technical Round →
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {company && <button type="button" onClick={() => { logout(); navigate("/companies"); }} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Logout</button>}
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 24px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>Batch Hiring Flow</h1>
            <p style={{ fontSize: 13.5, color: "#64748B", margin: 0 }}>Pre-screened applicants → exam → technical → HR → management approval → offers, all in one place.</p>
          </div>
          <Field label="ROLE / JOB">
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} style={{ ...inputStyle, minWidth: 220 }}>
              <option value="">All roles</option>
              {(data?.jobs || []).map((j) => <option key={j.jobId} value={j.jobId}>{j.title} ({j.count})</option>)}
            </select>
          </Field>
        </div>

        {/* Funnel */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 8, marginBottom: 16 }}>
          {funnelSteps.map(([label, n], i) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: i === 7 ? "#15803D" : "var(--navy)" }}>{n || 0}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748B" }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {TABS.map(([k, label]) => {
            const count =
              k === "applicants"
                ? (byStage.applied || []).length
                : k === "exams"
                ? (byStage.exam || []).length
                : k === "technical"
                ? (byStage.technical || []).length
                : k === "hr"
                ? (byStage.hr || []).length
                : k === "bgv"
                ? (byStage.approval || []).filter((a) => !bgvOk(a)).length
                : k === "approval"
                ? (byStage.approval || []).filter(bgvOk).length
                : 0;

            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  border: tab === k ? "1px solid var(--gold)" : "1px solid #CBD5E1",
                  background: tab === k ? "var(--gold)" : "#fff",
                  color: "var(--navy)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span
                    style={{
                      background: tab === k ? "var(--navy)" : "#EDE9FE",
                      color: tab === k ? "#fff" : "#6D28D9",
                      padding: "1px 7px",
                      borderRadius: 999,
                      fontSize: 10.5,
                      fontWeight: 800,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading your hiring pipeline…</div> : (
          <>
            {tab === "applicants" && <ApplicantsTab {...common} />}
            {tab === "exams" && (
              <>
                <ExamsTab {...common} />
                <ResultsTab {...common} />
              </>
            )}
            {tab === "technical" && <TechnicalTab {...common} />}
            {tab === "hr" && <HrTab {...common} />}
            {tab === "bgv" && <BgvTab {...common} />}
            {tab === "approval" && <ApprovalTab {...common} />}
            {tab === "offers" && <OffersTab {...common} />}
            {tab === "setup" && <SetupTab {...common} />}
          </>
        )}
      </main>
    </div>
  );
}

const nameCell = (a) => (
  <td style={td}>
    <div style={{ fontWeight: 800, color: "#0F172A" }}>{a.candidate.name}</div>
    <div style={{ fontSize: 11, color: "#64748B" }}>{a.jobTitle}</div>
    {(a.candidate.academyName || a.candidate.collegeName) && (
      <div style={{ fontSize: 10.5, color: "#4338CA", fontWeight: 700, marginTop: 2 }}>
        {a.candidate.academyName ? `Academy: ${a.candidate.academyName}${a.candidate.batch ? ` · ${a.candidate.batch}` : ""}` : `College: ${a.candidate.collegeName}`}
      </div>
    )}
  </td>
);

// ---------------------------------------------------------------- 1. Applicants
function ApplicantsTab({ data, apps, byStage, sel, toggle, toggleAll, selIds, act, busy, jobId, setTab }) {
  const list = byStage.applied || [];
  const [examId, setExamId] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const exams = data.exams || [];
  const chosen = examId || exams[0]?._id || "";
  const toast = useToast();
  // The deadline is always chosen by the recruiter - never defaulted
  const deadlineIso = deadlineDate && deadlineTime ? new Date(`${deadlineDate}T${deadlineTime}`).toISOString() : "";
  const allocate = (body) => {
    if (!deadlineIso) { toast("Choose the exam deadline (date and time) first.", "!"); return; }
    if (new Date(deadlineIso) <= new Date()) { toast("The deadline must be in the future.", "!"); return; }
    return act(() => companyApi.post(`/company/hiring/exams/${chosen}/allocate`, { jobId, deadline: deadlineIso, ...body }), (r) => `Exam allocated to ${r.allocated} candidate${r.allocated === 1 ? "" : "s"}.`);
  };
  return (
    <>
      <Card title={`Allocate an exam · ${list.length} applicant${list.length === 1 ? "" : "s"} waiting`}>
        {exams.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748B" }}>You have no exam yet. <button type="button" onClick={() => setTab("exams")} style={{ background: "none", border: "none", color: "#1D4ED8", fontWeight: 800, cursor: "pointer" }}>Pick or upload one →</button></div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <Field label="EXAM"><select value={chosen} onChange={(e) => setExamId(e.target.value)} style={{ ...inputStyle, minWidth: 240 }}>{exams.map((e) => <option key={e._id} value={e._id}>{e.title} · {e.source}</option>)}</select></Field>
            <Field label="ONLY SPECIALTY (OPTIONAL)"><input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. AR, HCC, billing" style={{ ...inputStyle, width: 190 }} /></Field>
            <Field label="DEADLINE · DATE *"><input type="date" value={deadlineDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDeadlineDate(e.target.value)} style={{ ...inputStyle, width: 150 }} /></Field>
            <Field label="DEADLINE · TIME *"><input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} style={{ ...inputStyle, width: 120 }} /></Field>
            <Btn kind="gold" disabled={busy || list.length === 0} onClick={() => allocate({ all: true, specialty: specialty || undefined })}>Allocate to all {list.length}</Btn>
            <Btn kind="navy" disabled={busy || selIds.length === 0} onClick={() => allocate({ applicationIds: selIds })}>Allocate to selected ({selIds.length})</Btn>
          </div>
        )}
        <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 8 }}>Each candidate gets an in-app notice and email with the deadline you set above. Allocate by specialty to send the AR exam only to AR candidates, the coding exam only to coders, and so on.</div>
      </Card>
      <Card>
        <Table head={[<input key="c" type="checkbox" checked={list.length > 0 && list.every((a) => sel[a.id])} onChange={() => toggleAll(list)} />, "CANDIDATE", "SPECIALTY", "CITY", "EXPERIENCE", "VERIFIED SCORE", "APPLIED"]} empty="No new applicants. Candidates who apply to your published roles appear here with their verified profile.">
          {list.map((a) => (
            <tr key={a.id}>
              <td style={td}><input type="checkbox" checked={!!sel[a.id]} onChange={() => toggle(a.id)} /></td>
              {nameCell(a)}
              <td style={td}>{a.candidate.specialty || "—"}</td>
              <td style={td}>{a.candidate.city || "—"}</td>
              <td style={td}>{a.candidate.experience || "—"}</td>
              <td style={td}><Pill bg="#DCFCE7" color="#166534">{a.candidate.talentScore}/100</Pill></td>
              <td style={td}>{fmtDay(a.appliedAt)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- 2. Exams (4 options)
function ExamsTab({ data, act, busy }) {
  const [lib, setLib] = useState(data.library?.[0]?.key || "");
  const [libCount, setLibCount] = useState(20);
  const [dur, setDur] = useState(30);
  const [cut, setCut] = useState(data.setup?.examCutoffPct || 65);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const base = (companyApi.defaults.baseURL || "/api").replace(/\/$/, "");
  const key = data.setup?.integrationKey || "";
  const hostBase = base.startsWith("http") ? base : `${window.location.origin}${base}`;
  const optionCard = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 };

  const upload = () => {
    const fd = new FormData();
    fd.append("doc", file);
    fd.append("title", title);
    fd.append("durationMin", dur);
    fd.append("cutoffPct", cut);
    act(() => companyApi.post("/company/hiring/exams/upload", fd), (r) => `Private bank saved - ${r.exam.questionCount} questions${r.skipped ? ` (${r.skipped} rows skipped)` : ""}.`).then((r) => { if (r) { setFile(null); setTitle(""); } });
  };

  return (
    <>
      <Card title="Four ways to run Round 1 - your choice, your rules" right={<Pill bg="#EFF6FF" color="#1D4ED8">Scores land on the same scoreboard</Pill>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div style={{ ...optionCard, borderColor: "var(--gold)" }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>🏛 Option 1 · Talentera Library <Pill bg="#FEF3C7" color="#92400E">Recommended</Pill></div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>Pre-built MCQ assessments. Auto-scored, webcam proctored, 1-click allocate.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <Field label="ASSESSMENT"><select value={lib} onChange={(e) => setLib(e.target.value)} style={inputStyle}>{(data.library || []).map((l) => <option key={l.key} value={l.key}>{l.key} ({l.questionCount} Qs)</option>)}</select></Field>
              <Field label="QUESTIONS"><input type="number" min="5" max="100" value={libCount} onChange={(e) => setLibCount(e.target.value)} style={{ ...inputStyle, width: 70 }} /></Field>
              <Field label="MINUTES"><input type="number" min="5" value={dur} onChange={(e) => setDur(e.target.value)} style={{ ...inputStyle, width: 70 }} /></Field>
              <Field label="CUTOFF %"><input type="number" min="1" max="100" value={cut} onChange={(e) => setCut(e.target.value)} style={{ ...inputStyle, width: 70 }} /></Field>
              <Btn kind="gold" disabled={busy || !lib} onClick={() => act(() => companyApi.post("/company/hiring/exams/library", { domain: lib, count: Number(libCount), durationMin: Number(dur), cutoffPct: Number(cut) }), "Library exam added.")}>Add to my exams</Btn>
            </div>
          </div>

          <div style={optionCard}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>📊 Option 2 · Your private bank</div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>Upload Excel / CSV: <code>Question, Option A, Option B, Option C, Option D, Correct (A-D), Topic</code>. Visible only inside your company login.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <Field label="EXAM NAME"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="HCC screening v1" style={{ ...inputStyle, width: 170 }} /></Field>
              <Field label="FILE"><input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 12 }} /></Field>
              <Btn kind="navy" disabled={busy || !file} onClick={upload}>Upload bank</Btn>
            </div>
          </div>

          <div style={optionCard}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>🔌 Option 3 · Plug in your own tool</div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>Already use Mettl, iMocha, HackerRank or HireVue? Candidates take the exam there; your tool posts the score to Talentera.</div>
            <Btn kind="navy" small disabled={busy} onClick={() => act(() => companyApi.post("/company/hiring/exams/external", { source: "integration", title: "External assessment" }), "Integration exam created.")}>Create integration exam</Btn>
            <pre style={{ background: "#0F172A", color: "#E2E8F0", fontSize: 10.5, padding: 10, borderRadius: 8, overflowX: "auto", marginTop: 10, whiteSpace: "pre-wrap" }}>{`POST ${hostBase}/hiring-public/integration-score
x-api-key: ${key || "(save your setup to generate a key)"}
{ "candidateEmail": "a@b.com", "score": 78, "tool": "Mettl" }`}</pre>
          </div>

          <div style={optionCard}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>📝 Option 4 · Manual bypass</div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>Prefer a paper exam on-site? Run it your way, then type each score into Exam results. Works, but Option 2 gives the same control without the paperwork.</div>
            <Btn kind="ghost" small disabled={busy} onClick={() => act(() => companyApi.post("/company/hiring/exams/external", { source: "manual", title: "On-site written exam" }), "Manual exam created.")}>Create manual exam</Btn>
          </div>
        </div>
      </Card>

      <Card title={`My exams (${(data.exams || []).length})`}>
        <Table head={["EXAM", "SOURCE", "QUESTIONS", "DURATION", "CUTOFF", "ADDED", ""]} empty="No exams yet - add one above.">
          {(data.exams || []).map((e) => (
            <tr key={e._id}>
              <td style={{ ...td, fontWeight: 800 }}>{e.title}</td>
              <td style={td}><Pill>{e.source}</Pill></td>
              <td style={td}>{e.questionCount || "—"}</td>
              <td style={td}>{e.durationMin ? `${e.durationMin} min` : "—"}</td>
              <td style={td}>{e.cutoffPct}%</td>
              <td style={td}>{fmtDay(e.createdAt)}</td>
              <td style={td}><Btn kind="red" small disabled={busy} onClick={() => window.confirm("Delete this exam?") && act(() => companyApi.delete(`/company/hiring/exams/${e._id}`), "Exam deleted.")}>Delete</Btn></td>
            </tr>
          ))}
        </Table>
        <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 8 }}>🔐 Your private questions are visible only to your company admins; Talentera does not show question text to staff or other companies.</div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- 3. Exam results + auto gate
const EXAM_STATUS_STYLE = {
  "Not allocated": ["#F1F5F9", "#475569"],
  Allocated: ["#DBEAFE", "#1D4ED8"],
  "In progress": ["#FEF3C7", "#92400E"],
  Submitted: ["#EDE9FE", "#6D28D9"],
  "Under review": ["#FFEDD5", "#C2410C"],
  Evaluated: ["#DCFCE7", "#166534"],
  Passed: ["#DCFCE7", "#166534"],
  "Below cutoff": ["#FEE2E2", "#B91C1C"],
  Rejected: ["#FEE2E2", "#B91C1C"],
};
function examStatus(a) {
  const e = a.exam;
  const isRejected = a.stage === "rejected" || a.status === "rejected" || a.rejection?.round === "exam";

  if (!e || !e.allocatedAt) {
    return isRejected ? "Rejected" : "Not allocated";
  }

  if (e.passed === false || (e.score !== undefined && e.score !== null && e.cutoffPct && e.score < Number(e.cutoffPct))) {
    return "Below cutoff";
  }

  if (isRejected) {
    return (e.completedAt || e.score !== undefined) ? "Below cutoff" : "Rejected";
  }

  if (e.completedAt) {
    if (e.passed === true) {
      return e.evaluatedAt ? "Evaluated" : e.reviewOpenedAt ? "Under review" : "Passed";
    }
    return e.evaluatedAt ? "Evaluated" : e.reviewOpenedAt ? "Under review" : "Submitted";
  }

  return e.startedAt ? "In progress" : "Allocated";
}

function ResultsTab({ data, apps, act, busy, jobId, reload }) {
  const toast = useToast();
  const list = apps.filter((a) => a.stage === "applied" || (a.exam && a.exam.allocatedAt) || (a.rejection && a.rejection.round === "exam"));
  const live = data.examLive || {};
  const exams = data.exams || [];
  const [scoreFor, setScoreFor] = useState(null);
  const [score, setScore] = useState("");
  const [viewId, setViewId] = useState(null);
  const [reallocateFor, setReallocateFor] = useState(null);
  const [reallocateExamId, setReallocateExamId] = useState("");
  const [reallocateDate, setReallocateDate] = useState("");
  const [reallocateTime, setReallocateTime] = useState("");
  const viewFor = viewId ? apps.find((x) => x.id === viewId) : null;

  const openReallocate = (a) => {
    setReallocateFor(a);
    setReallocateExamId(a.exam?.examId || exams[0]?._id || "");
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    setReallocateDate(tomorrow.toISOString().slice(0, 10));
    setReallocateTime("20:00");
  };

  const handleConfirmReallocate = async () => {
    if (!reallocateDate || !reallocateTime) {
      toast("Choose the exam deadline (date and time) first.", "!");
      return;
    }
    const deadlineIso = new Date(`${reallocateDate}T${reallocateTime}`).toISOString();
    if (new Date(deadlineIso) <= new Date()) {
      toast("The deadline must be in the future.", "!");
      return;
    }
    const chosenExam = reallocateExamId || exams[0]?._id;
    if (!chosenExam) {
      toast("No exam available to allocate. Pick or create an exam first.", "!");
      return;
    }
    const isRe = Boolean(reallocateFor?.exam?.allocatedAt);
    const r = await act(
      () =>
        companyApi.post(`/company/hiring/exams/${chosenExam}/allocate`, {
          jobId,
          deadline: deadlineIso,
          applicationIds: [reallocateFor.id],
          reallocate: true,
        }),
      (res) => `Exam ${isRe ? "re-allocated" : "allocated"} to ${reallocateFor?.candidate?.name || "candidate"}.`
    );
    if (r) {
      setReallocateFor(null);
      if (reload) reload();
    }
  };

  // Scores stay hidden until the recruiter explicitly opens "View results" - opening is recorded (Submitted -> Under review)
  const openResults = async (a) => {
    setViewId(a.id);
    if (a.exam && !a.exam.reviewOpenedAt) { try { await companyApi.post(`/company/hiring/applications/${a.id}/exam-review`, { action: "open" }); if (reload) reload(); } catch { /* the modal still shows */ } }
  };
  return (
    <>
      <Card title="Assessment status" right={<Btn kind="ghost" small disabled={busy} onClick={() => act(() => companyApi.post("/company/hiring/exam-gate", { jobId }), (r) => `Cutoff gate re-run on ${r.processed} result(s).`)}>Re-run cutoff gate</Btn>}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Not allocated", "Allocated", "In progress", "Submitted", "Under review", "Evaluated", "Below cutoff", "Rejected"].map((k) => (
            <Pill key={k} bg={EXAM_STATUS_STYLE[k][0]} color={EXAM_STATUS_STYLE[k][1]}>{list.filter((a) => examStatus(a) === k).length} {k.toLowerCase()}</Pill>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 8 }}>Scores stay hidden here - open <strong>View results</strong> on a submitted assessment to see the score, topic breakdown, proctoring flags and recording. Auto-decision: at or above the cutoff → Round 2 · below → polite auto-reject, kept in your future pool.{" "}{(live.completed || 0)} submitted so far.</div>
      </Card>
      <Card>
        <Table head={["CANDIDATE", "ASSESSMENT", "STATUS", "RESULTS", "NEXT"]} empty="No candidates yet.">
          {list.map((a) => {
            const e = a.exam; const st = examStatus(a); const [bg, col] = EXAM_STATUS_STYLE[st];
            return (
              <tr key={a.id}>
                {nameCell(a)}
                <td style={td}>{e?.title || <span style={{ color: "#94A3B8" }}>—</span>}{e?.allocatedAt && <div style={{ fontSize: 10.5, color: "#94A3B8" }}>{e.source} · due {fmtDate(e.expiresAt)}</div>}</td>
                <td style={td}><Pill bg={bg} color={col}>{st}</Pill></td>
                <td style={td}>
                  {(e?.completedAt || e?.score !== undefined || a.stage === "rejected" || a.status === "rejected") ? (
                    <Btn small kind="navy" onClick={() => openResults(a)}>View results</Btn>
                  ) : (
                    <span style={{ color: "#94A3B8" }}>—</span>
                  )}
                  {e?.completedAt && (e.proctorFlags || []).length > 0 && <div style={{ marginTop: 4 }}><Pill bg="#FEE2E2" color="#B91C1C">{e.proctorFlags.length} proctor flag{e.proctorFlags.length === 1 ? "" : "s"}</Pill></div>}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {e?.allocatedAt ? (
                      <Btn small kind="gold" onClick={() => openReallocate(a)}>Re-allocate</Btn>
                    ) : (
                      <Btn small kind="navy" onClick={() => openReallocate(a)}>Allocate</Btn>
                    )}
                    {e && !e.completedAt && (e.source === "manual" || e.source === "integration") && <Btn small kind="navy" onClick={() => { setScoreFor(a); setScore(""); }}>Enter score</Btn>}
                    {e?.completedAt && <StageBadge stage={a.stage} />}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
      {viewFor && (viewFor.exam || viewFor.rejection) && (
        <Modal title={`Assessment results · ${viewFor.candidate?.name || "Candidate"}`} onClose={() => setViewId(null)} width={560}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: "var(--navy)" }}>{viewFor.exam?.score !== undefined ? `${viewFor.exam.score}%` : "—"}</div>
            <Pill bg={viewFor.exam?.passed ? "#DCFCE7" : "#FEE2E2"} color={viewFor.exam?.passed ? "#166534" : "#B91C1C"}>
              {viewFor.exam?.passed ? "Passed" : (viewFor.stage === "rejected" || viewFor.status === "rejected" || viewFor.exam?.passed === false) ? "Below cutoff" : "Pending"}
            </Pill>
            <span style={{ fontSize: 12, color: "#64748B" }}>{viewFor.exam?.cutoffPct ? `cutoff ${viewFor.exam.cutoffPct}% · ` : ""}{viewFor.exam?.title || "Assessment"}</span>
          </div>
          {viewFor.rejection?.reason && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12.5, color: "#991B1B" }}>
              <b>Status note:</b> {viewFor.rejection.reason}
            </div>
          )}
          {(viewFor.exam?.topicBreakdown || []).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", marginBottom: 4 }}>TOPIC BREAKDOWN</div>
              {viewFor.exam.topicBreakdown.map((t) => <div key={t.topic} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0", borderBottom: "1px solid #F1F5F9" }}><span>{t.topic}</span><strong>{t.correct}/{t.total}</strong></div>)}
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", marginBottom: 4 }}>PROCTORING</div>
            {(viewFor.exam?.proctorFlags || []).length ? <Pill bg="#FEE2E2" color="#B91C1C">{viewFor.exam.proctorFlags.length} flag{viewFor.exam.proctorFlags.length === 1 ? "" : "s"}: {[...new Set(viewFor.exam.proctorFlags.map((f) => f.type || f))].join(", ")}</Pill> : <span style={{ color: "#166534", fontSize: 12.5 }}>Clean - no flags</span>}
            <div style={{ fontSize: 12, marginTop: 6 }}>
              {(viewFor.exam?.recordings || []).length > 0
                ? viewFor.exam.recordings.map((r) => <a key={r.part} href={r.url} target="_blank" rel="noreferrer" style={{ color: "#1D4ED8", fontWeight: 800, marginRight: 10 }}>▶ Recording{viewFor.exam.recordings.length > 1 ? ` ${r.part}` : ""}</a>)
                : viewFor.exam?.recordingUrl ? <a href={viewFor.exam.recordingUrl} target="_blank" rel="noreferrer" style={{ color: "#1D4ED8", fontWeight: 800 }}>▶ Recording</a> : <span style={{ color: "#94A3B8" }}>No recording available</span>}
            </div>
          </div>
          {viewFor.exam?.evaluatedAt
            ? <Pill bg="#DCFCE7" color="#166534">Evaluated {fmtDate(viewFor.exam.evaluatedAt)}</Pill>
            : <Btn kind="gold" disabled={busy} onClick={async () => { await act(() => companyApi.post(`/company/hiring/applications/${viewFor.id}/exam-review`, { action: "confirm" }), "Marked as evaluated."); }}>Confirm evaluation</Btn>}
        </Modal>
      )}
      {scoreFor && (
        <Modal title={`Enter exam score · ${scoreFor.candidate.name}`} onClose={() => setScoreFor(null)} width={380}>
          <Field label="SCORE (0-100)"><input type="number" min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)} style={{ ...inputStyle, width: "100%" }} autoFocus /></Field>
          <div style={{ fontSize: 11.5, color: "#64748B", margin: "8px 0 12px" }}>The cutoff gate runs immediately: pass → technical round, below → polite auto-reject.</div>
          <Btn kind="gold" disabled={busy || score === ""} onClick={async () => { const r = await act(() => companyApi.post(`/company/hiring/applications/${scoreFor.id}/exam-score`, { score: Number(score) }), "Score recorded."); if (r) setScoreFor(null); }}>Save score</Btn>
        </Modal>
      )}
      {reallocateFor && (
        <Modal
          title={`${reallocateFor.exam?.allocatedAt ? "Exam Re-Allocation" : "Allocate Exam"} · ${reallocateFor.candidate?.name}`}
          onClose={() => setReallocateFor(null)}
          width={480}
        >
          {exams.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748B", padding: "10px 0" }}>
              No exams found for this job. Create or pick an exam from the Exams tab first.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 12.5, color: "#475569" }}>
                {reallocateFor.exam?.allocatedAt
                  ? `Re-allocating will reset ${reallocateFor.candidate?.name}'s exam status and send a fresh test notification with the new deadline.`
                  : `Allocate an assessment to ${reallocateFor.candidate?.name}.`}
              </div>
              <Field label="EXAM">
                <select
                  value={reallocateExamId || exams[0]?._id}
                  onChange={(e) => setReallocateExamId(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                >
                  {exams.map((ex) => (
                    <option key={ex._id} value={ex._id}>
                      {ex.title} · {ex.source} ({ex.durationMin} min, {ex.cutoffPct}% cutoff)
                    </option>
                  ))}
                </select>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="DEADLINE · DATE *">
                  <input
                    type="date"
                    value={reallocateDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setReallocateDate(e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                </Field>
                <Field label="DEADLINE · TIME *">
                  <input
                    type="time"
                    value={reallocateTime}
                    onChange={(e) => setReallocateTime(e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                </Field>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                <Btn kind="ghost" onClick={() => setReallocateFor(null)}>Cancel</Btn>
                <Btn kind="gold" disabled={busy} onClick={handleConfirmReallocate}>
                  {reallocateFor.exam?.allocatedAt ? "Confirm Re-Allocation" : "Allocate Exam"}
                </Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- 4. Technical round
function TechnicalTab({ data, byStage, sel, toggle, toggleAll, selIds, act, busy, jobId }) {
  const list = byStage.technical || [];
  const [mode, setMode] = useState(data.setup?.interviewMode === "offline" ? "offline" : "virtual");
  const [when, setWhen] = useState(toLocalInput(data.setup?.interviewScheduledAt));
  const [scoring, setScoring] = useState(null);
  const [outcomeFor, setOutcomeFor] = useState(null);
  const panels = data.setup?.panels || [];
  const unassigned = list.filter((a) => !a.technical?.panelId);
  const allocate = (ids) => act(() => companyApi.post("/company/hiring/technical/allocate", { mode, scheduledAt: toIso(when) || undefined, jobId, ...(ids ? { applicationIds: ids } : {}) }), (r) => `${r.allocated} candidate${r.allocated === 1 ? "" : "s"} routed to specialty panels.`);

  // panel load summary
  const load = {};
  list.forEach((a) => { if (a.technical?.panelName) load[a.technical.panelName] = (load[a.technical.panelName] || 0) + 1; });

  return (
    <>
      {unassigned.length > 0 && (
        <div
          style={{
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>🎯</span>
            <div>
              <strong style={{ color: "#065F46", fontSize: 14 }}>
                {unassigned.length} candidate{unassigned.length === 1 ? "" : "s"} cleared Round 1 assessment!
              </strong>
              <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>
                Their exam results are verified and ready for Round 2 (Technical Interview). Allocate to panels below to start scoring.
              </div>
            </div>
          </div>
          <Btn small kind="gold" disabled={busy || panels.length === 0} onClick={() => allocate()}>
            Auto-allocate {unassigned.length} to panels →
          </Btn>
        </div>
      )}
      <Card title={`Technical round · ${list.length} candidate${list.length === 1 ? "" : "s"}`}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="PATH">
            <div style={{ display: "flex", gap: 6 }}>
              {[["virtual", "🎥 Virtual"], ["offline", "🏢 Offline / walk-in"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setMode(k)} style={{ ...inputStyle, cursor: "pointer", fontWeight: 800, background: mode === k ? "var(--navy)" : "#fff", color: mode === k ? "#fff" : "#334155" }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="DATE & TIME (OPTIONAL)"><input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={inputStyle} /></Field>
          <Btn kind="gold" disabled={busy || unassigned.length === 0 || panels.length === 0} onClick={() => allocate()}>Auto-allocate {unassigned.length} to panels</Btn>
          <Btn kind="navy" disabled={busy || selIds.length === 0} onClick={() => allocate(selIds)}>Allocate selected ({selIds.length})</Btn>
        </div>
        {panels.length === 0 && <div style={{ fontSize: 12, color: "#B45309", marginTop: 8 }}>Add your interview panels under Setup first.</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {panels.map((p) => <Pill key={p._id} bg="#EDE9FE" color="#6D28D9">{p.name}: {load[p.name] || 0} candidate{(load[p.name] || 0) === 1 ? "" : "s"} · {(p.members || []).map((m) => m.name).join(", ") || "no members"}</Pill>)}
        </div>
        <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 8 }}>Candidates are routed to the specialty panel that matches their training background; multi-skill or unmatched go to the floater panel. Virtual rounds get a ready-to-join video room; offline rounds get a check-in code for reception.</div>
      </Card>
      <Card>
        <Table head={[<input key="c" type="checkbox" checked={list.length > 0 && list.every((a) => sel[a.id])} onChange={() => toggleAll(list)} />, "CANDIDATE", "PANEL", "PATH / JOIN", "PANEL SCORES", "ACTIONS"]} empty="Candidates who clear Round 1 appear here.">
          {list.map((a) => {
            const t = a.technical;
            return (
              <tr key={a.id}>
                <td style={td}><input type="checkbox" checked={!!sel[a.id]} onChange={() => toggle(a.id)} /></td>
                {nameCell(a)}
                <td style={td}>{t?.panelName ? <><strong>{t.panelName}</strong><div style={{ fontSize: 10.5, color: "#64748B" }}>{(t.members || []).join(", ")}</div></> : <Pill bg="#FEF3C7" color="#92400E">Not allocated</Pill>}</td>
                <td style={td}>
                  {t?.mode === "virtual" && <><Pill bg="#DBEAFE" color="#1D4ED8">Virtual</Pill><div style={{ fontSize: 11, marginTop: 4 }}><a href={t.meetingLink} target="_blank" rel="noreferrer" style={{ color: "#1D4ED8", fontWeight: 800 }}>Join room →</a></div><div style={{ fontSize: 11, marginTop: 4 }}>{(t.joinedAt || t.attendanceMarkedAt) ? <span style={{ color: "#166534" }}>{t.joinedAt ? `candidate joined ${fmtDate(t.joinedAt)}` : "attendance recorded"}</span> : <span style={{ color: "#B45309" }}>not joined yet</span>}</div></>}
                  {t?.mode === "offline" && <><Pill bg="#FEF3C7" color="#92400E">Offline</Pill><div style={{ fontSize: 11, marginTop: 4 }}>Code <strong>{t.checkinToken}</strong> · {t.checkedInAt ? <span style={{ color: "#166534" }}>checked in {fmtDate(t.checkedInAt)}</span> : <button type="button" onClick={() => act(() => companyApi.post(`/company/hiring/applications/${a.id}/checkin`), "Checked in.")} style={{ background: "none", border: "none", color: "#1D4ED8", fontWeight: 800, cursor: "pointer", padding: 0 }}>mark arrived</button>}</div></>}
                  {t?.scheduledAt && <div style={{ fontSize: 10.5, color: "#64748B" }}>{fmtDate(t.scheduledAt)}</div>}
                </td>
                <td style={td}>{(t?.scores || []).length ? <><strong>{t.avgScore}%</strong> avg<div style={{ fontSize: 10.5, color: "#64748B" }}>{t.scores.map((s) => `${s.member} ${s.pct}%`).join(" · ")}</div></> : "—"}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {t?.panelId && !t.interviewCompletedAt && (t.joinedAt || t.checkedInAt || t.attendanceMarkedAt) && <Btn small kind="green" disabled={busy} onClick={() => { if (window.confirm(`Mark ${a.candidate.name}'s technical interview as completed? Scoring unlocks after this.`)) act(() => companyApi.post(`/company/hiring/applications/${a.id}/interview-complete`), "Interview marked completed - you can now score."); }}>Mark interview completed</Btn>}
                    {t?.interviewCompletedAt && <Pill bg="#DCFCE7" color="#166534">Interview completed</Pill>}
                    {t?.panelId && <Btn small kind="navy" onClick={() => setScoring(a)}>Open scorecard</Btn>}
                    <Btn small kind="ghost" onClick={() => setOutcomeFor(a)}>Interview outcome</Btn>
                  </div>
                  {a.interviewOutcome && <div style={{ marginTop: 4 }}><Pill bg="#FEF3C7" color="#92400E">{OUTCOME_LABELS[a.interviewOutcome]}</Pill></div>}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
      {scoring && <ScorecardModal app={scoring} setup={data.setup} onClose={() => setScoring(null)} act={act} busy={busy} />}
      {outcomeFor && <OutcomeModal app={outcomeFor} onClose={() => setOutcomeFor(null)} act={act} busy={busy} />}
    </>
  );
}

const OUTCOME_LABELS = {
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
  candidate_no_show: "Candidate no-show",
  employer_no_show: "Employer no-show",
};

// Records that a scheduled interview did not go ahead as planned. Shows on the candidate, academy and college dashboards.
function OutcomeModal({ app, onClose, act, busy }) {
  const [outcome, setOutcome] = useState("rescheduled");
  const [note, setNote] = useState("");
  const [newTime, setNewTime] = useState("");
  const save = async (clear) => {
    const r = await act(
      () => companyApi.put(`/company/applications/${app.id}/interview-outcome`, clear ? { outcome: "clear" } : { outcome, note, newTime: outcome === "rescheduled" ? newTime : undefined }),
      clear ? "Interview outcome cleared." : "Interview outcome saved - the candidate has been notified."
    );
    if (r) onClose();
  };
  return (
    <Modal title={`Interview outcome · ${app.candidate.name}`} onClose={onClose} width={440}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="WHAT HAPPENED?">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} style={inputStyle}>
            {Object.entries(OUTCOME_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        {outcome === "rescheduled" && <Field label="NEW DATE & TIME *"><input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={inputStyle} /></Field>}
        <Field label="NOTE (OPTIONAL)"><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} style={inputStyle} placeholder="Reason, shared with the candidate" /></Field>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {app.interviewOutcome && <Btn kind="ghost" disabled={busy} onClick={() => save(true)}>Clear outcome</Btn>}
          <Btn kind="gold" disabled={busy || (outcome === "rescheduled" && !newTime)} onClick={() => save(false)}>Save outcome</Btn>
        </div>
      </div>
    </Modal>
  );
}

const CRITERIA_PRESETS = {
  "Medical Coding": ["Technical knowledge", "Coding accuracy", "Problem solving", "Communication"],
  "AR Caller": ["Denial & claim follow-up knowledge", "Calling & negotiation skills", "Payer / insurance knowledge", "Communication & tone", "Process accuracy"],
  "Medical Biller": ["Billing process knowledge", "Claim submission & scrubbing", "Payment posting accuracy", "Denial handling", "Communication"],
  "General": ["Role knowledge", "Practical skills", "Problem solving", "Communication"],
};
const presetForRole = (role) => {
  const r = String(role || "").toLowerCase();
  if (/ar\b|a\/r|caller|accounts receivable/.test(r)) return "AR Caller";
  if (/bill|claim|payment|charge/.test(r)) return "Medical Biller";
  if (/cod/.test(r)) return "Medical Coding";
  return null;
};

function ScorecardModal({ app, setup, onClose, act, busy }) {
  const baseCrit = setup?.scorecardCriteria?.length
    ? setup.scorecardCriteria
    : CRITERIA_PRESETS["Medical Coding"];
  const isStock = baseCrit.join("|") === CRITERIA_PRESETS["Medical Coding"].join("|");
  const rolePreset = isStock ? presetForRole(app.role || app.jobTitle || app.job?.title) : null;
  // Criteria are editable per candidate: rename, remove, add, or load a role preset. "Save as default" stores them in Setup.
  const [crit, setCrit] = useState(rolePreset ? CRITERIA_PRESETS[rolePreset] : baseCrit);
  const [editingCrit, setEditingCrit] = useState(false);
  const [newCrit, setNewCrit] = useState("");

  // Intelligently find matching panel
  const panel =
    (setup?.panels || []).find((p) => String(p._id) === String(app.technical?.panelId)) ||
    (setup?.panels || []).find((p) => p.name && p.name.toLowerCase() === (app.technical?.panelName || "").toLowerCase()) ||
    (setup?.panels || []).find((p) => p.isFloater) ||
    (setup?.panels || [])[0];

  // Gather all known member names across the matched panel, candidate app, and all setup panels
  const initialMembers = useMemo(() => {
    const set = new Set();
    (panel?.members || []).forEach((m) => {
      const n = typeof m === "string" ? m : m?.name;
      if (n && n.trim()) set.add(n.trim());
    });
    (app.technical?.members || []).forEach((m) => {
      const n = typeof m === "string" ? m : m?.name;
      if (n && n.trim()) set.add(n.trim());
    });
    (setup?.panels || []).forEach((p) => {
      (p.members || []).forEach((m) => {
        const n = typeof m === "string" ? m : m?.name;
        if (n && n.trim()) set.add(n.trim());
      });
    });
    return Array.from(set);
  }, [panel, app.technical?.members, setup?.panels]);

  const [membersList, setMembersList] = useState(initialMembers);
  const [member, setMember] = useState(initialMembers[0] || "");
  const [isAddingNew, setIsAddingNew] = useState(initialMembers.length === 0);
  const [customMember, setCustomMember] = useState("");
  const [scores, setScores] = useState(Object.fromEntries(crit.map((c) => [c, 5])));
  const renameCrit = (i, label) => {
    const old = crit[i];
    setCrit((list) => list.map((x, j) => (j === i ? label : x)));
    setScores((sc) => { const { [old]: v, ...rest } = sc; return { ...rest, [label]: v ?? 5 }; });
  };
  const removeCrit = (i) => { if (crit.length <= 1) return; const old = crit[i]; setCrit((l) => l.filter((_, j) => j !== i)); setScores((sc) => { const { [old]: _drop, ...rest } = sc; return rest; }); };
  const addCrit = () => {
    const label = newCrit.trim();
    if (!label || crit.includes(label) || crit.length >= 12) return;
    setCrit((l) => [...l, label]); setScores((sc) => ({ ...sc, [label]: 5 })); setNewCrit("");
  };
  const loadPreset = (name) => {
    const list = CRITERIA_PRESETS[name];
    if (!list) return;
    setCrit(list); setScores(Object.fromEntries(list.map((c) => [c, 5])));
  };
  const cleanCrit = crit.map((x) => x.trim()).filter(Boolean);
  const saveDefaultCriteria = async () => {
    await act(() => companyApi.put("/company/hiring/setup", { scorecardCriteria: cleanCrit }), "Scorecard criteria saved as your default.");
  };
  const [notes, setNotes] = useState("");
  const [fresh, setFresh] = useState(app.technical);

  useEffect(() => {
    if (initialMembers.length > 0) {
      setMembersList((prev) => Array.from(new Set([...prev, ...initialMembers])));
      if (!member) setMember(initialMembers[0]);
    }
  }, [initialMembers]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveMember = (isAddingNew ? customMember.trim() : member) || customMember.trim() || member;

  const save = async () => {
    const scoringName = effectiveMember;
    if (!scoringName) return;
    const r = await act(
      () => companyApi.post(`/company/hiring/applications/${app.id}/technical-score`, { memberName: scoringName, scores: Object.fromEntries(cleanCrit.map((c) => [c, scores[c] ?? 5])), notes }),
      `Score saved for ${scoringName}.`
    );
    if (r) {
      setFresh(r.technical);
      setNotes("");
      if (!membersList.includes(scoringName)) {
        setMembersList((prev) => [...prev, scoringName]);
      }
      setMember(scoringName);
      setIsAddingNew(false);
      setCustomMember("");
    }
  };

  const attended = Boolean(fresh?.joinedAt || fresh?.checkedInAt || fresh?.attendanceMarkedAt);
  const interviewDone = Boolean(fresh?.interviewCompletedAt);
  const canScore = attended && interviewDone;
  const markAttended = async () => {
    if (!window.confirm(`Confirm that ${app.candidate.name} attended the interview? This is recorded in the audit trail.`)) return;
    const r = await act(() => companyApi.post(`/company/hiring/applications/${app.id}/mark-attended`), "Attendance recorded.");
    if (r?.technical) setFresh(r.technical);
  };

  const markCompleted = async () => {
    if (!window.confirm(`Confirm that the technical interview with ${app.candidate.name} has finished? Scoring unlocks after this.`)) return;
    const r = await act(() => companyApi.post(`/company/hiring/applications/${app.id}/interview-complete`), "Interview marked completed.");
    if (r?.technical) setFresh(r.technical);
  };

  const finish = async (decision) => {
    const r = await act(
      () => companyApi.post(`/company/hiring/applications/${app.id}/technical-complete`, { decision, notes: fresh?.consensusNotes }),
      decision === "reject" ? "Candidate rejected." : "Saved - moved to HR round."
    );
    if (r) onClose();
  };

  return (
    <Modal title={`Panel scorecard · ${app.candidate.name}`} onClose={onClose} width={620}>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
        {app.technical?.panelName || panel?.name || "General Floater Panel"} · {app.technical?.mode || "virtual"} · every member scores live; the average is calculated automatically.
      </div>

      {!attended && (
        <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 12 }}>
          <strong>Candidate has not attended yet.</strong> Scoring and &ldquo;Save &amp; proceed&rdquo; unlock once they join the video room{app.technical?.mode === "offline" ? " / check in at reception" : ""}. If they attended another way, record it below (it is saved in the audit trail).
          <div style={{ marginTop: 8 }}><Btn small kind="navy" disabled={busy} onClick={markAttended}>Mark as attended</Btn></div>
        </div>
      )}
      {attended && !interviewDone && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 12 }}>
          <strong>Interview in progress.</strong> Scores can be entered and submitted only after the technical interview round is marked as completed.
          <div style={{ marginTop: 8 }}><Btn small kind="green" disabled={busy} onClick={markCompleted}>Mark interview completed</Btn></div>
        </div>
      )}
      <Field label="SCORING AS (PANEL MEMBER / INTERVIEWER)" style={{ marginBottom: 12 }}>
        {!isAddingNew && membersList.length > 0 ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={member}
              onChange={(e) => {
                if (e.target.value === "__add_new__") {
                  setIsAddingNew(true);
                  setCustomMember("");
                } else {
                  setMember(e.target.value);
                }
              }}
              style={{ ...inputStyle, flex: 1 }}
            >
              {membersList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="__add_new__">+ Enter new interviewer name...</option>
            </select>
            <Btn
              small
              kind="ghost"
              type="button"
              onClick={() => {
                setIsAddingNew(true);
                setCustomMember("");
              }}
            >
              + Add member
            </Btn>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Enter interviewer name (e.g. Priya Sharma, Lead)"
                value={customMember}
                onChange={(e) => setCustomMember(e.target.value)}
                autoFocus
                style={{ ...inputStyle, flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customMember.trim()) {
                    e.preventDefault();
                    const nm = customMember.trim();
                    if (!membersList.includes(nm)) setMembersList((prev) => [...prev, nm]);
                    setMember(nm);
                    setIsAddingNew(false);
                  }
                }}
              />
              <Btn
                small
                kind="gold"
                type="button"
                disabled={!customMember.trim()}
                onClick={() => {
                  const nm = customMember.trim();
                  if (nm) {
                    if (!membersList.includes(nm)) setMembersList((prev) => [...prev, nm]);
                    setMember(nm);
                    setIsAddingNew(false);
                  }
                }}
              >
                Set name
              </Btn>
              {membersList.length > 0 && (
                <Btn small kind="ghost" type="button" onClick={() => setIsAddingNew(false)}>
                  Cancel
                </Btn>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#64748B" }}>
              {membersList.length === 0
                ? "No panel members configured yet. Type your name above to record this evaluation."
                : "Enter the interviewer name to record this score."}
            </div>
          </div>
        )}
      </Field>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: "0.05em" }}>SCORING CRITERIA</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {editingCrit && (
            <select value="" onChange={(e) => loadPreset(e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}>
              <option value="">Load role template…</option>
              {Object.keys(CRITERIA_PRESETS).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
          <Btn small kind="ghost" type="button" onClick={() => setEditingCrit((v) => !v)}>{editingCrit ? "Done" : "Edit criteria"}</Btn>
        </div>
      </div>
      {editingCrit && (
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10, marginBottom: 10 }}>
          {crit.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input value={c} maxLength={60} onChange={(e) => renameCrit(i, e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <Btn small kind="ghost" type="button" disabled={crit.length <= 1} onClick={() => removeCrit(i)}>Remove</Btn>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6 }}>
            <input value={newCrit} maxLength={60} onChange={(e) => setNewCrit(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCrit(); } }} placeholder="Add a criterion (e.g. Payer knowledge)" style={{ ...inputStyle, flex: 1 }} />
            <Btn small kind="gold" type="button" disabled={!newCrit.trim()} onClick={addCrit}>+ Add</Btn>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Btn small kind="navy" type="button" disabled={busy || cleanCrit.length === 0} onClick={saveDefaultCriteria}>Save as my default</Btn>
            <span style={{ fontSize: 11, color: "#64748B" }}>Changes apply to this scorecard now; &ldquo;Save as my default&rdquo; also uses them for future candidates.</span>
          </div>
        </div>
      )}
      {crit.map((c, ci) => (
        <div key={ci} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1, fontSize: 12.5, fontWeight: 700 }}>{c || "(unnamed)"}</div>
          <input
            type="range"
            min="0"
            max="10"
            value={scores[c] ?? 5}
            onChange={(e) => setScores((s) => ({ ...s, [c]: Number(e.target.value) }))}
            style={{ width: 170 }}
          />
          <strong style={{ width: 26, textAlign: "right" }}>{scores[c] ?? 5}</strong>
        </div>
      ))}
      <Field label="NOTES">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ ...inputStyle, width: "100%" }}
          placeholder="Evaluation notes, feedback, and discussion..."
        />
      </Field>
      <div style={{ margin: "10px 0" }}>
        <Btn kind="navy" disabled={busy || !effectiveMember || !canScore} onClick={save}>
          Save my score {effectiveMember ? `as ${effectiveMember}` : ""}
        </Btn>
      </div>
      {(fresh?.scores || []).length > 0 && (
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12 }}>
          {fresh.scores.map((s) => (
            <div key={s.member} style={{ marginBottom: 4 }}>
              <strong>{s.member}</strong> · {s.pct}%{s.notes ? ` — ${s.notes}` : ""}
            </div>
          ))}
          <div style={{ marginTop: 6, fontWeight: 800, color: "#0F172A" }}>
            Panel average: {fresh.avgScore}% (pass mark {setup?.technicalCutoffPct || 60}%)
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn kind="gold" disabled={busy || !canScore || !(fresh?.scores || []).length} onClick={() => finish()}>
          Save &amp; proceed to HR
        </Btn>
        <Btn kind="red" disabled={busy || !canScore || !(fresh?.scores || []).length} onClick={() => finish("reject")}>
          Reject
        </Btn>
      </div>
      <div style={{ fontSize: 11, color: "#64748B", marginTop: 8 }}>
        "Save &amp; proceed" uses the panel average against your cutoff. The candidate is notified automatically either way.
      </div>
    </Modal>
  );
}

// Take a held candidate back into the pipeline (or close the hold)
function HoldActions({ app, act, busy }) {
  const move = (to, label) => {
    const note = to === "rejected" ? (window.prompt("Reason for rejecting (shared with the candidate, optional):", "") ?? null) : "";
    if (note === null) return;
    if (to !== "rejected" && !window.confirm(`${label} for ${app.candidate.name}?`)) return;
    act(() => companyApi.post(`/company/hiring/applications/${app.id}/reconsider`, { to, note }), `${app.candidate.name}: ${label.toLowerCase()}.`);
  };
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <Btn small kind="navy" disabled={busy} onClick={() => move("hr", "Resume HR round")}>Resume HR round</Btn>
      <Btn small kind="green" disabled={busy} onClick={() => move("approval", "Send to approval")}>Send to approval</Btn>
      <Btn small kind="red" disabled={busy} onClick={() => move("rejected", "Reject")}>Reject</Btn>
    </div>
  );
}

// ---------------------------------------------------------------- 5. HR round
function HrTab({ data, byStage, act, busy, jobId }) {
  const list = byStage.hr || [];
  const [form, setForm] = useState(null);
  const unassigned = list.filter((a) => !a.hr?.hrId);
  const load = {};
  list.forEach((a) => { if (a.hr?.hrName) load[a.hr.hrName] = (load[a.hr.hrName] || 0) + 1; });
  return (
    <>
      <Card title={`HR round · ${list.length} candidate${list.length === 1 ? "" : "s"}`} right={<Btn kind="gold" small disabled={busy || unassigned.length === 0} onClick={() => act(() => companyApi.post("/company/hiring/hr/allocate", { jobId }), (r) => `${r.assigned} candidate(s) assigned to HRs.`)}>Auto-assign {unassigned.length} by city / specialty</Btn>}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(data.setup?.hrs || []).map((h) => <Pill key={h._id} bg="#FEF3C7" color="#92400E">{h.name}{h.city ? ` · ${h.city}` : ""}: {load[h.name] || 0}</Pill>)}
          {(data.setup?.hrs || []).length === 0 && <span style={{ fontSize: 12, color: "#B45309" }}>Add your HRs under Setup.</span>}
        </div>
      </Card>
      <Card>
        <Table head={["CANDIDATE", "HR OWNER", "ROUND 1", "ROUND 2", "HR INTERVIEW", "CTC", "STATUS", ""]} empty="Candidates who clear the technical round appear here.">
          {list.map((a) => (
            <tr key={a.id}>
              {nameCell(a)}
              <td style={td}>{a.hr?.hrName || <Pill bg="#FEF3C7" color="#92400E">Unassigned</Pill>}</td>
              <td style={td}>{a.exam?.score != null ? `${a.exam.score}%` : "—"}</td>
              <td style={td}>{a.technical?.avgScore != null ? `${a.technical.avgScore}%` : "—"}</td>
              <td style={td}>
                {a.hr?.interview?.scheduledAt ? (
                  <div style={{ fontSize: 11.5 }}><Pill bg="#F5F3FF" color="#5B21B6">{a.hr.interview.modeLabel || a.hr.interview.mode}</Pill><div style={{ color: "#475569", marginTop: 3 }}>{fmtDate(a.hr.interview.scheduledAt)}</div></div>
                ) : <span style={{ color: "#94A3B8", fontSize: 12 }}>Not scheduled</span>}
              </td>
              <td style={td}>{a.hr?.offeredCtc ? `${a.hr.offeredCtc} LPA` : "—"}</td>
              <td style={td}>{a.hr?.status === "completed" ? <Pill bg="#DCFCE7" color="#166534">{a.hr.decision}</Pill> : <Pill>pending</Pill>}</td>
              <td style={td}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Btn small kind="gold" onClick={() => setForm(a)}>{a.hr?.interview?.scheduledAt ? "Reschedule" : "Schedule interview"}</Btn><Btn small kind="navy" onClick={() => setForm(a)}>HR form</Btn></div></td>
            </tr>
          ))}
        </Table>
      </Card>
      {(byStage.hold || []).length > 0 && (
        <Card title={`On hold · ${(byStage.hold || []).length}`}>
          <Table head={["CANDIDATE", "ROUND 1", "ROUND 2", "ACTION"]} empty="">
            {(byStage.hold || []).map((a) => (
              <tr key={a.id}>
                {nameCell(a)}
                <td style={td}>{a.exam?.score != null ? `${a.exam.score}%` : "—"}</td>
                <td style={td}>{a.technical?.avgScore != null ? `${a.technical.avgScore}%` : "—"}</td>
                <td style={td}><HoldActions app={a} act={act} busy={busy} /></td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      {form && <HrFormModal app={form} onClose={() => setForm(null)} act={act} busy={busy} />}
    </>
  );
}

function HrFormModal({ app, onClose, act, busy }) {
  const h = app.hr || {};
  const [f, setF] = useState({ culture: h.cultureFit ?? 7, noticePeriod: h.noticePeriod || "", currentCtc: h.currentCtc ?? "", expectedCtc: h.expectedCtc ?? "", offeredCtc: h.offeredCtc ?? "", shift: h.shift || "", notes: h.notes || "", bgvMethod: h.bgv?.method || "" });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const flags = [];
  if (f.currentCtc && f.expectedCtc && Number(f.expectedCtc) > Number(f.currentCtc) * 1.5) flags.push("Expected CTC is more than 50% above current CTC");
  if (f.offeredCtc && f.expectedCtc && Number(f.offeredCtc) < Number(f.expectedCtc) * 0.85) flags.push("Offer is more than 15% below expectation");
  const iv0 = h.interview || {};
  const [iv, setIv] = useState({ mode: iv0.mode || "virtual", type: iv0.type || "standard", when: toLocalInput(iv0.scheduledAt), link: iv0.meetingLink || "", phone: iv0.phone || "" });
  const [scheduled, setScheduled] = useState(h.interview || null);
  const setI = (k) => (e) => setIv((x) => ({ ...x, [k]: e.target.value }));
  const schedule = async () => {
    const r = await act(() => companyApi.post(`/company/hiring/applications/${app.id}/hr-schedule`, { mode: iv.mode, type: iv.type, scheduledAt: toIso(iv.when), meetingLink: iv.link, phone: iv.phone }), "HR interview scheduled - candidate notified.");
    if (r?.hr?.interview) setScheduled(r.hr.interview);
  };
  const submit = async (decision) => { const r = await act(() => companyApi.post(`/company/hiring/applications/${app.id}/hr-submit`, { ...f, decision }), `HR decision saved: ${decision}.`); if (r) onClose(); };
  return (
    <Modal title={`HR round · ${app.candidate.name}`} onClose={onClose} width={560}>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>Round 1: {app.exam?.score ?? "—"}% · Round 2: {app.technical?.avgScore ?? "—"}%{app.technical?.scores?.length ? ` (${app.technical.scores.map((s) => s.member).join(", ")})` : ""}</div>
      <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#5B21B6", marginBottom: 8 }}>HR ROUND INTERVIEW</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="INTERVIEW MODE">
            <select value={iv.mode} onChange={setI("mode")} style={{ ...inputStyle, width: "100%" }}>
              <option value="telephonic">Telephonic</option>
              <option value="virtual">Virtual (camera on)</option>
              <option value="offline">In person / walk-in</option>
            </select>
          </Field>
          <Field label="HR INTERVIEW TYPE">
            <select value={iv.type} onChange={setI("type")} style={{ ...inputStyle, width: "100%" }}>
              <option value="standard">Standard HR round</option>
              <option value="additional">Additional HR round</option>
            </select>
          </Field>
          <Field label="INTERVIEW DATE & TIME"><input type="datetime-local" value={iv.when} onChange={setI("when")} style={{ ...inputStyle, width: "100%" }} /></Field>
          {iv.mode === "virtual" && <Field label="MEETING LINK (OPTIONAL)"><input value={iv.link} onChange={setI("link")} placeholder="Blank = auto-generated room" style={{ ...inputStyle, width: "100%" }} /></Field>}
          {iv.mode === "telephonic" && <Field label="CALL-FROM NUMBER (OPTIONAL)"><input value={iv.phone} onChange={setI("phone")} placeholder="e.g. +91 98xxxxxx" style={{ ...inputStyle, width: "100%" }} /></Field>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <Btn small kind="navy" disabled={busy || !iv.when} onClick={schedule}>{scheduled ? "Update & notify candidate" : "Schedule & notify candidate"}</Btn>
          {scheduled && <span style={{ fontSize: 11.5, color: "#166534", fontWeight: 700 }}>Scheduled: {scheduled.typeLabel} · {scheduled.modeLabel} · {fmtDate(scheduled.scheduledAt)}</span>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="CULTURE FIT (0-10)"><input type="number" min="0" max="10" value={f.culture} onChange={set("culture")} style={{ ...inputStyle, width: "100%" }} /></Field>
        <Field label="NOTICE PERIOD"><input value={f.noticePeriod} onChange={set("noticePeriod")} placeholder="e.g. 30 days" style={{ ...inputStyle, width: "100%" }} /></Field>
        <Field label="CURRENT CTC (LPA)"><input type="number" min="0" step="0.1" value={f.currentCtc} onChange={set("currentCtc")} style={{ ...inputStyle, width: "100%" }} /></Field>
        <Field label="EXPECTED CTC (LPA)"><input type="number" min="0" step="0.1" value={f.expectedCtc} onChange={set("expectedCtc")} style={{ ...inputStyle, width: "100%" }} /></Field>
        <Field label="CTC YOU WILL OFFER (LPA)"><input type="number" min="0" step="0.1" value={f.offeredCtc} onChange={set("offeredCtc")} style={{ ...inputStyle, width: "100%" }} /></Field>
        <Field label="SHIFT CONFIRMED"><input value={f.shift} onChange={set("shift")} placeholder="e.g. Night / US shift" style={{ ...inputStyle, width: "100%" }} /></Field>
      </div>
      {flags.map((x) => <div key={x} style={{ marginTop: 8, fontSize: 12, color: "#B45309", background: "#FEF3C7", padding: "6px 10px", borderRadius: 8 }}>⚠ {x}</div>)}
      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 12, marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#166534", marginBottom: 8 }}>BGV (BACKGROUND VERIFICATION) · REQUIRED TO RECOMMEND HIRE</div>
        {[
          ["digital", "Digital verification via Talentera", "Uses the candidate's Talentera-verified identity, certificates and assessments."],
          ["in_person", "In-person verification at company", "Candidate visits with original documents."],
          ["onboarding", "BGV during onboarding", "Verification is completed after the candidate joins."],
        ].map(([k, label, hint]) => (
          <label key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", cursor: "pointer" }}>
            <input type="radio" name="bgv" checked={f.bgvMethod === k} onChange={() => setF((x) => ({ ...x, bgvMethod: k }))} style={{ marginTop: 3 }} />
            <span><strong style={{ fontSize: 13 }}>{label}</strong><div style={{ fontSize: 11.5, color: "#64748B" }}>{hint}</div></span>
          </label>
        ))}
        {f.bgvMethod === "digital" && (
          <div style={{ fontSize: 12, marginTop: 4, color: "#166534" }}>Talentera profile score: <strong>{app.candidate?.talentScore ?? "—"}/100</strong></div>
        )}
      </div>
      <Field label="NOTES" style={{ marginTop: 10 }}><textarea rows={2} value={f.notes} onChange={set("notes")} style={{ ...inputStyle, width: "100%" }} /></Field>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Btn kind="green" disabled={busy || !f.bgvMethod} onClick={() => submit("hire")}>Recommend hire</Btn>
        <Btn kind="ghost" disabled={busy} onClick={() => submit("hold")}>Hold</Btn>
        <Btn kind="red" disabled={busy} onClick={() => submit("reject")}>Reject</Btn>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- 6. Management approval (batch)
// ---------------------------------------------------------------- 5. BGV (between HR and final approval)
function BgvTab({ byStage, act, busy }) {
  const list = byStage.approval || [];
  const pill = (st) => ({
    verified: ["Verified", "#DCFCE7", "#166534"], deferred: ["At onboarding", "#DBEAFE", "#1D4ED8"],
    in_progress: ["In progress", "#FEF3C7", "#92400E"], failed: ["Failed", "#FEE2E2", "#B91C1C"], pending: ["Pending", "#F1F5F9", "#475569"],
  }[st] || ["Pending", "#F1F5F9", "#475569"]);
  const set = (a, status) => {
    let note = "";
    if (status === "failed") { note = window.prompt("Reason BGV failed (kept in the audit trail):", "") ?? null; if (note === null) return; }
    act(() => companyApi.post(`/company/hiring/applications/${a.id}/bgv`, { status, note }), `BGV marked ${status.replace("_", " ")} for ${a.candidate.name}.`);
  };
  return (
    <Card title={`Background verification · ${list.length} candidate${list.length === 1 ? "" : "s"}`}>
      <Table head={["CANDIDATE", "BGV METHOD", "STATUS", "TALENTERA SCORE", "ACTIONS"]} empty="Candidates recommended by HR appear here for background verification, before final approval.">
        {list.map((a) => {
          const b = a.hr?.bgv; const [lbl, bg, col] = pill(b?.status);
          return (
            <tr key={a.id}>
              {nameCell(a)}
              <td style={td}>{b?.label || <span style={{ color: "#94A3B8" }}>Not selected (older record)</span>}</td>
              <td style={td}><Pill bg={bg} color={col}>{b ? lbl : "Cleared"}</Pill>{b?.note && <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 3 }}>{b.note}</div>}</td>
              <td style={td}>{a.candidate.talentScore ?? "—"}</td>
              <td style={td}>
                {b && b.status !== "deferred" && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {b.status !== "in_progress" && b.status !== "verified" && <Btn small kind="ghost" disabled={busy} onClick={() => set(a, "in_progress")}>Start</Btn>}
                    {b.status !== "verified" && <Btn small kind="green" disabled={busy} onClick={() => set(a, "verified")}>Mark verified</Btn>}
                    {b.status !== "failed" && <Btn small kind="red" disabled={busy} onClick={() => set(a, "failed")}>Failed</Btn>}
                    {b.status === "failed" && <Btn small kind="red" disabled={busy} onClick={() => window.confirm(`Reject ${a.candidate.name} after failed BGV?`) && act(() => companyApi.post("/company/hiring/approval/bulk", { action: "reject", applicationIds: [a.id] }), "Candidate rejected.")}>Reject candidate</Btn>}
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
      <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 8 }}>Digital verification via Talentera is verified automatically for candidates whose Talentera profile is verified. In-person BGV stays pending until you mark it verified. &ldquo;During onboarding&rdquo; does not block final approval.</div>
    </Card>
  );
}

function ApprovalTab({ byStage, sel, toggle, toggleAll, selIds, act, busy, jobId }) {
  const waitingBgv = (byStage.approval || []).filter((a) => !bgvOk(a)).length;
  const list = (byStage.approval || []).filter(bgvOk).slice().sort((a, b) => b.composite - a.composite);
  const [topN, setTopN] = useState(Math.min(50, list.length) || "");
  const [offer, setOffer] = useState({ role: "", joinDate: "", probationMonths: 3, ctc: "" });
  const set = (k) => (e) => setOffer((o) => ({ ...o, [k]: e.target.value }));
  const run = (body, label) => {
    if (body.action === "approve" && !window.confirm(`${label}? Offer letters will be emailed and the candidates' dashboards will flip to OFFER.`)) return;
    act(() => companyApi.post("/company/hiring/approval/bulk", { jobId, offer, ...body }), (r) => `${r.action === "approve" ? "Offers released" : r.action === "hold" ? "Held" : "Rejected"}: ${r.processed} candidate${r.processed === 1 ? "" : "s"}${r.failed ? ` (${r.failed} failed)` : ""} in ${r.seconds}s.`);
  };
  return (
    <>
      <Card title={`Batch approval · ${list.length} HR-recommended candidate${list.length === 1 ? "" : "s"}`}>
        {waitingBgv > 0 && <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{waitingBgv} candidate{waitingBgv === 1 ? " is" : "s are"} still waiting for background verification - they appear here once BGV is verified (see the BGV tab).</div>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
          <Field label="ROLE TITLE (ON OFFER)"><input value={offer.role} onChange={set("role")} placeholder="Defaults to the job title" style={{ ...inputStyle, width: 190 }} /></Field>
          <Field label="JOINING DATE"><input type="date" value={offer.joinDate} onChange={set("joinDate")} style={inputStyle} /></Field>
          <Field label="PROBATION (MONTHS)"><input type="number" min="0" value={offer.probationMonths} onChange={set("probationMonths")} style={{ ...inputStyle, width: 90 }} /></Field>
          <Field label="DEFAULT CTC (LPA) IF HR LEFT BLANK"><input type="number" min="0" step="0.1" value={offer.ctc} onChange={set("ctc")} style={{ ...inputStyle, width: 130 }} /></Field>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Field label="TOP N"><input type="number" min="1" value={topN} onChange={(e) => setTopN(e.target.value)} style={{ ...inputStyle, width: 80 }} /></Field>
          <Btn kind="green" style={{ alignSelf: "flex-end" }} disabled={busy || list.length === 0} onClick={() => run({ action: "approve", topN: Number(topN) || undefined }, `Bulk hire the top ${topN || list.length}`)}>✓ Bulk hire · top {topN || list.length}</Btn>
          <Btn kind="navy" style={{ alignSelf: "flex-end" }} disabled={busy || selIds.length === 0} onClick={() => run({ action: "approve", applicationIds: selIds }, `Approve the ${selIds.length} selected`)}>Approve selected ({selIds.length})</Btn>
          <Btn kind="ghost" style={{ alignSelf: "flex-end" }} disabled={busy || selIds.length === 0} onClick={() => run({ action: "hold", applicationIds: selIds })}>Hold selected</Btn>
          <Btn kind="red" style={{ alignSelf: "flex-end" }} disabled={busy || list.length === 0} onClick={() => window.confirm("Reject everyone still waiting at approval (not just the selected)?") && run({ action: "reject" })}>Reject rest</Btn>
        </div>
        <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 10 }}>Composite rank = exam 40% + technical 40% + verified Talentera score 20%. Every offer letter is emailed and shown on the candidate's dashboard with an audit entry; WhatsApp is not connected yet.</div>
      </Card>
      <Card>
        <Table head={[<input key="c" type="checkbox" checked={list.length > 0 && list.every((a) => sel[a.id])} onChange={() => toggleAll(list)} />, "#", "CANDIDATE", "EXAM", "TECHNICAL", "VERIFIED", "COMPOSITE", "HR OFFER", "HR NOTES"]} empty="HR-recommended candidates appear here for final approval.">
          {list.map((a, i) => (
            <tr key={a.id}>
              <td style={td}><input type="checkbox" checked={!!sel[a.id]} onChange={() => toggle(a.id)} /></td>
              <td style={td}>{i + 1}</td>
              {nameCell(a)}
              <td style={td}>{a.exam?.score ?? "—"}%</td>
              <td style={td}>{a.technical?.avgScore ?? "—"}%</td>
              <td style={td}>{a.candidate.talentScore}</td>
              <td style={td}><strong>{a.composite}</strong></td>
              <td style={td}>{a.hr?.offeredCtc ? `${a.hr.offeredCtc} LPA` : "—"}{(a.hr?.flags || []).map((x) => <div key={x} style={{ fontSize: 10.5, color: "#B45309" }}>⚠ {x}</div>)}</td>
              <td style={{ ...td, fontSize: 11, color: "#475569", maxWidth: 220 }}>{a.hr?.notes || "—"}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- 7. Offers, hold, rejected + audit trail
function OffersTab({ apps, act, busy }) {
  const offers = apps.filter((a) => a.stage === "offered" || a.offer);
  const others = apps.filter((a) => ["hold", "rejected"].includes(a.stage) && !a.offer);
  const [audit, setAudit] = useState(null);
  const open = async (a) => {
    try { const r = await companyApi.get(`/company/hiring/applications/${a.id}/audit`); setAudit({ a, ...r.data }); } catch { setAudit({ a, audit: [] }); }
  };
  const offerPill = (o) => <Pill bg={o.status === "accepted" ? "#DCFCE7" : o.status === "declined" ? "#FEE2E2" : "#DBEAFE"} color={o.status === "accepted" ? "#166534" : o.status === "declined" ? "#B91C1C" : "#1D4ED8"}>{o.status === "sent" ? "Awaiting reply" : o.status}</Pill>;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 14, alignItems: "start" }}>
        <Card title={`Offer letters · ${offers.length}`}>
          <Table head={["CANDIDATE", "OFFER", "STATUS", "TRAIL"]} empty="Offer letters released after final approval appear here.">
            {offers.map((a) => (
              <tr key={a.id}>
                {nameCell(a)}
                <td style={td}>{a.offer ? <>{a.offer.role}<div style={{ fontSize: 11, color: "#64748B" }}>{a.offer.ctc} LPA · joins {fmtDay(a.offer.joinDate)}</div></> : "—"}</td>
                <td style={td}>{a.offer ? offerPill(a.offer) : "—"}</td>
                <td style={td}><Btn small kind="ghost" onClick={() => open(a)}>View trail</Btn></td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title={`Holds & rejections (audit) · ${others.length}`}>
          <Table head={["CANDIDATE", "OUTCOME", "NOTE", "AUDIT / ACTION"]} empty="Candidates put on hold or rejected appear here with their audit trail.">
            {others.map((a) => (
              <tr key={a.id}>
                {nameCell(a)}
                <td style={td}><StageBadge stage={a.stage} /></td>
                <td style={{ ...td, fontSize: 11, color: "#64748B" }}>{a.rejection ? `${a.rejection.round}: ${a.rejection.reason}` : ""}</td>
                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                    <Btn small kind="ghost" onClick={() => open(a)}>View trail</Btn>
                    {a.stage === "hold" && <HoldActions app={a} act={act} busy={busy} />}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      {audit && (
        <Modal title={`Audit trail · ${audit.a.candidate.name}`} onClose={() => setAudit(null)} width={620}>
          {(audit.audit || []).length === 0 ? <div style={{ color: "#94A3B8" }}>No entries yet.</div> : audit.audit.map((e, i) => (
            <div key={i} style={{ borderLeft: "3px solid var(--gold)", padding: "4px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800 }}>{e.action}</div>
              <div style={{ fontSize: 11.5, color: "#475569" }}>{e.detail}</div>
              <div style={{ fontSize: 10.5, color: "#94A3B8" }}>{e.by} · {fmtDate(e.at)}</div>
            </div>
          ))}
          {audit.technical?.scores?.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12 }}><strong>Panel scorecards</strong>{audit.technical.scores.map((s) => <div key={s.member}>{s.member}: {s.pct}% — {Object.entries(s.criteria || {}).map(([k, v]) => `${k} ${v}`).join(", ")}{s.notes ? ` · ${s.notes}` : ""}</div>)}</div>
          )}
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Setup
function SetupTab({ data, act, busy }) {
  const s = data?.setup || {};
  const [panels, setPanels] = useState(
    (s.panels || []).map((p) => ({
      ...p,
      membersText: (p.members || []).map((m) => (typeof m === "string" ? m : m?.name || "")).filter(Boolean).join(", "),
    }))
  );
  const [hrs, setHrs] = useState(s.hrs || []);
  const [examCut, setExamCut] = useState(s.examCutoffPct ?? 65);
  const [techCut, setTechCut] = useState(s.technicalCutoffPct ?? 60);
  const [crit, setCrit] = useState((s.scorecardCriteria || []).join(", "));
  const [office, setOffice] = useState(s.officeAddress || "");
  const [ivMode, setIvMode] = useState(s.interviewMode === "offline" ? "offline" : "virtual");
  const [ivWhen, setIvWhen] = useState(toLocalInput(s.interviewScheduledAt));
  const [ivLink, setIvLink] = useState(s.meetingLink || "");
  const [ivDocs, setIvDocs] = useState(s.documentsToCarry || "");
  const [ivNotes, setIvNotes] = useState(s.interviewInstructions || "");

  useEffect(() => {
    if (data?.setup) {
      const s = data.setup;
      const initialPanels = s.panels && s.panels.length ? s.panels : [{ name: "General Floater Panel", specialty: "General", keywords: "", isFloater: true, members: [] }];
      setPanels(
        initialPanels.map((p) => ({
          ...p,
          membersText: (p.members || []).map((m) => (typeof m === "string" ? m : m?.name || "")).filter(Boolean).join(", "),
        }))
      );
      setHrs(s.hrs || []);
      setExamCut(s.examCutoffPct ?? 65);
      setTechCut(s.technicalCutoffPct ?? 60);
      setCrit((s.scorecardCriteria || []).join(", "));
      setOffice(s.officeAddress || "");
      setIvMode(s.interviewMode === "offline" ? "offline" : "virtual");
      setIvWhen(toLocalInput(s.interviewScheduledAt));
      setIvLink(s.meetingLink || "");
      setIvDocs(s.documentsToCarry || "");
      setIvNotes(s.interviewInstructions || "");
    }
  }, [data?.setup]);

  const upP = (i, k, v) => setPanels((l) => l.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const upH = (i, k, v) => setHrs((l) => l.map((p, j) => (j === i ? { ...p, [k]: v } : p)));

  const save = () =>
    act(
      () =>
        companyApi.put("/company/hiring/setup", {
          panels: panels.map((p) => ({
            ...p,
            name: String(p.name || "").trim() || "General Floater Panel",
            specialty: String(p.specialty || "").trim() || "General",
            keywords: String(p.keywords || "").trim(),
            isFloater: !!p.isFloater,
            members: (p.membersText || "").split(",").map((n) => n.trim()).filter(Boolean).map((name) => ({ name })),
          })),
          hrs,
          examCutoffPct: Number(examCut),
          technicalCutoffPct: Number(techCut),
          scorecardCriteria: (crit || "").split(",").map((x) => x.trim()).filter(Boolean),
          officeAddress: office,
          interviewMode: ivMode,
          interviewScheduledAt: toIso(ivWhen),
          meetingLink: ivLink,
          documentsToCarry: ivDocs,
          interviewInstructions: ivNotes,
        }),
      "Hiring setup saved. Panel members updated across active interviews."
    );

  return (
    <>
      <Card title="Cutoffs & scorecard">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Field label="EXAM CUTOFF %"><input type="number" min="1" max="100" value={examCut} onChange={(e) => setExamCut(e.target.value)} style={{ ...inputStyle, width: 90 }} /></Field>
          <Field label="TECHNICAL PASS % (PANEL AVERAGE)"><input type="number" min="1" max="100" value={techCut} onChange={(e) => setTechCut(e.target.value)} style={{ ...inputStyle, width: 110 }} /></Field>
          <Field label="SCORECARD CRITERIA (COMMA SEPARATED)" style={{ flex: 1, minWidth: 260 }}><input value={crit} onChange={(e) => setCrit(e.target.value)} style={{ ...inputStyle, width: "100%" }} /></Field>
        </div>
        <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 6 }}>The exam cutoff applies to newly added exams; each exam keeps the cutoff it was created with.</div>
      </Card>
      <Card title="Interview scheduling">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="INTERVIEW MODE">
            <div style={{ display: "flex", gap: 6 }}>
              {[["virtual", "🎥 Virtual"], ["offline", "🏢 Offline / walk-in"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setIvMode(k)} style={{ ...inputStyle, cursor: "pointer", fontWeight: 800, background: ivMode === k ? "var(--navy)" : "#fff", color: ivMode === k ? "#fff" : "#334155" }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="DATE & TIME"><input type="datetime-local" value={ivWhen} onChange={(e) => setIvWhen(e.target.value)} style={inputStyle} /></Field>
          <Field label="MEETING LINK (VIRTUAL ROUNDS)" style={{ flex: 1, minWidth: 240 }}><input value={ivLink} onChange={(e) => setIvLink(e.target.value)} placeholder="https://meet.google.com/... (leave blank for an auto-generated room)" style={{ ...inputStyle, width: "100%" }} /></Field>
          <Field label="OFFICE ADDRESS (OFFLINE ROUNDS)" style={{ flex: 1, minWidth: 240 }}><input value={office} onChange={(e) => setOffice(e.target.value)} style={{ ...inputStyle, width: "100%" }} /></Field>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <Field label="DOCUMENTS TO CARRY" style={{ flex: 1, minWidth: 260 }}><input value={ivDocs} onChange={(e) => setIvDocs(e.target.value)} placeholder="e.g. Resume, ID proof, certificates, 2 photos" style={{ ...inputStyle, width: "100%" }} /></Field>
          <Field label="INTERVIEW INSTRUCTIONS" style={{ flex: 1, minWidth: 260 }}><input value={ivNotes} onChange={(e) => setIvNotes(e.target.value)} placeholder="e.g. Report 15 minutes early, formal dress" style={{ ...inputStyle, width: "100%" }} /></Field>
        </div>
        <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 6 }}>These are used when you allocate the technical round. Each candidate gets an in-app notification and a confirmation email with the date, time, link or address, documents and instructions. Save the setup below to apply.</div>
      </Card>
      <Card title="Specialty interview panels" right={<Btn small kind="ghost" onClick={() => setPanels((l) => [...l, { name: "", specialty: "", keywords: "", isFloater: false, membersText: "" }])}>+ Add panel</Btn>}>
        {panels.map((p, i) => {
          const parsed = (p.membersText || "").split(",").map((n) => n.trim()).filter(Boolean);
          return (
            <div key={i} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1.6fr auto auto", gap: 8, alignItems: "end" }}>
                <Field label="PANEL NAME"><input value={p.name} onChange={(e) => upP(i, "name", e.target.value)} style={{ ...inputStyle, width: "100%" }} placeholder="e.g. General Floater Panel" /></Field>
                <Field label="MATCH KEYWORDS"><input value={p.keywords} onChange={(e) => upP(i, "keywords", e.target.value)} style={{ ...inputStyle, width: "100%" }} placeholder="hcc, risk adjustment" /></Field>
                <Field label="MEMBERS (COMMA SEPARATED)"><input value={p.membersText} onChange={(e) => upP(i, "membersText", e.target.value)} style={{ ...inputStyle, width: "100%" }} placeholder="e.g. Priya S, Vikram, Alex" /></Field>
                <label style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}><input type="checkbox" checked={!!p.isFloater} onChange={(e) => upP(i, "isFloater", e.target.checked)} /> Floater</label>
                <Btn small kind="red" onClick={() => setPanels((l) => l.filter((_, j) => j !== i))}>Remove</Btn>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>Active Members:</span>
                {parsed.length > 0 ? (
                  parsed.map((nm) => (
                    <Pill key={nm} bg="#EDE9FE" color="#6D28D9">👤 {nm}</Pill>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: "#B45309" }}>⚠ No members yet — type interviewer names separated by comma above (e.g. Priya Sharma, Alex)</span>
                )}
              </div>
            </div>
          );
        })}
        {panels.length === 0 && (
          <div style={{ fontSize: 12.5, color: "#64748B", padding: "12px 0" }}>
            No panels configured yet. Click <strong>+ Add panel</strong> above or click Save Setup to initialize the default floater panel.
          </div>
        )}
      </Card>
      <Card title="HR round owners" right={<Btn small kind="ghost" onClick={() => setHrs((l) => [...l, { name: "", role: "", city: "", specialty: "" }])}>+ Add HR</Btn>}>
        {hrs.map((h, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1fr 1.2fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
            <Field label="NAME"><input value={h.name} onChange={(e) => upH(i, "name", e.target.value)} style={{ ...inputStyle, width: "100%" }} /></Field>
            <Field label="ROLE"><input value={h.role} onChange={(e) => upH(i, "role", e.target.value)} style={{ ...inputStyle, width: "100%" }} placeholder="Sr HR BP" /></Field>
            <Field label="CITY"><input value={h.city} onChange={(e) => upH(i, "city", e.target.value)} style={{ ...inputStyle, width: "100%" }} /></Field>
            <Field label="SPECIALTY KEYWORDS"><input value={h.specialty} onChange={(e) => upH(i, "specialty", e.target.value)} style={{ ...inputStyle, width: "100%" }} placeholder="hcc, e/m" /></Field>
            <Btn small kind="red" onClick={() => setHrs((l) => l.filter((_, j) => j !== i))}>Remove</Btn>
          </div>
        ))}
        {hrs.length === 0 && <div style={{ fontSize: 12.5, color: "#94A3B8" }}>No HRs added yet.</div>}
      </Card>
      <Btn kind="gold" disabled={busy} onClick={save}>Save setup</Btn>
    </>
  );
}
