import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";
import SCHEMA from "../../data/experiencedSchema.json";
import { CERT_LIBRARY } from "../../data/certLibrary";
import PassportSummary, { PassportDocuments } from "./PassportSummary.jsx";
import { PASSPORT_MAX_POINTS } from "./passportUtils.js";
import IdVerification, { useDigilockerPopupBridge } from "./IdVerification.jsx";
import "./ExperiencedPassport.css";

const STAGE_COUNT = SCHEMA.length;
const TAB_LABELS = ['Identity', 'Education', 'Employment', 'RCM', 'Performance', 'Certificates', 'Documents', 'Passport'];
const OPTIONAL_STAGES = [5, 6]; // can be saved empty
const EMPLOYED = ["Currently Employed", "Serving Notice Period"];
const DOMAIN_UNIT = {
  "Medical Coding": "Charts per day", "Medical Billing": "Claims per day", AR: "Accounts per day",
  "Denial Management": "Denials worked per day", "Payment Posting": "Payments posted per day",
  "Charge Entry": "Charges entered per day", "Eligibility Verification": "Verifications per day",
  "Prior Authorization": "Authorizations per day", Credentialing: "Applications per day",
  "HCC / Risk Adjustment": "Charts reviewed per day", "QA / Audit": "Charts audited per day", Training: "Trainees per batch",
};

const blank = (fields) => Object.fromEntries(fields.map((f) => [f.key, ""]));
const newId = () => `e_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function emptySlots(sec) {
  const o = { documents: {} };
  sec.numbers.forEach((n) => { o[n.key] = ""; });
  sec.slots.forEach((sl) => { if (sl.naKey) o[sl.naKey] = ""; });
  return o;
}

function emptyStage(stage) {
  const d = {};
  for (const sec of stage.sections) {
    if (sec.kind === "fields") d[sec.id] = sec.repeatable ? [] : blank(sec.fields);
    else if (sec.kind === "chips") d[sec.key] = [];
    else if (sec.kind === "docslots") d[sec.id] = emptySlots(sec);
    else if (sec.kind === "docs") d.docs = [];
  }
  return d;
}

// merge saved data over the empty shape so every input is controlled
function hydrate(stage, saved) {
  const d = emptyStage(stage);
  if (!saved) return d;
  for (const sec of stage.sections) {
    if (sec.kind === "fields") {
      if (sec.repeatable) d[sec.id] = (saved[sec.id] || []).map((e) => ({ ...blank(sec.fields), ...e }));
      else d[sec.id] = { ...blank(sec.fields), ...(saved[sec.id] || {}) };
    } else if (sec.kind === "chips") d[sec.key] = saved[sec.key] || [];
    else if (sec.kind === "docslots") d[sec.id] = { ...emptySlots(sec), ...(saved[sec.id] || {}), documents: { ...((saved[sec.id] || {}).documents || {}) } };
    else if (sec.kind === "docs") d.docs = saved.docs || [];
  }
  return d;
}

function isHidden(stageNum, secId, key, entry, all) {
  if (stageNum === 1 && secId === "current-career-status") {
    const st = entry.currentEmploymentStatus;
    if (key === "noticePeriod") return !EMPLOYED.includes(st);
    if (key === "noticePeriodDays") return !EMPLOYED.includes(st) || entry.noticePeriod !== "Yes";
    if (key === "currentCompany" || key === "currentDesignation") return ["Not Currently Working", "Career Break"].includes(st);
  }
  if (stageNum === 3 && (key === "careerGapDuration" || key === "careerGapReason")) {
    return entry.hasCareerGap !== "Yes";
  }
  if (stageNum === 5 && secId === "leadership-achievements" && ["teamSize", "leadershipRole", "yearsOfLeadershipExperience"].includes(key))
    return entry.handledATeam !== "Yes";
  if (stageNum === 6 && key === "expiryDate") return entry.noExpiry === "Yes";
  void all;
  return false;
}

function clientExperience(entries) {
  const now = new Date();
  const iv = [];
  for (const e of entries) {
    const a = e.dateOfJoining ? new Date(e.dateOfJoining) : null;
    const b = e.currentlyWorkingHere === "Yes" ? now : e.lastWorkingDate ? new Date(e.lastWorkingDate) : null;
    if (a && b && !Number.isNaN(a) && !Number.isNaN(b) && b >= a) iv.push([a, b]);
  }
  iv.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const c of iv) {
    const l = merged[merged.length - 1];
    if (l && c[0] <= l[1]) l[1] = new Date(Math.max(l[1], c[1]));
    else merged.push([c[0], new Date(c[1])]);
  }
  const months = merged.reduce((t, [a, b]) => t + Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth()), 0);
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo` : ""].filter(Boolean).join(" ") || "—";
}

function formatDurationBetween(startStr, endStr) {
  if (!startStr || !endStr) return "";
  const a = new Date(startStr);
  const b = new Date(endStr);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return "";
  const months = Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1));
  if (months < 1) {
    const days = Math.round((b - a) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days` : "1 day";
  }
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} yr${y > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} mo${m > 1 ? "s" : ""}`);
  return parts.join(" ") || "1 mo";
}

function isImageFile(url, name) {
  return /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(url || name || "");
}

function isPdfFile(url, name) {
  return /\.pdf($|\?)/i.test(url || name || "");
}

