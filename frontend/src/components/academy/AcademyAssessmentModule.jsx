import React, { useState, useEffect, useCallback } from "react";

const card = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 };
const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff" };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };
const TYPE_LABEL = { mcq: "MCQ", fill_blank: "Fill in the blank", qa: "Q & A" };
const STATUS_STYLE = {
  draft: { bg: "#F1F5F9", fg: "#475569" },
  published: { bg: "#DCFCE7", fg: "#15803D" },
  closed: { bg: "#FEE2E2", fg: "#B91C1C" },
};

const blankQuestion = (type = "mcq") => ({ type, text: "", options: type === "mcq" ? ["", "", "", ""] : [], answer: type === "mcq" ? "0" : "", marks: 1 });
const blankForm = () => ({ id: null, title: "", course: "", batchCodes: [], instructions: "", durationMins: 30, passPercentage: 50, questions: [blankQuestion("mcq")] });

export default function AcademyAssessmentModule({ getAuthHeader, students = [], batches = [], onScoresChanged }) {
  const [tab, setTab] = useState("assessments"); // assessments | score_only
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [scoreOnlyEntries, setScoreOnlyEntries] = useState(0);
  const [form, setForm] = useState(null); // builder open when not null
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [resultsFor, setResultsFor] = useState(null); // { assessment, results }
  const [gradeDraft, setGradeDraft] = useState({});

  // score-only state
  const [manual, setManual] = useState({ candidateId: "", scorePct: "", assessmentTitle: "", conductedOn: "" });
  const [scoreFile, setScoreFile] = useState(null);
  const [scoreReport, setScoreReport] = useState(null);

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/academy/assessments", { headers: { ...getAuthHeader() } });
      const data = await res.json();
      if (res.ok) {
        setList(data.assessments || []);
        setScoreOnlyEntries(data.scoreOnlyEntries || 0);
      }
    } catch (e) {
      flash("Could not load assessments.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const call = async (url, method, body) => {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Something went wrong.");
    return data;
  };

  // ---------------- builder ----------------
  const setQ = (i, patch) => setForm((f) => ({ ...f, questions: f.questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)) }));
  const changeType = (i, type) => setQ(i, { ...blankQuestion(type), text: form.questions[i].text, marks: form.questions[i].marks });
  const setOption = (qi, oi, val) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, idx) => (idx === qi ? { ...q, options: q.options.map((o, k) => (k === oi ? val : o)) } : q)),
    }));

  const saveForm = async (status) => {
    setSaving(true);
    try {
      await call("/api/academy/assessments", "POST", { ...form, status: status || form.status || "draft" });
      flash(status === "published" ? "Assessment published - candidates can now take it." : "Assessment saved.");
      setForm(null);
      load();
    } catch (e) {
      flash(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const importQuestions = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/academy/assessments/import-questions", { method: "POST", headers: { ...getAuthHeader() }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Import failed.");
      if ((data.questions || []).length === 0) throw new Error((data.errors || [])[0] || "No valid questions found.");
      setForm((f) => ({ ...f, questions: [...(f.questions.length === 1 && !f.questions[0].text ? [] : f.questions), ...data.questions] }));
      flash(`${data.questions.length} questions imported${data.errors?.length ? ` (${data.errors.length} rows skipped: ${data.errors[0]})` : ""}.`);
    } catch (e) {
      flash(e.message, "error");
    }
  };

  const downloadQuestionTemplate = () => {
    const csv = [
      "type,question,option_a,option_b,option_c,option_d,correct_answer,marks",
      "mcq,Which code set is used for outpatient procedures?,ICD-10-CM,CPT,DRG,NDC,B,1",
      "fill_blank,The ___ form is used to submit professional claims.,,,,,CMS-1500,1",
      "qa,Explain the difference between a denial and a rejection.,,,,,Model answer for your reference,5",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "academy_question_bank_template.csv";
    a.click();
  };

  const editAssessment = (a) =>
    setForm({
      id: a._id,
      title: a.title,
      course: a.course || "",
      batchCodes: a.batchCodes || [],
      instructions: a.instructions || "",
      durationMins: a.durationMins,
      passPercentage: a.passPercentage,
      status: a.status,
      questions: (a.questions || []).map((q) => ({ type: q.type, text: q.text, options: q.type === "mcq" ? [...q.options, "", "", "", ""].slice(0, Math.max(4, q.options.length)) : [], answer: q.answer, marks: q.marks })),
    });

  const setStatus = async (a, status) => {
    try {
      await call(`/api/academy/assessments/${a._id}/status`, "PATCH", { status });
      flash(status === "published" ? "Published." : status === "closed" ? "Closed - no new attempts." : "Moved back to draft.");
      load();
    } catch (e) {
      flash(e.message, "error");
    }
  };

  const removeAssessment = async (a) => {
    if (!window.confirm(`Delete "${a.title}"? Results already recorded stay on the candidates.`)) return;
    try {
      await call(`/api/academy/assessments/${a._id}`, "DELETE");
      load();
    } catch (e) {
      flash(e.message, "error");
    }
  };

  const openResults = async (a) => {
    try {
      const data = await call(`/api/academy/assessments/${a._id}/results`, "GET");
      setResultsFor(data);
      setGradeDraft({});
    } catch (e) {
      flash(e.message, "error");
    }
  };

  const saveGrade = async (r) => {
    const marks = gradeDraft[r._id] || {};
    if (Object.keys(marks).length === 0) return;
    try {
      await call(`/api/academy/assessments/results/${r._id}/grade`, "POST", { marks });
      flash("Marks saved.");
      openResults({ _id: resultsFor.assessment._id });
      load();
      if (onScoresChanged) onScoresChanged();
    } catch (e) {
      flash(e.message, "error");
    }
  };

  // ---------------- score only ----------------
  const submitManual = async () => {
    try {
      await call("/api/academy/assessments/scores/manual", "POST", manual);
      flash("Score saved to the candidate's verification.");
      setManual({ candidateId: "", scorePct: "", assessmentTitle: "", conductedOn: "" });
      load();
      if (onScoresChanged) onScoresChanged();
    } catch (e) {
      flash(e.message, "error");
    }
  };

  const submitScoreFile = async () => {
    if (!scoreFile) return;
    const fd = new FormData();
    fd.append("file", scoreFile);
    try {
      const res = await fetch("/api/academy/assessments/scores/upload", { method: "POST", headers: { ...getAuthHeader() }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed.");
      setScoreReport(data);
      setScoreFile(null);
      flash(data.message);
      load();
      if (onScoresChanged) onScoresChanged();
    } catch (e) {
      flash(e.message, "error");
    }
  };

  const downloadScoreTemplate = () => {
    const csv = ["Email,Score,Assessment name,Date", "student@example.com,78,Mid-term coding test,2026-09-30", "another@example.com,42/50,Mid-term coding test,2026-09-30"].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "academy_scores_template.csv";
    a.click();
  };

  const btn = (kind) => ({
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    border: kind === "primary" ? "none" : "1px solid #CBD5E1",
    background: kind === "primary" ? "#06152A" : kind === "danger" ? "#FEF2F2" : "#fff",
    color: kind === "primary" ? "#E5A82E" : kind === "danger" ? "#B91C1C" : "#0F172A",
  });

  // ======================= RENDER =======================
  return (
    <div className="space-y-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Academy Assessment</h3>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, maxWidth: 640 }}>
            Build your own question bank and let your candidates take it on Talentera - or, if you already conducted the assessment, just enter the scores. Either way the result counts as Stage 4 of the verification tracker.
          </div>
        </div>
        {!form && !resultsFor && (
          <div style={{ display: "flex", gap: 8 }}>
            {["assessments", "score_only"].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ ...btn(tab === t ? "primary" : "ghost") }}>
                {t === "assessments" ? "Conduct on Talentera" : "Already conducted - update scores only"}
              </button>
            ))}
          </div>
        )}
      </div>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: msg.type === "error" ? "#FEF2F2" : "#F0FDF4", color: msg.type === "error" ? "#B91C1C" : "#15803D", border: `1px solid ${msg.type === "error" ? "#FECACA" : "#BBF7D0"}` }}>
          {msg.text}
        </div>
      )}

      {/* ---------- BUILDER ---------- */}
      {form && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#06152A" }}>{form.id ? "Edit assessment" : "New assessment"}</h4>
            <button style={btn("ghost")} onClick={() => setForm(null)}>Cancel</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Assessment title *</label>
              <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Medical Coding Mid-term" />
            </div>
            <div>
              <label style={labelStyle}>Course / specialty</label>
              <input style={inputStyle} value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="Medical Coding" />
            </div>
            <div>
              <label style={labelStyle}>Duration (mins)</label>
              <input style={inputStyle} type="number" min="5" value={form.durationMins} onChange={(e) => setForm({ ...form, durationMins: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Pass mark (%)</label>
              <input style={inputStyle} type="number" min="0" max="100" value={form.passPercentage} onChange={(e) => setForm({ ...form, passPercentage: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Instructions for candidates</label>
              <input style={inputStyle} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <label style={labelStyle}>Open to batches (leave empty = all your candidates)</label>
              <select
                multiple
                style={{ ...inputStyle, height: 38 }}
                value={form.batchCodes}
                onChange={(e) => setForm({ ...form, batchCodes: Array.from(e.target.selectedOptions).map((o) => o.value) })}
              >
                {batches.map((b) => (
                  <option key={b._id || b.code} value={b.code}>{b.code}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <strong style={{ fontSize: 13, color: "#06152A" }}>Questions ({form.questions.length})</strong>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={btn("ghost")} onClick={downloadQuestionTemplate}>CSV template</button>
              <label style={{ ...btn("ghost"), display: "inline-block" }}>
                Import question bank (CSV)
                <input type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => { importQuestions(e.target.files[0]); e.target.value = ""; }} />
              </label>
              {["mcq", "fill_blank", "qa"].map((t) => (
                <button key={t} style={btn("ghost")} onClick={() => setForm((f) => ({ ...f, questions: [...f.questions, blankQuestion(t)] }))}>
                  + {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {form.questions.map((q, i) => (
              <div key={i} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, background: "#F8FAFC" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#06152A", color: "#E5A82E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{i + 1}</span>
                  <select style={{ ...inputStyle, width: 170 }} value={q.type} onChange={(e) => changeType(i, e.target.value)}>
                    <option value="mcq">MCQ</option>
                    <option value="fill_blank">Fill in the blank</option>
                    <option value="qa">Q &amp; A</option>
                  </select>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>Marks</span>
                    <input style={{ ...inputStyle, width: 64 }} type="number" min="0" value={q.marks} onChange={(e) => setQ(i, { marks: e.target.value })} />
                  </div>
                  <button style={{ ...btn("danger"), marginLeft: "auto" }} onClick={() => setForm((f) => ({ ...f, questions: f.questions.filter((_, k) => k !== i) }))}>Remove</button>
                </div>
                <textarea style={{ ...inputStyle, minHeight: 56 }} value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} placeholder={q.type === "fill_blank" ? "Type the sentence - use ___ where the blank is" : "Type the question"} />
                {q.type === "mcq" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    {q.options.map((o, oi) => (
                      <label key={oi} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="radio" name={`correct-${i}`} checked={String(q.answer) === String(oi)} onChange={() => setQ(i, { answer: String(oi) })} title="Mark as correct" />
                        <input style={inputStyle} value={o} onChange={(e) => setOption(i, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                      </label>
                    ))}
                    <div style={{ fontSize: 11, color: "#64748B", gridColumn: "1 / -1" }}>Select the radio button next to the correct option.</div>
                  </div>
                )}
                {q.type === "fill_blank" && (
                  <div style={{ marginTop: 8 }}>
                    <label style={labelStyle}>Correct answer (separate accepted variants with |)</label>
                    <input style={inputStyle} value={q.answer} onChange={(e) => setQ(i, { answer: e.target.value })} placeholder="CMS-1500 | CMS 1500" />
                  </div>
                )}
                {q.type === "qa" && (
                  <div style={{ marginTop: 8 }}>
                    <label style={labelStyle}>Model answer (for your reference while marking)</label>
                    <textarea style={{ ...inputStyle, minHeight: 48 }} value={q.answer} onChange={(e) => setQ(i, { answer: e.target.value })} />
                    <div style={{ fontSize: 11, color: "#B45309", marginTop: 4 }}>Q &amp; A answers are marked by you after candidates submit.</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button style={btn("ghost")} disabled={saving} onClick={() => saveForm("draft")}>Save as draft</button>
            <button style={btn("primary")} disabled={saving} onClick={() => saveForm("published")}>{saving ? "Saving..." : "Save & publish"}</button>
          </div>
        </div>
      )}

      {/* ---------- RESULTS ---------- */}
      {!form && resultsFor && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#06152A" }}>Results - {resultsFor.assessment.title}</h4>
            <button style={btn("ghost")} onClick={() => setResultsFor(null)}>Back</button>
          </div>
          {resultsFor.results.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#64748B", fontSize: 12 }}>No candidate has attempted this assessment yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {resultsFor.results.map((r) => (
                <div key={r._id} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: 13 }}>{r.candidateName}</strong>
                      <div style={{ fontSize: 11, color: "#64748B" }}>{r.candidateEmail}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {r.status === "graded" ? (
                        <span style={{ fontWeight: 800, color: r.passed ? "#15803D" : "#B91C1C" }}>{r.scorePct}% - {r.passed ? "Passed" : "Below pass mark"}</span>
                      ) : (
                        <span style={{ fontWeight: 700, color: "#B45309" }}>Q &amp; A marking pending</span>
                      )}
                      <div style={{ fontSize: 11, color: "#64748B" }}>{r.rawScore} / {r.totalMarks} marks</div>
                    </div>
                  </div>
                  {r.status === "pending_review" && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      {(r.answers || []).filter((a) => a.type === "qa" && a.status === "pending_review").map((a) => {
                        const q = resultsFor.assessment.questions.find((x) => String(x._id) === String(a.questionId));
                        return (
                          <div key={a.questionId} style={{ background: "#FFFBEB", borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{q?.text}</div>
                            {q?.answer && <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Model answer: {q.answer}</div>}
                            <div style={{ fontSize: 12, margin: "6px 0", whiteSpace: "pre-wrap" }}>{a.response || "(no answer)"}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700 }}>Marks (max {a.maxMarks})</span>
                              <input
                                type="number"
                                min="0"
                                max={a.maxMarks}
                                style={{ ...inputStyle, width: 80 }}
                                value={gradeDraft[r._id]?.[a.questionId] ?? ""}
                                onChange={(e) => setGradeDraft((d) => ({ ...d, [r._id]: { ...(d[r._id] || {}), [a.questionId]: e.target.value } }))}
                              />
                            </div>
                          </div>
                        );
                      })}
                      <div><button style={btn("primary")} onClick={() => saveGrade(r)}>Save marks</button></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- LIST ---------- */}
      {!form && !resultsFor && tab === "assessments" && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#06152A" }}>Your assessments ({list.length})</h4>
            <button style={btn("primary")} onClick={() => setForm(blankForm())}>+ New assessment</button>
          </div>
          {loading ? (
            <div style={{ padding: 20, color: "#64748B", fontSize: 12 }}>Loading...</div>
          ) : list.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "#64748B", fontSize: 12 }}>
              No assessments yet. Create one with MCQ, fill in the blank or Q &amp; A questions - type them in or import your own question bank from a CSV.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {list.map((a) => {
                const st = STATUS_STYLE[a.status] || STATUS_STYLE.draft;
                return (
                  <div key={a._id} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 14, color: "#06152A" }}>{a.title}</strong>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: st.bg, color: st.fg, textTransform: "uppercase" }}>{a.status}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>
                        {a.questionCount} questions · {a.totalMarks} marks · {a.durationMins} mins · pass {a.passPercentage}% · {a.attempts} attempt{a.attempts === 1 ? "" : "s"}
                        {a.avgScore !== null && ` · avg ${a.avgScore}%`}
                        {a.pendingReview > 0 && ` · ${a.pendingReview} awaiting your marking`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button style={btn("ghost")} onClick={() => openResults(a)}>Results</button>
                      <button style={btn("ghost")} onClick={() => editAssessment(a)}>Edit</button>
                      {a.status !== "published" && <button style={btn("ghost")} onClick={() => setStatus(a, "published")}>Publish</button>}
                      {a.status === "published" && <button style={btn("ghost")} onClick={() => setStatus(a, "closed")}>Close</button>}
                      <button style={btn("danger")} onClick={() => removeAssessment(a)}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------- SCORE ONLY ---------- */}
      {!form && !resultsFor && tab === "score_only" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div style={card}>
            <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#06152A" }}>One student</h4>
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>Already conducted the assessment yourself? Enter just the score.</div>
            <label style={labelStyle}>Student</label>
            <select style={{ ...inputStyle, marginBottom: 10 }} value={manual.candidateId} onChange={(e) => setManual({ ...manual, candidateId: e.target.value })}>
              <option value="">Select a student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name} - {s.email}</option>
              ))}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Score (0-100) *</label>
                <input style={inputStyle} type="number" min="0" max="100" value={manual.scorePct} onChange={(e) => setManual({ ...manual, scorePct: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Date conducted</label>
                <input style={inputStyle} type="date" value={manual.conductedOn} onChange={(e) => setManual({ ...manual, conductedOn: e.target.value })} />
              </div>
            </div>
            <label style={labelStyle}>Assessment name</label>
            <input style={{ ...inputStyle, marginBottom: 12 }} value={manual.assessmentTitle} onChange={(e) => setManual({ ...manual, assessmentTitle: e.target.value })} placeholder="Optional" />
            <button style={btn("primary")} disabled={!manual.candidateId || manual.scorePct === ""} onClick={submitManual}>Save score</button>
          </div>

          <div style={card}>
            <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#06152A" }}>Many students (CSV)</h4>
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>Columns: Email, Score (e.g. 78 or 42/50), Assessment name, Date. Matched by the student&apos;s email.</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <button style={btn("ghost")} onClick={downloadScoreTemplate}>Download template</button>
              <input type="file" accept=".csv" onChange={(e) => setScoreFile(e.target.files[0] || null)} style={{ fontSize: 12 }} />
            </div>
            <button style={btn("primary")} disabled={!scoreFile} onClick={submitScoreFile}>Upload scores</button>
            {scoreReport && (
              <div style={{ marginTop: 12, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: "#15803D" }}>{scoreReport.message}</div>
                {(scoreReport.issues || []).slice(0, 8).map((is, k) => (
                  <div key={k} style={{ color: "#B91C1C", marginTop: 2 }}>Row {is.row}{is.email ? ` (${is.email})` : ""}: {is.error}</div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 14, fontSize: 11, color: "#64748B" }}>{scoreOnlyEntries} score-only entr{scoreOnlyEntries === 1 ? "y" : "ies"} recorded so far.</div>
          </div>
        </div>
      )}
    </div>
  );
}
