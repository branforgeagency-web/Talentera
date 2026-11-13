/**
 * Experienced Career Passport (8 stages).
 *
 * Storage: candidate.experienced = {
 *   stages:    { 1..8: { <sectionId>: {...} | [...], docs: [...] , chips... } },
 *   completed: [stage numbers saved as complete],
 *   uploads:   [{ id, url, name, size, mimetype, uploadedAt, docType }]   // server-issued uploads only
 *   published, publishedAt
 * }
 *
 * The schema (labels, keys, options, required flags) lives in data/experiencedSchema.json and is
 * shared with the frontend, so both sides always agree on field names.
 */
const SCHEMA = require("../data/experiencedSchema.json");
const { validateAadhaarNumber } = require("./verhoeffBackend");

const MAX_TEXT = 2000;
const MASKED_MOBILE = /^XXXXXX\d{4}$/;
const MASKED_AADHAAR = /^XXXX XXXX \d{4}$/;
const MASKED_PAN = /^XXXXX\d{4}[A-Z]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const RCM_RE = /(cod|bill|\bar\b|a\/r|denial|payment|posting|charge|claim|revenue|rcm|eligib|authori|credential|hcc|risk|audit|\bqa\b|quality|medical|health|insur|payer)/i;

const stageDef = (n) => SCHEMA.find((s) => s.num === n);
const fieldSections = (n) => (stageDef(n)?.sections || []).filter((s) => s.kind === "fields");

const str = (v) => (v === undefined || v === null ? "" : String(v).split("\u0000").join("").trim().slice(0, MAX_TEXT));
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function cleanFileValue(v, uploadUrls) {
  if (!isObj(v) || !v.url) return null;
  const url = String(v.url);
  if (!uploadUrls.has(url)) return null; // only files this candidate actually uploaded
  return { url, name: str(v.name).slice(0, 200), uploadedAt: v.uploadedAt || null };
}

function cleanEntry(fields, raw, uploadUrls) {
  const out = {};
  const src = isObj(raw) ? raw : {};
  for (const f of fields) {
    if (f.type === "file") {
      const fv = cleanFileValue(src[f.key], uploadUrls);
      if (fv) out[f.key] = fv;
      continue;
    }
    let v = str(src[f.key]);
    if (f.type === "select" && v && !f.options.includes(v)) v = "";
    out[f.key] = v;
  }
  if (src.id) out.id = str(src.id).slice(0, 60);
  return out;
}

/** Strip unknown keys, coerce types, drop file refs that weren't server-issued. */
function normalizeStage(n, body, uploads = []) {
  const def = stageDef(n);
  if (!def) return null;
  const uploadUrls = new Set((uploads || []).map((u) => u.url));
  const data = isObj(body) ? body : {};
  const out = {};
  for (const sec of def.sections) {
    if (sec.kind === "fields") {
      if (sec.repeatable) {
        const arr = Array.isArray(data[sec.id]) ? data[sec.id].slice(0, 30) : [];
        out[sec.id] = arr
          .map((e, i) => {
            const c = cleanEntry(sec.fields, e, uploadUrls);
            if (sec.id === "current-previous-employment-entry") {
              if (c.hasCareerGap !== "Yes") {
                c.careerGapDuration = "";
                c.careerGapReason = "";
              }
              const s = parseDate(c.dateOfJoining);
              const working = c.currentlyWorkingHere === "Yes";
              const end = working ? new Date() : parseDate(c.lastWorkingDate);
              if (s && end && end >= s) {
                c.employmentDuration = fmtMonths(monthsBetween(s, end));
              }
            }
            if (!c.id) c.id = `${sec.id}_${Date.now().toString(36)}${i}`;
            return c;
          })
          // an entry with no content at all is a blank form row, not data
          .filter((c) => Object.entries(c).some(([k, v]) => k !== "id" && (typeof v === "object" ? v : v !== "")));
      } else {
        out[sec.id] = cleanEntry(sec.fields, data[sec.id], uploadUrls);
      }
    } else if (sec.kind === "docslots") {
      const src = isObj(data[sec.id]) ? data[sec.id] : {};
      const docs = {};
      for (const slot of sec.slots) {
        const fv = cleanFileValue(isObj(src.documents) ? src.documents[slot.key] : null, uploadUrls);
        if (fv) docs[slot.key] = fv;
      }
      const o = { documents: docs };
      for (const nf of sec.numbers) o[nf.key] = str(src[nf.key]).slice(0, 20).toUpperCase();
      for (const slot of sec.slots) if (slot.naKey) o[slot.naKey] = src[slot.naKey] === "Yes" ? "Yes" : "";
      out[sec.id] = o;
    } else if (sec.kind === "chips") {
      const arr = Array.isArray(data[sec.key]) ? data[sec.key] : [];
      out[sec.key] = [...new Set(arr.map(str))].filter((x) => sec.options.includes(x));
    } else if (sec.kind === "docs") {
      const arr = Array.isArray(data.docs) ? data.docs : [];
      out.docs = arr
        .map((d) => cleanFileValue(d, uploadUrls) && { ...cleanFileValue(d, uploadUrls), docType: str(d.docType).slice(0, 60) })
        .filter(Boolean)
        .slice(0, 40);
    }
  }
  if (n === 2 && out["training-applicability"]?.attendedAcademyTraining === "Not Applicable") out["training-academy-history"] = [];
  return out;
}

