const { generateInterviewQuestions, getMessiTurn, generateFinalReport } = require("../backend/utils/claudeInterview");

async function runTests() {
  console.log("=== 1. Testing generateInterviewQuestions ===");
  const questions = await generateInterviewQuestions({ candidateName: "Aman", role: "Frontend Developer" });
  console.log(`Generated ${questions.length} questions:`);
  questions.forEach((q, idx) => {
    console.log(`Q${idx + 1} [${q.topic} - ${q.topicLabel}]: ${q.question}`);
  });

  if (questions.length !== 5) {
    throw new Error(`Expected 5 questions, got ${questions.length}`);
  }

  console.log("\n=== 2. Testing getMessiTurn (Answer Turn) ===");
  const mockSession = {
    questions,
    currentQuestionIndex: 0,
    questionRecords: [],
  };

  const answerTurn = await getMessiTurn({
    session: mockSession,
    candidateUtterance: "Hello, my name is Aman. I recently graduated in Computer Science, and I love building web applications with React.",
  });
  console.log("Messi Turn Result (Answer):", answerTurn);
  if (!answerTurn.messiReply || answerTurn.askFollowUp !== false) {
    throw new Error("Answer turn validation failed");
  }

  console.log("\n=== 3. Testing getMessiTurn (Inactivity / No Answer Turn) ===");
  const noAnswerTurn = await getMessiTurn({
    session: mockSession,
    candidateUtterance: "(no answer)",
  });
  console.log("Messi Turn Result (No Answer):", noAnswerTurn);

  console.log("\n=== 4. Testing generateFinalReport ===");
  const mockRecords = questions.map((q, idx) => ({
    index: idx,
    topic: q.topic,
    question: q.question,
    candidateAnswer: idx === 0 ? "My name is Aman and I am passionate about technology." : idx === 1 ? "I studied B.Tech in CSE." : idx === 2 ? "HTML, CSS, JavaScript, React." : "(no answer)",
    evaluation: idx === 3 ? "no_answer" : idx === 2 ? "correct" : "partial",
    score: idx === 3 ? 0 : idx === 2 ? 8 : 6,
    missingConcepts: [],
    feedback: "Good response.",
  }));

  const report = await generateFinalReport({
    candidateName: "Aman",
    role: "Frontend Developer",
    questionRecords: mockRecords,
  });

  console.log("Final Report Summary Score:", report.overallScore);
  console.log("Final Report Strengths:", report.strengths);
  console.log("Final Report Areas to Improve:", report.areasToImprove);
  console.log("Final Report Breakdown:", report.breakdown);

  console.log("\nAll tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
