// Shared JD formatting (only what the employer actually entered). Used by the candidate Browse Jobs list and by My Companies.
// Only ever show what the employer actually entered - no invented defaults.
const hasVal = (v) => v !== undefined && v !== null && String(v).trim() !== "";
const asList = (v) => (Array.isArray(v) ? v.filter(hasVal) : hasVal(v) ? [v] : []);
const formatExperience = (fd) => {
  if (fd.level === "Fresher only") return "Fresher";
  const lo = hasVal(fd.expmin) ? Number(fd.expmin) : null;
  const hi = hasVal(fd.expmax) ? Number(fd.expmax) : null;
  if (lo !== null && hi !== null) return `${lo}-${hi} yrs`;
  if (lo !== null) return `${lo}+ yrs`;
  if (hi !== null) return `Up to ${hi} yrs`;
  return "";
};
const formatSalary = (fd) => {
  if (hasVal(fd.compensation)) return String(fd.compensation);
  const lo = hasVal(fd.compmin) ? fd.compmin : null;
  const hi = hasVal(fd.compmax) ? fd.compmax : null;
  if (lo !== null && hi !== null) return `₹${lo} - ₹${hi} LPA`;
  if (lo !== null) return `From ₹${lo} LPA`;
  if (hi !== null) return `Up to ₹${hi} LPA`;
  return "Not disclosed";
};
// Extra JD details, listed only when the employer filled them in
const buildJobDetails = (fd) => {
  const rows = [];
  const add = (label, value) => { if (hasVal(value)) rows.push({ label, value: String(value) }); };
  add("Hiring level", fd.level);
  add("Education", asList(fd.edumin).join(", "));
  add("Shift", fd.shift);
  add("Languages", asList(fd.languages).join(", "));
  const isFresherRole = fd.level === "Fresher only" || fd.level === "Fresher" || String(fd.level || "").toLowerCase().includes("fresher") || (fd.expmin !== undefined && fd.expmin !== null && fd.expmin !== "" && Number(fd.expmin) === 0 && Number(fd.expmax || 0) <= 1);
  if (!isFresherRole) add("Notice period", fd.notice);
  add("Probation", hasVal(fd.probation) ? `${fd.probation} months` : "");
  add("Joining bonus", hasVal(fd.joiningbonus) ? (/^\d+(\.\d+)?$/.test(String(fd.joiningbonus).trim()) ? `₹${fd.joiningbonus}` : fd.joiningbonus) : "");
  const experiencedOnly = String(fd.level || "") === "Experienced only";
  if (!experiencedOnly) add("Age limit", fd.elgage);
  if (isFresherRole || String(fd.level || "") !== "Experienced only") add("Passout year", fd.elgpassout);
  if (!experiencedOnly) add("Backlogs", fd.elgbacklogs);
  add("Mode of interview", asList(fd.interviewmode).join(", "));
  add("Interview dates", fd.interviewdates);
  return rows;
};

module.exports = { hasVal, asList, formatExperience, formatSalary, buildJobDetails };