/* ---------------- dates & experience ---------------- */
function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
const monthsBetween = (a, b) => Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1));

function mergeIntervals(list) {
  const iv = list.filter(([a, b]) => a && b && b >= a).sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const cur of iv) {
    const last = merged[merged.length - 1];
    if (last && cur[0] <= last[1]) last[1] = new Date(Math.max(last[1], cur[1]));
    else merged.push([cur[0], new Date(cur[1])]);
  }
  return merged;
}
const sumMonths = (merged) => merged.reduce((t, [a, b]) => t + monthsBetween(a, b), 0);
const fmtMonths = (m) => {
  const y = Math.floor(m / 12);
  const mo = m % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", mo ? `${mo} mo` : ""].filter(Boolean).join(" ") || "0 mo";
};

/** Total + RCM-relevant experience from the employment timeline (overlaps counted once). */
function calcExperience(employment = [], now = new Date()) {
  const all = [];
  const rcm = [];
  let current = null;
  for (const e of employment) {
    const start = parseDate(e.dateOfJoining);
    const working = e.currentlyWorkingHere === "Yes";
    const end = working ? now : parseDate(e.lastWorkingDate);
    if (!start || !end) continue;
    all.push([start, end]);
    if (RCM_RE.test(`${e.designation} ${e.department} ${e.rolesResponsibilities} ${e.domainProcessHandled || ""}`)) rcm.push([start, end]);
    if (working) current = e;
  }
  const totalMonths = sumMonths(mergeIntervals(all));
  const rcmMonths = sumMonths(mergeIntervals(rcm));
  return {
    totalMonths,
    rcmMonths,
    totalYears: Math.round((totalMonths / 12) * 10) / 10,
    rcmYears: Math.round((rcmMonths / 12) * 10) / 10,
    totalLabel: fmtMonths(totalMonths),
    rcmLabel: fmtMonths(rcmMonths),
    currentEmployer: current ? current.companyName : "",
  };
}

