import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import api from "../api/client";
import { WIZARD_STAGES, STAGE_POINTS, GOLD_BADGE_THRESHOLD } from "../data/wizardStages.js";
import CandidateNavbar from "../components/CandidateNavbar.jsx";
import { LearnContent } from "./Learn.jsx";

const STATUS_CONFIG = {
  rejected: {
    label: "REJECTED",
    bg: "#FEE2E2",
    color: "#B91C1C",
    border: "#FCA5A5",
    desc: "The employer reviewed your profile and updated your status to Rejected.",
  },
  shortlisted: {
    label: "SHORTLISTED",
    bg: "#DBEAFE",
    color: "#1D4ED8",
    border: "#93C5FD",
    desc: "The employer shortlisted your verified profile for this role.",
  },
  interviewing: {
    label: "INTERVIEWING",
    bg: "#FEF3C7",
    color: "#B45309",
    border: "#FDE68A",
    desc: "An interview round has been scheduled with the employer.",
  },
  hired: {
    label: "HIRED ✓",
    bg: "#DCFCE7",
    color: "#166534",
    border: "#86EFAC",
    desc: "Congratulations! You have been selected and offered this position.",
  },
  applied: {
    label: "UNDER REVIEW",
    bg: "#EFF6FF",
    color: "#2563EB",
    border: "#BFDBFE",
    desc: "Your verified profile was submitted and is currently under review.",
  },
};

// Total expected fields schema per stage
const STAGE_EXPECTED_FIELDS = {
  1: 11, // fullName, aadhaar, city, mobile, email, experience, currentRole, gender, dob, address, photo
  2: 7,  // academyName, domain, specialty, courseName, duration, trainerName, batch
  3: 7,  // body, certCode, memberId, issueDate, expiryDate, docName, certStatus
  4: 5,  // foundationScore, passed, correctCount, topic, proctoring
  5: 6,  // aiScore, clarityScore, fluencyScore, confidenceScore, grammarScore, videoUrl
  6: 4,  // option, practicodeId, docName, accuracyScore
  7: 3,  // template, resumeUrl, summary
  8: 3,  // consent, scheduledSlot, expectedCtc
};

export const TOTAL_CANDIDATE_FIELDS = Object.values(STAGE_EXPECTED_FIELDS).reduce((a, b) => a + b, 0); // 46

/**
 * Helper to extract ONLY fields that the candidate has ACTUALLY filled in,
 * filtering out any empty strings, undefined, or null values.
 */
function getStageFilledFields(candidate, completedStages, stageNum) {
  const fields = [];

  if (stageNum === 1) {
    const s1 = candidate?.stage1 || {};
    if (s1.fullName && String(s1.fullName).trim()) fields.push({ label: "FULL NAME", val: String(s1.fullName).trim() });
    if (s1.aadhaarVerified) fields.push({ label: "AADHAAR", val: "✓ Verified via UIDAI" });
    else if (s1.maskedAadhaar && String(s1.maskedAadhaar).trim()) fields.push({ label: "AADHAAR", val: String(s1.maskedAadhaar).trim() });
    if (s1.city && String(s1.city).trim()) fields.push({ label: "CITY", val: s1.state ? `${s1.city}, ${s1.state}` : s1.city });
    const mobile = s1.mobile || candidate?.mobile;
    if (mobile && String(mobile).trim()) fields.push({ label: "PHONE", val: `******${String(mobile).trim().slice(-4)}` });
    const email = s1.email || candidate?.email;
    if (email && String(email).trim()) fields.push({ label: "EMAIL", val: String(email).trim() });
    if (s1.experience && String(s1.experience).trim()) fields.push({ label: "EXPERIENCE", val: `${s1.experience} yrs` });
    if (s1.currentRole && String(s1.currentRole).trim()) fields.push({ label: "CURRENT ROLE", val: String(s1.currentRole).trim() });
    if (s1.gender && String(s1.gender).trim()) fields.push({ label: "GENDER", val: String(s1.gender).trim() });
    if (s1.dob && String(s1.dob).trim()) fields.push({ label: "DOB", val: String(s1.dob).trim() });
    if (s1.photoBase64) fields.push({ label: "PHOTO", val: "Aadhaar photo captured ✓" });
    else if (s1.aadhaarVerified) fields.push({ label: "PHOTO", val: "Aadhaar photo matched ✓" });
    const vaultDocs = s1.documentVault || s1.documents || [];
    const uploadedVaultCount = vaultDocs.filter((d) => Boolean(d.docUrl)).length;
    if (uploadedVaultCount > 0) {
      fields.push({ label: "DOCUMENT VAULT", val: `${uploadedVaultCount} File(s) Uploaded ✓` });
    }
  } else if (stageNum === 2) {
    const s2 = candidate?.stage2 || {};
    const academy = s2.academyName || s2.instituteName;
    if (academy && String(academy).trim()) fields.push({ label: "ACADEMY", val: String(academy).trim() });
    if (s2.domain && String(s2.domain).trim()) fields.push({ label: "DOMAIN", val: String(s2.domain).trim() });
    if (s2.specialty && String(s2.specialty).trim()) fields.push({ label: "SPECIALTY", val: String(s2.specialty).trim() });
    if (s2.courseName && String(s2.courseName).trim() && s2.courseName !== s2.domain) {
      fields.push({ label: "COURSE", val: String(s2.courseName).trim() });
    }
    if (s2.duration && String(s2.duration).trim()) fields.push({ label: "DURATION", val: String(s2.duration).trim() });
    if (s2.trainerName && String(s2.trainerName).trim()) fields.push({ label: "TRAINER", val: String(s2.trainerName).trim() });
    if (s2.batch && String(s2.batch).trim()) fields.push({ label: "BATCH", val: String(s2.batch).trim() });
  } else if (stageNum === 3) {
    const s3 = candidate?.stage3 || {};
    const body = s3.body || s3.issuingBody;
    if (body && String(body).trim()) fields.push({ label: "ISSUING BODY", val: String(body).trim().toUpperCase() });
    const cert = s3.certCode || s3.certName || s3.name;
    if (cert && String(cert).trim()) fields.push({ label: "CREDENTIAL", val: String(cert).trim() });
    if (s3.memberId && String(s3.memberId).trim()) fields.push({ label: "MEMBER ID", val: `****${String(s3.memberId).trim().slice(-4)}` });
    if (s3.issueDate && String(s3.issueDate).trim()) fields.push({ label: "ISSUE DATE", val: String(s3.issueDate).trim() });
    if (s3.expiryDate && String(s3.expiryDate).trim()) fields.push({ label: "EXPIRY DATE", val: String(s3.expiryDate).trim() });
    if (s3.docName && String(s3.docName).trim()) fields.push({ label: "DOCUMENT", val: String(s3.docName).trim() });
    if (s3.certStatus && String(s3.certStatus).trim()) fields.push({ label: "AUDIT STATUS", val: String(s3.certStatus).trim().toUpperCase() });
  } else if (stageNum === 4) {
    const s4 = candidate?.stage4 || {};
    const fScore = s4.foundationScore !== undefined ? s4.foundationScore : s4.score;
    if (fScore !== undefined && fScore !== null) fields.push({ label: "ASSESSMENT SCORE", val: `${fScore}%` });
    if (s4.passed !== undefined && s4.passed !== null) fields.push({ label: "RESULT", val: s4.passed ? "Passed ✓" : "Did not pass" });
    if (s4.correctCount !== undefined && s4.totalQuestions) {
      fields.push({ label: "ACCURACY", val: `${s4.correctCount} / ${s4.totalQuestions} questions correct` });
    }
    if (s4.topic && String(s4.topic).trim()) fields.push({ label: "SPECIALTY TOPIC", val: String(s4.topic).trim() });
    if (completedStages.includes(4)) fields.push({ label: "PROCTORING", val: "Proctored Verification Active ✓" });
  } else if (stageNum === 5) {
    const s5 = candidate?.stage5 || {};
    const aiScore = s5.aiScore !== undefined ? s5.aiScore : s5.score;
    if (aiScore !== undefined && aiScore !== null) fields.push({ label: "AI COMM SCORE", val: `${aiScore}%` });
    if (s5.clarityScore !== undefined && s5.clarityScore !== null) fields.push({ label: "CLARITY", val: `${s5.clarityScore}%` });
    if (s5.fluencyScore !== undefined && s5.fluencyScore !== null) fields.push({ label: "FLUENCY", val: `${s5.fluencyScore}%` });
    if (s5.confidenceScore !== undefined && s5.confidenceScore !== null) fields.push({ label: "CONFIDENCE", val: `${s5.confidenceScore}%` });
    if (s5.grammarScore !== undefined && s5.grammarScore !== null) fields.push({ label: "GRAMMAR", val: `${s5.grammarScore}%` });
    if (s5.videoUrl) fields.push({ label: "INTERVIEW VIDEO", val: "Recorded & evaluated ✓" });
  } else if (stageNum === 6) {
    const s6 = candidate?.stage6 || {};
    if (s6.option && String(s6.option).trim()) {
      const optLabel = s6.option === "practicode" ? "Practicode Sync" : s6.option === "upload" ? "Academy Log Upload" : "Declared for Later";
      fields.push({ label: "VERIFICATION METHOD", val: optLabel });
    }
    if (s6.practicodeId && String(s6.practicodeId).trim()) fields.push({ label: "PRACTICODE ID", val: String(s6.practicodeId).trim() });
    if (s6.docName && String(s6.docName).trim()) fields.push({ label: "LOG DOCUMENT", val: String(s6.docName).trim() });
    if (s6.accuracyScore) fields.push({ label: "AUDIT ACCURACY", val: `${s6.accuracyScore}%` });
  } else if (stageNum === 7) {
    const s7 = candidate?.stage7 || {};
    if (candidate?.resumeTemplate && String(candidate.resumeTemplate).trim()) {
      fields.push({ label: "TEMPLATE", val: String(candidate.resumeTemplate).trim().toUpperCase() });
    }
    if (candidate?.resumeUrl) fields.push({ label: "RESUME PDF", val: "PDF Generated & Download Ready ✓" });
    if (s7.summary && String(s7.summary).trim()) {
      const isFresher = String(candidate?.stage1?.experience || candidate?.experience || "").toLowerCase() === "fresher";
      fields.push({ label: isFresher ? "CAREER OBJECTIVE" : "PROFESSIONAL SUMMARY", val: String(s7.summary).trim().slice(0, 70) + (s7.summary.length > 70 ? "..." : "") });
    }
  } else if (stageNum === 8) {
    const s8 = candidate?.stage8 || {};
    if (s8.consent) fields.push({ label: "TRACKING CONSENT", val: "Active ✓" });
    if (s8.scheduledSlot && String(s8.scheduledSlot).trim()) fields.push({ label: "SCHEDULED SLOT", val: String(s8.scheduledSlot).trim() });
    if (s8.expectedCtc && String(s8.expectedCtc).trim()) fields.push({ label: "EXPECTED CTC", val: String(s8.expectedCtc).trim() });
  }

  return fields;
}

