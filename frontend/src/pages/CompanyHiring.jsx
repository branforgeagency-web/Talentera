import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import companyApi from "../api/companyClient";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import HeadOnly from "../components/company/HeadOnly.jsx";
import { StageBadge, Pill, Card, Btn, Field, Modal, Table, td, inputStyle, fmtDate, fmtDay } from "../components/hiring/hiringUi.jsx";

const TABS = [
  ["applicants", "1 · Applicants"],
  ["exams", "2 · Exams"],
  ["results", "3 · Exam results"],
  ["technical", "4 · Technical"],
  ["hr", "5 · HR round"],
  ["approval", "6 · Approval"],
  ["offers", "7 · Offers & audit"],
  ["setup", "Setup"],
];

const errMsg = (e, d) => e?.response?.data?.message || d;

// Hiring flow: 100 pre-screened applicants -> batch hires in one sprint.
export default function CompanyHiring() {
  const navigate = useNavigate();
  const { company, logout } = useCompanyAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("applicants");
  const [jobId, setJobId] = useState("");
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState({}); // selected application ids

  const load = useCallback(async () => {
    try {
      const res = await companyApi.get("/company/hiring/overview", { params: jobId ? { jobId } : {} });
      setData(res.data);
    } catch (e) {
      toast(errMsg(e, "Could not load the hiring flow."), "!");
    } finally {
      setLoading(false);
    }
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSel({}); }, [tab, jobId]);

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
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/companies/directory" style={navLink}>Hire Verified Talent</Link>
          <Link to="/companies/jobs" style={navLink}>Job Posts</Link>
          <Link to="/companies/applicants" style={navLink}>Applicants</Link>
          <Link to="/companies/hiring" style={{ ...navLink, color: "var(--gold)", padding: "6px 12px", background: "rgba(229,168,46,0.12)", borderRadius: 6 }}>Hiring Flow</Link>
          <HeadOnly><Link to="/companies/team" style={navLink}>Team Logins</Link></HeadOnly>
          <HeadOnly><Link to="/companies/dashboard" style={navLink}>Edit Profile</Link></HeadOnly>
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
          {TABS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", border: tab === k ? "1px solid var(--gold)" : "1px solid #CBD5E1", background: tab === k ? "var(--gold)" : "#fff", color: "var(--navy)" }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading your hiring pipeline…</div> : (
          <>
            {tab === "applicants" && <ApplicantsTab {...common} />}
            {tab === "exams" && <ExamsTab {...common} />}
            {tab === "results" && <ResultsTab {...common} />}
            {tab === "technical" && <TechnicalTab {...common} />}
            {tab === "hr" && <HrTab {...common} />}
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
  const exams = data.exams || [];
  const chosen = examId || exams[0]?._id || "";
  const allocate = (body) => act(() => companyApi.post(`/company/hiring/exams/${chosen}/allocate`, { jobId, ...body }), (r) => `Exam allocated to ${r.allocated} candidate${r.allocated === 1 ? "" : "s"}.`);
  return (
    <>
      <Card title={`Allocate an exam · ${list.length} applicant${list.length === 1 ? "" : "s"} waiting`}>
        {exams.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748B" }}>You have no exam yet. <button type="button" onClick={() => setTab("exams")} style={{ background: "none", border: "none", color: "#1D4ED8", fontWeight: 800, cursor: "pointer" }}>Pick or upload one →</button></div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <Field label="EXAM"><select value={chosen} onChange={(e) => setExamId(e.target.value)} style={{ ...inputStyle, minWidth: 240 }}>{exams.map((e) => <option key={e._id} value={e._id}>{e.title} · {e.source}</option>)}</select></Field>
            <Field label="ONLY SPECIALTY (OPTIONAL)"><input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. AR, HCC, billing" style={{ ...inputStyle, width: 190 }} /></Field>
            <Btn kind="gold" disabled={busy || list.length === 0} onClick={() => allocate({ all: true, specialty: specialty || undefined })}>Allocate to all {list.length}</Btn>
            <Btn kind="navy" disabled={busy || selIds.length === 0} onClick={() => allocate({ applicationIds: selIds })}>Allocate to selected ({selIds.length})</Btn>
          </div>
        )}
        <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 8 }}>Each candidate gets an in-app notice and email with a {48}-hour exam link. Allocate by specialty to send the AR exam only to AR candidates, the coding exam only to coders, and so on.</div>
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
function ResultsTab({ data, apps, act, busy, jobId }) {
  const list = apps.filter((a) => a.exam && a.exam.allocatedAt);
  const live = data.examLive || {};
  const [scoreFor, setScoreFor] = useState(null);
  const [score, setScore] = useState("");
  const state = (a) => (a.exam.completedAt ? (a.exam.passed ? "passed" : "failed") : a.exam.startedAt ? "in-progress" : "not-started");
  return (
    <>
      <Card title="Live exam status" right={<Btn kind="ghost" small disabled={busy} onClick={() => act(() => companyApi.post("/company/hiring/exam-gate", { jobId }), (r) => `Cutoff gate re-run on ${r.processed} result(s).`)}>Re-run cutoff gate</Btn>}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Pill bg="#DCFCE7" color="#166534">{live.completed || 0} completed</Pill>
          <Pill bg="#FEF3C7" color="#92400E">{live.inProgress || 0} in progress</Pill>
          <Pill>{live.notStarted || 0} not started</Pill>
          <span style={{ fontSize: 12, color: "#64748B" }}>Auto-decision: at or above the cutoff → Round 2 · below → polite auto-reject, kept in your future pool.</span>
        </div>
      </Card>
      <Card>
        <Table head={["CANDIDATE", "EXAM", "STATUS", "SCORE", "TOPIC BREAKDOWN", "PROCTORING", "NEXT"]} empty="No exams allocated yet.">
          {list.map((a) => {
            const e = a.exam; const st = state(a);
            return (
              <tr key={a.id}>
                {nameCell(a)}
                <td style={td}>{e.title}<div style={{ fontSize: 10.5, color: "#94A3B8" }}>{e.source} · due {fmtDate(e.expiresAt)}</div></td>
                <td style={td}><Pill bg={st === "passed" ? "#DCFCE7" : st === "failed" ? "#FEE2E2" : st === "in-progress" ? "#FEF3C7" : "#F1F5F9"} color={st === "passed" ? "#166534" : st === "failed" ? "#B91C1C" : st === "in-progress" ? "#92400E" : "#475569"}>{st}</Pill></td>
                <td style={td}>{e.completedAt ? <strong>{e.score}%</strong> : "—"}<div style={{ fontSize: 10.5, color: "#94A3B8" }}>cutoff {e.cutoffPct}%</div></td>
                <td style={{ ...td, fontSize: 11 }}>{(e.topicBreakdown || []).map((t) => <div key={t.topic}>{t.topic}: {t.correct}/{t.total}</div>)}</td>
                <td style={td}>{(e.proctorFlags || []).length ? <Pill bg="#FEE2E2" color="#B91C1C">{e.proctorFlags.length} flag{e.proctorFlags.length === 1 ? "" : "s"}</Pill> : <span style={{ color: "#94A3B8" }}>clean</span>}</td>
                <td style={td}>
                  {!e.completedAt && (e.source === "manual" || e.source === "integration") && <Btn small kind="navy" onClick={() => { setScoreFor(a); setScore(""); }}>Enter score</Btn>}
                  {e.completedAt && <StageBadge stage={a.stage} />}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
      {scoreFor && (
        <Modal title={`Enter exam score · ${scoreFor.candidate.name}`} onClose={() => setScoreFor(null)} width={380}>
          <Field label="SCORE (0-100)"><input type="number" min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)} style={{ ...inputStyle, width: "100%" }} autoFocus /></Field>
          <div style={{ fontSize: 11.5, color: "#64748B", margin: "8px 0 12px" }}>The cutoff gate runs immediately: pass → technical round, below → polite auto-reject.</div>
          <Btn kind="gold" disabled={busy || score === ""} onClick={async () => { const r = await act(() => companyApi.post(`/company/hiring/applications/${scoreFor.id}/exam-score`, { score: Number(score) }), "Score recorded."); if (r) setScoreFor(null); }}>Save score</Btn>
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- 4. Technical round
function TechnicalTab({ data, byStage, sel, toggle, toggleAll, selIds, act, busy, jobId }) {
  const list = byStage.technical || [];
  const [mode, setMode] = useState("virtual");
  const [when, setWhen] = useState("");
  const [scoring, setScoring] = useState(null);
  const panels = data.setup?.panels || [];
  const unassigned = list.filter((a) => !a.technical?.panelId);
  const allocate = (ids) => act(() => companyApi.post("/company/hiring/technical/allocate", { mode, scheduledAt: when || undefined, jobId, ...(ids ? { applicationIds: ids } : {}) }), (r) => `${r.allocated} candidate${r.allocated === 1 ? "" : "s"} routed to specialty panels.`);

  // panel load summary
  const load = {};
  list.forEach((a) => { if (a.technical?.panelName) load[a.technical.panelName] = (load[a.technical.panelName] || 0) + 1; });

  return (
    <>
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
                  {t?.mode === "virtual" && <><Pill bg="#DBEAFE" color="#1D4ED8">Virtual</Pill><div style={{ fontSize: 11, marginTop: 4 }}><a href={t.meetingLink} target="_blank" rel="noreferrer" style={{ color: "#1D4ED8", fontWeight: 800 }}>Join room →</a></div></>}
                  {t?.mode === "offline" && <><Pill bg="#FEF3C7" color="#92400E">Offline</Pill><div style={{ fontSize: 11, marginTop: 4 }}>Code <strong>{t.checkinToken}</strong> · {t.checkedInAt ? <span style={{ color: "#166534" }}>checked in {fmtDate(t.checkedInAt)}</span> : <button type="button" onClick={() => act(() => companyApi.post(`/company/hiring/applications/${a.id}/checkin`), "Checked in.")} style={{ background: "none", border: "none", color: "#1D4ED8", fontWeight: 800, cursor: "pointer", padding: 0 }}>mark arrived</button>}</div></>}
                  {t?.scheduledAt && <div style={{ fontSize: 10.5, color: "#64748B" }}>{fmtDate(t.scheduledAt)}</div>}
                </td>
                <td style={td}>{(t?.scores || []).length ? <><strong>{t.avgScore}%</strong> avg<div style={{ fontSize: 10.5, color: "#64748B" }}>{t.scores.map((s) => `${s.member} ${s.pct}%`).join(" · ")}</div></> : "—"}</td>
                <td style={td}>{t?.panelId && <Btn small kind="navy" onClick={() => setScoring(a)}>Open scorecard</Btn>}</td>
              </tr>
            );
          })}
        </Table>
      </Card>
      {scoring && <ScorecardModal app={scoring} setup={data.setup} onClose={() => setScoring(null)} act={act} busy={busy} />}
    </>
  );
}

function ScorecardModal({ app, setup, onClose, act, busy }) {
  const crit = setup?.scorecardCriteria || [];
  const panel = (setup?.panels || []).find((p) => String(p._id) === String(app.technical?.panelId));
  const members = (panel?.members || []).map((m) => m.name);
  const [member, setMember] = useState(members[0] || "");
  const [scores, setScores] = useState(Object.fromEntries(crit.map((c) => [c, 5])));
  const [notes, setNotes] = useState("");
  const [fresh, setFresh] = useState(app.technical);
  const save = async () => {
    const r = await act(() => companyApi.post(`/company/hiring/applications/${app.id}/technical-score`, { memberName: member, scores, notes }), "Score saved.");
    if (r) { setFresh(r.technical); setNotes(""); }
  };
  const finish = async (decision) => {
    const r = await act(() => companyApi.post(`/company/hiring/applications/${app.id}/technical-complete`, { decision, notes: fresh?.consensusNotes }), decision === "reject" ? "Candidate rejected." : "Saved - moved to HR round.");
    if (r) onClose();
  };
  return (
    <Modal title={`Panel scorecard · ${app.candidate.name}`} onClose={onClose} width={620}>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>{app.technical?.panelName} · {app.technical?.mode} · every member scores live; the average is calculated automatically.</div>
      <Field label="SCORING AS" style={{ marginBottom: 10 }}>
        <select value={member} onChange={(e) => setMember(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
          {members.length === 0 && <option value="">(add panel members in Setup)</option>}
          {members.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      {crit.map((c) => (
        <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1, fontSize: 12.5, fontWeight: 700 }}>{c}</div>
          <input type="range" min="0" max="10" value={scores[c]} onChange={(e) => setScores((s) => ({ ...s, [c]: Number(e.target.value) }))} style={{ width: 170 }} />
          <strong style={{ width: 26, textAlign: "right" }}>{scores[c]}</strong>
        </div>
      ))}
      <Field label="NOTES"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, width: "100%" }} /></Field>
      <div style={{ margin: "10px 0" }}><Btn kind="navy" disabled={busy || !member} onClick={save}>Save my score</Btn></div>
      {(fresh?.scores || []).length > 0 && (
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12 }}>
          {fresh.scores.map((s) => <div key={s.member}><strong>{s.member}</strong> · {s.pct}%{s.notes ? ` — ${s.notes}` : ""}</div>)}
          <div style={{ marginTop: 6, fontWeight: 800 }}>Panel average: {fresh.avgScore}% (pass mark {setup?.technicalCutoffPct || 60}%)</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn kind="gold" disabled={busy || !(fresh?.scores || []).length} onClick={() => finish()}>Save &amp; proceed to HR</Btn>
        <Btn kind="red" disabled={busy || !(fresh?.scores || []).length} onClick={() => finish("reject")}>Reject</Btn>
      </div>
      <div style={{ fontSize: 11, color: "#64748B", marginTop: 8 }}>"Save &amp; proceed" uses the panel average against your cutoff. The candidate is notified automatically either way.</div>
    </Modal>
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
        <Table head={["CANDIDATE", "HR OWNER", "ROUND 1", "ROUND 2", "CTC", "STATUS", ""]} empty="Candidates who clear the technical round appear here.">
          {list.map((a) => (
            <tr key={a.id}>
              {nameCell(a)}
              <td style={td}>{a.hr?.hrName || <Pill bg="#FEF3C7" color="#92400E">Unassigned</Pill>}</td>
              <td style={td}>{a.exam?.score != null ? `${a.exam.score}%` : "—"}</td>
              <td style={td}>{a.technical?.avgScore != null ? `${a.technical.avgScore}%` : "—"}</td>
              <td style={td}>{a.hr?.offeredCtc ? `${a.hr.offeredCtc} LPA` : "—"}</td>
              <td style={td}>{a.hr?.status === "completed" ? <Pill bg="#DCFCE7" color="#166534">{a.hr.decision}</Pill> : <Pill>pending</Pill>}</td>
              <td style={td}><Btn small kind="navy" onClick={() => setForm(a)}>HR form</Btn></td>
            </tr>
          ))}
        </Table>
      </Card>
      {form && <HrFormModal app={form} onClose={() => setForm(null)} act={act} busy={busy} />}
    </>
  );
}

function HrFormModal({ app, onClose, act, busy }) {
  const h = app.hr || {};
  const [f, setF] = useState({ culture: h.cultureFit ?? 7, noticePeriod: h.noticePeriod || "", currentCtc: h.currentCtc ?? "", expectedCtc: h.expectedCtc ?? "", offeredCtc: h.offeredCtc ?? "", shift: h.shift || "", notes: h.notes || "" });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const flags = [];
  if (f.currentCtc && f.expectedCtc && Number(f.expectedCtc) > Number(f.currentCtc) * 1.5) flags.push("Expected CTC is more than 50% above current CTC");
  if (f.offeredCtc && f.expectedCtc && Number(f.offeredCtc) < Number(f.expectedCtc) * 0.85) flags.push("Offer is more than 15% below expectation");
  const submit = async (decision) => { const r = await act(() => companyApi.post(`/company/hiring/applications/${app.id}/hr-submit`, { ...f, decision }), `HR decision saved: ${decision}.`); if (r) onClose(); };
  return (
    <Modal title={`HR round · ${app.candidate.name}`} onClose={onClose} width={560}>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>Round 1: {app.exam?.score ?? "—"}% · Round 2: {app.technical?.avgScore ?? "—"}%{app.technical?.scores?.length ? ` (${app.technical.scores.map((s) => s.member).join(", ")})` : ""}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="CULTURE FIT (0-10)"><input type="number" min="0" max="10" value={f.culture} onChange={set("culture")} style={{ ...inputStyle, width: "100%" }} /></Field>
        <Field label="NOTICE PERIOD"><input value={f.noticePeriod} onChange={set("noticePeriod")} placeholder="e.g. 30 days" style={{ ...inputStyle, width: "100%" }} /></Field>
        <Field label="CURRENT CTC (LPA)"><input type="number" min="0" step="0.1" value={f.currentCtc} onChange={set("currentCtc")} style={{ ...inputStyle, width: "100%" }} /></Field>
        <Field label="EXPECTED CTC (LPA)"><input type="number" min="0" step="0.1" value={f.expectedCtc} onChange={set("expectedCtc")} style={{ ...inputStyle, width: "100%" }} /></Field>
        <Field label="CTC YOU WILL OFFER (LPA)"><input type="number" min="0" step="0.1" value={f.offeredCtc} onChange={set("offeredCtc")} style={{ ...inputStyle, width: "100%" }} /></Field>
        <Field label="SHIFT CONFIRMED"><input value={f.shift} onChange={set("shift")} placeholder="e.g. Night / US shift" style={{ ...inputStyle, width: "100%" }} /></Field>
      </div>
      {flags.map((x) => <div key={x} style={{ marginTop: 8, fontSize: 12, color: "#B45309", background: "#FEF3C7", padding: "6px 10px", borderRadius: 8 }}>⚠ {x}</div>)}
      <Field label="NOTES" style={{ marginTop: 10 }}><textarea rows={2} value={f.notes} onChange={set("notes")} style={{ ...inputStyle, width: "100%" }} /></Field>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Btn kind="green" disabled={busy} onClick={() => submit("hire")}>Recommend hire</Btn>
        <Btn kind="ghost" disabled={busy} onClick={() => submit("hold")}>Hold</Btn>
        <Btn kind="red" disabled={busy} onClick={() => submit("reject")}>Reject</Btn>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- 6. Management approval (batch)
function ApprovalTab({ byStage, sel, toggle, toggleAll, selIds, act, busy, jobId }) {
  const list = (byStage.approval || []).slice().sort((a, b) => b.composite - a.composite);
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
function OffersTab({ apps }) {
  const list = apps.filter((a) => ["offered", "hold", "rejected"].includes(a.stage));
  const [audit, setAudit] = useState(null);
  const open = async (a) => {
    try { const r = await companyApi.get(`/company/hiring/applications/${a.id}/audit`); setAudit({ a, ...r.data }); } catch { setAudit({ a, audit: [] }); }
  };
  return (
    <>
      <Card title={`Outcomes · ${list.length}`}>
        <Table head={["CANDIDATE", "OUTCOME", "OFFER", "OFFER STATUS", "NOTE", "AUDIT"]} empty="Offers, holds and rejections appear here.">
          {list.map((a) => (
            <tr key={a.id}>
              {nameCell(a)}
              <td style={td}><StageBadge stage={a.stage} /></td>
              <td style={td}>{a.offer ? <>{a.offer.role}<div style={{ fontSize: 11, color: "#64748B" }}>{a.offer.ctc} LPA · joins {fmtDay(a.offer.joinDate)}</div></> : "—"}</td>
              <td style={td}>{a.offer ? <Pill bg={a.offer.status === "accepted" ? "#DCFCE7" : a.offer.status === "declined" ? "#FEE2E2" : "#DBEAFE"} color={a.offer.status === "accepted" ? "#166534" : a.offer.status === "declined" ? "#B91C1C" : "#1D4ED8"}>{a.offer.status}</Pill> : "—"}</td>
              <td style={{ ...td, fontSize: 11, color: "#64748B" }}>{a.rejection ? `${a.rejection.round}: ${a.rejection.reason}` : ""}</td>
              <td style={td}><Btn small kind="ghost" onClick={() => open(a)}>View trail</Btn></td>
            </tr>
          ))}
        </Table>
      </Card>
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
  const s = data.setup;
  const [panels, setPanels] = useState((s.panels || []).map((p) => ({ ...p, membersText: (p.members || []).map((m) => m.name).join(", ") })));
  const [hrs, setHrs] = useState(s.hrs || []);
  const [examCut, setExamCut] = useState(s.examCutoffPct);
  const [techCut, setTechCut] = useState(s.technicalCutoffPct);
  const [crit, setCrit] = useState((s.scorecardCriteria || []).join(", "));
  const [office, setOffice] = useState(s.officeAddress || "");
  const upP = (i, k, v) => setPanels((l) => l.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const upH = (i, k, v) => setHrs((l) => l.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const save = () => act(() => companyApi.put("/company/hiring/setup", {
    panels: panels.map((p) => ({ ...p, members: p.membersText.split(",").map((n) => n.trim()).filter(Boolean).map((name) => ({ name })) })),
    hrs, examCutoffPct: Number(examCut), technicalCutoffPct: Number(techCut),
    scorecardCriteria: crit.split(",").map((x) => x.trim()).filter(Boolean), officeAddress: office,
  }), "Hiring setup saved.");
  return (
    <>
      <Card title="Cutoffs & scorecard">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Field label="EXAM CUTOFF %"><input type="number" min="1" max="100" value={examCut} onChange={(e) => setExamCut(e.target.value)} style={{ ...inputStyle, width: 90 }} /></Field>
          <Field label="TECHNICAL PASS % (PANEL AVERAGE)"><input type="number" min="1" max="100" value={techCut} onChange={(e) => setTechCut(e.target.value)} style={{ ...inputStyle, width: 110 }} /></Field>
          <Field label="SCORECARD CRITERIA (COMMA SEPARATED)" style={{ flex: 1, minWidth: 260 }}><input value={crit} onChange={(e) => setCrit(e.target.value)} style={{ ...inputStyle, width: "100%" }} /></Field>
          <Field label="OFFICE ADDRESS (OFFLINE ROUNDS)" style={{ flex: 1, minWidth: 260 }}><input value={office} onChange={(e) => setOffice(e.target.value)} style={{ ...inputStyle, width: "100%" }} /></Field>
        </div>
        <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 6 }}>The exam cutoff applies to newly added exams; each exam keeps the cutoff it was created with.</div>
      </Card>
      <Card title="Specialty interview panels" right={<Btn small kind="ghost" onClick={() => setPanels((l) => [...l, { name: "", specialty: "", keywords: "", isFloater: false, membersText: "" }])}>+ Add panel</Btn>}>
        {panels.map((p, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1.6fr auto auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
            <Field label="PANEL NAME"><input value={p.name} onChange={(e) => upP(i, "name", e.target.value)} style={{ ...inputStyle, width: "100%" }} placeholder="Panel A · HCC" /></Field>
            <Field label="MATCH KEYWORDS"><input value={p.keywords} onChange={(e) => upP(i, "keywords", e.target.value)} style={{ ...inputStyle, width: "100%" }} placeholder="hcc, risk adjustment" /></Field>
            <Field label="MEMBERS (2-3, COMMA SEPARATED)"><input value={p.membersText} onChange={(e) => upP(i, "membersText", e.target.value)} style={{ ...inputStyle, width: "100%" }} placeholder="Rina, Sam, Priya" /></Field>
            <label style={{ fontSize: 11.5, fontWeight: 700 }}><input type="checkbox" checked={!!p.isFloater} onChange={(e) => upP(i, "isFloater", e.target.checked)} /> Floater</label>
            <Btn small kind="red" onClick={() => setPanels((l) => l.filter((_, j) => j !== i))}>Remove</Btn>
          </div>
        ))}
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
