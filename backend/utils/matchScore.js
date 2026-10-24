// JD -> candidate match score (0-99), with a per-factor breakdown the recruiter can see.
// Weights add up to 100:  Certification 25 | Specialty 20 | Assessment 20 | Location 15 | Verification 10 | Level 10
// Hard filters (registered, assessed, fresher/experienced, certified) are applied by the route BEFORE scoring;
// this only ranks the people who passed them.

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function scoreMatch({ jd = {}, candidate = {}, verificationScore = 0, experiencedCandidate = false }) {
  const s1 = candidate.stage1 || {};
  const s3 = candidate.stage3 || {};
  const s4 = candidate.stage4 || {};

  const level = String(jd.level || "").toLowerCase();
  const wantFresher = level.includes("fresher");
  const wantExperienced = level.includes("experienced");
  const certList = (Array.isArray(jd.certs) ? jd.certs : []).filter(Boolean);
  const specificCerts = certList.filter((c) => c !== "Non-Certified").map((c) => String(c).toUpperCase());
  const wantsNonCertifiedOnly = certList.length > 0 && specificCerts.length === 0;
  const jdCity = String(jd.location || "").toLowerCase().trim();
  const jdSpecialties = (Array.isArray(jd.specialties) ? jd.specialties : [jd.specialty]).filter(Boolean).map((x) => String(x).toLowerCase());
  const remote = /remote|work from home|wfh/.test(String(jd.workmode || "").toLowerCase());

  const certName = !s3.skipped ? String(s3.certName || s3.name || "").trim() : "";
  const isCertified = Boolean(certName);
  const breakdown = [];
  const add = (key, label, points, max, note) => breakdown.push({ key, label, points: Math.round(points), max, note });

  // 1. Certification (25)
  if (specificCerts.length && isCertified && specificCerts.some((sc) => certName.toUpperCase().includes(sc))) add("cert", "Certification", 25, 25, `Holds a required certification (${certName})`);
  else if (specificCerts.length && isCertified) add("cert", "Certification", 12, 25, `Certified (${certName}) but not one the job lists`);
  else if (wantsNonCertifiedOnly) add("cert", "Certification", isCertified ? 15 : 25, 25, isCertified ? "Certified - job targets non-certified candidates" : "Non-certified, as the job asks");
  else if (isCertified) add("cert", "Certification", 18, 25, `Certified (${certName}); job names no specific certification`);
  else add("cert", "Certification", 8, 25, "No certification");

  // 2. Specialty / domain (20)
  const domainText = [candidate.rcmDomainSelection?.primaryDomain, candidate.stage2?.domain, s1.currentRole, certName].filter(Boolean).join(" ").toLowerCase();
  if (!jdSpecialties.length) add("specialty", "Specialty", 10, 20, "Job lists no specialty (neutral)");
  else if (jdSpecialties.some((sp) => sp && domainText.includes(sp))) add("specialty", "Specialty", 20, 20, "Domain matches the job specialty");
  else if (jdSpecialties.some((sp) => sp && sp.split(/[\s/&,]+/).some((w) => w.length > 3 && domainText.includes(w)))) add("specialty", "Specialty", 12, 20, "Partly matches the job specialty");
  else add("specialty", "Specialty", 0, 20, "Domain does not match the job specialty");

  // 3. Assessment (20) - experienced candidates skip it, so a verified certification stands in
  const rawScore = s4.foundationScore !== undefined && s4.foundationScore !== null ? s4.foundationScore : s4.score;
  if (experiencedCandidate) {
    const certVerified = s3.certStatus === "verified" || (s3.certStatus === undefined && s3.verified === true);
    add("assessment", "Assessment", certVerified ? 20 : isCertified ? 12 : 6, 20, certVerified ? "Experienced - certification verified by staff" : "Experienced - certification not yet verified");
  } else if (rawScore !== undefined && rawScore !== null && rawScore !== "" && !Number.isNaN(Number(rawScore))) {
    const sc = clamp(Number(rawScore), 0, 100);
    add("assessment", "Assessment", (sc / 100) * 20, 20, `Proctored assessment score ${Math.round(sc)}%`);
  } else add("assessment", "Assessment", 0, 20, "No assessment score");

  // 4. Location (15)
  const city = String(s1.city || "").toLowerCase().trim();
  if (remote) add("location", "Location", 15, 15, "Remote role - location does not matter");
  else if (!jdCity) add("location", "Location", 8, 15, "Job lists no location (neutral)");
  else if (city && (jdCity.includes(city) || city.includes(jdCity))) add("location", "Location", 15, 15, `Based in ${s1.city}`);
  else if (!city) add("location", "Location", 4, 15, "Candidate city not given");
  else add("location", "Location", 0, 15, `Based in ${s1.city}, job is in ${jd.location}`);

  // 5. Profile verification (10)
  add("verification", "Profile verification", clamp(Number(verificationScore) || 0, 0, 100) / 10, 10, `Talentera verification score ${Math.round(verificationScore || 0)}`);

  // 6. Level fit (10) - the route already filters on fresher/experienced when the job specifies one
  if (wantFresher !== wantExperienced) add("level", "Experience level", 10, 10, wantFresher ? "Fresher, as the job asks" : "Experienced, as the job asks");
  else add("level", "Experience level", 6, 10, "Job open to any level (neutral)");

  const total = breakdown.reduce((n, b) => n + b.points, 0);
  const reasons = breakdown.filter((b) => b.points >= b.max * 0.7 && b.max > 0 && b.key !== "verification").map((b) => `${b.label}: ${b.note}`);
  return { score: clamp(total, 0, 99), breakdown, reasons };
}

module.exports = { scoreMatch };
