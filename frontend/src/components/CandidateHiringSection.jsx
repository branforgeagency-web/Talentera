import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/client";
import CompanyLogo from "./CompanyLogo.jsx";
import { Card, Btn, Pill, StageBadge, Modal, fmtDate, fmtDay } from "./hiring/hiringUi.jsx";

const STEPS = [["exam", "Assessment"], ["technical", "Technical"], ["hr", "HR round"], ["approval", "Approval"], ["offered", "Offer"]];
const stepIndex = (stage) => Math.max(0, STEPS.findIndex(([k]) => k === (stage === "hold" ? "approval" : stage)));
const errMsg = (e, d) => e?.response?.data?.message || d;

export default function CandidateHiringSection({ triggerToast, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openResults, setOpenResults] = useState({}); // application id -> assessment score details expanded
  const [taking, setTaking] = useState(null); // application id of the exam being taken
  const [selCompany, setSelCompany] = useState(null); // company name whose detailed status / reports are open
  const toast = (m, t = "success") => (triggerToast ? triggerToast(m, t) : window.alert(m));

  const load = useCallback(async () => {
    try {
      const res = await api.get("/candidate/hiring");
      setItems(res.data?.items || []);
      if (typeof onChanged === "function") onChanged();
    } catch (e) {
      toast(errMsg(e, "Could not load your hiring rounds."), "error");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const respond = async (id, accept) => {
    if (!window.confirm(accept ? "Accept this offer?" : "Decline this offer?")) return;
    try { await api.post(`/candidate/hiring/offers/${id}/respond`, { accept }); toast(accept ? "Offer accepted. Congratulations!" : "Offer declined."); load(); }
    catch (e) { toast(errMsg(e, "Could not send your response."), "error"); }
  };

  const checkin = async (token) => {
    try { await api.post(`/hiring-public/checkin/${token}`); toast("You're checked in. Please wait at reception."); load(); }
    catch (e) { toast(errMsg(e, "Check-in failed."), "error"); }
  };

  if (taking) return <ExamRunner appId={taking} onDone={() => { setTaking(null); load(); }} toast={toast} />;

  const companies = [];
  items.forEach((it) => {
    const name = it.company || "Company";
    let c = companies.find((x) => x.name === name);
    if (!c) { c = { name, logo: it.companyLogo, items: [] }; companies.push(c); }
    if (!c.logo && it.companyLogo) c.logo = it.companyLogo;
    c.items.push(it);
  });
  const companyItems = selCompany ? items.filter((x) => (x.company || "Company") === selCompany) : [];

  return (
    <div style={{ padding: 4 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "var(--navy)" }}>Hiring Rounds</h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748B" }}>Your assessments, interviews and offers from companies, all in one place.</p>
      {loading ? <div style={{ padding: 30, color: "#64748B" }}>Loading…</div> : items.length === 0 ? (
        <Card><div style={{ textAlign: "center", padding: 24, color: "#64748B" }}>No hiring rounds yet. When a company moves your application forward, your assessment, interview and offer will show up here.</div></Card>
      ) : !selCompany || companyItems.length === 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {companies.map((c) => (
            <button key={c.name} type="button" onClick={() => setSelCompany(c.name)} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 16, boxShadow: "0 1px 3px rgba(15,23,42,0.06)", font: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <CompanyLogo companyName={c.name} logoUrl={c.logo} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--navy, #0A1F3D)", lineHeight: 1.2 }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>{c.items.length} application{c.items.length === 1 ? "" : "s"} · {c.items.map((x) => x.role).filter(Boolean).slice(0, 2).join(", ")}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <StageBadge stage={c.items[0].stage} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>View status &amp; reports →</span>
              </div>
            </button>
          ))}
        </div>
      ) : (<>
        <button type="button" onClick={() => setSelCompany(null)} style={{ background: "none", border: "none", color: "#1D4ED8", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 12 }}>← All companies</button>
        <Card style={{ padding: 18, borderRadius: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <CompanyLogo companyName={selCompany} logoUrl={companyItems[0].companyLogo} size={64} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--navy, #0A1F3D)" }}>{selCompany}</div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Interview performance &amp; status report</div>
            </div>
          </div>
          <div style={{ overflowX: "auto", marginTop: 14 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ textAlign: "left", color: "#64748B", fontSize: 11.5, textTransform: "uppercase" }}>
                {["Role", "Stage", "Assessment", "Technical", "HR round", "BGV", "Offer"].map((h) => <th key={h} style={{ padding: "6px 8px", borderBottom: "1px solid #E2E8F0" }}>{h}</th>)}
              </tr></thead>
              <tbody>{companyItems.map((x) => (
                <tr key={x.id}>
                  <td style={{ padding: "8px", fontWeight: 700 }}>{x.role}</td>
                  <td style={{ padding: "8px" }}><StageBadge stage={x.stage} /></td>
                  <td style={{ padding: "8px" }}>{x.exam?.completedAt ? `${x.exam.passed ? "Pass" : "Fail"} · ${x.exam.score}%` : x.exam ? "Pending" : "-"}</td>
                  <td style={{ padding: "8px" }}>{x.technical && (x.technical.decision || x.technical.avgScore !== null) ? `${x.technical.decision === "pass" ? "Passed" : x.technical.decision ? "Below cutoff" : "In review"} · ${x.technical.avgScore ?? 0}%` : x.technical ? "Scheduled" : "-"}</td>
                  <td style={{ padding: "8px" }}>{x.hrStatus?.interview ? (x.hrStatus.interview.scheduledAt ? fmtDate(x.hrStatus.interview.scheduledAt) : "Scheduled") : "-"}</td>
                  <td style={{ padding: "8px" }}>{x.hrStatus?.bgv?.label || "-"}</td>
                  <td style={{ padding: "8px" }}>{x.offer ? (x.offer.status === "sent" ? "Offer received" : `Offer ${x.offer.status}`) : "-"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
        {companyItems.map((it) => {
        const idx = stepIndex(it.stage);
        const e = it.exam;
        const expired = e && e.expiresAt && new Date(e.expiresAt) < new Date() && !e.startedAt && !e.completedAt;
        const external = e && (e.source === "manual" || e.source === "integration" || String(e.source).startsWith("integration"));
        return (
          <Card key={it.id} style={{ padding: 20, borderRadius: 14, boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              <CompanyLogo companyName={it.company} logoUrl={it.companyLogo} size={56} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: "var(--navy, #0A1F3D)", lineHeight: 1.2 }}>{it.company}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#64748B", marginTop: 3 }}>{it.role}</div>
              </div>
              <StageBadge stage={it.stage} />
            </div>
            {it.stage !== "rejected" && (
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {STEPS.map(([k, label], i) => (
                  <div key={k} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ height: 6, borderRadius: 4, background: i < idx || (i === idx && it.stage === "offered") ? "#22C55E" : i === idx ? "var(--gold)" : "#E2E8F0" }} />
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: i <= idx ? "#0F172A" : "#94A3B8", marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {e && it.stage === "exam" && !e.completedAt && (
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 800, color: "#1E40AF" }}>Assessment: {e.title}</div>
                {external ? (
                  <div style={{ fontSize: 12.5, color: "#475569", marginTop: 4 }}>This assessment is taken outside Talentera - {it.company} will share how. Your result will appear here.</div>
                ) : expired ? (
                  <div style={{ fontSize: 12.5, color: "#B91C1C", marginTop: 4 }}>This assessment link expired. Ask {it.company} to allocate it again.</div>
                ) : (
                  <>
                    <div style={{ fontSize: 12.5, color: "#475569", margin: "4px 0 10px" }}>{e.durationMin} minutes · webcam on · one attempt · pass mark {e.cutoffPct}% · {e.startedAt ? "in progress - you can resume" : `complete before ${fmtDate(e.expiresAt)}`}</div>
                    <Btn kind="gold" onClick={() => setTaking(it.id)}>{e.startedAt ? "Resume assessment" : "Start assessment"}</Btn>
                  </>
                )}
              </div>
            )}

            {e && e.completedAt && (
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <strong>Assessment result:</strong>{" "}
                <Pill bg={e.passed ? "#DCFCE7" : "#FEE2E2"} color={e.passed ? "#166534" : "#B91C1C"}>{e.passed ? "Pass" : "Fail"}</Pill>
                <button type="button" onClick={() => setOpenResults((o) => ({ ...o, [it.id]: !o[it.id] }))} style={{ marginLeft: 10, background: "none", border: "none", color: "#1D4ED8", fontWeight: 700, fontSize: 12.5, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                  {openResults[it.id] ? "Hide results" : "View results"}
                </button>
                {openResults[it.id] && (
                  <div style={{ marginTop: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 10 }}>
                    <div><strong>Score: {e.score}%</strong> <span style={{ color: "#64748B" }}>(pass mark {e.cutoffPct}%)</span></div>
                    {(e.topicBreakdown || []).length > 0 && <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>{e.topicBreakdown.map((t) => `${t.topic} ${t.correct}/${t.total}`).join(" · ")}</div>}
                  </div>
                )}
              </div>
            )}

            {it.technical && (it.technical.decision || it.technical.avgScore !== null) && (it.technical.decision || it.technical.completedAt) && (
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <strong>Technical round result: {it.technical.avgScore ?? 0}%</strong> (pass mark {it.technical.cutoffPct || 60}%){" "}
                <Pill bg={it.technical.decision === "pass" ? "#DCFCE7" : "#FEE2E2"} color={it.technical.decision === "pass" ? "#166534" : "#B91C1C"}>{it.technical.decision === "pass" ? "Passed" : "Below cutoff"}</Pill>
                {(it.technical.scores || []).length > 0 && <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>{it.technical.scores.map((x) => `${x.member} ${x.pct}%`).join(" · ")}</div>}
              </div>
            )}

            {it.technical && it.stage === "technical" && !it.technical.decision && (
              <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 800, color: "#5B21B6" }}>Technical interview · {it.technical.panelName}</div>
                <InfoRows rows={[
                  ["Date & time", it.technical.scheduledAt ? fmtDate(it.technical.scheduledAt) : "To be confirmed - the company will update you"],
                  ["Mode", it.technical.mode === "virtual" ? "Virtual (video call)" : "In person / walk-in"],
                  it.technical.mode === "virtual" ? ["Meeting link", it.technical.meetingLink] : ["Location", it.technical.office || "Address will be shared by the company"],
                  ["Documents to carry", it.technical.documentsToCarry],
                  ["Instructions", it.technical.instructions],
                ]} />
                <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 6 }}>A confirmation with these details was also sent to your email.</div>
                {it.technical.interviewCompletedAt ? (
                  <div style={{ marginTop: 10 }}><Pill bg="#DCFCE7" color="#166534">✓ Completed Technical round</Pill><div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>The panel is reviewing your interview. Your result will appear here.</div></div>
                ) : it.technical.mode === "virtual" ? (
                  <div style={{ marginTop: 10 }}><a href={it.technical.meetingLink} target="_blank" rel="noreferrer" onClick={() => { api.post(`/candidate/hiring/technical/${it.id}/join`).then(load).catch(() => {}); }}><Btn kind="navy">Join video interview</Btn></a></div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "#475569", marginTop: 8 }}>
                    Your check-in code: <strong style={{ fontSize: 16, letterSpacing: 2 }}>{it.technical.checkinToken}</strong>
                    <div style={{ marginTop: 8 }}>{it.technical.checkedInAt ? <Pill bg="#DCFCE7" color="#166534">Checked in {fmtDate(it.technical.checkedInAt)}</Pill> : <Btn small kind="gold" onClick={() => checkin(it.technical.checkinToken)}>I&apos;ve arrived - check me in</Btn>}</div>
                  </div>
                )}
              </div>
            )}
            {it.stage === "technical" && !it.technical && <div style={{ fontSize: 12.5, color: "#475569" }}>You cleared Round 1. Your technical interview details will appear here soon.</div>}

            {it.stage === "hr" && (it.hrStatus?.interview ? (
              <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 800, color: "#5B21B6" }}>HR interview · {it.hrStatus.interview.typeLabel}</div>
                <InfoRows rows={[
                  ["Date & time", fmtDate(it.hrStatus.interview.scheduledAt)],
                  ["Mode", it.hrStatus.interview.modeLabel],
                  it.hrStatus.interview.mode === "virtual" ? ["Meeting link", it.hrStatus.interview.meetingLink] : null,
                  it.hrStatus.interview.mode === "telephonic" ? ["Phone", it.hrStatus.interview.phone || "The HR team will call you on your registered number"] : null,
                  it.hrStatus.interview.mode === "offline" ? ["Location", it.hrStatus.interview.office] : null,
                  it.hrStatus.interview.mode === "offline" ? ["Documents to carry", it.hrStatus.interview.documentsToCarry] : null,
                  ["Interviewer", it.hrStatus.hrName],
                ]} />
                {it.hrStatus.interview.mode === "virtual" && <div style={{ marginTop: 10 }}><a href={it.hrStatus.interview.meetingLink} target="_blank" rel="noreferrer"><Btn kind="navy">Join HR interview (camera on)</Btn></a></div>}
              </div>
            ) : <div style={{ fontSize: 12.5, color: "#475569" }}>HR round{it.hrStatus?.hrName ? ` with ${it.hrStatus.hrName}` : ""} - the HR team will share your interview date, time and mode shortly.</div>)}
            {it.stage === "approval" && <div style={{ fontSize: 12.5, color: "#475569" }}>Your profile is with management for final approval.{it.hrStatus?.bgv?.label ? <div style={{ marginTop: 6 }}><strong>Background verification:</strong> {it.hrStatus.bgv.label}</div> : null}</div>}
            {it.stage === "hold" && <div style={{ fontSize: 12.5, color: "#854D0E" }}>Your application is on hold for now. You'll be notified as soon as there is an update.</div>}

            {it.offer && (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 14, marginTop: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#166534" }}>🎉 Offer received</div>
                <div style={{ fontSize: 13, color: "#14532D", marginTop: 4 }}>{it.offer.role} · <strong>{it.offer.ctc} LPA</strong> · joining {fmtDay(it.offer.joinDate)} · probation {it.offer.probationMonths} month{it.offer.probationMonths === 1 ? "" : "s"}</div>
                {it.offer.status === "sent" ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}><Btn kind="green" onClick={() => respond(it.id, true)}>Accept offer</Btn><Btn kind="red" onClick={() => respond(it.id, false)}>Decline</Btn></div>
                ) : <div style={{ marginTop: 8 }}><Pill bg={it.offer.status === "accepted" ? "#DCFCE7" : "#FEE2E2"} color={it.offer.status === "accepted" ? "#166534" : "#B91C1C"}>You {it.offer.status} this offer</Pill></div>}
              </div>
            )}

            {it.stage === "rejected" && (
              <div style={{ fontSize: 12.5, color: "#475569" }}>You were not moved forward{it.rejection?.round ? ` after the ${it.rejection.round === "exam" ? "assessment" : it.rejection.round} round` : ""}. {it.rejection?.futurePool ? "Your profile stays in the company's talent pool for future openings." : ""}</div>
            )}
          </Card>
        );
        })}
      </>)}
    </div>
  );
}

// Label / value rows - empty values and null rows are skipped
function InfoRows({ rows }) {
  const list = rows.filter((r) => r && r[1]);
  return (
    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 14, rowGap: 5, fontSize: 13 }}>
      {list.map(([k, v]) => (
        <React.Fragment key={k}>
          <div style={{ color: "#64748B", fontWeight: 600 }}>{k}</div>
          <div style={{ color: "#0F172A", fontWeight: 600, wordBreak: "break-word" }}>{/^https?:\/\//.test(String(v)) ? <a href={v} target="_blank" rel="noreferrer" style={{ color: "#1D4ED8" }}>{v}</a> : v}</div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Proctored exam: webcam preview, tab-switch / paste detection, server-side timer, autosave.
// ---------------------------------------------------------------------------
function ExamRunner({ appId, onDone, toast }) {
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [cur, setCur] = useState(0);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [cam, setCam] = useState("pending"); // pending | on | denied
  const [warn, setWarn] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const answersRef = useRef({});
  const doneRef = useRef(false);
  const recRef = useRef(null);        // { rec, done } - the active MediaRecorder and a promise that resolves when it has flushed
  const segmentsRef = useRef([]);     // finished recording segments (a new one starts if the camera is switched back on)
  const [recStatus, setRecStatus] = useState("idle"); // idle | saving | saved | failed

  const flag = useCallback((type) => { api.post(`/candidate/hiring/exams/${appId}/flag`, { type }).catch(() => {}); }, [appId]);

  // Send the webcam recording to the employer (best effort - the answers are already saved by now)
  const uploadRecording = useCallback(async () => {
    const segs = segmentsRef.current.filter((b) => b && b.size > 0);
    if (segs.length === 0) { setRecStatus("idle"); return; }
    setRecStatus("saving");
    try {
      for (let i = 0; i < segs.length; i += 1) {
        const fd = new FormData();
        fd.append("video", segs[i], `assessment-${appId}-part${i + 1}.webm`);
        await api.post(`/candidate/hiring/exams/${appId}/recording?part=${i + 1}`, fd, { headers: { "Content-Type": "multipart/form-data" }, timeout: 300000 });
      }
      segmentsRef.current = [];
      setRecStatus("saved");
    } catch {
      setRecStatus("failed");
    }
  }, [appId]);

  const submit = useCallback(async (auto) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setSubmitting(true);
    try {
      const r = recRef.current;
      if (r && r.rec.state !== "inactive") { try { r.rec.stop(); } catch { /* already stopped */ } }
      if (r) await Promise.race([r.done, new Promise((res) => setTimeout(res, 3000))]);
      const res = await api.post(`/candidate/hiring/exams/${appId}/submit`, { answers: answersRef.current });
      setResult(res.data);
      if (auto) toast("Time is up - your answers were submitted.", "info");
      uploadRecording();
    } catch (e) {
      doneRef.current = false;
      toast(errMsg(e, "Could not submit. Try again."), "error");
    } finally {
      setSubmitting(false);
    }
  }, [appId]); // eslint-disable-line react-hooks/exhaustive-deps

  // The camera is mandatory: it must be on BEFORE the assessment (and its timer) starts, and stay on until submission.
  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      const lost = () => { if (!doneRef.current) { setCam("lost"); flag("camera_off"); } };
      stream.getVideoTracks().forEach((t) => { t.addEventListener("ended", lost); t.addEventListener("mute", lost); });
      setCam("on");
      return stream;
    } catch {
      setCam("denied");
      flag("webcam_denied");
      return null;
    }
  }, [flag]);

  const beginExam = useCallback(async () => {
    try {
      const res = await api.post(`/candidate/hiring/exams/${appId}/start`);
      setExam(res.data);
      answersRef.current = res.data.saved || {};
      setAnswers(res.data.saved || {});
      setLeft(Math.max(0, Math.floor((new Date(res.data.endsAt) - Date.now()) / 1000)));
    } catch (e) {
      toast(errMsg(e, "Could not start the assessment."), "error");
      onDone();
    }
  }, [appId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    (async () => {
      const stream = await openCamera();
      if (!alive) { if (stream) stream.getTracks().forEach((t) => t.stop()); return; }
      if (stream) beginExam();
    })();
    return () => { alive = false; if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };
  }, [appId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Retry after the camera was blocked / switched off
  const retryCamera = async () => {
    const stream = await openCamera();
    if (stream && !exam) beginExam();
  };

  // Record the webcam for the whole attempt (one segment per continuous camera session)
  useEffect(() => {
    if (!exam || cam !== "on" || result || typeof MediaRecorder === "undefined" || !streamRef.current) return undefined;
    let chunks = [];
    let rec;
    const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    try { rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType, videoBitsPerSecond: 250000 } : { videoBitsPerSecond: 250000 }); } catch { return undefined; }
    const done = new Promise((resolve) => {
      rec.onstop = () => {
        if (chunks.length) segmentsRef.current.push(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
        chunks = [];
        resolve();
      };
    });
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    rec.start(5000);
    recRef.current = { rec, done };
    return () => { try { if (rec.state !== "inactive") rec.stop(); } catch { /* already stopped */ } };
  }, [exam, cam, result]);

  useEffect(() => { if (cam === "on" && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current; }, [cam, exam, result]);

  // timer
  useEffect(() => {
    if (!exam || result) return undefined;
    const t = setInterval(() => {
      const s = Math.max(0, Math.floor((new Date(exam.endsAt) - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) submit(true);
    }, 1000);
    return () => clearInterval(t);
  }, [exam, result, submit]);

  // proctoring signals
  useEffect(() => {
    if (!exam || result) return undefined;
    const onHide = () => { if (document.hidden) { setWarn((w) => w + 1); flag("tab_switch"); } };
    const onPaste = (e) => { e.preventDefault(); flag("paste"); };
    const onCopy = (e) => { e.preventDefault(); flag("copy"); };
    document.addEventListener("visibilitychange", onHide);
    document.addEventListener("paste", onPaste);
    document.addEventListener("copy", onCopy);
    return () => { document.removeEventListener("visibilitychange", onHide); document.removeEventListener("paste", onPaste); document.removeEventListener("copy", onCopy); };
  }, [exam, result, flag]);

  // autosave
  const saveTimer = useRef(null);
  const pick = (qi, oi) => {
    const next = { ...answersRef.current, [qi]: oi };
    answersRef.current = next;
    setAnswers(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => api.post(`/candidate/hiring/exams/${appId}/save`, { answers: next }).catch(() => {}), 600);
  };

  const wrap = { position: "fixed", inset: 0, zIndex: 9000, background: "#F8FAFC", overflowY: "auto", padding: "20px 16px" };

  if (result) {
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 560, margin: "40px auto", background: "#fff", borderRadius: 14, padding: 28, textAlign: "center", border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 44 }}>{result.passed ? "🎯" : "📝"}</div>
          <h2 style={{ margin: "8px 0", fontSize: 24, fontWeight: 800 }}>Your score: {result.score}%</h2>
          <Pill bg={result.passed ? "#DCFCE7" : "#FEE2E2"} color={result.passed ? "#166534" : "#B91C1C"}>{result.passed ? `Passed - pass mark ${result.cutoffPct}%` : `Below the ${result.cutoffPct}% pass mark`}</Pill>
          <div style={{ fontSize: 13, color: "#475569", margin: "14px 0" }}>{result.correct} of {result.total} correct. {result.passed ? "You've moved to the technical round - details will appear in Hiring Rounds." : "Thank you for taking it. The company keeps your profile for future openings."}</div>
          <div style={{ textAlign: "left", margin: "10px auto", maxWidth: 360 }}>
            {(result.topicBreakdown || []).map((t) => (
              <div key={t.topic} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}><span>{t.topic}</span><span>{t.correct}/{t.total}</span></div>
                <div style={{ height: 6, background: "#E2E8F0", borderRadius: 4 }}><div style={{ height: 6, borderRadius: 4, width: `${t.total ? (t.correct / t.total) * 100 : 0}%`, background: "var(--gold)" }} /></div>
              </div>
            ))}
          </div>
          {recStatus === "saving" && <div style={{ fontSize: 12.5, color: "#1D4ED8", margin: "8px 0" }}>Saving your assessment recording… please keep this page open.</div>}
          {recStatus === "failed" && <div style={{ fontSize: 12.5, color: "#B91C1C", margin: "8px 0" }}>The recording could not be uploaded. <button type="button" onClick={uploadRecording} style={{ background: "none", border: "none", color: "#1D4ED8", fontWeight: 800, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Try again</button></div>}
          <Btn kind="navy" disabled={recStatus === "saving"} onClick={onDone}>Back to Hiring Rounds</Btn>
        </div>
      </div>
    );
  }
  if (!exam && cam === "denied") {
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 520, margin: "60px auto", background: "#fff", borderRadius: 14, padding: 28, textAlign: "center", border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 40 }}>📷</div>
          <h2 style={{ margin: "8px 0", fontSize: 20, fontWeight: 800 }}>Turn on your camera to start</h2>
          <div style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5, margin: "10px 0 18px" }}>This assessment is proctored. Your camera must stay on for the whole attempt and it is recorded for the employer. Allow camera access in your browser (the camera icon next to the address bar), then try again. Your timer has not started.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Btn kind="gold" onClick={retryCamera}>Turn on camera &amp; start</Btn>
            <Btn kind="ghost" onClick={onDone}>Back</Btn>
          </div>
        </div>
      </div>
    );
  }
  if (!exam) return <div style={wrap}><div style={{ padding: 60, textAlign: "center", color: "#64748B" }}>{cam === "pending" ? "Allow camera access to begin…" : "Preparing your assessment…"}</div></div>;

  const q = exam.questions[cur];
  const answered = Object.keys(answers).length;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{exam.title}</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>{answered}/{exam.questions.length} answered</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {cam === "on" ? <video ref={videoRef} autoPlay muted playsInline style={{ width: 96, height: 72, borderRadius: 8, background: "#0F172A", objectFit: "cover" }} /> : <Pill bg="#FEE2E2" color="#B91C1C">{cam === "on" ? "" : cam === "pending" ? "Starting webcam…" : "Camera off"}</Pill>}
            <div style={{ fontSize: 22, fontWeight: 800, color: left < 120 ? "#B91C1C" : "var(--navy)", fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</div>
          </div>
        </div>
        {cam === "on" && recStatus === "idle" && <div style={{ fontSize: 11.5, color: "#64748B", marginBottom: 8 }}>● Camera on - this attempt is recorded and shared with the employer.</div>}
        {cam === "lost" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9500, background: "rgba(15,23,42,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 26, maxWidth: 440, textAlign: "center" }}>
              <div style={{ fontSize: 38 }}>📷</div>
              <h3 style={{ margin: "6px 0", fontSize: 19, fontWeight: 800 }}>Your camera was turned off</h3>
              <div style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5, margin: "8px 0 16px" }}>The camera must stay on during the assessment. Turn it back on to continue - the timer keeps running, and the interruption is recorded for the employer.</div>
              <Btn kind="gold" onClick={retryCamera}>Turn camera back on</Btn>
            </div>
          </div>
        )}
        {warn > 0 && <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 10 }}>⚠ You left the assessment tab {warn} time{warn === 1 ? "" : "s"}. Every tab switch is recorded and shown to the employer.</div>}

        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", marginBottom: 6 }}>QUESTION {cur + 1} OF {exam.questions.length} · {q.topic}</div>
          <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.5, marginBottom: 14, userSelect: "none" }}>{q.question}</div>
          {q.options.map((o, i) => (
            <label key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", border: answers[cur] === i ? "2px solid var(--gold)" : "1px solid #CBD5E1", background: answers[cur] === i ? "#FFFBEB" : "#fff", borderRadius: 10, marginBottom: 8, cursor: "pointer", userSelect: "none" }}>
              <input type="radio" name={`q${cur}`} checked={answers[cur] === i} onChange={() => pick(cur, i)} style={{ marginTop: 3 }} />
              <span style={{ fontSize: 14 }}>{o}</span>
            </label>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 8 }}>
            <Btn kind="ghost" disabled={cur === 0} onClick={() => setCur((c) => c - 1)}>← Previous</Btn>
            {cur < exam.questions.length - 1
              ? <Btn kind="navy" onClick={() => setCur((c) => c + 1)}>Next →</Btn>
              : <Btn kind="gold" disabled={submitting} onClick={() => { if (answered < exam.questions.length && !window.confirm(`${exam.questions.length - answered} question(s) unanswered. Submit anyway?`)) return; submit(false); }}>Submit exam</Btn>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          {exam.questions.map((_, i) => (
            <button key={i} type="button" onClick={() => setCur(i)} style={{ width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", border: i === cur ? "2px solid var(--navy)" : "1px solid #CBD5E1", background: answers[i] !== undefined ? "#DCFCE7" : "#fff", color: "#0F172A" }}>{i + 1}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
