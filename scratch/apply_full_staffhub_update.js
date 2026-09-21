const fs = require('fs');
const path = require('path');

const filePath = path.resolve('frontend/src/pages/StaffHub.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Insert Stage 4 Question Bank State
const stateAnchor = 'const [questionDeleteConfirmId, setQuestionDeleteConfirmId] = useState(null);';
const stateToAdd = `const [questionDeleteConfirmId, setQuestionDeleteConfirmId] = useState(null);

  // Stage 4 Proctored Assessment MCQ Bank State
  const [questionBankTab, setQuestionBankTab] = useState("stage4"); // "stage4" (Assessment MCQs) or "stage5" (Interview)
  const [assessmentDomain, setAssessmentDomain] = useState("Medical Coding");
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [editingAssessmentQ, setEditingAssessmentQ] = useState(null);
  const [assessmentForm, setAssessmentForm] = useState({
    domain: "Medical Coding",
    sectionKey: "anatomy",
    sectionName: "Anatomy & Physiology",
    sectionIcon: "fa-bullseye",
    sectionSub: "",
    sectionOrder: 1,
    topic: "",
    question: "",
    options: ["", "", "", ""],
    correct: 0,
    explanation: "",
    order: 1,
    active: true,
  });
  const [assessmentSubmitting, setAssessmentSubmitting] = useState(false);
  const [assessmentError, setAssessmentError] = useState("");
  const [assessmentDeleteConfirmId, setAssessmentDeleteConfirmId] = useState(null);
  const [interviewDomainFilter, setInterviewDomainFilter] = useState("all");`;

if (content.includes(stateAnchor) && !content.includes('const [questionBankTab, setQuestionBankTab]')) {
  content = content.replace(stateAnchor, stateToAdd);
  console.log('1. Added state hooks.');
}

// 2. Insert Handlers for Assessment Questions
const handlerAnchor = 'const fetchInterviewQuestions = async () => {';
const handlersToAdd = `const fetchAssessmentQuestions = async (domain = assessmentDomain) => {
    setAssessmentLoading(true);
    try {
      let url = "/api/staff/assessment-questions";
      if (domain && domain !== "all") {
        url += \`?domain=\${encodeURIComponent(domain)}\`;
      }
      const res = await fetch(url, { headers: { ...getAuthHeader() } });
      if (res.status === 401) {
        navigate("/staff/login");
        return;
      }
      const data = await safeJson(res);
      setAssessmentQuestions(data.questions || []);
    } catch (err) {
      console.error("fetchAssessmentQuestions error:", err);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleResetAssessmentDefaults = async () => {
    if (!window.confirm(\`Reset Stage 4 assessment questions for "\${assessmentDomain}" to standard curriculum defaults? Any custom changes for this domain will be restored.\`)) {
      return;
    }
    setAssessmentLoading(true);
    try {
      const res = await fetch("/api/staff/assessment-questions/reset-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ domain: assessmentDomain }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to reset questions.");
      showToast(data.message || "Standard domain questions reset successfully!");
      fetchAssessmentQuestions(assessmentDomain);
    } catch (err) {
      showToast("Error resetting: " + err.message);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleOpenAddAssessmentQ = () => {
    setEditingAssessmentQ(null);
    setAssessmentForm({
      domain: assessmentDomain,
      sectionKey: "custom_section",
      sectionName: "General Knowledge",
      sectionIcon: "fa-bullseye",
      sectionSub: "",
      sectionOrder: 1,
      topic: "",
      question: "",
      options: ["", "", "", ""],
      correct: 0,
      explanation: "",
      order: assessmentQuestions.length + 1,
      active: true,
    });
    setAssessmentError("");
    setAssessmentModalOpen(true);
  };

  const handleOpenEditAssessmentQ = (q) => {
    setEditingAssessmentQ(q);
    const opts = Array.isArray(q.options) && q.options.length >= 2 ? [...q.options] : ["", "", "", ""];
    while (opts.length < 4) opts.push("");
    setAssessmentForm({
      domain: q.domain || assessmentDomain,
      sectionKey: q.sectionKey || "custom_section",
      sectionName: q.sectionName || "Section",
      sectionIcon: q.sectionIcon || "fa-bullseye",
      sectionSub: q.sectionSub || "",
      sectionOrder: q.sectionOrder || 1,
      topic: q.topic || "",
      question: q.question || "",
      options: opts,
      correct: typeof q.correct === "number" ? q.correct : 0,
      explanation: q.explanation || "",
      order: q.order ?? 1,
      active: q.active !== false,
    });
    setAssessmentError("");
    setAssessmentModalOpen(true);
  };

  const handleSaveAssessmentQ = async (e) => {
    if (e) e.preventDefault();
    if (!assessmentForm.question.trim()) {
      setAssessmentError("Question text is required.");
      return;
    }
    const cleanOptions = assessmentForm.options.map((o) => String(o).trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setAssessmentError("At least 2 non-empty options are required.");
      return;
    }
    setAssessmentSubmitting(true);
    setAssessmentError("");

    try {
      const isEdit = Boolean(editingAssessmentQ && (editingAssessmentQ._id || editingAssessmentQ.id));
      const qId = editingAssessmentQ?._id || editingAssessmentQ?.id;
      const url = isEdit ? \`/api/staff/assessment-questions/\${qId}\` : "/api/staff/assessment-questions";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          domain: assessmentForm.domain,
          sectionKey: assessmentForm.sectionKey.trim(),
          sectionName: assessmentForm.sectionName.trim(),
          sectionIcon: assessmentForm.sectionIcon || "fa-bullseye",
          sectionSub: assessmentForm.sectionSub.trim(),
          sectionOrder: Number(assessmentForm.sectionOrder) || 1,
          topic: assessmentForm.topic.trim(),
          question: assessmentForm.question.trim(),
          options: cleanOptions,
          correct: Math.min(cleanOptions.length - 1, Math.max(0, Number(assessmentForm.correct) || 0)),
          explanation: assessmentForm.explanation.trim(),
          order: Number(assessmentForm.order) || 1,
          active: Boolean(assessmentForm.active),
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to save assessment question.");

      showToast(isEdit ? "Assessment question updated successfully!" : "New Stage 4 MCQ added to bank!");
      setAssessmentModalOpen(false);
      fetchAssessmentQuestions(assessmentDomain);
    } catch (err) {
      setAssessmentError(err.message || "An error occurred while saving.");
    } finally {
      setAssessmentSubmitting(false);
    }
  };

  const handleToggleAssessmentQActive = async (q) => {
    const qId = q._id || q.id;
    try {
      const res = await fetch(\`/api/staff/assessment-questions/\${qId}\`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ active: !q.active }),
      });
      if (!res.ok) throw new Error("Failed to toggle status.");
      showToast(\`Question status updated to \${!q.active ? "Active" : "Inactive"}.\`);
      setAssessmentQuestions((prev) =>
        prev.map((item) => ((item._id || item.id) === qId ? { ...item, active: !item.active } : item))
      );
    } catch (err) {
      showToast("Error updating status: " + err.message);
    }
  };

  const handleDeleteAssessmentQ = async (qId) => {
    try {
      const res = await fetch(\`/api/staff/assessment-questions/\${qId}\`, {
        method: "DELETE",
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) throw new Error("Failed to delete MCQ.");
      showToast("Question removed from bank.");
      setAssessmentDeleteConfirmId(null);
      setAssessmentQuestions((prev) => prev.filter((item) => (item._id || item.id) !== qId));
    } catch (err) {
      showToast("Error deleting question: " + err.message);
    }
  };

  const fetchInterviewQuestions = async () => {`;

if (content.includes(handlerAnchor) && !content.includes('const fetchAssessmentQuestions =')) {
  content = content.replace(handlerAnchor, handlersToAdd);
  console.log('2. Added assessment handlers.');
}

// 3. Update interview questions handlers for domain support & toast without emojis
content = content.replace(
  'showToast(isEdit ? "Interview question updated successfully! ✓" : "New interview question added to bank! ✓");',
  'showToast(isEdit ? "Interview question updated successfully!" : "New interview question added to bank!");'
);
content = content.replace(
  'showToast("Interview question removed from bank. 🗑️");',
  'showToast("Interview question removed from bank.");'
);

// 4. In useEffect where activeNav === "questions", fetch assessment questions as well
const navEffectAnchor = 'if (activeNav === "questions") fetchInterviewQuestions();';
if (content.includes(navEffectAnchor)) {
  content = content.replace(navEffectAnchor, 'if (activeNav === "questions") { fetchInterviewQuestions(); fetchAssessmentQuestions(assessmentDomain); }');
  console.log('3. Updated nav effect.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Part 1-3 complete.');
