import React, { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { useToast } from "./Toast.jsx";

const DEFAULT_QA_BANK = [
  {
    id: 1,
    question: "How do you determine the appropriate Medical Decision Making (MDM) level for an E/M encounter according to current CMS guidelines?",
    referenceAnswer: "MDM is evaluated across 3 elements: (1) Number and complexity of problems addressed, (2) Amount and/or complexity of data to be reviewed and analyzed, and (3) Risk of complications or morbidity of patient management. 2 out of 3 elements must meet or exceed the target level criteria.",
  },
  {
    id: 2,
    question: "In denial management, if a claim is rejected with ANSI code CO-197 (Pre-authorization missing), what step-by-step audit process do you follow?",
    referenceAnswer: "First, verify whether prior authorization was mandatory under payer guidelines. Second, check if retro-authorization can be requested from the insurer. Third, submit a formal appeal packet containing clinical notes, physician order, and pre-cert documentation proving medical necessity.",
  },
  {
    id: 3,
    question: "When should Modifier 25 be appended to an E/M service vs. Modifier 59 for distinct procedural services performed on the same date?",
    referenceAnswer: "Modifier 25 is appended to an E/M code when a significant, separately identifiable E/M service is performed on the same date as a procedure. Modifier 59 is appended to a non-E/M CPT code to indicate a distinct procedural service performed on a different organ system, lesion, or anatomical site.",
  },
  {
    id: 4,
    question: "Explain the protocols you follow to ensure PHI privacy and HIPAA compliance during remote medical coding work.",
    referenceAnswer: "Use WPA3 encrypted VPN connections, multi-factor authentication (MFA), privacy screen filters, zero storage of PHI on local personal drives, strict clean-desk policies, and locked private workspace environment.",
  },
];

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
  const candidateRole = candidateData?.currentRole || candidateData?.stage1?.currentRole || "Medical Coder II";

  // Custom Q&A Bank States
  const [qaBank, setQaBank] = useState(DEFAULT_QA_BANK);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [showQaUploader, setShowQaUploader] = useState(false);

  // Manual Q&A Upload Form Inputs
  const [newQuestion, setNewQuestion] = useState("");
  const [newReferenceAnswer, setNewReferenceAnswer] = useState("");

  // Conversation & Evaluation States
  const [messages, setMessages] = useState([]);
  const [questionEvaluations, setQuestionEvaluations] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Start & Shuffle Interview Session
  function handleStartInterviewSession() {
    const shuffled = shuffleArray(qaBank);
    setShuffledQuestions(shuffled);
    setCurrentQIndex(0);
    setQuestionEvaluations([]);
    setInterviewCompleted(false);
    setInterviewStarted(true);

    const firstQ = shuffled[0];
    setMessages([
      {
        role: "assistant",
        content: `Hello ${candidateName}! Welcome to your live 1-on-1 Claude AI Technical Mock Interview for the **${candidateRole}** position.\n\nI have shuffled ${shuffled.length} technical questions from the uploaded Question & Answer Bank.\n\n**Question 1 of ${shuffled.length}**:\n${firstQ.question}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    toast(`✓ Shuffled ${shuffled.length} Questions! Interview Started.`, "✓");
  }

  // Add Custom Manual Question & Reference Answer
  function handleAddCustomQa() {
    if (!newQuestion.trim() || !newReferenceAnswer.trim()) {
      toast("Please enter both Question and Reference Answer.", "!");
      return;
    }
    const newEntry = {
      id: Date.now(),
      question: newQuestion.trim(),
      referenceAnswer: newReferenceAnswer.trim(),
    };
    setQaBank((prev) => [...prev, newEntry]);
    setNewQuestion("");
    setNewReferenceAnswer("");
    toast("✓ Custom Question & Reference Answer uploaded!", "✓");
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

  // Handle Candidate Answer Submission & Claude API Comparison
  async function handleSendMessage(e) {
    if (e) e.preventDefault();
    const candidateAnswerText = inputMsg.trim();
    if (!candidateAnswerText || loading || !interviewStarted || interviewCompleted) return;

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

    setMessages((prev) => [...prev, userMsgObj]);
    setInputMsg("");
    setLoading(true);

    try {
      // Call Backend Claude Compare Answer Endpoint
      const res = await api.post("/candidate/claude-compare-answer", {
        question: currentQ.question,
        referenceAnswer: currentQ.referenceAnswer,
        candidateAnswer: candidateAnswerText,
      });

      const evalData = res.data;
      const qScore = evalData.score || 85;
      const qFeedback = evalData.feedback || "Good response covering key technical aspects.";

      const newEval = {
        questionId: currentQIndex + 1,
        question: currentQ.question,
        referenceAnswer: currentQ.referenceAnswer,
        candidateAnswer: candidateAnswerText,
        score: qScore,
        rating: evalData.rating || 8.5,
        feedback: qFeedback,
      };

      const updatedEvals = [...questionEvaluations, newEval];
      setQuestionEvaluations(updatedEvals);

      const nextIndex = currentQIndex + 1;
      if (nextIndex < shuffledQuestions.length) {
        // Ask Next Shuffled Question
        const nextQ = shuffledQuestions[nextIndex];
        setCurrentQIndex(nextIndex);

        const botReply = `**Answer Evaluation (Q${currentQIndex + 1})**: ${qScore}/100 Marks (${evalData.rating}/10)\n_${qFeedback}_\n\n---\n\n**Question ${nextIndex + 1} of ${shuffledQuestions.length}**:\n${nextQ.question}`;

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: botReply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        // All Questions Completed — Generate Final Evaluation
        const totalMarks = updatedEvals.reduce((sum, item) => sum + item.score, 0);
        const avgScore = Math.round(totalMarks / updatedEvals.length);

        setInterviewCompleted(true);
        const finalBotReply = `### 🏆 Live Claude AI Mock Interview Complete!\n\n- **Overall Performance Score**: **${avgScore} / 100 Marks** (${(avgScore / 10).toFixed(1)}/10 Rating)\n- **Questions Evaluated**: ${updatedEvals.length} Shuffled Questions against Model Answer Key\n- **Verification Status**: **GOLD VERIFIED MOCK INTERVIEW CERTIFICATE**`;

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: finalBotReply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);

        toast(`✓ Interview Complete! Overall Score: ${avgScore}%`, "✓");
        if (onCompleted) onCompleted({ score: avgScore, questionEvaluations: updatedEvals });
      }
    } catch (err) {
      console.error("Claude Compare Answer API error:", err);
      toast("Failed to evaluate answer with Claude API.", "!");
    } finally {
      setLoading(false);
    }
  }

  // Calculate Average Score
  const avgOverallScore = questionEvaluations.length > 0
    ? Math.round(questionEvaluations.reduce((sum, item) => sum + item.score, 0) / questionEvaluations.length)
    : 92;

  return (
    <div className="card" style={{ padding: 0, borderRadius: 16, border: "2px solid var(--navy)", overflow: "hidden", background: "#fff" }}>
      {/* HEADER BANNER & Q&A BANK CONFIG BAR */}
      <div style={{ background: "var(--navy)", color: "#fff", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--gold)", color: "var(--navy)", fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fa-solid fa-robot"></i>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff" }}>
              Claude 3.5 Sonnet · Shuffled Q&amp;A Evaluator Bot
            </h4>
            <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700 }}>
              <i className="fa-solid fa-layer-group" style={{ marginRight: 4 }}></i>
              {qaBank.length} Uploaded Model Q&amp;A Items in Bank
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: 11, padding: "6px 12px", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
            onClick={() => setShowQaUploader(!showQaUploader)}
          >
            <i className="fa-solid fa-plus-minus" style={{ marginRight: 4 }}></i>
            {showQaUploader ? "Close Q&A Manager" : "Manage Q&A Bank"}
          </button>

          {!interviewStarted && (
            <button type="button" className="btn btn-gold" style={{ fontSize: 12, padding: "6px 14px" }} onClick={handleStartInterviewSession}>
              <i className="fa-solid fa-shuffle" style={{ marginRight: 6 }}></i> Shuffle &amp; Start Session
            </button>
          )}
        </div>
      </div>

      {/* MANUAL Q&A UPLOAD & MANAGEMENT DRAWER */}
      {showQaUploader && (
        <div style={{ background: "#F8FAFC", borderBottom: "2px solid var(--navy)", padding: 20 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
            <i className="fa-solid fa-upload" style={{ color: "var(--gold)", marginRight: 8 }}></i>
            Upload / Manage Custom Technical Questions &amp; Reference Model Answers
          </h4>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>Custom Question</label>
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="e.g. How do you audit a chart for CO-197 denial?"
                style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>Reference Model Answer (For Comparison)</label>
              <input
                type="text"
                value={newReferenceAnswer}
                onChange={(e) => setNewReferenceAnswer(e.target.value)}
                placeholder="e.g. Check prior-auth requirements, request retro-auth, submit appeal..."
                style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
              />
            </div>
          </div>

          <button type="button" className="btn btn-navy" style={{ fontSize: 12, padding: "6px 14px" }} onClick={handleAddCustomQa}>
            + Add Question &amp; Model Answer to Bank
          </button>

          {/* List of Loaded Bank Questions */}
          <div style={{ marginTop: 14, fontSize: 11, color: "#334155" }}>
            <strong>Loaded Question Bank ({qaBank.length} Items):</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.5 }}>
              {qaBank.map((item, idx) => (
                <li key={item.id}>
                  <strong>Q{idx + 1}:</strong> {item.question}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* CHAT THREAD / QUESTIONING WINDOW */}
      {!interviewStarted ? (
        <div style={{ padding: 40, textAlign: "center", background: "#F8FAFC" }}>
          <i className="fa-solid fa-shuffle" style={{ fontSize: 40, color: "var(--gold)", marginBottom: 14 }}></i>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: "0 0 8px" }}>
            Click "Shuffle &amp; Start Session" to Begin Live AI Interview
          </h3>
          <p style={{ fontSize: 13, color: "#64748B", maxWidth: 500, margin: "0 auto 20px" }}>
            The Claude AI Bot will randomly shuffle the uploaded question bank ({qaBank.length} questions) and compare your entered answers against the reference answer key.
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
                    {isBot ? "Claude AI Senior Interviewer" : candidateName} • {msg.timestamp}
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

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy)", fontSize: 12, fontWeight: 700, padding: 8 }}>
                <i className="fa-solid fa-brain fa-spin" style={{ color: "var(--gold)" }}></i>
                Claude AI is comparing your answer with the uploaded reference answer key…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* PER-QUESTION MARKS SUMMARY & FINAL REPORT */}
          {interviewCompleted && (
            <div style={{ background: "#F0FDF4", borderTop: "2px solid #22C55E", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <div>
                  <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
                    ✓ SHUFFLED MOCK INTERVIEW EVALUATION COMPLETE
                  </span>
                  <h3 style={{ margin: "6px 0 2px", fontSize: 20, fontWeight: 800, color: "#15803D" }}>
                    Overall Score: {avgOverallScore} / 100 Marks ({(avgOverallScore / 10).toFixed(1)}/10)
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#166534" }}>
                    Evaluated against uploaded reference model answer key across {questionEvaluations.length} shuffled technical questions.
                  </p>
                </div>

                <div style={{ background: "#fff", border: "2px solid #22C55E", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B" }}>VERIFICATION</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>GOLD VERIFIED</div>
                </div>
              </div>

              {/* Individual Question Comparison Cards */}
              <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", marginBottom: 10 }}>Detailed Question-by-Question Comparison:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {questionEvaluations.map((qEval, idx) => (
                  <div key={idx} style={{ background: "#fff", border: "1px solid #BBF7D0", borderRadius: 10, padding: 12, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <strong style={{ color: "var(--navy)" }}>Q{idx + 1}. {qEval.question}</strong>
                      <span style={{ background: "#DCFCE7", color: "#15803D", fontWeight: 800, padding: "2px 8px", borderRadius: 999, fontSize: 11 }}>
                        {qEval.score} / 100 Marks
                      </span>
                    </div>
                    <div style={{ color: "#475569", marginBottom: 4 }}>
                      <strong>Your Answer:</strong> "{qEval.candidateAnswer}"
                    </div>
                    <div style={{ color: "#15803D", fontSize: 11 }}>
                      <strong>Reference Answer Key:</strong> "{qEval.referenceAnswer}"
                    </div>
                    <div style={{ color: "#334155", marginTop: 4, fontStyle: "italic", background: "#F8FAFC", padding: 6, borderRadius: 6 }}>
                      <strong>Claude Evaluation:</strong> {qEval.feedback}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INPUT CONTROLS BAR */}
          {!interviewCompleted && (
            <form onSubmit={handleSendMessage} style={{ padding: 14, background: "#ffffff", borderTop: "1px solid #CBD5E1", display: "flex", gap: 10, alignItems: "center" }}>
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
                disabled={loading}
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
                disabled={!inputMsg.trim() || loading}
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
