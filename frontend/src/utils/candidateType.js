// Fresher vs Experienced: chosen at signup (candidate.candidateType) and used to pick
// which candidate dashboard opens. Older accounts without the field fall back to the
// Stage 1 "experience" answer, and finally to "fresher".
export function getCandidateType(candidate) {
  const c = candidate && candidate.candidate ? candidate.candidate : candidate;
  if (!c) return "fresher";
  if (c.candidateType === "experienced" || c.candidateType === "fresher") return c.candidateType;
  const exp = String((c.stage1 && c.stage1.experience) || c.experience || "");
  return /exp/i.test(exp) ? "experienced" : "fresher";
}

export function dashboardPathFor(candidate) {
  return `/dashboard/${getCandidateType(candidate)}`;
}