/* ---------------- validation ---------------- */
function validateStage(n, data, uploads = []) {
  const errors = [];
  const req = (obj, fields, label) => {
    for (const f of fields) if (f.required && !str(obj?.[f.key])) errors.push(`${label}${f.label} is required.`);
  };
  const num = (v, label, min, max) => {
    if (v === "" || v === undefined) return;
    const x = Number(v);
    if (!Number.isFinite(x) || x < min || x > max) errors.push(`${label} must be a number between ${min} and ${max}.`);
  };
  const today = new Date();

  if (n === 1) {
    const a = data["personal-contact"] || {};
    const c = data["current-career-status"] || {};
    req(a, fieldSections(1)[0].fields, "");
    req(c, fieldSections(1)[1].fields, "");
    const dsec = stageDef(1).sections.find((x) => x.kind === "docslots");
    const du = data[dsec.id] || {};
    if (!du.aadhaarNumber) errors.push("Aadhaar Card Number is required.");
    else if (!MASKED_AADHAAR.test(du.aadhaarNumber)) {
      const v = validateAadhaarNumber(du.aadhaarNumber);
      if (!v.valid) errors.push(v.error);
    }
    if (!du.panNumber) errors.push("PAN Number is required.");
    else if (!MASKED_PAN.test(du.panNumber) && !PAN_RE.test(du.panNumber)) errors.push("Enter a valid PAN number (e.g., ABCDE1234F).");
    for (const slot of dsec.slots) {
      if (slot.required && !du.documents?.[slot.key] && !(slot.naKey && du[slot.naKey] === "Yes")) errors.push(`Upload your ${slot.label}.`);
    }
    if (a.governmentIdType === "Aadhaar") {
      if (a.isGovtIdVerified !== "Yes") errors.push("Verify your Aadhaar with the OTP (DigiLocker) before continuing.");
    } else if (a.governmentIdType) {
      if (!a.governmentIdNumber || a.governmentIdNumber.replace(/\s/g, "").length < 5) errors.push(`Enter your ${a.governmentIdType} number.`);
      const m = String(a.idRegisteredMobile || "").replace(/\D/g, "");
      if (!m) errors.push("Enter the mobile number registered with your ID.");
      else if (!MASKED_MOBILE.test(a.idRegisteredMobile) && !/^[6-9]\d{9}$/.test(m.slice(-10))) errors.push("Enter a valid 10-digit registered mobile number.");
    }
    if (a.mobileNumber && !/^[6-9]\d{9}$/.test(a.mobileNumber.replace(/\D/g, "").slice(-10)))
      errors.push("Enter a valid 10-digit mobile number.");
    if (a.email && !/^\S+@\S+\.\S+$/.test(a.email)) errors.push("Enter a valid email address.");
    if (a.whatsappNumber && a.whatsappNumber.replace(/\D/g, "").length < 10) errors.push("Enter a valid WhatsApp number.");
    const dob = parseDate(a.dateOfBirth);
    if (a.dateOfBirth) {
      if (!dob || dob > today) errors.push("Date of birth is invalid.");
      else if (monthsBetween(dob, today) < 18 * 12) errors.push("Candidates must be at least 18 years old.");
    }
    if (["Currently Employed", "Serving Notice Period"].includes(c.currentEmploymentStatus)) {
      if (!c.currentCompany) errors.push("Current Company is required while employed.");
      if (!c.currentDesignation) errors.push("Current Designation is required while employed.");
      if (!c.noticePeriod) errors.push("Select whether you have a notice period.");
      else if (c.noticePeriod === "Yes") {
        const days = Number(c.noticePeriodDays);
        if (!c.noticePeriodDays) errors.push("Enter how many days your notice period is.");
        else if (!Number.isInteger(days) || days < 1 || days > 365) errors.push("Notice period must be a whole number of days between 1 and 365.");
      }
    }
  }

  if (n === 2) {
    const e = data.education || {};
    req(e, fieldSections(2)[0].fields, "");
    num(e.yearOfPassing, "Year of Passing", 1960, today.getFullYear() + 1);
    if (data["training-applicability"]?.attendedAcademyTraining === "Yes" && !(data["training-academy-history"] || []).length)
      errors.push("Add your academy / training details, or choose Not Applicable.");
    (data["training-academy-history"] || []).forEach((t, i) => {
      const s = parseDate(t.courseStartDate);
      const f = parseDate(t.courseCompletionDate);
      if (s && f && f < s) errors.push(`Training #${i + 1}: completion date is before the start date.`);
      if (!t.academyTrainingProvider && !t.courseName) errors.push(`Training #${i + 1}: add the provider or course name, or remove the entry.`);
    });
  }

  if (n === 3) {
    const list = data["current-previous-employment-entry"] || [];
    if (!list.length) errors.push("Add at least one employment entry.");
    let currentCount = 0;
    list.forEach((e, i) => {
      const L = `Employment #${i + 1}: `;
      req(e, fieldSections(3)[0].fields, L);
      const s = parseDate(e.dateOfJoining);
      if (e.dateOfJoining && (!s || s > today)) errors.push(`${L}Date of Joining is invalid or in the future.`);
      if (e.currentlyWorkingHere === "Yes") currentCount += 1;
      else if (!e.lastWorkingDate) errors.push(`${L}Last Working Date is required (or mark Currently Working Here = Yes).`);
      else {
        const l = parseDate(e.lastWorkingDate);
        if (!l || l > today) errors.push(`${L}Last Working Date is invalid or in the future.`);
        else if (s && l < s) errors.push(`${L}Last Working Date is before the Date of Joining.`);
      }
      if (e.hasCareerGap === "Yes") {
        if (!str(e.careerGapDuration)) errors.push(`${L}Exact Gap Duration is required when Career Gap is Yes.`);
        if (!str(e.careerGapReason)) errors.push(`${L}Reason for Career Gap is required when Career Gap is Yes.`);
      }
    });
    if (currentCount > 1) errors.push("Only one employment entry can be marked as Currently Working Here.");
  }

  if (n === 4) {
    if (!(data.domains || []).length) errors.push("Select at least one RCM domain / process.");
    const t = data["technical-expertise"] || {};
    req(t, fieldSections(4)[0].fields, "");
    num(t.yearsInCurrentDomain, "Years in Current Domain", 0, 60);
  }

  if (n === 5) {
    const p = data["performance-metrics"] || {};
    const l = data["leadership-achievements"] || {};
    ["qualityScorePct", "accuracyPct", "auditScorePct", "errorRatePct"].forEach((k) => num(p[k], fieldLabel(5, k), 0, 100));
    if (l.handledATeam === "Yes") {
      if (!l.teamSize) errors.push("Team Size is required when you have handled a team.");
      if (!l.leadershipRole) errors.push("Leadership Role is required when you have handled a team.");
    }
    num(l.teamSize, "Team Size", 0, 10000);
    num(l.yearsOfLeadershipExperience, "Years of Leadership Experience", 0, 60);
  }

  if (n === 6) {
    (data["add-certification"] || []).forEach((c, i) => {
      const L = `Certification #${i + 1}: `;
      req(c, fieldSections(6)[0].fields, L);
      const is = parseDate(c.issueDate);
      const ex = parseDate(c.expiryDate);
      if (c.issueDate && (!is || is > today)) errors.push(`${L}Issue Date is invalid or in the future.`);
      if (c.noExpiry !== "Yes" && is && ex && ex < is) errors.push(`${L}Expiry Date is before the Issue Date.`);
      if (c.credentialUrl && !/^https?:\/\/\S+$/i.test(c.credentialUrl)) errors.push(`${L}Credential URL must start with http:// or https://.`);
    });
    const ceu = data["ceu-continuing-education"] || {};
    num(ceu.ceuRequired, "CEU Required", 0, 10000);
    num(ceu.ceuCompleted, "CEU Completed", 0, 10000);
    const cs = parseDate(ceu.cycleStartDate);
    const ce = parseDate(ceu.cycleEndDate);
    if (cs && ce && ce < cs) errors.push("CEU cycle end date is before the start date.");
  }

  if (n === 7) {
    const d = data["career-documents"] || {};
    if (!d.latestResume) errors.push("Upload your latest resume.");
    const p = data["future-career-preferences"] || {};
    if (!p.availabilityToJoin) errors.push("Availability to Join is required.");
    if (!p.preferredLocation) errors.push("Preferred Location is required.");
  }

  if (n === 8) {
    const v = data["visibility-consent"] || {};
    req(v, fieldSections(8)[0].fields, "");
    if (v.consentToProcessProfessionalData && v.consentToProcessProfessionalData !== "Agree")
      errors.push("You must agree to the processing of your professional data to publish.");
  }
  return errors;
}