function DocumentPreviewModal({ file, onClose }) {
  if (!file) return null;
  const isImg = isImageFile(file.url, file.name);
  const isPdf = isPdfFile(file.url, file.name) || (!isImg && !/\.(docx?|xlsx?)($|\?)/i.test(file.name || ""));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 25, 47, 0.78)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          width: "100%",
          maxWidth: 920,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#F8FAFC",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: isImg ? "#ECFDF5" : isPdf ? "#FEE2E2" : "#EFF6FF",
                color: isImg ? "#059669" : isPdf ? "#DC2626" : "#2563EB",
                display: "grid",
                placeItems: "center",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              <i className={isImg ? "fa-solid fa-image" : isPdf ? "fa-solid fa-file-pdf" : "fa-solid fa-file-lines"} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {file.title || file.name || "Document Preview"}
              </div>
              <div style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {file.name || "Attached document"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {file.url && (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  color: "#0A2540",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 11 }} /> Open in New Tab
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748B",
                fontSize: 22,
                cursor: "pointer",
                padding: "4px 8px",
                lineHeight: 1,
              }}
              title="Close preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#F1F5F9", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          {isImg ? (
            <img
              src={file.url}
              alt={file.name || "Preview"}
              style={{
                maxWidth: "100%",
                maxHeight: "72vh",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                background: "#FFFFFF",
              }}
            />
          ) : isPdf ? (
            <iframe
              src={file.url}
              title={file.name || "PDF Document"}
              style={{
                width: "100%",
                height: "72vh",
                border: "none",
                borderRadius: 8,
                background: "#FFFFFF",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <i className="fa-solid fa-file-lines" style={{ fontSize: 48, color: "#64748B", marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{file.name}</div>
              <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>Preview is not directly supported in-browser for this format.</div>
              <a
                href={file.url}
                download={file.name}
                style={{
                  background: "#0A2540",
                  color: "#FFFFFF",
                  padding: "8px 18px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="fa-solid fa-download" /> Download Document
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const EMPTY_SET = new Set();
const isEmptyVal = (v) => v === undefined || v === null || (typeof v === "string" && !v.trim()) || (typeof v === "object" && !Array.isArray(v) && !v.url);

// Conditionally-required fields (kept in step with validateStage in backend/utils/experiencedPassport.js)
function conditionallyRequired(stageNum, secId, key, entry) {
  if (stageNum === 1 && secId === "current-career-status") return EMPLOYED.includes(entry.currentEmploymentStatus) && (["noticePeriod", "currentCompany", "currentDesignation"].includes(key) || (key === "noticePeriodDays" && entry.noticePeriod === "Yes"));
  if (stageNum === 3 && key === "lastWorkingDate") return entry.currentlyWorkingHere !== "Yes";
  if (stageNum === 5 && secId === "leadership-achievements") return entry.handledATeam === "Yes" && ["teamSize", "leadershipRole"].includes(key);
  if (stageNum === 7 && secId === "career-documents") return key === "latestResume";
  if (stageNum === 7 && secId === "future-career-preferences") return ["availabilityToJoin", "preferredLocation"].includes(key);
  return false;
}

/** Ids of every required input that is still empty on this stage (drives the red highlighting). */
function computeMissing(stageNum, data) {
  const out = new Set();
  const stageDefn = SCHEMA[stageNum - 1];
  if (!stageDefn || !data) return out;
  const checkEntry = (sec, entry, idx) => {
    for (const f of sec.fields) {
      if (f.source === "system" || isHidden(stageNum, sec.id, f.key, entry, null)) continue;
      if ((f.required || conditionallyRequired(stageNum, sec.id, f.key, entry)) && isEmptyVal(entry[f.key])) out.add(`${sec.id}:${f.key}:${idx === undefined ? "" : idx}`);
    }
  };
  for (const sec of stageDefn.sections) {
    if (sec.kind === "fields") {
      if (sec.repeatable) {
        const list = data[sec.id] || [];
        if (stageNum === 3 && !list.length) out.add(`rep:${sec.id}`);
        list.forEach((e, i) => checkEntry(sec, e, i));
      } else checkEntry(sec, data[sec.id] || {}, undefined);
    } else if (sec.kind === "chips") {
      if (!(data[sec.key] || []).length) out.add(`chips:${sec.key}`);
    } else if (sec.kind === "docslots") {
      const d = data[sec.id] || {};
      sec.numbers.forEach((n) => { if (n.required && isEmptyVal(d[n.key])) out.add(`${sec.id}:num:${n.key}`); });
      sec.slots.forEach((sl) => { if (sl.required && isEmptyVal(d.documents?.[sl.key]) && !(sl.naKey && d[sl.naKey] === "Yes")) out.add(`${sec.id}:slot:${sl.key}`); });
    }
  }
  if (stageNum === 1) {
    const pc = data["personal-contact"] || {};
    if (pc.governmentIdType === "Aadhaar" && pc.isGovtIdVerified !== "Yes") out.add("idverify");
  }
  return out;
}

export default function ExperiencedPassportWizard({ candidate, initialStage, onChanged, onBackToDashboard, onPublished }) {
  useDigilockerPopupBridge(); // when this page is the DigiLocker popup redirect, tell the opener and close
  const [px, setPx] = useState(null);
  const [form, setForm] = useState({});
  const [attempted, setAttempted] = useState(false); // user pressed Save / Continue / Publish: show red on what is missing
  const [active, setActive] = useState(1);
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const topRef = useRef(null);

  // Stage 6 certifications state (Fresher-style dropdown & multiple cert picker)
  const [certBodyKey, setCertBodyKey] = useState("aapc");
  const [certSearch, setCertSearch] = useState("");
  const [selectedCertCode, setSelectedCertCode] = useState("CPC");
  const [editingCertIdx, setEditingCertIdx] = useState(null);
  const [draftCert, setDraftCert] = useState({
    certificationCategory: "Medical Coding",
    certificationCode: "CPC",
    certificationName: "Certified Professional Coder",
    issuingOrganization: "AAPC",
    certificationId: "",
    issueDate: "",
    expiryDate: "",
    noExpiry: "No",
    certificationStatus: "Active",
    specialization: "",
    certificateUpload: null,
    credentialUrl: "",
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setPreviewDoc(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const buildForm = useCallback((payload) => {
    const f = {};
    for (const st of SCHEMA) f[st.num] = hydrate(st, payload.stages?.[st.num]);
    // first-time prefill of Stage 1 from what the account already knows
    const s1 = f[1]["personal-contact"];
    const c = candidate?.stage1 || {};
    if (!s1.fullName) s1.fullName = c.fullName || "";
    if (!s1.mobileNumber) s1.mobileNumber = c.mobile || candidate?.mobile || "";
    if (!s1.email) s1.email = c.email || candidate?.email || "";
    s1.governmentIdType = "Aadhaar"; // only Aadhaar is accepted
    // older saves stored the notice period as text/number ("30 Days", "Immediate", "45"); map them to Yes/No + days
    const cs = f[1]["current-career-status"];
    if (cs.noticePeriod && !["Yes", "No"].includes(cs.noticePeriod)) {
      const m = String(cs.noticePeriod).match(/\d+/);
      const days = /immediate/i.test(cs.noticePeriod) ? 0 : m ? Number(m[0]) : null;
      if (days === null) cs.noticePeriod = "";
      else if (days === 0) cs.noticePeriod = "No";
      else { cs.noticePeriod = "Yes"; cs.noticePeriodDays = String(days); }
    }
    // documents already uploaded in Stage 1 are reused in Stage 7 instead of asking twice
    const s1d = f[1]["upload-your-documents"].documents || {};
    const cd = f[7]["career-documents"];
    if (!cd.latestResume && s1d.updatedResume) cd.latestResume = s1d.updatedResume;
    if (!cd.offerLetter && s1d.currentOfferLetter) cd.offerLetter = s1d.currentOfferLetter;
    if (!cd.relievingLetter && s1d.previousRelievingLetter) cd.relievingLetter = s1d.previousRelievingLetter;
    if (!cd.experienceLetter && s1d.experienceLetters) cd.experienceLetter = s1d.experienceLetters;
    return f;
  }, [candidate]);

  useEffect(() => {
    let alive = true;
    api.get("/candidate/passport")
      .then((res) => {
        if (!alive) return;
        setPx(res.data);
        setForm(buildForm(res.data));
        const done = res.data.completed || [];
        let first = 1;
        while (first <= STAGE_COUNT && done.includes(first)) first += 1;
        const want = Number(initialStage);
        const target = want >= 1 && want <= STAGE_COUNT && (want === 1 || done.includes(want - 1) || done.includes(want)) ? want : Math.min(first, STAGE_COUNT);
        setActive(target);
      })
      .catch((e) => alive && setLoadError(e?.response?.data?.message || "Could not load your Career Passport. Please refresh."));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completed = px?.completed || [];
  const unlocked = (n) => n === 1 || completed.includes(n) || completed.includes(n - 1);
  const stage = SCHEMA[active - 1];
  const data = form[active] || {};
  const invalid = attempted ? computeMissing(active, data) : EMPTY_SET;
  const pct = Math.round((completed.length / STAGE_COUNT) * 100);

  const goto = (n) => {
    if (!unlocked(n)) { setNotice(`Complete Stage ${n - 1} first.`); return; }
    setErrors([]); setNotice(""); setAttempted(false); setActive(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const patch = (fn) => setForm((f) => { const next = { ...f, [active]: JSON.parse(JSON.stringify(f[active])) }; fn(next[active]); return next; });
  const setVal = (secId, key, value, idx) => patch((d) => {
    if (idx === undefined) {
      d[secId][key] = value;
    } else {
      d[secId][idx][key] = value;
      if (secId === "current-previous-employment-entry") {
        if (key === "hasCareerGap" && value !== "Yes") {
          d[secId][idx].careerGapDuration = "";
          d[secId][idx].careerGapReason = "";
        }
        if (key === "dateOfJoining" || key === "lastWorkingDate" || key === "currentlyWorkingHere") {
          const item = d[secId][idx];
          const calc = clientExperience([item]);
          if (calc && calc !== "—") item.employmentDuration = calc;
        }
      }
      if (secId === "training-academy-history" && (key === "courseStartDate" || key === "courseCompletionDate")) {
        const item = d[secId][idx];
        const s = key === "courseStartDate" ? value : item.courseStartDate;
        const e = key === "courseCompletionDate" ? value : item.courseCompletionDate;
        const autoDur = formatDurationBetween(s, e);
        if (autoDur && !item.trainingDuration) {
          item.trainingDuration = autoDur;
        }
      }
    }
  });
  const addEntry = (sec) => patch((d) => { d[sec.id].push({ ...blank(sec.fields), id: newId() }); });
  const removeEntry = (sec, idx) => patch((d) => { d[sec.id].splice(idx, 1); });
  // DigiLocker finished: the server saved the verified identity - pull it into the open form.
  async function onIdVerified() {
    try {
      const res = await api.get("/candidate/passport");
      setPx(res.data);
      const pc = res.data.stages?.[1]?.["personal-contact"] || {};
      const ud = res.data.stages?.[1]?.["upload-your-documents"] || {};
      patch((d) => {
        ["fullName", "dateOfBirth", "gender", "governmentIdType", "governmentIdNumber", "isGovtIdVerified", "maskedGovtId"].forEach((k) => {
          if (pc[k]) d["personal-contact"][k] = pc[k];
        });
        if (ud.aadhaarNumber && d["upload-your-documents"]) d["upload-your-documents"].aadhaarNumber = ud.aadhaarNumber;
      });
      setErrors([]);
      setNotice("Aadhaar verified via DigiLocker. Your identity details have been filled in and locked.");
      if (onChanged) onChanged(res.data);
    } catch (err) {
      setErrors([err?.response?.data?.message || "Verified, but could not refresh your profile. Please reload the page."]);
    }
  }
  const setNum = (secId, key, value) => patch((d) => { d[secId][key] = value; });
  const setSlot = (secId, slotKey, ref) => patch((d) => { if (ref) d[secId].documents[slotKey] = ref; else delete d[secId].documents[slotKey]; });
  const toggleChip = (sec, opt) => patch((d) => { const a = d[sec.key]; d[sec.key] = a.includes(opt) ? a.filter((x) => x !== opt) : [...a, opt]; });

  async function upload(file, docType) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("docType", docType || "");
    const res = await api.post("/candidate/passport/upload", fd);
    return { url: res.data.file.url, name: res.data.file.name, uploadedAt: res.data.file.uploadedAt };
  }

  async function onPickFile(e, secId, key, idx, docType) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setErrors(["Files must be 10 MB or smaller."]); return; }
    setBusy(`file:${secId}:${key}${idx !== undefined ? `:${idx}` : ""}`); setErrors([]);
    try {
      const ref = await upload(file, docType);
      setVal(secId, key, ref, idx);
    } catch (err) { setErrors([err?.response?.data?.message || "Upload failed. Please try again."]); }
    setBusy("");
  }

  async function onPickSlot(e, sec, slot) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setErrors(["Files must be 10 MB or smaller."]); return; }
    setBusy(`slot:${slot.key}`); setErrors([]);
    try { setSlot(sec.id, slot.key, await upload(file, slot.label)); }
    catch (err) { setErrors([err?.response?.data?.message || "Upload failed. Please try again."]); }
    setBusy("");
  }

  async function onPickDocs(e, docType) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setBusy("docs"); setErrors([]);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB.`);
        const ref = await upload(file, docType);
        patch((d) => { d.docs.push({ ...ref, docType }); });
      }
    } catch (err) { setErrors([err?.response?.data?.message || err.message || "Upload failed."]); }
    setBusy("");
  }

  function showMissing(missing) {
    setAttempted(true);
    setErrors(["Please fill in the highlighted required fields (shown in red)."]);
    setNotice("");
    setTimeout(() => {
      const el = document.querySelector(".xp-field.err, .xp-doc.err, .xp-chips.err, .xp-idbox.err, .xp-err-card");
      (el || topRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    return missing;
  }

  async function save(draft) {
    if (!draft) {
      const missing = computeMissing(active, form[active]);
      if (missing.size) { showMissing(missing); return; }
    }
    setBusy(draft ? "draft" : "save"); setErrors([]); setNotice("");
    try {
      const res = await api.put(`/candidate/passport/stage/${active}`, { data: form[active], isDraft: draft });
      setPx(res.data);
      setForm((f) => ({ ...f, [active]: hydrate(stage, res.data.stages?.[active]) }));
      if (onChanged) onChanged(res.data.candidate ? { candidate: res.data.candidate, ...res.data } : res.data);
      if (draft) setNotice("Draft saved.");
      else goto(Math.min(STAGE_COUNT, active + 1));
    } catch (err) {
      const d = err?.response?.data;
      setErrors(d?.errors?.length ? d.errors : [d?.message || "Could not save. Please try again."]);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setBusy("");
  }

  async function publish() {
    const missing = computeMissing(8, form[8]);
    if (missing.size) { setActive(8); showMissing(missing); return; }
    setBusy("publish"); setErrors([]);
    try {
      const res = await api.post("/candidate/passport/publish", { data: form[8] });
      setPx(res.data);
      if (onChanged) onChanged({ candidate: res.data.candidate, ...res.data });
      if (onPublished) onPublished(res.data);
    } catch (err) {
      const d = err?.response?.data;
      setErrors(d?.errors?.length ? d.errors : [d?.message || "Could not publish. Please try again."]);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setBusy("");
  }

  const domains = form[4]?.domains || [];
  const unitHint = DOMAIN_UNIT[domains[0]] || "Charts / Claims / Accounts / Calls per day";
  const employment = form[3]?.["current-previous-employment-entry"] || [];
  const expLabel = useMemo(() => clientExperience(employment), [employment]);

  if (loadError) return <div className="xp-main"><div className="xp-alert">{loadError}</div></div>;
  if (!px) return <div style={{ padding: 40, textAlign: "center" }}>Loading your Career Passport…</div>;

  const renderField = (sec, f, entry, idx) => {
    if (isHidden(active, sec.id, f.key, entry, form)) return null;
    if (f.source === "system") return null; // server-owned (e.g. ID Verified) - never editable
    const val = entry[f.key];
    const idLocked = active === 1 && sec.id === "personal-contact" && entry.isGovtIdVerified === "Yes" &&
      ["fullName", "dateOfBirth", "gender", "governmentIdType", "governmentIdNumber"].includes(f.key);
    // Mobile numbers take exactly 10 digits and the Aadhaar number exactly 12 - nothing else can be typed.
    const digitLimit = f.type === "tel" || ["mobileNumber", "whatsappNumber", "idRegisteredMobile"].includes(f.key) ? 10 : f.key === "governmentIdNumber" ? 12 : 0;
    const common = {
      value: f.type === "file" ? undefined : val ?? "",
      onChange: (e) => setVal(sec.id, f.key, digitLimit ? e.target.value.replace(/\D/g, "").slice(0, digitLimit) : e.target.value, idx),
      disabled: idLocked,
      ...(digitLimit ? { inputMode: "numeric", maxLength: digitLimit, autoComplete: "off" } : {}),
    };
    const wide = f.type === "textarea";
    const fid = `${sec.id}:${f.key}:${idx === undefined ? "" : idx}`;
    const bad = invalid.has(fid);
    let input;
    if (f.type === "select") {
      input = (<select {...common}><option value="">Select</option>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>);
    } else if (f.type === "textarea") {
      input = <textarea {...common} placeholder={f.placeholder || ""} maxLength={2000} />;
    } else if (f.type === "file") {
      const fileBusyKey = `file:${sec.id}:${f.key}${idx !== undefined ? `:${idx}` : ""}`;
      const isFileUploading = busy === fileBusyKey;
      const isImg = val?.url && isImageFile(val.url, val.name);
      const isPdf = val?.url && isPdfFile(val.url, val.name);
      input = (
        <div className="xp-file" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {val?.url && (
            <div
              onClick={() => setPreviewDoc({ url: val.url, name: val.name, title: f.label })}
              style={{ cursor: "pointer", flexShrink: 0 }}
              title="Click to preview document"
            >
              {isImg ? (
                <img
                  src={val.url}
                  alt={val.name}
                  style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, border: "1.5px solid #CBD5E1", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "block" }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: isPdf ? "#FEE2E2" : "#EFF6FF",
                    color: isPdf ? "#DC2626" : "#2563EB",
                    border: isPdf ? "1px solid #FECACA" : "1px solid #BFDBFE",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  <i className={isPdf ? "fa-solid fa-file-pdf" : "fa-solid fa-file-lines"} />
                  <span style={{ fontSize: 8, fontWeight: 800, marginTop: 1 }}>{isPdf ? "PDF" : "DOC"}</span>
                </div>
              )}
            </div>
          )}
          <label className="xp-btn xp-soft" style={{ margin: 0 }}>
            {isFileUploading ? "Uploading…" : val?.url ? "Replace file" : "Choose file"}
            <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" disabled={Boolean(busy)} onChange={(e) => onPickFile(e, sec.id, f.key, idx, f.label)} />
          </label>
          {val?.url && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setPreviewDoc({ url: val.url, name: val.name, title: f.label })}
                style={{
                  background: "#EFF6FF",
                  color: "#1E40AF",
                  border: "1px solid #BFDBFE",
                  padding: "3px 9px",
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <i className="fa-regular fa-eye" /> Preview
              </button>
              <a className="xp-file-name" href={val.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>{val.name || "Uploaded"}</a>
            </div>
          )}
        </div>
      );
    } else if (f.key === "employmentDuration") {
      const dur = clientExperience([entry]);
      input = (
        <input
          type="text"
          value={dur !== "—" ? dur : val || ""}
          readOnly
          style={{ background: "#F8FAFC", cursor: "default", fontWeight: 700, color: "#0F172A" }}
          placeholder="Auto-calculated from dates"
        />
      );
    } else {
      const ph = active === 5 && f.key === "dailyProductivity" ? unitHint : f.placeholder || "";
      const extra = f.type === "number" ? { min: 0, step: "any" } : {};
      input = <input type={f.type} {...common} placeholder={ph} {...extra} />;
    }
    return (
      <div className={"xp-field" + (wide ? " full" : "") + (bad ? " err" : "")} key={f.key}>
        <label>{(f.key === "lastWorkingDate" && entry.currentlyWorkingHere === "Yes") ? "Expected Last Working Date (optional)" : f.label}{(f.required || conditionallyRequired(active, sec.id, f.key, entry)) && <em> *</em>}</label>
        {input}
        {bad && <div className="xp-err-msg">{f.type === "file" ? "Please upload this file" : f.type === "select" ? "Please select an option" : "This field is required"}</div>}
        {f.source && (
          <span style={{ fontSize: "11px", fontWeight: 600, marginTop: "4px", color: f.source === "auto" ? "#0D9488" : "#D97706" }}>
            {f.source === "auto" ? "Auto-extract / confirm" : "Candidate input"}
          </span>
        )}
      </div>
    );
  };

  const renderStage6Certifications = (sec) => {
    const list = data[sec.id] || [];

    const bodies = [
      { key: "aapc", name: "AAPC", count: CERT_LIBRARY.aapc?.certs?.length || 36 },
      { key: "ahima", name: "AHIMA", count: CERT_LIBRARY.ahima?.certs?.length || 9 },
      { key: "hfma", name: "HFMA", count: CERT_LIBRARY.hfma?.certs?.length || 11 },
      { key: "aaham", name: "AAHAM", count: CERT_LIBRARY.aaham?.certs?.length || 5 },
      { key: "nha", name: "NHA", count: CERT_LIBRARY.nha?.certs?.length || 1 },
      { key: "amba", name: "AMBA", count: CERT_LIBRARY.amba?.certs?.length || 1 },
      { key: "naham", name: "NAHAM", count: CERT_LIBRARY.naham?.certs?.length || 2 },
      { key: "namss", name: "NAMSS", count: CERT_LIBRARY.namss?.certs?.length || 2 },
      { key: "ahcc", name: "AHCC / BMSC", count: CERT_LIBRARY.ahcc?.certs?.length || 3 },
      { key: "wellsky", name: "WellSky", count: CERT_LIBRARY.wellsky?.certs?.length || 3 },
      { key: "all", name: "All Certifications", count: 143 },
    ];

    let availableCerts = [];
    if (certBodyKey === "all") {
      Object.entries(CERT_LIBRARY).forEach(([bKey, b]) => {
        (b.certs || []).forEach((c) => availableCerts.push({ ...c, body: b.name }));
      });
    } else {
      const b = CERT_LIBRARY[certBodyKey];
      availableCerts = (b?.certs || []).map((c) => ({ ...c, body: b.name }));
    }

    const q = certSearch.trim().toLowerCase();
    const filteredCerts = q
      ? availableCerts.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      : availableCerts;

    const handleCertSelect = (code) => {
      setSelectedCertCode(code);
      if (!code || code === "OTHER") {
        setDraftCert((prev) => ({
          ...prev,
          certificationCode: "OTHER",
          certificationName: "",
          issuingOrganization: prev.issuingOrganization || "Other",
        }));
        return;
      }
      let foundCert = null;
      let foundBody = null;
      for (const [bKey, b] of Object.entries(CERT_LIBRARY)) {
        const match = (b.certs || []).find((c) => c.code === code);
        if (match) {
          foundCert = match;
          foundBody = b;
          break;
        }
      }
      if (foundCert) {
        const bodyName = foundBody?.name || "AAPC";
        let cat = "Medical Coding";
        if (/billing|claim|revenue|crcr|csbi|crce|crcs/i.test(`${foundCert.code} ${foundCert.name}`)) cat = "Medical Billing";
        else if (/audit|quality|cdi|documentation|cdeo|cpma/i.test(`${foundCert.code} ${foundCert.name}`)) cat = "Specialty Coding";
        else if (/manager|practice|leadership|cppm/i.test(`${foundCert.code} ${foundCert.name}`)) cat = "Leadership";

        setDraftCert((prev) => ({
          ...prev,
          certificationCode: foundCert.code,
          certificationName: foundCert.name,
          issuingOrganization: bodyName,
          certificationCategory: cat,
        }));
      }
    };

    const handleSaveCert = () => {
      if (!draftCert.certificationName || !draftCert.certificationName.trim()) {
        setErrors(["Please select or enter a certification name."]);
        return;
      }
      setErrors([]);
      patch((d) => {
        const arr = d[sec.id] || [];
        if (editingCertIdx !== null && editingCertIdx >= 0 && editingCertIdx < arr.length) {
          arr[editingCertIdx] = { ...arr[editingCertIdx], ...draftCert };
        } else {
          arr.push({ ...draftCert, id: newId() });
        }
      });
      setEditingCertIdx(null);
      setDraftCert({
        certificationCategory: "Medical Coding",
        certificationCode: "CPC",
        certificationName: "Certified Professional Coder",
        issuingOrganization: "AAPC",
        certificationId: "",
        issueDate: "",
        expiryDate: "",
        noExpiry: "No",
        certificationStatus: "Active",
        specialization: "",
        certificateUpload: null,
        credentialUrl: "",
      });
      setSelectedCertCode("CPC");
    };

    const handleEditCert = (idx) => {
      const item = list[idx];
      if (!item) return;
      setEditingCertIdx(idx);
      setDraftCert({ ...item });
      if (item.certificationCode) setSelectedCertCode(item.certificationCode);
    };

    const handleCancelEdit = () => {
      setEditingCertIdx(null);
      setDraftCert({
        certificationCategory: "Medical Coding",
        certificationCode: "CPC",
        certificationName: "Certified Professional Coder",
        issuingOrganization: "AAPC",
        certificationId: "",
        issueDate: "",
        expiryDate: "",
        noExpiry: "No",
        certificationStatus: "Active",
        specialization: "",
        certificateUpload: null,
        credentialUrl: "",
      });
      setSelectedCertCode("CPC");
    };

    const handleUploadCertFile = async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { setErrors(["File must be 10 MB or smaller."]); return; }
      setBusy("stage6:certUpload"); setErrors([]);
      try {
        const ref = await upload(file, draftCert.certificationName || "Certificate Upload");
        setDraftCert((prev) => ({ ...prev, certificateUpload: ref }));
      } catch (err) {
        setErrors([err?.response?.data?.message || "Upload failed. Please try again."]);
      }
      setBusy("");
    };

    return (
      <div className="xp-card" key={sec.id}>
        <h4>{sec.title}</h4>
        <p className="xp-desc">{sec.desc}</p>

        {/* Step 1: Body Pills */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 6 }}>
            Step 1 · Pick Issuing Organization
          </label>
          <div className="s3-body-pills">
            {bodies.map((b) => (
              <span
                key={b.key}
                className={`s3-body-pill ${certBodyKey === b.key ? "selected" : ""}`}
                onClick={() => setCertBodyKey(b.key)}
              >
                {b.name} <span className="count">{b.count}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Step 2: Certification Search & Dropdown */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>
              Step 2 · Pick Your Certification
              <span style={{ fontSize: 11, fontWeight: 700, color: "#0A2540", background: "rgba(245,180,26,0.22)", border: "1px solid rgba(245,180,26,0.55)", padding: "2px 8px", borderRadius: 10, marginLeft: 8 }}>
                {filteredCerts.length} available
              </span>
            </label>
          </div>
          <input
            type="text"
            className="xp-input"
            placeholder="Search certifications by code or name... (e.g. CPC, CCS, CRCR)"
            value={certSearch}
            onChange={(e) => setCertSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <select
            className="xp-input"
            value={selectedCertCode}
            onChange={(e) => handleCertSelect(e.target.value)}
          >
            {filteredCerts.length === 0 && (
              <option value="" disabled>No certifications match "{certSearch}"</option>
            )}
            {filteredCerts.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name} ({c.body})
              </option>
            ))}
            <option value="OTHER">+ Other / Custom Certification</option>
          </select>
        </div>

        {/* Step 3: Credential Details Form */}
        <div style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--navy, #0A2540)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#F5A623", color: "#051424", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900 }}>
                {editingCertIdx !== null ? "✎" : "+"}
              </span>
              <span>{editingCertIdx !== null ? `Editing Credential #${editingCertIdx + 1}` : "Enter Credential Details"}</span>
            </div>
            {editingCertIdx !== null && (
              <button type="button" onClick={handleCancelEdit} style={{ background: "transparent", border: "none", color: "#64748B", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                ✕ Cancel Edit
              </button>
            )}
          </div>

          <div className="xp-grid" style={{ marginBottom: 14 }}>
            {selectedCertCode === "OTHER" && (
              <div className="xp-field full">
                <label>Custom Certification Name <em>*</em></label>
                <input
                  type="text"
                  className="xp-input"
                  placeholder="Enter full certification name"
                  value={draftCert.certificationName}
                  onChange={(e) => setDraftCert((p) => ({ ...p, certificationName: e.target.value }))}
                />
              </div>
            )}
            <div className="xp-field">
              <label>Certification Category</label>
              <select
                className="xp-input"
                value={draftCert.certificationCategory}
                onChange={(e) => setDraftCert((p) => ({ ...p, certificationCategory: e.target.value }))}
              >
                <option value="Medical Coding">Medical Coding</option>
                <option value="Specialty Coding">Specialty Coding</option>
                <option value="Medical Billing">Medical Billing</option>
                <option value="RCM">RCM</option>
                <option value="Leadership">Leadership</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="xp-field">
              <label>Issuing Organization <em>*</em></label>
              <select
                className="xp-input"
                value={draftCert.issuingOrganization}
                onChange={(e) => setDraftCert((p) => ({ ...p, issuingOrganization: e.target.value }))}
              >
                <option value="AAPC">AAPC</option>
                <option value="AHIMA">AHIMA</option>
                <option value="HFMA">HFMA</option>
                <option value="AAHAM">AAHAM</option>
                <option value="NHA">NHA</option>
                <option value="AMBA">AMBA</option>
                <option value="NAHAM">NAHAM</option>
                <option value="NAMSS">NAMSS</option>
                <option value="AHCC / BMSC">AHCC / BMSC</option>
                <option value="WellSky">WellSky</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="xp-field">
              <label>Certification ID / Member ID</label>
              <input
                type="text"
                className="xp-input"
                placeholder="e.g., 1234567"
                value={draftCert.certificationId}
                onChange={(e) => setDraftCert((p) => ({ ...p, certificationId: e.target.value }))}
              />
            </div>
            <div className="xp-field">
              <label>Certification Status <em>*</em></label>
              <select
                className="xp-input"
                value={draftCert.certificationStatus}
                onChange={(e) => setDraftCert((p) => ({ ...p, certificationStatus: e.target.value }))}
              >
                <option value="Active">Active</option>
                <option value="In Progress">In Progress</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div className="xp-field">
              <label>Issue Date</label>
              <input
                type="date"
                className="xp-input"
                value={draftCert.issueDate}
                onChange={(e) => setDraftCert((p) => ({ ...p, issueDate: e.target.value }))}
              />
            </div>
            <div className="xp-field">
              <label>Expiry Date</label>
              <input
                type="date"
                className="xp-input"
                disabled={draftCert.noExpiry === "Yes"}
                value={draftCert.noExpiry === "Yes" ? "" : draftCert.expiryDate}
                onChange={(e) => setDraftCert((p) => ({ ...p, expiryDate: e.target.value }))}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={draftCert.noExpiry === "Yes"}
                  onChange={(e) => setDraftCert((p) => ({ ...p, noExpiry: e.target.checked ? "Yes" : "No", expiryDate: e.target.checked ? "" : p.expiryDate }))}
                />
                No Expiry / Lifetime Validity
              </label>
            </div>
            <div className="xp-field">
              <label>Specialization</label>
              <input
                type="text"
                className="xp-input"
                placeholder="Relevant specialty"
                value={draftCert.specialization}
                onChange={(e) => setDraftCert((p) => ({ ...p, specialization: e.target.value }))}
              />
            </div>
            <div className="xp-field">
              <label>Credential URL</label>
              <input
                type="url"
                className="xp-input"
                placeholder="Optional verification link (https://...)"
                value={draftCert.credentialUrl}
                onChange={(e) => setDraftCert((p) => ({ ...p, credentialUrl: e.target.value }))}
              />
            </div>
            <div className="xp-field full">
              <label>Certificate Upload (PDF / Image)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label className="xp-btn xp-soft" style={{ margin: 0, cursor: "pointer" }}>
                  {busy === "stage6:certUpload" ? "Uploading…" : draftCert.certificateUpload?.url ? "Replace Certificate" : "Upload Certificate"}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    disabled={Boolean(busy)}
                    onChange={handleUploadCertFile}
                  />
                </label>
                {draftCert.certificateUpload?.url && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ url: draftCert.certificateUpload.url, name: draftCert.certificateUpload.name, title: draftCert.certificationName })}
                      className="s3-cert-edit-btn"
                    >
                      <i className="fa-regular fa-eye" /> Preview Certificate
                    </button>
                    <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 700 }}>
                      ✓ {draftCert.certificateUpload.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="xp-btn xp-primary"
              onClick={handleSaveCert}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px" }}
            >
              <i className="fa-solid fa-plus" />
              {editingCertIdx !== null ? "Update Certification" : `Save ${draftCert.certificationCode || "Certification"} to List`}
            </button>
          </div>
        </div>

        {/* Step 4: Your Added Certifications List */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <label style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "var(--navy, #0A2540)" }}>
              Your Added Certifications ({list.length})
            </label>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1E3A8A", background: "#DBEAFE", padding: "4px 12px", borderRadius: 20 }}>
              Multiple Credentials Supported
            </span>
          </div>

          {list.length === 0 ? (
            <div style={{ padding: "18px 20px", background: "#F8FAFC", borderRadius: 12, border: "1.5px dashed #CBD5E1", fontSize: 13, color: "#64748B", textAlign: "center" }}>
              No certifications added yet. Pick a certification above and click <b>"Save Certification to List"</b>.
            </div>
          ) : (
            <div className="s3-cert-stack">
              {list.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={`s3-cert-card-mini ${editingCertIdx === idx ? "editing" : ""}`}
                >
                  <div className="s3-cert-mini-logo">
                    {item.certificationCode || item.certificationName?.slice(0, 4) || "CERT"}
                  </div>
                  <div className="s3-cert-mini-info">
                    <div className="title" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span>{item.certificationName}</span>
                      {editingCertIdx === idx && (
                        <span style={{ fontSize: 10.5, background: "#3B82F6", color: "#FFF", padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>
                          Editing
                        </span>
                      )}
                      {item.credentialUrl && (
                        <a
                          href={item.credentialUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 11, color: "#2563EB", textDecoration: "none", fontWeight: 700 }}
                        >
                          Verify ↗
                        </a>
                      )}
                    </div>
                    <div className="meta">
                      {item.issuingOrganization} · {item.certificationCategory || "RCM"}
                      {item.issueDate ? ` · Issued ${item.issueDate}` : ""}
                      {item.noExpiry === "Yes" ? " · Lifetime Validity" : item.expiryDate ? ` · Expiry ${item.expiryDate}` : ""}
                    </div>
                  </div>

                  <div className="s3-cert-mini-id">
                    ID {item.certificationId ? (item.certificationId.length > 4 ? `****${item.certificationId.slice(-4)}` : item.certificationId) : "—"}
                  </div>

                  <div className={`s3-cert-mini-badge ${item.certificationStatus === "Active" ? "green" : item.certificationStatus === "In Progress" ? "blue" : "red"}`}>
                    <i className="fa-solid fa-circle" style={{ fontSize: 7 }} /> {item.certificationStatus || "Active"}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {item.certificateUpload?.url && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ url: item.certificateUpload.url, name: item.certificateUpload.name, title: item.certificationName })}
                        className="s3-cert-edit-btn"
                        title="Preview certificate document"
                      >
                        <i className="fa-regular fa-eye" /> Preview
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEditCert(idx)}
                      className="s3-cert-edit-btn"
                      title="Edit this credential"
                    >
                      ✎ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEntry(sec, idx)}
                      style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer", fontWeight: 700, padding: "0 6px", fontSize: 18 }}
                      title="Remove credential"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              className="xp-btn xp-soft"
              onClick={() => {
                setEditingCertIdx(null);
                setDraftCert({
                  certificationCategory: "Medical Coding",
                  certificationCode: "CPC",
                  certificationName: "Certified Professional Coder",
                  issuingOrganization: "AAPC",
                  certificationId: "",
                  issueDate: "",
                  expiryDate: "",
                  noExpiry: "No",
                  certificationStatus: "Active",
                  specialization: "",
                  certificateUpload: null,
                  credentialUrl: "",
                });
                setSelectedCertCode("CPC");
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <i className="fa-solid fa-plus" /> Add Another Certification
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (sec) => {
    if (active === 2 && sec.id === "training-academy-history" && data["training-applicability"]?.attendedAcademyTraining === "Not Applicable") return null;
    if (sec.id === "add-certification") {
      return renderStage6Certifications(sec);
    }
    if (sec.kind === "docslots") {
      const d = data[sec.id] || emptySlots(sec);
      return (
        <div className="xp-card" key={sec.id}>
          <h4>{sec.title}</h4>
          <p className="xp-desc">{sec.desc}</p>
          <div className="xp-grid" style={{ marginBottom: 16 }}>
            {sec.numbers.map((n) => (
              <div className={"xp-field" + (invalid.has(`${sec.id}:num:${n.key}`) ? " err" : "")} key={n.key}>
                <label>{n.label}{n.required && <em> *</em>}</label>
                <input value={d[n.key] || ""} placeholder={n.placeholder} maxLength={n.key === "aadhaarNumber" ? 12 : 20} autoComplete="off"
                  inputMode={n.key === "aadhaarNumber" ? "numeric" : undefined}
                  onChange={(e) => setNum(sec.id, n.key, n.key === "panNumber" ? e.target.value.toUpperCase() : n.key === "aadhaarNumber" ? e.target.value.replace(/\D/g, "").slice(0, 12) : e.target.value)} />
                {invalid.has(`${sec.id}:num:${n.key}`) && <div className="xp-err-msg">This field is required</div>}
              </div>
            ))}
          </div>
          <div className="xp-docs">
            {sec.slots.map((sl) => {
              const f = d.documents?.[sl.key];
              const na = sl.naKey && d[sl.naKey] === "Yes";
              const isImg = f?.url && isImageFile(f.url, f.name);
              const isPdf = f?.url && isPdfFile(f.url, f.name);
              return (
                <div className={"xp-doc" + (invalid.has(`${sec.id}:slot:${sl.key}`) ? " err" : "")} key={sl.key} style={{ flexWrap: "wrap", padding: "10px 14px", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 260, flex: 1 }}>
                    {f?.url ? (
                      <div
                        onClick={() => setPreviewDoc({ url: f.url, name: f.name, title: sl.label })}
                        style={{ cursor: "pointer", flexShrink: 0 }}
                        title="Click to preview document"
                      >
                        {isImg ? (
                          <img
                            src={f.url}
                            alt={f.name}
                            style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, border: "1.5px solid #CBD5E1", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "block" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              background: isPdf ? "#FEE2E2" : "#EFF6FF",
                              color: isPdf ? "#DC2626" : "#2563EB",
                              border: isPdf ? "1px solid #FECACA" : "1px solid #BFDBFE",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 15,
                            }}
                          >
                            <i className={isPdf ? "fa-solid fa-file-pdf" : "fa-solid fa-file-lines"} />
                            <span style={{ fontSize: 8.5, fontWeight: 800, marginTop: 2 }}>{isPdf ? "PDF" : "DOC"}</span>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <b style={{ fontSize: "13.5px", color: "var(--navy, #0A2540)" }}>{sl.label}</b>
                        {sl.required ? <em style={{ color: "#DC2626" }}> *</em> : <span className="xp-note"> ({sl.hint || "optional"})</span>}
                      </div>
                      {f?.url && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#475569", fontWeight: 600, wordBreak: "break-all" }}>
                            {f.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ url: f.url, name: f.name, title: sl.label })}
                            style={{
                              background: "#EFF6FF",
                              color: "#1E40AF",
                              border: "1px solid #BFDBFE",
                              padding: "2px 9px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <i className="fa-regular fa-eye" /> Preview
                          </button>
                        </div>
                      )}
                      {sl.naKey && (
                        <label style={{ display: "block", fontWeight: 600, fontSize: 12, marginTop: 4 }}>
                          <input type="checkbox" checked={na} onChange={(e) => setNum(sec.id, sl.naKey, e.target.checked ? "Yes" : "")} /> {sl.naLabel}
                        </label>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={"xp-pill " + (f ? "ok" : na ? "ok" : "pending")}>{f ? "Uploaded" : na ? "Not applicable" : sl.required ? "Required" : "Optional"}</span>
                    {!na && (
                      <label className="xp-btn xp-soft" style={{ margin: 0 }}>
                        {busy === `slot:${sl.key}` ? "Uploading…" : f ? "Replace" : "Upload"}
                        <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" disabled={Boolean(busy)} onChange={(e) => onPickSlot(e, sec, sl)} />
                      </label>
                    )}
                    {f && <button type="button" className="xp-btn xp-danger" onClick={() => setSlot(sec.id, sl.key, null)}>Remove</button>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="xp-note">PDF / DOCX / JPG / PNG, up to 10 MB each. Aadhaar and PAN numbers are saved masked (last 4 characters only).</p>
        </div>
      );
    }
    if (sec.kind === "docs") {
      const label = active === 1 ? "Employment Proof" : "Employment Proof";
      return (
        <div className="xp-card" key={sec.id}>
          <h4>{sec.title}</h4>
          <p className="xp-desc">{sec.desc}</p>

          {/* Dotted Upload Dropzone Container */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "26px 20px",
              background: "#F8FAFC",
              border: "1.5px dashed #CBD5E1",
              borderRadius: "12px",
              cursor: busy === "docs" ? "wait" : "pointer",
              textAlign: "center",
              transition: "all 0.15s ease",
              marginTop: "8px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A", marginBottom: 4 }}>
              {busy === "docs" ? "Uploading documents..." : "Upload resume and supporting documents"}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>
              PDF / DOCX / JPG / PNG · Talentera extracts fields and asks for confirmation
            </div>
            <input
              type="file"
              hidden
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => onPickDocs(e, label)}
              disabled={Boolean(busy)}
            />
          </label>

          {/* Status Pills */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px", marginBottom: "14px" }}>
            <span
              style={{
                background: "#DCFCE7",
                border: "1px solid #86EFAC",
                color: "#15803D",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "11.5px",
                fontWeight: "700",
              }}
            >
              Resume Parsed
            </span>
            <span
              style={{
                background: "#FEF3C7",
                border: "1px solid #FDE68A",
                color: "#B45309",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "11.5px",
                fontWeight: "700",
              }}
            >
              Employment Proof Pending
            </span>
            <span
              style={{
                background: "#E0F2FE",
                border: "1px solid #BAE6FD",
                color: "#0369A1",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "11.5px",
                fontWeight: "700",
              }}
            >
              Candidate Review Required
            </span>
          </div>

          {active === 3 && (() => {
            const s1d = form[1]?.["upload-your-documents"]?.documents || {};
            const items = [
              ["Updated Resume", s1d.updatedResume],
              ["Current / Latest Offer Letter", s1d.currentOfferLetter],
              ["Previous Company Relieving Letter", s1d.previousRelievingLetter],
              ["Experience Letters", s1d.experienceLetters],
            ].filter((x) => x[1]);
            return items.length ? (
              <div className="xp-docs" style={{ marginBottom: 14 }}>
                <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fa-solid fa-circle-check" style={{ color: "#16A34A" }} /> Verified Documents (from Stage 1)
                </div>
                {items.map(([l, f]) => {
                  const isImg = f?.url && isImageFile(f.url, f.name);
                  const isPdf = f?.url && isPdfFile(f.url, f.name);
                  return (
                    <div className="xp-doc" key={l} style={{ padding: "10px 14px", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 260, flex: 1 }}>
                        <div
                          onClick={() => setPreviewDoc({ url: f.url, name: f.name, title: l })}
                          style={{ cursor: "pointer", flexShrink: 0 }}
                          title="Click to preview"
                        >
                          {isImg ? (
                            <img
                              src={f.url}
                              alt={f.name}
                              style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, border: "1.5px solid #CBD5E1", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "block" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 8,
                                background: isPdf ? "#FEE2E2" : "#EFF6FF",
                                color: isPdf ? "#DC2626" : "#2563EB",
                                border: isPdf ? "1px solid #FECACA" : "1px solid #BFDBFE",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 15,
                              }}
                            >
                              <i className={isPdf ? "fa-solid fa-file-pdf" : "fa-solid fa-file-lines"} />
                              <span style={{ fontSize: 8.5, fontWeight: 800, marginTop: 1 }}>{isPdf ? "PDF" : "DOC"}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13.5, color: "var(--navy, #0A2540)" }}>
                            <b>{l}</b> <span className="xp-note">(from Stage 1)</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, wordBreak: "break-all" }}>
                            {f.name}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ url: f.url, name: f.name, title: l })}
                          style={{
                            background: "#EFF6FF",
                            color: "#1E40AF",
                            border: "1px solid #BFDBFE",
                            padding: "5px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <i className="fa-regular fa-eye" /> Preview
                        </button>
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: "#FFFFFF",
                            color: "#475569",
                            border: "1px solid #CBD5E1",
                            padding: "5px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          ↗ Open
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null;
          })()}

          <div className="xp-docs">
            {(data.docs || []).map((d, i) => {
              const isImg = d?.url && isImageFile(d.url, d.name);
              const isPdf = d?.url && isPdfFile(d.url, d.name);
              return (
                <div className="xp-doc" key={d.url + i} style={{ padding: "10px 14px", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 260, flex: 1 }}>
                    <div
                      onClick={() => setPreviewDoc({ url: d.url, name: d.name, title: d.docType || d.name })}
                      style={{ cursor: "pointer", flexShrink: 0 }}
                      title="Click to preview"
                    >
                      {isImg ? (
                        <img
                          src={d.url}
                          alt={d.name}
                          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, border: "1.5px solid #CBD5E1", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "block" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            background: isPdf ? "#FEE2E2" : "#EFF6FF",
                            color: isPdf ? "#DC2626" : "#2563EB",
                            border: isPdf ? "1px solid #FECACA" : "1px solid #BFDBFE",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 15,
                          }}
                        >
                          <i className={isPdf ? "fa-solid fa-file-pdf" : "fa-solid fa-file-lines"} />
                          <span style={{ fontSize: 8.5, fontWeight: 800, marginTop: 1 }}>{isPdf ? "PDF" : "DOC"}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--navy, #0A2540)" }}>
                        {d.name || "Supporting Document"}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#64748B" }}>
                        {d.docType || "Employment Proof"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ url: d.url, name: d.name, title: d.docType || d.name })}
                      style={{
                        background: "#EFF6FF",
                        color: "#1E40AF",
                        border: "1px solid #BFDBFE",
                        padding: "5px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <i className="fa-regular fa-eye" /> Preview
                    </button>
                    <button
                      type="button"
                      className="xp-btn xp-danger"
                      onClick={() => patch((x) => { x.docs.splice(i, 1); })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="xp-note">Please fill in the fields below yourself; uploaded documents are stored as supporting proof for verification.</p>
        </div>
      );
    }
    if (sec.kind === "chips") {
      return (
        <div className="xp-card" key={sec.id}>
          <h4>{sec.title}</h4><p className="xp-desc">{sec.desc}</p>
          <div className={"xp-chips" + (invalid.has(`chips:${sec.key}`) ? " err" : "")}>
            {sec.options.map((o) => (
              <button type="button" key={o} className={"xp-chip" + (data[sec.key]?.includes(o) ? " on" : "")} onClick={() => toggleChip(sec, o)}>{o}</button>
            ))}
          </div>
        </div>
      );
    }
    if (sec.kind === "summary") {
      if (active === 3) {
        const verified = (data.docs || []).length > 0 || employment.some((e) => e.companyName);
        return (
          <div className="xp-card" key={sec.id}>
            <h4>{sec.title}</h4><p className="xp-desc">{sec.desc}</p>
            <div className="xp-metrics">
              <div className="xp-metric"><div className="k">Total Professional Experience</div><div className="v">{expLabel}</div></div>
              <div className="xp-metric"><div className="k">Relevant RCM Experience</div><div className="v">{px.experience?.rcmLabel && px.experience.rcmLabel !== "0 mo" ? px.experience.rcmLabel : "Updates on save"}</div></div>
              <div className="xp-metric"><div className="k">Current Employer</div><div className="v">{employment.find((e) => e.currentlyWorkingHere === "Yes")?.companyName || "—"}</div></div>
              <div className="xp-metric"><div className="k">Employment Verification</div><div className="v">{(data.docs || []).length ? "Proof uploaded" : verified ? "Declared" : "Pending"}</div></div>
            </div>
          </div>
        );
      }
      return (
        <div className="xp-card" key={sec.id}>
          <h4>{sec.title}</h4><p className="xp-desc">{sec.desc}</p>
          <PassportSummary px={px} onEdit={goto} compact />
          <h4 style={{ marginTop: 18 }}>Documents</h4>
          <PassportDocuments px={px} onEdit={goto} />
        </div>
      );
    }
    if (sec.kind === "final") {
      const allBefore = [1, 2, 3, 4, 5, 6, 7].every((n) => completed.includes(n));
      return (
        <div className="xp-card" key={sec.id}>
          <h4>{sec.title}</h4><p className="xp-desc">{sec.desc}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className={"xp-pill " + (allBefore ? "ok" : "pending")}>{allBefore ? "Stages 1–7 complete" : "Finish stages 1–7 first"}</span>
            {px.published && <span className="xp-pill ok">Published</span>}
            <span className="xp-pill ok">Score {px.score}/100</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="button" className="xp-btn xp-primary" disabled={!allBefore || busy === "publish"} onClick={publish}>
              {busy === "publish" ? "Publishing…" : px.published ? "Update & Re-publish Passport" : "Publish Career Passport"}
            </button>
          </div>
        </div>
      );
    }
    // fields
    const body = sec.repeatable ? (
      <>
        {(data[sec.id] || []).map((entry, idx) => {
          const entryDur = clientExperience([entry]);
          return (
            <div className="xp-entry" key={entry.id || idx}>
              <div
                className="xp-entry-h"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#F8FAFC",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  marginBottom: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "var(--navy, #0A2540)" }}>
                    {active === 3 ? `🏢 Company #${idx + 1}` : sec.title.includes("Cert") ? `📜 Certification #${idx + 1}` : `Entry #${idx + 1}`}
                  </span>
                  {entry.companyName && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>
                      · {entry.companyName}
                    </span>
                  )}
                  {active === 3 && entryDur && entryDur !== "—" && (
                    <span style={{ background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>
                      ⏱️ {entryDur}
                    </span>
                  )}
                  {active === 3 && entry.currentlyWorkingHere === "Yes" && (
                    <span style={{ background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>
                      Current Organization
                    </span>
                  )}
                </div>
                <button type="button" className="xp-btn xp-danger" onClick={() => removeEntry(sec, idx)}>
                  {active === 3 ? "Remove Company" : "Remove"}
                </button>
              </div>
              <div className="xp-grid">{sec.fields.map((f) => renderField(sec, f, entry, idx))}</div>
            </div>
          );
        })}
        <div style={{ marginTop: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className="xp-btn xp-primary"
            onClick={() => addEntry(sec)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              fontWeight: 700,
              fontSize: "13.5px",
            }}
          >
            <i className="fa-solid fa-circle-plus" style={{ fontSize: 15 }} />
            {active === 3 ? "Add Company" : active === 6 ? "Add Certification" : "+ Add Entry"}
          </button>
          {active === 3 && (
            <span style={{ fontSize: 12, color: "#64748B" }}>
              Click <b>(+) Add Company</b> to add multiple organizations to your career history.
            </span>
          )}
        </div>
        {active === 3 && !employment.length && <p className={invalid.has(`rep:${sec.id}`) ? "xp-err-msg xp-err-card" : "xp-note"} style={invalid.has(`rep:${sec.id}`) ? { fontSize: 13 } : undefined}>Click &ldquo;+ Add Company&rdquo; above to record your employment history.</p>}
      </>
    ) : (
      <div className="xp-grid">{sec.fields.map((f) => renderField(sec, f, data[sec.id] || {}, undefined))}</div>
    );
    return (
      <div className="xp-card" key={sec.id}>
        <h4>{sec.title}</h4><p className="xp-desc">{sec.desc}{sec.repeatable && active === 3 ? " Duration is calculated automatically from your dates." : ""}</p>
        {body}
        {active === 1 && sec.id === "personal-contact" && (
          <IdVerification
            idType={data[sec.id]?.governmentIdType}
            verified={data[sec.id]?.isGovtIdVerified === "Yes"}
            maskedId={data[sec.id]?.maskedGovtId || data[sec.id]?.governmentIdNumber}
            onVerified={onIdVerified}
            invalid={invalid.has("idverify")}
          />
        )}
      </div>
    );
  };

  return (
    <div className="xp-shell">
      <aside className="xp-side">
        <div className="xp-brand">Talent<span>era</span></div>
        <div className="xp-side-sub">Experienced Career Passport</div>
        <div className="xp-prog">
          <div className="xp-prog-top"><span>Profile Progress</span><span>{pct}%</span></div>
          <div className="xp-bar"><i style={{ width: pct + "%" }} /></div>
          <div className="xp-prog-top" style={{ marginTop: 8, marginBottom: 0 }}><span>Talentera Score</span><span>{px.score}/100</span></div>
        </div>
        {SCHEMA.map((s) => (
          <button key={s.num} type="button" className={"xp-nav" + (active === s.num ? " active" : "") + (completed.includes(s.num) ? " done" : "")} disabled={!unlocked(s.num)} onClick={() => goto(s.num)}>
            <span className="xp-ico">{completed.includes(s.num) ? "✓" : s.icon}</span>
            <span>{s.num}. {s.name}<small>{px.stageScores?.[s.num] || 0}/{PASSPORT_MAX_POINTS[s.num]} pts{OPTIONAL_STAGES.includes(s.num) ? " · optional details" : ""}</small></span>
          </button>
        ))}
        {onBackToDashboard && <button type="button" className="xp-back" onClick={onBackToDashboard}>← Back to My Dashboard</button>}
      </aside>

      <main className="xp-main" ref={topRef}>
        <div className="xp-hero">
          <div><h2>Stage {stage.num} — {stage.name}</h2><p>{stage.purpose}</p></div>
          <div className="xp-badge">{stage.num} of {STAGE_COUNT}</div>
        </div>
        <div className="xp-tabs">
          {SCHEMA.map((s) => (
            <div key={s.num} className={"xp-tab" + (active === s.num ? " active" : "") + (completed.includes(s.num) ? " done" : "")} onClick={() => goto(s.num)}>
              <b>{completed.includes(s.num) ? "✓" : s.num}</b>{TAB_LABELS[s.num - 1]}
            </div>
          ))}
        </div>

        {errors.length > 0 && (
          <div className="xp-alert" role="alert">
            {errors.length === 1 ? errors[0] : <>Please fix the following:<ul>{errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}</ul></>}
          </div>
        )}
        {notice && <div className="xp-alert xp-ok">{notice}</div>}

        {active === 5 && domains.length > 0 && <p className="xp-note" style={{ marginTop: -8 }}>Metrics are shown for: {domains.join(", ")}.</p>}
        {stage.sections.map(renderSection)}

        <div className="xp-foot">
          <button type="button" className="xp-btn xp-ghost" disabled={active === 1} onClick={() => goto(active - 1)}>← Previous</button>
          <div className="r">
            {active < STAGE_COUNT && <button type="button" className="xp-btn xp-ghost" disabled={!!busy} onClick={() => save(true)}>{busy === "draft" ? "Saving…" : "Save Draft"}</button>}
            {active < STAGE_COUNT && (
              <button type="button" className="xp-btn xp-primary" disabled={!!busy} onClick={() => save(false)}>
                {busy === "save" ? "Saving…" : OPTIONAL_STAGES.includes(active) && !completed.includes(active) ? "Save & Continue →" : "Save & Continue →"}
              </button>
            )}
          </div>
        </div>
      </main>

      {previewDoc && (
        <DocumentPreviewModal
          file={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
