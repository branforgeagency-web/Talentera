import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { safeJson } from "../utils/safeJson.js";

// Specialized Modular Components
import StageTracker8Dots from "../components/academy/StageTracker8Dots";
import LiveActivityFeed from "../components/academy/LiveActivityFeed";
import InterviewsKanban from "../components/academy/InterviewsKanban";
import BatchInterviewHeatmap from "../components/academy/BatchInterviewHeatmap";
import UploadAndInvitesEngine from "../components/academy/UploadAndInvitesEngine";
import ApprovalsQueue from "../components/academy/ApprovalsQueue";
import PlacementCertModal from "../components/academy/PlacementCertModal";
import MonthlyReportModal from "../components/academy/MonthlyReportModal";
import StudentDetailModal from "../components/academy/StudentDetailModal";
import "../styles/academyOS.css";

import {
  Home,
  Users,
  UploadCloud,
  Layers,
  CheckSquare,
  GitPullRequest,
  BookOpen,
  FileQuestion,
  Video,
  Award,
  TrendingUp,
  Settings as SettingsIcon,
  LogOut,
  AlertTriangle,
  Send,
  MessageCircle,
  FileText,
  Printer,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  Building2,
  Calendar,
  Briefcase,
  Bell,
  CheckCircle2,
  Clock,
  ChevronRight,
  Plus,
  Download,
  Flame,
  ArrowRight,
  Lock,
  PieChart,
} from "lucide-react";

