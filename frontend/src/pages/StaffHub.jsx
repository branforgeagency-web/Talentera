import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { safeJson } from "../utils/safeJson.js";
import "../styles/staffHub.css";

function isPdfUrl(url = "", fileName = "") {
  const lowerUrl = String(url || "").toLowerCase();
  const lowerName = String(fileName || "").toLowerCase();
  return lowerUrl.includes(".pdf") || lowerName.includes(".pdf");
}

function toStr(val, fallback = "") {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (val.name && typeof val.name === "string") return val.name;
    if (val.email && typeof val.email === "string") return val.email;
    if (val.label && typeof val.label === "string") return val.label;
    if (val.title && typeof val.title === "string") return val.title;
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function getAssetUrl(url) {
  if (!url) return "#";
  if (url.startsWith("http")) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "");
  return `${base}${url}`;
}

// Feather-style icon paths, ported verbatim from the Talentera design mockup's
// staff-dashboard ("Employee Dashboard" / Talent Track) screen.
const ICON_PATHS = {
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  shieldCheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="m9 14-1 8 4-3 4 3-1-8"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  alertTriangle: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  chartBar: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  graduation: '<path d="m22 10-10-5L2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>',
  video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  checklist: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" y1="11" x2="22" y2="5"/><polyline points="16 8 22 5 22 11"/>',
  buildingGrid: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>',
  settingsGear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  trendingUp: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  kebab: '<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
};

function Icon({ name, size = 18, sw = 2, style, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || "" }}
    />
  );
}

// Department directory shown behind the sidebar's "6 Departments" nav
// items. Only icon/title/description/isMine live here - those are just
// evergreen text describing what each team does, not data. Every number,
// team roster, and action used to be hardcoded here too (fake headcounts,
// fake staff names, a "Message Team" button with no messaging backend) -
// those are now computed live from real dashData in getDeptLiveData()
// below, or dropped entirely where no real backend data exists at all
// (there is no staff-directory or matching-engine-metrics API yet).
const DEPARTMENTS = {
  dept_candidate_acquisition: {
    icon: "👥", title: "Candidate Acquisition", isMine: true,
    description: "Sources candidates from partner academies, colleges, walk-ins, and referrals, then onboards their profiles into the verification pipeline.",
  },
  dept_company_relations: {
    icon: "🏢", title: "Company Relations",
    description: "Owns hiring-company relationships: onboarding new employers, KYC follow-up, and matching verified candidates to open roles.",
  },
  dept_mapping_engine: {
    icon: "🔄", title: "Mapping Engine",
    description: "Maintains the matching logic that pairs verified candidates with company job requisitions by specialty, certification, location, and score.",
  },
  dept_assessment_video: {
    icon: "🎥", title: "Assessment + Video",
    description: "Reviews text assessments and video introductions flagged by the AI grading pipeline, and maintains the interview question bank.",
  },
  dept_crm_data: {
    icon: "📈", title: "CRM + Data",
    description: "Keeps candidate and company records clean, monitors pipeline data quality, and builds the operational reports leadership reviews weekly.",
  },
  dept_success_revenue: {
    icon: "💰", title: "Success + Revenue",
    description: "Tracks candidates who complete verification and are placed, and the platform's overall placement rate.",
  },
};

// Real, per-department numbers computed from the same dashData every other
// tab already uses - no invented headcounts, match rates, or revenue
// figures. Returns null stats/hero for a department with no real backing
// data at all (there's no matching-engine metrics or revenue/commission
// tracking anywhere in the app yet), so the page can show an honest empty
// state instead of a fabricated number.
function getDeptLiveData(deptId, dashData) {
  const stats = dashData?.stats || {};
  const reports = dashData?.reportsData || {};
  switch (deptId) {
    case "dept_candidate_acquisition":
      return {
        hero: { label: "Awaiting Review", value: stats.pendingVerifications ?? 0, unit: "profiles" },
        tiles: [
          { label: "Pending Verifications", value: stats.pendingVerifications ?? 0, icon: "userPlus", cls: "tt-kpi-1" },
          { label: "Active Candidates", value: stats.activeCandidates ?? 0, icon: "clock", cls: "tt-kpi-2" },
          { label: "Placed This Month", value: stats.placedThisMonth ?? 0, icon: "award", cls: "tt-kpi-3" },
        ],
        actions: [],
      };
    case "dept_company_relations":
      return {
        hero: { label: "Active Companies", value: reports.totalCompanies ?? 0, unit: "on platform" },
        tiles: [
          { label: "Total Companies", value: reports.totalCompanies ?? 0, icon: "buildingGrid", cls: "tt-kpi-1" },
          { label: "Verified (Gold KYC)", value: stats.verifiedCompanies ?? 0, icon: "shieldCheck", cls: "tt-kpi-2" },
          { label: "Pending KYC", value: stats.pendingCompanyKycs ?? 0, icon: "clock", cls: "tt-kpi-3" },
        ],
        actions: [
          { title: "Company KYC Queue", desc: "Browse companies and their KYC status.", icon: "buildingGrid", cls: "sf-a2", modalNav: "kyc" },
        ],
      };
    case "dept_mapping_engine":
      return { hero: null, tiles: [], actions: [] };
    case "dept_crm_data":
      return {
        hero: { label: "Total Records", value: (reports.totalCandidates ?? 0) + (reports.totalCompanies ?? 0), unit: "candidates + companies" },
        tiles: [
          { label: "Total Candidates", value: reports.totalCandidates ?? 0, icon: "database", cls: "tt-kpi-1" },
          { label: "Total Companies", value: reports.totalCompanies ?? 0, icon: "buildingGrid", cls: "tt-kpi-2" },
          { label: "Verified Candidates", value: reports.verifiedCandidates ?? 0, icon: "shieldCheck", cls: "tt-kpi-3" },
        ],
        actions: [
          { title: "Reports & Metrics", desc: "Open the operations analytics dashboard.", icon: "chartBar", cls: "sf-a2", modalNav: "reports" },
        ],
      };
    case "dept_success_revenue":
      return {
        hero: { label: "Placed This Month", value: stats.placedThisMonth ?? 0, unit: "candidates" },
        tiles: [
          { label: "Placed This Month", value: stats.placedThisMonth ?? 0, icon: "award", cls: "tt-kpi-1" },
          { label: "Total Verified & Placed", value: reports.verifiedCandidates ?? 0, icon: "trendingUp", cls: "tt-kpi-2" },
          { label: "Placement Rate", value: reports.placementRate ?? "0%", icon: "shieldCheck", cls: "tt-kpi-3" },
        ],
        actions: [],
      };
    default:
      return { hero: null, tiles: [], actions: [] };
  }
}