function fieldLabel(n, key) {
  for (const s of fieldSections(n)) for (const f of s.fields) if (f.key === key) return f.label;
  return key;
}

/**
 * The ID-verified flag and the identity values UIDAI returned are owned by the server (set by the DigiLocker
 * flow in routes/aadhaar.js). A client save may never set or clear them, and once verified the identity fields are locked.
 */
const ID_LOCKED = ["fullName", "dateOfBirth", "gender", "governmentIdType", "governmentIdNumber"];
function enforceIdLock(n, data, oldStage1) {
  if (n !== 1 || !data["personal-contact"]) return data;
  const pc = data["personal-contact"];
  pc.governmentIdType = "Aadhaar"; // Aadhaar is the only accepted government ID
  const old = (oldStage1 && oldStage1["personal-contact"]) || {};
  if (old.isGovtIdVerified === "Yes") {
    ID_LOCKED.forEach((k) => { pc[k] = old[k] || ""; });
    pc.isGovtIdVerified = "Yes";
    pc.maskedGovtId = old.maskedGovtId || "";
    const oldUd = oldStage1["upload-your-documents"] || {};
    if (data["upload-your-documents"] && oldUd.aadhaarNumber) data["upload-your-documents"].aadhaarNumber = oldUd.aadhaarNumber;
  } else {
    pc.isGovtIdVerified = "";
    pc.maskedGovtId = "";
  }
  return data;
}

