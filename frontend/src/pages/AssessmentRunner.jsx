import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useToast } from "../components/Toast.jsx";

const QUESTIONS = [
  {
    id: 1,
    topic: "ICD-10-CM Sequencing",
    question: "In ICD-10-CM guidelines, when a patient presents with an underlying etiology and a secondary manifestation, how must they be sequenced?",
    options: [
      "The secondary manifestation code first",
      "The underlying etiology / primary condition code first",
      "Either code in any order",
      "A Z-code screening code first",
    ],
    correct: 1,
    explanation: "ICD-10-CM Official Guidelines require the underlying condition (etiology) to be sequenced first, followed by the manifestation code.",
  },
  {
    id: 2,
    topic: "CPT Modifiers",
    question: "Which CPT modifier indicates a significant, separately identifiable evaluation and management (E/M) service on the same day as a procedure?",
    options: [
      "Modifier -59 (Distinct Procedural Service)",
      "Modifier -25 (Significant Separately Identifiable E/M Service)",
      "Modifier -51 (Multiple Procedures)",
      "Modifier -22 (Increased Procedural Services)",
    ],
    correct: 1,
    explanation: "Modifier -25 is appended to E/M codes to indicate that the patient's condition required a significant, separately identifiable service on the same day as a procedure.",
  },
  {
    id: 3,
    topic: "E/M Guidelines",
    question: "Under 2023 AMA E/M guidelines, outpatient E/M code selection (99202–99215) is based on Medical Decision Making (MDM) OR which of the following?",
    options: [
      "Total time spent on the date of the encounter",
      "Number of physical exam body systems documented",
      "Chief Complaint character length",
      "Past, Family, and Social History (PFSH) bullet count",
    ],
    correct: 0,
    explanation: "Under revised E/M guidelines, code selection is based solely on Medical Decision Making (MDM) OR total time on the date of encounter.",
  },
  {
    id: 4,
    topic: "HCC Risk Adjustment",
    question: "In Risk Adjustment (HCC Coding), what does the acronym 'MEAT' stand for to substantiate chronic condition documentation?",
    options: [
      "Monitor, Evaluate, Assess, Treat",
      "Measure, Examine, Audit, Test",
      "Medical, Environmental, Acute, Triage",
      "Manage, Execute, Authorize, Transfer",
    ],
    correct: 0,
    explanation: "MEAT (Monitor, Evaluate, Assess, Treat) is the gold standard documentation framework required by CMS to support HCC chronic disease risk scores.",
  },
  {
    id: 5,
    topic: "CPT Surgery Coding",
    question: "When multiple surgical procedures are performed during the same operative session, which modifier is appended to secondary procedures?",
    options: [
      "Modifier -51 (Multiple Procedures)",
      "Modifier -25",
      "Modifier -76",
      "Modifier -GA",
    ],
    correct: 0,
    explanation: "Modifier -51 communicates that multiple procedures were performed during the same session, allowing standard fee schedule reductions.",
  },
  {
    id: 6,
    topic: "Denial Management",
    question: "A claim denied with ANSI Remark Code CO-45 ('Charge exceeds fee schedule / maximum allowable amount') indicates which of the following?",
    options: [
      "Contractual adjustment between provider and payer fee schedule",
      "Patient identity fraud flag",
      "Duplicate claim submission",
      "Timely filing limit expired",
    ],
    correct: 0,
    explanation: "CO-45 represents the contractual write-off / adjustment amount between the contracted provider rate and original billed charge.",
  },
  {
    id: 7,
    topic: "ICD-10-CM Chronic Conditions",
    question: "When documentation indicates both Hypertension and Chronic Kidney Disease (CKD), ICD-10-CM presumes a cause-and-effect relationship coded under which category?",
    options: [
      "I10 (Essential hypertension)",
      "I12 (Hypertensive chronic kidney disease)",
      "N18 (Chronic kidney disease only)",
      "I15 (Secondary hypertension)",
    ],
    correct: 1,
    explanation: "ICD-10-CM presumes a causal relationship between Hypertension and CKD, requiring combination codes under category I12.",
  },
  {
    id: 8,
    topic: "RCM Front-End",
    question: "What is the primary purpose of a Pre-Authorization (Prior Auth) in the Revenue Cycle Management workflow?",
    options: [
      "To verify insurance coverage and secure payer authorization before non-emergency procedures",
      "To post patient co-pays to the billing ledger",
      "To submit medical records during audit appeals",
      "To calculate timely filing deadlines",
    ],
    correct: 0,
    explanation: "Pre-authorization verifies coverage rules and pre-approves medical necessity before treatment to prevent initial claim rejections.",
  },
  {
    id: 9,
    topic: "NCCI Edits & Compliance",
    question: "What is the purpose of CMS National Correct Coding Initiative (NCCI) PTP (Procedure-to-Procedure) edits?",
    options: [
      "To prevent improper payment when incorrect code combinations are reported together",
      "To increase hospital inpatient reimbursement rates",
      "To calculate physician RVU units",
      "To format EDI 837 claim files",
    ],
    correct: 0,
    explanation: "NCCI PTP edits prevent unbundling by flagging code pairs that should not be billed together unless a valid modifier is justified.",
  },
  {
    id: 10,
    topic: "AR Calling & Timely Filing",
    question: "What is the standard Medicare Fee-For-Service (FFS) timely filing limit for submitting clean claims from the date of service?",
    options: [
      "30 days",
      "90 days",
      "1 calendar year (12 months)",
      "3 years",
    ],
    correct: 2,
    explanation: "Medicare FFS claims must be submitted within 1 calendar year (12 months) from the date of service to avoid timely filing denials.",
  },
];

