import React, { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { useToast } from "./Toast.jsx";

// Helper: Fisher-Yates Array Shuffle
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function ClaudeMockInterviewBot({ candidateData, onCompleted }) {
  const toast = useToast();
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const candidateName = candidateData?.fullName || candidateData?.stage1?.fullName || "Candidate";
  const candidateRole = candidateData?.currentRole || candidateData?.stage1?.currentRole || "Medical Coder & RCM Specialist";

  // Question & Session States
  const [questions, setQuestions] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Q&A Recorded Transcripts: { [questionId]: string }
  const [qaTranscripts, setQaTranscripts] = useState({});

  // Chat & UI States
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, submitting]);

  // 1. Fetch Same Question Bank as Stage 5 Video/Audio Section
  useEffect(() => {
    api.get("/candidate/interview-questions?mode=audio")
      .then((res) => {
        if (res.data && res.data.questions) {
          setQuestions(res.data.questions);
        }
      })
      .catch((err) => {
        console.warn("Fetch interview questions error:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // 2. Start & Shuffle Session
  function handleStartInterviewSession() {
    const baseQuestions = questions.length > 0
      ? questions
      : [
          { id: "default-1", question: "Let's start with you - walk me through your RCM or medical coding background, and the specialty you're strongest in." },
          { id: "default-2", question: "Tell me about a time you handled a difficult claim denial with ANSI code CO-197. What was the denial reason and how did you resolve it?" },
          { id: "default-3", question: "How do you stay compliant with HIPAA and protect PHI when working remotely on US healthcare accounts?" },
          { id: "default-4", question: "Where do you see gaps in your current RCM knowledge, and what are you doing to close them?" },
        ];

    const shuffled = shuffleArray(baseQuestions);
    setShuffledQuestions(shuffled);
    setCurrentQIndex(0);
    setQaTranscripts({});
    setInterviewCompleted(false);
    setEvaluation(null);
    setInterviewStarted(true);

    const firstQ = shuffled[0];
    setMessages([
      {
        role: "assistant",
        content: `Hello ${candidateName}! Welcome to your Stage 8 Live Technical AI Mock Interview for the **${candidateRole}** position.\n\nI have randomly shuffled ${shuffled.length} technical interview questions.\n\n**Question 1 of ${shuffled.length}**:\n${firstQ.question}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    toast(`✓ Shuffled ${shuffled.length} Technical Questions! Interview Started.`, "✓");
  }

  // Web Speech API Voice Recognition Toggle
  function toggleSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast("Speech recognition is not supported in this browser. Please type your response.", "!");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
          toast("Listening to your spoken answer… Speak clearly.", "✓");
        };

        recognition.onresult = (e) => {
          let text = "";
          for (let i = 0; i < e.results.length; i++) {
            text += e.results[i][0].transcript;
          }
          setInputMsg(text);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.error("Speech recognition start error:", err);
        setIsListening(false);
      }
    }
  }

  // Submit Answer & Move to Next Shuffled Question
  async function handleSendAnswer(e) {
    if (e) e.preventDefault();
    const candidateAnswerText = inputMsg.trim();
    if (!candidateAnswerText || submitting || !interviewStarted || interviewCompleted) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const currentQ = shuffledQuestions[currentQIndex];
    const userMsgObj = {
      role: "user",
      content: candidateAnswerText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedTranscripts = { ...qaTranscripts, [currentQ.id || currentQ._id]: candidateAnswerText };
    setQaTranscripts(updatedTranscripts);
    setMessages((prev) => [...prev, userMsgObj]);
    setInputMsg("");

    const nextIndex = currentQIndex + 1;
    if (nextIndex < shuffledQuestions.length) {
      // Move to Next Shuffled Question
      const nextQ = shuffledQuestions[nextIndex];
      setCurrentQIndex(nextIndex);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✓ Answer recorded for Question ${currentQIndex + 1}.\n\n---\n\n**Question ${nextIndex + 1} of ${shuffledQuestions.length}**:\n${nextQ.question}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } else {
      // All Questions Completed — Submit for Stage 5 Evaluation Engine Grading
      await handleFinalSubmission(updatedTranscripts);
    }
  }

  // Final Submission to Stage 8 Mock Evaluation API (Uses Stage 5 aiAssessment engine server-side)
  async function handleFinalSubmission(finalTranscripts = qaTranscripts) {
    setSubmitting(true);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `All ${shuffledQuestions.length} questions completed! Submitting spoken/typed answers to Stage 5 AI Evaluation Engine for grading against reference answer keys…`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    const formattedQaPairs = shuffledQuestions.map((q) => ({
      questionId: q.id || q._id,
      question: q.question,
      transcript: finalTranscripts[q.id || q._id] || "",
    }));

    try {
      const res = await api.post("/candidate/stage8-mock/assess", {
        qaPairs: JSON.stringify(formattedQaPairs),
        proctorLogs: JSON.stringify({ livenessVerified: true }),
      });

      if (res.data && res.data.success) {
        const evalRes = res.data.evaluation;
        setEvaluation(evalRes);
        setInterviewCompleted(true);
        toast(`✓ AI Evaluation Complete! Score: ${evalRes.totalMarks}/${evalRes.maxMarks} Marks (${evalRes.overallScore}%)`, "✓");
        if (onCompleted) onCompleted(res.data);
      }
    } catch (err) {
      console.error("Stage 8 Mock evaluation error:", err);
      toast("Error grading answers with AI evaluation engine.", "!");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ padding: 0, borderRadius: 16, border: "2px solid var(--navy)", overflow: "hidden", background: "#fff" }}>
      {/* HEADER BANNER */}
      <div style={{ background: "var(--navy)", color: "#fff", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--gold)", color: "var(--navy)", fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fa-solid fa-robot"></i>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff" }}>
              Live AI Mock Interviewer Bot (Stage 5 Grading Engine)
            </h4>
            <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700 }}>
              <i className="fa-solid fa-microphone" style={{ marginRight: 4 }}></i>
              Voice &amp; Text Q&amp;A • No Video Camera Needed
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {!interviewStarted && (
            <button type="button" className="btn btn-gold" style={{ fontSize: 12, padding: "6px 14px" }} onClick={handleStartInterviewSession}>
              <i className="fa-solid fa-shuffle" style={{ marginRight: 6 }}></i> Shuffle &amp; Start Interview
            </button>
          )}
        </div>
      </div>

      {/* CHAT / QUESTIONING THREAD */}
      {!interviewStarted ? (
        <div style={{ padding: 40, textAlign: "center", background: "#F8FAFC" }}>
          <i className="fa-solid fa-shuffle" style={{ fontSize: 40, color: "var(--gold)", marginBottom: 14 }}></i>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: "0 0 8px" }}>
            Click "Shuffle &amp; Start Interview" to Begin
          </h3>
          <p style={{ fontSize: 13, color: "#64748B", maxWidth: 500, margin: "0 auto 20px" }}>
            The AI Bot will shuffle technical questions from the Stage 5 question bank and grade your spoken/typed responses against official reference answer keys.
          </p>
          <button type="button" className="btn btn-gold" style={{ padding: "12px 24px", fontSize: 14 }} onClick={handleStartInterviewSession}>
            <i className="fa-solid fa-play" style={{ marginRight: 8 }}></i> Shuffle Questions &amp; Start Live Session →
          </button>
        </div>
      ) : (
        <>
          <div style={{ padding: 20, height: 380, overflowY: "auto", background: "#F8FAFC", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((msg, idx) => {
              const isBot = msg.role === "assistant";
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isBot ? "flex-start" : "flex-end",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 700, marginBottom: 3, padding: "0 4px" }}>
                    {isBot ? "AI Senior Interviewer" : candidateName} • {msg.timestamp}
                  </div>

                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "12px 16px",
                      borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                      background: isBot ? "#ffffff" : "var(--navy)",
                      color: isBot ? "#1E293B" : "#ffffff",
                      border: isBot ? "1px solid #CBD5E1" : "none",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {submitting && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy)", fontSize: 12, fontWeight: 700, padding: 8 }}>
                <i className="fa-solid fa-brain fa-spin" style={{ color: "var(--gold)" }}></i>
                AI Engine is grading your responses against official reference answer keys…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* EVALUATION REPORT CARD (SAME DESIGN & CODE AS STAGE 5) */}
          {interviewCompleted && evaluation && (
            <div style={{ background: "#fff", borderTop: "2px solid #22C55E", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <div>
                  <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
                    <i className="fa-solid fa-circle-check"></i> AI MOCK INTERVIEW EVALUATED
                  </span>
                  <h3 style={{ margin: "6px 0 2px", fontSize: 20, fontWeight: 800, color: "var(--navy)" }}>
                    Total Marks: {evaluation.totalMarks} / {evaluation.maxMarks} Marks ({evaluation.overallScore}%)
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>
                    Graded against official staff reference answer keys • Audio/Text Q&amp;A Session
                  </p>
                </div>

                <div style={{ background: "#FAF7F0", border: "2px solid rgba(229,168,46,0.4)", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B" }}>STAGE 8 MARKS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>{evaluation.totalMarks}<span style={{ fontSize: 14, color: "#94A3B8" }}>/{evaluation.maxMarks}</span></div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#15803D" }}>✓ Verified</div>
                </div>
              </div>

              {/* Individual Question Marks List */}
              <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", marginBottom: 10 }}>Per-Question Evaluation Breakdown:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {(evaluation.questionScores || []).map((qScore, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: qScore.marks > 0 ? "#F0FDF4" : "#FEF2F2",
                      border: `1px solid ${qScore.marks > 0 ? "#BBF7D0" : "#FECACA"}`,
                      borderRadius: 10,
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "var(--navy)" }}>
                        Q{idx + 1}. {qScore.question}
                      </div>
                      <div style={{ fontSize: 11, color: qScore.marks > 0 ? "#15803D" : "#DC2626", marginTop: 2 }}>
                        {qScore.feedback}
                      </div>
                    </div>

                    <span style={{ background: qScore.marks > 0 ? "#DCFCE7" : "#FEE2E2", color: qScore.marks > 0 ? "#15803D" : "#DC2626", fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 999, flexShrink: 0 }}>
                      {qScore.marks} / {evaluation.pointsPerQuestion || 10} Marks
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ background: "#F1F5F9", borderRadius: 8, padding: 14, fontSize: 12, color: "#334155", lineHeight: 1.6 }}>
                <strong>AI Evaluator Feedback:</strong> {evaluation.feedback}
              </div>
            </div>
          )}

          {/* INPUT CONTROLS BAR */}
          {!interviewCompleted && (
            <form onSubmit={handleSendAnswer} style={{ padding: 14, background: "#ffffff", borderTop: "1px solid #CBD5E1", display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                style={{
                  background: isListening ? "#DC2626" : "#F1F5F9",
                  color: isListening ? "#ffffff" : "var(--navy)",
                  border: isListening ? "none" : "1px solid #CBD5E1",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                title="Click to speak your response"
              >
                <i className={`fa-solid ${isListening ? "fa-microphone-slash fa-pulse" : "fa-microphone"}`}></i>
                {isListening ? "Listening…" : "Voice"}
              </button>

              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder={`Answer Question ${currentQIndex + 1} of ${shuffledQuestions.length}...`}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #CBD5E1",
                  fontSize: 13,
                  outline: "none",
                }}
              />

              <button
                type="submit"
                className="btn btn-gold"
                disabled={!inputMsg.trim() || submitting}
                style={{ padding: "10px 18px", fontSize: 13 }}
              >
                Submit Answer <i className="fa-solid fa-paper-plane" style={{ marginLeft: 6 }}></i>
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