/** Aadhaar / PAN are only ever stored masked (same policy as the rest of the app). Call after validation. */
function maskSensitive(n, data) {
  if (n !== 1) return data;
  const sec = stageDef(1).sections.find((x) => x.kind === "docslots");
  const d = data[sec.id];
  if (d) {
    const a = String(d.aadhaarNumber || "");
    const digits = a.replace(/\D/g, "");
    d.aadhaarNumber = MASKED_AADHAAR.test(a) ? a : digits.length === 12 ? `XXXX XXXX ${digits.slice(-4)}` : "";
    const p = String(d.panNumber || "");
    d.panNumber = MASKED_PAN.test(p) ? p : PAN_RE.test(p) ? `XXXXX${p.slice(5, 9)}${p[9]}` : "";
  }
  const pc = data["personal-contact"];
  if (pc && pc.governmentIdNumber) {
    const raw = String(pc.governmentIdNumber).replace(/\s/g, "");
    if (/^\d{12}$/.test(raw)) {
      pc.governmentIdNumber = `XXXX XXXX ${raw.slice(-4)}`;
    } else if (raw.length > 4 && !raw.startsWith("****") && !raw.startsWith("XXXX")) {
      pc.governmentIdNumber = `****${raw.slice(-4)}`;
    }
  }
  if (pc && pc.idRegisteredMobile) {
    const m = String(pc.idRegisteredMobile).replace(/\D/g, "");
    if (m.length === 10 && !m.startsWith("XXXXXX")) {
      pc.idRegisteredMobile = `XXXXXX${m.slice(-4)}`;
    }
  }
  return data;
}

/* ---------------- score ---------------- */
const filled = (o) => Object.values(o || {}).filter((v) => v !== "" && v != null).length;