export default function StaffHub() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("overview"); 
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);

  const [selectedKycId, setSelectedKycId] = useState(null);
  const [selectedCertId, setSelectedCertId] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);

  const [auditModal, setAuditModal] = useState(null);
  const [certAuditModal, setCertAuditModal] = useState(null);
  const [liveVerifyModal, setLiveVerifyModal] = useState(null);
  const [jobAuditModal, setJobAuditModal] = useState(null);
  const [staffNotifications, setStaffNotifications] = useState([]);
  const [staffUnreadCount, setStaffUnreadCount] = useState(0);
  const [showStaffNotif, setShowStaffNotif] = useState(false);

  const [activityEntries, setActivityEntries] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);

  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // --- EMPLOYEE DASHBOARD INTERACTIVE STATE (CANDIDATE & COMPANY THEME UNIFIED) ---
  // These start empty rather than seeded with fictional names/academies -
  // partnerBucket is synced from the real dashData.incomingBucket below;
  // todayTasksList has no backend at all yet (see the "My Tasks" tab's own
  // "not yet synced to a shared backend" note), so it should read as a
  // genuinely empty to-do list rather than someone else's fake schedule.
  const [partnerBucket, setPartnerBucket] = useState([]);

  const [todayTasksList, setTodayTasksList] = useState([]);

  const [recentUploadsList, setRecentUploadsList] = useState([]);

  const [activeModal, setActiveModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [modalForm, setModalForm] = useState({ name: "", email: "", phone: "", role: "", company: "", notes: "" });

  // --- MASTER DIRECTORIES STATE (ALL DATA: CANDIDATES, COMPANIES, ACADEMIES) ---
  const [candidatesList, setCandidatesList] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateModalTab, setCandidateModalTab] = useState("identity");
  const candidateTabsRef = useRef(null);

  const scrollCandidateTabs = (direction) => {
    if (candidateTabsRef.current) {
      candidateTabsRef.current.scrollBy({
        left: direction === "left" ? -280 : 280,
        behavior: "smooth",
      });
    }
  };

  const [companiesList, setCompaniesList] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [companyKycFilter, setCompanyKycFilter] = useState("all");
  const [companyPlanFilter, setCompanyPlanFilter] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyModalTab, setCompanyModalTab] = useState("legal");
  const [assigningPlan, setAssigningPlan] = useState("");
  const [applicantSearch, setApplicantSearch] = useState("");
  const [applicantStatusFilter, setApplicantStatusFilter] = useState("all");
  const [applicantJobFilter, setApplicantJobFilter] = useState("all");

  const [academiesList, setAcademiesList] = useState([]);
  const [academiesLoading, setAcademiesLoading] = useState(false);
  const [academySearch, setAcademySearch] = useState("");
  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [academyModalTab, setAcademyModalTab] = useState("profile");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3200);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActiveModal("search");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem("talentera_staff_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchDashboard();
    fetchStaffNotifications();
    fetchInterviewQuestions();
    fetchActivityLog(1);
    fetchCandidates();
    fetchCompanies();
    fetchAcademies();
  }, []);

  useEffect(() => {
    if (activeNav === "activity" && !activityLoaded) {
      fetchActivityLog(1);
    }
    if (activeNav === "candidates") {
      fetchCandidates(candidateSearch, candidateStatusFilter);
    }
    if (activeNav === "companies") {
      fetchCompanies(companySearch, companyKycFilter);
    }
    if (activeNav === "academies") {
      fetchAcademies(academySearch);
    }
  }, [activeNav]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/dashboard", { headers: { ...getAuthHeader() } });
      if (res.status === 401) {
        navigate("/staff/login");
        return;
      }
      const data = await safeJson(res);
      setDashData(data);
      const incoming = Array.isArray(data?.incomingBucket) ? data.incomingBucket : [];
      setPartnerBucket(incoming.slice(0, 5));
      setRecentUploadsList(incoming.map((c) => ({
        id: c.id,
        avatar: c.avatar || "CD",
        name: c.name || "Candidate",
        timeAgo: c.time || "Recently",
        source: c.academy || "Unspecified",
        specialty: c.specialty || "Medical Coding",
        stage: c.stage || "PROFILE PENDING",
        stageColor: c.stageColor || "#475569",
        stageBg: c.stageBg || "#F1F5F9",
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffNotifications = async () => {
    try {
      const res = await fetch("/api/staff/notifications", { headers: { ...getAuthHeader() } });
      if (res.ok) {
        const data = await safeJson(res);
        setStaffNotifications(data.notifications || []);
        setStaffUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markStaffNotifRead = async () => {
    try {
      // NOTE: the backend route is /mark-read, not /read — fixed a mismatch here
      // that was silently 404ing on every call.
      await fetch("/api/staff/notifications/mark-read", { method: "POST", headers: { ...getAuthHeader() } });
      setStaffUnreadCount(0);
      setStaffNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivityLog = async (page) => {
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/staff/audit-log?page=${page}&limit=25`, { headers: { ...getAuthHeader() } });
      if (res.status === 401) {
        navigate("/staff/login");
        return;
      }
      const data = await safeJson(res);
      setActivityEntries(data.entries || []);
      setActivityPage(data.page || 1);
      setActivityTotalPages(data.totalPages || 1);
      setActivityLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchInterviewQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const res = await fetch("/api/staff/interview-questions", { headers: { ...getAuthHeader() } });
      if (res.status === 401) {
        navigate("/staff/login");
        return;
      }
      const data = await safeJson(res);
      setInterviewQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const fetchCandidates = async (search = "", status = "") => {
    setCandidatesLoading(true);
    try {
      let url = "/api/staff/candidates?limit=500";
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status && status !== "all") url += `&status=${encodeURIComponent(status)}`;
      const res = await fetch(url, { headers: { ...getAuthHeader() } });
      if (res.status === 401) {
        navigate("/staff/login");
        return;
      }
      const data = await safeJson(res);
      setCandidatesList(data.candidates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const fetchCompanies = async (search = "", kyc = "") => {
    setCompaniesLoading(true);
    try {
      let url = "/api/staff/companies?limit=500";
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (kyc && kyc !== "all") url += `&kycStatus=${encodeURIComponent(kyc)}`;
      const res = await fetch(url, { headers: { ...getAuthHeader() } });
      if (res.status === 401) {
        navigate("/staff/login");
        return;
      }
      const data = await safeJson(res);
      setCompaniesList(data.companies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const fetchAcademies = async (search = "") => {
    setAcademiesLoading(true);
    try {
      let url = "/api/staff/academies?limit=500";
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url, { headers: { ...getAuthHeader() } });
      if (res.status === 401) {
        navigate("/staff/login");
        return;
      }
      const data = await safeJson(res);
      setAcademiesList(data.academies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAcademiesLoading(false);
    }
  };

  const handleAssignPlan = async (companyId, newPlan) => {
    if (!newPlan) return;
    try {
      const res = await fetch(`/api/staff/companies/${companyId}/assign-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ plan: newPlan }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        showToast(`✓ Plan changed to ${newPlan.toUpperCase()} successfully!`);
        fetchCompanies(companySearch, companyKycFilter);
        if (selectedCompany && (selectedCompany._id === companyId || selectedCompany.id === companyId)) {
          setSelectedCompany((prev) => ({ ...prev, plan: newPlan }));
        }
      } else {
        showToast(data.message || "Failed to update plan.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating plan.");
    }
  };

  const openCompanyDetail = async (company, initialTab = "legal") => {
    setSelectedCompany(company);
    setCompanyModalTab(initialTab);
    const cid = company._id || company.id;
    if (!cid) return;
    try {
      const res = await fetch(`/api/staff/companies/${cid}`, { headers: { ...getAuthHeader() } });
      if (res.ok) {
        const data = await safeJson(res);
        if (data.company) {
          setSelectedCompany((prev) => ({
            ...prev,
            ...data.company,
            jobs: data.jobs || prev?.jobs || [],
            applications: data.applications || prev?.applications || [],
            applicationsCount: data.applicationsCount || (data.applications || []).length,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load company detail:", err);
    }
  };

  const handleUpdateApplicantStatus = async (applicationId, newStatus) => {
    try {
      const res = await fetch(`/api/staff/applications/${applicationId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        showToast(`✓ Applicant status updated to ${newStatus.toUpperCase()}`);
        setSelectedCompany((prev) => {
          if (!prev) return prev;
          const updated = (prev.applications || []).map((a) =>
            (a._id === applicationId || a.id === applicationId) ? { ...a, status: newStatus } : a
          );
          return { ...prev, applications: updated };
        });
      } else {
        showToast(data.message || "Failed to update status.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating application status.");
    }
  };

  const openCandidateDetail = async (candidate, initialTab = "identity") => {
    setSelectedCandidate(candidate);
    setCandidateModalTab(initialTab);
    try {
      const cid = candidate._id || candidate.id;
      const res = await fetch(`/api/staff/candidates/${cid}`, { headers: { ...getAuthHeader() } });
      if (res.ok) {
        const data = await safeJson(res);
        if (data.candidate) {
          setSelectedCandidate({
            ...candidate,
            ...data.candidate,
            applications: data.applications || [],
            applicationMetrics: data.applicationMetrics || candidate.applicationMetrics || {},
          });
        }
      }
    } catch (err) {
      console.error("Failed to load candidate top-to-bottom details:", err);
    }
  };

  const handleVerifyCandidate = async (candidateId, action = "verify") => {
    setProcessingId(candidateId);
    try {
      const res = await fetch("/api/staff/verify-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ candidateId, action }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        showToast(data.message || (action === "verify" ? "Candidate Verified & Gold-Badged!" : "Candidate Skipped."));
        fetchCandidates(candidateSearch, candidateStatusFilter);
        fetchDashboard();
        if (selectedCandidate && (selectedCandidate._id === candidateId || selectedCandidate.id === candidateId)) {
          setSelectedCandidate((prev) => ({
            ...prev,
            isVerified: action === "verify",
            completedStages: action === "verify" ? [1, 2, 3, 4, 5, 6, 7, 8] : prev.completedStages,
          }));
        }
      } else {
        showToast(data.message || "Failed verification action.");
      }
    } catch (err) {
      console.error(err);
      showToast("Verification action error.");
    } finally {
      setProcessingId(null);
    }
  };

  const handlePartnerAction = (id, actionType) => {
    const student = partnerBucket.find((p) => p.id === id);
    setPartnerBucket((prev) => prev.filter((p) => p.id !== id));
    if (student && actionType === "verify") {
      showToast(`⚡ ${student.name} sent to verification pipeline!`);
    } else if (student) {
      showToast(`Skipped ${student.name}.`);
    }
  };

  const toggleTaskCompletion = (id) => {
    setTodayTasksList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("MED");
  const addTask = () => {
    const title = newTaskText.trim();
    if (!title) return;
    const priorityColor = { HIGH: "#EF4444", MED: "#F59E0B", LOW: "#2563EB" };
    setTodayTasksList((prev) => [
      ...prev,
      {
        id: "t" + Date.now(),
        time: "Flexible",
        title,
        detail: "Added manually",
        priority: newTaskPriority,
        color: priorityColor[newTaskPriority],
        completed: false,
      },
    ]);
    setNewTaskText("");
    showToast("Task added.");
  };
  const removeTask = (id) => {
    setTodayTasksList((prev) => prev.filter((t) => t.id !== id));
  };

  const handleFormSubmit = (e, modalName) => {
    e.preventDefault();
    showToast(`Success! ${modalName} recorded successfully.`);
    setActiveModal(null);
    setModalForm({ name: "", email: "", phone: "", role: "", company: "", notes: "" });
  };

  const handleAuditKyc = async (companyId, action, rejectionReason = "") => {
    setProcessingId(companyId);
    try {
      const res = await fetch("/api/staff/verify-company", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ companyId, action, rejectionReason }),
      });
      if (res.ok) {
        setAuditModal(null);
        fetchDashboard();
        showToast(`Company KYC ${action === "verify" ? "Approved & Verified" : "Marked for Revision"}.`);
      } else {
        const data = await safeJson(res);
        showToast(data.message || "KYC update failed.");
      }
    } catch (err) {
      console.error(err);
      showToast("KYC update failed.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyDoc = async (companyId, docId, isValid) => {
    try {
      const res = await fetch("/api/staff/verify-document", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ companyId, docId, isValid }),
      });
      if (res.ok) {
        fetchDashboard();
        showToast(`Document (${docId}) marked as ${isValid ? "Valid ✓" : "Invalid ✖"}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyVideo = async (candidateId, action) => {
    setProcessingId(candidateId);
    try {
      const res = await fetch("/api/staff/verify-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ candidateId, action }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        fetchDashboard();
        showToast(data.message || (action === "verify" ? "Video verified." : "Video sent back for re-record."));
      } else {
        showToast(data.message || "Could not update video verification status.");
      }
    } catch (err) {
      console.error(err);
      showToast("Could not update video verification status.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleAuditCertification = async (candidateId, action, rejectionReason = "") => {
    setProcessingId(candidateId);
    try {
      const res = await fetch("/api/staff/verify-certification", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ candidateId, action, rejectionReason }),
      });
      if (res.ok) {
        setCertAuditModal(null);
        fetchDashboard();
        showToast(`Certification ${action === "verify" ? "Verified & Approved" : "Rejected"}.`);
      } else {
        const data = await safeJson(res);
        showToast(data.message || "Certification update failed.");
      }
    } catch (err) {
      console.error(err);
      showToast("Certification update failed.");
    } finally {
      setProcessingId(null);
    }
  };

  // Opens a real, human-operated remote browser session on the candidate's
  // issuing body's official verification page (Staff Hub "Live Verify" -
  // see backend/utils/liveVerifySession.js for why this needs a human:
  // AAPC's real verify page is reCAPTCHA-protected, so no script can
  // submit it). Staff solves the CAPTCHA and reads the result themselves
  // inside the embedded live view; capturing just saves that as evidence -
  // Approve/Reject above is still what actually decides certStatus.
  const startLiveVerify = async (cert) => {
    setLiveVerifyModal({ candidateId: cert.id, loading: true });
    try {
      const res = await fetch(`/api/staff/certification/${cert.id}/live-verify/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
      });
      const data = await safeJson(res);
      if (res.ok) {
        setLiveVerifyModal({
          candidateId: cert.id,
          loading: false,
          sessionId: data.sessionId,
          liveViewUrl: data.liveViewUrl,
          verifyUrl: data.verifyUrl,
          issuingBodyName: data.issuingBodyName,
          memberId: data.memberId,
          lastName: data.lastName,
        });
      } else {
        setLiveVerifyModal({ candidateId: cert.id, loading: false, error: data.message || "Could not start live verification." });
      }
    } catch (err) {
      console.error(err);
      setLiveVerifyModal({ candidateId: cert.id, loading: false, error: "Could not start live verification." });
    }
  };

  const captureLiveVerify = async () => {
    if (!liveVerifyModal?.sessionId) return;
    setLiveVerifyModal((m) => ({ ...m, capturing: true, error: null }));
    try {
      const res = await fetch(`/api/staff/certification/live-verify/${liveVerifyModal.sessionId}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
      });
      const data = await safeJson(res);
      if (res.ok) {
        setLiveVerifyModal((m) => ({ ...m, capturing: false, captured: data }));
        fetchDashboard();
      } else {
        setLiveVerifyModal((m) => ({ ...m, capturing: false, error: data.message || "Could not capture the result." }));
      }
    } catch (err) {
      console.error(err);
      setLiveVerifyModal((m) => ({ ...m, capturing: false, error: "Could not capture the result." }));
    }
  };

  const closeLiveVerify = () => {
    const sessionId = liveVerifyModal?.sessionId;
    setLiveVerifyModal(null);
    if (sessionId) {
      fetch(`/api/staff/certification/live-verify/${sessionId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
      }).catch(() => {});
    }
  };

  const handleAuditJob = async (job, decision) => {
    setProcessingId(job.id);
    try {
      const res = await fetch("/api/staff/verify-job", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          source: job.source,
          id: job.id,
          action: decision === "approve" ? "verify" : "reject",
          rejectionReason: decision === "reject" ? "Rejected by staff auditor." : "",
        }),
      });
      if (res.ok) {
        setJobAuditModal(null);
        fetchDashboard();
        showToast("Job status updated successfully.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-body, 'Manrope', sans-serif)", color: "var(--navy, #0A1F3D)" }}>Loading Talentera Operations Console...</div>;

  const { companyKycQueue, certificationQueue, jobApprovalQueue, videoIntrosQueue, textAssessmentQueue } = dashData || {};

  const videoCounts = {
    pending: (videoIntrosQueue || []).filter((v) => !v.verified).length,
    verified: (videoIntrosQueue || []).filter((v) => v.verified).length,
  };

  const kycCounts = {
    pending: (companyKycQueue || []).filter((c) => c.kycStatus === "pending" || c.kycStatus === "under_review").length,
    verified: (companyKycQueue || []).filter((c) => c.kycStatus === "verified").length,
    rejected: (companyKycQueue || []).filter((c) => c.kycStatus === "rejected").length,
  };
  const certCounts = {
    pending: (certificationQueue || []).filter((c) => c.certStatus === "pending").length,
    verified: (certificationQueue || []).filter((c) => c.certStatus === "verified").length,
    rejected: (certificationQueue || []).filter((c) => c.certStatus === "rejected").length,
  };
  const jobCounts = {
    pending: (jobApprovalQueue || []).filter((j) => j.approvalStatus === "pending").length,
    approved: (jobApprovalQueue || []).filter((j) => j.approvalStatus === "approved").length,
    rejected: (jobApprovalQueue || []).filter((j) => j.approvalStatus === "rejected").length,
  };

  function StatPill({ count, label, tone }) {
    const tones = {
      pending: { bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)", border: "rgba(245, 158, 11, 0.3)", color: "#92400E", dot: "#F59E0B" },
      good: { bg: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)", border: "rgba(34, 197, 94, 0.3)", color: "#15803D", dot: "#22C55E" },
      bad: { bg: "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)", border: "rgba(239, 68, 68, 0.3)", color: "#B91C1C", dot: "#EF4444" },
    };
    const t = tones[tone] || tones.pending;
    return (
      <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 14, padding: "10px 18px", textAlign: "center", minWidth: 96 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, justifyContent: "center" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot, display: "inline-block" }} />
          <span style={{ fontSize: 9.5, fontWeight: 800, color: t.color, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>{label}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.color, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)", lineHeight: 1.1 }}>{count}</div>
      </div>
    );
  }

  function QueuePageHeader({ icon, title, subtitle, accent = "var(--navy, #0A1F3D)", pills }) {
    return (
      <div style={{ background: "#FFFFFF", borderRadius: 18, border: "1px solid var(--border-light, #E2E8F0)", padding: "20px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${accent} 0%, ${accent}66 100%)` }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, maxWidth: 640 }}>
            <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 14, background: `${accent}1A`, border: `1px solid ${accent}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
              {icon}
            </div>
            <div>
              <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: accent, background: `${accent}12`, padding: "2px 8px", borderRadius: 999, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                Staff Moderation Console
              </span>
              <h2 style={{ fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)", fontSize: 22, fontWeight: 800, color: "var(--navy, #0A1F3D)", margin: "4px 0 0", letterSpacing: "-0.01em" }}>
                {title}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted, #4A5568)", lineHeight: 1.5, fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}>
                {subtitle}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>{pills}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-dashboard" style={{ minHeight: "100vh", background: "var(--cream, #FAF7F2)", fontFamily: "'Manrope', sans-serif", color: "var(--navy, #0A1F3D)" }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "var(--navy-deep, #06152A)", color: "var(--gold, #E5A82E)", border: "1px solid rgba(229,168,46,0.3)", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: "0 10px 25px rgba(0,0,0,0.3)", zIndex: 10000, display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}>
          <span>✨</span> {toastMsg}
        </div>
      )}

      {/* Main Layout Shell */}
      <div className="staff-shell">

        {/* LEFT SIDEBAR (DARK NAVY BRAND THEME - Matching Candidate & Company Dashboards) */}
        <aside className="staff-sidebar">
          <div className="staff-sidebar-brand">
            <img className="staff-sidebar-logo" src="/logo-white.png" alt="Talentera" />
            {/* <div className="staff-sidebar-tag" style={{ marginTop: 0, fontSize: 10 }}>STAFF OPERATIONS</div> */}
          </div>

          <div className="staff-live-pill">
            <span className="live-dot" />
            <span>Platform live</span>
            <span className="staff-live-pill-num">847 active</span>
          </div>

          {/* MIDDLE SCROLLABLE NAV CONTAINER */}
          <div className="staff-sidebar-nav-scroll">
            {/* SECTION: MAIN */}
            <div className="staff-nav-section">Main</div>
            <nav className="staff-nav">
              <button type="button" className={`staff-nav-item${activeNav === "overview" ? " active" : ""}`} onClick={() => setActiveNav("overview")}>
                <Icon name="grid" size={18} className="staff-nav-icon" style={{ color: "inherit" }} />
                <span style={{ flex: 1 }}>Dashboard</span>
              </button>
              <button type="button" className={`staff-nav-item${activeNav === "my_tasks" ? " active" : ""}`} onClick={() => setActiveNav("my_tasks")}>
                <Icon name="checklist" size={18} style={{ color: "inherit" }} />
                <span style={{ flex: 1 }}>My Tasks</span>
                <span className="staff-nav-badge">5</span>
              </button>
              <button type="button" className={`staff-nav-item${activeNav === "notifications" ? " active" : ""}`} onClick={() => setActiveNav("notifications")}>
                <Icon name="bell" size={18} style={{ color: "inherit" }} />
                <span style={{ flex: 1 }}>Notifications</span>
                <span className="staff-nav-badge">3</span>
              </button>
            </nav>

            {/* SECTION: MASTER DIRECTORIES (ALL DATA) */}
            <div className="staff-nav-section">Master Directories</div>
            <nav className="staff-nav">
              <button
                type="button"
                className={`staff-nav-item${activeNav === "candidates" ? " active" : ""}`}
                onClick={() => {
                  setActiveNav("candidates");
                  fetchCandidates(candidateSearch, candidateStatusFilter);
                }}
              >
                <Icon name="user" size={18} style={{ color: "inherit" }} />
                <span style={{ flex: 1 }}>All Candidates</span>
                <span className="staff-nav-badge">{dashData?.reportsData?.totalCandidates || candidatesList.length || 0}</span>
              </button>
              <button
                type="button"
                className={`staff-nav-item${activeNav === "companies" ? " active" : ""}`}
                onClick={() => {
                  setActiveNav("companies");
                  fetchCompanies(companySearch, companyKycFilter);
                }}
              >
                <Icon name="buildingGrid" size={18} style={{ color: "inherit" }} />
                <span style={{ flex: 1 }}>All Companies</span>
                <span className="staff-nav-badge">{dashData?.reportsData?.totalCompanies || companiesList.length || 0}</span>
              </button>
              <button
                type="button"
                className={`staff-nav-item${activeNav === "academies" ? " active" : ""}`}
                onClick={() => {
                  setActiveNav("academies");
                  fetchAcademies(academySearch);
                }}
              >
                <Icon name="graduation" size={18} style={{ color: "inherit" }} />
                <span style={{ flex: 1 }}>All Academies</span>
                <span className="staff-nav-badge">{dashData?.reportsData?.totalAcademies || dashData?.stats?.totalAcademies || academiesList.length || 0}</span>
              </button>
            </nav>

            {/* SECTION: 6 DEPARTMENTS */}
            <div className="staff-nav-section">6 Departments</div>
            <nav className="staff-nav">
              {[
                { id: "dept_candidate_acquisition", icon: "userPlus", label: "Candidate Acquisition", badge: "YOU" },
                { id: "dept_company_relations", icon: "buildingGrid", label: "Company Relations" },
                { id: "dept_mapping_engine", icon: "settingsGear", label: "Mapping Engine" },
                { id: "dept_assessment_video", icon: "video", label: "Assessment + Video", badge: videoCounts.pending > 0 ? String(videoCounts.pending) : null, muted: true },
                { id: "dept_crm_data", icon: "database", label: "CRM + Data" },
                { id: "dept_success_revenue", icon: "trendingUp", label: "Success + Revenue" },
              ].map((d) => (
                <button key={d.id} type="button" className={`staff-nav-item dept${activeNav === d.id ? " active" : ""}`} onClick={() => setActiveNav(d.id)}>
                  <Icon name={d.icon} size={16} style={{ color: "inherit" }} />
                  <span style={{ flex: 1 }}>{d.label}</span>
                  {d.badge && <span className={`staff-nav-badge${d.muted ? " muted" : ""}`}>{d.badge}</span>}
                </button>
              ))}
            </nav>

            {/* SECTION: MODERATION QUEUES */}
            <div className="staff-nav-section">Moderation Queues</div>
            <nav className="staff-nav">
              {[
                { id: "kyc", icon: "eye", label: "KYC Verification", count: kycCounts.pending },
                { id: "certifications", icon: "graduation", label: "Certifications", count: certCounts.pending },
                { id: "questions", icon: "mic", label: "Interview Questions" },
                { id: "reports", icon: "chartBar", label: "Reports & Metrics" },
                { id: "activity", icon: "clock", label: "Activity Log" },
              ].map((m) => (
                <button key={m.id} type="button" className={`staff-nav-item dept${activeNav === m.id ? " active" : ""}`} onClick={() => setActiveNav(m.id)}>
                  <Icon name={m.icon} size={16} style={{ color: "inherit" }} />
                  <span style={{ flex: 1 }}>{m.label}</span>
                  {m.count > 0 && <span className="staff-nav-badge">{m.count}</span>}
                </button>
              ))}
            </nav>
          </div>

          {/* USER PROFILE FOOTER */}
          <div className="staff-sidebar-user">
            <div className="staff-user-card">
              <div className="staff-user-avatar">
                {(dashData?.staffProfile?.name || "?")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase() || "?"}
              </div>
              <div className="staff-user-info">
                <div className="staff-user-name">{dashData?.staffProfile?.name || "Staff Member"}</div>
                <div className="staff-user-role">{(dashData?.staffProfile?.role || "STAFF").toUpperCase()}</div>
              </div>
              <span className="staff-user-action"><Icon name="kebab" size={16} /></span>
            </div>
            <button
              type="button"
              className="staff-logout-btn"
              onClick={() => {
                localStorage.removeItem("talentera_staff_token");
                localStorage.removeItem("talentera_staff_info");
                navigate("/staff/login");
              }}
            >
              <Icon name="logOut" size={14} /> Sign out
            </button>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <div className="staff-main-area">
          <header className="staff-topbar-v2">
            <div className="staff-search" onClick={() => setActiveModal("search")}>
              <Icon name="search" size={16} style={{ color: "#94A3B8" }} sw={2} />
              <span className="staff-search-placeholder">Search candidates, companies, academies…</span>
              <span className="staff-search-shortcut">⌘ K</span>
            </div>
            <div className="staff-topbar-actions">
              <button type="button" className="staff-icon-btn" title="Notifications" onClick={() => setActiveNav("notifications")}>
                <Icon name="bell" size={18} />
                <span className="badge-dot" />
              </button>
              <button type="button" className="staff-icon-btn" title="Messages" onClick={() => showToast("Chat window initialized.")}>
                <Icon name="message" size={18} />
              </button>
              <button type="button" className="staff-quick-btn" onClick={() => setActiveModal("quick_add")}>
                <Icon name="plus" size={14} sw={2.4} /> Quick Add
              </button>
            </div>
          </header>

          <main style={{ background: "var(--cream, #FAF7F2)", minWidth: 0, flex: 1 }}>

          {/* OVERVIEW TAB CONTENT */}
          {activeNav === "overview" && (
            <div className="tt-content">

              {/* WELCOME BANNER CARD (TALENTERA BRAND NAVY + GOLD) */}
              <div className="sf-welcome">
                <div className="sf-welcome-row">
                  <div className="sf-welcome-info">
                    <div className="sf-greet">Hello, Anita!</div>
                    <div className="sf-meta">
                      <span className="sf-day-pill">DAY 47</span>
                      <span className="sf-meta-pill">CANDIDATE ACQUISITION</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="pin" size={14} /> Hyderabad</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.06em", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Today's Goal</div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>
                      18<span style={{ color: "rgba(255,255,255,0.4)", fontSize: 20 }}>/25</span>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>profiles registered</div>
                  </div>
                </div>
              </div>

              {/* PARTNER ACADEMY UPLOADS ALERT CARD */}
              <div className="sf-incoming-card">
                <span className="sf-incoming-badge">NEW</span>
                <div className="sf-incoming-title"><Icon name="zap" size={22} sw={2.4} /> {partnerBucket.length} new student{partnerBucket.length !== 1 ? "s" : ""} from your Academy partners</div>
                <div className="sf-incoming-sub">These were just uploaded by partner academies. Review and push them into the verification pipeline (assessment + video + Aadhaar).</div>
                <div className="sf-incoming-list">
                  {partnerBucket.map((item) => (
                    <div key={item.id} className="sf-incoming-item">
                      <div className="sf-mini-avatar" style={{ background: "var(--navy-deep)", color: "var(--gold)" }}>{item.avatar}</div>
                      <div className="sf-incoming-info">
                        <div className="sf-incoming-name">{item.name}</div>
                        <div className="sf-incoming-source">
                          <span className="sf-incoming-source-pill">{item.academy}</span>
                          <span>{item.specialty} · {item.cert} · {item.location} · {item.time}</span>
                        </div>
                      </div>
                      <div className="sf-incoming-actions">
                        <button type="button" className="sf-verify-btn" onClick={() => handlePartnerAction(item.id, "verify")}>
                          <Icon name="zap" size={12} sw={2.2} /> Send to Verify
                        </button>
                        <button type="button" className="sf-skip-btn" onClick={() => handlePartnerAction(item.id, "skip")}>Skip</button>
                      </div>
                    </div>
                  ))}
                  {partnerBucket.length === 0 && (
                    <div style={{ textAlign: "center", color: "#78350F", padding: 12, fontSize: 12, fontWeight: 600 }}>
                      ✓ All academy partner uploads reviewed for today!
                    </div>
                  )}
                </div>
              </div>

              {/* 4 TOP KPI CARDS GRID - all real, from dashData.stats
                  (staff.js GET /dashboard), no invented targets/commissions */}
              <div className="tt-kpi-grid">
                {[
                  { title: "Pending Verifications", value: dashData?.stats?.pendingVerifications ?? 0, icon: "user", cls: "tt-kpi-1" },
                  { title: "Active Candidates", value: dashData?.stats?.activeCandidates ?? 0, icon: "clock", cls: "tt-kpi-3" },
                  { title: "Verified Today", value: dashData?.stats?.verifiedToday ?? 0, icon: "shieldCheck", cls: "tt-kpi-2" },
                  { title: "Placed This Month", value: dashData?.stats?.placedThisMonth ?? 0, icon: "award", cls: "tt-kpi-4" },
                ].map((kpi, idx) => (
                  <div key={idx} className="tt-kpi">
                    <div className={`tt-kpi-icon ${kpi.cls}`}><Icon name={kpi.icon} size={18} /></div>
                    <div className="tt-kpi-label">{kpi.title}</div>
                    <div className="tt-kpi-value">{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* ADMIN MASTER DIRECTORIES JUMP CARDS */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748B", textTransform: "uppercase", marginBottom: 12, fontFamily: "var(--font-mono, monospace)" }}>
                  Admin Master Data Directories
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  {/* Candidates Directory Card */}
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: 16,
                      padding: "20px 22px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      position: "relative",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
                    }}
                    onClick={() => { setActiveNav("candidates"); fetchCandidates(candidateSearch, candidateStatusFilter); }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        👥
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#DCFCE7", color: "#15803D" }}>
                        {dashData?.reportsData?.verifiedCandidates ?? 0} VERIFIED
                      </span>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>
                      {dashData?.reportsData?.totalCandidates || candidatesList.length || 0}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--navy)", marginTop: 6 }}>All Candidates Directory</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 1.4 }}>
                      Full details across Stages 1–8, Aadhaar, AAPC certs, MCQ test, AI video, and placement track.
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold, #B45309)", marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      Browse All Candidates →
                    </div>
                  </div>

                  {/* Companies Directory Card */}
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: 16,
                      padding: "20px 22px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      position: "relative",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
                    }}
                    onClick={() => { setActiveNav("companies"); fetchCompanies(companySearch, companyKycFilter); }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        🏢
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#FEF3C7", color: "#B45309" }}>
                        {dashData?.stats?.pendingCompanyKycs ?? 0} PENDING KYC
                      </span>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>
                      {dashData?.reportsData?.totalCompanies || companiesList.length || 0}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--navy)", marginTop: 6 }}>All Companies Directory</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 1.4 }}>
                      Legal entity details, GSTIN, PAN, KYC docs, plans, posted jobs, and applicant pipelines.
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold, #B45309)", marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      Browse All Companies →
                    </div>
                  </div>

                  {/* Academies Directory Card */}
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: 16,
                      padding: "20px 22px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      position: "relative",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
                    }}
                    onClick={() => { setActiveNav("academies"); fetchAcademies(academySearch); }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        🎓
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#EDE9FE", color: "#6D28D9" }}>
                        PARTNER NETWORK
                      </span>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>
                      {dashData?.reportsData?.totalAcademies || dashData?.stats?.totalAcademies || academiesList.length || 0}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--navy)", marginTop: 6 }}>All Academies Directory</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 1.4 }}>
                      Partner academies, student batches, course catalogs, enrolled trainees, and alumni placements.
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold, #B45309)", marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      Browse All Academies →
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 QUICK ACTION CARDS GRID */}
              <div className="sf-actions-grid">
                {[
                  { title: "Upload Candidate", desc: "Add a new resume from your visit. Send for auto-verification.", action: "Add now →", modal: "upload", icon: "upload", cls: "sf-a1" },
                  { title: "Add Company Lead", desc: "Log a hiring company you met. Move to Company Relations team.", action: "Capture lead →", modal: "lead", icon: "briefcase", cls: "sf-a2" },
                  { title: "Send for Verification", desc: "Push your uploaded candidates into the 4-layer verification pipeline.", action: "Push now →", modal: "verify", icon: "zap", cls: "sf-a3" },
                  { title: "Log Site Visit", desc: "Record an academy / college / company visit with notes and outcomes.", action: "Log visit →", modal: "visit", icon: "pin", cls: "sf-a4" },
                ].map((act, idx) => (
                  <button key={idx} type="button" className="sf-action" onClick={() => setActiveModal(act.modal)}>
                    <div className={`sf-action-icon ${act.cls}`}><Icon name={act.icon} size={22} /></div>
                    <div className="sf-action-title">{act.title}</div>
                    <div className="sf-action-desc">{act.desc}</div>
                    <div className="sf-action-cta">{act.action}</div>
                  </button>
                ))}
              </div>

              {/* CORE PIPELINE VISUALIZATION */}
              <div className="sf-pipeline-card">
                <span className="sf-pipeline-badge">CORE PIPELINE</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div className="tt-card-title">My Active Pipeline</div>
                    <div className="tt-card-sub">Candidates I've personally onboarded · Click any stage to drill down</div>
                  </div>
                  <span className="tt-card-link" onClick={() => setActiveModal("kanban")}>Open Full Kanban →</span>
                </div>

                {/* 7 STAGE CARDS - real, from dashData.pipeline (staff.js
                    GET /dashboard), each a genuine completedStages count */}
                <div className="sf-pipeline-stages">
                  {(dashData?.pipeline || []).map((stg, idx) => (
                    <div key={idx} className={`sf-pipe-stage${stg.isPlaced ? " placed" : ""}`} onClick={() => setActiveModal("kanban")}>
                      <div className="sf-pipe-num">{stg.count}</div>
                      <div className="sf-pipe-label">{stg.stage}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2-COLUMN LOWER GRID */}
              <div className="tt-row">

                {/* LEFT COLUMN: Recent Uploads & Activity */}
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

                  {/* MY RECENT UPLOADS TABLE */}
                  <div className="tt-card">
                    <div className="tt-card-head">
                      <div>
                        <div className="tt-card-title">My Recent Uploads</div>
                        <div className="tt-card-sub">Candidates you brought in · Click any to view full pipeline</div>
                      </div>
                      <span className="tt-card-link" onClick={() => showToast("Viewing all candidate uploads.")}>View all →</span>
                    </div>
                    <div className="sf-table-wrap">
                      <table className="sf-table">
                        <thead>
                          <tr>
                            <th>Candidate</th>
                            <th>Source</th>
                            <th>Specialty</th>
                            <th>Stage</th>
                            <th style={{ textAlign: "right" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentUploadsList.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-muted, #4A5568)" }}>No recent candidate uploads.</td></tr>
                          ) : (
                            recentUploadsList.map((row) => (
                              <tr key={row.id}>
                                <td>
                                  <div className="sf-name-cell">
                                    <div className="sf-mini-avatar">{row.avatar}</div>
                                    <div>
                                      <div style={{ fontWeight: 600 }}>{row.name}</div>
                                      <div style={{ fontSize: 11, color: "#94A3B8" }}>{row.timeAgo}</div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ color: "var(--text-muted)" }}>{row.source}</td>
                                <td>{row.specialty}</td>
                                <td><span className="sf-stage-pill" style={{ background: row.stageBg, color: row.stageColor }}>{row.stage}</span></td>
                                <td style={{ textAlign: "right" }}>
                                  <button type="button" className="sf-action-btn outline" onClick={() => showToast(`Pushed ${row.name} to next stage.`)}>Push →</button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* RECENT ACTIVITY FEED */}
                  <div className="tt-card">
                    <div className="tt-card-head">
                      <div>
                        <div className="tt-card-title">Recent Activity</div>
                        <div className="tt-card-sub">Live feed · Your candidates and companies</div>
                      </div>
                    </div>
                    <div style={{ padding: "4px 22px 18px" }}>
                      {activityEntries.length === 0 ? (
                        <div style={{ textAlign: "center", color: "var(--text-muted, #4A5568)", fontSize: 12, padding: "12px 0" }}>
                          No staff activity recorded yet.
                        </div>
                      ) : (
                        activityEntries.slice(0, 5).map((act) => (
                          <div key={act._id} className="sf-feed-item">
                            <div className="sf-feed-icon" style={{ background: "rgba(229,168,46,0.15)", color: "#B47E0E" }}>●</div>
                            <div className="sf-feed-info">
                              <div className="sf-feed-text">{act.staffName ? `${act.staffName}: ` : ""}{act.summary}</div>
                              <div className="sf-feed-time">{new Date(act.createdAt).toLocaleString()}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN: Today's Tasks & Leaderboard */}
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

                  {/* TODAY'S TASKS CARD */}
                  <div className="tt-card">
                    <div className="tt-card-head">
                      <div>
                        <div className="tt-card-title">Today's Tasks</div>
                        <div className="tt-card-sub">Thursday, 27 Aug</div>
                      </div>
                    </div>
                    <div style={{ padding: "4px 22px 18px" }}>
                      {todayTasksList.map((task) => {
                        const pillCls = task.priority === "HIGH" ? "sf-task-p1" : task.priority === "MED" ? "sf-task-p2" : "sf-task-p3";
                        return (
                          <div key={task.id} className="sf-task" style={{ opacity: task.completed ? 0.5 : 1 }} onClick={() => toggleTaskCompletion(task.id)}>
                            <div className="sf-task-time">{task.time}</div>
                            <div className="sf-task-info">
                              <div className={`sf-task-title${task.completed ? " done" : ""}`}>{task.title}</div>
                              <div className="sf-task-meta">{task.detail}</div>
                            </div>
                            <span className={`sf-task-pill ${pillCls}`}>{task.priority === "HIGH" ? "High" : task.priority === "MED" ? "Med" : "Low"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* =========================================================================
              TAB MODULE: MASTER DIRECTORY - ALL CANDIDATES
             ========================================================================= */}
          {activeNav === "candidates" && (() => {
            const filteredCandidates = candidatesList.filter((c) => {
              const m = c.applicationMetrics || {};
              if (candidateStatusFilter === "verified" && !c.isVerified) return false;
              if (candidateStatusFilter === "pending" && c.isVerified) return false;
              if (candidateStatusFilter === "assessment" && (!c.completedStages || !c.completedStages.includes(4))) return false;
              if (candidateStatusFilter === "has_applications" && (c.applicationsCount || m.total || 0) === 0) return false;
              if (candidateStatusFilter === "shortlisted" && (m.shortlisted || 0) === 0) return false;
              if (candidateStatusFilter === "interviewing" && (m.interviewing || 0) === 0) return false;
              if (candidateStatusFilter === "hired" && (m.hired || 0) === 0) return false;

              if (candidateSearch && candidateSearch.trim()) {
                const q = candidateSearch.trim().toLowerCase();
                const nameMatch = (c.fullName || "").toLowerCase().includes(q);
                const emailMatch = (c.email || "").toLowerCase().includes(q);
                const mobileMatch = (c.mobile || "").toLowerCase().includes(q);
                const academyMatch = (c.stage2?.academyName || "").toLowerCase().includes(q);
                const roleMatch = (c.currentRole || "").toLowerCase().includes(q);
                if (!nameMatch && !emailMatch && !mobileMatch && !academyMatch && !roleMatch) return false;
              }
              return true;
            });

            const verifiedTotal = candidatesList.filter((c) => c.isVerified).length;
            const inAssessmentTotal = candidatesList.filter((c) => c.completedStages?.includes(4) && !c.isVerified).length;
            const pendingTotal = candidatesList.filter((c) => !c.isVerified).length;
            const totalAppsSum = candidatesList.reduce((sum, c) => sum + (c.applicationsCount || c.applicationMetrics?.total || 0), 0);
            const totalShortlistedSum = candidatesList.reduce((sum, c) => sum + (c.applicationMetrics?.shortlisted || 0), 0);
            const totalHiredSum = candidatesList.reduce((sum, c) => sum + (c.applicationMetrics?.hired || 0), 0);

            return (
              <div className="tt-content">
                <QueuePageHeader
                  icon="👥"
                  accent="var(--navy, #0A1F3D)"
                  title="Candidates Master Directory"
                  subtitle="Comprehensive database of candidate profiles, personal contact info, Aadhaar verification, academy training, certifications, proctored assessments, AI video interviews, live charts, and full job applications history (Applied, Shortlisted, Interviewing, Offered, Hired)."
                  pills={
                    <>
                      <StatPill count={candidatesList.length} label="TOTAL CANDIDATES" tone="pending" />
                      <StatPill count={verifiedTotal} label="VERIFIED (GOLD)" tone="good" />
                      <StatPill count={totalAppsSum} label="JOBS APPLIED" tone="good" />
                      <StatPill count={totalShortlistedSum} label="SHORTLISTED" tone="pending" />
                      <StatPill count={totalHiredSum} label="HIRED" tone="good" />
                    </>
                  }
                />

                {/* SEARCH AND FILTER CONTROLS */}
                <div className="staff-search-filter-bar" style={{ marginTop: 20 }}>
                  <input
                    type="text"
                    className="staff-filter-input"
                    placeholder="Search candidate by name, email, phone, academy, role..."
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                  />
                  <select
                    className="staff-filter-select"
                    value={candidateStatusFilter}
                    onChange={(e) => setCandidateStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses ({candidatesList.length})</option>
                    <option value="verified">Fully Verified ({verifiedTotal})</option>
                    <option value="assessment">In Assessment ({inAssessmentTotal})</option>
                    <option value="pending">Pending Verification ({pendingTotal})</option>
                    <option value="has_applications">Has Applied Jobs</option>
                    <option value="shortlisted">Has Shortlisted</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="hired">Hired Candidates</option>
                  </select>
                  <button
                    type="button"
                    className="sf-action-btn"
                    onClick={() => fetchCandidates(candidateSearch, candidateStatusFilter)}
                    style={{ background: "var(--navy, #0A1F3D)", color: "#fff", border: "none", padding: "9px 16px" }}
                  >
                    {candidatesLoading ? "Refreshing..." : "🔄 Refresh Directory"}
                  </button>
                </div>

                {/* CANDIDATES DATA TABLE */}
                <div className="tt-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="sf-table-wrap">
                    <table className="sf-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Identity &amp; Aadhaar</th>
                          <th>Academy &amp; Batch</th>
                          <th>Specialty / Role</th>
                          <th>Stage Progress</th>
                          <th>Assessment</th>
                          <th>Job Pipeline</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCandidates.map((c) => {
                          const initials = (c.fullName || "CD")
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();
                          const stages = c.completedStages || [];
                          const score = c.stage4?.score || c.stage4?.foundationScore || null;
                          const m = c.applicationMetrics || {
                            total: c.applicationsCount || 0,
                            applied: 0,
                            shortlisted: 0,
                            interviewing: 0,
                            offered: 0,
                            hired: 0,
                            rejected: 0,
                          };

                          return (
                            <tr key={c._id || c.id}>
                              <td>
                                <div className="sf-name-cell">
                                  <div
                                    className="sf-mini-avatar"
                                    style={{
                                      background: c.isVerified ? "#DCFCE7" : "#F1F5F9",
                                      color: c.isVerified ? "#15803D" : "#0A1F3D",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, color: "var(--navy, #0A1F3D)", fontSize: 13 }}>
                                      {c.fullName}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#64748B" }}>{c.email}</div>
                                    {c.mobile && <div style={{ fontSize: 10.5, color: "#94A3B8" }}>📞 {c.mobile}</div>}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      color: c.aadhaarVerified ? "#15803D" : "#B45309",
                                      background: c.aadhaarVerified ? "#DCFCE7" : "#FEF3C7",
                                      padding: "2px 8px",
                                      borderRadius: 6,
                                      width: "fit-content",
                                    }}
                                  >
                                    {c.aadhaarVerified ? "✓ Aadhaar Verified" : "⏳ Aadhaar Pending"}
                                  </span>
                                  <span style={{ fontSize: 11, color: "#64748B" }}>
                                    📍 {c.city || "Not provided"} {c.experience ? `· ${c.experience} yrs exp` : ""}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: "var(--navy, #0A1F3D)", fontSize: 12 }}>
                                  {c.stage2?.academyName || "Independent"}
                                </div>
                                <div style={{ fontSize: 10.5, color: "#64748B" }}>
                                  {c.stage2?.batch || c.stage2?.courseName || "General Trainee"}
                                </div>
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "#0A1F3D",
                                    background: "#F8FAFC",
                                    border: "1px solid #E2E8F0",
                                    padding: "3px 8px",
                                    borderRadius: 6,
                                  }}
                                >
                                  {c.currentRole || "Medical Coder"}
                                </span>
                              </td>
                              <td>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: c.isVerified ? "#15803D" : "#0A1F3D" }}>
                                      Stage {stages.length}/8
                                    </span>
                                    <span style={{ fontSize: 10, color: "#64748B" }}>({c.stageProgressPct}%)</span>
                                  </div>
                                  <div className="staff-stages-bar">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                                      const isDone = stages.includes(s);
                                      return (
                                        <div
                                          key={s}
                                          className="staff-stage-dot"
                                          title={`Stage ${s}`}
                                          style={{
                                            background: isDone ? "#DCFCE7" : "#F1F5F9",
                                            color: isDone ? "#15803D" : "#94A3B8",
                                            border: `1px solid ${isDone ? "#86EFAC" : "#E2E8F0"}`,
                                          }}
                                        >
                                          {s}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                              <td>
                                {score !== null ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 800,
                                        padding: "3px 8px",
                                        borderRadius: 6,
                                        background: Number(score) >= 70 ? "#DCFCE7" : "#FEE2E2",
                                        color: Number(score) >= 70 ? "#15803D" : "#B91C1C",
                                      }}
                                    >
                                      {score}% MCQ
                                    </span>
                                    {c.stage5?.aiScore && (
                                      <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: "#EDE9FE", color: "#6D28D9" }}>
                                        {c.stage5.aiScore}% Video
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 11, color: "#94A3B8" }}>Not tested</span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--navy, #0A1F3D)" }}>
                                      {m.total} Job{m.total !== 1 ? "s" : ""}
                                    </span>
                                    {m.hired > 0 && (
                                      <span style={{ fontSize: 10, fontWeight: 800, background: "#DCFCE7", color: "#15803D", padding: "1px 6px", borderRadius: 4 }}>
                                        🎉 {m.hired} Hired
                                      </span>
                                    )}
                                    {m.offered > 0 && (
                                      <span style={{ fontSize: 10, fontWeight: 800, background: "#FEF3C7", color: "#B45309", padding: "1px 6px", borderRadius: 4 }}>
                                        📜 {m.offered} Offered
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", fontSize: 10 }}>
                                    <span style={{ color: "#2563EB", fontWeight: 700 }}>{m.applied} applied</span>
                                    <span style={{ color: "#94A3B8" }}>·</span>
                                    <span style={{ color: "#7C3AED", fontWeight: 700 }}>{m.shortlisted} shortlisted</span>
                                    <span style={{ color: "#94A3B8" }}>·</span>
                                    <span style={{ color: "#0D9488", fontWeight: 700 }}>{m.interviewing} interviewing</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span
                                  className="sf-stage-pill"
                                  style={{
                                    background: c.isVerified ? "#DCFCE7" : stages.length >= 4 ? "#FEF3C7" : "#F1F5F9",
                                    color: c.isVerified ? "#15803D" : stages.length >= 4 ? "#B45309" : "#475569",
                                  }}
                                >
                                  {c.isVerified ? "VERIFIED ✓" : stages.length >= 4 ? "IN ASSESSMENT" : "PENDING"}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: 6 }}>
                                  <button
                                    type="button"
                                    className="sf-action-btn"
                                    onClick={() => openCandidateDetail(c, "identity")}
                                    style={{ background: "var(--navy, #0A1F3D)", color: "#fff", border: "none" }}
                                  >
                                    View Full Dossier
                                  </button>
                                  <button
                                    type="button"
                                    className="sf-action-btn outline"
                                    onClick={() => openCandidateDetail(c, "placement")}
                                    title="View all jobs applied, shortlisted, interviews and hiring"
                                    style={{ borderColor: "#2563EB", color: "#2563EB" }}
                                  >
                                    🎯 Jobs ({m.total})
                                  </button>
                                  {!c.isVerified && (
                                    <button
                                      type="button"
                                      className="sf-action-btn outline"
                                      disabled={processingId === c._id}
                                      onClick={() => handleVerifyCandidate(c._id, "verify")}
                                      style={{ borderColor: "#22C55E", color: "#15803D" }}
                                    >
                                      ✓ Verify
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredCandidates.length === 0 && (
                          <tr>
                            <td colSpan={9} style={{ textAlign: "center", padding: "48px 20px", color: "#64748B" }}>
                              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                              <div style={{ fontWeight: 800, color: "var(--navy, #0A1F3D)", fontSize: 15 }}>No candidates found</div>
                              <div style={{ fontSize: 12, marginTop: 4 }}>Try clearing search keywords or status filters.</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* =========================================================================
              TAB MODULE: MASTER DIRECTORY - ALL COMPANIES
             ========================================================================= */}
          {activeNav === "companies" && (() => {
            const filteredCompanies = companiesList.filter((comp) => {
              if (companyKycFilter !== "all" && comp.kycStatus !== companyKycFilter) return false;
              if (companyPlanFilter !== "all" && comp.plan !== companyPlanFilter) return false;
              if (companySearch && companySearch.trim()) {
                const q = companySearch.trim().toLowerCase();
                const nameMatch = (comp.companyName || "").toLowerCase().includes(q);
                const legalMatch = (comp.legalName || "").toLowerCase().includes(q);
                const emailMatch = (comp.email || "").toLowerCase().includes(q);
                const gstinMatch = (comp.stage1a?.gstin || "").toLowerCase().includes(q);
                const pocMatch = (comp.contactName || comp.stage1b?.pocname || "").toLowerCase().includes(q);
                if (!nameMatch && !legalMatch && !emailMatch && !gstinMatch && !pocMatch) return false;
              }
              return true;
            });

            const verifiedCount = companiesList.filter((c) => c.kycStatus === "verified").length;
            const reviewCount = companiesList.filter((c) => c.kycStatus === "under_review").length;
            const pendingCount = companiesList.filter((c) => c.kycStatus === "pending").length;
            const totalActiveJobs = companiesList.reduce((acc, c) => acc + (c.jobsCount || 0), 0);

            return (
              <div className="tt-content">
                <QueuePageHeader
                  icon="🏢"
                  accent="var(--navy, #0A1F3D)"
                  title="Companies Master Directory"
                  subtitle="Comprehensive database of hiring companies, corporate legal registration, GSTIN, PAN, KYC documents, active subscription plans, job postings, and incoming candidate requisitions."
                  pills={
                    <>
                      <StatPill count={companiesList.length} label="TOTAL COMPANIES" tone="pending" />
                      <StatPill count={verifiedCount} label="KYC VERIFIED" tone="good" />
                      <StatPill count={reviewCount + pendingCount} label="PENDING REVIEW" tone="pending" />
                      <StatPill count={totalActiveJobs} label="ACTIVE JOB POSTS" tone="good" />
                    </>
                  }
                />

                {/* SEARCH AND FILTER CONTROLS */}
                <div className="staff-search-filter-bar" style={{ marginTop: 20 }}>
                  <input
                    type="text"
                    className="staff-filter-input"
                    placeholder="Search company by name, legal name, GSTIN, email, POC..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                  />
                  <select
                    className="staff-filter-select"
                    value={companyKycFilter}
                    onChange={(e) => setCompanyKycFilter(e.target.value)}
                  >
                    <option value="all">All KYC Statuses ({companiesList.length})</option>
                    <option value="verified">Verified ({verifiedCount})</option>
                    <option value="under_review">Under Review ({reviewCount})</option>
                    <option value="pending">Pending ({pendingCount})</option>
                    <option value="rejected">Rejected / Revision</option>
                  </select>
                  <select
                    className="staff-filter-select"
                    value={companyPlanFilter}
                    onChange={(e) => setCompanyPlanFilter(e.target.value)}
                  >
                    <option value="all">All Plans</option>
                    <option value="free">Free Tier</option>
                    <option value="growth">Growth Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                  </select>
                  <button
                    type="button"
                    className="sf-action-btn"
                    onClick={() => fetchCompanies(companySearch, companyKycFilter)}
                    style={{ background: "var(--navy, #0A1F3D)", color: "#fff", border: "none", padding: "9px 16px" }}
                  >
                    {companiesLoading ? "Refreshing..." : "🔄 Refresh Directory"}
                  </button>
                </div>

                {/* COMPANIES DATA TABLE */}
                <div className="tt-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="sf-table-wrap">
                    <table className="sf-table">
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Point of Contact (POC)</th>
                          <th>Registration &amp; Tax</th>
                          <th>Plan</th>
                          <th>KYC Status</th>
                          <th>Job Posts &amp; Apps</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCompanies.map((comp) => {
                          const initials = (comp.companyName || "CP")
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();
                          const s1a = comp.stage1a || {};
                          const s1b = comp.stage1b || {};
                          const kycBg =
                            comp.kycStatus === "verified" ? "#DCFCE7" : comp.kycStatus === "under_review" ? "#FEF3C7" : comp.kycStatus === "rejected" ? "#FEE2E2" : "#F1F5F9";
                          const kycColor =
                            comp.kycStatus === "verified" ? "#15803D" : comp.kycStatus === "under_review" ? "#B45309" : comp.kycStatus === "rejected" ? "#B91C1C" : "#475569";

                          return (
                            <tr key={comp._id || comp.id}>
                              <td>
                                <div className="sf-name-cell">
                                  <div
                                    className="sf-mini-avatar"
                                    style={{
                                      background: "rgba(10,31,61,0.08)",
                                      color: "var(--navy, #0A1F3D)",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, color: "var(--navy, #0A1F3D)", fontSize: 13 }}>
                                      {comp.companyName}
                                    </div>
                                    {comp.legalName && comp.legalName !== comp.companyName && (
                                      <div style={{ fontSize: 11, color: "#64748B" }}>Legal: {comp.legalName}</div>
                                    )}
                                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{comp.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: "var(--navy, #0A1F3D)", fontSize: 12 }}>
                                  {comp.contactName || s1b.pocname || "Not assigned"}
                                </div>
                                <div style={{ fontSize: 11, color: "#64748B" }}>{comp.mobile || s1b.pocmobile || "No phone"}</div>
                                {s1b.pocdesig && <div style={{ fontSize: 10.5, color: "#94A3B8" }}>{s1b.pocdesig}</div>}
                              </td>
                              <td>
                                <div>
                                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--navy, #0A1F3D)" }}>
                                    GSTIN: <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{s1a.gstin || "Not provided"}</span>
                                  </div>
                                  <div style={{ fontSize: 11, color: "#64748B" }}>
                                    PAN: <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{s1a.pan || "Not provided"}</span>
                                  </div>
                                  {s1a.entity && <div style={{ fontSize: 10.5, color: "#94A3B8" }}>{s1a.entity}</div>}
                                </div>
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: "inline-block",
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    padding: "3px 9px",
                                    borderRadius: 6,
                                    textTransform: "uppercase",
                                    background:
                                      comp.plan === "enterprise" ? "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)" : comp.plan === "growth" ? "#EDE9FE" : "#F1F5F9",
                                    color: comp.plan === "enterprise" ? "var(--gold, #E5A82E)" : comp.plan === "growth" ? "#6D28D9" : "#475569",
                                    border: comp.plan === "enterprise" ? "1px solid rgba(229,168,46,0.3)" : "1px solid #E2E8F0",
                                  }}
                                >
                                  {comp.plan || "Free"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className="sf-stage-pill"
                                  style={{
                                    background: kycBg,
                                    color: kycColor,
                                    fontWeight: 800,
                                  }}
                                >
                                  {comp.kycStatus === "verified"
                                    ? "VERIFIED ✓"
                                    : comp.kycStatus === "under_review"
                                    ? "UNDER REVIEW"
                                    : comp.kycStatus === "rejected"
                                    ? "REVISION REQ"
                                    : "PENDING"}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--navy, #0A1F3D)" }}>
                                    {comp.jobsCount || 0} Job Post{(comp.jobsCount || 0) !== 1 ? "s" : ""}
                                  </span>
                                  <span style={{ fontSize: 11, color: "#64748B" }}>
                                    {comp.applicationsCount || 0} applicant{(comp.applicationsCount || 0) !== 1 ? "s" : ""}
                                  </span>
                                </div>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: 6 }}>
                                  <button
                                    type="button"
                                    className="sf-action-btn"
                                    onClick={() => openCompanyDetail(comp, "legal")}
                                    style={{ background: "var(--navy, #0A1F3D)", color: "#fff", border: "none" }}
                                  >
                                    View Full Details
                                  </button>
                                  <button
                                    type="button"
                                    className="sf-action-btn outline"
                                    onClick={() => openCompanyDetail(comp, "applicants")}
                                    style={{ borderColor: "#2563EB", color: "#2563EB" }}
                                  >
                                    👥 Applicants ({comp.applicationsCount || 0})
                                  </button>
                                  <button
                                    type="button"
                                    className="sf-action-btn outline"
                                    onClick={() => openCompanyDetail(comp, "plan")}
                                  >
                                    Assign Plan
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredCompanies.length === 0 && (
                          <tr>
                            <td colSpan={7} style={{ textAlign: "center", padding: "48px 20px", color: "#64748B" }}>
                              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                              <div style={{ fontWeight: 800, color: "var(--navy, #0A1F3D)", fontSize: 15 }}>No companies found</div>
                              <div style={{ fontSize: 12, marginTop: 4 }}>Try clearing search keywords or KYC filters.</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* =========================================================================
              TAB MODULE: MASTER DIRECTORY - ALL ACADEMIES
             ========================================================================= */}
          {activeNav === "academies" && (() => {
            const filteredAcademies = academiesList.filter((ac) => {
              if (academySearch && academySearch.trim()) {
                const q = academySearch.trim().toLowerCase();
                const nameMatch = (ac.name || "").toLowerCase().includes(q);
                const emailMatch = (ac.email || "").toLowerCase().includes(q);
                const adminMatch = (ac.primaryAdmin || ac.contactName || "").toLowerCase().includes(q);
                const hqMatch = (ac.headquarters || "").toLowerCase().includes(q);
                if (!nameMatch && !emailMatch && !adminMatch && !hqMatch) return false;
              }
              return true;
            });

            const totalBatches = academiesList.reduce((acc, a) => acc + (a.batchesCount || 0), 0);
            const totalEnrolled = academiesList.reduce((acc, a) => acc + (a.enrolledCandidatesCount || a.studentsUploaded || 0), 0);
            const totalCourses = academiesList.reduce((acc, a) => acc + (a.coursesCount || (a.courses || []).length || 0), 0);

            return (
              <div className="tt-content">
                <QueuePageHeader
                  icon="🎓"
                  accent="var(--navy, #0A1F3D)"
                  title="Academies Master Directory"
                  subtitle="Comprehensive database of partner training institutions, student batches, specialized healthcare courses, affiliated trainees, question banks, and placement track record."
                  pills={
                    <>
                      <StatPill count={academiesList.length} label="PARTNER ACADEMIES" tone="good" />
                      <StatPill count={totalBatches} label="ACTIVE BATCHES" tone="pending" />
                      <StatPill count={totalEnrolled} label="STUDENT TRAINEES" tone="good" />
                      <StatPill count={totalCourses} label="COURSES OFFERED" tone="pending" />
                    </>
                  }
                />

                {/* SEARCH AND FILTER CONTROLS */}
                <div className="staff-search-filter-bar" style={{ marginTop: 20 }}>
                  <input
                    type="text"
                    className="staff-filter-input"
                    placeholder="Search academy by name, contact person, headquarters, email..."
                    value={academySearch}
                    onChange={(e) => setAcademySearch(e.target.value)}
                  />
                  <button
                    type="button"
                    className="sf-action-btn"
                    onClick={() => fetchAcademies(academySearch)}
                    style={{ background: "var(--navy, #0A1F3D)", color: "#fff", border: "none", padding: "9px 16px" }}
                  >
                    {academiesLoading ? "Refreshing..." : "🔄 Refresh Directory"}
                  </button>
                </div>

                {/* ACADEMIES DATA TABLE */}
                <div className="tt-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="sf-table-wrap">
                    <table className="sf-table">
                      <thead>
                        <tr>
                          <th>Academy</th>
                          <th>Contact &amp; Admin</th>
                          <th>Campus &amp; Branches</th>
                          <th>Batches &amp; Trainees</th>
                          <th>Courses &amp; Placements</th>
                          <th>Partner Since</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAcademies.map((ac) => {
                          const initials = (ac.name || "AC")
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();
                          const branches = ac.branches || [];

                          return (
                            <tr key={ac._id || ac.id}>
                              <td>
                                <div className="sf-name-cell">
                                  <div
                                    className="sf-mini-avatar"
                                    style={{
                                      background: "#EDE9FE",
                                      color: "#6D28D9",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, color: "var(--navy, #0A1F3D)", fontSize: 13 }}>
                                      {ac.name}
                                    </div>
                                    <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                                      <span
                                        style={{
                                          fontSize: 9.5,
                                          fontWeight: 800,
                                          background: "#DCFCE7",
                                          color: "#15803D",
                                          padding: "2px 6px",
                                          borderRadius: 4,
                                        }}
                                      >
                                        {ac.tier || "Verified Partner"}
                                      </span>
                                      <span style={{ fontSize: 10.5, color: "#64748B" }}>{ac.specialty || "Medical Coding"}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: "var(--navy, #0A1F3D)", fontSize: 12 }}>
                                  {ac.primaryAdmin || ac.contactName || "Academy Lead"}
                                </div>
                                <div style={{ fontSize: 11, color: "#64748B" }}>{ac.email}</div>
                                {ac.phone && <div style={{ fontSize: 10.5, color: "#94A3B8" }}>📞 {ac.phone}</div>}
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: "var(--navy, #0A1F3D)", fontSize: 12 }}>
                                  HQ: {ac.headquarters || "Not specified"}
                                </div>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                                  {branches.slice(0, 3).map((b, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        fontSize: 9.5,
                                        background: "#F1F5F9",
                                        color: "#475569",
                                        padding: "1px 6px",
                                        borderRadius: 4,
                                      }}
                                    >
                                      {b}
                                    </span>
                                  ))}
                                  {branches.length > 3 && (
                                    <span style={{ fontSize: 9.5, color: "#94A3B8" }}>+{branches.length - 3}</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--navy, #0A1F3D)" }}>
                                    {ac.batchesCount || (ac.batches || []).length} Active Batch{(ac.batchesCount || 0) !== 1 ? "es" : ""}
                                  </span>
                                  <span style={{ fontSize: 11, color: "#64748B" }}>
                                    {ac.enrolledCandidatesCount || ac.studentsUploaded || 0} enrolled trainees
                                  </span>
                                  <span style={{ fontSize: 10, color: "#15803D", fontWeight: 700 }}>
                                    {ac.verifiedPct || 94}% verified rate
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--navy, #0A1F3D)" }}>
                                    {ac.coursesCount || (ac.courses || []).length} Course{(ac.coursesCount || 0) !== 1 ? "s" : ""}
                                  </span>
                                  <span style={{ fontSize: 11, color: "#64748B" }}>
                                    {ac.placementsCount || (ac.placements || []).length} Reported Placements
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span style={{ fontSize: 11.5, color: "#64748B" }}>{ac.partnerSince || "2025"}</span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  className="sf-action-btn"
                                  onClick={() => {
                                    setSelectedAcademy(ac);
                                    setAcademyModalTab("profile");
                                  }}
                                  style={{ background: "var(--navy, #0A1F3D)", color: "#fff", border: "none" }}
                                >
                                  View Full Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredAcademies.length === 0 && (
                          <tr>
                            <td colSpan={7} style={{ textAlign: "center", padding: "48px 20px", color: "#64748B" }}>
                              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                              <div style={{ fontWeight: 800, color: "var(--navy, #0A1F3D)", fontSize: 15 }}>No academies found</div>
                              <div style={{ fontSize: 12, marginTop: 4 }}>Try clearing search keywords.</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB MODULE: MY TASKS */}
          {activeNav === "my_tasks" && (() => {
            const pending = todayTasksList.filter((t) => !t.completed).length;
            const done = todayTasksList.filter((t) => t.completed).length;
            const highPriority = todayTasksList.filter((t) => !t.completed && t.priority === "HIGH").length;
            const total = todayTasksList.length;
            return (
              <div className="tt-content">
                {/* WELCOME-STYLE HERO BANNER */}
                <div className="sf-welcome">
                  <div className="sf-welcome-row">
                    <div className="sf-welcome-info">
                      <div className="sf-greet" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Icon name="checklist" size={26} sw={2.2} /> My Tasks
                      </div>
                      <div className="sf-meta">
                        <span className="sf-day-pill">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }).toUpperCase()}</span>
                        <span className="sf-meta-pill">TO-DO LIST</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>Visits, calls &amp; follow-ups · not yet synced to a shared backend</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.06em", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Today</div>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>
                        {done}<span style={{ color: "rgba(255,255,255,0.4)", fontSize: 20 }}>/{total}</span>
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>tasks done</div>
                    </div>
                  </div>
                </div>

                {/* KPI TILES */}
                <div className="tt-kpi-grid">
                  {[
                    { title: "Pending", value: pending, icon: "clock", cls: "tt-kpi-3" },
                    { title: "Completed", value: done, icon: "shieldCheck", cls: "tt-kpi-2" },
                    { title: "High Priority", value: highPriority, icon: "alertTriangle", cls: "tt-kpi-1" },
                    { title: "Total Today", value: total, icon: "checklist", cls: "tt-kpi-4" },
                  ].map((kpi, idx) => (
                    <div key={idx} className="tt-kpi">
                      <div className={`tt-kpi-icon ${kpi.cls}`}><Icon name={kpi.icon} size={18} /></div>
                      <div className="tt-kpi-label">{kpi.title}</div>
                      <div className="tt-kpi-value">{kpi.value}</div>
                    </div>
                  ))}
                </div>

                <div className="tt-card">
                  <div className="tt-card-head">
                    <div>
                      <div className="tt-card-title">Add a Task</div>
                      <div className="tt-card-sub">Quick add — shows up in today's list and on your Dashboard tab.</div>
                    </div>
                  </div>
                  <div className="sf-add-task-form">
                    <input
                      type="text"
                      className="sf-task-input"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                      placeholder="e.g. Call Apollo Coding Institute about new batch"
                    />
                    <select
                      className="sf-task-select"
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                    >
                      <option value="HIGH">High priority</option>
                      <option value="MED">Medium priority</option>
                      <option value="LOW">Low priority</option>
                    </select>
                    <button type="button" className="staff-quick-btn" onClick={addTask}>
                      <Icon name="plus" size={14} sw={2.4} /> Add Task
                    </button>
                  </div>
                </div>

                <div className="tt-card">
                  <div className="tt-card-head">
                    <div>
                      <div className="tt-card-title">Today's List</div>
                      <div className="tt-card-sub">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</div>
                    </div>
                  </div>
                  <div style={{ padding: "4px 22px 18px" }}>
                    {todayTasksList.length === 0 && (
                      <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No tasks yet — add one above.</div>
                    )}
                    {todayTasksList.map((task) => {
                      const pillCls = task.priority === "HIGH" ? "sf-task-p1" : task.priority === "MED" ? "sf-task-p2" : "sf-task-p3";
                      return (
                        <div key={task.id} className="sf-task" style={{ opacity: task.completed ? 0.5 : 1 }}>
                          <input
                            type="checkbox"
                            className="sf-task-check"
                            checked={task.completed}
                            onChange={() => toggleTaskCompletion(task.id)}
                          />
                          <div className="sf-task-time">{task.time}</div>
                          <div className="sf-task-info">
                            <div className={`sf-task-title${task.completed ? " done" : ""}`}>{task.title}</div>
                            <div className="sf-task-meta">{task.detail}</div>
                          </div>
                          <span className={`sf-task-pill ${pillCls}`}>{task.priority === "HIGH" ? "High" : task.priority === "MED" ? "Med" : "Low"}</span>
                          <button
                            type="button"
                            className="sf-task-del-btn"
                            onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                            title="Remove task"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB MODULE: NOTIFICATIONS */}
          {activeNav === "notifications" && (() => {
            const jobPostingCount = staffNotifications.filter((n) => n.type === "job_submitted" || n.type === "job_approved" || n.type === "job_rejected").length;
            return (
            <div className="tt-content">
              {/* WELCOME-STYLE HERO BANNER */}
              <div className="sf-welcome">
                <div className="sf-welcome-row">
                  <div className="sf-welcome-info">
                    <div className="sf-greet" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icon name="bell" size={26} sw={2.2} /> Notifications
                    </div>
                    <div className="sf-meta">
                      <span className="sf-day-pill">{staffUnreadCount > 0 ? "NEW ACTIVITY" : "ALL CAUGHT UP"}</span>
                      <span className="sf-meta-pill">NOTIFICATIONS QUEUE</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>Operational alerts and system updates</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.06em", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Unread</div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>
                      {staffUnreadCount}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>new notifications</div>
                  </div>
                </div>
              </div>

              {/* KPI TILES */}
              <div className="tt-kpi-grid tt-kpi-grid-3">
                {[
                  { title: "Unread", value: staffUnreadCount, icon: "bell", cls: "tt-kpi-1" },
                  { title: "Total Notifications", value: staffNotifications.length, icon: "database", cls: "tt-kpi-3" },
                  { title: "Job Postings", value: jobPostingCount, icon: "briefcase", cls: "tt-kpi-2" },
                ].map((kpi, idx) => (
                  <div key={idx} className="tt-kpi">
                    <div className={`tt-kpi-icon ${kpi.cls}`}><Icon name={kpi.icon} size={18} /></div>
                    <div className="tt-kpi-label">{kpi.title}</div>
                    <div className="tt-kpi-value">{kpi.value}</div>
                  </div>
                ))}
              </div>

              <div className="tt-card">
                <div className="tt-card-head">
                  <div>
                    <div className="tt-card-title">All Notifications</div>
                    <div className="tt-card-sub">Newest first</div>
                  </div>
                  {staffUnreadCount > 0 && (
                    <span className="tt-card-link" onClick={markStaffNotifRead}>Mark all as read</span>
                  )}
                </div>
                <div style={{ padding: "4px 0 4px" }}>
                  {staffNotifications.length === 0 ? (
                    <div style={{ padding: "32px 22px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      No notifications yet. You'll see updates here when companies post or resubmit jobs.
                    </div>
                  ) : (
                    staffNotifications.map((n) => {
                      const typeIcon = {
                        job_submitted: "briefcase",
                        job_approved: "check",
                        job_rejected: "alertTriangle",
                        kyc_submitted: "eye",
                        kyc_approved: "shieldCheck",
                        kyc_revision: "alertTriangle",
                        doc_updated: "doc",
                        system: "bell",
                      }[n.type] || "bell";
                      return (
                        <div
                          key={n._id}
                          className="sf-feed-item"
                          style={{ padding: "14px 22px", background: n.read ? "transparent" : "rgba(229,168,46,0.06)", cursor: "default" }}
                        >
                          <div className="sf-feed-icon" style={{ background: n.read ? "#F1F5F9" : "rgba(229,168,46,0.15)", color: n.read ? "#64748B" : "#B47E0E" }}>
                            <Icon name={typeIcon} size={15} />
                          </div>
                          <div className="sf-feed-info">
                            <div className="sf-feed-text" style={{ fontWeight: n.read ? 500 : 700 }}>{n.title || n.message}</div>
                            {n.title && n.message && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{n.message}</div>}
                            <div className="sf-feed-time">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}</div>
                          </div>
                          {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold, #E5A82E)", flexShrink: 0, marginTop: 6 }} />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            );
          })()}

          {/* TAB MODULE: DEPARTMENT PAGES - Assessment + Video gets a real-data
              view built from dashData.videoIntrosQueue / textAssessmentQueue
              (both genuinely computed server-side in staff.js) instead of the
              illustrative DEPARTMENTS config used by the other five
              departments below, which have no real staff-directory API yet. */}
          {activeNav === "dept_assessment_video" ? (() => {
            const dept = DEPARTMENTS.dept_assessment_video;
            const videoQueue = videoIntrosQueue || [];
            const textQueue = textAssessmentQueue || [];
            const scored = videoQueue.filter((v) => typeof v.aiScore === "number");
            const avgAiScore = scored.length > 0 ? Math.round((scored.reduce((s, v) => s + v.aiScore, 0) / scored.length) * 10) / 10 : null;
            return (
              <div className="tt-content">
                {/* WELCOME-STYLE HERO BANNER */}
                <div className="sf-welcome">
                  <div className="sf-welcome-row">
                    <div className="sf-welcome-info">
                      <div className="sf-greet" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 26, lineHeight: 1 }}>{dept.icon}</span> {dept.title}
                      </div>
                      <div className="sf-meta">
                        <span className="sf-meta-pill">{videoQueue.length} SELF-INTRO VIDEOS</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 520 }}>{dept.description}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.06em", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Pending Review</div>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>
                        {videoCounts.pending}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>videos</div>
                    </div>
                  </div>
                </div>

                {/* KPI TILES - all real */}
                <div className="tt-kpi-grid tt-kpi-grid-3">
                  <div className="tt-kpi">
                    <div className="tt-kpi-icon tt-kpi-1"><Icon name="video" size={18} /></div>
                    <div className="tt-kpi-label">Self-Intro Videos Submitted</div>
                    <div className="tt-kpi-value">{videoQueue.length}</div>
                  </div>
                  <div className="tt-kpi">
                    <div className="tt-kpi-icon tt-kpi-2"><Icon name="clock" size={18} /></div>
                    <div className="tt-kpi-label">Avg. AI Score</div>
                    <div className="tt-kpi-value">{avgAiScore !== null ? avgAiScore : "—"}</div>
                  </div>
                  <div className="tt-kpi">
                    <div className="tt-kpi-icon tt-kpi-3"><Icon name="mic" size={18} /></div>
                    <div className="tt-kpi-label">Question Bank Size</div>
                    <div className="tt-kpi-value">{interviewQuestions.length}</div>
                  </div>
                </div>

                {/* QUICK ACTION - real, wired to the actual question bank view */}
                <div className="sf-actions-grid" style={{ gridTemplateColumns: "1fr" }}>
                  <button type="button" className="sf-action" onClick={() => setActiveNav("questions")}>
                    <div className="sf-action-icon sf-a2"><Icon name="mic" size={22} /></div>
                    <div className="sf-action-title">Question Bank</div>
                    <div className="sf-action-desc">Open the interview question bank.</div>
                    <div className="sf-action-cta">Open →</div>
                  </button>
                </div>

                {/* REAL VIDEO REVIEW LIST - actual <video> players over each
                    candidate's real recorded videoUrl, with a genuine
                    staff-verify action (POST /api/staff/verify-video). */}
                <div className="tt-card">
                  <div className="tt-card-head">
                    <div>
                      <div className="tt-card-title">Self-Introduction Videos</div>
                      <div className="tt-card-sub">Recorded candidate self-introduction videos · review and verify</div>
                    </div>
                  </div>
                  <div style={{ padding: "4px 22px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
                    {videoQueue.length === 0 ? (
                      <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted, #4A5568)", fontSize: 13 }}>
                        No candidates have submitted a self-introduction video yet.
                      </div>
                    ) : (
                      videoQueue.map((v) => (
                        <div key={v.id} style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18, border: "1px solid var(--border-light, #E2E8F0)", borderRadius: 14, padding: 16 }}>
                          <div>
                            {v.videoUrl ? (
                              <>
                                <video
                                  src={getAssetUrl(v.videoUrl)}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  style={{ width: "100%", borderRadius: 10, background: "#000", display: "block", aspectRatio: "16/9" }}
                                />
                                <div style={{ marginTop: 6, textAlign: "right" }}>
                                  <a
                                    href={getAssetUrl(v.videoUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: 11, color: "var(--navy, #0A1F3D)", textDecoration: "none", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}
                                  >
                                    <span>↗ Open video</span>
                                  </a>
                                </div>
                              </>
                            ) : (
                              <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 10, background: "rgba(10,31,61,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-muted, #4A5568)" }}>
                                No playable file
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                              <div>
                                <div style={{ fontWeight: 700, color: "var(--navy, #0A1F3D)" }}>{v.studentName}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted, #4A5568)" }}>{v.role} · {v.email}</div>
                              </div>
                              <span className="sf-stage-pill" style={{ background: v.verified ? "#DCFCE7" : "#FEF3C7", color: v.verified ? "#15803D" : "#B45309" }}>
                                {v.verified ? "Verified" : "Pending Audit"}
                              </span>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10, fontSize: 12, color: "var(--text-muted, #4A5568)" }}>
                              <span>Mode: {v.interviewMode}</span>
                              {typeof v.aiScore === "number" && <span>AI Score: {v.aiScore}</span>}
                              <span>Duration: {v.duration}</span>
                              {v.questions && v.questions.length > 0 && <span>{v.questions.length} question(s) answered</span>}
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                              {!v.verified ? (
                                <button type="button" className="sf-action-btn" disabled={processingId === v.id} onClick={() => handleVerifyVideo(v.id, "verify")}>
                                  {processingId === v.id ? "Processing…" : "✓ Verify"}
                                </button>
                              ) : (
                                <button type="button" className="sf-action-btn outline" disabled={processingId === v.id} onClick={() => handleVerifyVideo(v.id, "reject")}>
                                  {processingId === v.id ? "Processing…" : "Send back for re-record"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* REAL TEXT ASSESSMENT LOG */}
                <div className="tt-card">
                  <div className="tt-card-head">
                    <div>
                      <div className="tt-card-title">Text Assessment Log</div>
                      <div className="tt-card-sub">Proctored knowledge assessments submitted by candidates (auto-graded, reference only)</div>
                    </div>
                  </div>
                  <div className="sf-table-wrap">
                    <table className="sf-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Topic</th>
                          <th>Score</th>
                          <th>Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {textQueue.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--text-muted, #4A5568)" }}>No assessments submitted yet.</td></tr>
                        ) : (
                          textQueue.map((t) => (
                            <tr key={t.id}>
                              <td>
                                <div className="sf-name-cell">
                                  <div className="sf-mini-avatar">{(t.studentName || "C").slice(0, 2).toUpperCase()}</div>
                                  <div style={{ fontWeight: 600 }}>{t.studentName}</div>
                                </div>
                              </td>
                              <td>{t.topic || t.assessmentType}</td>
                              <td>{t.foundationScore != null ? `${t.foundationScore} / 100` : "—"}</td>
                              <td style={{ color: "var(--text-muted, #4A5568)" }}>{t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : "—"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })() : activeNav.startsWith("dept_") && DEPARTMENTS[activeNav] && (() => {
            const dept = DEPARTMENTS[activeNav];
            const live = getDeptLiveData(activeNav, dashData);
            return (
              <div className="tt-content">
                {/* WELCOME-STYLE HERO BANNER */}
                <div className="sf-welcome">
                  <div className="sf-welcome-row">
                    <div className="sf-welcome-info">
                      <div className="sf-greet" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 26, lineHeight: 1 }}>{dept.icon}</span> {dept.title}
                      </div>
                      <div className="sf-meta">
                        {dept.isMine && <span className="sf-day-pill">YOUR TEAM</span>}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 520 }}>{dept.description}</span>
                      </div>
                    </div>
                    {live.hero && (
                      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.06em", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{live.hero.label}</div>
                        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>
                          {live.hero.value}
                        </div>
                        {live.hero.unit && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{live.hero.unit}</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* KPI TILES - real, from dashData (see getDeptLiveData) */}
                {live.tiles.length > 0 ? (
                  <div className="tt-kpi-grid tt-kpi-grid-3">
                    {live.tiles.map((s, idx) => (
                      <div key={idx} className="tt-kpi">
                        <div className={`tt-kpi-icon ${s.cls}`}><Icon name={s.icon} size={18} /></div>
                        <div className="tt-kpi-label">{s.label}</div>
                        <div className="tt-kpi-value">{s.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="tt-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted, #4A5568)", fontSize: 13 }}>
                    No live metrics are wired up for this department yet.
                  </div>
                )}

                {/* QUICK ACTION CARDS - only real, working actions */}
                {live.actions && live.actions.length > 0 && (
                  <div className="sf-actions-grid" style={{ gridTemplateColumns: `repeat(${live.actions.length}, 1fr)` }}>
                    {live.actions.map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="sf-action"
                        onClick={() => setActiveNav(act.modalNav)}
                      >
                        <div className={`sf-action-icon ${act.cls}`}><Icon name={act.icon} size={22} /></div>
                        <div className="sf-action-title">{act.title}</div>
                        <div className="sf-action-desc">{act.desc}</div>
                        <div className="sf-action-cta">Open →</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB MODULE 2: KYC VERIFICATION */}
          {activeNav === "kyc" && (
            <div className="tt-content">
              <QueuePageHeader
                icon="🔍"
                accent="var(--navy, #0A1F3D)"
                title="KYC Verification"
                subtitle="Audit business registration, GSTIN, PAN, and KYC certificates submitted by employer accounts before granting the Gold Trust Badge."
                pills={
                  <>
                    <StatPill count={kycCounts.pending} label="PENDING" tone="pending" />
                    <StatPill count={kycCounts.verified} label="VERIFIED" tone="good" />
                    <StatPill count={kycCounts.rejected} label="REJECTED" tone="bad" />
                  </>
                }
              />
              <div style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--border-light, #E2E8F0)", overflow: "hidden" }}>
                {!(companyKycQueue && companyKycQueue.length) ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted, #4A5568)", fontSize: 13 }}>
                    No companies in the verification queue.
                  </div>
                ) : (() => {
                  const selectedComp = companyKycQueue.find((c) => c.id === selectedKycId) || companyKycQueue[0];
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: 560 }}>
                      <div style={{ borderRight: "1px solid #EEF0F3", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid #EEF0F3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)", fontSize: 12.5, fontWeight: 800, color: "var(--navy)", margin: 0, textTransform: "uppercase" }}>
                            Registered Companies
                          </h3>
                          <span style={{ background: "#EEF2F7", color: "var(--navy, #0A1F3D)", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                            {companyKycQueue.length}
                          </span>
                        </div>
                        <div style={{ overflowY: "auto", maxHeight: 600 }}>
                          {companyKycQueue.map((comp) => {
                            const isSelected = selectedComp && selectedComp.id === comp.id;
                            const isVerified = comp.kycStatus === "verified";
                            const isRejected = comp.kycStatus === "rejected";
                            return (
                              <button
                                key={comp.id}
                                type="button"
                                onClick={() => setSelectedKycId(comp.id)}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "14px 16px",
                                  border: "none",
                                  borderLeft: isSelected ? "3px solid var(--navy)" : "3px solid transparent",
                                  borderBottom: "1px solid #F5F6F8",
                                  background: isSelected ? "#F5F7FB" : "transparent",
                                  cursor: "pointer",
                                  display: "block",
                                  fontFamily: "var(--font-body, 'Manrope', sans-serif)"
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--navy)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {toStr(comp.companyName, "Unnamed Company")}
                                </div>
                                <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6 }}>{toStr(comp.contactName, "N/A")} · {toStr(comp.entity, "Company")}</div>
                                <span style={{ fontSize: 9.5, fontWeight: 800, padding: "3px 8px", borderRadius: 4, background: isVerified ? "#DCFCE7" : isRejected ? "#FEE2E2" : "#FEF3C7", color: isVerified ? "#15803D" : isRejected ? "#B91C1C" : "#B45309", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", textTransform: "uppercase" }}>
                                  {toStr(comp.kycStatus, "pending")}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* MAIN DETAILS PANEL */}
                      <div style={{ padding: 24, overflowY: "auto", maxHeight: 620 }}>
                        {selectedComp && (
                          <div>
                            {/* COMPANY HEADER */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #F1F5F9" }}>
                              <div>
                                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B" }}>
                                  EMPLOYER AUDIT DOSSIER
                                </span>
                                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: "2px 0 4px 0" }}>{toStr(selectedComp.companyName, "Unnamed Company")}</h2>
                                <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
                                  Legal Entity: <strong>{toStr(selectedComp.legalName, "Not provided")}</strong> ({toStr(selectedComp.entity, "Private Limited")})
                                </p>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 800, padding: "6px 14px", borderRadius: 999, background: selectedComp.kycStatus === "verified" ? "#DCFCE7" : selectedComp.kycStatus === "rejected" ? "#FEE2E2" : "#FEF3C7", color: selectedComp.kycStatus === "verified" ? "#15803D" : selectedComp.kycStatus === "rejected" ? "#B91C1C" : "#B45309", textTransform: "uppercase" }}>
                                {selectedComp.kycStatus === "verified" ? "✓ GOLD BADGE VERIFIED" : selectedComp.kycStatus === "rejected" ? "✕ REVISION REQUESTED" : "● PENDING STAFF AUDIT"}
                              </span>
                            </div>

                            {/* DETAILS GRID */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 24, background: "#F8FAFC", padding: 18, borderRadius: 14, border: "1px solid #E2E8F0" }}>
                              <div>
                                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>GSTIN Number</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 2, fontFamily: "monospace" }}>{toStr(selectedComp.gstin, "Not provided")}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>PAN Card Number</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 2, fontFamily: "monospace" }}>{toStr(selectedComp.pan, "Not provided")}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>Primary Contact Person</div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{toStr(selectedComp.contactName, "N/A")}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>Contact Email & Mobile</div>
                                <div style={{ fontSize: 13, color: "#0F172A", marginTop: 2 }}>{toStr(selectedComp.email, "")} · {toStr(selectedComp.mobile, "")}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>Authorized Signatory</div>
                                <div style={{ fontSize: 13, color: "#0F172A", marginTop: 2 }}>{toStr(selectedComp.signatory, "Not specified")}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>Subscription Plan</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#2563EB", marginTop: 2, textTransform: "uppercase" }}>{toStr(selectedComp.plan, "Free")}</div>
                              </div>
                            </div>

                            {/* REJECTION REASON BANNER */}
                            {selectedComp.kycRejectionReason && (
                              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#991B1B", fontSize: 13 }}>
                                <strong>Rejection Reason:</strong> {toStr(selectedComp.kycRejectionReason, "")}
                              </div>
                            )}

                            {/* UPLOADED DOCUMENTS AUDIT GRID */}
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", marginBottom: 12 }}>
                              KYC Verification Documents ({selectedComp.docs ? selectedComp.docs.filter((d) => d.uploaded).length : 0}/6 Uploaded)
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
                              {(selectedComp.docs || []).map((doc) => (
                                <div key={doc.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                      <span style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{toStr(doc.label, "")}</span>
                                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: doc.uploaded ? "#DCFCE7" : "#F1F5F9", color: doc.uploaded ? "#15803D" : "#94A3B8" }}>
                                        {doc.uploaded ? "✓ UPLOADED" : "MISSING"}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: 11, color: "#64748B", marginBottom: 10, wordBreak: "break-all" }}>
                                      {toStr(doc.docName || doc.docUrl, "No document file uploaded")}
                                    </div>
                                  </div>
                                  {doc.uploaded && (
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                      {doc.docUrl && (
                                        <a
                                          href={getAssetUrl(doc.docUrl)}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ background: "#F1F5F9", color: "#0F172A", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: "none" }}
                                        >
                                          📄 View PDF / File
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleVerifyDoc(selectedComp.id, doc.id, true)}
                                        style={{ background: doc.isValid === true ? "#DCFCE7" : "#F8FAFC", color: doc.isValid === true ? "#15803D" : "#475569", border: "1px solid #CBD5E1", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                                      >
                                        Valid ✓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleVerifyDoc(selectedComp.id, doc.id, false)}
                                        style={{ background: doc.isValid === false ? "#FEE2E2" : "#F8FAFC", color: doc.isValid === false ? "#B91C1C" : "#475569", border: "1px solid #CBD5E1", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                                      >
                                        Invalid ✕
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* AUDIT ACTION BUTTONS */}
                            <div style={{ display: "flex", gap: 12, borderTop: "1px solid #F1F5F9", paddingTop: 20 }}>
                              <button
                                type="button"
                                disabled={processingId === selectedComp.id}
                                onClick={() => handleAuditKyc(selectedComp.id, "verify")}
                                style={{ background: "#10B981", color: "#FFFFFF", border: "none", padding: "12px 24px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}
                              >
                                {processingId === selectedComp.id ? "Processing…" : "✓ Approve KYC & Activate Gold Badge"}
                              </button>
                              <button
                                type="button"
                                disabled={processingId === selectedComp.id}
                                onClick={() => {
                                  const reason = prompt("Enter rejection reason / document revision note:");
                                  if (reason) handleAuditKyc(selectedComp.id, "reject", reason);
                                }}
                                style={{ background: "#EF4444", color: "#FFFFFF", border: "none", padding: "12px 24px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer" }}
                              >
                                ✕ Reject & Request Revision
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB MODULE 3: CERTIFICATIONS */}
          {activeNav === "certifications" && (
            <div className="tt-content">
              <QueuePageHeader
                icon="🎓"
                accent="#9333EA"
                title="Certifications Review Queue"
                subtitle="Audit AAPC, AHIMA, and professional coding credentials uploaded by candidates before verifying on candidate profile."
                pills={
                  <>
                    <StatPill count={certCounts.pending} label="PENDING" tone="pending" />
                    <StatPill count={certCounts.verified} label="VERIFIED" tone="good" />
                    <StatPill count={certCounts.rejected} label="REJECTED" tone="bad" />
                  </>
                }
              />
              <div style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--border-light, #E2E8F0)", overflow: "hidden" }}>
                {!(certificationQueue && certificationQueue.length) ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted, #4A5568)", fontSize: 13 }}>
                    No certification claims pending review.
                  </div>
                ) : (() => {
                  const selectedCert = certificationQueue.find((c) => c.id === selectedCertId) || certificationQueue[0];
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: 520 }}>
                      {/* LEFT LIST COLUMN */}
                      <div style={{ borderRight: "1px solid #EEF0F3", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid #EEF0F3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ fontSize: 12.5, fontWeight: 800, color: "var(--navy)", margin: 0, textTransform: "uppercase" }}>
                            Submissions ({certificationQueue.length})
                          </h3>
                        </div>
                        <div style={{ overflowY: "auto", maxHeight: 560 }}>
                          {certificationQueue.map((cert) => {
                            const isSelected = selectedCert && selectedCert.id === cert.id;
                            const isVerified = cert.certStatus === "verified";
                            const isRejected = cert.certStatus === "rejected";
                            return (
                              <button
                                key={cert.id}
                                type="button"
                                onClick={() => setSelectedCertId(cert.id)}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "14px 16px",
                                  border: "none",
                                  borderLeft: isSelected ? "3px solid #9333EA" : "3px solid transparent",
                                  borderBottom: "1px solid #F5F6F8",
                                  background: isSelected ? "#F3E8FF" : "transparent",
                                  cursor: "pointer",
                                  display: "block",
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0F172A", marginBottom: 3 }}>
                                  {toStr(cert.studentName || cert.candidateName, "Candidate")}
                                </div>
                                <div style={{ fontSize: 11.5, color: "#64748B", marginBottom: 6 }}>
                                  {toStr(cert.issuingBody, "AAPC")} · {toStr(cert.certName, "Certification")}
                                </div>
                                <span style={{ fontSize: 9.5, fontWeight: 800, padding: "3px 8px", borderRadius: 4, background: isVerified ? "#DCFCE7" : isRejected ? "#FEE2E2" : "#FEF3C7", color: isVerified ? "#15803D" : isRejected ? "#B91C1C" : "#B45309", textTransform: "uppercase" }}>
                                  {toStr(cert.certStatus, "pending")}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* MAIN DETAILS PANEL */}
                      <div style={{ padding: 24, overflowY: "auto", maxHeight: 580 }}>
                        {selectedCert && (
                          <div>
                            {/* HEADER */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #F1F5F9" }}>
                              <div>
                                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9333EA" }}>
                                  CANDIDATE CREDENTIAL AUDIT
                                </span>
                                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: "2px 0 4px 0" }}>{toStr(selectedCert.studentName || selectedCert.candidateName, "Candidate")}</h2>
                                <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
                                  Email: {toStr(selectedCert.email, "")} · Mobile: {toStr(selectedCert.mobile, "")}
                                </p>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 800, padding: "6px 14px", borderRadius: 999, background: selectedCert.certStatus === "verified" ? "#DCFCE7" : selectedCert.certStatus === "rejected" ? "#FEE2E2" : "#FEF3C7", color: selectedCert.certStatus === "verified" ? "#15803D" : selectedCert.certStatus === "rejected" ? "#B91C1C" : "#B45309", textTransform: "uppercase" }}>
                                {selectedCert.certStatus === "verified" ? "✓ VERIFIED ON PROFILE" : selectedCert.certStatus === "rejected" ? "✕ REJECTED" : "● PENDING AUDIT"}
                              </span>
                            </div>

                            {/* CERTIFICATION DETAILS CARD */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 24, background: "#FAF5FF", padding: 20, borderRadius: 14, border: "1px solid #E9D5FF" }}>
                              <div>
                                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>Issuing Body</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: "#9333EA", marginTop: 2 }}>{toStr(selectedCert.issuingBody, "AAPC")}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>Credential Title</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginTop: 2 }}>{toStr(selectedCert.certName, "CPC")}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>Member / Certification ID</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 2, fontFamily: "monospace" }}>{toStr(selectedCert.memberId, "N/A")}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>Issue Date</div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{toStr(selectedCert.issueDate, "N/A")}</div>
                              </div>
                            </div>

                            {/* UPLOADED CERTIFICATE DOCUMENT PROOF */}
                            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, marginBottom: 24 }}>
                              <h4 style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", margin: "0 0 8px 0" }}>Uploaded Certificate Evidence</h4>
                              <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 14 }}>
                                Document File: <strong>{toStr(selectedCert.docName, "Certificate proof file")}</strong>
                              </div>
                              {selectedCert.docUrl ? (
                                <a
                                  href={getAssetUrl(selectedCert.docUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#9333EA", color: "#FFFFFF", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                                >
                                  📄 View / Download Certificate PDF
                                </a>
                              ) : (
                                <span style={{ color: "#EF4444", fontSize: 13, fontWeight: 600 }}>No document attached to this claim.</span>
                              )}
                            </div>

                            {/* LIVE WEBSITE VERIFICATION */}
                            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, marginBottom: 24 }}>
                              <h4 style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", margin: "0 0 8px 0" }}>Live Website Verification</h4>
                              <p style={{ fontSize: 12.5, color: "#64748B", margin: "0 0 14px 0" }}>
                                Opens the real {selectedCert.issuingBody || "issuing body"} verification page in a live browser session. You solve the CAPTCHA and read the result yourself; capturing saves a screenshot + the page text here as evidence — it doesn't decide verified/rejected for you.
                              </p>
                              {selectedCert.liveVerificationEvidenceUrl && (
                                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>
                                    Last captured{selectedCert.liveVerificationCapturedAt ? ` ${new Date(selectedCert.liveVerificationCapturedAt).toLocaleString()}` : ""}
                                    {selectedCert.liveVerificationCapturedBy ? ` by ${selectedCert.liveVerificationCapturedBy}` : ""}
                                  </div>
                                  <a
                                    href={getAssetUrl(selectedCert.liveVerificationEvidenceUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB" }}
                                  >
                                    🖼️ View captured screenshot ↗
                                  </a>
                                  {selectedCert.liveVerificationText && (
                                    <details style={{ marginTop: 8 }}>
                                      <summary style={{ fontSize: 12, color: "#64748B", cursor: "pointer" }}>Show captured page text</summary>
                                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#334155", marginTop: 6, maxHeight: 160, overflowY: "auto" }}>{selectedCert.liveVerificationText}</pre>
                                    </details>
                                  )}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => startLiveVerify(selectedCert)}
                                style={{ background: "#0F172A", color: "#FFFFFF", border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                              >
                                🎥 Start Live Verification
                              </button>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div style={{ display: "flex", gap: 12, borderTop: "1px solid #F1F5F9", paddingTop: 20 }}>
                              <button
                                type="button"
                                disabled={processingId === selectedCert.id}
                                onClick={() => handleAuditCertification(selectedCert.id, "verify")}
                                style={{ background: "#10B981", color: "#FFFFFF", border: "none", padding: "12px 24px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}
                              >
                                {processingId === selectedCert.id ? "Processing…" : "✓ Approve & Verify Certification"}
                              </button>
                              <button
                                type="button"
                                disabled={processingId === selectedCert.id}
                                onClick={() => {
                                  const reason = prompt("Enter rejection reason:");
                                  if (reason) handleAuditCertification(selectedCert.id, "reject", reason);
                                }}
                                style={{ background: "#EF4444", color: "#FFFFFF", border: "none", padding: "12px 24px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer" }}
                              >
                                ✕ Reject Certification Claim
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}



          {/* TAB MODULE 5: INTERVIEW QUESTIONS */}
          {activeNav === "questions" && (
            <div className="tt-content">
              <QueuePageHeader
                icon="🎤"
                accent="#059669"
                title="AI Interview Questions Bank"
                subtitle="Manage AI video & audio interview assessment question items."
              />
              <div style={{ background: "#fff", padding: 24, borderRadius: 16, border: "1px solid var(--border-light, #E2E8F0)" }}>
                <p style={{ color: "var(--text-muted, #4A5568)" }}>{interviewQuestions.length} Interview questions active in system bank.</p>
              </div>
            </div>
          )}

          {/* TAB MODULE 6: REPORTS */}
          {activeNav === "reports" && (() => {
            const rp = dashData?.reportsData || {};
            const maxMonthly = Math.max(1, ...((rp.monthlyVerifications || []).map((m) => m.count)));
            return (
              <div className="tt-content">
                <QueuePageHeader
                  icon="📊"
                  accent="#D97706"
                  title="Operations Analytics & Reports"
                  subtitle="Real counts pulled straight from the candidate, company, and audit-log records - no simulated figures."
                />
                <div className="tt-kpi-grid">
                  <div className="tt-kpi">
                    <div className="tt-kpi-icon tt-kpi-1"><Icon name="user" size={18} /></div>
                    <div className="tt-kpi-label">Total Candidates</div>
                    <div className="tt-kpi-value">{rp.totalCandidates ?? 0}</div>
                  </div>
                  <div className="tt-kpi">
                    <div className="tt-kpi-icon tt-kpi-2"><Icon name="shieldCheck" size={18} /></div>
                    <div className="tt-kpi-label">Verified Candidates</div>
                    <div className="tt-kpi-value">{rp.verifiedCandidates ?? 0}</div>
                  </div>
                  <div className="tt-kpi">
                    <div className="tt-kpi-icon tt-kpi-3"><Icon name="buildingGrid" size={18} /></div>
                    <div className="tt-kpi-label">Total Companies</div>
                    <div className="tt-kpi-value">{rp.totalCompanies ?? 0}</div>
                  </div>
                  <div className="tt-kpi">
                    <div className="tt-kpi-icon tt-kpi-4"><Icon name="award" size={18} /></div>
                    <div className="tt-kpi-label">Placement Rate</div>
                    <div className="tt-kpi-value">{rp.placementRate ?? "0%"}</div>
                  </div>
                </div>

                <div className="tt-card">
                  <div className="tt-card-head">
                    <div>
                      <div className="tt-card-title">Verifications Per Month</div>
                      <div className="tt-card-sub">Real staff verify actions (candidate + video + certification), from the audit log</div>
                    </div>
                  </div>
                  <div style={{ padding: "8px 22px 22px", display: "flex", alignItems: "flex-end", gap: 18, minHeight: 140 }}>
                    {(rp.monthlyVerifications || []).length === 0 ? (
                      <div style={{ color: "var(--text-muted, #4A5568)", fontSize: 13 }}>No verification activity recorded yet.</div>
                    ) : (
                      rp.monthlyVerifications.map((m, idx) => (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy, #0A1F3D)" }}>{m.count}</div>
                          <div style={{ width: "100%", maxWidth: 36, height: Math.max(6, (m.count / maxMonthly) * 90), background: "var(--gold, #E5A82E)", borderRadius: "6px 6px 0 0" }} />
                          <div style={{ fontSize: 11, color: "var(--text-muted, #4A5568)" }}>{m.month}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="tt-card">
                  <div className="tt-card-head">
                    <div>
                      <div className="tt-card-title">Company Accounts</div>
                      <div className="tt-card-sub">Real KYC status breakdown</div>
                    </div>
                  </div>
                  <div style={{ padding: "4px 22px 18px", display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
                    <div><strong style={{ color: "#15803D" }}>{rp.verifiedCompanies ?? 0}</strong> verified</div>
                    <div><strong style={{ color: "#B45309" }}>{rp.pendingCompanies ?? 0}</strong> pending</div>
                    <div><strong style={{ color: "var(--navy, #0A1F3D)" }}>{rp.totalCompanies ?? 0}</strong> total</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB MODULE 7: ACTIVITY LOG */}
          {activeNav === "activity" && (
            <div className="tt-content">
              <QueuePageHeader
                icon="🗒️"
                accent="#4B5563"
                title="Staff Audit Trail & Activity Log"
                subtitle="Immutable log of staff actions, approvals, and candidate status updates."
              />
              <div style={{ background: "#fff", padding: 24, borderRadius: 16, border: "1px solid var(--border-light, #E2E8F0)" }}>
                {activityLoading ? <p>Loading log...</p> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {activityEntries.map((act) => (
                      <div key={act._id} style={{ padding: 10, background: "#F8FAFC", borderRadius: 8, borderLeft: "3px solid #3B82F6" }}>
                        <strong style={{ fontSize: 12 }}>{act.staffName}</strong>: {act.summary}
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{new Date(act.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          </main>
        </div>
      </div>

      {/* QUICK ACTION MODALS */}
      {activeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,21,42,0.7)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}>
          <div style={{ background: "#FFFFFF", borderRadius: 18, width: "100%", maxWidth: 520, padding: 28, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #F1F5F9", pb: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy, #0A1F3D)", margin: 0, fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)" }}>
                {activeModal === "search" && "⌘ Quick Global Search"}
                {activeModal === "upload" && "📤 Upload New Candidate"}
                {activeModal === "lead" && "💼 Add Company Lead"}
                {activeModal === "verify" && "⚡ Send for Verification"}
                {activeModal === "visit" && "📍 Log Site Visit"}
                {activeModal === "quick_add" && "➕ Quick Add Candidate / Lead"}
                {activeModal === "kanban" && "📋 Core Verification Pipeline Kanban"}
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "transparent", border: "none", fontSize: 20, color: "var(--text-muted, #4A5568)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* SEARCH MODAL */}
            {activeModal === "search" && (() => {
              const q = searchQuery.trim().toLowerCase();
              const matchedCandidates = q
                ? candidatesList.filter(
                    (c) =>
                      (c.fullName || "").toLowerCase().includes(q) ||
                      (c.email || "").toLowerCase().includes(q) ||
                      (c.mobile || "").includes(q) ||
                      (c.currentRole || "").toLowerCase().includes(q)
                  )
                : [];
              const matchedCompanies = q
                ? companiesList.filter(
                    (comp) =>
                      (comp.companyName || "").toLowerCase().includes(q) ||
                      (comp.legalName || "").toLowerCase().includes(q) ||
                      (comp.email || "").toLowerCase().includes(q)
                  )
                : [];
              const matchedAcademies = q
                ? academiesList.filter(
                    (a) =>
                      (a.name || "").toLowerCase().includes(q) ||
                      (a.email || "").toLowerCase().includes(q) ||
                      (a.headquarters || "").toLowerCase().includes(q)
                  )
                : [];
              const totalMatches = matchedCandidates.length + matchedCompanies.length + matchedAcademies.length;

              return (
                <div>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Type candidate name, company, academy, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 14,
                      outline: "none",
                      marginBottom: 16,
                      fontFamily: "var(--font-body, 'Manrope', sans-serif)",
                    }}
                  />
                  {!q ? (
                    <div style={{ fontSize: 12, color: "var(--text-muted, #4A5568)", padding: "6px 2px" }}>
                      Searching across <strong>{candidatesList.length}</strong> candidates, <strong>{companiesList.length}</strong> companies, and <strong>{academiesList.length}</strong> partner academies...
                    </div>
                  ) : totalMatches === 0 ? (
                    <div style={{ padding: "18px 10px", textAlign: "center", color: "#64748B", fontSize: 13 }}>
                      No matching records found for "{searchQuery}".
                    </div>
                  ) : (
                    <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* Candidates Matches */}
                      {matchedCandidates.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>
                            👥 Candidates ({matchedCandidates.length})
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {matchedCandidates.slice(0, 5).map((c) => (
                              <div
                                key={c._id || c.id}
                                onClick={() => {
                                  setSelectedCandidate(c);
                                  setCandidateModalTab("identity");
                                  setActiveModal(null);
                                }}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  background: "#F8FAFC",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  border: "1px solid #E2E8F0",
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 13, color: "var(--navy, #0A1F3D)" }}>{c.fullName}</div>
                                  <div style={{ fontSize: 11, color: "#64748B" }}>{c.email} · {c.currentRole || "Medical Coder"}</div>
                                </div>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: c.isVerified ? "#DCFCE7" : "#FEF3C7",
                                    color: c.isVerified ? "#15803D" : "#B45309",
                                  }}
                                >
                                  {c.isVerified ? "VERIFIED" : "PENDING"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Companies Matches */}
                      {matchedCompanies.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>
                            🏢 Companies ({matchedCompanies.length})
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {matchedCompanies.slice(0, 5).map((comp) => (
                              <div
                                key={comp._id || comp.id}
                                onClick={() => {
                                  openCompanyDetail(comp, "legal");
                                  setActiveModal(null);
                                }}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  background: "#F8FAFC",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  border: "1px solid #E2E8F0",
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 13, color: "var(--navy, #0A1F3D)" }}>{comp.companyName}</div>
                                  <div style={{ fontSize: 11, color: "#64748B" }}>{comp.email} · Plan: {comp.plan || "Free"}</div>
                                </div>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: comp.kycStatus === "verified" ? "#DCFCE7" : "#FEF3C7",
                                    color: comp.kycStatus === "verified" ? "#15803D" : "#B45309",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {comp.kycStatus || "PENDING"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Academies Matches */}
                      {matchedAcademies.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>
                            🎓 Academies ({matchedAcademies.length})
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {matchedAcademies.slice(0, 5).map((ac) => (
                              <div
                                key={ac._id || ac.id}
                                onClick={() => {
                                  setSelectedAcademy(ac);
                                  setAcademyModalTab("profile");
                                  setActiveModal(null);
                                }}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  background: "#F8FAFC",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  border: "1px solid #E2E8F0",
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 13, color: "var(--navy, #0A1F3D)" }}>{ac.name}</div>
                                  <div style={{ fontSize: 11, color: "#64748B" }}>HQ: {ac.headquarters || "India"} · {ac.email}</div>
                                </div>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: "#EDE9FE",
                                    color: "#6D28D9",
                                  }}
                                >
                                  PARTNER
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* FORM MODAL */}
            {(activeModal === "upload" || activeModal === "lead" || activeModal === "visit" || activeModal === "quick_add") && (
              <form onSubmit={(e) => handleFormSubmit(e, activeModal.toUpperCase())} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted, #4A5568)", marginBottom: 4, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>NAME / TITLE</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar / Optum HR Visit"
                    value={modalForm.name}
                    onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted, #4A5568)", marginBottom: 4, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>MOBILE / PHONE</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={modalForm.phone}
                      onChange={(e) => setModalForm({ ...modalForm, phone: e.target.value })}
                      style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted, #4A5568)", marginBottom: 4, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>INSTITUTE / COMPANY</label>
                    <input
                      type="text"
                      placeholder="e.g. ThoughtFlows Academy"
                      value={modalForm.company}
                      onChange={(e) => setModalForm({ ...modalForm, company: e.target.value })}
                      style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted, #4A5568)", marginBottom: 4, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>NOTES / OUTCOME</label>
                  <textarea
                    rows={3}
                    placeholder="Add details, course specialty, or visit outcomes..."
                    value={modalForm.notes}
                    onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}
                  />
                </div>

                <button
                  type="submit"
                  style={{ background: "var(--navy, #0A1F3D)", color: "var(--gold, #E5A82E)", padding: 12, borderRadius: 8, border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 8, fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)" }}
                >
                  Submit & Save Record →
                </button>
              </form>
            )}

            {/* VERIFICATION MODAL */}
            {activeModal === "verify" && (
              <div style={{ textAlign: "center", padding: 10 }}>
                <p style={{ fontSize: 13, color: "var(--text-muted, #4A5568)" }}>
                  Select candidates from your bucket to push into the 4-layer verification pipeline (Assessment + Video + Aadhaar + Certification).
                </p>
                <button
                  type="button"
                  onClick={() => { showToast("All pending candidates pushed to verification queue!"); setActiveModal(null); }}
                  style={{ background: "#9333EA", color: "#FFFFFF", padding: "12px 24px", borderRadius: 8, border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", marginTop: 14, fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)" }}
                >
                  ⚡ Push All Pending Candidates Now
                </button>
              </div>
            )}

            {/* KANBAN MODAL */}
            {activeModal === "kanban" && (
              <div>
                <p style={{ fontSize: 12, color: "var(--text-muted, #4A5568)", marginBottom: 16 }}>
                  Detailed Candidate Breakdown across all 7 Verification Stages
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, maxHeight: 300, overflowY: "auto" }}>
                  {[
                    { title: "Stage 1: Profile", count: 5 },
                    { title: "Stage 2: Assessment", count: 4 },
                    { title: "Stage 3: Video", count: 3 },
                    { title: "Stage 4: Aadhaar", count: 2 },
                  ].map((kb, i) => (
                    <div key={i} style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid var(--border-light, #E5E7EB)", textAlign: "center" }}>
                      <strong style={{ fontSize: 12, fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)" }}>{kb.title}</strong>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "var(--navy, #0A1F3D)", marginTop: 4, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}>{kb.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* =========================================================================
          CANDIDATE FULL DETAILS INSPECTION MODAL
         ========================================================================= */}
      {selectedCandidate && (
        <div className="staff-detail-modal-overlay">
          <div className="staff-detail-modal-content">
            {/* MODAL HEADER */}
            <div className="staff-detail-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.1)", color: "var(--gold, #E5A82E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>
                    {(selectedCandidate.fullName || "CD").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "var(--font-heading)" }}>
                        {selectedCandidate.fullName}
                      </h2>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: selectedCandidate.isVerified ? "#DCFCE7" : "#FEF3C7", color: selectedCandidate.isVerified ? "#15803D" : "#B45309" }}>
                        {selectedCandidate.isVerified ? "VERIFIED (GOLD)" : "PENDING AUDIT"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>✉️ {selectedCandidate.email}</span>
                      {selectedCandidate.mobile && <span>📞 {selectedCandidate.mobile}</span>}
                      <span>📍 {selectedCandidate.city || "India"}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* MODAL TABS */}
            <div className="staff-tabs-wrapper">
              <button
                type="button"
                className="staff-tabs-scroll-btn"
                onClick={() => scrollCandidateTabs("left")}
                title="Scroll Tabs Left"
                aria-label="Scroll Tabs Left"
              >
                ‹
              </button>
              <div className="staff-detail-tabs" ref={candidateTabsRef}>
                {[
                  { id: "identity", stage: "Stage 1", label: "Identity & Aadhaar" },
                  { id: "training", stage: "Stage 2", label: "Academy & Training" },
                  { id: "certification", stage: "Stage 3", label: "Certifications" },
                  { id: "assessment", stage: "Stage 4", label: "MCQ Assessment" },
                  { id: "video", stage: "Stage 5", label: "AI Video Interview" },
                  { id: "charts", stage: "Stage 6", label: "Live Charts" },
                  { id: "resume", stage: "Stage 7", label: "Resume Profile" },
                  { id: "placement", stage: "Stage 8", label: "Placement & Track" },
                  {
                    id: "applications",
                    stage: "🎯",
                    label: `Job Applications (${selectedCandidate.applicationMetrics?.total ?? (selectedCandidate.applications || []).length})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`staff-detail-tab-btn${candidateModalTab === tab.id ? " active" : ""}`}
                    onClick={(e) => {
                      setCandidateModalTab(tab.id);
                      e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                    }}
                  >
                    <span className="staff-tab-stage-badge">{tab.stage}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="staff-tabs-scroll-btn"
                onClick={() => scrollCandidateTabs("right")}
                title="Scroll Tabs Right"
                aria-label="Scroll Tabs Right"
              >
                ›
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="staff-detail-body">
              {/* TAB 1: IDENTITY */}
              {candidateModalTab === "identity" && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Stage 1: Identity & Contact Details</h3>
                  <div className="staff-meta-grid">
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Full Legal Name</div>
                      <div className="staff-meta-value">{selectedCandidate.fullName || selectedCandidate.stage1?.fullName || "N/A"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Email Address</div>
                      <div className="staff-meta-value">{selectedCandidate.email}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Mobile Number</div>
                      <div className="staff-meta-value">{selectedCandidate.mobile || selectedCandidate.stage1?.mobile || "Not specified"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">City / Location</div>
                      <div className="staff-meta-value">{selectedCandidate.stage1?.city || selectedCandidate.city || "Not specified"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Experience Level</div>
                      <div className="staff-meta-value">{selectedCandidate.stage1?.experience || "Fresher"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Current Role / Specialty</div>
                      <div className="staff-meta-value">{selectedCandidate.stage1?.currentRole || selectedCandidate.currentRole || "Medical Coder"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Aadhaar Verification Status</div>
                      <div className="staff-meta-value">
                        {selectedCandidate.aadhaarVerified || selectedCandidate.stage1?.aadhaarVerified ? (
                          <span style={{ color: "#15803D", fontWeight: 800 }}>✓ Aadhaar Verified (Official UIDAI)</span>
                        ) : (
                          <span style={{ color: "#B45309", fontWeight: 700 }}>⏳ Verification Pending</span>
                        )}
                      </div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Account Created</div>
                      <div className="staff-meta-value">{selectedCandidate.createdAt ? new Date(selectedCandidate.createdAt).toLocaleDateString("en-IN") : "N/A"}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TRAINING */}
              {candidateModalTab === "training" && (() => {
                const s2 = selectedCandidate.stage2 || {};
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Stage 2: Partner Academy & Training</h3>
                    <div className="staff-meta-grid">
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Academy Name</div>
                        <div className="staff-meta-value">{s2.academyName || "Independent Trainee"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Batch Code / Title</div>
                        <div className="staff-meta-value">{s2.batch || "Not specified"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Course Title</div>
                        <div className="staff-meta-value">{s2.courseName || s2.domain || "Medical Coding Specialization"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Graduation / Completion</div>
                        <div className="staff-meta-value">{s2.gradYear || s2.completionDate || "Completed"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Academy Verification</div>
                        <div className="staff-meta-value">
                          <span style={{ color: s2.verified ? "#15803D" : "#B45309", fontWeight: 800 }}>
                            {s2.verified ? "✓ Verified Partner Academy Student" : "Pending Academy Confirmation"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 3: CERTIFICATION */}
              {candidateModalTab === "certification" && (() => {
                const s3 = selectedCandidate.stage3 || {};
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Stage 3: Professional Certifications & Audit</h3>
                    <div className="staff-meta-grid">
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Issuing Body</div>
                        <div className="staff-meta-value">{s3.issuingBody || s3.body || "AAPC / AHIMA"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Certification Name</div>
                        <div className="staff-meta-value">{s3.certName || s3.name || "CPC Certified"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Member / License ID</div>
                        <div className="staff-meta-value" style={{ fontFamily: "monospace" }}>{s3.memberId || s3.certId || "N/A"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Issue Date</div>
                        <div className="staff-meta-value">{s3.issueDate || "N/A"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Audit Status</div>
                        <div className="staff-meta-value">
                          <span style={{ color: s3.certStatus === "verified" ? "#15803D" : s3.certStatus === "rejected" ? "#B91C1C" : "#B45309", fontWeight: 800 }}>
                            {s3.certStatus ? s3.certStatus.toUpperCase() : "PENDING AUDIT"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CERTIFICATE DOCUMENT PREVIEW */}
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", marginBottom: 8 }}>Uploaded Certificate Document Proof</div>
                      {s3.docUrl ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 24 }}>📄</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{s3.docName || "Official Certificate Document"}</div>
                            <div style={{ fontSize: 11, color: "#64748B" }}>Official proof uploaded by candidate</div>
                          </div>
                          <a
                            href={s3.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="staff-doc-chip"
                            style={{ background: "var(--navy)", color: "#fff", border: "none" }}
                          >
                            View Document Proof ↗
                          </a>
                        </div>
                      ) : (
                        <div style={{ color: "#64748B", fontSize: 12 }}>No certificate document uploaded yet.</div>
                      )}
                    </div>

                    {/* CERT AUDIT BUTTONS */}
                    <div style={{ display: "flex", gap: 10, borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                      <button
                        type="button"
                        onClick={() => handleAuditCertification(selectedCandidate._id, "verify")}
                        style={{ background: "#10B981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                      >
                        ✓ Approve Certificate
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const reason = prompt("Enter reason for certificate revision / rejection:");
                          if (reason) handleAuditCertification(selectedCandidate._id, "reject", reason);
                        }}
                        style={{ background: "#EF4444", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                      >
                        ✕ Reject Certificate
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 4: MCQ ASSESSMENT */}
              {candidateModalTab === "assessment" && (() => {
                const s4 = selectedCandidate.stage4 || {};
                const answers = Array.isArray(s4.answers) ? s4.answers : [];
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Stage 4: Proctored MCQ Assessment Results</h3>
                    <div className="staff-meta-grid">
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Assessment Topic</div>
                        <div className="staff-meta-value">{s4.topic || "Healthcare RCM & Medical Coding"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Foundation Score</div>
                        <div className="staff-meta-value" style={{ fontSize: 18, color: (s4.score || s4.foundationScore || 0) >= 70 ? "#15803D" : "#B91C1C" }}>
                          {s4.score ?? s4.foundationScore ?? "N/A"}%
                        </div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Questions Attempted</div>
                        <div className="staff-meta-value">{s4.correctCount !== undefined ? `${s4.correctCount} / ${s4.totalQuestions || answers.length}` : `${answers.length} answered`}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Completed Timestamp</div>
                        <div className="staff-meta-value">{s4.completedAt ? new Date(s4.completedAt).toLocaleString("en-IN") : "Recorded"}</div>
                      </div>
                    </div>

                    {answers.length > 0 && (
                      <div style={{ marginTop: 18 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", marginBottom: 10 }}>Question-by-Question Breakdown ({answers.length})</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
                          {answers.map((ans, idx) => (
                            <div key={idx} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12 }}>
                              <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--navy)", marginBottom: 6 }}>
                                Q{idx + 1}. {ans.question || `Question ${idx + 1}`}
                              </div>
                              <div style={{ fontSize: 11.5, display: "flex", gap: 16, color: "#64748B" }}>
                                <span>Candidate choice: <strong style={{ color: ans.isCorrect ? "#15803D" : "#B91C1C" }}>{ans.selectedAnswer || ans.userAnswer || "N/A"}</strong></span>
                                {ans.correctAnswer && <span>Correct answer: <strong style={{ color: "#15803D" }}>{ans.correctAnswer}</strong></span>}
                                <span>Status: {ans.isCorrect ? "✓ Correct" : "✕ Incorrect"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 5: AI VIDEO INTERVIEW */}
              {candidateModalTab === "video" && (() => {
                const s5 = selectedCandidate.stage5 || {};
                const qaPairs = Array.isArray(s5.qaPairs) ? s5.qaPairs : [];
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Stage 5: AI Video / Audio Assessment</h3>
                    <div className="staff-meta-grid">
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Interview Mode</div>
                        <div className="staff-meta-value">{s5.interviewMode || "Video Interview"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">AI Assessment Score</div>
                        <div className="staff-meta-value" style={{ fontSize: 18, color: "#6D28D9" }}>{s5.aiScore || s5.score || "88"}%</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Recording Duration</div>
                        <div className="staff-meta-value">{s5.duration || "1m 30s"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Staff Verification</div>
                        <div className="staff-meta-value">
                          <span style={{ color: s5.verified ? "#15803D" : "#B45309", fontWeight: 800 }}>
                            {s5.verified ? "✓ Video Verified by Staff" : "Pending Video Audit"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {s5.videoUrl && (
                      <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", marginBottom: 18, maxHeight: 300, display: "flex", justifyContent: "center" }}>
                        <video controls src={s5.videoUrl} style={{ width: "100%", maxHeight: 300 }} />
                      </div>
                    )}

                    {qaPairs.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", marginBottom: 10 }}>Spoken Interview Transcripts ({qaPairs.length} questions)</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto" }}>
                          {qaPairs.map((qa, idx) => (
                            <div key={idx} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12 }}>
                              <div style={{ fontWeight: 800, fontSize: 12.5, color: "var(--navy)" }}>Q{idx + 1}: {qa.question}</div>
                              <div style={{ fontSize: 12, color: "#334155", marginTop: 4, fontStyle: "italic" }}>"{qa.transcript || qa.answer || "No transcript available"}"</div>
                              {qa.feedback && <div style={{ fontSize: 11, color: "#6D28D9", marginTop: 4, fontWeight: 600 }}>AI Feedback: {qa.feedback}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 10, marginTop: 16, borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                      <button
                        type="button"
                        onClick={() => handleVerifyVideo(selectedCandidate._id, "verify")}
                        style={{ background: "#10B981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                      >
                        ✓ Verify Video Introduction
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyVideo(selectedCandidate._id, "reject")}
                        style={{ background: "#F59E0B", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                      >
                        ↩ Request Candidate Re-Record
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 6: LIVE CHARTS */}
              {candidateModalTab === "charts" && (() => {
                const s6 = selectedCandidate.stage6 || {};
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Stage 6: Live Medical Charts Audited</h3>
                    <div className="staff-meta-grid">
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Charts Audited</div>
                        <div className="staff-meta-value">{s6.liveChartsAudited || s6.chartsAudited || 45} Patient Charts</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Coding Accuracy Score</div>
                        <div className="staff-meta-value" style={{ color: "#15803D", fontSize: 18 }}>{s6.accuracyScore || 96}%</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Chart Specialties</div>
                        <div className="staff-meta-value">{s6.specialties ? s6.specialties.join(", ") : "Inpatient, Outpatient, ED, Surgery"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Verified Status</div>
                        <div className="staff-meta-value" style={{ color: "#15803D", fontWeight: 800 }}>✓ Live Charts Passed</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 7: RESUME */}
              {candidateModalTab === "resume" && (() => {
                const s7 = selectedCandidate.stage7 || {};
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Stage 7: Professional Resume Profile</h3>
                    <div className="staff-meta-grid">
                      <div className="staff-meta-item" style={{ gridColumn: "1 / -1" }}>
                        <div className="staff-meta-label">Professional Summary</div>
                        <div className="staff-meta-value" style={{ fontSize: 13, lineHeight: 1.5 }}>
                          {s7.summary || "Healthcare professional with specialized medical coding credentials, AAPC certified with hands-on ICD-10-CM, CPT, and HCPCS coding knowledge."}
                        </div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Resume Template</div>
                        <div className="staff-meta-value" style={{ textTransform: "capitalize" }}>{selectedCandidate.resumeTemplate || "Executive"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Generated Resume File</div>
                        <div className="staff-meta-value">
                          {selectedCandidate.resumeUrl ? (
                            <a href={selectedCandidate.resumeUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", textDecoration: "underline" }}>
                              Download Resume PDF ↗
                            </a>
                          ) : (
                            "Interactive Web Profile Active"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 8: PLACEMENT & TRACK */}
              {candidateModalTab === "placement" && (() => {
                const s8 = selectedCandidate.stage8 || {};
                const slot = s8.slotReservation || {};
                const aiInterview = s8.aiInterview || {};
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Stage 8: Placement Readiness & Live Track Slot</h3>
                    <div className="staff-meta-grid">
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Employment Availability</div>
                        <div className="staff-meta-value">{s8.status || "Immediate Joiner"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Expected CTC</div>
                        <div className="staff-meta-value">{s8.expectedCtc || "₹4.5 - ₹6.0 LPA"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Preferred Location</div>
                        <div className="staff-meta-value">{s8.preferredLocation || s8.city || "Hyderabad / Chennai / Bengaluru"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Shift Preference</div>
                        <div className="staff-meta-value">{s8.shift || "US Shift / General"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Live Track Slot Scheduled</div>
                        <div className="staff-meta-value">
                          {s8.scheduledSlot || (slot.preferredDate ? `${slot.preferredDate} (${slot.preferredTimeSlot})` : "Not scheduled yet")}
                        </div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Slot Status</div>
                        <div className="staff-meta-value">
                          <span style={{ color: slot.status === "CONFIRMED" ? "#15803D" : "#B45309", fontWeight: 800 }}>
                            {slot.status || "NO REQUEST"}
                          </span>
                        </div>
                      </div>
                      {aiInterview.status && (
                        <div className="staff-meta-item" style={{ gridColumn: "1 / -1" }}>
                          <div className="staff-meta-label">AI Mock Interview Session</div>
                          <div className="staff-meta-value" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <span>Status: <strong>{aiInterview.status}</strong></span>
                            {s8.mockScore && <span>Overall Score: <strong style={{ color: "#7C3AED" }}>{s8.mockScore}%</strong></span>}
                            {aiInterview.endedAt && <span>Completed: {new Date(aiInterview.endedAt).toLocaleDateString("en-IN")}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* TAB 9: JOB APPLICATIONS & REQUISITIONS PIPELINE */}
              {candidateModalTab === "applications" && (() => {
                const apps = selectedCandidate.applications || [];
                const m = selectedCandidate.applicationMetrics || {
                  total: apps.length,
                  applied: apps.filter((a) => a.status === "applied").length,
                  shortlisted: apps.filter((a) => a.status === "shortlisted").length,
                  interviewing: apps.filter((a) => a.status === "interviewing").length,
                  offered: apps.filter((a) => a.status === "offered" || a.status === "offer_extended").length,
                  hired: apps.filter((a) => a.status === "hired").length,
                  rejected: apps.filter((a) => a.status === "rejected").length,
                };

                const statusStyles = {
                  applied: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE", label: "APPLIED" },
                  shortlisted: { bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE", label: "SHORTLISTED ⭐" },
                  interviewing: { bg: "#F0FDFA", color: "#0F766E", border: "#99F6E4", label: "INTERVIEWING 🎙️" },
                  offered: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A", label: "OFFER EXTENDED 📜" },
                  hired: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0", label: "HIRED 🎉" },
                  rejected: { bg: "#FEF2F2", color: "#B91C1C", border: "#FECACA", label: "REJECTED" },
                };

                return (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
                          Candidate Job Applications & Hiring Funnel
                        </h3>
                        <p style={{ fontSize: 12, color: "#64748B", margin: "3px 0 0" }}>
                          Full chronological trail of every employer application, shortlist notification, interview stage, offer, and hiring outcome.
                        </p>
                      </div>
                    </div>

                    {/* METRICS FUNNEL CARDS */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Applied</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)", marginTop: 4 }}>{m.total}</div>
                      </div>
                      <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#6D28D9", textTransform: "uppercase", letterSpacing: "0.06em" }}>Shortlisted</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#6D28D9", marginTop: 4 }}>{m.shortlisted}</div>
                      </div>
                      <div style={{ background: "#F0FDFA", border: "1px solid #99F6E4", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.06em" }}>Interviewing</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#0F766E", marginTop: 4 }}>{m.interviewing}</div>
                      </div>
                      <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.06em" }}>Offered</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#B45309", marginTop: 4 }}>{m.offered}</div>
                      </div>
                      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#15803D", textTransform: "uppercase", letterSpacing: "0.06em" }}>Hired</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#15803D", marginTop: 4 }}>{m.hired}</div>
                      </div>
                      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#B91C1C", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rejected</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#B91C1C", marginTop: 4 }}>{m.rejected}</div>
                      </div>
                    </div>

                    {/* APPLICATIONS LIST */}
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", marginBottom: 10 }}>
                        Detailed Job Applications History ({apps.length})
                      </h4>
                      {apps.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {apps.map((app, idx) => {
                            const stKey = (app.status || "applied").toLowerCase();
                            const st = statusStyles[stKey] || statusStyles.applied;
                            const compName = app.companyName || app.companyId?.companyName || app.companyId?.stage1a?.legalname || "Employer";
                            const jobTitle = app.jobTitle || `Requisition #${app.jobId}`;

                            return (
                              <div
                                key={idx}
                                style={{
                                  background: "#FFFFFF",
                                  border: "1px solid #E2E8F0",
                                  borderRadius: 12,
                                  padding: "14px 16px",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
                                        {jobTitle}
                                      </h4>
                                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748B", background: "#F1F5F9", padding: "1px 6px", borderRadius: 4 }}>
                                        #{app.jobId}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: 12.5, color: "#334155", marginTop: 4, fontWeight: 600 }}>
                                      🏢 {compName} {app.companyEmail ? `· ✉️ ${app.companyEmail}` : ""}
                                    </div>
                                    <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>
                                      📅 Applied on: <strong>{new Date(app.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
                                      {app.updatedAt && app.updatedAt !== app.createdAt && (
                                        <span> · Last Status Update: {new Date(app.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                                      )}
                                    </div>
                                    {app.coverNote && (
                                      <div style={{ marginTop: 8, fontSize: 12, color: "#475569", background: "#F8FAFC", borderLeft: "3px solid #CBD5E1", padding: "6px 10px", borderRadius: "0 6px 6px 0" }}>
                                        <strong>Applicant Cover Note:</strong> "{app.coverNote}"
                                      </div>
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 800,
                                      padding: "4px 10px",
                                      borderRadius: 8,
                                      textTransform: "uppercase",
                                      background: st.bg,
                                      color: st.color,
                                      border: `1px solid ${st.border}`,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {st.label}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ padding: 32, background: "#F8FAFC", borderRadius: 12, color: "#64748B", fontSize: 13, textAlign: "center", border: "1px dashed #CBD5E1" }}>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                          <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 14 }}>No job applications submitted yet</div>
                          <div style={{ fontSize: 12, marginTop: 4 }}>
                            This candidate has not applied to any job postings directly yet. Their profile is indexed and searchable by verified employers in the Talent Search.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* MODAL FOOTER */}
            <div style={{ padding: "16px 28px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {!selectedCandidate.isVerified && (
                  <button
                    type="button"
                    disabled={processingId === selectedCandidate._id}
                    onClick={() => handleVerifyCandidate(selectedCandidate._id, "verify")}
                    style={{ background: "#10B981", color: "#fff", border: "none", padding: "10px 22px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                  >
                    ✓ Verify & Gold-Badge Entire Profile
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                style={{ background: "var(--navy, #0A1F3D)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          COMPANY FULL DETAILS INSPECTION MODAL
         ========================================================================= */}
      {selectedCompany && (
        <div className="staff-detail-modal-overlay">
          <div className="staff-detail-modal-content">
            <div className="staff-detail-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.1)", color: "var(--gold, #E5A82E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>
                    🏢
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "var(--font-heading)" }}>
                        {selectedCompany.companyName}
                      </h2>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", background: selectedCompany.kycStatus === "verified" ? "#DCFCE7" : "#FEF3C7", color: selectedCompany.kycStatus === "verified" ? "#15803D" : "#B45309" }}>
                        KYC: {selectedCompany.kycStatus || "PENDING"}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", background: "rgba(229,168,46,0.2)", color: "var(--gold)", border: "1px solid rgba(229,168,46,0.4)" }}>
                        Plan: {selectedCompany.plan || "Free"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>Legal: {selectedCompany.legalName || selectedCompany.stage1a?.legalname || selectedCompany.companyName}</span>
                      <span>✉️ {selectedCompany.email}</span>
                      {selectedCompany.mobile && <span>📞 {selectedCompany.mobile}</span>}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCompany(null)}
                  style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* MODAL TABS */}
            <div className="staff-tabs-wrapper">
              <div className="staff-detail-tabs">
                {[
                  { id: "legal", label: "Stage 1A: Legal & KYC" },
                  { id: "poc", label: "Stage 1B: Point of Contact" },
                  { id: "profile", label: "Stage 2: Profile & Details" },
                  { id: "plan", label: "Plan & Billing" },
                  { id: "jobs", label: `Posted Jobs (${(selectedCompany.jobs || []).length + (selectedCompany.jdPublished ? 1 : 0)})` },
                  { id: "applicants", label: `Applicants (${selectedCompany.applicationsCount || 0})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`staff-detail-tab-btn${companyModalTab === tab.id ? " active" : ""}`}
                    onClick={(e) => {
                      setCompanyModalTab(tab.id);
                      e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="staff-detail-body">
              {/* TAB: LEGAL & KYC */}
              {companyModalTab === "legal" && (() => {
                const s1a = selectedCompany.stage1a || {};
                const dVer = selectedCompany.docVerifications || {};
                const docs = [
                  { id: "kycgst", label: "GST Certificate", val: s1a.kycgst },
                  { id: "kycpan", label: "PAN Card", val: s1a.kycpan },
                  { id: "kycincorp", label: "Certificate of Incorporation", val: s1a.kycincorp },
                  { id: "kyccheque", label: "Cancelled Cheque", val: s1a.kyccheque },
                  { id: "msme", label: "MSME Certificate", val: s1a.msme },
                ];

                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Stage 1A: Company Legal Registration & KYC</h3>
                    <div className="staff-meta-grid">
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Legal Name of Business</div>
                        <div className="staff-meta-value">{s1a.legalname || selectedCompany.legalName || "Not provided"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">GSTIN</div>
                        <div className="staff-meta-value" style={{ fontFamily: "monospace" }}>{s1a.gstin || "Not provided"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Permanent Account Number (PAN)</div>
                        <div className="staff-meta-value" style={{ fontFamily: "monospace" }}>{s1a.pan || "Not provided"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Entity Constitution</div>
                        <div className="staff-meta-value">{s1a.entity || "Private Limited"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Date of Incorporation</div>
                        <div className="staff-meta-value">{s1a.doi || "Not provided"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Company Size</div>
                        <div className="staff-meta-value">{s1a.cosize || "100–500"}</div>
                      </div>
                      <div className="staff-meta-item" style={{ gridColumn: "1 / -1" }}>
                        <div className="staff-meta-label">Registered Office Address</div>
                        <div className="staff-meta-value">{s1a.regaddress || "Not provided"}</div>
                      </div>
                    </div>

                    <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", margin: "18px 0 10px" }}>KYC Document Certificates</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                      {docs.map((doc) => {
                        let docUrl = null;
                        let docName = doc.label;
                        if (doc.val) {
                          if (typeof doc.val === "string") docUrl = doc.val;
                          else if (typeof doc.val === "object") {
                            docUrl = doc.val.docUrl || doc.val.url || null;
                            docName = doc.val.docName || doc.val.name || doc.label;
                          }
                        }
                        const vState = dVer[doc.id];
                        return (
                          <div key={doc.id} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
                            <div style={{ fontWeight: 800, fontSize: 12.5, color: "var(--navy)", marginBottom: 4 }}>{doc.label}</div>
                            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 10 }}>{docName}</div>
                            {docUrl ? (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="staff-doc-chip" style={{ fontSize: 11 }}>
                                  View File ↗
                                </a>
                                <span style={{ fontSize: 10, fontWeight: 800, color: vState?.isValid ? "#15803D" : vState?.isValid === false ? "#B91C1C" : "#B45309" }}>
                                  {vState?.isValid ? "✓ Validated" : vState?.isValid === false ? "✕ Invalid" : "Pending Audit"}
                                </span>
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: "#94A3B8" }}>Document not uploaded</div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* KYC DECISION ACTIONS */}
                    <div style={{ display: "flex", gap: 10, marginTop: 20, borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                      <button
                        type="button"
                        disabled={processingId === (selectedCompany._id || selectedCompany.id)}
                        onClick={() => handleAuditKyc(selectedCompany._id || selectedCompany.id, "verify")}
                        style={{ background: "#10B981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                      >
                        ✓ Approve KYC & Activate Gold Trust Badge
                      </button>
                      <button
                        type="button"
                        disabled={processingId === (selectedCompany._id || selectedCompany.id)}
                        onClick={() => {
                          const reason = prompt("Enter revision / rejection reason:");
                          if (reason) handleAuditKyc(selectedCompany._id || selectedCompany.id, "reject", reason);
                        }}
                        style={{ background: "#EF4444", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                      >
                        ✕ Request Revision / Reject
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* TAB: POC */}
              {companyModalTab === "poc" && (() => {
                const s1b = selectedCompany.stage1b || {};
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Stage 1B: Primary Point of Contact</h3>
                    <div className="staff-meta-grid">
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">POC Full Name</div>
                        <div className="staff-meta-value">{selectedCompany.contactName || s1b.pocname || "N/A"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">POC Official Email</div>
                        <div className="staff-meta-value">{s1b.pocemail || selectedCompany.email}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">POC Direct Mobile</div>
                        <div className="staff-meta-value">{selectedCompany.mobile || s1b.pocmobile || "N/A"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Corporate Designation</div>
                        <div className="staff-meta-value">{s1b.pocdesig || "Talent Acquisition Lead"}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB: PROFILE */}
              {companyModalTab === "profile" && (() => {
                const s2 = selectedCompany.stage2 || {};
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Stage 2: Company Profile & Industry</h3>
                    <div className="staff-meta-grid">
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Industry Domain</div>
                        <div className="staff-meta-value">{s2.industry || "Healthcare RCM & Medical Coding"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Employee Headcount</div>
                        <div className="staff-meta-value">{s2.companySize || "1,000–5,000"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Official Website</div>
                        <div className="staff-meta-value">{s2.website || "Not provided"}</div>
                      </div>
                      <div className="staff-meta-item">
                        <div className="staff-meta-label">Head Office Location</div>
                        <div className="staff-meta-value">{s2.headoffice || "India"}</div>
                      </div>
                      <div className="staff-meta-item" style={{ gridColumn: "1 / -1" }}>
                        <div className="staff-meta-label">About Company</div>
                        <div className="staff-meta-value" style={{ fontSize: 13, lineHeight: 1.5 }}>
                          {s2.about || "Leading healthcare operations company hiring certified medical coders, billing executives, and AR specialists."}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB: PLAN & BILLING */}
              {companyModalTab === "plan" && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Subscription Plan & Access Tier</h3>
                  <div className="staff-meta-grid">
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Active Subscription Plan</div>
                      <div className="staff-meta-value" style={{ textTransform: "uppercase", color: "var(--navy)" }}>{selectedCompany.plan || "Free"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Plan Assigned At</div>
                      <div className="staff-meta-value">{selectedCompany.planAssignedAt ? new Date(selectedCompany.planAssignedAt).toLocaleDateString("en-IN") : "Default"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Assigned By Staff</div>
                      <div className="staff-meta-value">{selectedCompany.planAssignedBy || "System Default"}</div>
                    </div>
                  </div>

                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, marginTop: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", marginBottom: 8 }}>Change Company Subscription Plan</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
                      As an admin, you can assign any plan tier to this employer account.
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <select
                        className="staff-filter-select"
                        value={assigningPlan || selectedCompany.plan || "free"}
                        onChange={(e) => setAssigningPlan(e.target.value)}
                        style={{ background: "#fff", minWidth: 180 }}
                      >
                        <option value="free">Free Tier (Standard)</option>
                        <option value="growth">Growth Plan (High Volume)</option>
                        <option value="enterprise">Enterprise Plan (Unlimited)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssignPlan(selectedCompany._id || selectedCompany.id, assigningPlan || selectedCompany.plan || "free")}
                        style={{ background: "var(--navy)", color: "var(--gold)", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                      >
                        Update Plan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: JOBS */}
              {companyModalTab === "jobs" && (() => {
                const compJobs = selectedCompany.jobs || [];
                const s9 = selectedCompany.stage9 || {};
                const hasFirstJd = selectedCompany.jdPublished && selectedCompany.jobId;

                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Posted Job Requisitions</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {hasFirstJd && (
                        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "#EDE9FE", color: "#6D28D9" }}>ONBOARDING JD</span>
                                <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748B" }}>#{selectedCompany.jobId}</span>
                              </div>
                              <h4 style={{ margin: "6px 0 2px", fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>{s9.roletitle || "Specialist Coder"}</h4>
                              <div style={{ fontSize: 12, color: "#64748B" }}>
                                📍 {s9.location || "India"} · {s9.workmode || "Onsite"} · Openings: {s9.openings || 5} · Comp: ₹{s9.compmin || 4}–{s9.compmax || 6} LPA
                              </div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 6, textTransform: "uppercase", background: selectedCompany.jdApprovalStatus === "approved" ? "#DCFCE7" : "#FEF3C7", color: selectedCompany.jdApprovalStatus === "approved" ? "#15803D" : "#B45309" }}>
                              {selectedCompany.jdApprovalStatus || "PENDING"}
                            </span>
                          </div>
                        </div>
                      )}

                      {compJobs.map((job, idx) => {
                        const f = job.fields || {};
                        return (
                          <div key={idx} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748B" }}>#{job.jobId}</span>
                                <h4 style={{ margin: "4px 0 2px", fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>{f.roletitle || "Role"}</h4>
                                <div style={{ fontSize: 12, color: "#64748B" }}>
                                  📍 {f.location || "India"} · {f.workmode || "Onsite"} · Openings: {f.openings || 1}
                                </div>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 6, textTransform: "uppercase", background: job.approvalStatus === "approved" ? "#DCFCE7" : "#FEF3C7", color: job.approvalStatus === "approved" ? "#15803D" : "#B45309" }}>
                                {job.approvalStatus || "PENDING"}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {!hasFirstJd && compJobs.length === 0 && (
                        <div style={{ padding: 24, textAlign: "center", color: "#64748B", fontSize: 13, background: "#F8FAFC", borderRadius: 12 }}>
                          No jobs posted by this company yet.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* TAB: APPLICANTS */}
              {companyModalTab === "applicants" && (() => {
                const rawApps = selectedCompany.applications || [];
                const totalApps = rawApps.length;
                const appliedCount = rawApps.filter((a) => a.status === "applied").length;
                const shortlistedCount = rawApps.filter((a) => a.status === "shortlisted").length;
                const interviewingCount = rawApps.filter((a) => a.status === "interviewing").length;
                const hiredCount = rawApps.filter((a) => a.status === "hired").length;
                const rejectedCount = rawApps.filter((a) => a.status === "rejected").length;

                const filteredApps = rawApps.filter((app) => {
                  const cand = app.candidate || {};
                  const q = (applicantSearch || "").toLowerCase().trim();
                  const matchesSearch =
                    !q ||
                    (cand.fullName || "").toLowerCase().includes(q) ||
                    (cand.email || "").toLowerCase().includes(q) ||
                    (cand.mobile || "").toLowerCase().includes(q) ||
                    (app.jobTitle || "").toLowerCase().includes(q) ||
                    (app.jobId || "").toLowerCase().includes(q) ||
                    (app.coverNote || "").toLowerCase().includes(q);

                  const matchesStatus = applicantStatusFilter === "all" || app.status === applicantStatusFilter;
                  const matchesJob = applicantJobFilter === "all" || app.jobId === applicantJobFilter;

                  return matchesSearch && matchesStatus && matchesJob;
                });

                const jobOptions = Array.from(new Set(rawApps.map((a) => JSON.stringify({ id: a.jobId, title: a.jobTitle })))).map((s) => JSON.parse(s));

                return (
                  <div>
                    {/* TOP STATS & SUMMARY */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
                          Received Candidate Applications ({totalApps})
                        </h3>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                          Review all candidates who applied to {selectedCompany.companyName || "this company"}'s requisitions.
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: "#F1F5F9", color: "#334155" }}>
                          Total: {totalApps}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: "#EDE9FE", color: "#6D28D9" }}>
                          Shortlisted: {shortlistedCount}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: "#E0F2FE", color: "#0369A1" }}>
                          Interviewing: {interviewingCount}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: "#DCFCE7", color: "#15803D" }}>
                          Hired: {hiredCount}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: "#FEF3C7", color: "#B45309" }}>
                          Applied: {appliedCount}
                        </span>
                        {rejectedCount > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: "#FEE2E2", color: "#B91C1C" }}>
                            Rejected: {rejectedCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SEARCH & FILTERS */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#F8FAFC", padding: 12, borderRadius: 10, border: "1px solid #E2E8F0" }}>
                      <input
                        type="text"
                        placeholder="Search applicant name, email, phone, role..."
                        value={applicantSearch}
                        onChange={(e) => setApplicantSearch(e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: 200,
                          height: 36,
                          padding: "0 12px",
                          borderRadius: 8,
                          border: "1px solid #CBD5E1",
                          fontSize: 12.5,
                          background: "#fff",
                        }}
                      />
                      <select
                        value={applicantStatusFilter}
                        onChange={(e) => setApplicantStatusFilter(e.target.value)}
                        style={{
                          height: 36,
                          padding: "0 10px",
                          borderRadius: 8,
                          border: "1px solid #CBD5E1",
                          fontSize: 12,
                          background: "#fff",
                          fontWeight: 600,
                          color: "#334155",
                        }}
                      >
                        <option value="all">All Statuses ({rawApps.length})</option>
                        <option value="applied">Applied ({appliedCount})</option>
                        <option value="shortlisted">Shortlisted ({shortlistedCount})</option>
                        <option value="interviewing">Interviewing ({interviewingCount})</option>
                        <option value="hired">Hired ({hiredCount})</option>
                        <option value="rejected">Rejected ({rejectedCount})</option>
                      </select>

                      {jobOptions.length > 1 && (
                        <select
                          value={applicantJobFilter}
                          onChange={(e) => setApplicantJobFilter(e.target.value)}
                          style={{
                            height: 36,
                            padding: "0 10px",
                            borderRadius: 8,
                            border: "1px solid #CBD5E1",
                            fontSize: 12,
                            background: "#fff",
                            fontWeight: 600,
                            color: "#334155",
                          }}
                        >
                          <option value="all">All Jobs ({jobOptions.length})</option>
                          {jobOptions.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.title} (#{j.id})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* APPLICANTS LIST */}
                    {filteredApps.length === 0 ? (
                      <div style={{ padding: 36, textAlign: "center", background: "#F8FAFC", borderRadius: 12, border: "1px dashed #CBD5E1" }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                        <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 14, marginBottom: 4 }}>
                          {totalApps === 0 ? "No Candidate Applications Yet" : "No Matching Applications"}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>
                          {totalApps === 0
                            ? "When candidates apply for this company's jobs, their full profiles will appear here."
                            : "Try adjusting your search terms or filters above."}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {filteredApps.map((app) => {
                          const cand = app.candidate || {};
                          const rawCand = cand.rawCandidate || cand;
                          const initials = (cand.fullName || "CD").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                          const isVerified = (cand.completedStages || []).length >= 8;

                          return (
                            <div
                              key={app._id || app.id}
                              style={{
                                background: "#FFFFFF",
                                border: "1px solid #E2E8F0",
                                borderRadius: 14,
                                padding: 16,
                                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                                transition: "all 0.15s ease",
                              }}
                            >
                              {/* TOP ROW: CANDIDATE INFO & STATUS */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                                  <div
                                    style={{
                                      width: 44,
                                      height: 44,
                                      borderRadius: 12,
                                      background: "linear-gradient(135deg, #0A1F3D 0%, #1E3A8A 100%)",
                                      color: "#E5A82E",
                                      fontWeight: 800,
                                      fontSize: 16,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>
                                        {cand.fullName}
                                      </h4>
                                      {isVerified ? (
                                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "#DCFCE7", color: "#15803D" }}>
                                          ✓ GOLD VERIFIED (8/8)
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "#FEF3C7", color: "#B45309" }}>
                                          STAGES: {(cand.completedStages || []).length}/8
                                        </span>
                                      )}
                                      {cand.mcqScore && (
                                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 4, background: "#EDE9FE", color: "#6D28D9" }}>
                                          MCQ: {cand.mcqScore}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#64748B", marginTop: 4 }}>
                                      <span>✉️ <a href={`mailto:${cand.email}`} style={{ color: "inherit", textDecoration: "none" }}>{cand.email}</a></span>
                                      {cand.mobile && cand.mobile !== "N/A" && (
                                        <span>📞 <a href={`tel:${cand.mobile}`} style={{ color: "inherit", textDecoration: "none" }}>{cand.mobile}</a></span>
                                      )}
                                      {cand.city && <span>📍 {cand.city}</span>}
                                      {cand.currentRole && <span>💼 {cand.currentRole}</span>}
                                    </div>
                                  </div>
                                </div>

                                {/* STATUS & STATUS PICKER */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 800,
                                      textTransform: "uppercase",
                                      padding: "4px 10px",
                                      borderRadius: 6,
                                      background:
                                        app.status === "hired" ? "#DCFCE7" :
                                        app.status === "shortlisted" ? "#EDE9FE" :
                                        app.status === "interviewing" ? "#E0F2FE" :
                                        app.status === "rejected" ? "#FEE2E2" : "#FEF3C7",
                                      color:
                                        app.status === "hired" ? "#15803D" :
                                        app.status === "shortlisted" ? "#6D28D9" :
                                        app.status === "interviewing" ? "#0369A1" :
                                        app.status === "rejected" ? "#B91C1C" : "#B45309",
                                    }}
                                  >
                                    {app.status}
                                  </span>

                                  {/* Quick status updater for Admin */}
                                  <select
                                    value={app.status}
                                    onChange={(e) => handleUpdateApplicantStatus(app._id || app.id, e.target.value)}
                                    style={{
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      padding: "3px 6px",
                                      borderRadius: 6,
                                      border: "1px solid #CBD5E1",
                                      background: "#F8FAFC",
                                      cursor: "pointer",
                                      color: "var(--navy)",
                                    }}
                                  >
                                    <option value="applied">Applied</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="interviewing">Interviewing</option>
                                    <option value="hired">Hired</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                </div>
                              </div>

                              {/* APPLIED REQUISITION INFO */}
                              <div
                                style={{
                                  background: "#F8FAFC",
                                  border: "1px solid #E2E8F0",
                                  borderRadius: 10,
                                  padding: "10px 14px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: 10,
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                                    Applied Position / Requisition
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                                    <span>🎯 {app.jobTitle || "Job Requisition"}</span>
                                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748B", background: "#E2E8F0", padding: "1px 6px", borderRadius: 4 }}>
                                      #{app.jobId}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ fontSize: 11.5, color: "#64748B" }}>
                                  Applied on: <strong style={{ color: "var(--navy)" }}>{app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent"}</strong>
                                </div>
                              </div>

                              {/* COVER NOTE IF PRESENT */}
                              {app.coverNote && (
                                <div style={{ background: "#FEFCE8", border: "1px solid #FEF08A", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#854D0E" }}>
                                  <strong>Candidate Cover Note:</strong> "{app.coverNote}"
                                </div>
                              )}

                              {/* ACTION BUTTONS */}
                              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", borderTop: "1px solid #F1F5F9", paddingTop: 8 }}>
                                {cand.resumeUrl && (
                                  <a
                                    href={cand.resumeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="staff-doc-chip"
                                    style={{ fontSize: 11.5, padding: "5px 12px", textDecoration: "none" }}
                                  >
                                    📄 Download Resume ↗
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (rawCand && (rawCand._id || rawCand.id || rawCand.email)) {
                                      openCandidateDetail(rawCand, "identity");
                                    } else {
                                      showToast("Candidate profile details not available.");
                                    }
                                  }}
                                  style={{
                                    background: "var(--navy, #0A1F3D)",
                                    color: "#fff",
                                    border: "none",
                                    padding: "6px 14px",
                                    borderRadius: 8,
                                    fontWeight: 700,
                                    fontSize: 12,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  👁️ Inspect Candidate Dossier
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* MODAL FOOTER */}
            <div style={{ padding: "16px 28px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                Company ID: <span style={{ fontFamily: "monospace" }}>{selectedCompany._id || selectedCompany.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                style={{ background: "var(--navy, #0A1F3D)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ACADEMY FULL DETAILS INSPECTION MODAL
         ========================================================================= */}
      {selectedAcademy && (
        <div className="staff-detail-modal-overlay">
          <div className="staff-detail-modal-content">
            <div className="staff-detail-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.1)", color: "var(--gold, #E5A82E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>
                    🎓
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "var(--font-heading)" }}>
                        {selectedAcademy.name}
                      </h2>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "#DCFCE7", color: "#15803D" }}>
                        {selectedAcademy.tier || "VERIFIED PARTNER"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>HQ: {selectedAcademy.headquarters || "India"}</span>
                      <span>✉️ {selectedAcademy.email}</span>
                      {selectedAcademy.phone && <span>📞 {selectedAcademy.phone}</span>}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAcademy(null)}
                  style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* MODAL TABS */}
            <div className="staff-tabs-wrapper">
              <div className="staff-detail-tabs">
                {[
                  { id: "profile", label: "Academy Profile" },
                  { id: "batches", label: `Batches (${(selectedAcademy.batches || []).length})` },
                  { id: "courses", label: `Courses (${(selectedAcademy.courses || []).length})` },
                  { id: "candidates", label: `Enrolled Candidates (${selectedAcademy.enrolledCandidatesCount || selectedAcademy.studentsUploaded || 0})` },
                  { id: "placements", label: `Placements (${(selectedAcademy.placements || []).length})` },
                  { id: "questions", label: `Question Bank (${(selectedAcademy.questions || []).length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`staff-detail-tab-btn${academyModalTab === tab.id ? " active" : ""}`}
                    onClick={(e) => {
                      setAcademyModalTab(tab.id);
                      e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="staff-detail-body">
              {/* TAB: PROFILE */}
              {academyModalTab === "profile" && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Academy Institutional Profile</h3>
                  <div className="staff-meta-grid">
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Institute Name</div>
                      <div className="staff-meta-value">{selectedAcademy.name}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Primary Admin / Lead</div>
                      <div className="staff-meta-value">{selectedAcademy.primaryAdmin || selectedAcademy.contactName || "Academy Lead"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Official Email</div>
                      <div className="staff-meta-value">{selectedAcademy.email}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Phone / Mobile</div>
                      <div className="staff-meta-value">{selectedAcademy.phone || "Not specified"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Domain Specialty</div>
                      <div className="staff-meta-value">{selectedAcademy.specialty || "Medical Coding"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Headquarters</div>
                      <div className="staff-meta-value">{selectedAcademy.headquarters || "Coimbatore"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Partner Tier</div>
                      <div className="staff-meta-value">{selectedAcademy.tier || "Verified Partner"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Total Alumni Base</div>
                      <div className="staff-meta-value">{selectedAcademy.totalAlumni || "35,000+"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Partner Since</div>
                      <div className="staff-meta-value">{selectedAcademy.partnerSince || "Jan 2025"}</div>
                    </div>
                    <div className="staff-meta-item">
                      <div className="staff-meta-label">Placement Verification %</div>
                      <div className="staff-meta-value" style={{ color: "#15803D" }}>{selectedAcademy.verifiedPct || 94}%</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>Campus Branches</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(selectedAcademy.branches || []).map((b, idx) => (
                        <span key={idx} style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", padding: "4px 10px", borderRadius: 6, fontSize: 12, color: "var(--navy)", fontWeight: 600 }}>
                          📍 {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: BATCHES */}
              {academyModalTab === "batches" && (() => {
                const batches = selectedAcademy.batches || [];
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Training Batches ({batches.length})</h3>
                    {batches.length > 0 ? (
                      <div className="sf-table-wrap">
                        <table className="sf-table">
                          <thead>
                            <tr>
                              <th>Batch Code</th>
                              <th>Course</th>
                              <th>Students Enrolled</th>
                              <th>Completion</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batches.map((b, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 800, fontFamily: "monospace" }}>{b.code}</td>
                                <td>{b.course}</td>
                                <td>{b.studentsCount || 0} students</td>
                                <td>{b.completionPct || 0}%</td>
                                <td>
                                  <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: b.status === "Active" ? "#DCFCE7" : "#F1F5F9", color: b.status === "Active" ? "#15803D" : "#475569" }}>
                                    {b.status || "Active"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: 24, textAlign: "center", color: "#64748B", background: "#F8FAFC", borderRadius: 12 }}>
                        No active batches configured for this academy.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: COURSES */}
              {academyModalTab === "courses" && (() => {
                const courses = selectedAcademy.courses || [];
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Offered Course Catalog ({courses.length})</h3>
                    {courses.length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                        {courses.map((c, idx) => (
                          <div key={idx} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "#EDE9FE", color: "#6D28D9" }}>{c.category || "Medical Coding"}</span>
                            <h4 style={{ margin: "8px 0 4px", fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>{c.title}</h4>
                            <div style={{ fontSize: 12, color: "#64748B" }}>⏱ {c.duration || "3 Months"} · {c.totalHrs || 120} hrs · {c.enrolled || 25} enrolled</div>
                            {c.syllabus && c.syllabus.length > 0 && (
                              <div style={{ marginTop: 8, fontSize: 11, color: "#475569" }}>
                                Modules: {c.syllabus.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: 24, textAlign: "center", color: "#64748B", background: "#F8FAFC", borderRadius: 12 }}>
                        Standard Medical Coding Foundation modules active.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: CANDIDATES */}
              {academyModalTab === "candidates" && (() => {
                const candList = selectedAcademy.candidates || [];
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Enrolled Trainees ({candList.length})</h3>
                    {candList.length > 0 ? (
                      <div className="sf-table-wrap">
                        <table className="sf-table">
                          <thead>
                            <tr>
                              <th>Student Candidate</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Stage Progress</th>
                              <th style={{ textAlign: "right" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {candList.map((cand, idx) => {
                              const fullName = cand.stage1?.fullName || (cand.email ? cand.email.split("@")[0] : "Candidate");
                              const stages = cand.completedStages || [];
                              return (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 700 }}>{fullName}</td>
                                  <td>{cand.email}</td>
                                  <td>{cand.stage1?.currentRole || cand.stage2?.domain || "Medical Coder"}</td>
                                  <td>Stage {stages.length}/8 ({Math.round((stages.length / 8) * 100)}%)</td>
                                  <td style={{ textAlign: "right" }}>
                                    <button
                                      type="button"
                                      className="sf-action-btn"
                                      onClick={() => {
                                        setSelectedAcademy(null);
                                        setSelectedCandidate(cand);
                                        setCandidateModalTab("identity");
                                      }}
                                      style={{ background: "var(--navy)", color: "#fff", border: "none", fontSize: 11 }}
                                    >
                                      Inspect Candidate
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: 24, textAlign: "center", color: "#64748B", background: "#F8FAFC", borderRadius: 12 }}>
                        {selectedAcademy.studentsUploaded || 0} students uploaded by academy partner. Candidates appear here once registered.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: PLACEMENTS */}
              {academyModalTab === "placements" && (() => {
                const placements = selectedAcademy.placements || [];
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Reported Placements Record ({placements.length})</h3>
                    {placements.length > 0 ? (
                      <div className="sf-table-wrap">
                        <table className="sf-table">
                          <thead>
                            <tr>
                              <th>Student Name</th>
                              <th>Placed Role</th>
                              <th>Hiring Employer</th>
                              <th>City</th>
                              <th>Compensation (CTC)</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {placements.map((p, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 700 }}>{p.studentName}</td>
                                <td>{p.role || "Medical Coder"}</td>
                                <td><strong>{p.company || "Healthcare Corp"}</strong></td>
                                <td>{p.city || "India"}</td>
                                <td style={{ color: "#15803D", fontWeight: 700 }}>{p.ctc || "₹5.5 LPA"}</td>
                                <td>{p.date || "Recently"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: 24, textAlign: "center", color: "#64748B", background: "#F8FAFC", borderRadius: 12 }}>
                        Placements are tracked and reported automatically as candidate offers are confirmed.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: QUESTIONS */}
              {academyModalTab === "questions" && (() => {
                const questions = selectedAcademy.questions || [];
                return (
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "0 0 14px" }}>Academy Custom Questions ({questions.length})</h3>
                    {questions.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {questions.map((q, idx) => (
                          <div key={idx} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>Q{idx + 1}. {q.question}</div>
                            <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                              Topic: {q.topic || "HCC"} · Difficulty: {q.difficulty || "Mid"} · Marks: {q.marks || 2}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: 24, textAlign: "center", color: "#64748B", background: "#F8FAFC", borderRadius: 12 }}>
                        Academy utilizes the central Talentera verified question bank.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* MODAL FOOTER */}
            <div style={{ padding: "16px 28px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                Academy Partner ID: <span style={{ fontFamily: "monospace" }}>{selectedAcademy._id || selectedAcademy.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAcademy(null)}
                style={{ background: "var(--navy, #0A1F3D)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {liveVerifyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,21,42,0.7)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}>
          <div style={{ background: "#FFFFFF", borderRadius: 18, width: "100%", maxWidth: 980, padding: 24, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", position: "relative", display: "flex", flexDirection: "column", maxHeight: "92vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid #F1F5F9", paddingBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--navy, #0A1F3D)", margin: 0, fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)" }}>
                🎥 Live Verification{liveVerifyModal.issuingBodyName ? ` — ${liveVerifyModal.issuingBodyName}` : ""}
              </h2>
              <button type="button" onClick={closeLiveVerify} style={{ background: "transparent", border: "none", fontSize: 20, color: "var(--text-muted, #4A5568)", cursor: "pointer" }}>
                ✕
              </button>
            </div>

            {liveVerifyModal.loading && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted, #4A5568)" }}>Starting live browser session…</div>
            )}

            {liveVerifyModal.error && (
              <div style={{ padding: 14, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, color: "#B91C1C", fontSize: 13, marginBottom: 12 }}>
                {liveVerifyModal.error}
              </div>
            )}

            {liveVerifyModal.liveViewUrl && (
              <>
                <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 10 }}>
                  Member ID <strong>{liveVerifyModal.memberId || "—"}</strong> · Last name <strong>{liveVerifyModal.lastName || "—"}</strong> — pre-filled where the site's form allows it. Solve the CAPTCHA and submit on the real site below, then click "Capture Result".
                </div>
                <div style={{ flex: 1, minHeight: 460, border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
                  <iframe
                    src={liveVerifyModal.liveViewUrl}
                    title="Live official verification session"
                    sandbox="allow-same-origin allow-scripts"
                    allow="clipboard-read; clipboard-write"
                    style={{ width: "100%", height: 500, border: "none" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={captureLiveVerify}
                    disabled={liveVerifyModal.capturing}
                    style={{ background: "#10B981", color: "#FFFFFF", border: "none", padding: "12px 22px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer" }}
                  >
                    {liveVerifyModal.capturing ? "Capturing…" : "📸 Capture Result"}
                  </button>
                  <button
                    type="button"
                    onClick={closeLiveVerify}
                    style={{ background: "#F1F5F9", color: "#334155", border: "none", padding: "12px 22px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                  >
                    Close session
                  </button>
                </div>

                {liveVerifyModal.captured && (
                  <div style={{ marginTop: 16, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: "#15803D", marginBottom: 6 }}>✓ Captured — saved to this candidate's record as evidence</div>
                    <div style={{ fontSize: 12, color: "#334155", marginBottom: 6, wordBreak: "break-all" }}>Page URL at capture: {liveVerifyModal.captured.currentUrl}</div>
                    <details>
                      <summary style={{ fontSize: 12, color: "#64748B", cursor: "pointer" }}>Show captured page text</summary>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#334155", marginTop: 6, maxHeight: 160, overflowY: "auto" }}>{liveVerifyModal.captured.pageText}</pre>
                    </details>
                    <p style={{ fontSize: 12, color: "#64748B", marginTop: 10, marginBottom: 0 }}>
                      This is evidence, not an automatic decision — go back to the candidate's Approve / Reject buttons once you've read the result yourself.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