export default function CandidateDashboard({ profile: initialProfile, onEditStage }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Profile and data state
  const [profile, setProfile] = useState(initialProfile || null);
  const [myApplications, setMyApplications] = useState(initialProfile?.applications || []);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState(null);

  // Active tab: 'home' | 'profile' | 'apply' | 'applications' | 'interviews' | 'learn'
  const initialTab = searchParams.get("tab") || "home";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Search/Filter states for Apply Tab
  const [jobSearch, setJobSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [workModeFilter, setWorkModeFilter] = useState("");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["home", "profile", "apply", "applications", "interviews", "learn"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  function switchTab(tab) {
    setActiveTab(tab);
    setSearchParams({ tab });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Load real profile data
  useEffect(() => {
    api
      .get("/candidate/me")
      .then((res) => {
        if (res.data) {
          setProfile(res.data);
          if (res.data.applications) setMyApplications(res.data.applications);
        }
      })
      .catch((err) => console.error("Could not fetch candidate profile:", err));
  }, []);

  // Fetch real published jobs
  useEffect(() => {
    setJobsLoading(true);
    api
      .get("/public/jobs")
      .then((res) => {
        setJobs(res.data?.jobs || []);
      })
      .catch((err) => {
        console.error("Could not fetch open jobs:", err);
      })
      .finally(() => setJobsLoading(false));
  }, []);

  // Fetch real applications
  useEffect(() => {
    api
      .get("/candidate/applications")
      .then((res) => {
        if (res.data?.applications) setMyApplications(res.data.applications);
      })
      .catch((err) => console.error("Could not fetch applications:", err));
  }, []);

  const candidate = profile?.candidate || profile || {};
  const completedStages = Array.isArray(candidate?.completedStages) ? candidate.completedStages : [];

  // Generate STAGE_ITEMS with ONLY REAL filled fields and accurate verification points
  const STAGE_ITEMS = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
      const filledFields = getStageFilledFields(candidate, completedStages, num);
      const totalFields = STAGE_EXPECTED_FIELDS[num] || 5;
      const maxPts = STAGE_POINTS[num] || 10;
      const filledCount = filledFields.length;
      const fieldPct = Math.round((filledCount / totalFields) * 100);

      let actualPts = 0;
      let status = "NOT STARTED";
      let isVerified = false;

      // Stage 1: Basic Info
      if (num === 1) {
        isVerified = Boolean(candidate?.stage1?.aadhaarVerified);
        actualPts = isVerified ? 5 : 0;
        status = isVerified ? "VERIFIED" : filledCount > 0 ? "IN PROGRESS" : "NOT STARTED";
      }
      // Stage 2: Academy
      else if (num === 2) {
        isVerified = Boolean(completedStages.includes(2) && (candidate?.stage2?.academyName || candidate?.stage2?.instituteName));
        actualPts = isVerified ? 15 : 0;
        status = isVerified ? "VERIFIED" : filledCount > 0 ? "IN PROGRESS" : "NOT STARTED";
      }
      // Stage 3: AAPC/AHIMA Cert - Only awards full 20 pts if audit verified
      else if (num === 3) {
        const certStatus = candidate?.stage3?.certStatus;
        isVerified = Boolean(completedStages.includes(3) && certStatus === "verified");
        if (isVerified) {
          actualPts = 20;
          status = "VERIFIED";
        } else if (certStatus === "rejected") {
          actualPts = 0;
          status = "REJECTED";
        } else if (completedStages.includes(3) || certStatus === "pending") {
          actualPts = 0;
          status = "PENDING AUDIT";
        } else {
          actualPts = 0;
          status = filledCount > 0 ? "IN PROGRESS" : "NOT STARTED";
        }
      }
      // Stage 4: Proctored Assessment - Only awards 25 pts if passed (>= 70%)
      else if (num === 4) {
        const fScore = candidate?.stage4?.foundationScore !== undefined ? candidate.stage4.foundationScore : candidate?.stage4?.score;
        const passed = candidate?.stage4?.passed === true || (fScore !== undefined && fScore >= 70);
        const attempted = fScore !== undefined && fScore !== null;
        if (passed) {
          actualPts = 25;
          status = "VERIFIED";
          isVerified = true;
        } else if (attempted && fScore === 0) {
          actualPts = 0;
          status = "FAILED (RETRY)";
        } else if (attempted) {
          actualPts = Math.round((fScore / 100) * 25);
          status = fScore >= 50 ? "BORDERLINE" : "FAILED (RETRY)";
        } else {
          actualPts = 0;
          status = "NOT STARTED";
        }
      }
      // Stage 5: Communication Video
      else if (num === 5) {
        isVerified = Boolean(completedStages.includes(5) && (candidate?.stage5?.videoUrl || candidate?.stage5?.aiScore));
        actualPts = isVerified ? 10 : 0;
        status = isVerified ? "VERIFIED" : filledCount > 0 ? "IN PROGRESS" : "NOT STARTED";
      }
      // Stage 6: Live Charts
      else if (num === 6) {
        const opt = candidate?.stage6?.option;
        if (completedStages.includes(6) && opt) {
          actualPts = opt === "upload" ? 7 : opt === "declare" ? 3 : 10;
          isVerified = actualPts >= 7;
          status = actualPts >= 7 ? "VERIFIED" : "PARTIAL CREDIT";
        } else {
          actualPts = 0;
          status = filledCount > 0 ? "IN PROGRESS" : "NOT STARTED";
        }
      }
      // Stage 7: Resume
      else if (num === 7) {
        isVerified = Boolean(completedStages.includes(7) && (candidate?.stage7 || candidate?.resumeTemplate));
        actualPts = isVerified ? 10 : 0;
        status = isVerified ? "VERIFIED" : filledCount > 0 ? "IN PROGRESS" : "NOT STARTED";
      }
      // Stage 8: Interview Track
      else if (num === 8) {
        isVerified = Boolean(completedStages.includes(8) && candidate?.stage8?.consent);
        actualPts = isVerified ? 5 : 0;
        status = isVerified ? "VERIFIED" : filledCount > 0 ? "IN PROGRESS" : "NOT STARTED";
      }

      // Stage name & summary text based strictly on filled fields
      const names = {
        1: "Basic Info + Aadhaar OTP",
        2: "Academy + Training",
        3: "AAPC / AHIMA Certification",
        4: "Talentera Assessments",
        5: "Communication + Video",
        6: "Live Chart Exposure",
        7: "Your Verified Resume",
        8: "Live Interview Track",
      };

      let desc = "Not completed yet. Click to start.";
      if (filledFields.length > 0) {
        if (num === 1) {
          desc = candidate?.stage1?.city
            ? `Identity verified via UIDAI. Locality: ${candidate.stage1.city}.`
            : "Identity verified via UIDAI e-KYC.";
        } else if (num === 2) {
          const academy = candidate?.stage2?.academyName || candidate?.stage2?.instituteName;
          const course = candidate?.stage2?.courseName || candidate?.stage2?.specialty || candidate?.stage2?.domain;
          desc = `${academy || "Academy verified"}${course ? ` · ${course}` : ""} · Verified ✓`;
        } else if (num === 3) {
          const body = candidate?.stage3?.body || candidate?.stage3?.issuingBody || "AAPC";
          const cert = candidate?.stage3?.certCode || candidate?.stage3?.certName || "CPC";
          const idStr = candidate?.stage3?.memberId ? ` · ID: ****${String(candidate.stage3.memberId).slice(-4)}` : "";
          if (status === "VERIFIED") {
            desc = `${body.toUpperCase()} ${cert}${idStr} · Verified ✓`;
          } else if (status === "PENDING AUDIT") {
            desc = `${body.toUpperCase()} ${cert}${idStr} · Audit pending by Talentera staff (+20 pts).`;
          } else if (status === "REJECTED") {
            desc = `${body.toUpperCase()} ${cert} · Certificate rejected. Please re-upload.`;
          } else {
            desc = `${body.toUpperCase()} ${cert}${idStr}`;
          }
        } else if (num === 4) {
          const fScore = candidate?.stage4?.foundationScore !== undefined ? candidate.stage4.foundationScore : candidate?.stage4?.score;
          if (status === "VERIFIED") {
            desc = `Assessment score: ${fScore ?? 0}% · Passed verified ✓ (+25 pts)`;
          } else {
            desc = `Assessment score: ${fScore ?? 0}% · Score below 70% passing threshold. Retake to earn +25 pts.`;
          }
        } else if (num === 5) {
          const aiScore = candidate?.stage5?.aiScore !== undefined ? candidate.stage5.aiScore : candidate?.stage5?.score;
          desc = `AI communication score: ${aiScore ?? 0}% · Video recorded ✓`;
        } else if (num === 6) {
          const opt = candidate?.stage6?.option;
          const optLabel = opt === "practicode" ? "Practicode account linked" : opt === "upload" ? "Academy chart log uploaded" : "Chart exposure declared";
          desc = `${optLabel} (${actualPts} / 10 pts earned).`;
        } else if (num === 7) {
          const tmpl = candidate?.resumeTemplate ? candidate.resumeTemplate.toUpperCase() : "Executive";
          desc = `Verified resume active (${tmpl} template).`;
        } else if (num === 8) {
          desc = candidate?.stage8?.scheduledSlot
            ? `Interview slot reserved: ${candidate.stage8.scheduledSlot}.`
            : "Live interview auto-capture consent active.";
        }
      }

      return {
        num,
        name: names[num],
        maxPts,
        actualPts,
        status,
        desc,
        isVerified,
        totalFields,
        filledFields,
        filledCount,
        fieldPct,
      };
    });
  }, [candidate, completedStages]);

  // Real Verification Score calculation (sum of genuinely earned actualPts)
  const totalScore = useMemo(() => {
    return STAGE_ITEMS.reduce((sum, item) => sum + item.actualPts, 0);
  }, [STAGE_ITEMS]);

  // Total verified stages count (only stages with status === "VERIFIED")
  const verifiedStagesCount = useMemo(() => {
    return STAGE_ITEMS.filter((item) => item.isVerified).length;
  }, [STAGE_ITEMS]);

  // Total filled fields across the entire candidate profile
  const totalFilledFieldsCount = useMemo(() => {
    return STAGE_ITEMS.reduce((sum, item) => sum + item.filledCount, 0);
  }, [STAGE_ITEMS]);

  // Overall profile completion percentage based on filled fields
  const profileCompletionPct = Math.round((totalFilledFieldsCount / TOTAL_CANDIDATE_FIELDS) * 100);

  const isVerifiedBadge = totalScore >= GOLD_BADGE_THRESHOLD;
  const pointsToUnlock = 100 - totalScore;

  // Real candidate details
  const rawName =
    candidate?.stage1?.fullName || candidate?.name || (candidate?.email ? candidate.email.split("@")[0] : "Candidate");
  const firstName = rawName.split(" ")[0] || "Candidate";
  const fullName = rawName;
  const initial = (firstName[0] || "C").toUpperCase();
  const locality = candidate?.stage1?.city
    ? candidate.stage1.state
      ? `${candidate.stage1.city}, ${candidate.stage1.state}`
      : candidate.stage1.city
    : "Locality not set";
  const email = candidate?.email || candidate?.stage1?.email || "";
  const mobile = candidate?.stage1?.mobile || candidate?.mobile || "";

  function handleLogout() {
    logout();
    navigate("/");
  }

  function handleStageClick(stageNum) {
    if (onEditStage) {
      onEditStage(stageNum);
    } else {
      navigate(`/dashboard?stage=${stageNum}`);
    }
  }

  // Handle Apply to job
  async function handleApply(jobId, roleTitle, companyName) {
    if (totalScore < GOLD_BADGE_THRESHOLD) {
      toast(
        `Job applications require a verification score of at least ${GOLD_BADGE_THRESHOLD}%. Your current score is ${totalScore}/100. Complete additional stages to unlock applications!`,
        "!"
      );
      return;
    }

    setApplyingJobId(jobId);
    try {
      const res = await api.post(`/candidate/apply/${jobId}`);
      toast(`Application submitted to ${companyName} for ${roleTitle}!`, "✓");
      if (res.data?.application) {
        setMyApplications((prev) => [res.data.application, ...prev.filter((a) => a.jobId !== jobId)]);
      } else {
        const appRes = await api.get("/candidate/applications");
        if (appRes.data?.applications) setMyApplications(appRes.data.applications);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Could not submit application.";
      toast(msg, "!");
    } finally {
      setApplyingJobId(null);
    }
  }

  // Dynamic job match score calculation
  function calculateJobMatch(job) {
    let match = 75;
    const userSpecialty = (candidate?.stage2?.specialty || candidate?.stage1?.currentRole || "").toLowerCase();
    const jobSpec = (job.specialty || job.roleTitle || "").toLowerCase();
    if (userSpecialty && jobSpec.includes(userSpecialty)) match += 12;

    const userCity = (candidate?.stage1?.city || "").toLowerCase();
    const jobLoc = (job.location || "").toLowerCase();
    if (userCity && jobLoc.includes(userCity)) match += 8;
    if ((job.workMode || "").toLowerCase() === "remote") match += 5;

    if (completedStages.includes(3)) match += 3;
    return Math.min(match, 98);
  }

  // Real Action Items derived strictly from unverified stages
  const actionItems = useMemo(() => {
    return STAGE_ITEMS.filter((st) => !st.isVerified).slice(0, 3).map((st) => {
      let title = `Complete Stage ${st.num} — ${st.name}`;
      let sub = `Earn +${st.maxPts - st.actualPts} verification points.`;
      let btnText = "Start now";

      if (st.num === 2) {
        title = "Add Academy & Training details";
        sub = "Link your institute, duration, and trainer verification.";
        btnText = "Add now";
      } else if (st.num === 3) {
        title = "Verify AAPC / AHIMA Certification";
        sub = st.status === "PENDING AUDIT" ? "Certificate uploaded · Awaiting staff audit verification." : "Submit member ID and certificate proof.";
        btnText = st.status === "PENDING AUDIT" ? "View status" : "Verify";
      } else if (st.num === 4) {
        title = "Take Proctored Assessment";
        sub = st.status.includes("FAILED") ? "Assessment score below 70%. Retake to earn +25 pts." : "10 questions · 15 mins · ICD-10 & RCM core skills.";
        btnText = "Retake test";
      } else if (st.num === 5) {
        title = "AI Video & Communication Interview";
        sub = "AI-evaluated verbal and visual communication round.";
        btnText = "Record";
      } else if (st.num === 6) {
        title = "Upgrade Live Chart Exposure";
        sub = st.actualPts > 0 ? "Link Practicode to unlock full +10 points." : "Link Practicode ID or upload academy live charts.";
        btnText = "Link now";
      } else if (st.num === 7) {
        title = "Build & Select Verified Resume";
        sub = "Choose your resume template and generate verified PDF.";
        btnText = "Build resume";
      } else if (st.num === 8) {
        title = "Book Live Interview Track Slot";
        sub = "Select your preferred slot and confirm auto-capture consent.";
        btnText = "Book slot";
      }
      return {
        stageNum: st.num,
        pts: st.maxPts - st.actualPts,
        title,
        sub,
        btnText,
      };
    });
  }, [STAGE_ITEMS]);

  // Filtered jobs in Apply Tab
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (jobSearch.trim()) {
        const needle = jobSearch.trim().toLowerCase();
        const matchesTitle = (job.roleTitle || "").toLowerCase().includes(needle);
        const matchesCompany = (job.companyName || "").toLowerCase().includes(needle);
        const matchesSpec = (job.specialty || "").toLowerCase().includes(needle);
        if (!matchesTitle && !matchesCompany && !matchesSpec) return false;
      }
      if (locationFilter.trim()) {
        const needle = locationFilter.trim().toLowerCase();
        if (!(job.location || "").toLowerCase().includes(needle)) return false;
      }
      if (workModeFilter.trim()) {
        if ((job.workMode || "").toLowerCase() !== workModeFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [jobs, jobSearch, locationFilter, workModeFilter]);

  // Real count of jobs matching candidate's location and specialty
  const specialtyJobsCount = useMemo(() => {
    const spec = (candidate?.stage2?.specialty || candidate?.stage1?.currentRole || "").toLowerCase();
    if (!spec) return 0;
    return jobs.filter((j) => (j.specialty || j.roleTitle || "").toLowerCase().includes(spec)).length;
  }, [jobs, candidate]);

  const localityJobsCount = useMemo(() => {
    const city = (candidate?.stage1?.city || "").toLowerCase();
    if (!city) return 0;
    return jobs.filter((j) => (j.location || "").toLowerCase().includes(city)).length;
  }, [jobs, candidate]);

  const remoteJobsCount = useMemo(() => {
    return jobs.filter((j) => (j.workMode || "").toLowerCase() === "remote").length;
  }, [jobs]);

  // Real Interview list from real sources ONLY
  const interviewRecords = useMemo(() => {
    const list = [];

    // 1. Applications in interviewing or shortlisted status
    myApplications.forEach((app) => {
      if (["interviewing", "shortlisted", "hired"].includes(app.status)) {
        list.push({
          id: `app-${app._id || app.jobId}`,
          title: `${app.companyName || "Employer"} · ${app.roleTitle || "Medical Coder"}`,
          status: app.status.toUpperCase(),
          badgeColor: app.status === "hired" ? "#166534" : app.status === "interviewing" ? "#B45309" : "#1D4ED8",
          badgeBg: app.status === "hired" ? "#DCFCE7" : app.status === "interviewing" ? "#FEF3C7" : "#DBEAFE",
          scoreDisplay: app.status === "hired" ? "OFFERED" : app.status === "interviewing" ? "INTERVIEW" : "SHORTLISTED",
          date: app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Recent",
          desc: app.status === "hired" ? "Candidate hired by employer." : "Active interview tracking in employer pipeline.",
        });
      }
    });

    // 2. Scheduled slot from Stage 8
    if (candidate?.stage8?.scheduledSlot) {
      list.push({
        id: "stage8-slot",
        title: "Live Corporate Interview Slot Reserved",
        status: "RESERVED",
        badgeColor: "#2563EB",
        badgeBg: "#EFF6FF",
        scoreDisplay: "CONFIRMED",
        date: candidate.stage8.scheduledSlot,
        desc: "Talentera corporate interview routing slot booked. Feedback will be logged upon completion.",
      });
    }

    // 3. AI Assessment from Stage 5
    if (completedStages.includes(5) && (candidate?.stage5?.aiScore || candidate?.stage5?.score)) {
      const commScore = candidate.stage5.aiScore || candidate.stage5.score;
      list.push({
        id: "stage5-ai",
        title: "AI Verbal & Visual Communication Interview",
        status: "AI EVALUATED",
        badgeColor: "#059669",
        badgeBg: "#ECFDF5",
        scoreDisplay: `${commScore}%`,
        date: "Stage 5 Completed",
        desc: `Clarity: ${candidate?.stage5?.clarityScore || commScore}% · Fluency: ${candidate?.stage5?.fluencyScore || commScore}% · Confidence: ${candidate?.stage5?.confidenceScore || commScore}%.`,
      });
    }

    return list;
  }, [myApplications, candidate, completedStages]);

  // Circle gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(totalScore, 100) / 100) * circumference;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(1200px 800px at 50% -10%, #0d274c 0%, #06152A 60%, #040D1A 100%)",
        color: "#FFFFFF",
        fontFamily: "var(--font-body, 'Manrope', sans-serif)",
      }}
    >
      {/* 01. TOP NAVIGATION BAR */}
      <CandidateNavbar
        activeTab={activeTab}
        onTabChange={switchTab}
        candidate={candidate}
        counts={{
          filledFields: totalFilledFieldsCount,
          totalFields: TOTAL_CANDIDATE_FIELDS,
          jobsCount: jobs.length,
          applicationsCount: myApplications.length,
          interviewsCount: interviewRecords.length,
        }}
        onEditStage={handleStageClick}
      />

      {/* ========================================================================= */}
      {/* TAB 1: HOME (Candidate Main Dashboard - 100% REAL ACCURATE DATA)          */}
      {/* ========================================================================= */}
      {activeTab === "home" && (
        <>
          {/* HERO SECTION */}
          <section
            style={{
              background: "linear-gradient(135deg, #06152B 0%, #0A1C36 60%, #0E284E 100%)",
              color: "#FFFFFF",
              padding: "44px 32px 48px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                maxWidth: 1200,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "1fr 390px",
                gap: 40,
                alignItems: "center",
              }}
            >
              {/* Left Hero Content */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  <span>
                    👋 Hi <strong>{firstName}</strong>
                  </span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{locality}</span>
                </div>

                <h1
                  style={{
                    fontSize: "36px",
                    fontWeight: 800,
                    lineHeight: 1.2,
                    margin: "0 0 16px 0",
                    letterSpacing: "-0.02em",
                    color: "#FFFFFF",
                  }}
                >
                  Your career is{" "}
                  <span style={{ color: isVerifiedBadge ? "#10B981" : "#F5B41A" }}>
                    {isVerifiedBadge ? "verified" : "in progress"}
                  </span>
                  .
                </h1>

                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    margin: "0 0 24px 0",
                    maxWidth: 620,
                  }}
                >
                  You have verified <strong>{verifiedStagesCount} of 8</strong> stages (
                  <strong>{totalScore}/100</strong> verification points) with{" "}
                  <strong>{totalFilledFieldsCount} of {TOTAL_CANDIDATE_FIELDS}</strong> fields filled (
                  <strong>{profileCompletionPct}%</strong> profile completion).
                  {isVerifiedBadge
                    ? " Your profile meets the 75% gold badge threshold and is active for direct job applications."
                    : ` Complete remaining stages to unlock ${pointsToUnlock} points and reach the 75% verified threshold.`}
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div
                    style={{
                      background: isVerifiedBadge ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                      border: isVerifiedBadge
                        ? "1px solid rgba(16, 185, 129, 0.4)"
                        : "1px solid rgba(245, 158, 11, 0.4)",
                      color: isVerifiedBadge ? "#34D399" : "#FBBF24",
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: isVerifiedBadge ? "#10B981" : "#F59E0B",
                      }}
                    />
                    CAREER PASSPORT · {isVerifiedBadge ? "VERIFIED (GREEN)" : "IN PROGRESS"}
                  </div>

                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "#FFFFFF",
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#60A5FA" }} />
                    {totalFilledFieldsCount} / {TOTAL_CANDIDATE_FIELDS} FIELDS FILLED ({profileCompletionPct}%)
                  </div>

                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "#FFFFFF",
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#A78BFA" }} />
                    PROFILE {candidate?.isSubmitted ? "SUBMITTED" : "IN SETUP"}
                  </div>
                </div>
              </div>

              {/* Right Hero Score Card */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(16px)",
                  borderRadius: 20,
                  padding: "24px 26px",
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                }}
              >
                {/* Radial SVG Gauge */}
                <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
                  <svg width="96" height="96" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r={radius} stroke="rgba(255, 255, 255, 0.15)" strokeWidth="8" fill="none" />
                    <circle
                      cx="48"
                      cy="48"
                      r={radius}
                      stroke={isVerifiedBadge ? "#10B981" : "#F5A623"}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      transform="rotate(-90 48 48)"
                    />
                  </svg>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: 24, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>{totalScore}</span>
                    <span style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.6)", fontWeight: 600 }}>/ 100</span>
                  </div>
                </div>

                {/* Score Meta */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div
                    style={{
                      alignSelf: "flex-start",
                      background: isVerifiedBadge ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 166, 35, 0.15)",
                      border: isVerifiedBadge
                        ? "1px solid rgba(16, 185, 129, 0.6)"
                        : "1px solid rgba(245, 166, 35, 0.6)",
                      color: isVerifiedBadge ? "#34D399" : "#F5C95B",
                      fontSize: 10,
                      fontWeight: 900,
                      padding: "3px 10px",
                      borderRadius: 12,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {isVerifiedBadge ? "VERIFIED ★" : "IN PROGRESS"}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.2 }}>
                    Verification Score
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)" }}>
                    {verifiedStagesCount} of 8 stages verified · {totalFilledFieldsCount}/{TOTAL_CANDIDATE_FIELDS} fields
                  </div>
                  {pointsToUnlock > 0 ? (
                    <div
                      onClick={() => handleStageClick(actionItems[0]?.stageNum || 1)}
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#F5C95B",
                        cursor: "pointer",
                        marginTop: 2,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      +{pointsToUnlock} pts remaining across {8 - verifiedStagesCount} stages →
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#34D399", marginTop: 2 }}>
                      ✓ All stages verified (100 pts)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* VERIFICATION FUNNEL & 8 STAGES GRID */}
          <section className="cand-cream-dot-bg" style={{ borderTop: "1px solid #E5E0D5", minHeight: "60vh" }}>
            <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 32px 64px" }}>
              <div
                style={{
                  marginBottom: 24,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#059669",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.8px",
                      marginBottom: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#10B981",
                        boxShadow: "0 0 8px rgba(16,185,129,0.5)",
                      }}
                    />
                    VERIFICATION FUNNEL
                  </div>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0A1F3D", margin: "0 0 6px 0" }}>
                    Your 8 verification stages ({verifiedStagesCount}/8 verified · {totalFilledFieldsCount}/{TOTAL_CANDIDATE_FIELDS} fields filled)
                  </h2>
                  <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
                    Stages earn points when verified. Click any stage to complete required fields or check verification status.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => switchTab("profile")}
                  style={{
                    background: "linear-gradient(135deg, #F5B82E 0%, #E5A82E 100%)",
                    color: "#06152A",
                    border: "none",
                    borderRadius: 20,
                    padding: "10px 24px",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(245, 184, 46, 0.35)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  View all filled fields →
                </button>
              </div>

              {/* 8 STAGES CARDS GRID (4 cols x 2 rows) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 36 }}>
                {STAGE_ITEMS.map((item) => {
                  const isDone = item.status === "VERIFIED";
                  const isPending = item.status === "PENDING AUDIT" || item.status === "IN PROGRESS" || item.status === "PARTIAL CREDIT";
                  const isFailed = item.status.includes("FAILED") || item.status === "REJECTED";

                  return (
                    <div
                      key={item.num}
                      onClick={() => handleStageClick(item.num)}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: 16,
                        border: isDone
                          ? "1.5px solid #A7F3D0"
                          : isFailed
                          ? "1.5px solid #FECACA"
                          : isPending
                          ? "1.5px solid #FDE68A"
                          : "1px solid #E2E8F0",
                        padding: "18px 18px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                        position: "relative",
                        overflow: "hidden",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.03)";
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: isDone
                            ? "#10B981"
                            : isFailed
                            ? "#EF4444"
                            : isPending
                            ? "#F59E0B"
                            : "#CBD5E1",
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>
                          STAGE {item.num}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: item.filledCount > 0 ? "#059669" : "#94A3B8",
                            background: item.filledCount > 0 ? "#ECFDF5" : "#F1F5F9",
                            padding: "2px 6px",
                            borderRadius: 6,
                          }}
                        >
                          {item.filledCount} / {item.totalFields} fields ({item.fieldPct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 14.5,
                          fontWeight: 800,
                          color: "#0A1F3D",
                          minHeight: 38,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                          <span style={{ fontSize: 20, fontWeight: 900, color: "#0A1F3D" }}>{item.actualPts}</span>
                          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>/ {item.maxPts} pts</span>
                        </div>
                        {isDone && (
                          <span
                            style={{
                              background: "#ECFDF5",
                              color: "#059669",
                              border: "1px solid #A7F3D0",
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: 10,
                            }}
                          >
                            ✓ VERIFIED
                          </span>
                        )}
                        {item.status === "PENDING AUDIT" && (
                          <span
                            style={{
                              background: "#EFF6FF",
                              color: "#2563EB",
                              border: "1px solid #BFDBFE",
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: 10,
                            }}
                          >
                            PENDING AUDIT
                          </span>
                        )}
                        {item.status === "PARTIAL CREDIT" && (
                          <span
                            style={{
                              background: "#FEF3C7",
                              color: "#B45309",
                              border: "1px solid #FDE68A",
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: 10,
                            }}
                          >
                            PARTIAL CREDIT
                          </span>
                        )}
                        {item.status === "IN PROGRESS" && (
                          <span
                            style={{
                              background: "#FEF3C7",
                              color: "#B45309",
                              border: "1px solid #FDE68A",
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: 10,
                            }}
                          >
                            IN PROGRESS
                          </span>
                        )}
                        {isFailed && (
                          <span
                            style={{
                              background: "#FEE2E2",
                              color: "#DC2626",
                              border: "1px solid #FECACA",
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: 10,
                            }}
                          >
                            {item.status}
                          </span>
                        )}
                        {item.status === "NOT STARTED" && (
                          <span
                            style={{
                              background: "#F1F5F9",
                              color: "#64748B",
                              border: "1px solid #E2E8F0",
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: 10,
                            }}
                          >
                            NOT STARTED
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 4,
                          background: "#F1F5F9",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${item.fieldPct}%`,
                            background: isDone
                              ? "#10B981"
                              : isFailed
                              ? "#EF4444"
                              : isPending
                              ? "#F59E0B"
                              : "#CBD5E1",
                          }}
                        />
                      </div>
                      <p style={{ fontSize: 12, color: "#64748B", margin: 0, lineHeight: 1.45, minHeight: 38 }}>
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* BOTTOM 2-COLUMN SECTION */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 370px", gap: 24, alignItems: "start" }}>
                {/* Left Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* My Applications Card */}
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderRadius: 16,
                      padding: "22px 24px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 18,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: "#EFF6FF",
                            color: "#2563EB",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                          }}
                        >
                          <i className="fa-solid fa-file-lines"></i>
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A1F3D", margin: 0 }}>
                          My Applications ({myApplications.length})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => switchTab("applications")}
                        style={{
                          color: "#D97706",
                          fontSize: 13,
                          fontWeight: 700,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        View all ({myApplications.length}) →
                      </button>
                    </div>

                    {myApplications.length === 0 ? (
                      <div
                        style={{
                          padding: "28px 16px",
                          textAlign: "center",
                          background: "#F8FAFC",
                          borderRadius: 12,
                          border: "1px dashed #CBD5E1",
                        }}
                      >
                        <p style={{ color: "#64748B", fontSize: 13, margin: "0 0 12px 0" }}>
                          0 applications submitted yet. Browse matching jobs to apply with your verified profile.
                        </p>
                        <button
                          type="button"
                          onClick={() => switchTab("apply")}
                          style={{
                            background: "#0A1F3D",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 8,
                            padding: "8px 16px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Browse open jobs →
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {myApplications.slice(0, 3).map((app, idx) => {
                          const statusKey = (app.status || "applied").toLowerCase();
                          const conf = STATUS_CONFIG[statusKey] || STATUS_CONFIG.applied;
                          const compName = app.companyName || app.companyId?.companyName || "Employer";
                          const appInitial = (compName[0] || "E").toUpperCase();
                          const roleName = app.roleTitle || app.companyId?.stage9?.roletitle || "Medical Coder";
                          const locName = app.location || app.companyId?.stage9?.location || "India";
                          const dateStr = app.createdAt
                            ? new Date(app.createdAt).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })
                            : "Recent";

                          return (
                            <div
                              key={app._id || idx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingBottom: 14,
                                borderBottom: idx < Math.min(myApplications.length, 3) - 1 ? "1px solid #F1F5F9" : "none",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: "50%",
                                    background: "#0D9488",
                                    color: "#FFFFFF",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 800,
                                    fontSize: 13,
                                  }}
                                >
                                  {appInitial}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 14, color: "#0A1F3D" }}>{compName}</div>
                                  <div style={{ fontSize: 12, color: "#64748B" }}>
                                    {roleName} · {locName}
                                  </div>
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div
                                  style={{
                                    background: conf.bg,
                                    color: conf.color,
                                    border: `1px solid ${conf.border}`,
                                    fontSize: 10,
                                    fontWeight: 900,
                                    padding: "3px 10px",
                                    borderRadius: 10,
                                    display: "inline-block",
                                  }}
                                >
                                  {conf.label}
                                </div>
                                <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Applied {dateStr}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Real Interview Track Record Card */}
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderRadius: 16,
                      padding: "22px 24px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 18,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: "#F5F3FF",
                            color: "#7C3AED",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                          }}
                        >
                          <i className="fa-solid fa-briefcase"></i>
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A1F3D", margin: 0 }}>
                          Interview track record ({interviewRecords.length})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => switchTab("interviews")}
                        style={{
                          color: "#D97706",
                          fontSize: 13,
                          fontWeight: 700,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        View all ({interviewRecords.length}) →
                      </button>
                    </div>

                    {interviewRecords.length === 0 ? (
                      <div
                        style={{
                          padding: "24px 16px",
                          textAlign: "center",
                          background: "#F8FAFC",
                          borderRadius: 12,
                          border: "1px dashed #CBD5E1",
                        }}
                      >
                        <p style={{ color: "#64748B", fontSize: 13, margin: "0 0 12px 0" }}>
                          0 interviews logged. When employers schedule interviews or you book a slot in Stage 8, your history appears here.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleStageClick(8)}
                          style={{
                            background: "#0A1F3D",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 8,
                            padding: "8px 16px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Book Interview Track Slot (Stage 8) →
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {interviewRecords.slice(0, 3).map((rec, idx) => (
                          <div
                            key={rec.id || idx}
                            style={{
                              display: "flex",
                              gap: 14,
                              alignItems: "center",
                              paddingBottom: 14,
                              borderBottom: idx < Math.min(interviewRecords.length, 3) - 1 ? "1px solid #F1F5F9" : "none",
                            }}
                          >
                            <div
                              style={{
                                width: 76,
                                height: 52,
                                borderRadius: 10,
                                background: rec.badgeBg,
                                color: rec.badgeColor,
                                border: `1px solid ${rec.badgeColor}40`,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                textAlign: "center",
                              }}
                            >
                              <span style={{ fontSize: 14, fontWeight: 900, lineHeight: 1 }}>{rec.scoreDisplay}</span>
                              <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.5px", marginTop: 2 }}>
                                {rec.status}
                              </span>
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 14, color: "#0A1F3D" }}>
                                {rec.title} · {rec.date}
                              </div>
                              <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{rec.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Real Companies Matched Card */}
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderRadius: 16,
                      padding: "22px 24px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 18,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: "#ECFDF5",
                            color: "#059669",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                          }}
                        >
                          <i className="fa-solid fa-magnifying-glass"></i>
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A1F3D", margin: 0 }}>
                          {jobs.length} jobs available for your profile
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => switchTab("apply")}
                        style={{
                          color: "#D97706",
                          fontSize: 13,
                          fontWeight: 700,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Browse all ({jobs.length}) →
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                      <div
                        style={{
                          background: "#F8FAFC",
                          borderRadius: 12,
                          padding: "16px 14px",
                          textAlign: "center",
                          border: "1px solid #E2E8F0",
                        }}
                      >
                        <div style={{ fontSize: 26, fontWeight: 900, color: "#B45309" }}>{jobs.length}</div>
                        <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 4 }}>
                          Live postings
                        </div>
                      </div>
                      <div
                        style={{
                          background: "#F8FAFC",
                          borderRadius: 12,
                          padding: "16px 14px",
                          textAlign: "center",
                          border: "1px solid #E2E8F0",
                        }}
                      >
                        <div style={{ fontSize: 26, fontWeight: 900, color: "#B45309" }}>
                          {specialtyJobsCount}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 4 }}>
                          In your specialty
                        </div>
                      </div>
                      <div
                        style={{
                          background: "#F8FAFC",
                          borderRadius: 12,
                          padding: "16px 14px",
                          textAlign: "center",
                          border: "1px solid #E2E8F0",
                        }}
                      >
                        <div style={{ fontSize: 26, fontWeight: 900, color: "#B45309" }}>
                          {localityJobsCount}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 4 }}>
                          In {candidate?.stage1?.city || "your locality"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => switchTab("apply")}
                        style={{
                          background: "#0A1F3D",
                          color: "#FFFFFF",
                          borderRadius: 12,
                          padding: "16px 14px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(10, 31, 61, 0.2)",
                        }}
                      >
                        <span style={{ fontSize: 18, color: "#F5B82E", fontWeight: 900 }}>→</span>
                        <span style={{ fontSize: 12, fontWeight: 900, color: "#FFFFFF" }}>
                          View {jobs.length} roles
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Action Items Card */}
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderRadius: 16,
                      padding: "22px 24px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        color: "#D97706",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.8px",
                        marginBottom: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
                      ACTION ITEMS ({actionItems.length} PENDING)
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0A1F3D", margin: "0 0 6px 0" }}>
                      Unlock more verification points
                    </h3>
                    <p style={{ color: "#64748B", fontSize: 12, margin: "0 0 18px 0" }}>
                      Reach the 75-point gold badge threshold to unlock direct employer job applications.
                    </p>

                    {actionItems.length === 0 ? (
                      <div
                        style={{
                          padding: 16,
                          borderRadius: 10,
                          background: "#ECFDF5",
                          border: "1px solid #A7F3D0",
                          color: "#065F46",
                          fontSize: 13,
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        ✓ All 8 verification stages complete! You hold 100/100 points.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {actionItems.map((item, idx) => (
                          <div
                            key={item.stageNum}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              paddingBottom: idx < actionItems.length - 1 ? 12 : 0,
                              borderBottom: idx < actionItems.length - 1 ? "1px solid #F1F5F9" : "none",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  background: "#FEF3C7",
                                  color: "#92400E",
                                  border: "1px solid #FDE68A",
                                  fontWeight: 900,
                                  fontSize: 12,
                                  padding: "4px 8px",
                                  borderRadius: 8,
                                }}
                              >
                                +{item.pts}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: "#0A1F3D" }}>{item.title}</div>
                                <div style={{ fontSize: 11, color: "#64748B", maxWidth: 170 }}>{item.sub}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStageClick(item.stageNum)}
                              style={{
                                background: idx === 0 ? "linear-gradient(135deg, #F5B82E 0%, #E5A82E 100%)" : "#F8FAFC",
                                border: idx === 0 ? "none" : "1px solid #CBD5E1",
                                borderRadius: 16,
                                padding: "5px 14px",
                                fontSize: 12,
                                fontWeight: 800,
                                color: idx === 0 ? "#06152A" : "#0A1F3D",
                                cursor: "pointer",
                                boxShadow: idx === 0 ? "0 2px 8px rgba(245, 184, 46, 0.3)" : "none",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.btnText}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Profile Status Card */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #0A1F3D 0%, #06152A 100%)",
                      border: isVerifiedBadge ? "1.5px solid #FDE68A" : "1.5px solid rgba(255,255,255,0.15)",
                      borderRadius: 16,
                      padding: "24px 22px",
                      color: "#FFFFFF",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    }}
                  >
                    <div style={{ fontSize: 30, color: "#F5B82E" }}>
                      <i className="fa-solid fa-trophy"></i>
                    </div>
                    <div style={{ color: "#F5B82E", fontSize: 10, fontWeight: 900, letterSpacing: "1px" }}>
                      {isVerifiedBadge ? "TALENTERA VERIFIED CANDIDATE" : "CAREER VERIFICATION"}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>
                      {isVerifiedBadge ? "Gold Badge Earned (75+ pts)" : `${totalScore} / 100 Points Verified`}
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "0 0 10px 0", lineHeight: 1.45 }}>
                      {isVerifiedBadge
                        ? "Your profile is verified and active in employer hiring pools."
                        : `Complete ${pointsToUnlock} more points to reach the 75% gold badge threshold.`}
                    </p>
                    <button
                      type="button"
                      onClick={() => switchTab("apply")}
                      style={{
                        background: "linear-gradient(135deg, #F5B82E 0%, #E5A82E 100%)",
                        color: "#06152A",
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 20px",
                        fontWeight: 900,
                        fontSize: 13,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: "0 4px 14px rgba(245, 184, 46, 0.35)",
                      }}
                    >
                      Browse matching jobs ({jobs.length}) →
                    </button>
                  </div>

                  {/* Alumni Network */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #064E3B 0%, #059669 100%)",
                      border: "1px solid rgba(16, 185, 129, 0.35)",
                      borderRadius: 16,
                      padding: "26px 22px",
                      color: "#FFFFFF",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        marginBottom: 4,
                      }}
                    >
                      <i className="fa-solid fa-users"></i>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>1,247+</div>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px" }}>PLACED CANDIDATES</div>
                    <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.8)", marginBottom: 10 }}>
                      Talentera verified talent network
                    </div>
                    <button
                      type="button"
                      onClick={() => window.open("https://chat.whatsapp.com/", "_blank")}
                      style={{
                        background: "rgba(255, 255, 255, 0.2)",
                        border: "1px solid rgba(255, 255, 255, 0.4)",
                        color: "#FFFFFF",
                        borderRadius: 20,
                        padding: "8px 20px",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Join community group →
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </section>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROFILE (8-Stage Verification Detail - ONLY FILLED FIELDS)         */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <section className="cand-cream-dot-bg" style={{ minHeight: "80vh", borderTop: "1px solid #E5E0D5" }}>
          <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 64px" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: "#D97706", fontSize: 11, fontWeight: 800, letterSpacing: "1px", marginBottom: 6 }}>
                ● YOUR VERIFIED PROFILE
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: "#0A1F3D", margin: "0 0 8px 0" }}>
                8-stage verification detail ({totalFilledFieldsCount} of {TOTAL_CANDIDATE_FIELDS} fields filled · {profileCompletionPct}%)
              </h1>
              <p style={{ color: "#64748B", fontSize: 13.5, margin: 0 }}>
                Displaying only fields that have been filled in and verified. Click any stage to add or update your data.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {STAGE_ITEMS.map((st) => (
                <div
                  key={st.num}
                  onClick={() => handleStageClick(st.num)}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 16,
                    border: "1px solid #E2E8F0",
                    borderLeft: st.isVerified ? "4px solid #10B981" : "4px solid #F59E0B",
                    padding: "24px 28px",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
                  }}
                >
                  {/* Top header row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: "0.8px" }}>
                        STAGE {st.num} · {st.actualPts} / {st.maxPts} PTS
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: st.filledCount > 0 ? "#059669" : "#94A3B8",
                          background: st.filledCount > 0 ? "#ECFDF5" : "#F1F5F9",
                          padding: "2px 8px",
                          borderRadius: 8,
                        }}
                      >
                        {st.filledCount} / {st.totalFields} fields filled ({st.fieldPct}%)
                      </span>
                    </div>
                    {st.status === "VERIFIED" && (
                      <span
                        style={{
                          background: "#ECFDF5",
                          color: "#059669",
                          border: "1px solid #A7F3D0",
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        ✓ VERIFIED
                      </span>
                    )}
                    {st.status === "IN PROGRESS" && (
                      <span
                        style={{
                          background: "#FEF3C7",
                          color: "#D97706",
                          border: "1px solid #FDE68A",
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        IN PROGRESS
                      </span>
                    )}
                    {st.status === "PARTIAL CREDIT" && (
                      <span
                        style={{
                          background: "#FEF3C7",
                          color: "#B45309",
                          border: "1px solid #FDE68A",
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        PARTIAL CREDIT ({st.actualPts} PTS)
                      </span>
                    )}
                    {st.status === "REJECTED" && (
                      <span
                        style={{
                          background: "#FEE2E2",
                          color: "#DC2626",
                          border: "1px solid #FECACA",
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        REJECTED
                      </span>
                    )}
                    {st.status === "PENDING AUDIT" && (
                      <span
                        style={{
                          background: "#EFF6FF",
                          color: "#2563EB",
                          border: "1px solid #BFDBFE",
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        PENDING AUDIT
                      </span>
                    )}
                    {st.status.includes("FAILED") && (
                      <span
                        style={{
                          background: "#FEE2E2",
                          color: "#DC2626",
                          border: "1px solid #FECACA",
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {st.status}
                      </span>
                    )}
                    {st.status === "NOT STARTED" && (
                      <span
                        style={{
                          background: "#F1F5F9",
                          color: "#64748B",
                          border: "1px solid #E2E8F0",
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        NOT STARTED
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", margin: "0 0 16px 0" }}>
                    {st.name}
                  </h3>

                  {/* ONLY FILLED FIELDS GRID */}
                  {st.filledFields.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px 16px" }}>
                      {st.filledFields.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            background: "#F8FAFC",
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: "#64748B",
                              letterSpacing: "0.6px",
                              marginBottom: 3,
                            }}
                          >
                            {d.label}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0A1F3D", wordBreak: "break-word" }}>
                            {d.val}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "#F8FAFC",
                        padding: "14px 18px",
                        borderRadius: 10,
                        border: "1px dashed #CBD5E1",
                        color: "#64748B",
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>No fields filled yet for this stage.</span>
                      <span style={{ color: "#D97706", fontWeight: 700, fontSize: 12 }}>
                        Click to start and earn +{st.maxPts} pts →
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </main>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: APPLY (Open Roles Matched to Your Profile)                         */}
      {/* ========================================================================= */}
      {activeTab === "apply" && (
        <section className="cand-cream-dot-bg" style={{ minHeight: "80vh", borderTop: "1px solid #E5E0D5" }}>
          <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 24px 64px" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: "#059669", fontSize: 11, fontWeight: 800, letterSpacing: "1px", marginBottom: 6 }}>
                ● REAL JOB MATCHES
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: "#0A1F3D", margin: "0 0 8px 0" }}>
                {filteredJobs.length} open roles matching your profile
              </h1>
              <p style={{ color: "#64748B", fontSize: 13.5, margin: 0 }}>
                {totalScore < GOLD_BADGE_THRESHOLD
                  ? `Notice: You need a verification score of at least ${GOLD_BADGE_THRESHOLD}% to submit applications. Your current score is ${totalScore}/100.`
                  : "Your verified profile is eligible. Apply with one click — your verified credentials and scores are auto-attached."}
              </p>
            </div>

            {/* Filters Bar */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 24,
                flexWrap: "wrap",
                background: "#FFFFFF",
                padding: "14px 18px",
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <input
                type="text"
                placeholder="Search role, specialty, or company..."
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <input
                type="text"
                placeholder="Filter by city (e.g. Hyderabad)..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                style={{
                  width: 200,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <select
                value={workModeFilter}
                onChange={(e) => setWorkModeFilter(e.target.value)}
                style={{
                  width: 140,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  fontSize: 13,
                  background: "#FFFFFF",
                  outline: "none",
                }}
              >
                <option value="">All Modes</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">Onsite</option>
              </select>
              {(jobSearch || locationFilter || workModeFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setJobSearch("");
                    setLocationFilter("");
                    setWorkModeFilter("");
                  }}
                  style={{
                    background: "#F1F5F9",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {jobsLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748B" }}>
                Loading open roles…
              </div>
            ) : filteredJobs.length === 0 ? (
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 16,
                  border: "1px dashed #CBD5E1",
                  padding: "48px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", margin: "0 0 8px 0" }}>
                  No jobs matched your search
                </h3>
                <p style={{ color: "#64748B", fontSize: 13, margin: "0 0 16px 0" }}>
                  Try adjusting or clearing your search filters to view all available roles.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setJobSearch("");
                    setLocationFilter("");
                    setWorkModeFilter("");
                  }}
                  style={{
                    background: "#0A1F3D",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 18px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {filteredJobs.map((job) => {
                  const matchScore = calculateJobMatch(job);
                  const isApplied = myApplications.some((a) => a.jobId === job.jobId);
                  const isApplying = applyingJobId === job.jobId;

                  return (
                    <div
                      key={job.jobId}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: 16,
                        border: "1px solid #E2E8F0",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 14,
                        boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
                      }}
                    >
                      <div>
                        {/* Match Badge */}
                        <div
                          style={{
                            display: "inline-block",
                            background: "#FEF3C7",
                            border: "1px solid #FDE68A",
                            color: "#B45309",
                            fontSize: 10.5,
                            fontWeight: 900,
                            padding: "4px 9px",
                            borderRadius: 6,
                            letterSpacing: "0.5px",
                            marginBottom: 12,
                          }}
                        >
                          {matchScore}% MATCH
                        </div>

                        {/* Role & Company */}
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A1F3D", margin: "0 0 4px 0" }}>
                          {job.roleTitle}
                        </h3>
                        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
                          {job.companyName} · {job.location || "Onsite"}{" "}
                          {job.workMode ? `(${job.workMode})` : ""}
                        </div>

                        {/* Tags */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {job.compMin && job.compMax ? (
                            <span
                              style={{
                                background: "#ECFDF5",
                                border: "1px solid #A7F3D0",
                                color: "#059669",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 6,
                              }}
                            >
                              ₹{job.compMin}–{job.compMax} LPA
                            </span>
                          ) : null}
                          {job.shift && (
                            <span
                              style={{
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                color: "#475569",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 6,
                              }}
                            >
                              {job.shift}
                            </span>
                          )}
                          {job.expMin !== null && job.expMax !== null && (
                            <span
                              style={{
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                color: "#475569",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 6,
                              }}
                            >
                              {job.expMin}–{job.expMax} yrs
                            </span>
                          )}
                          {job.urgency && (
                            <span
                              style={{
                                background: "#FFEDD5",
                                border: "1px solid #FED7AA",
                                color: "#C2410C",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 6,
                              }}
                            >
                              {job.urgency}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Apply Row */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderTop: "1px solid #F1F5F9",
                          paddingTop: 12,
                        }}
                      >
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>
                          {job.publishedAt
                            ? new Date(job.publishedAt).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })
                            : "Recently posted"}
                        </span>

                        {isApplied ? (
                          <span
                            style={{
                              background: "#ECFDF5",
                              color: "#059669",
                              border: "1px solid #A7F3D0",
                              fontSize: 11.5,
                              fontWeight: 800,
                              padding: "6px 14px",
                              borderRadius: 8,
                            }}
                          >
                            ✓ Applied
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isApplying}
                            onClick={() => handleApply(job.jobId, job.roleTitle, job.companyName)}
                            style={{
                              background: totalScore >= GOLD_BADGE_THRESHOLD ? "#0A1F3D" : "#94A3B8",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: 8,
                              padding: "7px 16px",
                              fontWeight: 800,
                              fontSize: 12,
                              cursor: totalScore >= GOLD_BADGE_THRESHOLD ? "pointer" : "not-allowed",
                              boxShadow: "0 2px 8px rgba(10, 31, 61, 0.2)",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {isApplying ? "Applying..." : "Apply →"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: APPLICATIONS (Real Candidate Applications Tracker)                 */}
      {/* ========================================================================= */}
      {activeTab === "applications" && (
        <section className="cand-cream-dot-bg" style={{ minHeight: "80vh", borderTop: "1px solid #E5E0D5" }}>
          <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 64px" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: "#D97706", fontSize: 11, fontWeight: 800, letterSpacing: "1px", marginBottom: 6 }}>
                ● APPLICATION TRACKER
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: "#0A1F3D", margin: "0 0 8px 0" }}>
                {myApplications.length} active application{myApplications.length === 1 ? "" : "s"}
              </h1>
              <p style={{ color: "#64748B", fontSize: 13.5, margin: 0 }}>
                Track live status updates, employer review milestones, and interview schedules.
              </p>
            </div>

            {myApplications.length === 0 ? (
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 16,
                  border: "1px dashed #CBD5E1",
                  padding: "48px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", margin: "0 0 8px 0" }}>
                  You haven't submitted any applications yet
                </h3>
                <p style={{ color: "#64748B", fontSize: 13, margin: "0 0 16px 0" }}>
                  Explore verified employer job listings and apply with your verified credentials.
                </p>
                <button
                  type="button"
                  onClick={() => switchTab("apply")}
                  style={{
                    background: "linear-gradient(135deg, #F5B82E 0%, #E5A82E 100%)",
                    color: "#06152A",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(245, 184, 46, 0.3)",
                  }}
                >
                  Browse open jobs →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {myApplications.map((app, idx) => {
                  const statusKey = (app.status || "applied").toLowerCase();
                  const conf = STATUS_CONFIG[statusKey] || STATUS_CONFIG.applied;
                  const compName = app.companyName || app.companyId?.companyName || "Employer";
                  const roleName = app.roleTitle || app.companyId?.stage9?.roletitle || "Medical Coder";
                  const locName = app.location || app.companyId?.stage9?.location || "India";
                  const dateStr = app.createdAt
                    ? new Date(app.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Recently";

                  return (
                    <div
                      key={app._id || idx}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: 16,
                        border: `1.5px solid ${conf.border}`,
                        padding: "24px 28px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0A1F3D", margin: "0 0 4px 0" }}>
                          {compName}
                        </h3>
                        <div style={{ fontSize: 13, color: "#64748B", marginBottom: 6 }}>
                          {roleName} · {locName}
                        </div>
                        <div style={{ fontSize: 12.5, color: "#334155" }}>{conf.desc}</div>
                        {app.coverNote && (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "#64748B",
                              marginTop: 6,
                              fontStyle: "italic",
                            }}
                          >
                            Cover note: "{app.coverNote}"
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            background: conf.bg,
                            border: `1px solid ${conf.border}`,
                            color: conf.color,
                            fontWeight: 900,
                            fontSize: 11,
                            padding: "5px 12px",
                            borderRadius: 8,
                            letterSpacing: "0.5px",
                            display: "inline-block",
                          }}
                        >
                          {conf.label}
                        </span>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>
                          Applied {dateStr}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: INTERVIEWS (Real Interview History & Scheduled Rounds)             */}
      {/* ========================================================================= */}
      {activeTab === "interviews" && (
        <section className="cand-cream-dot-bg" style={{ minHeight: "80vh", borderTop: "1px solid #E5E0D5" }}>
          <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 64px" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: "#059669", fontSize: 11, fontWeight: 800, letterSpacing: "1px", marginBottom: 6 }}>
                ● INTERVIEW HISTORY & TRACK
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: "#0A1F3D", margin: "0 0 8px 0" }}>
                Every interview, every outcome ({interviewRecords.length})
              </h1>
              <p style={{ color: "#64748B", fontSize: 13.5, margin: 0 }}>
                Aggregated record of employer interviews, booked slots, and AI assessment evaluations.
              </p>
            </div>

            {interviewRecords.length === 0 ? (
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 16,
                  border: "1px dashed #CBD5E1",
                  padding: "48px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎙️</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", margin: "0 0 8px 0" }}>
                  No interview records logged yet
                </h3>
                <p style={{ color: "#64748B", fontSize: 13, margin: "0 0 16px 0", maxWidth: 500, marginInline: "auto" }}>
                  Interviews scheduled by employers who shortlist your profile or booked via Stage 8 will be automatically recorded here.
                </p>
                <button
                  type="button"
                  onClick={() => handleStageClick(8)}
                  style={{
                    background: "linear-gradient(135deg, #F5B82E 0%, #E5A82E 100%)",
                    color: "#06152A",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(245, 184, 46, 0.3)",
                  }}
                >
                  Book Live Interview Track Slot →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {interviewRecords.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      background: "#FFFFFF",
                      borderRadius: 16,
                      border: "1px solid #E2E8F0",
                      padding: "20px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        width: 84,
                        height: 58,
                        borderRadius: 10,
                        background: rec.badgeBg,
                        border: `1px solid ${rec.badgeColor}40`,
                        color: rec.badgeColor,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        textAlign: "center",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 900, lineHeight: 1 }}>{rec.scoreDisplay}</span>
                      <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.5px", marginTop: 2 }}>
                        {rec.status}
                      </span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0A1F3D", margin: "0 0 4px 0" }}>
                        {rec.title} · {rec.date}
                      </h3>
                      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{rec.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: LEARN (Clinical Refresher Modules, Certifications & Resume Lab)     */}
      {/* ========================================================================= */}
      {activeTab === "learn" && (
        <LearnContent candidate={candidate} onEditStage={handleStageClick} />
      )}
    </div>
  );
}