function calculatePassportScore(candidate) {
  const px = candidate?.experienced || {};
  const st = px.stages || {};
  const done = new Set(px.completed || []);
  const pts = {};
  const uploads = px.uploads || [];

  if (done.has(1)) {
    const idDocs = st[1]?.["upload-your-documents"]?.documents || {};
    const hasId = candidate.stage1?.aadhaarVerified === true || candidate.stage1?.aadhaarStatus === "VERIFIED" || st[1]?.["personal-contact"]?.isGovtIdVerified === "Yes" || Boolean(idDocs.aadhaarCard && idDocs.panCard);
    pts[1] = 10 + (hasId ? 5 : 0);
  }
  if (done.has(2)) pts[2] = 6 + ((st[2]?.["training-academy-history"] || []).length || st[2]?.["training-applicability"]?.attendedAcademyTraining === "Not Applicable" ? 4 : 0);
  if (done.has(3)) {
    const exp = calcExperience(st[3]?.["current-previous-employment-entry"] || []);
    const tier = exp.totalYears >= 5 ? 5 : exp.totalYears >= 3 ? 4 : exp.totalYears >= 2 ? 3 : exp.totalYears >= 1 ? 2 : 1;
    const s1d = st[1]?.["upload-your-documents"]?.documents || {};
    const proof = (st[3]?.docs || []).length > 0 || Boolean(s1d.currentOfferLetter || s1d.previousRelievingLetter || s1d.updatedResume || s1d.experienceLetters) || (st[7]?.["career-documents"] && ["offerLetter", "experienceLetter", "relievingLetter", "latestPayslip"].some((k) => st[7]["career-documents"][k]));
    pts[3] = 15 + tier + (proof ? 5 : 0);
  }
  if (done.has(4)) pts[4] = 10;
  if (done.has(5)) pts[5] = 5 + (filled(st[5]?.["performance-metrics"]) >= 3 ? 5 : 0);
  if (done.has(6)) {
    const certs = st[6]?.["add-certification"] || [];
    pts[6] = Math.min(15, certs.reduce((t, c) => t + (c.certificateUpload ? 5 : 3), 0));
  }
  if (done.has(7)) {
    const d = st[7]?.["career-documents"] || {};
    const support = ["offerLetter", "experienceLetter", "relievingLetter", "latestPayslip", "otherSupportingDocument"].filter((k) => d[k]).length;
    pts[7] = 4 + Math.min(6, support * 2);
  }
  if (px.published && done.has(8)) pts[8] = 5;

  const score = Math.min(100, Object.values(pts).reduce((a, b) => a + b, 0));
  const completed = [...done].sort((a, b) => a - b);
  void uploads;
  return {
    score,
    verificationScore: score,
    maxScore: 100,
    verifiedStages: completed,
    stageScores: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((n) => [n, pts[n] || 0])),
    badgeTier: score >= 75 ? "Talentera Verified" : "In Progress",
    isGoldBadge: score >= 75,
  };
}

/* ---------------- legacy sync (company views, matching, jobs, resume) ---------------- */
const splitLocs = (s) => str(s).split(/[,;|]/).map((x) => x.trim()).filter(Boolean);

