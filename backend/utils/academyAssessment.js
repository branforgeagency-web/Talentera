const Candidate = require("../models/Candidate");
const AcademyAssessmentResult = require("../models/AcademyAssessmentResult");

const norm = (v) => String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g, " ");

// Validates / normalises a question list coming from the builder or a CSV import.
function sanitizeQuestions(raw) {
  const out = [];
  const errors = [];
  (Array.isArray(raw) ? raw : []).slice(0, 300).forEach((q, i) => {
    const n = i + 1;
    const type = ["mcq", "fill_blank", "qa"].includes(q?.type) ? q.type : null;
    const text = String(q?.text || "").trim();
    const marks = Math.max(0, Number(q?.marks) || 1);
    if (!type) return errors.push(`Question ${n}: type must be MCQ, Fill in the blank or Q&A.`);
    if (!text) return errors.push(`Question ${n}: question text is empty.`);
    if (type === "mcq") {
      const options = (Array.isArray(q.options) ? q.options : []).map((o) => String(o || "").trim()).filter(Boolean);
      if (options.length < 2) return errors.push(`Question ${n}: an MCQ needs at least 2 options.`);
      const idx = Number(q.answer);
      if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) return errors.push(`Question ${n}: pick the correct option.`);
      out.push({ type, text, options, answer: String(idx), marks });
    } else if (type === "fill_blank") {
      const answer = String(q.answer || "").trim();
      if (!answer) return errors.push(`Question ${n}: enter the correct answer for the blank.`);
      out.push({ type, text, options: [], answer, marks });
    } else {
      out.push({ type, text, options: [], answer: String(q.answer || "").trim(), marks });
    }
  });
  return { questions: out, errors };
}

// Auto-grades MCQ and fill-in-the-blank; Q&A answers wait for the academy's own marking.
function gradeSubmission(assessment, answers) {
  const given = Array.isArray(answers) ? answers : [];
  let raw = 0;
  let total = 0;
  let needsReview = false;
  const detail = assessment.questions.map((q, i) => {
    const a = given.find((x) => String(x.questionId) === String(q._id)) || given[i] || {};
    const response = a.response == null ? "" : a.response;
    total += q.marks;
    let awarded = 0;
    let status = "graded";
    if (q.type === "mcq") {
      if (String(response) === String(q.answer)) awarded = q.marks;
    } else if (q.type === "fill_blank") {
      const accepted = String(q.answer).split("|").map(norm).filter(Boolean);
      if (accepted.includes(norm(response))) awarded = q.marks;
    } else {
      status = "pending_review";
      needsReview = true;
    }
    raw += awarded;
    return { questionId: q._id, type: q.type, response: String(response), awarded, maxMarks: q.marks, status };
  });
  return { raw, total, needsReview, detail };
}

// The candidate's Stage 2 "Academy Assessment Score" (already read by the Talentera score
// and the candidate dashboard) is the average of all their graded academy assessments.
async function recomputeCandidateAcademyScore(candidateId) {
  const results = await AcademyAssessmentResult.find({ candidateId, status: "graded" }).lean();
  if (results.length === 0) return null;
  const avg = Math.round(results.reduce((s, r) => s + (Number(r.scorePct) || 0), 0) / results.length);
  const candidate = await Candidate.findById(candidateId);
  if (!candidate) return null;
  candidate.stage2 = { ...(candidate.stage2 || {}), assessmentScore: avg, academyAssessmentScore: avg, score: avg };
  candidate.markModified("stage2");
  await candidate.save();
  return avg;
}

module.exports = { sanitizeQuestions, gradeSubmission, recomputeCandidateAcademyScore, norm };