export default function AssessmentRunner() {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [testState, setTestState] = useState("running"); // "running" | "result" | "locked"
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins (900s)
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calculatedScore, setCalculatedScore] = useState(0);
  const [resultDetails, setResultDetails] = useState({ correctCount: null, totalQuestions: null });
  const isSubmittingRef = useRef(false);

  // Load candidate profile
  useEffect(() => {
    api.get("/candidate/me")
      .then((res) => {
        setProfile(res.data);
        const stage4Data = res.data.candidate?.stage4;
        if (stage4Data && stage4Data.foundationScore !== undefined) {
          setCalculatedScore(stage4Data.foundationScore);
          setResultDetails({
            correctCount: typeof stage4Data.correctCount === "number" ? stage4Data.correctCount : null,
            totalQuestions: typeof stage4Data.totalQuestions === "number" ? stage4Data.totalQuestions : null,
          });
          setTestState("locked");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (testState === "running" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            triggerSubmit(false, "Time Limit Expired");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [testState, timeLeft]);

  // Proctored Anti-Cheat: Tab Switch & Window Focus Loss Detection
  useEffect(() => {
    if (testState !== "running") return;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden" && testState === "running" && !isSubmittingRef.current) {
        toast("⚠️ Tab Switch Detected: Test auto-submitted for anti-cheat compliance.", "!");
        triggerSubmit(true, "Tab Switch / Hidden Browser Tab Detected");
      }
    }

    function handleWindowBlur() {
      if (testState === "running" && !isSubmittingRef.current) {
        toast("⚠️ Window Focus Lost: Test auto-submitted for anti-cheat compliance.", "!");
        triggerSubmit(true, "Window Focus Loss / Browser Minimization");
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [testState, userAnswers]);

  function handleSelectOption(qId, optionIdx) {
    if (testState !== "running") return;
    setUserAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  }

  async function triggerSubmit(wasAutoSubmit = false, reason = "") {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    let correctCount = 0;
    const answerDetails = QUESTIONS.map((q) => {
      const selectedIdx = userAnswers[q.id];
      const isCorrect = selectedIdx === q.correct;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        topic: q.topic,
        question: q.question,
        options: q.options,
        selectedOption: selectedIdx !== undefined ? selectedIdx : null,
        selectedAnswerText: selectedIdx !== undefined ? q.options[selectedIdx] : null,
        correctOption: q.correct,
        correctAnswerText: q.options[q.correct],
        isCorrect,
      };
    });

    const scorePercent = Math.round((correctCount / QUESTIONS.length) * 100);
    setCalculatedScore(scorePercent);
    setResultDetails({ correctCount, totalQuestions: QUESTIONS.length });
    setAutoSubmitted(wasAutoSubmit);
    setTestState("result");
    setSaving(true);

    try {
      const payload = {
        foundationScore: scorePercent,
        specialtyScore: Math.min(100, scorePercent + 4),
        score: scorePercent,
        icdScore: userAnswers[1] === 1 && userAnswers[7] === 1 ? 100 : 50,
        cptScore: userAnswers[2] === 1 && userAnswers[5] === 0 ? 100 : 50,
        rafScore: userAnswers[4] === 0 ? 100 : 50,
        assessmentType: "AAPC / RCM 10-Q Proctored Assessment",
        topic: "Medical Coding & RCM Domain Competency",
        autoSubmittedReason: reason || null,
        completedAt: new Date(),
        answers: answerDetails,
        correctCount,
        totalQuestions: QUESTIONS.length,
      };

      await api.put("/candidate/stage/4", payload);
      toast("Assessment Submitted! Thank you for completing the test.", "✓");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading Proctored Test Environment...</div>;
  }

  // Locked Screen (If candidate already took the test)
  if (testState === "locked") {
    return (
      <div style={{ minHeight: "100vh", background: "#F1F5F9", padding: 32 }}>
        <div style={{ maxWidth: 700, margin: "40px auto", background: "#fff", border: "2px solid var(--navy)", borderRadius: 16, padding: 32, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEF3C7", color: "#B45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>
            🔒
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>Assessment Completed &amp; Locked</h2>

          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", margin: "12px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: 0.5 }}>YOUR SCORE</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: "var(--navy)" }}>{calculatedScore}%</div>
            {resultDetails.correctCount !== null && resultDetails.totalQuestions ? (
              <div style={{ fontSize: 13, color: "#64748B" }}>{resultDetails.correctCount} of {resultDetails.totalQuestions} correct</div>
            ) : null}
          </div>

          <p style={{ fontSize: 14, color: "#64748B", margin: "8px 0 20px" }}>
            Single-Attempt Policy Enforced: Your responses have been recorded and locked, and this score is final. Retaking the assessment is not permitted.
          </p>
          <button type="button" className="btn btn-gold" onClick={() => navigate("/dashboard")}>
            Return to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[currentIdx];
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0A1F3D", color: "#fff", padding: "24px 16px" }}>
      {/* Header Bar */}
      <header style={{ maxWidth: 900, margin: "0 auto 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ background: "var(--gold)", color: "var(--navy)", fontWeight: 800, fontSize: 11, padding: "3px 10px", borderRadius: 999 }}>
            TALENTERA PROCTORED TEST
          </span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Anti-Cheat Environment Active</span>
        </div>

        {testState === "running" && (
          <div style={{ background: timeLeft < 120 ? "#DC2626" : "#F59E0B", color: "#fff", padding: "6px 16px", borderRadius: 999, fontWeight: 800, fontSize: 15 }}>
            <i className="fa-solid fa-clock" style={{ marginRight: 6 }}></i> {formatTime(timeLeft)}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Anti-Cheat Notice Banner */}
        {testState === "running" && (
          <div style={{ background: "rgba(229,168,46,0.15)", border: "1px solid var(--gold)", color: "var(--gold)", padding: "10px 16px", borderRadius: 8, fontSize: 12, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span><strong>Anti-Cheat Active:</strong> Switching browser tabs or exiting this window will automatically submit your assessment test immediately.</span>
          </div>
        )}

        {/* RUNNING QUESTION SCREEN */}
        {testState === "running" && (
          <div style={{ background: "#fff", color: "var(--navy)", borderRadius: 16, padding: 32, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)" }}>QUESTION {currentIdx + 1} OF {QUESTIONS.length}</span>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Topic: {q.topic}</div>
              </div>
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>{answeredCount} of {QUESTIONS.length} Answered</span>
            </div>

            {/* Progress Bar */}
            <div style={{ width: "100%", height: 6, background: "#E2E8F0", borderRadius: 999, marginBottom: 24, overflow: "hidden" }}>
              <div style={{ width: `${((currentIdx + 1) / QUESTIONS.length) * 100}%`, height: "100%", background: "var(--navy)", transition: "width 0.3s" }}></div>
            </div>

            {/* Question Text */}
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", lineHeight: 1.5, marginBottom: 24 }}>
              {currentIdx + 1}. {q.question}
            </h3>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {q.options.map((opt, optIdx) => {
                const isSelected = userAnswers[q.id] === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(q.id, optIdx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 20px",
                      borderRadius: 10,
                      border: isSelected ? "2px solid var(--navy)" : "1px solid #CBD5E1",
                      background: isSelected ? "rgba(10,31,61,0.06)" : "#FAF7F0",
                      color: "var(--navy)",
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: 14,
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ width: 30, height: 30, borderRadius: "50%", background: isSelected ? "var(--navy)" : "#fff", color: isSelected ? "#fff" : "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, border: "1px solid #CBD5E1" }}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation Footer */}
            {(() => {
              const isCurrentAnswered = userAnswers[q.id] !== undefined;
              return (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  >
                    ← Previous
                  </button>

                  {!isCurrentAnswered ? (
                    <div style={{ fontSize: 12, color: "#B45309", fontWeight: 700, background: "#FEF3C7", border: "1px solid #F59E0B", padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <i className="fa-solid fa-hand-pointer"></i> Select an answer above to unlock Next Question
                    </div>
                  ) : currentIdx < QUESTIONS.length - 1 ? (
                    <button
                      type="button"
                      className="btn btn-gold"
                      onClick={() => setCurrentIdx((i) => Math.min(QUESTIONS.length - 1, i + 1))}
                    >
                      Next Question →
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-gold"
                      style={{ background: "#15803D", borderColor: "#15803D" }}
                      onClick={() => triggerSubmit(false, "Completed normally")}
                    >
                      Submit Test &amp; View Score →
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* POST-SUBMISSION CONFIRMATION */}
        {testState === "result" && (
          <div style={{ background: "#fff", color: "var(--navy)", borderRadius: 16, padding: 40, boxShadow: "0 20px 40px rgba(0,0,0,0.3)", textAlign: "center" }}>
            {autoSubmitted && (
              <div style={{ background: "#FEF2F2", border: "2px solid #EF4444", color: "#991B1B", padding: 16, borderRadius: 12, marginBottom: 24, fontWeight: 700, fontSize: 13, textAlign: "left" }}>
                ⚠️ <strong>Anti-Cheat Auto-Submission Triggered:</strong> You switched browser tabs or moved away from the test window. The assessment was automatically submitted per Talentera security compliance policy.
              </div>
            )}

            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#DCFCE7", color: "#15803D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 20px" }}>
              ✓
            </div>

            <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--navy)", margin: "0 0 12px" }}>
              Thank you for completing the assessment!
            </h2>

            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
              <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 999 }}>
                ✓ TEST SUBMITTED &amp; RECORDED
              </span>
              <span style={{ background: "#FEF3C7", color: "#B45309", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 999 }}>
                Single Attempt Completed
              </span>
            </div>

            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: 0.5 }}>YOUR SCORE</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: "var(--navy)" }}>{calculatedScore}%</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{resultDetails.correctCount} of {resultDetails.totalQuestions} correct</div>
            </div>

            <p style={{ fontSize: 14, color: "#64748B", maxWidth: 480, margin: "0 auto" }}>
              Graded automatically - this score is final, no staff review needed.
            </p>

            <div style={{ marginTop: 28 }}>
              <button type="button" className="btn btn-gold" style={{ padding: "14px 32px", fontSize: 15 }} onClick={() => navigate("/dashboard")}>
                Return to Candidate Dashboard →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