function syncLegacy(candidate) {
  const px = candidate.experienced || {};
  const st = px.stages || {};
  const done = px.completed || [];
  const a = st[1]?.["personal-contact"] || {};
  const c = st[1]?.["current-career-status"] || {};
  const edu = st[2]?.education || {};
  const emp = st[3]?.["current-previous-employment-entry"] || [];
  const exp = calcExperience(emp);
  const tech = st[4]?.["technical-expertise"] || {};
  const certs = st[6]?.["add-certification"] || [];
  const prefs = st[7]?.["future-career-preferences"] || {};
  const vis = st[8]?.["visibility-consent"] || {};
  const locs = splitLocs(c.preferredWorkLocation);

  if (done.includes(1) || a.fullName) {
    candidate.stage1 = {
      ...(candidate.stage1 || {}),
      fullName: a.fullName || candidate.stage1?.fullName || "",
      mobile: str(a.mobileNumber).replace(/\D/g, "").slice(-10) || candidate.stage1?.mobile || "",
      email: a.email || candidate.stage1?.email || candidate.email || "",
      whatsapp: a.whatsappNumber || "",
      dob: a.dateOfBirth || candidate.stage1?.dob || "",
      gender: a.gender || "",
      maskedAadhaar: st[1]?.["upload-your-documents"]?.aadhaarNumber || candidate.stage1?.maskedAadhaar || "",
      maskedPan: st[1]?.["upload-your-documents"]?.panNumber || "",
      city: locs[0] || candidate.stage1?.city || "",
      preferredCities: locs,
      experience: "Experienced",
      currentRole: c.currentDesignation || tech.primaryDomain || "",
      currentCompany: c.currentCompany || exp.currentEmployer || "",
      employmentStatus: c.currentEmploymentStatus || "",
      noticePeriod: c.noticePeriod === "Yes" && c.noticePeriodDays ? `${c.noticePeriodDays} Days` : c.noticePeriod === "No" ? "Immediate" : "",
      workMode: c.preferredWorkMode || "",
      degree: edu.degreeCourse || "",
      collegeName: edu.collegeName || "",
      graduationYear: edu.yearOfPassing || "",
      cgpa: edu.percentageCgpa || "",
    };
    candidate.markModified("stage1");
  }
  if (done.includes(2) || done.includes(3) || done.includes(4)) {
    candidate.stage2 = {
      ...(candidate.stage2 || {}),
      domain: tech.primaryDomain || c.primaryCareerCategory || "",
      specialty: tech.specialtyHandled || "",
      totalExperience: exp.totalYears ? `${exp.totalYears} years` : "",
      relevantExperience: exp.rcmYears ? `${exp.rcmYears} years` : "",
      employmentStatus: c.currentEmploymentStatus === "Currently Employed" ? "working" : (candidate.stage2?.employmentStatus || ""),
      workHistory: emp.map((e) => ({
        company: e.companyName, designation: e.designation, from: e.dateOfJoining,
        to: e.currentlyWorkingHere === "Yes" ? "Present" : e.lastWorkingDate,
      })),
      proofDocUrl: (st[3]?.docs || [])[0]?.url || st[1]?.["upload-your-documents"]?.documents?.currentOfferLetter?.url || candidate.stage2?.proofDocUrl || "",
      provisionalCertificateUrl: st[1]?.["upload-your-documents"]?.documents?.provisionalCertificate?.url || "",
      trainingCertificateUrl: st[1]?.["upload-your-documents"]?.documents?.trainingCertificate?.url || "",
    };
    candidate.markModified("stage2");
  }
  if (done.includes(6)) {
    const list = certs.map((x) => ({
      name: x.certificationName, certName: x.certificationName, issuer: x.issuingOrganization,
      id: x.certificationId, issueDate: x.issueDate, expiryDate: x.expiryDate,
      status: x.certificationStatus, docUrl: x.certificateUpload?.url || "",
    }));
    candidate.stage3 = certs.length
      ? { ...(candidate.stage3 || {}), skipped: false, certifications: list, certName: list[0].name, name: list[0].name }
      : { ...(candidate.stage3 || {}), skipped: true, certifications: [] };
    candidate.markModified("stage3");
  }
  if (done.includes(8) || prefs.expectedSalaryCtc) {
    const live = px.published ? vis.profileVisibility !== "Private" && vis.openToOpportunities !== "No" : false;
    candidate.stage8 = {
      ...(candidate.stage8 || {}),
      expectedCtc: prefs.expectedSalaryCtc || "",
      ctc: prefs.expectedSalaryCtc || "",
      role: prefs.preferredDesignation || "",
      liveForHiring: live,
      isLive: live,
      consent: vis.consentToProcessProfessionalData === "Agree",
    };
    candidate.markModified("stage8");
  }
  candidate.completedStages = [...done].sort((a, b) => a - b);
  candidate.markModified("completedStages");
}

module.exports = { enforceIdLock, maskSensitive, SCHEMA, stageDef, normalizeStage, validateStage, calcExperience, calculatePassportScore, syncLegacy };
