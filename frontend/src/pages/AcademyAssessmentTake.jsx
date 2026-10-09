import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const wrap = { maxWidth: 820, margin: "0 auto", padding: "24px 16px" };
const card = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, marginBottom: 12 };
const inputStyle = { width: "100%", padding: "9px 11px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };

export default function AcademyAssessmentTake() {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [hasAcademy, setHasAcademy] = useState(true);
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState("");
  const submitRef = useRef(null);

  const loadList = async () => {
    try {
      const res = await api.get("/candidate/academy-assessments");
      setList(res.data.assessments || []);
      setHasAcademy(res.data.hasAcademy !== false);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load your academy assessments.");
      setList([]);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const start = async (id) => {
    setError("");
    try {
      const res = await api.get(`/candidate/academy-assessments/${id}`);
      setPaper(res.data.assessment);
      setAnswers({});
      setSecondsLeft(res.data.assessment.durationMins * 60);
    } catch (e) {
      setError(e.response?.data?.message || "Could not open the assessment.");
      loadList();
    }
  };

  const submit = async () => {
    if (!paper || submitting) return;
    setSubmitting(true);
    try {
      const payload = paper.questions.map((q) => ({ questionId: q._id, response: answers[q._id] ?? "" }));
      const res = await api.post(`/candidate/academy-assessments/${paper._id}/submit`, { answers: payload });
      setOutcome(res.data);
      setPaper(null);
      loadList();
    } catch (e) {
      setError(e.response?.data?.message || "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  submitRef.current = submit;

  useEffect(() => {
    if (!paper) return undefined;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          if (submitRef.current) submitRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [paper]);

  const answeredCount = useMemo(() => (paper ? paper.questions.filter((q) => String(answers[q._id] ?? "").trim() !== "").length : 0), [paper, answers]);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  if (paper) {
    return (
      <div style={wrap}>
        <div style={{ position: "sticky", top: 0, background: "#06152A", color: "#fff", borderRadius: 10, padding: "10px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 5 }}>
          <strong>{paper.title}</strong>
          <span style={{ fontWeight: 800, color: secondsLeft < 60 ? "#FCA5A5" : "#E5A82E" }}>{mm}:{ss}</span>
        </div>
        {paper.instructions && <div style={{ ...card, background: "#FFFBEB", fontSize: 13 }}>{paper.instructions}</div>}
        {paper.questions.map((q, i) => (
          <div key={q._id} style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
              {i + 1}. {q.text} <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>({q.marks} mark{q.marks === 1 ? "" : "s"})</span>
            </div>
            {q.type === "mcq" && q.options.map((o, oi) => (
              <label key={oi} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 14 }}>
                <input type="radio" name={`q-${q._id}`} checked={String(answers[q._id]) === String(oi)} onChange={() => setAnswers({ ...answers, [q._id]: String(oi) })} />
                {o}
              </label>
            ))}
            {q.type === "fill_blank" && (
              <input style={inputStyle} value={answers[q._id] || ""} onChange={(e) => setAnswers({ ...answers, [q._id]: e.target.value })} placeholder="Type your answer" />
            )}
            {q.type === "qa" && (
              <textarea style={{ ...inputStyle, minHeight: 110 }} value={answers[q._id] || ""} onChange={(e) => setAnswers({ ...answers, [q._id]: e.target.value })} placeholder="Write your answer" />
            )}
          </div>
        ))}
        {error && <div style={{ color: "#B91C1C", fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#64748B" }}>{answeredCount} of {paper.questions.length} answered</span>
          <button
            disabled={submitting}
            onClick={() => { if (window.confirm("Submit your answers? You cannot retake this assessment.")) submit(); }}
            style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: "#06152A", color: "#E5A82E", fontWeight: 800, cursor: "pointer" }}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <button onClick={() => navigate("/dashboard")} style={{ border: "none", background: "none", color: "#2563EB", fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>&larr; Back to dashboard</button>
      <h2 style={{ margin: "0 0 4px", color: "#06152A" }}>Academy Assessments</h2>
      <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>Tests set by your own academy. Each can be taken once, and your score is added to your Talentera verification.</div>

      {outcome && (
        <div style={{ ...card, background: "#F0FDF4", borderColor: "#BBF7D0" }}>
          <strong style={{ color: "#15803D" }}>{outcome.message}</strong>
          {outcome.scorePct !== null && outcome.scorePct !== undefined && (
            <div style={{ marginTop: 6, fontSize: 14 }}>Your score: <strong>{outcome.scorePct}%</strong> {outcome.passed ? "- Passed" : "- Below the pass mark"}</div>
          )}
        </div>
      )}
      {error && <div style={{ ...card, background: "#FEF2F2", color: "#B91C1C", borderColor: "#FECACA" }}>{error}</div>}

      {list === null ? (
        <div style={{ color: "#64748B" }}>Loading...</div>
      ) : list.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "#64748B", fontSize: 13 }}>
          {hasAcademy ? "Your academy has not published any assessment for you yet." : "You are not linked to an academy yet, so there are no academy assessments."}
        </div>
      ) : (
        list.map((a) => (
          <div key={a._id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong style={{ fontSize: 15, color: "#06152A" }}>{a.title}</strong>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                {a.questionCount} questions · {a.totalMarks} marks · {a.durationMins} mins · pass {a.passPercentage}%
              </div>
            </div>
            {a.attempt ? (
              <span style={{ fontSize: 13, fontWeight: 800, color: a.attempt.status === "graded" ? "#15803D" : "#B45309" }}>
                {a.attempt.status === "graded" ? `Done - ${a.attempt.scorePct}%` : "Submitted - awaiting marking"}
              </span>
            ) : (
              <button onClick={() => start(a._id)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#06152A", color: "#E5A82E", fontWeight: 800, cursor: "pointer" }}>
                Start
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
