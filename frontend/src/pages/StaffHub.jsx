import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { safeJson } from "../utils/safeJson.js";

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
  return String(val);
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

// Department directory shown behind the sidebar's "6 Departments" nav items.
// Talentera doesn't have a departments/teams API yet, so this is an
// illustrative snapshot (clearly placeholder headcounts/rosters) rather than
// live data — a reasonable stand-in until a real directory endpoint exists.
const DEPARTMENTS = {
  dept_candidate_acquisition: {
    icon: "👥", title: "Candidate Acquisition", isMine: true,
    description: "Sources candidates from partner academies, colleges, walk-ins, and referrals, then onboards their profiles into the verification pipeline. Anita's own team.",
    heroLabel: "Team Size", heroValue: "6", heroUnit: "people",
    stats: [
      { label: "Team Size", value: "6", icon: "userPlus", cls: "tt-kpi-1" },
      { label: "Profiles / Day (Team)", value: "94", icon: "zap", cls: "tt-kpi-2" },
      { label: "Avg. Time to Verify", value: "2.3 days", icon: "clock", cls: "tt-kpi-3" },
    ],
    team: [
      { name: "Anita Reddy", role: "Sr. Acquisition Executive · Hyderabad", initials: "AR", isMe: true },
      { name: "Suresh Kumar", role: "Acquisition Executive · Chennai", initials: "SK" },
      { name: "Priya Menon", role: "Acquisition Executive · Coimbatore", initials: "PM" },
      { name: "Rajesh Iyer", role: "Acquisition Executive · Vizag", initials: "RI" },
      { name: "Kavya S.", role: "Acquisition Executive · Bangalore", initials: "KS" },
    ],
    actions: [
      { title: "Message Team", desc: "Ping the whole Candidate Acquisition group.", icon: "message", cls: "sf-a1" },
      { title: "Weekly Standup Notes", desc: "Review this week's targets and blockers.", icon: "doc", cls: "sf-a2" },
      { title: "View Full Directory", desc: "See every acquisition executive across all cities.", icon: "userPlus", cls: "sf-a3" },
    ],
  },
  dept_company_relations: {
    icon: "🏢", title: "Company Relations",
    description: "Owns hiring-company relationships: onboarding new employers, KYC follow-up, and matching verified candidates to open roles.",
    heroLabel: "Active Companies", heroValue: "68", heroUnit: "on platform",
    stats: [
      { label: "Active Companies", value: "68", icon: "buildingGrid", cls: "tt-kpi-1" },
      { label: "Open Roles", value: "142", icon: "briefcase", cls: "tt-kpi-2" },
      { label: "Avg. Response Time", value: "4h", icon: "clock", cls: "tt-kpi-3" },
    ],
    team: [
      { name: "Meera Krishnan", role: "Company Relations Lead · Chennai", initials: "MK" },
      { name: "Arjun Nair", role: "Account Manager · Bangalore", initials: "AN" },
      { name: "Divya Shah", role: "Account Manager · Mumbai", initials: "DS" },
    ],
    actions: [
      { title: "Message Team", desc: "Ping the Company Relations group.", icon: "message", cls: "sf-a1" },
      { title: "Company Directory", desc: "Browse active hiring companies and their KYC status.", icon: "buildingGrid", cls: "sf-a2" },
    ],
  },
  dept_mapping_engine: {
    icon: "🔄", title: "Mapping Engine",
    description: "Maintains the matching logic that pairs verified candidates with company job requisitions by specialty, certification, location, and score.",
    heroLabel: "Match Accuracy", heroValue: "88", heroUnit: "%",
    stats: [
      { label: "Matches / Week", value: "310", icon: "zap", cls: "tt-kpi-1" },
      { label: "Match Accuracy", value: "88%", icon: "shieldCheck", cls: "tt-kpi-2" },
      { label: "Rules in Production", value: "42", icon: "settingsGear", cls: "tt-kpi-3" },
    ],
    team: [
      { name: "Karthik Subramaniam", role: "Mapping Engine Lead", initials: "KS" },
      { name: "Fatima Sheikh", role: "Ops Analyst", initials: "FS" },
    ],
    actions: [
      { title: "Message Team", desc: "Ping the Mapping Engine group.", icon: "message", cls: "sf-a1" },
      { title: "Matching Rules", desc: "Review the active specialty / score matching rules.", icon: "settingsGear", cls: "sf-a2" },
    ],
  },
  dept_assessment_video: {
    icon: "🎥", title: "Assessment + Video",
    description: "Reviews text assessments and video introductions flagged by the AI grading pipeline, and maintains the interview question bank.",
    heroLabel: "In Review Today", heroValue: "12", heroUnit: "items",
    stats: [
      { label: "In Review Today", value: "12", icon: "video", cls: "tt-kpi-1" },
      { label: "Avg. Turnaround", value: "6h", icon: "clock", cls: "tt-kpi-2" },
      { label: "Question Bank Size", value: "180", icon: "mic", cls: "tt-kpi-3" },
    ],
    team: [
      { name: "Sanjay Verma", role: "Assessment Lead", initials: "SV" },
      { name: "Neha Kapoor", role: "Video Reviewer", initials: "NK" },
      { name: "Ravi Teja", role: "Video Reviewer", initials: "RT" },
    ],
    actions: [
      { title: "Message Team", desc: "Ping the Assessment + Video group.", icon: "message", cls: "sf-a1" },
      { title: "Question Bank", desc: "Open the interview question bank.", icon: "mic", cls: "sf-a2", modalNav: "questions" },
    ],
  },
  dept_crm_data: {
    icon: "📈", title: "CRM + Data",
    description: "Keeps candidate and company records clean, monitors pipeline data quality, and builds the operational reports leadership reviews weekly.",
    heroLabel: "Data Quality Score", heroValue: "96", heroUnit: "%",
    stats: [
      { label: "Records Synced Today", value: "1,204", icon: "database", cls: "tt-kpi-1" },
      { label: "Data Quality Score", value: "96%", icon: "shieldCheck", cls: "tt-kpi-2" },
      { label: "Open Data Tickets", value: "5", icon: "alertTriangle", cls: "tt-kpi-3" },
    ],
    team: [
      { name: "Ananya Rao", role: "Data Lead", initials: "AR" },
      { name: "Vishal Mehta", role: "CRM Analyst", initials: "VM" },
    ],
    actions: [
      { title: "Message Team", desc: "Ping the CRM + Data group.", icon: "message", cls: "sf-a1" },
      { title: "Reports & Metrics", desc: "Open the operations analytics dashboard.", icon: "chartBar", cls: "sf-a2", modalNav: "reports" },
    ],
  },
  dept_success_revenue: {
    icon: "💰", title: "Success + Revenue",
    description: "Closes placements, manages commission payouts to acquisition staff, and tracks month-over-month revenue from successful hires.",
    heroLabel: "Revenue MTD", heroValue: "₹18.4L", heroUnit: "",
    stats: [
      { label: "Placements This Month", value: "37", icon: "award", cls: "tt-kpi-1" },
      { label: "Revenue MTD", value: "₹18.4L", icon: "trendingUp", cls: "tt-kpi-2" },
      { label: "Avg. Days to Close", value: "11", icon: "clock", cls: "tt-kpi-3" },
    ],
    team: [
      { name: "Ishaan Malhotra", role: "Success + Revenue Lead", initials: "IM" },
      { name: "Pooja Desai", role: "Placement Coordinator", initials: "PD" },
    ],
    actions: [
      { title: "Message Team", desc: "Ping the Success + Revenue group.", icon: "message", cls: "sf-a1" },
      { title: "Commission Report", desc: "View this month's payout breakdown.", icon: "award", cls: "sf-a2" },
    ],
  },
};

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
  const [partnerBucket, setPartnerBucket] = useState([
    { id: "p1", avatar: "AS", name: "Ananya Sharma", academy: "Apex Medical Coding Institute", specialty: "Senior AR Caller", cert: "CPC Certified (AAPC)", location: "Bengaluru", time: "10 min ago" },
    { id: "p2", avatar: "RK", name: "Rajesh Kumar", academy: "MedCode Academy", specialty: "Medical Coder", cert: "CPC-A", location: "Hyderabad", time: "25 min ago" },
    { id: "p3", avatar: "PN", name: "Priya Nair", academy: "National Health Training Inst.", specialty: "Denial Management Lead", cert: "CCS-P Certified", location: "Chennai", time: "40 min ago" },
  ]);

  const [todayTasksList, setTodayTasksList] = useState([
    { id: "t1", time: "11:00 AM", title: "Visit Apex Medical Coding Institute (Bengaluru)", detail: "Pick up new batch resumes • Bhanu", priority: "HIGH", color: "#EF4444", completed: false },
    { id: "t2", time: "2:00 PM", title: "Call Optum HR - Siddharth Rao", detail: "5 verified candidates ready • Sr Coder role", priority: "HIGH", color: "#EF4444", completed: false },
    { id: "t3", time: "3:30 PM", title: "Follow-up : 5 pending Aadhaar verifications", detail: "Push to verification team", priority: "MED", color: "#F59E0B", completed: false },
    { id: "t4", time: "5:00 PM", title: "Schedule mock interview - Vikram Singh", detail: "For Optum 2nd round", priority: "MED", color: "#F59E0B", completed: false },
    { id: "t5", time: "6:00 PM", title: "Daily report submission", detail: "KPI sheet to Department Lead", priority: "LOW", color: "#2563EB", completed: false },
  ]);

  const [recentUploadsList, setRecentUploadsList] = useState([
    { id: "u1", avatar: "AS", name: "Ananya Sharma", timeAgo: "1 hr ago", source: "Apex Medical Coding Institute", specialty: "Senior AR Caller", stage: "VERIFIED", stageColor: "#15803D", stageBg: "#DCFCE7" },
    { id: "u2", avatar: "RK", name: "Rajesh Kumar", timeAgo: "2 hrs ago", source: "MedCode Academy", specialty: "Medical Coder", stage: "IN ASSESSMENT", stageColor: "#B45309", stageBg: "#FEF3C7" },
    { id: "u3", avatar: "PN", name: "Priya Nair", timeAgo: "3 hrs ago", source: "National Health Training Inst.", specialty: "Denial Management", stage: "VERIFIED", stageColor: "#15803D", stageBg: "#DCFCE7" },
    { id: "u4", avatar: "VS", name: "Vikram Singh", timeAgo: "4 hrs ago", source: "Walk-in (Delhi NCR)", specialty: "Trainee AR Executive", stage: "IN ASSESSMENT", stageColor: "#B45309", stageBg: "#FEF3C7" },
    { id: "u5", avatar: "KR", name: "Kavita Reddy", timeAgo: "1 day ago", source: "Apex Medical Coding Institute", specialty: "Payment Posting", stage: "VERIFIED", stageColor: "#15803D", stageBg: "#DCFCE7" },
    { id: "u6", avatar: "SM", name: "Sanjay Mehta", timeAgo: "1 day ago", source: "Apex Medical Coding Institute", specialty: "Junior Medical Coder", stage: "PROFILE PENDING", stageColor: "#475569", stageBg: "#F1F5F9" },
  ]);

  const [activeModal, setActiveModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [modalForm, setModalForm] = useState({ name: "", email: "", phone: "", role: "", company: "", notes: "" });

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
  }, []);

  useEffect(() => {
    if (activeNav === "activity" && !activityLoaded) {
      fetchActivityLog(1);
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
      if (data?.incomingBucket && Array.isArray(data.incomingBucket) && data.incomingBucket.length > 0) {
        setPartnerBucket(data.incomingBucket.slice(0, 5));
        setRecentUploadsList(data.incomingBucket.map((c) => ({
          id: c.id,
          avatar: c.avatar || "CD",
          name: c.name || "Candidate",
          timeAgo: c.time || "Recently",
          source: c.academy || "Apex Medical Coding Institute",
          specialty: c.specialty || "Medical Coding",
          stage: c.stage || "PROFILE PENDING",
          stageColor: c.stageColor || "#475569",
          stageBg: c.stageBg || "#F1F5F9",
        })));
      }
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
      const res = await fetch("/api/staff/audit-job", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ jobId: job.id, decision }),
      });
      if (res.ok) {
        setJobAuditModal(null);
        fetchDashboard();
        showToast("Job approval status updated.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-body, 'Manrope', sans-serif)", color: "var(--navy, #0A1F3D)" }}>Loading Talentera Operations Console...</div>;

  const { companyKycQueue, certificationQueue, jobApprovalQueue } = dashData || {};

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
      <div style={{ background: "#FFFFFF", borderRadius: 18, border: "1px solid var(--border-light, #E2E8F0)", padding: "20px 24px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
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
            <img className="staff-sidebar-logo" src="/logo.png" alt="Talentera" />
            <div>
              <div className="staff-sidebar-wordmark">TALENT<span className="gold">ERA</span></div>
              <div className="staff-sidebar-tag">STAFF OPERATIONS</div>
            </div>
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
                Dashboard
              </button>
              <button type="button" className={`staff-nav-item${activeNav === "my_tasks" ? " active" : ""}`} onClick={() => setActiveNav("my_tasks")}>
                <Icon name="checklist" size={18} style={{ color: "inherit" }} />
                My Tasks
                <span className="staff-nav-badge">5</span>
              </button>
              <button type="button" className={`staff-nav-item${activeNav === "notifications" ? " active" : ""}`} onClick={() => setActiveNav("notifications")}>
                <Icon name="bell" size={18} style={{ color: "inherit" }} />
                Notifications
                <span className="staff-nav-badge">3</span>
              </button>
            </nav>

            {/* SECTION: 6 DEPARTMENTS */}
            <div className="staff-nav-section">6 Departments</div>
            <nav className="staff-nav">
              {[
                { id: "dept_candidate_acquisition", icon: "userPlus", label: "Candidate Acquisition", badge: "YOU" },
                { id: "dept_company_relations", icon: "buildingGrid", label: "Company Relations" },
                { id: "dept_mapping_engine", icon: "settingsGear", label: "Mapping Engine" },
                { id: "dept_assessment_video", icon: "video", label: "Assessment + Video", badge: "12", muted: true },
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
                { id: "jobapprovals", icon: "doc", label: "Job Approvals", count: jobCounts.pending },
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
              <div className="staff-user-avatar">AR</div>
              <div className="staff-user-info">
                <div className="staff-user-name">Anita Reddy</div>
                <div className="staff-user-role">SENIOR ACQUISITION EXECUTIVE · T-014</div>
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

              {/* 4 TOP KPI CARDS GRID */}
              <div className="tt-kpi-grid">
                {[
                  { title: "Profiles Today", value: "18", unit: "/25", sub: "72% of daily target", trend: "up", icon: "user", cls: "tt-kpi-1" },
                  { title: "In Verification", value: "12", sub: "Across assessment, video, Aadhaar", trend: "flat", icon: "clock", cls: "tt-kpi-3" },
                  { title: "Verified Today", value: "8", sub: "↑ 3 vs yesterday", trend: "up", icon: "shieldCheck", cls: "tt-kpi-2" },
                  { title: "Placed This Month", value: "14", sub: "₹35K commission earned", trend: "up", icon: "award", cls: "tt-kpi-4" },
                ].map((kpi, idx) => (
                  <div key={idx} className="tt-kpi">
                    <div className={`tt-kpi-icon ${kpi.cls}`}><Icon name={kpi.icon} size={18} /></div>
                    <div className="tt-kpi-label">{kpi.title}</div>
                    <div className="tt-kpi-value">{kpi.value}{kpi.unit && <span className="tt-kpi-unit">{kpi.unit}</span>}</div>
                    <div className={`tt-kpi-trend tt-trend-${kpi.trend}`}>{kpi.sub}</div>
                  </div>
                ))}
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

                {/* 7 STAGE CARDS */}
                <div className="sf-pipeline-stages">
                  {[
                    { count: 8, label: "Onboarded" },
                    { count: 5, label: "Profile ✓" },
                    { count: 4, label: "Assessment" },
                    { count: 3, label: "Video" },
                    { count: 2, label: "Aadhaar" },
                    { count: 12, label: "Verified ✓" },
                    { count: 14, label: "Placed", placed: true },
                  ].map((stg, idx) => (
                    <div key={idx} className={`sf-pipe-stage${stg.placed ? " placed" : ""}`} onClick={() => setActiveModal("kanban")}>
                      <div className="sf-pipe-num">{stg.count}</div>
                      <div className="sf-pipe-label">{stg.label}</div>
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
                          {recentUploadsList.map((row) => (
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
                          ))}
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
                      {[
                        { text: <>Priya S. got placed at Optum — your candidate! ₹5.5 LPA</>, time: "2 hrs ago", color: "rgba(229,168,46,0.15)", dot: "#B47E0E" },
                        { text: <>Vikram completed video introduction</>, time: "4 hrs ago", color: "#DCFCE7", dot: "#15803D" },
                        { text: <>You added 3 new candidates from ThoughtFlows</>, time: "5 hrs ago", color: "rgba(229,168,46,0.15)", dot: "#B47E0E" },
                        { text: <>Lakshmi P. shortlisted by R1 RCM</>, time: "1 day ago", color: "#EDE9FE", dot: "#6D28D9" },
                        { text: <>You signed MoU with Apollo Coding Institute</>, time: "2 days ago", color: "rgba(229,168,46,0.15)", dot: "#B47E0E" },
                      ].map((item, idx) => (
                        <div key={idx} className="sf-feed-item">
                          <div className="sf-feed-icon" style={{ background: item.color, color: item.dot }}>●</div>
                          <div className="sf-feed-info">
                            <div className="sf-feed-text">{item.text}</div>
                            <div className="sf-feed-time">{item.time}</div>
                          </div>
                        </div>
                      ))}
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

                  {/* DEPARTMENT LEADERBOARD CARD */}
                  <div className="tt-card">
                    <div className="tt-card-head">
                      <div>
                        <div className="tt-card-title">Department Leaderboard</div>
                        <div className="tt-card-sub">Profiles registered today · Candidate Acquisition</div>
                      </div>
                    </div>
                    <div style={{ padding: "4px 22px 18px" }}>
                      {[
                        { rank: 1, name: "Suresh Kumar", dept: "Candidate Acquisition · Chennai", score: 23 },
                        { rank: 2, name: "Anita Reddy", dept: "Candidate Acquisition · Hyderabad", score: 18, isMe: true },
                        { rank: 3, name: "Priya Menon", dept: "Candidate Acquisition · Coimbatore", score: 16 },
                        { rank: 4, name: "Rajesh Iyer", dept: "Candidate Acquisition · Vizag", score: 14 },
                        { rank: 5, name: "Kavya S.", dept: "Candidate Acquisition · Bangalore", score: 12 },
                      ].map((lb) => (
                        <div key={lb.rank} className={`sf-leader-row${lb.isMe ? " me" : ""}`}>
                          <div className="sf-leader-rank">{lb.rank}</div>
                          <div className="sf-leader-info">
                            <div className="sf-leader-name">{lb.name}{lb.isMe && <span style={{ color: "var(--gold)", fontSize: 11 }}> (you)</span>}</div>
                            <div className="sf-leader-dept">{lb.dept}</div>
                          </div>
                          <div className="sf-leader-score">{lb.score}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB MODULE: MY TASKS */}
          {activeNav === "my_tasks" && (() => {
            const pending = todayTasksList.filter((t) => !t.completed).length;
            const done = todayTasksList.filter((t) => t.completed).length;
            const highPriority = todayTasksList.filter((t) => !t.completed && t.priority === "HIGH").length;
            const total = todayTasksList.length;
            return (
              <div style={{ padding: "20px 28px" }}>
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
                    <div style={{ textAlign: "right" }}>
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
                  <div style={{ padding: "16px 22px", display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <input
                      type="text"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                      placeholder="e.g. Call Apollo Coding Institute about new batch"
                      style={{ flex: 1, minWidth: 220, padding: 10, borderRadius: 8, border: "1px solid var(--border-light, #E5E7EB)", fontSize: 13, fontFamily: "inherit" }}
                    />
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border-light, #E5E7EB)", fontSize: 13, fontFamily: "inherit" }}
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

                <div className="tt-card" style={{ marginTop: 16 }}>
                  <div className="tt-card-head">
                    <div>
                      <div className="tt-card-title">Today's List</div>
                      <div className="tt-card-sub">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</div>
                    </div>
                  </div>
                  <div style={{ padding: "4px 22px 18px" }}>
                    {todayTasksList.length === 0 && (
                      <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No tasks yet — add one above.</div>
                    )}
                    {todayTasksList.map((task) => {
                      const pillCls = task.priority === "HIGH" ? "sf-task-p1" : task.priority === "MED" ? "sf-task-p2" : "sf-task-p3";
                      return (
                        <div key={task.id} className="sf-task" style={{ opacity: task.completed ? 0.5 : 1 }}>
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTaskCompletion(task.id)}
                            style={{ marginTop: 3, accentColor: "var(--gold, #E5A82E)", cursor: "pointer" }}
                          />
                          <div className="sf-task-time">{task.time}</div>
                          <div className="sf-task-info">
                            <div className={`sf-task-title${task.completed ? " done" : ""}`}>{task.title}</div>
                            <div className="sf-task-meta">{task.detail}</div>
                          </div>
                          <span className={`sf-task-pill ${pillCls}`}>{task.priority === "HIGH" ? "High" : task.priority === "MED" ? "Med" : "Low"}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                            title="Remove task"
                            style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}
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
            <div style={{ padding: "20px 28px" }}>
              {/* WELCOME-STYLE HERO BANNER */}
              <div className="sf-welcome">
                <div className="sf-welcome-row">
                  <div className="sf-welcome-info">
                    <div className="sf-greet" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icon name="bell" size={26} sw={2.2} /> Notifications
                    </div>
                    <div className="sf-meta">
                      <span className="sf-day-pill">{staffUnreadCount > 0 ? "NEW ACTIVITY" : "ALL CAUGHT UP"}</span>
                      <span className="sf-meta-pill">JOB APPROVAL QUEUE</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>Updates from companies posting or resubmitting jobs</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.06em", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Unread</div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>
                      {staffUnreadCount}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>new notifications</div>
                  </div>
                </div>
              </div>

              {/* KPI TILES */}
              <div className="tt-kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
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

          {/* TAB MODULE: DEPARTMENT PAGES */}
          {activeNav.startsWith("dept_") && DEPARTMENTS[activeNav] && (() => {
            const dept = DEPARTMENTS[activeNav];
            return (
              <div style={{ padding: "20px 28px" }}>
                {/* WELCOME-STYLE HERO BANNER */}
                <div className="sf-welcome">
                  <div className="sf-welcome-row">
                    <div className="sf-welcome-info">
                      <div className="sf-greet" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 26, lineHeight: 1 }}>{dept.icon}</span> {dept.title}
                      </div>
                      <div className="sf-meta">
                        {dept.isMine && <span className="sf-day-pill">YOUR TEAM</span>}
                        <span className="sf-meta-pill">{dept.team.length} PEOPLE</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 520 }}>{dept.description}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.06em", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{dept.heroLabel}</div>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>
                        {dept.heroValue}
                      </div>
                      {dept.heroUnit && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{dept.heroUnit}</div>}
                    </div>
                  </div>
                </div>

                {/* KPI TILES */}
                <div className="tt-kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {dept.stats.map((s, idx) => (
                    <div key={idx} className="tt-kpi">
                      <div className={`tt-kpi-icon ${s.cls}`}><Icon name={s.icon} size={18} /></div>
                      <div className="tt-kpi-label">{s.label}</div>
                      <div className="tt-kpi-value">{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* QUICK ACTION CARDS */}
                {dept.actions && dept.actions.length > 0 && (
                  <div className="sf-actions-grid" style={{ gridTemplateColumns: `repeat(${dept.actions.length}, 1fr)` }}>
                    {dept.actions.map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="sf-action"
                        onClick={() => (act.modalNav ? setActiveNav(act.modalNav) : showToast(act.title + " — coming soon."))}
                      >
                        <div className={`sf-action-icon ${act.cls}`}><Icon name={act.icon} size={22} /></div>
                        <div className="sf-action-title">{act.title}</div>
                        <div className="sf-action-desc">{act.desc}</div>
                        <div className="sf-action-cta">Open →</div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="tt-card">
                  <div className="tt-card-head">
                    <div>
                      <div className="tt-card-title">Team</div>
                      <div className="tt-card-sub">{dept.isMine ? "Your acquisition team" : "Department roster · directory sync not yet connected"}</div>
                    </div>
                  </div>
                  <div style={{ padding: "4px 22px 18px" }}>
                    {dept.team.map((member, idx) => (
                      <div key={idx} className="sf-leader-row">
                        <div className="sf-mini-avatar" style={{ width: 30, height: 30 }}>{member.initials}</div>
                        <div className="sf-leader-info">
                          <div className="sf-leader-name">{member.name}{member.isMe && <span style={{ color: "var(--gold)", fontSize: 11 }}> (you)</span>}</div>
                          <div className="sf-leader-dept">{member.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB MODULE 2: KYC VERIFICATION */}
          {activeNav === "kyc" && (
            <div style={{ padding: "20px 28px" }}>
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
                                          href={doc.docUrl.startsWith("http") ? doc.docUrl : `http://localhost:5000${doc.docUrl}`}
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
            <div style={{ padding: "20px 28px" }}>
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
                                  href={selectedCert.docUrl.startsWith("http") ? selectedCert.docUrl : `http://localhost:5000${selectedCert.docUrl}`}
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
                                    href={selectedCert.liveVerificationEvidenceUrl.startsWith("http") ? selectedCert.liveVerificationEvidenceUrl : `http://localhost:5000${selectedCert.liveVerificationEvidenceUrl}`}
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

          {/* TAB MODULE 4: JOB APPROVALS */}
          {activeNav === "jobapprovals" && (
            <div style={{ padding: "20px 28px" }}>
              <QueuePageHeader
                icon="📋"
                accent="#2563EB"
                title="Job Posting Approvals"
                subtitle="Review job requisitions submitted by companies before publishing to candidate board."
                pills={
                  <>
                    <StatPill count={jobCounts.pending} label="PENDING" tone="pending" />
                    <StatPill count={jobCounts.approved} label="APPROVED" tone="good" />
                    <StatPill count={jobCounts.rejected} label="REJECTED" tone="bad" />
                  </>
                }
              />
              <div style={{ background: "#fff", padding: 24, borderRadius: 16, border: "1px solid var(--border-light, #E2E8F0)" }}>
                {(jobApprovalQueue || []).length === 0 ? (
                  <p style={{ color: "var(--text-muted, #4A5568)" }}>No jobs pending approval.</p>
                ) : (
                  (jobApprovalQueue || []).map((job) => (
                    <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F1F5F9" }}>
                      <div>
                        <strong>{job.jobTitle}</strong> • {job.companyName} • {job.location}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleAuditJob(job, "approve")} style={{ background: "#10B981", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Approve</button>
                        <button onClick={() => handleAuditJob(job, "reject")} style={{ background: "#EF4444", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB MODULE 5: INTERVIEW QUESTIONS */}
          {activeNav === "questions" && (
            <div style={{ padding: "20px 28px" }}>
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
          {activeNav === "reports" && (
            <div style={{ padding: "20px 28px" }}>
              <QueuePageHeader
                icon="📊"
                accent="#D97706"
                title="Operations Analytics & Reports"
                subtitle="Overall placement velocity, candidate conversion funnel, and verification turnaround."
              />
              <div style={{ background: "#fff", padding: 24, borderRadius: 16, border: "1px solid var(--border-light, #E2E8F0)" }}>
                <p style={{ color: "var(--text-muted, #4A5568)" }}>Verification conversion metrics & weekly ops report generator.</p>
              </div>
            </div>
          )}

          {/* TAB MODULE 7: ACTIVITY LOG */}
          {activeNav === "activity" && (
            <div style={{ padding: "20px 28px" }}>
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
            {activeModal === "search" && (
              <div>
                <input
                  type="text"
                  autoFocus
                  placeholder="Type name, company, academy, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14, outline: "none", marginBottom: 16, fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}
                />
                <div style={{ fontSize: 12, color: "var(--text-muted, #4A5568)" }}>
                  Searching across 12,480 candidates & 423 company accounts...
                </div>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ padding: 10, background: "#F8FAFC", borderRadius: 8, cursor: "pointer" }} onClick={() => { showToast("Opening candidate Lakshmi Pillai"); setActiveModal(null); }}>
                    <strong style={{ fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)" }}>Lakshmi Pillai</strong> • ED Coding • THOUGHTFLOWS
                  </div>
                  <div style={{ padding: 10, background: "#F8FAFC", borderRadius: 8, cursor: "pointer" }} onClick={() => { showToast("Opening company Optum Health"); setActiveModal(null); }}>
                    <strong style={{ fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)" }}>Optum Health</strong> • Enterprise Hiring Partner
                  </div>
                </div>
              </div>
            )}

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