export default function AcademyPortal() {
  const navigate = useNavigate();
  const location = useLocation();

  // 14 Operational Modules:
  // home | candidates | upload | invites | verification | approvals | scores | profile_live | company_activity | interviews | placements | analytics | notifications | settings
  const [activeMod, setActiveMod] = useState("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sync activeMod with URL pathname
  useEffect(() => {
    const path = location.pathname.replace(/\/$/, "");
    if (path === "/academy/dashboard" || path === "/academy") {
      setActiveMod("home");
    } else if (path.startsWith("/academy/candidates")) {
      setActiveMod("candidates");
    } else if (path.startsWith("/academy/upload")) {
      setActiveMod("upload");
    } else if (path.startsWith("/academy/invites")) {
      setActiveMod("invites");
    } else if (path.startsWith("/academy/verification")) {
      setActiveMod("verification");
    } else if (path.startsWith("/academy/approvals")) {
      setActiveMod("approvals");
    } else if (path.startsWith("/academy/scores")) {
      setActiveMod("scores");
    } else if (path.startsWith("/academy/profile-live")) {
      setActiveMod("profile_live");
    } else if (path.startsWith("/academy/company-activity")) {
      setActiveMod("company_activity");
    } else if (path.startsWith("/academy/interviews")) {
      setActiveMod("interviews");
    } else if (path.startsWith("/academy/placements")) {
      setActiveMod("placements");
    } else if (path.startsWith("/academy/analytics")) {
      setActiveMod("analytics");
    } else if (path.startsWith("/academy/notifications")) {
      setActiveMod("notifications");
    } else if (path.startsWith("/academy/settings")) {
      setActiveMod("settings");
    }
  }, [location.pathname]);

  const handleNavigateMod = (modId) => {
    setActiveMod(modId);
    const routeMap = {
      home: "/academy/dashboard",
      candidates: "/academy/candidates",
      upload: "/academy/upload",
      invites: "/academy/invites",
      verification: "/academy/verification",
      approvals: "/academy/approvals",
      scores: "/academy/scores",
      profile_live: "/academy/profile-live",
      company_activity: "/academy/company-activity",
      interviews: "/academy/interviews",
      placements: "/academy/placements",
      analytics: "/academy/analytics",
      notifications: "/academy/notifications",
      settings: "/academy/settings",
    };
    if (routeMap[modId] && location.pathname !== routeMap[modId]) {
      navigate(routeMap[modId]);
    }
  };

  // Backend Data State
  const [dashData, setDashData] = useState(null);
  const [stuckStudents, setStuckStudents] = useState([]);
  const [scoresData, setScoresData] = useState(null);
  const [liveProfilesData, setLiveProfilesData] = useState([]);
  const [notificationsData, setNotificationsData] = useState({ notifications: [], categories: {}, unreadCount: 0 });
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [placementConfirmations, setPlacementConfirmations] = useState([]);

  // Candidate Directory Filter States
  const [candidateSummaryTab, setCandidateSummaryTab] = useState("All Candidates");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateBatchFilter, setCandidateBatchFilter] = useState("All");
  const [candidateSpecialtyFilter, setCandidateSpecialtyFilter] = useState("All");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("All");
  const [candidateTypeFilter, setCandidateTypeFilter] = useState("All");
  const [candidateStageFilter, setCandidateStageFilter] = useState("All");
  const [candidateScoreFilter, setCandidateScoreFilter] = useState("All");

  // Sub-tab states for sub-modules
  const [interviewSubTab, setInterviewSubTab] = useState("kanban"); // 'kanban' | 'heatmap'
  const [settingsSubTab, setSettingsSubTab] = useState("Account");
  const [notifCategoryFilter, setNotifCategoryFilter] = useState("all");

  // Modals & Details
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState(null);
  const [selectedCertData, setSelectedCertData] = useState(null);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showAddPlacementModal, setShowAddPlacementModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState({ open: false, placement: null, reason: "" });
  const [toastMsg, setToastMsg] = useState(null);

  // Batch Creation Inputs
  const [newBatchCode, setNewBatchCode] = useState("");
  const [newBatchCourse, setNewBatchCourse] = useState("HCC Coding Specialization");
  const [newBatchBranch, setNewBatchBranch] = useState("Coimbatore");

  // Other Form Inputs
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseCategory, setNewCourseCategory] = useState("Medical Coding");
  const [newCourseDuration, setNewCourseDuration] = useState("3 MONTHS");
  const [newCourseHrs, setNewCourseHrs] = useState("120");
  const [newCourseSyllabus, setNewCourseSyllabus] = useState("ICD-10-CM, CPT Modifiers, Capstone");

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionTopic, setNewQuestionTopic] = useState("HCC");
  const [newQuestionType, setNewQuestionType] = useState("MCQ");
  const [newQuestionDiff, setNewQuestionDiff] = useState("Mid");
  const [newQuestionMarks, setNewQuestionMarks] = useState("2");

  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentRole, setNewStudentRole] = useState("Sr Medical Coder");
  const [newCompany, setNewCompany] = useState("Optum");
  const [newCity, setNewCity] = useState("Chennai");
  const [newCtc, setNewCtc] = useState("₹5.5 LPA");

  // Settings Edit Inputs
  const [setAcademyName, setSetAcademyName] = useState("");
  const [setAdminName, setSetAdminName] = useState("");
  const [setEmailAddr, setSetEmailAddr] = useState("");
  const [setPhoneNum, setSetPhoneNum] = useState("");
  const [setSpecialtyName, setSetSpecialtyName] = useState("");
  const [setHQ, setSetHQ] = useState("");

  const token = localStorage.getItem("talentera_academy_token") || "";

  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const showToast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/academy/dashboard", {
        headers: { ...getAuthHeader() },
      });
      if (res.status === 401) {
        navigate("/academy/login");
        return;
      }
      const data = await safeJson(res);
      if (data) {
        setDashData(data);
        if (data.academy) {
          setSetAcademyName(data.academy.name || "Apex Healthcare Academy");
          setSetAdminName(data.academy.primaryAdmin || "Dr. Rajesh Kumar");
          setSetEmailAddr(data.academy.email || "admin@apexacademy.com");
          setSetPhoneNum(data.academy.phone || "+91 9765435676");
          setSetSpecialtyName(data.academy.specialty || "Medical Coding");
          setSetHQ(data.academy.headquarters || "Coimbatore");
        }
      }
    } catch (err) {
      console.error("Fetch dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStuckStudents = async () => {
    try {
      const res = await fetch("/api/academy/stuck-students?days_idle=5", {
        headers: { ...getAuthHeader() },
      });
      const data = await safeJson(res);
      if (data && data.stuckStudents) {
        setStuckStudents(data.stuckStudents);
      }
    } catch (err) {
      console.error("Fetch stuck students error:", err);
    }
  };

  const fetchApprovalsCount = async () => {
    try {
      const res = await fetch("/api/academy/approvals", {
        headers: { ...getAuthHeader() },
      });
      const data = await safeJson(res);
      if (data && data.totalPending !== undefined) {
        setPendingApprovalsCount(data.totalPending);
      }
    } catch (err) {
      console.error("Fetch approvals count error:", err);
    }
  };

  const fetchScoresAnalytics = async () => {
    try {
      const res = await fetch("/api/academy/scores-analytics", {
        headers: { ...getAuthHeader() },
      });
      const data = await safeJson(res);
      if (data) {
        setScoresData(data);
      }
    } catch (err) {
      console.error("Fetch scores analytics error:", err);
    }
  };

  const fetchLiveProfiles = async () => {
    try {
      const res = await fetch("/api/academy/live-profiles", {
        headers: { ...getAuthHeader() },
      });
      const data = await safeJson(res);
      if (data && data.liveProfiles) {
        setLiveProfilesData(data.liveProfiles);
      }
    } catch (err) {
      console.error("Fetch live profiles error:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/academy/notifications", {
        headers: { ...getAuthHeader() },
      });
      const data = await safeJson(res);
      if (data) {
        setNotificationsData(data);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  const fetchPlacementConfirmations = async () => {
    try {
      const res = await fetch("/api/academy/placements/confirmations", {
        headers: { ...getAuthHeader() },
      });
      const data = await safeJson(res);
      if (data && data.confirmations) {
        setPlacementConfirmations(data.confirmations);
      }
    } catch (err) {
      console.error("Fetch placement confirmations error:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchStuckStudents();
    fetchApprovalsCount();
    fetchScoresAnalytics();
    fetchLiveProfiles();
    fetchNotifications();
    fetchPlacementConfirmations();
  }, [token]);

  // Bulk WhatsApp / Nudge Action
  const handleBulkNudge = async (channel = "whatsapp") => {
    try {
      const res = await fetch("/api/academy/students/bulk-nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          studentIds: stuckStudents.map((s) => s.id),
          channel,
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        showToast(data.message || `Bulk ${channel.toUpperCase()} nudge sent successfully!`);
      } else {
        showToast(data.message || "Failed to send bulk nudge.", "error");
      }
    } catch (err) {
      showToast("Error sending bulk reminder.", "error");
    }
  };

  // Single Nudge
  const handleSingleNudge = async (candId, name) => {
    try {
      const res = await fetch(`/api/academy/students/${candId}/nudge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ channel: "whatsapp" }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        showToast(data.message || `WhatsApp nudge sent to ${name}!`);
      } else {
        showToast(data.message || "Failed to send reminder.", "error");
      }
    } catch (err) {
      showToast("Error sending nudge.", "error");
    }
  };

  // Submit Placement Dispute
  const handleDisputeSubmit = async () => {
    if (!showDisputeModal.reason.trim()) {
      showToast("Please specify the dispute reason.", "error");
      return;
    }
    try {
      const res = await fetch("/api/academy/placements/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          placementId: showDisputeModal.placement?._id,
          candidateName: showDisputeModal.placement?.candidateName || showDisputeModal.placement?.studentName,
          company: showDisputeModal.placement?.companyName || showDisputeModal.placement?.company,
          issueType: "Verification Dispute",
          description: showDisputeModal.reason.trim(),
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        showToast(data.message || "Placement dispute submitted for audit review.");
        setShowDisputeModal({ open: false, placement: null, reason: "" });
      } else {
        showToast(data.message || "Failed to submit dispute.", "error");
      }
    } catch (err) {
      showToast("Error submitting dispute.", "error");
    }
  };

  // Create Batch Form Submission
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!newBatchCode.trim()) {
      showToast("Please enter a batch code.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/academy/create-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          code: newBatchCode.trim(),
          course: newBatchCourse,
          branch: newBatchBranch,
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        showToast(data.message || `Batch ${newBatchCode} created successfully!`);
        setShowCreateBatchModal(false);
        setNewBatchCode("");
        fetchDashboardData();
      } else {
        showToast(data.message || "Failed to create batch.", "error");
      }
    } catch (err) {
      showToast("Error creating batch.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Add Course
  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/academy/create-course", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          title: newCourseTitle.trim(),
          category: newCourseCategory,
          duration: newCourseDuration,
          totalHrs: newCourseHrs,
          syllabus: newCourseSyllabus,
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        showToast(data.message || "Course added to curriculum!");
        setShowAddCourseModal(false);
        setNewCourseTitle("");
        fetchDashboardData();
      } else {
        showToast(data.message || "Failed to add course.", "error");
      }
    } catch (err) {
      showToast("Error adding course.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Add Question
  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/academy/add-question", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          question: newQuestionText.trim(),
          topic: newQuestionTopic,
          type: newQuestionType,
          difficulty: newQuestionDiff,
          marks: newQuestionMarks,
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        showToast(data.message || "Question saved to bank!");
        setShowAddQuestionModal(false);
        setNewQuestionText("");
        fetchDashboardData();
      } else {
        showToast(data.message || "Failed to add question.", "error");
      }
    } catch (err) {
      showToast("Error adding question.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Add Placement
  const handleAddPlacement = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newCompany.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/academy/add-placement", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          studentName: newStudentName.trim(),
          role: newStudentRole,
          company: newCompany.trim(),
          city: newCity,
          ctc: newCtc,
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        showToast(data.message || "Placement record recorded!");
        setShowAddPlacementModal(false);
        setNewStudentName("");
        fetchDashboardData();
      } else {
        showToast(data.message || "Failed to record placement.", "error");
      }
    } catch (err) {
      showToast("Error recording placement.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Mark all notifications read
  const handleMarkNotificationsRead = async () => {
    try {
      await fetch("/api/academy/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({}),
      });
      fetchNotifications();
      showToast("All notifications marked as read.");
    } catch (err) {
      console.error(err);
    }
  };

  // Data Selectors
  const academy = dashData?.academy || {};
  const students = dashData?.students || [];
  const batches = dashData?.batches || [];
  const courses = dashData?.courses || [];
  const placements = dashData?.placements || [];
  const questions = dashData?.questions || [];
  const kpis = dashData?.kpis || {};

  // Unique Batch Codes & Specializations for Filter Dropdowns
  const batchOptions = useMemo(() => {
    const list = new Set();
    students.forEach((s) => {
      if (s.month) list.add(s.month.trim());
      if (s.batch) list.add(s.batch.trim());
    });
    batches.forEach((b) => {
      if (b.code) list.add(b.code.trim());
    });
    return Array.from(list).filter(Boolean);
  }, [students, batches]);

  const specialtyOptions = useMemo(() => {
    const list = new Set();
    students.forEach((s) => {
      if (s.specialty) list.add(s.specialty.trim());
      if (s.course) list.add(s.course.trim());
    });
    courses.forEach((c) => {
      if (c.title) list.add(c.title.trim());
    });
    return Array.from(list).filter(Boolean);
  }, [students, courses]);

  // Master Filtered Candidate Roster
  const filteredCandidates = useMemo(() => {
    return students.filter((s) => {
      // 1. Summary Status Tab Filter
      if (candidateSummaryTab !== "All Candidates") {
        const comp = typeof s.completion === "number" ? s.completion : parseInt(s.completion, 10) || 0;
        if (candidateSummaryTab === "Invited") {
          if (s.status !== "invited" && s.status !== "pending_invite" && comp > 25) return false;
        } else if (candidateSummaryTab === "Verification In Progress") {
          if (comp >= 100 || s.status === "verified" || s.status === "placed") return false;
        } else if (candidateSummaryTab === "Awaiting Approval") {
          const stList = s.stages || [];
          const hasPending = stList.some((st) => st.needsApproval || (!st.isDone && (st.stageNumber === 2 || st.stageNumber === 5)));
          if (!hasPending && s.status !== "pending_review") return false;
        } else if (candidateSummaryTab === "Verified") {
          if (comp < 100 && s.status !== "verified") return false;
        } else if (candidateSummaryTab === "Profile Live") {
          if (comp < 75 && s.status !== "verified") return false;
        } else if (candidateSummaryTab === "Matched") {
          if (s.status !== "matched" && s.status !== "active" && comp < 80) return false;
        } else if (candidateSummaryTab === "Interviewing") {
          if (s.status !== "interviewing" && s.status !== "shortlisted") return false;
        } else if (candidateSummaryTab === "Placed") {
          if (s.status !== "placed") return false;
        } else if (candidateSummaryTab === "Disputed") {
          if (s.status !== "disputed") return false;
        }
      }

      // 2. Search Filter (Name, Email, Mobile, ID)
      if (candidateSearch.trim()) {
        const q = candidateSearch.toLowerCase().trim();
        const candId = String(s.id || s._id || "").toLowerCase();
        const name = (s.name || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        const mobile = (s.mobile || "").replace(/\D/g, "");
        if (!name.includes(q) && !email.includes(q) && !candId.includes(q) && !mobile.includes(q.replace(/\D/g, ""))) {
          return false;
        }
      }

      // 3. Batch Filter
      if (candidateBatchFilter !== "All") {
        const b = (s.month || s.batch || "").trim();
        if (b !== candidateBatchFilter) return false;
      }

      // 4. Specialization Filter
      if (candidateSpecialtyFilter !== "All") {
        const spec = (s.specialty || s.course || "").trim();
        if (spec !== candidateSpecialtyFilter) return false;
      }

      // 5. Candidate Type Filter (Fresher vs Experienced)
      if (candidateTypeFilter !== "All") {
        const type = (s.type || s.experience || "Fresher").toLowerCase();
        if (type !== candidateTypeFilter.toLowerCase()) return false;
      }

      // 6. Stage Filter
      if (candidateStageFilter !== "All") {
        const targetStage = parseInt(candidateStageFilter, 10);
        const stList = s.stages || [];
        const currentStage = stList.findIndex((st) => !st.isDone) + 1 || 8;
        if (currentStage !== targetStage) return false;
      }

      // 7. Score Filter
      if (candidateScoreFilter !== "All") {
        const sc = s.score && s.score !== "—" ? parseInt(s.score, 10) : 0;
        if (candidateScoreFilter === "> 90%" && sc < 90) return false;
        if (candidateScoreFilter === "80-89%" && (sc < 80 || sc >= 90)) return false;
        if (candidateScoreFilter === "70-79%" && (sc < 70 || sc >= 80)) return false;
        if (candidateScoreFilter === "< 70%" && sc >= 70) return false;
      }

      return true;
    });
  }, [
    students,
    candidateSummaryTab,
    candidateSearch,
    candidateBatchFilter,
    candidateSpecialtyFilter,
    candidateTypeFilter,
    candidateStageFilter,
    candidateScoreFilter,
  ]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", fontFamily: "'Inter', sans-serif", color: "#06152A" }}>
        <RefreshCw style={{ width: 28, height: 28, animation: "spin 1s linear infinite", margin: "0 auto 16px", color: "#E5A82E" }} />
        <h3 style={{ margin: 0, fontWeight: 800 }}>Loading Talentera Academy Partner Dashboard...</h3>
        <p style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>Synchronizing students, assessments, approvals, and placement metrics.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', sans-serif", color: "#0F172A" }}>
      {/* ====== TOP NAVBAR HEADER ====== */}
      <header style={{ background: "#06152A", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => handleNavigateMod("home")}>
          <img src="/logo-white.png" alt="Talentera" style={{ height: 26, width: "auto" }} />
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: 12 }}>
            <span style={{ color: "#E5A82E", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em" }}>
              ACADEMY PARTNER DASHBOARD
            </span>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>Train Talent · Verify Skills · Track Outcomes</div>
          </div>
        </div>

        {/* Partner Info Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "4px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#fff" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#E5A82E", color: "#06152A", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {academy.name ? academy.name.slice(0, 2).toUpperCase() : "AC"}
            </span>
            <span><strong>{academy.name || "Apex Healthcare Academy"}</strong> · {academy.primaryAdmin || "Admin"}</span>
          </div>

          <button
            onClick={() => handleNavigateMod("notifications")}
            style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", padding: "6px 10px", borderRadius: 6, cursor: "pointer", position: "relative" }}
          >
            <Bell style={{ width: 15, height: 15 }} />
            {notificationsData.unreadCount > 0 && (
              <span style={{ position: "absolute", top: -3, right: -3, background: "#DC2626", color: "#fff", fontSize: 9, fontWeight: 900, borderRadius: "50%", width: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {notificationsData.unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("talentera_academy_token");
              navigate("/academy/login");
            }}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            ← Exit
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: "fixed", top: 60, right: 24, zIndex: 99999, background: toastMsg.type === "error" ? "#FEF2F2" : "#ECFDF5", border: toastMsg.type === "error" ? "1px solid #FECACA" : "1px solid #A7F3D0", color: toastMsg.type === "error" ? "#991B1B" : "#065F46", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          {toastMsg.msg}
        </div>
      )}

      {/* ====== MAIN SHELL WITH SIDEBAR & CONTENT AREA ====== */}
      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", minHeight: "calc(100vh - 55px)" }}>
        {/* Sidebar Navigation */}
        <aside style={{ background: "#06152A", color: "#94A3B8", padding: "18px 12px", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", padding: "0 8px 6px", textTransform: "uppercase" }}>OPERATIONS</div>
            <SidebarItem id="home" label="1. Home" icon="fa-house" activeMod={activeMod} setActiveMod={handleNavigateMod} />
            <SidebarItem id="candidates" label="2. Candidates" icon="fa-users" activeMod={activeMod} setActiveMod={handleNavigateMod} badge={students.length > 0 ? students.length : undefined} />
            <SidebarItem id="upload" label="3. Upload Candidates" icon="fa-cloud-arrow-up" activeMod={activeMod} setActiveMod={handleNavigateMod} />
            <SidebarItem id="invites" label="4. Invitations" icon="fa-paper-plane" activeMod={activeMod} setActiveMod={handleNavigateMod} />
            <SidebarItem id="verification" label="5. Verification Tracker" icon="fa-list-check" activeMod={activeMod} setActiveMod={handleNavigateMod} />
            <SidebarItem id="approvals" label="6. Awaiting My Approval" icon="fa-circle-check" activeMod={activeMod} setActiveMod={handleNavigateMod} badge={pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined} badgeColor="#CA8A04" />

            <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", padding: "16px 8px 6px", textTransform: "uppercase" }}>TALENT & MATCHING</div>
            <SidebarItem id="scores" label="7. Talentera Scores" icon="fa-award" activeMod={activeMod} setActiveMod={handleNavigateMod} />
            <SidebarItem id="profile_live" label="8. Profile Live" icon="fa-shield-halved" activeMod={activeMod} setActiveMod={handleNavigateMod} badge={liveProfilesData.length > 0 ? liveProfilesData.length : undefined} badgeColor="#16A34A" />
            <SidebarItem id="company_activity" label="9. Company Activity" icon="fa-building" activeMod={activeMod} setActiveMod={handleNavigateMod} />
            <SidebarItem id="interviews" label="10. Interviews" icon="fa-diagram-project" activeMod={activeMod} setActiveMod={handleNavigateMod} />
            <SidebarItem id="placements" label="11. Placements" icon="fa-briefcase" activeMod={activeMod} setActiveMod={handleNavigateMod} badge={placementConfirmations.filter((c) => c.status === "pending").length || undefined} badgeColor="#15803D" />

            <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", padding: "16px 8px 6px", textTransform: "uppercase" }}>INSIGHTS & ADMIN</div>
            <SidebarItem id="analytics" label="12. Analytics" icon="fa-chart-pie" activeMod={activeMod} setActiveMod={handleNavigateMod} />
            <SidebarItem id="notifications" label="13. Notifications" icon="fa-bell" activeMod={activeMod} setActiveMod={handleNavigateMod} badge={notificationsData.unreadCount > 0 ? notificationsData.unreadCount : undefined} badgeColor="#DC2626" />
            <SidebarItem id="settings" label="14. Academy Settings" icon="fa-gear" activeMod={activeMod} setActiveMod={handleNavigateMod} />
          </div>

          <div onClick={() => { localStorage.removeItem("talentera_academy_token"); navigate("/academy/login"); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 16 }}>
            <LogOut style={{ width: 14, height: 14 }} /> Sign out
          </div>
        </aside>

        {/* ====== CONTENT AREA ====== */}
        <main style={{ padding: 24, overflowX: "hidden" }}>
          {/* ========================================================= */}
          {/* 1. HOME DASHBOARD */}
          {/* ========================================================= */}
          {activeMod === "home" && (
            <div className="space-y-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#E5A82E", letterSpacing: "0.08em" }}>
                    COHORT LIVE CONTROL CENTER · {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </div>
                  <h2 style={{ margin: "2px 0 4px", fontSize: 22, fontWeight: 800, color: "#06152A" }}>
                    Good morning, {academy.primaryAdmin || "Academy Admin"} 👋
                  </h2>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    Track your candidates from initial enrollment through verification, scoring, employer matching, and final placement.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-navy" style={{ fontSize: 12 }} onClick={() => handleNavigateMod("upload")}>
                    <i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: 6 }}></i>
                    Bulk Upload CSV
                  </button>
                  <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => setShowCreateBatchModal(true)}>
                    + Create Batch
                  </button>
                  <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => handleNavigateMod("approvals")}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }}></i>
                    Pending Approvals ({pendingApprovalsCount})
                  </button>
                  <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => setShowMonthlyReportModal(true)}>
                    <i className="fa-solid fa-file-lines" style={{ marginRight: 6 }}></i>
                    Monthly Report
                  </button>
                </div>
              </div>

              {/* 7 KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                <MetricCard title="TOTAL CANDIDATES" val={kpis.totalStudents ?? students.length} sub={`${students.filter((s) => s.status === "placed").length} placed · ${liveProfilesData.length} live`} icon="fa-user-group" onClick={() => handleNavigateMod("candidates")} />
                <MetricCard title="VERIFICATION PROGRESS" val={`${students.filter((s) => s.completion === 100 || s.completion === "100%").length} / ${students.length}`} sub="8-stage completed" icon="fa-list-check" color="#22C55E" onClick={() => handleNavigateMod("verification")} />
                <MetricCard title="AWAITING APPROVAL" val={pendingApprovalsCount} sub="Stage 2 & 5 actions" icon="fa-circle-check" color="#CA8A04" onClick={() => handleNavigateMod("approvals")} />
                <MetricCard title="STUCK STUDENTS" val={stuckStudents.length} sub="Inactive for 5+ days" icon="fa-clock" color="#DC2626" onClick={() => handleNavigateMod("candidates")} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                <MetricCard title="PROFILES LIVE" val={liveProfilesData.length || 5} sub="Visible to employers" icon="fa-shield-halved" color="#16A34A" onClick={() => handleNavigateMod("profile_live")} />
                <MetricCard title="ACTIVE INTERVIEWS" val={kpis.interviewsActive || 12} sub="In hiring pipeline" icon="fa-diagram-project" color="#2563EB" onClick={() => handleNavigateMod("interviews")} />
                <MetricCard title="PLACEMENTS" val={placements.length || 18} sub="Verified retention" icon="fa-briefcase" color="#15803D" onClick={() => handleNavigateMod("placements")} />
              </div>

              {/* STUCK STUDENTS ALERT PANEL */}
              {stuckStudents.length > 0 && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, padding: "16px 20px", marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: "#FEE2E2", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 }}>
                        ⚠️
                      </span>
                      <div>
                        <strong style={{ fontSize: 14, color: "#991B1B" }}>
                          Students Need Attention ({stuckStudents.length} students haven't progressed in &gt;5 days)
                        </strong>
                        <div style={{ fontSize: 12, color: "#7F1D1D" }}>Candidates are stalled at their verification stage. Unblock them with a 1-click WhatsApp reminder.</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBulkNudge("whatsapp")}
                      style={{ background: "#15803D", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <MessageCircle style={{ width: 14, height: 14 }} />
                      Send Bulk WhatsApp Nudge ({stuckStudents.length})
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                    {stuckStudents.slice(0, 4).map((s) => (
                      <div key={s.id} style={{ background: "#FFFFFF", borderRadius: 10, padding: "10px 14px", border: "1px solid #FECACA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ fontSize: 13, color: "#0F172A", display: "block" }}>{s.name}</strong>
                          <span style={{ fontSize: 11, color: "#991B1B", fontWeight: 700 }}>
                            Stage {s.blockedStage} · Inactive for {s.daysIdle} days
                          </span>
                        </div>
                        <button
                          onClick={() => handleSingleNudge(s.id, s.name)}
                          style={{ background: "#15803D", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          Send Nudge
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Split: Active Batches + Live Feed */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#06152A" }}>Active Batches</h4>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", cursor: "pointer" }} onClick={() => handleNavigateMod("candidates")}>
                      View all →
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {batches.slice(0, 3).map((b, idx) => {
                      const batchStudents = students.filter((s) => s.month === b.code || (s.month && s.month.includes(b.code)));
                      const enrolledCount = batchStudents.length || b.studentsCount || 0;
                      const placedCount = batchStudents.filter((s) => s.status === "placed").length;
                      const placedPct = enrolledCount > 0 ? Math.round((placedCount / enrolledCount) * 100) : 0;

                      return (
                        <div key={b._id || idx} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #E2E8F0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#64748B" }}>{b.code} · Path B ✓</span>
                              <h5 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#06152A" }}>{b.course}</h5>
                            </div>
                            <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>Active</span>
                          </div>

                          <div style={{ display: "flex", gap: 24, fontSize: 12, color: "#64748B" }}>
                            <div><strong>{enrolledCount}</strong> STUDENTS</div>
                            <div><strong>{placedPct}%</strong> PLACED</div>
                            <div><strong>Path B</strong> VERIFIED</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <LiveActivityFeed token={token} />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. MAIN CANDIDATES DASHBOARD */}
          {/* ========================================================= */}
          {activeMod === "candidates" && (
            <div className="space-y-4">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Candidates Directory</h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Manage and track every student from initial upload through 8-stage verification to final placement.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-navy" style={{ fontSize: 12 }} onClick={() => handleNavigateMod("upload")}>
                    <Plus style={{ width: 13, height: 13, marginRight: 4 }} />
                    Add Candidate
                  </button>
                  <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => handleNavigateMod("upload")}>
                    <UploadCloud style={{ width: 13, height: 13, marginRight: 4 }} />
                    Bulk Upload CSV
                  </button>
                  <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => handleBulkNudge("whatsapp")}>
                    <MessageCircle style={{ width: 13, height: 13, marginRight: 4 }} />
                    Bulk WhatsApp Nudge
                  </button>
                </div>
              </div>

              {/* Master Summary Status Tabs */}
              <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #E2E8F0", paddingBottom: 10, overflowX: "auto" }}>
                {[
                  "All Candidates",
                  "Invited",
                  "Verification In Progress",
                  "Awaiting Approval",
                  "Verified",
                  "Profile Live",
                  "Matched",
                  "Interviewing",
                  "Placed",
                  "Disputed",
                ].map((tab) => {
                  const isActive = candidateSummaryTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setCandidateSummaryTab(tab)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: isActive ? "1px solid #06152A" : "1px solid #E2E8F0",
                        background: isActive ? "#06152A" : "#FFFFFF",
                        color: isActive ? "#FFFFFF" : "#64748B",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Advanced Filters Panel */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 1fr", gap: 10 }}>
                {/* Search */}
                <div style={{ position: "relative" }}>
                  <Search style={{ width: 14, height: 14, position: "absolute", left: 10, top: 10, color: "#94A3B8" }} />
                  <input
                    type="text"
                    placeholder="Search name, email, ID..."
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px 7px 32px", fontSize: 12, borderRadius: 6, border: "1px solid #CBD5E1" }}
                  />
                </div>

                {/* Batch Filter */}
                <select value={candidateBatchFilter} onChange={(e) => setCandidateBatchFilter(e.target.value)} style={{ padding: "7px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #CBD5E1" }}>
                  <option value="All">All Batches</option>
                  {batchOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                {/* Specialty Filter */}
                <select value={candidateSpecialtyFilter} onChange={(e) => setCandidateSpecialtyFilter(e.target.value)} style={{ padding: "7px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #CBD5E1" }}>
                  <option value="All">All Specializations</option>
                  {specialtyOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Type Filter */}
                <select value={candidateTypeFilter} onChange={(e) => setCandidateTypeFilter(e.target.value)} style={{ padding: "7px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #CBD5E1" }}>
                  <option value="All">All Types</option>
                  <option value="Fresher">Fresher</option>
                  <option value="Experienced">Experienced</option>
                </select>

                {/* Stage Filter */}
                <select value={candidateStageFilter} onChange={(e) => setCandidateStageFilter(e.target.value)} style={{ padding: "7px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #CBD5E1" }}>
                  <option value="All">All Stages</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((st) => (
                    <option key={st} value={st}>Stage {st}</option>
                  ))}
                </select>

                {/* Score Filter */}
                <select value={candidateScoreFilter} onChange={(e) => setCandidateScoreFilter(e.target.value)} style={{ padding: "7px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #CBD5E1" }}>
                  <option value="All">All Scores</option>
                  <option value="> 90%">&gt; 90% (Top 5%)</option>
                  <option value="80-89%">80-89% (High)</option>
                  <option value="70-79%">70-79% (Mid)</option>
                  <option value="< 70%">&lt; 70%</option>
                </select>
              </div>

              {/* Candidate Data Table */}
              <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#06152A", color: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ padding: "12px 14px", fontWeight: 700 }}>CANDIDATE</th>
                      <th style={{ padding: "12px 14px", fontWeight: 700 }}>BATCH & SPECIALTY</th>
                      <th style={{ padding: "12px 14px", fontWeight: 700 }}>TYPE</th>
                      <th style={{ padding: "12px 14px", fontWeight: 700 }}>8-STAGE PROGRESS</th>
                      <th style={{ padding: "12px 14px", fontWeight: 700 }}>SCORE</th>
                      <th style={{ padding: "12px 14px", fontWeight: 700 }}>STATUS</th>
                      <th style={{ padding: "12px 14px", fontWeight: 700 }}>MATCH & INTERVIEW</th>
                      <th style={{ padding: "12px 14px", fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                          No candidates match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredCandidates.map((c) => {
                        const candIdShort = String(c.id || c._id || "").slice(-6).toUpperCase();
                        const scoreVal = c.score && c.score !== "—" ? parseInt(c.score, 10) : null;
                        const isLive = (c.completion === 100 || c.completion === "100%" || c.status === "verified");

                        return (
                          <tr key={c.id || c._id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            {/* Candidate */}
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#E2E8F0", color: "#06152A", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                                  {c.name?.slice(0, 2).toUpperCase() || "CA"}
                                </div>
                                <div>
                                  <strong style={{ fontSize: 13, color: "#0F172A", cursor: "pointer" }} onClick={() => setSelectedStudentForDetail(c)}>
                                    {c.name}
                                  </strong>
                                  <div style={{ fontSize: 10, color: "#64748B" }}>
                                    TAL-{candIdShort} · {c.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Batch & Specialty */}
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ fontWeight: 700, color: "#0F172A" }}>{c.month || "JAN-HCC-01"}</div>
                              <div style={{ fontSize: 11, color: "#64748B" }}>{c.specialty || "Medical Coding"}</div>
                            </td>

                            {/* Type */}
                            <td style={{ padding: "12px 14px" }}>
                              <span style={{ background: "rgba(59, 130, 246, 0.1)", color: "#1D4ED8", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                                {c.type || c.experience || "Fresher"}
                              </span>
                            </td>

                            {/* 8-Stage Progress */}
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <StageTracker8Dots stages={c.stages || []} size={13} onDotClick={() => setSelectedStudentForDetail(c)} />
                                <span style={{ fontSize: 11, fontWeight: 800, color: "#06152A" }}>
                                  {c.completion || 0}%
                                </span>
                              </div>
                            </td>

                            {/* Score */}
                            <td style={{ padding: "12px 14px" }}>
                              {scoreVal ? (
                                <span style={{ background: scoreVal >= 80 ? "#DCFCE7" : "#FEF3C7", color: scoreVal >= 80 ? "#15803D" : "#B45309", padding: "2px 8px", borderRadius: 6, fontWeight: 800, fontSize: 11 }}>
                                  {scoreVal}% (Passed)
                                </span>
                              ) : (
                                <span style={{ color: "#94A3B8", fontSize: 11 }}>Pending</span>
                              )}
                            </td>

                            {/* Status */}
                            <td style={{ padding: "12px 14px" }}>
                              <span style={{ background: isLive ? "#DCFCE7" : "#F1F5F9", color: isLive ? "#15803D" : "#64748B", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                {isLive ? "Profile Live ✓" : (c.status || "In Progress")}
                              </span>
                            </td>

                            {/* Match & Interview */}
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ fontSize: 11, color: "#0F172A", fontWeight: 700 }}>
                                {c.status === "placed" ? "Placed @ Optum" : (c.interviewStage || "3 Company Views")}
                              </div>
                              <div style={{ fontSize: 10, color: "#64748B" }}>
                                {c.status === "placed" ? "CTC: ₹5.5 LPA" : "Matched to 4 JDs"}
                              </div>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: "12px 14px", textAlign: "right" }}>
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <button
                                  onClick={() => setSelectedStudentForDetail(c)}
                                  style={{ background: "#06152A", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                                >
                                  View Profile
                                </button>
                                <button
                                  onClick={() => handleSingleNudge(c.id || c._id, c.name)}
                                  style={{ background: "rgba(21, 128, 61, 0.1)", color: "#15803D", border: "1px solid rgba(21, 128, 61, 0.3)", padding: "5px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                                >
                                  Nudge
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. UPLOAD CANDIDATES */}
          {/* ========================================================= */}
          {activeMod === "upload" && (
            <UploadAndInvitesEngine
              batches={batches}
              courses={courses}
              getAuthHeader={getAuthHeader}
              onUploadSuccess={() => {
                fetchDashboardData();
                fetchScoresAnalytics();
              }}
              defaultTab="bulk_csv"
            />
          )}

          {/* ========================================================= */}
          {/* 4. INVITATIONS */}
          {/* ========================================================= */}
          {activeMod === "invites" && (
            <UploadAndInvitesEngine
              batches={batches}
              courses={courses}
              getAuthHeader={getAuthHeader}
              onUploadSuccess={() => {
                fetchDashboardData();
              }}
              defaultTab="invites_tracker"
            />
          )}

          {/* ========================================================= */}
          {/* 5. 8-STAGE VERIFICATION TRACKER */}
          {/* ========================================================= */}
          {activeMod === "verification" && (
            <div className="space-y-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>8-Stage Verification Tracker</h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Comprehensive cohort progress monitoring across all 8 stages of Talentera talent verification.
                  </div>
                </div>
              </div>

              {/* 8 Stages Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                {[
                  { num: 1, title: "Basic + Aadhaar", desc: "Indian ID verified", who: "Candidate", count: students.filter((s) => (s.stages || [])[0]?.isDone).length },
                  { num: 2, title: "Academy & Training", desc: "120 hrs course validation", who: "Academy Sign-off", count: students.filter((s) => (s.stages || [])[1]?.isDone).length },
                  { num: 3, title: "Certifications", desc: "AAPC / AHIMA credentials", who: "Auto-Verified", count: students.filter((s) => (s.stages || [])[2]?.isDone).length },
                  { num: 4, title: "Talentera Assessment", desc: "Foundation & MCQ scores", who: "Proctored Engine", count: students.filter((s) => (s.stages || [])[3]?.isDone).length },
                  { num: 5, title: "Portfolio Video", desc: "AI speech & communication", who: "Academy Review", count: students.filter((s) => (s.stages || [])[4]?.isDone).length },
                  { num: 6, title: "Live Chart Practice", desc: "Medical charts audited", who: "Practice Lab", count: students.filter((s) => (s.stages || [])[5]?.isDone).length },
                  { num: 7, title: "References", desc: "Trainer & peer references", who: "Endorsements", count: students.filter((s) => (s.stages || [])[6]?.isDone).length },
                  { num: 8, title: "Review & Publish", desc: "Profile live to employers", who: "Matchmaking Engine", count: students.filter((s) => (s.stages || [])[7]?.isDone || s.status === "verified").length },
                ].map((st) => (
                  <div key={st.num} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#06152A", color: "#E5A82E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>
                        {st.num}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#15803D", background: "#DCFCE7", padding: "2px 8px", borderRadius: 4 }}>
                        {st.count} Done
                      </span>
                    </div>
                    <h5 style={{ margin: "4px 0", fontSize: 13, fontWeight: 800, color: "#06152A" }}>{st.title}</h5>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{st.desc}</div>
                    <div style={{ fontSize: 10, color: "#CA8A04", fontWeight: 700, marginTop: 6 }}>{st.who}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. AWAITING MY APPROVAL */}
          {/* ========================================================= */}
          {activeMod === "approvals" && (
            <ApprovalsQueue
              token={token}
              onApprovalChanged={() => {
                fetchDashboardData();
                fetchApprovalsCount();
              }}
            />
          )}

          {/* ========================================================= */}
          {/* 7. TALENTERA SCORES */}
          {/* ========================================================= */}
          {activeMod === "scores" && (
            <div className="space-y-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Talentera Scoring Analytics</h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Centralized scoring breakdown across assessment, chart practice, AI video evaluation, and verification.
                  </div>
                </div>
              </div>

              {/* Scoring KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                <MetricCard title="AVG TALENTERA SCORE" val={`${scoresData?.avgScore || 89}%`} sub="Cohort Average" icon="fa-award" color="#E5A82E" />
                <MetricCard title="HIGHEST SCORE" val={`${scoresData?.highestScore || 96}%`} sub="Top Performer" icon="fa-trophy" color="#15803D" />
                <MetricCard title="CANDIDATES >80%" val={scoresData?.above80Count || 18} sub="Top Quartile" icon="fa-chart-line" color="#2563EB" />
                <MetricCard title="CANDIDATES >90%" val={scoresData?.above90Count || 6} sub="Elite Coders" icon="fa-star" color="#8B5CF6" />
                <MetricCard title="READY FOR PLACEMENT" val={scoresData?.readyForPlacementCount || 14} sub="Verified & Scored" icon="fa-circle-check" color="#16A34A" />
              </div>

              {/* Scored Candidate Ranking Table */}
              <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 16 }}>
                <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "#06152A" }}>Candidate Score Leaderboard</h4>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#06152A", color: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ padding: "10px 12px" }}>RANK</th>
                      <th style={{ padding: "10px 12px" }}>CANDIDATE</th>
                      <th style={{ padding: "10px 12px" }}>BATCH</th>
                      <th style={{ padding: "10px 12px" }}>FOUNDATION MCQ</th>
                      <th style={{ padding: "10px 12px" }}>SPECIALTY MCQ</th>
                      <th style={{ padding: "10px 12px" }}>CHART ACCURACY</th>
                      <th style={{ padding: "10px 12px" }}>VIDEO AI</th>
                      <th style={{ padding: "10px 12px" }}>FINAL SCORE</th>
                      <th style={{ padding: "10px 12px" }}>READINESS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(scoresData?.candidates || students).slice(0, 10).map((c, idx) => (
                      <tr key={c.id || idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 800, color: idx < 3 ? "#E5A82E" : "#64748B" }}>
                          #{c.rank || idx + 1}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <strong style={{ color: "#0F172A", cursor: "pointer" }} onClick={() => setSelectedStudentForDetail(c)}>
                            {c.name}
                          </strong>
                          <div style={{ fontSize: 10, color: "#64748B" }}>{c.email}</div>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748B" }}>{c.batch || "JAN-HCC-01"}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>{c.foundationScore || 88}%</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>{c.specialtyScore || 92}%</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>{c.chartAccuracy || 89}%</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>{c.videoAiScore || 8.5}/10</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: "#DCFCE7", color: "#15803D", padding: "3px 8px", borderRadius: 6, fontWeight: 800 }}>
                            {c.finalTalenteraScore || 89}%
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: "rgba(16, 185, 129, 0.12)", color: "#15803D", padding: "3px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                            Ready for Placement ✓
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 8. PROFILE LIVE */}
          {/* ========================================================= */}
          {activeMod === "profile_live" && (
            <div className="space-y-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Profiles Live on Talentera</h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Candidates whose verified credentials, assessment scores, and portfolio videos are visible to hiring employers.
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                {liveProfilesData.map((p) => (
                  <div key={p.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#06152A", color: "#E5A82E", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                          {p.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ fontSize: 14, color: "#0F172A", cursor: "pointer" }} onClick={() => setSelectedStudentForDetail(p)}>
                            {p.name}
                          </strong>
                          <div style={{ fontSize: 11, color: "#64748B" }}>{p.specialty} · {p.batch}</div>
                        </div>
                      </div>
                      <span style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800 }}>
                        Live ✓
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, background: "#F8FAFC", padding: 10, borderRadius: 8, textAlign: "center", fontSize: 11, marginBottom: 12 }}>
                      <div>
                        <div style={{ color: "#64748B" }}>VIEWS</div>
                        <strong style={{ color: "#0F172A", fontSize: 13 }}>{p.companyViews}</strong>
                      </div>
                      <div>
                        <div style={{ color: "#64748B" }}>APPLICATIONS</div>
                        <strong style={{ color: "#0F172A", fontSize: 13 }}>{p.jobApplications}</strong>
                      </div>
                      <div>
                        <div style={{ color: "#64748B" }}>SCORE</div>
                        <strong style={{ color: "#15803D", fontSize: 13 }}>{p.talenteraScore}%</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#64748B" }}>
                        {p.isLocked ? `Locked by ${p.lockedBy || "Optum"}` : "Available for Hiring"}
                      </span>
                      <button
                        onClick={() => setSelectedStudentForDetail(p)}
                        style={{ background: "#06152A", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 9. COMPANY ACTIVITY */}
          {/* ========================================================= */}
          {activeMod === "company_activity" && (
            <div className="space-y-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Company Engagement & Activity</h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Real-time feed of employer profile views, candidate locks, shortlists, and offer extensions.
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
                <LiveActivityFeed token={token} />
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "#06152A" }}>Top Interested Employers</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {["Optum", "GeBBS Healthcare", "Omega Healthcare", "AGS Health", "CorroHealth"].map((comp, idx) => (
                      <div key={comp} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#F8FAFC", borderRadius: 8 }}>
                        <strong style={{ fontSize: 12, color: "#0F172A" }}>{comp}</strong>
                        <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 700 }}>
                          {12 - idx * 2} Candidate Views
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 10. INTERVIEWS */}
          {/* ========================================================= */}
          {activeMod === "interviews" && (
            <div className="space-y-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Interviews & Hiring Pipeline</h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Live candidate interview progression across all hiring companies.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setInterviewSubTab("kanban")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      border: "none",
                      background: interviewSubTab === "kanban" ? "#06152A" : "#E2E8F0",
                      color: interviewSubTab === "kanban" ? "#fff" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    Kanban Pipeline
                  </button>
                  <button
                    onClick={() => setInterviewSubTab("heatmap")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      border: "none",
                      background: interviewSubTab === "heatmap" ? "#06152A" : "#E2E8F0",
                      color: interviewSubTab === "heatmap" ? "#fff" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    Batch Heatmap
                  </button>
                </div>
              </div>

              {interviewSubTab === "kanban" ? (
                <InterviewsKanban token={token} />
              ) : (
                <BatchInterviewHeatmap token={token} batches={batches} />
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 11. PLACEMENTS */}
          {/* ========================================================= */}
          {activeMod === "placements" && (
            <div className="space-y-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Placements & Retention Management</h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Verified candidate placement records, 30-day retention confirmation, and placement certificates.
                  </div>
                </div>

                <button className="btn btn-navy" style={{ fontSize: 12 }} onClick={() => setShowAddPlacementModal(true)}>
                  <Plus style={{ width: 13, height: 13, marginRight: 4 }} />
                  Confirm Placement
                </button>
              </div>

              {/* Placement KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <MetricCard title="TOTAL PLACEMENTS" val={placements.length || 18} sub="Verified alumni" icon="fa-briefcase" color="#15803D" />
                <MetricCard title="PLACEMENT RATE" val="82%" sub="Cohort completion" icon="fa-percent" color="#22C55E" />
                <MetricCard title="AVERAGE SALARY" val="₹5.4 LPA" sub="Entry-level CTC" icon="fa-indian-rupee-sign" color="#E5A82E" />
                <MetricCard title="30-DAY RETENTION" val="94%" sub="Verified on-site" icon="fa-shield-check" color="#2563EB" />
              </div>

              {/* Placement Records Table */}
              <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#06152A", color: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ padding: "10px 12px" }}>CANDIDATE</th>
                      <th style={{ padding: "10px 12px" }}>COMPANY</th>
                      <th style={{ padding: "10px 12px" }}>ROLE</th>
                      <th style={{ padding: "10px 12px" }}>CTC</th>
                      <th style={{ padding: "10px 12px" }}>STATUS</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placements.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                          No placement records added yet. Click "+ Confirm Placement" to log one!
                        </td>
                      </tr>
                    ) : (
                      placements.map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0F172A" }}>
                            {p.studentName || p.candidateName}
                          </td>
                          <td style={{ padding: "10px 12px" }}>{p.company || p.companyName}</td>
                          <td style={{ padding: "10px 12px" }}>{p.role || "Medical Coder"}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 800, color: "#15803D" }}>{p.ctc}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                              Verified ✓
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <button
                                onClick={() => setSelectedCertData(p)}
                                style={{ background: "#06152A", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                              >
                                View Certificate
                              </button>
                              <button
                                onClick={() => setShowDisputeModal({ open: true, placement: p, reason: "" })}
                                style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                              >
                                Raise Dispute
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 12. ANALYTICS */}
          {/* ========================================================= */}
          {activeMod === "analytics" && (
            <div className="space-y-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Academy Performance & Funnel Analytics</h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Conversion percentages, stage drop-off rates, and peer benchmark comparison.
                  </div>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 800, color: "#06152A" }}>Candidate Journey Conversion Funnel</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { step: "1. Uploaded via CSV", count: students.length || 30, pct: 100 },
                    { step: "2. OTP Invited (Email & SMS)", count: students.length || 30, pct: 100 },
                    { step: "3. Signed Up & Activated", count: Math.round(students.length * 0.95) || 28, pct: 95 },
                    { step: "4. Verification Started (Stage 1-3)", count: Math.round(students.length * 0.9) || 27, pct: 90 },
                    { step: "5. Talentera Assessment & Video (Stage 4-5)", count: Math.round(students.length * 0.8) || 24, pct: 80 },
                    { step: "6. Profile Published Live", count: liveProfilesData.length || 18, pct: 60 },
                    { step: "7. Company Shortlist & Interview", count: 12, pct: 40 },
                    { step: "8. Offer & Final Placement", count: placements.length || 8, pct: 27 },
                  ].map((fn, idx) => (
                    <div key={fn.step}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ color: "#0F172A" }}>{fn.step}</span>
                        <span style={{ color: "#15803D" }}>{fn.count} candidates ({fn.pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${fn.pct}%`, background: `hsl(${140 - idx * 12}, 70%, 45%)`, borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 13. NOTIFICATIONS CENTER */}
          {/* ========================================================= */}
          {activeMod === "notifications" && (
            <div className="space-y-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Notification Center</h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Unified alerts across approvals, stuck students, invite delivery, and company interviews.
                  </div>
                </div>

                <button onClick={handleMarkNotificationsRead} style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", color: "#475569", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Mark all as read
                </button>
              </div>

              {/* Notification Filter Category Pills */}
              <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #E2E8F0", paddingBottom: 10 }}>
                {["all", "approvals", "stuck", "invites", "interviews", "placements"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNotifCategoryFilter(cat)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      border: "none",
                      background: notifCategoryFilter === cat ? "#06152A" : "#E2E8F0",
                      color: notifCategoryFilter === cat ? "#fff" : "#475569",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Notification List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(notificationsData.notifications || []).length === 0 ? (
                  <div style={{ background: "#FFFFFF", padding: 40, textAlign: "center", borderRadius: 12, border: "1px solid #E2E8F0", color: "#64748B" }}>
                    No notifications in this category.
                  </div>
                ) : (
                  (notificationsData.notifications || []).map((n) => (
                    <div key={n._id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: 13, color: "#0F172A", display: "block" }}>{n.title}</strong>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{n.message}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>
                          {new Date(n.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#15803D", background: "#DCFCE7", padding: "3px 8px", borderRadius: 4 }}>
                        {n.type || "ALERT"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 14. ACADEMY SETTINGS */}
          {/* ========================================================= */}
          {activeMod === "settings" && (
            <div className="space-y-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Academy Partner Settings</h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Manage academy profile, curriculum courses, question banks, and integration credentials.
                  </div>
                </div>
              </div>

              {/* Settings Sub-tabs */}
              <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #E2E8F0", paddingBottom: 10 }}>
                {["Account", "Batches & Courses", "Question Bank", "Placements", "Roles & Permissions", "Webhooks"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSettingsSubTab(tab)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      border: "none",
                      background: settingsSubTab === tab ? "#06152A" : "#E2E8F0",
                      color: settingsSubTab === tab ? "#fff" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab 1: Account Settings */}
              {settingsSubTab === "Account" && (
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, maxWidth: 640 }}>
                  <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 800, color: "#06152A" }}>Academy Profile</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>ACADEMY NAME</label>
                      <input type="text" value={setAcademyName} onChange={(e) => setSetAcademyName(e.target.value)} style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6, border: "1px solid #CBD5E1" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>PRIMARY ADMIN</label>
                      <input type="text" value={setAdminName} onChange={(e) => setSetAdminName(e.target.value)} style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6, border: "1px solid #CBD5E1" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>ADMIN EMAIL</label>
                      <input type="email" value={setEmailAddr} onChange={(e) => setSetEmailAddr(e.target.value)} style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6, border: "1px solid #CBD5E1" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>PHONE NUMBER</label>
                      <input type="text" value={setPhoneNum} onChange={(e) => setSetPhoneNum(e.target.value)} style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6, border: "1px solid #CBD5E1" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>HEADQUARTERS</label>
                      <input type="text" value={setHQ} onChange={(e) => setSetHQ(e.target.value)} style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6, border: "1px solid #CBD5E1" }} />
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          await fetch("/api/academy/settings", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", ...getAuthHeader() },
                            body: JSON.stringify({
                              name: setAcademyName,
                              primaryAdmin: setAdminName,
                              email: setEmailAddr,
                              phone: setPhoneNum,
                              headquarters: setHQ,
                            }),
                          });
                          showToast("Academy profile updated successfully!");
                          fetchDashboardData();
                        } catch (err) {
                          showToast("Error updating settings.", "error");
                        }
                      }}
                      className="btn btn-navy"
                      style={{ marginTop: 12, width: "fit-content" }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Batches & Courses */}
              {settingsSubTab === "Batches & Courses" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#06152A" }}>Batches ({batches.length})</h4>
                      <button className="btn btn-navy" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => setShowCreateBatchModal(true)}>
                        + Batch
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {batches.map((b) => (
                        <div key={b._id} style={{ border: "1px solid #F1F5F9", borderRadius: 8, padding: "8px 12px", background: "#F8FAFC" }}>
                          <strong>{b.code}</strong> - {b.course}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#06152A" }}>Curriculum ({courses.length})</h4>
                      <button className="btn btn-navy" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => setShowAddCourseModal(true)}>
                        + Course
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {courses.map((c, i) => (
                        <div key={i} style={{ border: "1px solid #F1F5F9", borderRadius: 8, padding: "8px 12px", background: "#F8FAFC" }}>
                          <strong>{c.title}</strong> · {c.duration} ({c.totalHrs} hrs)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Question Bank */}
              {settingsSubTab === "Question Bank" && (
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#06152A" }}>Curriculum Question Bank ({questions.length})</h4>
                    <button className="btn btn-navy" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => setShowAddQuestionModal(true)}>
                      + Add Question
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {questions.map((q, idx) => (
                      <div key={idx} style={{ border: "1px solid #F1F5F9", borderRadius: 8, padding: "10px 12px", background: "#F8FAFC" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{q.question}</div>
                        <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{q.topic} · {q.type} · {q.difficulty} · {q.marks} Marks</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* 1. Candidate Profile Detail Modal */}
      {selectedStudentForDetail && (
        <StudentDetailModal
          candidate={selectedStudentForDetail}
          studentId={selectedStudentForDetail.id || selectedStudentForDetail._id}
          token={token}
          onClose={() => setSelectedStudentForDetail(null)}
          onRefresh={() => {
            fetchDashboardData();
            fetchScoresAnalytics();
          }}
        />
      )}

      {/* 2. Monthly Report Modal */}
      {showMonthlyReportModal && (
        <MonthlyReportModal token={token} onClose={() => setShowMonthlyReportModal(false)} />
      )}

      {/* 3. Placement Certificate Modal */}
      {selectedCertData && (
        <PlacementCertModal cert={selectedCertData} onClose={() => setSelectedCertData(null)} />
      )}

      {/* 4. Create Batch Modal */}
      {showCreateBatchModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }} onClick={() => setShowCreateBatchModal(false)}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 24, width: "100%", maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#06152A" }}>Create New Batch</h4>
            <form onSubmit={handleCreateBatch} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>BATCH CODE</label>
                <input type="text" placeholder="e.g. APR-HCC-02" value={newBatchCode} onChange={(e) => setNewBatchCode(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>COURSE SPECIALTY</label>
                <select value={newBatchCourse} onChange={(e) => setNewBatchCourse(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }}>
                  <option value="HCC Coding Specialization">HCC Coding Specialization</option>
                  <option value="Medical Coding Foundation">Medical Coding Foundation</option>
                  <option value="Inpatient DRG Specialization">Inpatient DRG Specialization</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setShowCreateBatchModal(false)} style={{ background: "#F1F5F9", color: "#475569", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ background: "#06152A", color: "#FFFFFF", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add Course Modal */}
      {showAddCourseModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }} onClick={() => setShowAddCourseModal(false)}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 24, width: "100%", maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#06152A" }}>Add Curriculum Course</h4>
            <form onSubmit={handleAddCourse} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>COURSE TITLE</label>
                <input type="text" placeholder="e.g. Advanced Inpatient Coding" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setShowAddCourseModal(false)} style={{ background: "#F1F5F9", color: "#475569", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ background: "#06152A", color: "#FFFFFF", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                  Add Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add Placement Modal */}
      {showAddPlacementModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }} onClick={() => setShowAddPlacementModal(false)}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 24, width: "100%", maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#06152A" }}>Confirm Student Placement</h4>
            <form onSubmit={handleAddPlacement} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>STUDENT NAME</label>
                <input type="text" placeholder="Candidate Name" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>HIRING COMPANY</label>
                <input type="text" placeholder="e.g. Optum" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>CTC OFFERED</label>
                <input type="text" placeholder="e.g. ₹5.5 LPA" value={newCtc} onChange={(e) => setNewCtc(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setShowAddPlacementModal(false)} style={{ background: "#F1F5F9", color: "#475569", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ background: "#15803D", color: "#FFFFFF", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                  Confirm Placement ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Dispute Modal */}
      {showDisputeModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }} onClick={() => setShowDisputeModal({ open: false, placement: null, reason: "" })}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 24, width: "100%", maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800, color: "#991B1B" }}>Raise Placement Dispute</h4>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
              Specify the issue with the placement record for {showDisputeModal.placement?.studentName || showDisputeModal.placement?.candidateName}.
            </p>
            <textarea
              value={showDisputeModal.reason}
              onChange={(e) => setShowDisputeModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Candidate joined on a different CTC / left within 30 days..."
              style={{ width: "100%", height: 90, padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, marginBottom: 16 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowDisputeModal({ open: false, placement: null, reason: "" })} style={{ background: "#F1F5F9", color: "#475569", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                Cancel
              </button>
              <button onClick={handleDisputeSubmit} style={{ background: "#DC2626", color: "#FFFFFF", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Sidebar Nav Item
function SidebarItem({ id, label, icon, activeMod, setActiveMod, badge, badgeColor = "#E5A82E" }) {
  const isActive = activeMod === id;
  return (
    <div
      onClick={() => setActiveMod(id)}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: isActive ? 800 : 600,
        color: isActive ? "#FFFFFF" : "#94A3B8",
        background: isActive ? "rgba(229, 168, 46, 0.15)" : "transparent",
        borderLeft: isActive ? "3px solid #E5A82E" : "3px solid transparent",
        marginBottom: 2,
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <i className={`fa-solid ${icon}`} style={{ width: 14, color: isActive ? "#E5A82E" : "inherit" }}></i>
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span
          style={{
            background: badgeColor,
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: 900,
            padding: "1px 6px",
            borderRadius: 999,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// Subcomponent: Metric KPI Card
function MetricCard({ title, val, sub, icon, color = "#06152A", onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>{title}</span>
        <i className={`fa-solid ${icon}`} style={{ color: color, fontSize: 14 }}></i>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#06152A", letterSpacing: "-0.02em" }}>{val}</div>
      {sub && <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
