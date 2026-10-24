import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/client";
import { Card, Btn, Pill, StageBadge, Modal, fmtDate, fmtDay } from "./hiring/hiringUi.jsx";

const STEPS = [["exam", "Exam"], ["technical", "Technical"], ["hr", "HR round"], ["approval", "Approval"], ["offered", "Offer"]];
const stepIndex = (stage) => Math.max(0, STEPS.findIndex(([k]) => k === (stage === "hold" ? "approval" : stage)));
const errMsg = (e, d) => e?.response?.data?.message || d;

export default function CandidateHiringSection({ triggerToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taking, setTaking] = useState(null); // application id of the exam being taken
  const toast = (m, t = "success") => (triggerToast ? triggerToast(m, t) : window.alert(m));

  const load = useCallback(async () => {
    try {
      const res = await api.get("/candidate/hiring");
      setItems(res.data?.items || []);
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

  return (
    <div style={{ padding: 4 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "var(--navy)" }}>Hiring Rounds</h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748B" }}>Your exams, interviews and offers from companies, all in one place.</p>
      {loading ? <div style={{ padding: 30, color: "#64748B" }}>Loading…</div> : items.length === 0 ? (
        <Card><div style={{ textAlign: "center", padding: 24, color: "#64748B" }}>No hiring rounds yet. When a company moves your application forward, your exam, interview and offer will show up here.</div></Card>
      ) : items.map((it) => {
        const idx = stepIndex(it.stage);
        const e = it.exam;
        const expired = e && e.expiresAt && new Date(e.expiresAt) < new Date() && !e.startedAt && !e.completedAt;
        const external = e && (e.source === "manual" || e.source === "integration" || String(e.source).startsWith("integration"));
        return (
          <Card key={it.id} title={`${it.role} · ${it.company}`} right={<StageBadge stage={it.stage} />}>
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
                  <div style={{ fontSize: 12.5, color: "#475569", marginTop: 4 }}>This exam is taken outside Talentera - {it.company} will share how. Your result will appear here.</div>
                ) : expired ? (
                  <div style={{ fontSize: 12.5, color: "#B91C1C", marginTop: 4 }}>This exam link expired. Ask {it.company} to allocate it again.</div>
                ) : (
                  <>
                    <div style={{ fontSize: 12.5, color: "#475569", margin: "4px 0 10px" }}>{e.durationMin} minutes · webcam on · one attempt · pass mark {e.cutoffPct}% · {e.startedAt ? "in progress - you can resume" : `complete before ${fmtDate(e.expiresAt)}`}</div>
                    <Btn kind="gold" onClick={() => setTaking(it.id)}>{e.startedAt ? "Resume exam" : "Start exam"}</Btn>
                  </>
                )}
              </div>
            )}

            {e && e.completedAt && (
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <strong>Exam result: {e.score}%</strong> (pass mark {e.cutoffPct}%) <Pill bg={e.passed ? "#DCFCE7" : "#FEE2E2"} color={e.passed ? "#166534" : "#B91C1C"}>{e.passed ? "Passed" : "Below cutoff"}</Pill>
                {(e.topicBreakdown || []).length > 0 && <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>{e.topicBreakdown.map((t) => `${t.topic} ${t.correct}/${t.total}`).join(" · ")}</div>}
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
                {it.technical.scheduledAt && <div style={{ fontSize: 12.5, color: "#475569", marginTop: 4 }}>When: {fmtDate(it.technical.scheduledAt)}</div>}
                {it.technical.mode === "virtual" ? (
                  <div style={{ marginTop: 8 }}><a href={it.technical.meetingLink} target="_blank" rel="noreferrer"><Btn kind="navy">Join video interview</Btn></a></div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "#475569", marginTop: 6 }}>
                    Walk in{it.technical.office ? ` at ${it.technical.office}` : ""}. Your check-in code: <strong style={{ fontSize: 16, letterSpacing: 2 }}>{it.technical.checkinToken}</strong>
                    <div style={{ marginTop: 8 }}>{it.technical.checkedInAt ? <Pill bg="#DCFCE7" color="#166534">Checked in {fmtDate(it.technical.checkedInAt)}</Pill> : <Btn small kind="gold" onClick={() => checkin(it.technical.checkinToken)}>I've arrived - check me in</Btn>}</div>
                  </div>
                )}
              </div>
            )}
            {it.stage === "technical" && !it.technical && <div style={{ fontSize: 12.5, color: "#475569" }}>You cleared Round 1. Your technical interview details will appear here soon.</div>}

            {it.stage === "hr" && <div style={{ fontSize: 12.5, color: "#475569" }}>HR round{it.hrStatus?.hrName ? ` with ${it.hrStatus.hrName}` : ""} - the HR team will contact you shortly.</div>}
            {it.stage === "approval" && <div style={{ fontSize: 12.5, color: "#475569" }}>Your profile is with management for final approval.</div>}
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
              <div style={{ fontSize: 12.5, color: "#475569" }}>You were not moved forward{it.rejection?.round ? ` after the ${it.rejection.round === "exam" ? "exam" : it.rejection.round} round` : ""}. {it.rejection?.futurePool ? "Your profile stays in the company's talent pool for future openings." : ""}</div>
            )}
          </Card>
        );
      })}
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

  const flag = useCallback((type) => { api.post(`/candidate/hiring/exams/${appId}/flag`, { type }).catch(() => {}); }, [appId]);

  const submit = useCallback(async (auto) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setSubmitting(true);
    try {
      const res = await api.post(`/candidate/hiring/exams/${appId}/submit`, { answers: answersRef.current });
      setResult(res.data);
      if (auto) toast("Time is up - your answers were submitted.", "info");
    } catch (e) {
      doneRef.current = false;
      toast(errMsg(e, "Could not submit. Try again."), "error");
    } finally {
      setSubmitting(false);
    }
  }, [appId]); // eslint-disable-line react-hooks/exhaustive-deps

  // start exam + webcam
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.post(`/candidate/hiring/exams/${appId}/start`);
        if (!alive) return;
        setExam(res.data);
        answersRef.current = res.data.saved || {};
        setAnswers(res.data.saved || {});
        setLeft(Math.max(0, Math.floor((new Date(res.data.endsAt) - Date.now()) / 1000)));
      } catch (e) {
        toast(errMsg(e, "Could not start the exam."), "error");
        onDone();
      }
    })();
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        setCam("on");
      } catch {
        setCam("denied");
        flag("webcam_denied");
      }
    })();
    return () => { alive = false; if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };
  }, [appId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <Btn kind="navy" onClick={onDone}>Back to Hiring Rounds</Btn>
        </div>
      </div>
    );
  }
  if (!exam) return <div style={wrap}><div style={{ padding: 60, textAlign: "center", color: "#64748B" }}>Preparing your exam…</div></div>;

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
            {cam === "on" ? <video ref={videoRef} autoPlay muted playsInline style={{ width: 96, height: 72, borderRadius: 8, background: "#0F172A", objectFit: "cover" }} /> : <Pill bg="#FEE2E2" color="#B91C1C">{cam === "denied" ? "Webcam blocked" : "Starting webcam…"}</Pill>}
            <div style={{ fontSize: 22, fontWeight: 800, color: left < 120 ? "#B91C1C" : "var(--navy)", fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</div>
          </div>
        </div>
        {cam === "denied" && <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 10 }}>Webcam access was blocked. The exam continues but this is recorded for the employer. Allow the camera in your browser to avoid a flag.</div>}
        {warn > 0 && <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 10 }}>⚠ You left the exam tab {warn} time{warn === 1 ? "" : "s"}. Every tab switch is recorded and shown to the employer.</div>}

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
