import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { safeJson } from "../utils/safeJson.js";

export default function AcademyPortal() {
  const navigate = useNavigate();
  // Sidebar Navigation Tabs: home | candidates | batches | courses | questionbank | assessments | videoquality | placements | insights | settings
  const [activeMod, setActiveMod] = useState("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Backend Data State
  const [dashData, setDashData] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Filter States
  const [candidateFilter, setCandidateFilter] = useState("All");
  const [batchTabFilter, setBatchTabFilter] = useState("All");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [videoFilter, setVideoFilter] = useState("all");
  const [questionCourseFilter, setQuestionCourseFilter] = useState("All");
  const [settingsSubTab, setSettingsSubTab] = useState("Account");

  // Modals
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showUploadStudentsModal, setShowUploadStudentsModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showAddPlacementModal, setShowAddPlacementModal] = useState(false);
  const [showEditSettingsModal, setShowEditSettingsModal] = useState(false);
  const [showAddIndividualStudentModal, setShowAddIndividualStudentModal] = useState(false);
  const [selectedBatchRoster, setSelectedBatchRoster] = useState(null);

  // Batch Creation Inputs & Mode (Individual vs Bulk CSV Upload)
  const [newBatchCode, setNewBatchCode] = useState("");
  const [newBatchCourse, setNewBatchCourse] = useState("HCC Coding Specialization");
  const [newBatchBranch, setNewBatchBranch] = useState("Coimbatore");
  const [newBatchPath, setNewBatchPath] = useState("Path B ✓");
  const [batchEnrollmentMode, setBatchEnrollmentMode] = useState("individual"); // "individual" | "bulk"
  const [batchCsvFile, setBatchCsvFile] = useState(null);
  const [batchStudentsList, setBatchStudentsList] = useState([
    { fullName: "", email: "", mobile: "" },
  ]);

  // Individual Student Registration Inputs
  const [indivName, setIndivName] = useState("");
  const [indivEmail, setIndivEmail] = useState("");
  const [indivMobile, setIndivMobile] = useState("");
  const [indivCourse, setIndivCourse] = useState("HCC Coding Specialization");
  const [indivBatchCode, setIndivBatchCode] = useState("JAN-HCC-01");
  const [indivBranch, setIndivBranch] = useState("Coimbatore");

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

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadBatchName, setUploadBatchName] = useState("JAN-HCC-01");

  // Settings Edit Inputs
  const [setAcademyName, setSetAcademyName] = useState("");
  const [setAdminName, setSetAdminName] = useState("");
  const [setEmailAddr, setSetEmailAddr] = useState("");
  const [setPhoneNum, setSetPhoneNum] = useState("");
  const [setSpecialtyName, setSetSpecialtyName] = useState("");
  const [setHQ, setSetHQ] = useState("");

  const getAuthHeader = () => {
    const token = localStorage.getItem("talentera_academy_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
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
          setSetAcademyName(data.academy.name || "sdfds");
          setSetAdminName(data.academy.primaryAdmin || "sdfd");
          setSetEmailAddr(data.academy.email || "aaaa@gmail.com");
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real cross-academy benchmark data (Insights tab) - fetched on demand since it's a
  // heavier aggregate query across every academy, not part of the main dashboard payload.
  const fetchInsightsData = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/academy/insights", {
        headers: { ...getAuthHeader() },
      });
      if (res.status === 401) {
        navigate("/academy/login");
        return;
      }
      const data = await safeJson(res);
      if (data) setInsightsData(data);
    } catch (err) {
      console.error("Fetch insights error:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (activeMod === "insights") {
      fetchInsightsData();
    }
  }, [activeMod]);

  const downloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(
      "FullName,Email,Mobile,Course,BatchName\n" +
      "Karthik Subramanian,karthik.s@example.com,+91 9876543210,CPC Certified Medical Coding,JAN-HCC-02\n" +
      "Ananya Roy,ananya.roy@example.com,+91 9812345678,Healthcare RCM Executive,JAN-HCC-02\n"
    );
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "talentera_batch_roster_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handlers for Batch Roster Rows
  const handleAddBatchStudentRow = () => {
    setBatchStudentsList((prev) => [...prev, { fullName: "", email: "", mobile: "" }]);
  };

  const handleRemoveBatchStudentRow = (idx) => {
    setBatchStudentsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleBatchStudentChange = (idx, field, val) => {
    setBatchStudentsList((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  // --- HANDLERS TO POST / PUT DATA TO BACKEND ---

  const handleCreateBatchSubmit = async (e) => {
    e.preventDefault();
    if (!newBatchCode) {
      alert("Batch Code is required.");
      return;
    }
    setSaving(true);
    try {
      if (batchEnrollmentMode === "bulk" && batchCsvFile) {
        // Bulk Upload CSV mode
        const formData = new FormData();
        formData.append("file", batchCsvFile);
        formData.append("batchName", newBatchCode);

        const res = await fetch("/api/academy/upload-students", {
          method: "POST",
          headers: { ...getAuthHeader() },
          body: formData,
        });
        const data = await safeJson(res);
        if (res.ok) {
          alert(data.message || `Batch ${newBatchCode} created with CSV student roster!`);
          setShowCreateBatchModal(false);
          setNewBatchCode("");
          setBatchCsvFile(null);
          fetchDashboardData();
        } else {
          alert(data.message || "Failed to upload CSV batch roster.");
        }
      } else {
        // Individual Student Rows mode
        const validStudents = batchStudentsList.filter((s) => s.fullName.trim() !== "" && s.email.trim() !== "");
        const res = await fetch("/api/academy/create-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          body: JSON.stringify({
            code: newBatchCode,
            course: newBatchCourse,
            branch: newBatchBranch,
            path: newBatchPath,
            studentsList: validStudents,
          }),
        });
        const data = await safeJson(res);
        if (res.ok) {
          alert(data.message || "Batch created successfully!");
          setShowCreateBatchModal(false);
          setNewBatchCode("");
          setBatchStudentsList([{ fullName: "", email: "", mobile: "" }]);
          fetchDashboardData();
        } else {
          alert(data.message || "Failed to create batch.");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddIndividualStudentSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/academy/add-student", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          fullName: indivName,
          email: indivEmail,
          mobile: indivMobile,
          course: indivCourse,
          batchCode: indivBatchCode,
          branch: indivBranch,
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || "Student registered successfully!");
        setShowAddIndividualStudentModal(false);
        setIndivName("");
        setIndivEmail("");
        setIndivMobile("");
        fetchDashboardData();
      } else {
        alert(data.message || "Failed to register student.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCourseSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/academy/create-course", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ title: newCourseTitle, category: newCourseCategory, duration: newCourseDuration, totalHrs: Number(newCourseHrs), syllabus: newCourseSyllabus }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || "Course created!");
        setShowAddCourseModal(false);
        setNewCourseTitle("");
        fetchDashboardData();
      } else {
        alert(data.message || "Failed to create course.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestionSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/academy/add-question", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ question: newQuestionText, topic: newQuestionTopic, type: newQuestionType, difficulty: newQuestionDiff, marks: Number(newQuestionMarks), courseTitle: questionCourseFilter }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || "Question added!");
        setShowAddQuestionModal(false);
        setNewQuestionText("");
        fetchDashboardData();
      } else {
        alert(data.message || "Failed to add question.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPlacementSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/academy/add-placement", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ studentName: newStudentName, role: newStudentRole, company: newCompany, city: newCity, ctc: newCtc }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || "Placement record added!");
        setShowAddPlacementModal(false);
        setNewStudentName("");
        fetchDashboardData();
      } else {
        alert(data.message || "Failed to add placement.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettingsSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/academy/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ name: setAcademyName, primaryAdmin: setAdminName, email: setEmailAddr, phone: setPhoneNum, specialty: setSpecialtyName, headquarters: setHQ }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || "Settings updated!");
        setShowEditSettingsModal(false);
        fetchDashboardData();
      } else {
        alert(data.message || "Failed to update settings.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadStudentsSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      if (uploadFile) {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("batchName", uploadBatchName);
        res = await fetch("/api/academy/upload-students", {
          method: "POST",
          headers: { ...getAuthHeader() },
          body: formData,
        });
      } else {
        res = await fetch("/api/academy/upload-students", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          body: JSON.stringify({ batchName: uploadBatchName, count: 5 }),
        });
      }
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || "Students uploaded!");
        setShowUploadStudentsModal(false);
        setUploadFile(null);
        fetchDashboardData();
      } else {
        alert(data.message || "Upload failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBatch = async (batchId, batchCode) => {
    if (!window.confirm(`Are you sure you want to delete batch ${batchCode}?`)) return;
    try {
      const res = await fetch(`/api/academy/batch/${batchId}`, {
        method: "DELETE",
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        alert(`Batch ${batchCode} deleted.`);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllData = async () => {
    if (!window.confirm("⚠️ This will permanently delete ALL candidates and batches linked to your academy. This cannot be undone. Are you sure?")) return;
    if (!window.confirm("Final confirmation: Delete ALL students and batches now?")) return;
    try {
      setSaving(true);
      const res = await fetch("/api/academy/clear-all", {
        method: "DELETE",
        headers: { ...getAuthHeader() },
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        fetchDashboardData();
      } else {
        alert(data.message || "Failed to clear data.");
      }
    } catch (err) {
      console.error(err);
      alert("Error clearing data.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>Loading Academy Partner Portal from Backend...</div>;
  }

  const { academy = {}, kpis = {}, students = [], batches = [], courses = [], questions = [], placements = [] } = dashData || {};

  // Candidate filtering
  const filteredCandidates = students.filter((s) => {
    const matchesSearch = !candidateSearch || s.name.toLowerCase().includes(candidateSearch.toLowerCase()) || s.specialty.toLowerCase().includes(candidateSearch.toLowerCase());
    if (candidateFilter === "All 10" || candidateFilter.startsWith("All")) return matchesSearch;
    return matchesSearch && s.status.toLowerCase() === candidateFilter.split(" ")[0].toLowerCase();
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Inter', sans-serif", color: "#0F172A" }}>
      {/* ====== TOP NAVBAR HEADER ====== */}
      <header style={{ background: "#06152A", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/logo.png" alt="Talentera" style={{ height: 26, width: "auto" }} />
          <span style={{ color: "#94A3B8", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>
            ACADEMY PARTNER PORTAL
          </span>
        </div>

        {/* Middle Branch Switcher Pill */}
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "4px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#fff" }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#E5A82E", color: "#06152A", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>SC</span>
          <span><strong>{academy.primaryAdmin || "sdfd"}</strong> Admin · 4 branches</span>
        </div>

        {/* Exit Button */}
        <button
          onClick={() => {
            localStorage.removeItem("talentera_academy_token");
            navigate("/academy/login");
          }}
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          ← Exit
        </button>
      </header>

      {/* ====== MAIN SHELL WITH SIDEBAR & CONTENT AREA ====== */}
      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", minHeight: "calc(100vh - 51px)" }}>
        {/* ====== LEFT SIDEBAR ====== */}
        <aside style={{ background: "#06152A", color: "#94A3B8", padding: "20px 12px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Top Partner Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
            <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#E5A82E", color: "#06152A", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>SC</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{academy.name || "sdfds"}</div>
              <div style={{ color: "#E5A82E", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>VERIFIED PARTNER</div>
            </div>
          </div>

          {/* Nav Sections */}
          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", padding: "0 8px 6px", textTransform: "uppercase" }}>OVERVIEW</div>
          <SidebarItem id="home" label="Home" icon="fa-house" activeMod={activeMod} setActiveMod={setActiveMod} />

          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", padding: "16px 8px 6px", textTransform: "uppercase" }}>STUDENTS</div>
          <SidebarItem id="candidates" label="Candidates" icon="fa-user-group" activeMod={activeMod} setActiveMod={setActiveMod} badge={students.length > 0 ? students.length : undefined} />
          <SidebarItem id="batches" label="Batches" icon="fa-layer-group" activeMod={activeMod} setActiveMod={setActiveMod} />
          <SidebarItem id="courses" label="Courses" icon="fa-book-open" activeMod={activeMod} setActiveMod={setActiveMod} />

          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", padding: "16px 8px 6px", textTransform: "uppercase" }}>ASSESSMENT</div>
          <SidebarItem id="questionbank" label="Question Bank" icon="fa-file-signature" activeMod={activeMod} setActiveMod={setActiveMod} />
          <SidebarItem id="assessments" label="Assessments" icon="fa-chart-simple" activeMod={activeMod} setActiveMod={setActiveMod} />
          <SidebarItem id="videoquality" label="Video Quality" icon="fa-video" activeMod={activeMod} setActiveMod={setActiveMod} badge="5" badgeColor="#E5A82E" />

          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", padding: "16px 8px 6px", textTransform: "uppercase" }}>OUTCOMES</div>
          <SidebarItem id="placements" label="Placements" icon="fa-briefcase" activeMod={activeMod} setActiveMod={setActiveMod} />
          <SidebarItem id="insights" label="Insights" icon="fa-chart-line" activeMod={activeMod} setActiveMod={setActiveMod} />

          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", padding: "16px 8px 6px", textTransform: "uppercase" }}>ACCOUNT</div>
          <SidebarItem id="settings" label="Settings" icon="fa-gear" activeMod={activeMod} setActiveMod={setActiveMod} />
          <div onClick={() => { localStorage.removeItem("talentera_academy_token"); navigate("/academy/login"); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.5)", cursor: "pointer", marginTop: 4 }}>
            <i className="fa-solid fa-right-from-bracket" style={{ width: 16 }}></i> Sign out
          </div>
        </aside>

        {/* ====== CONTENT AREA ====== */}
        <main style={{ padding: 24, overflowX: "hidden" }}>
          {/* 1. HOME OVERVIEW VIEW */}
          {activeMod === "home" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#E5A82E", letterSpacing: "0.08em" }}>27 JANUARY 2026 · LIVE SNAPSHOT</div>
                  <h2 style={{ margin: "2px 0 4px", fontSize: 22, fontWeight: 800, color: "#06152A" }}>Good morning, {academy.primaryAdmin || "dfgfd"} 👋</h2>
                  <div style={{ fontSize: 12, color: "#64748B" }}>Here's how {academy.name || "sdfds"} is performing this january. Click any module on the left to drill in.</div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, background: "#fff", fontWeight: 600 }}>
                    <option>January 2026</option>
                  </select>
                  <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => setShowCreateBatchModal(true)}>Create Batch</button>
                  <button className="btn btn-navy" style={{ fontSize: 12 }} onClick={() => setActiveMod("insights")}>View Insights</button>
                </div>
              </div>

              {/* 5 Metric Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
                <MetricCard title="TOTAL STUDENTS" val={kpis.totalStudents ?? 0} sub={students.length > 0 ? "Active students" : "No students enrolled"} icon="fa-user-group" />
                <MetricCard title="ACTIVE BATCHES" val={batches.length ?? 0} sub={batches.length > 0 ? "Active batches" : "No active batches"} icon="fa-layer-group" color="#22C55E" />
                <MetricCard title="AVG TALENTERA SCORE" val={`${students.length > 0 ? (kpis.avgScore || 0) : 0}%`} sub={students.length > 0 ? "Verified avg" : "No score data"} icon="fa-award" color="#E5A82E" />
                <MetricCard title="PROFILE COMPLETE" val={`${students.length > 0 ? (kpis.profileComplete || 0) : 0}%`} sub={students.length > 0 ? "Across all active" : "No profile data"} icon="fa-circle-check" color="#7E22CE" />
                <MetricCard title="PLACEMENTS (MONTH)" val={kpis.placementsMonth || 0} sub="Placed this month" icon="fa-briefcase" color="#DC2626" />
              </div>

              {/* Main Split */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
                <div>
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "#06152A" }}>
                      Needs your attention <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>{students.filter(s => s.status === "verifying" || s.completion === "0%").length} items waiting</span>
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {students.length === 0 ? (
                        <div style={{ padding: "16px 14px", fontSize: 12, color: "#64748B", background: "#fff", borderRadius: 10, border: "1px dashed #CBD5E1" }}>
                          ✓ No items pending attention. Create a batch or enroll students to get started.
                        </div>
                      ) : (
                        <>
                          {students.filter(s => s.completion === "0%").length > 0 && (
                            <AttentionCard bg="#FEFCE8" border="#FEF08A" icon="fa-video" iconColor="#CA8A04" title={`${students.filter(s => s.completion === "0%").length} student(s) at 0% verification`} sub="Profile stages pending completion by student candidate" btnText="Review" btnAction={() => setActiveMod("candidates")} />
                          )}
                          {students.filter(s => s.status === "verifying").length > 0 && (
                            <AttentionCard bg="#EFF6FF" border="#BFDBFE" icon="fa-user-pen" iconColor="#2563EB" title={`${students.filter(s => s.status === "verifying").length} candidate(s) in verification process`} sub="Stage 1-4 active — send reminder nudge" btnText="Send nudge" btnAction={() => setActiveMod("candidates")} />
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#06152A" }}>Active batches</h4>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", cursor: "pointer" }} onClick={() => setActiveMod("batches")}>View all →</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {batches.length === 0 ? (
                        <div style={{ padding: "16px 14px", fontSize: 12, color: "#64748B", background: "#fff", borderRadius: 10, border: "1px dashed #CBD5E1", textAlign: "center" }}>
                          No active batches created yet. Click "+ Create Batch" to start!
                        </div>
                      ) : (
                        batches.slice(0, 2).map((b, idx) => (
                          <div key={b._id || idx} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #E2E8F0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <div>
                                <span style={{ fontSize: 10, fontWeight: 800, color: "#64748B" }}>{b.code} · Path B ✓</span>
                                <h5 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#06152A" }}>{b.course}</h5>
                              </div>
                              <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>Active</span>
                            </div>

                            <div style={{ display: "flex", gap: 24, fontSize: 12, color: "#64748B", marginBottom: 8 }}>
                              <div><strong>{b.studentsCount || 0}</strong> STUDENTS</div>
                              <div><strong>0</strong> AVG SCORE</div>
                              <div><strong>0%</strong> PLACED</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #E2E8F0" }}>
                  <h4 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 800, color: "#06152A" }}>Activity</h4>
                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 14 }}>Latest Student Updates</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 11 }}>
                    {students.length === 0 ? (
                      <div style={{ color: "#94A3B8", fontStyle: "italic", fontSize: 11 }}>No student activity logged yet.</div>
                    ) : (
                      students.slice(0, 5).map((st, i) => (
                        <ActivityItem key={st.id || i} color="#2563EB" text={`${st.name} enrolled in ${st.month}`} sub={`${st.specialty} · ${st.branch || "Coimbatore"}`} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. CANDIDATES VIEW */}
          {activeMod === "candidates" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Candidates</h2>
                  <div style={{ fontSize: 12, color: "#64748B" }}>All {students.length} students across your batches · Filter, search, drill into any profile.</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => setShowAddIndividualStudentModal(true)}>
                    + Add Student
                  </button>
                  <button className="btn btn-outline" style={{ fontSize: 12 }}><i className="fa-solid fa-download" style={{ marginRight: 6 }}></i> Export CSV</button>
                  <button className="btn btn-navy" style={{ fontSize: 12 }} onClick={() => setShowUploadStudentsModal(true)}>Upload Roster (CSV)</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                <input type="text" value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} placeholder="Search by name, specialty, or email..." style={{ width: 280, padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12 }} />
                <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                  {[
                    { id: "All", label: `All (${students.length})` },
                    { id: "Coimbatore", label: `Coimbatore (${students.filter(s => s.branch === "Coimbatore" || (s.month && s.month.includes("COIM"))).length})` },
                    { id: "Chennai", label: `Chennai (${students.filter(s => s.branch === "Chennai" || (s.month && s.month.includes("CHEN"))).length})` },
                    { id: "Uploaded", label: `Uploaded (${students.filter(s => s.status === "uploaded").length})` },
                    { id: "Verifying", label: `Verifying (${students.filter(s => s.status === "verifying").length})` },
                    { id: "Verified", label: `Verified (${students.filter(s => s.status === "verified").length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCandidateFilter(tab.id)}
                      style={{
                        padding: "6px 12px", borderRadius: 999, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                        background: candidateFilter === tab.id ? "#06152A" : "#E2E8F0",
                        color: candidateFilter === tab.id ? "#fff" : "#475569"
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {students.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 12, padding: "48px 20px", textAlign: "center", border: "1px dashed #CBD5E1" }}>
                  <i className="fa-solid fa-user-group" style={{ fontSize: 36, color: "#94A3B8", marginBottom: 12 }}></i>
                  <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#06152A" }}>No candidates registered yet</h4>
                  <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>Start by uploading a CSV student roster or creating a new batch with students.</p>
                  <button className="btn btn-navy" style={{ fontSize: 12 }} onClick={() => setShowCreateBatchModal(true)}>+ Create Batch & Enroll Students</button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
                  {students
                    .filter((s) => {
                      const matchesSearch = !candidateSearch || s.name.toLowerCase().includes(candidateSearch.toLowerCase()) || s.email.toLowerCase().includes(candidateSearch.toLowerCase());
                      if (candidateFilter === "All") return matchesSearch;
                      if (candidateFilter === "Coimbatore") return matchesSearch && (s.branch === "Coimbatore" || s.month.includes("COIM"));
                      if (candidateFilter === "Chennai") return matchesSearch && (s.branch === "Chennai" || s.month.includes("CHEN"));
                      return matchesSearch && s.status.toLowerCase() === candidateFilter.toLowerCase();
                    })
                    .map((cand) => (
                      <div key={cand.id} style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #E2E8F0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#FEF08A", color: "#854D0E", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{cand.initials}</span>
                            <div>
                              <strong style={{ fontSize: 13, color: "#06152A", display: "block" }}>{cand.name}</strong>
                              <span style={{ fontSize: 10, color: "#64748B" }}>{cand.specialty} · <strong>{cand.branch || "Coimbatore"}</strong></span>
                            </div>
                          </div>
                          <StatusBadge status={cand.status} />
                        </div>

                        <div style={{ fontSize: 11, color: "#64748B", display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Talentera score</span><strong style={{ color: "#06152A" }}>{cand.score}</strong></div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Verification progress</span><strong style={{ color: cand.completion === "0%" ? "#DC2626" : "#15803D" }}>{cand.completion}</strong></div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Batch Code</span><strong style={{ color: "#06152A" }}>{cand.month}</strong></div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><span>Status</span><span style={{ color: "#15803D", fontWeight: 700 }}>{cand.placementStatus}</span></div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 3. BATCHES VIEW */}
          {activeMod === "batches" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Batches</h2>
                  <div style={{ fontSize: 12, color: "#64748B" }}>Month-wise view of every batch you run · Drill into any batch for student-level metrics.</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, background: "#fff", fontWeight: 600 }}><option>January 2026</option></select>
                  <button className="btn btn-navy" style={{ fontSize: 12 }} onClick={() => setShowCreateBatchModal(true)}>+ Create Batch</button>
                </div>
              </div>

              {/* DYNAMIC BATCH FILTER TABS - CREATED ONLY WHEN BATCHES EXIST */}
              {(() => {
                const activeBatchesList = batches.filter((b) => students.filter((s) => s.month === b.code || (s.month && (s.month.includes(b.code) || b.code.includes(s.month)))).length > 0);
                if (activeBatchesList.length === 0) return null;
                return (
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
                    <button
                      onClick={() => setBatchTabFilter("All")}
                      style={{
                        padding: "6px 14px", borderRadius: 999, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                        background: batchTabFilter === "All" ? "#06152A" : "#E2E8F0",
                        color: batchTabFilter === "All" ? "#fff" : "#475569",
                      }}
                    >
                      All Batches ({activeBatchesList.length})
                    </button>
                    {activeBatchesList.map((b) => (
                      <button
                        key={b._id || b.code}
                        onClick={() => setBatchTabFilter(b.code)}
                        style={{
                          padding: "6px 14px", borderRadius: 999, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                          background: batchTabFilter === b.code ? "#06152A" : "#E2E8F0",
                          color: batchTabFilter === b.code ? "#fff" : "#475569",
                        }}
                      >
                        {b.code}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {batches.filter((b) => students.filter((s) => s.month === b.code || (s.month && (s.month.includes(b.code) || b.code.includes(s.month)))).length > 0).length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 12, padding: "48px 20px", textAlign: "center", border: "1px dashed #CBD5E1" }}>
                  <i className="fa-solid fa-layer-group" style={{ fontSize: 36, color: "#94A3B8", marginBottom: 12 }}></i>
                  <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#06152A" }}>No active batches with enrolled students</h4>
                  <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>Create a new batch and enroll student candidates to see active batches here.</p>
                  <button className="btn btn-navy" style={{ fontSize: 12 }} onClick={() => setShowCreateBatchModal(true)}>+ Create Batch & Enroll Students</button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                  {batches
                    .filter((b) => {
                      const count = students.filter((s) => s.month === b.code || (s.month && (s.month.includes(b.code) || b.code.includes(s.month)))).length;
                      if (count === 0) return false;
                      if (batchTabFilter === "All") return true;
                      return b.code === batchTabFilter;
                    })
                    .map((b) => {
                      const enrolledCount = students.filter((s) => s.month === b.code || (s.month && (s.month.includes(b.code) || b.code.includes(s.month)))).length;
                      return (
                        <div key={b._id || b.code} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #E2E8F0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: "#64748B" }}>{b.code} · Path B ✓</span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>Active</span>
                              {b._id && (
                                <button onClick={() => handleDeleteBatch(b._id, b.code)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 12 }} title="Delete Batch">✕</button>
                              )}
                            </div>
                          </div>
                          <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "#06152A" }}>{b.course}</h4>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11, color: "#64748B", marginBottom: 12 }}>
                            <div><strong style={{ fontSize: 14, color: "#06152A", display: "block" }}>{enrolledCount}</strong> STUDENTS</div>
                            <div><strong style={{ fontSize: 14, color: "#06152A", display: "block" }}>0</strong> AVG SCORE</div>
                            <div><strong style={{ fontSize: 14, color: "#06152A", display: "block" }}>0%</strong> PLACED</div>
                          </div>

                          <div style={{ fontSize: 10, color: "#94A3B8", display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                            <span>2026-01-08 – 2026-04-08</span>
                            <span>{b.completionPct || 0}% complete</span>
                          </div>

                          <button
                            className="btn btn-outline"
                            style={{ width: "100%", fontSize: 11, justifyContent: "center" }}
                            onClick={() => setSelectedBatchRoster(b)}
                          >
                            View Enrolled Students ({enrolledCount}) →
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* 4. COURSES VIEW */}
          {activeMod === "courses" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Courses</h2>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{courses.length} courses · Define curriculum, duration, syllabus topics for each specialty</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-outline" style={{ fontSize: 12 }}><i className="fa-solid fa-upload" style={{ marginRight: 6 }}></i> Import CSV</button>
                  <button className="btn btn-navy" style={{ fontSize: 12 }} onClick={() => setShowAddCourseModal(true)}>+ Add Course</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {courses.map((c, idx) => (
                  <div key={c._id || idx} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#64748B" }}>{c.category} · {c.duration}</span>
                      <span style={{ background: c.status === "active" ? "#DCFCE7" : "#F1F5F9", color: c.status === "active" ? "#15803D" : "#64748B", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>{c.status === "active" ? "Active" : "Idle"}</span>
                    </div>
                    <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "#06152A" }}>{c.title}</h4>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 10, color: "#64748B", marginBottom: 12 }}>
                      <div><strong style={{ fontSize: 13, color: "#06152A", display: "block" }}>{c.totalHrs}</strong> TOTAL HRS</div>
                      <div><strong style={{ fontSize: 13, color: "#06152A", display: "block" }}>{c.batches}</strong> BATCHES</div>
                      <div><strong style={{ fontSize: 13, color: "#06152A", display: "block" }}>{c.enrolled}</strong> ENROLLED</div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", marginBottom: 4 }}>SYLLABUS</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(c.syllabus || []).map((s) => (
                          <span key={s} style={{ background: "#F1F5F9", color: "#475569", fontSize: 10, padding: "2px 6px", borderRadius: 4 }}>{s}</span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-outline" style={{ flex: 1, fontSize: 11, padding: "6px" }}>Edit</button>
                      <button className="btn btn-outline" style={{ flex: 1, fontSize: 11, padding: "6px" }} onClick={() => setActiveMod("questionbank")}>Questions</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. QUESTION BANK VIEW */}
          {activeMod === "questionbank" && (() => {
            const filteredQuestions = questions.filter((q) => {
              if (questionCourseFilter === "All") return true;
              return q.courseTitle === questionCourseFilter || q.topic === questionCourseFilter || (q.question && q.question.toLowerCase().includes(questionCourseFilter.toLowerCase()));
            });

            const questionTabs = [
              { id: "All", label: `All (${questions.length})` },
              ...(courses || []).map((c) => ({
                id: c.title,
                label: `${c.title} (${questions.filter((q) => q.courseTitle === c.title || q.topic === c.title || q.topic.includes(c.title.split(" ")[0])).length})`,
              })),
            ];

            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Question Bank · Path B</h2>
                    <div style={{ fontSize: 12, color: "#64748B" }}>Build the question bank for Talentera validated assessments · MCQ + scenario + bulk CSV upload.</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-outline" style={{ fontSize: 12 }}><i className="fa-solid fa-upload" style={{ marginRight: 6 }}></i> Bulk CSV Upload</button>
                    <button className="btn btn-navy" style={{ fontSize: 12 }} onClick={() => setShowAddQuestionModal(true)}>+ Add Question</button>
                  </div>
                </div>

                {/* DYNAMIC COURSE FILTER TABS FOR QUESTION BANK */}
                <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16 }}>
                  {questionTabs.map((qTab) => (
                    <button
                      key={qTab.id}
                      onClick={() => setQuestionCourseFilter(qTab.id)}
                      style={{
                        padding: "6px 14px", borderRadius: 999, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                        background: questionCourseFilter === qTab.id ? "#06152A" : "#E2E8F0",
                        color: questionCourseFilter === qTab.id ? "#fff" : "#475569"
                      }}
                    >
                      {qTab.label}
                    </button>
                  ))}
                </div>

                {/* 4 DYNAMIC QUESTION METRIC CARDS */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                  <MetricCard title="TOTAL QUESTIONS" val={filteredQuestions.length} icon="fa-file-lines" />
                  <MetricCard title="ENTRY LEVEL" val={filteredQuestions.filter((q) => q.difficulty === "Entry").length} icon="fa-circle-check" color="#22C55E" />
                  <MetricCard title="SCENARIO BASED" val={filteredQuestions.filter((q) => q.type === "Scenario").length} icon="fa-layer-group" color="#E5A82E" />
                  <MetricCard title="LOCKED (IN USE)" val={filteredQuestions.filter((q) => q.status === "Locked").length} icon="fa-lock" color="#DC2626" />
                </div>

                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden", marginBottom: 20 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase", fontSize: 10, color: "#64748B", textAlign: "left" }}>
                        <th style={{ padding: "10px 14px" }}>QUESTION</th>
                        <th style={{ padding: "10px 14px" }}>TOPIC</th>
                        <th style={{ padding: "10px 14px" }}>TYPE</th>
                        <th style={{ padding: "10px 14px" }}>DIFFICULTY</th>
                        <th style={{ padding: "10px 14px" }}>MARKS</th>
                        <th style={{ padding: "10px 14px" }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuestions.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: "32px 14px", textAlign: "center", color: "#64748B", fontSize: 12 }}>
                            No questions found for {questionCourseFilter === "All" ? "Question Bank" : questionCourseFilter}. Click "+ Add Question" to add one!
                          </td>
                        </tr>
                      ) : (
                        filteredQuestions.map((q, idx) => (
                          <tr key={q._id || idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 600, color: "#06152A" }}>{q.question}</td>
                            <td style={{ padding: "10px 14px", color: "#64748B" }}>{q.topic}</td>
                            <td style={{ padding: "10px 14px" }}><span style={{ background: "#DBEAFE", color: "#1E40AF", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>{q.type}</span></td>
                            <td style={{ padding: "10px 14px" }}><span style={{ color: q.difficulty === "Entry" ? "#15803D" : q.difficulty === "Mid" ? "#B45309" : "#DC2626", fontWeight: 700 }}>{q.difficulty}</span></td>
                            <td style={{ padding: "10px 14px", fontWeight: 700 }}>{q.marks}</td>
                            <td style={{ padding: "10px 14px" }}><span style={{ background: q.status === "Locked" ? "#FEF3C7" : "#DCFCE7", color: q.status === "Locked" ? "#B45309" : "#15803D", fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{q.status === "Locked" ? "🔒 Locked" : "Editable"}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, fontSize: 11, color: "#475569" }}>
                  <strong style={{ color: "#06152A", display: "block", marginBottom: 4 }}>🛡️ Anti-bias guardrails · How Talentera protects assessment integrity</strong>
                  Random question allocation per student — no two students get same paper • Locked after batch opens — no last-minute edits to swing scores • Audit-logged scoring — every answer timestamped • Face match on submit — verified candidate, not a proxy.
                </div>
              </div>
            );
          })()}

          {/* 6. ASSESSMENTS VIEW */}
          {activeMod === "assessments" && (() => {
            // Build assessment rows from real DB batches & students
            const assessmentRows = batches
              .filter((b) => students.filter((s) => s.month === b.code || (s.month && (s.month.includes(b.code) || b.code.includes(s.month)))).length > 0)
              .map((b) => {
                const batchStudents = students.filter((s) => s.month === b.code || (s.month && (s.month.includes(b.code) || b.code.includes(s.month))));
                const scoredStudents = batchStudents.filter((s) => s.score && s.score !== "0 / 100");
                const avgScore = scoredStudents.length > 0
                  ? Math.round(scoredStudents.reduce((sum, s) => sum + parseInt(s.score || "0"), 0) / scoredStudents.length)
                  : 0;
                const passedStudents = batchStudents.filter((s) => parseInt(s.score || "0") >= 60).length;
                const passRate = batchStudents.length > 0 ? Math.round((passedStudents / batchStudents.length) * 100) : 0;
                const topQuartile = scoredStudents.length > 0
                  ? Math.max(...scoredStudents.map((s) => parseInt(s.score || "0")))
                  : 0;
                const verifiedCount = batchStudents.filter((s) => s.status === "verified").length;
                return {
                  batch: b.code,
                  course: b.course,
                  students: batchStudents.length,
                  avgScore: avgScore ? `${avgScore}%` : "0%",
                  passRate: `${passRate}%`,
                  topQuartile: topQuartile ? `${topQuartile}%` : "0%",
                  verifiedCount,
                  status: b.status || "Active",
                };
              });

            // Summary metrics from real data
            const pathBBatches = assessmentRows.length;
            const allScored = students.filter((s) => s.score && s.score !== "0 / 100");
            const globalAvg = allScored.length > 0 ? Math.round(allScored.reduce((sum, s) => sum + parseInt(s.score || "0"), 0) / allScored.length) : 0;
            const globalPassed = students.filter((s) => parseInt(s.score || "0") >= 60).length;
            const globalPassRate = students.length > 0 ? Math.round((globalPassed / students.length) * 100) : 0;
            const totalVerified = students.filter((s) => s.status === "verified").length;

            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Assessment Results</h2>
                    <div style={{ fontSize: 12, color: "#64748B" }}>View Talentera-validated (Path B) assessment scores by batch</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-outline" style={{ fontSize: 12 }}><i className="fa-solid fa-download" style={{ marginRight: 6 }}></i> Export CSV</button>
                  </div>
                </div>

                {/* ASSESSMENT SUMMARY — REAL DB DATA (Path B is the only path Talentera currently tracks) */}
                <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "2px solid #22C55E", marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#06152A" }}>Path B · Talentera-validated (Bias-free) ✓</h4>
                    <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{pathBBatches} batches</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 10 }}>Talentera-conducted with your questions — 15 Stage 2 points</div>
                  <div style={{ display: "flex", gap: 24, fontSize: 12 }}>
                    <div>AVG SCORE <strong style={{ fontSize: 18, color: "#06152A", display: "block" }}>{globalAvg ? `${globalAvg}%` : "0%"}</strong></div>
                    <div>PASS RATE <strong style={{ fontSize: 18, color: "#06152A", display: "block" }}>{globalPassRate ? `${globalPassRate}%` : "0%"}</strong></div>
                    <div>VERIFIED <strong style={{ fontSize: 18, color: "#06152A", display: "block" }}>{totalVerified}</strong></div>
                  </div>
                </div>

                {/* BATCH ASSESSMENT TABLE — REAL DB DATA */}
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase", fontSize: 10, color: "#64748B", textAlign: "left" }}>
                        <th style={{ padding: "10px 14px" }}>BATCH</th>
                        <th style={{ padding: "10px 14px" }}>COURSE</th>
                        <th style={{ padding: "10px 14px" }}>PATH</th>
                        <th style={{ padding: "10px 14px" }}>STUDENTS</th>
                        <th style={{ padding: "10px 14px" }}>AVG SCORE</th>
                        <th style={{ padding: "10px 14px" }}>TOP SCORE</th>
                        <th style={{ padding: "10px 14px" }}>VERIFIED</th>
                        <th style={{ padding: "10px 14px" }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessmentRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: "40px 14px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                            <i className="fa-solid fa-chart-simple" style={{ fontSize: 28, marginBottom: 8, display: "block" }}></i>
                            No assessment data yet. Enroll students into batches and complete verification stages to see results here.
                          </td>
                        </tr>
                      ) : (
                        assessmentRows.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#06152A" }}>{row.batch}</td>
                            <td style={{ padding: "10px 14px", color: "#475569" }}>{row.course}</td>
                            <td style={{ padding: "10px 14px" }}><span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Path B ✓</span></td>
                            <td style={{ padding: "10px 14px" }}>{row.students}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700 }}>{row.avgScore}</td>
                            <td style={{ padding: "10px 14px" }}>{row.topQuartile}</td>
                            <td style={{ padding: "10px 14px" }}><span style={{ color: row.verifiedCount > 0 ? "#15803D" : "#94A3B8", fontWeight: 700 }}>{row.verifiedCount}</span></td>
                            <td style={{ padding: "10px 14px" }}><span style={{ color: "#15803D", fontWeight: 700 }}>{row.status}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* 7. VIDEO QUALITY REVIEW VIEW — REAL DB DATA */}
          {activeMod === "videoquality" && (() => {
            // Only students who actually submitted a Stage 5 video belong in a video review queue
            const videosList = students.filter((s) => s.videoUrl);
            const verifiedCount = videosList.filter((s) => s.videoVerified).length;
            const pendingCount = videosList.filter((s) => !s.videoVerified).length;
            const lowScoreCount = videosList.filter((s) => Number(s.aiScore) > 0 && Number(s.aiScore) < 6).length;

            const filterTabs = [
              { key: "all", label: `All ${videosList.length}` },
              { key: "pending", label: `Pending ${pendingCount}` },
              { key: "verified", label: `Verified ${verifiedCount}` },
              { key: "lowscore", label: `AI Score < 6 (${lowScoreCount})` },
            ];

            const filteredVideos = videosList.filter((s) => {
              if (videoFilter === "pending") return !s.videoVerified;
              if (videoFilter === "verified") return s.videoVerified;
              if (videoFilter === "lowscore") return Number(s.aiScore) > 0 && Number(s.aiScore) < 6;
              return true;
            });

            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Video Quality Review</h2>
                    <div style={{ fontSize: 12, color: "#64748B" }}>Review student portfolio videos submitted at Stage 5 · Verification status is set by Talentera staff.</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={fetchDashboardData}><i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }}></i> Refresh queue</button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                  {filterTabs.map((tab) => (
                    <button key={tab.key} onClick={() => setVideoFilter(tab.key)} style={{ padding: "6px 14px", borderRadius: 999, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", background: videoFilter === tab.key ? "#06152A" : "#E2E8F0", color: videoFilter === tab.key ? "#fff" : "#475569" }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {filteredVideos.length === 0 ? (
                  <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "48px 14px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                    <i className="fa-solid fa-video" style={{ fontSize: 28, marginBottom: 8, display: "block" }}></i>
                    {videosList.length === 0 ? "No student videos submitted yet. Videos appear here once students complete Stage 5." : "No videos match this filter."}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
                    {filteredVideos.map((s) => {
                      const aiScoreNum = Number(s.aiScore) || 0;
                      return (
                        <div key={s.id} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #E2E8F0" }}>
                          <div style={{ background: "#0F172A", height: 120, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => window.open(s.videoUrl, "_blank")}>
                            <i className="fa-solid fa-circle-play" style={{ fontSize: 36, color: "rgba(255,255,255,0.8)" }}></i>
                            <span style={{ position: "absolute", top: 6, right: 6, background: aiScoreNum >= 7 ? "#15803D" : aiScoreNum >= 6 ? "#B45309" : "#DC2626", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>AI {aiScoreNum}</span>
                          </div>

                          <div style={{ padding: 12 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#FEF08A", color: "#854D0E", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.initials}</span>
                              <div>
                                <strong style={{ fontSize: 12, color: "#06152A", display: "block" }}>{s.name}</strong>
                                <span style={{ fontSize: 10, color: "#64748B" }}>{s.specialty}</span>
                              </div>
                            </div>

                            <div style={{ margin: "6px 0", fontSize: 10 }}>
                              <span style={{ background: s.videoVerified ? "#DCFCE7" : "#FEF3C7", color: s.videoVerified ? "#15803D" : "#B45309", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                                {s.videoVerified ? "Staff-verified" : "Awaiting verification"}
                              </span>
                            </div>

                            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                              <button className="btn btn-outline" style={{ width: "100%", fontSize: 10, padding: "4px" }} onClick={() => window.open(s.videoUrl, "_blank")}>View video</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 8. PLACEMENTS VIEW — REAL DB DATA */}
          {activeMod === "placements" && (() => {
            // Parse the numeric LPA value out of a free-text ctc string like "₹5.5 LPA"
            const parseCtc = (ctc) => {
              const match = String(ctc || "").match(/[\d.]+/);
              return match ? parseFloat(match[0]) : null;
            };

            const totalPlaced = placements.length;
            const placementRate = students.length > 0 ? Math.round((totalPlaced / students.length) * 100) : 0;
            const ctcValues = placements.map((p) => parseCtc(p.ctc)).filter((v) => v !== null);
            const avgCtc = ctcValues.length > 0
              ? `₹${(ctcValues.reduce((sum, v) => sum + v, 0) / ctcValues.length).toFixed(1)} LPA`
              : "—";

            // Real city breakdown from actual placement records
            const cityCounts = {};
            placements.forEach((p) => {
              const city = p.city || "Unspecified";
              cityCounts[city] = (cityCounts[city] || 0) + 1;
            });
            const topCities = Object.entries(cityCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4);
            const maxCityCount = topCities.length > 0 ? topCities[0][1] : 0;
            const cityColors = ["#22C55E", "#2563EB", "#E5A82E", "#A855F7"];

            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Placements</h2>
                    <div style={{ fontSize: 12, color: "#64748B" }}>Track which students placed, where, and at what CTC · See your top hiring cities.</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-navy" style={{ fontSize: 12 }} onClick={() => setShowAddPlacementModal(true)}>+ Add Placement</button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                  <MetricCard title="TOTAL PLACED" val={totalPlaced} sub={totalPlaced > 0 ? "Recorded placements" : "No placements yet"} icon="fa-briefcase" />
                  <MetricCard title="PLACEMENT RATE" val={`${placementRate}%`} sub="Placed vs total students" icon="fa-award" color="#22C55E" />
                  <MetricCard title="AVG CTC" val={avgCtc} sub={ctcValues.length > 0 ? "Across recorded placements" : "No CTC data yet"} icon="fa-indian-rupee-sign" color="#E5A82E" />
                  <MetricCard title="TOP CITY" val={topCities.length > 0 ? topCities[0][0] : "—"} sub={topCities.length > 0 ? `${topCities[0][1]} placed` : "No placements yet"} icon="fa-location-dot" color="#7E22CE" />
                </div>

                <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #E2E8F0", marginBottom: 20 }}>
                  <h4 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 800, color: "#06152A" }}>Top hiring cities</h4>
                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>Where your alumni get placed most</div>

                  {topCities.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#94A3B8", padding: "12px 0" }}>No placements recorded yet.</div>
                  ) : (
                    topCities.map(([city, count], idx) => (
                      <CityProgressBar key={city} city={city} count={String(count)} pct={Math.round((count / maxCityCount) * 100)} color={cityColors[idx % cityColors.length]} />
                    ))
                  )}
                </div>

                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#06152A" }}>Recent placements</h4>
                  </div>

                  {placements.length === 0 ? (
                    <div style={{ padding: "40px 14px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                      <i className="fa-solid fa-briefcase" style={{ fontSize: 28, marginBottom: 8, display: "block" }}></i>
                      No placements recorded yet. Click "+ Add Placement" to log your first one.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase", fontSize: 10, color: "#64748B", textAlign: "left" }}>
                          <th style={{ padding: "8px 12px" }}>STUDENT</th>
                          <th style={{ padding: "8px 12px" }}>ROLE</th>
                          <th style={{ padding: "8px 12px" }}>COMPANY</th>
                          <th style={{ padding: "8px 12px" }}>CITY</th>
                          <th style={{ padding: "8px 12px" }}>CTC</th>
                          <th style={{ padding: "8px 12px" }}>WHEN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {placements.map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "8px 12px", fontWeight: 700 }}>{p.studentName}</td>
                            <td style={{ padding: "8px 12px" }}>{p.role}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 600 }}>{p.company}</td>
                            <td style={{ padding: "8px 12px" }}>{p.city}</td>
                            <td style={{ padding: "8px 12px", color: "#15803D", fontWeight: 700 }}>{p.ctc}</td>
                            <td style={{ padding: "8px 12px", color: "#64748B" }}>{p.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 9 & 10. INSIGHTS VIEW — REAL CROSS-ACADEMY DATA */}
          {activeMod === "insights" && (() => {
            if (insightsLoading && !insightsData) {
              return (
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "48px 14px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                  Loading benchmark data…
                </div>
              );
            }

            if (!insightsData || !insightsData.hasData) {
              return (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Insights · Peer Benchmark</h2>
                    <div style={{ fontSize: 12, color: "#64748B" }}>See where you stand vs other academies with real, enrolled students · Peer labels are city-only (anonymized).</div>
                  </div>
                  <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "48px 14px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                    <i className="fa-solid fa-chart-line" style={{ fontSize: 28, marginBottom: 8, display: "block" }}></i>
                    {students.length === 0
                      ? "Enroll students to unlock peer benchmarking against other academies."
                      : `Not enough platform-wide data yet to benchmark against (${insightsData?.totalAcademies ?? 0} academies with enrolled students so far).`}
                  </div>
                </div>
              );
            }

            const { yourRank, totalAcademies, leaderboard, industryAverages, yours } = insightsData;
            const rankFraction = yourRank / totalAcademies;
            const tierLabel = totalAcademies <= 1 ? "Only academy on record" : rankFraction <= 1 / 3 ? "Leading tier" : rankFraction <= 2 / 3 ? "On pace" : "Catch-up tier";

            const improveItems = [
              { key: "placementRate", title: "Placement rate", yourVal: yours.placementRate, avgVal: industryAverages.placementRate, unit: "%" },
              { key: "avgScore", title: "Avg Talentera score", yourVal: yours.avgScore, avgVal: industryAverages.avgScore, unit: "%" },
              { key: "videoQuality", title: "Video quality", yourVal: yours.videoQuality, avgVal: industryAverages.videoQuality, unit: "" },
              { key: "profileCompletion", title: "Profile completion", yourVal: yours.profileCompletion, avgVal: industryAverages.profileCompletion, unit: "%" },
            ].filter((m) => m.yourVal < m.avgVal);

            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Insights · Peer Benchmark</h2>
                    <div style={{ fontSize: 12, color: "#64748B" }}>See where you stand vs other academies with real, enrolled students · Peer labels are city-only (anonymized).</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={fetchInsightsData}><i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }}></i> Refresh</button>
                  </div>
                </div>

                <div style={{ background: "#06152A", color: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>YOUR RANK · PLACEMENT RATE</div>
                    <h3 style={{ margin: "4px 0", fontSize: 20, fontWeight: 800 }}>#{yourRank} of {totalAcademies} — {tierLabel}</h3>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Ranked by real placement rate across academies with enrolled students.</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ background: "#E5A82E", color: "#06152A", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 999 }}>Rank #{yourRank}</span>
                    <span style={{ background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 11, padding: "4px 12px", borderRadius: 999 }}>Anonymized comparison</span>
                  </div>
                </div>

                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: 12, fontSize: 11, color: "#1D4ED8", marginBottom: 16 }}>
                  💡 <strong>Why city-only labels?</strong> Talentera never reveals competing academy names. You see "Academy from [City]" so you can benchmark without anyone gaming the system. Fair to everyone.
                </div>

                <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #E2E8F0", marginBottom: 20 }}>
                  <h4 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 800, color: "#06152A" }}>Placement rate · ranked</h4>
                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 14 }}>Industry average: {industryAverages.placementRate}% · Higher is better</div>

                  {leaderboard.map((entry) => (
                    <RankBar
                      key={entry.rank}
                      label={entry.isYou ? `⭐ #${entry.rank} · YOUR ACADEMY` : `#${entry.rank} · Academy from ${entry.city}`}
                      pct={entry.placementRate}
                      color={entry.isYou ? "#E5A82E" : entry.rank <= 2 ? "#22C55E" : "#94A3B8"}
                      isUser={entry.isYou}
                    />
                  ))}
                </div>

                <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #E2E8F0", marginBottom: 20 }}>
                  <h4 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 800, color: "#06152A" }}>⚡ Areas to improve</h4>
                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>{improveItems.length} metric{improveItems.length === 1 ? "" : "s"} where you're below the real industry average</div>

                  {improveItems.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#15803D", padding: "8px 0" }}>You're at or above the industry average on every tracked metric. 🎉</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                      {improveItems.map((m) => (
                        <ImproveItem
                          key={m.key}
                          title={m.title}
                          tip="Real gap vs. peer academies on the platform — close it to move up the ranking."
                          stat={`${m.yourVal}${m.unit} - avg ${m.avgVal}${m.unit}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                  <strong style={{ color: "#06152A", display: "block", marginBottom: 8, fontSize: 12 }}>The quality uplift loop · How transparent insights make the whole industry better</strong>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, fontSize: 11, textAlign: "center" }}>
                    <div>1. See gaps</div>
                    <div>2. Update curriculum</div>
                    <div>3. Next batch scores higher</div>
                    <div>4. Industry uplifts</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 11. SETTINGS VIEW */}
          {activeMod === "settings" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Settings</h2>
                <div style={{ fontSize: 12, color: "#64748B" }}>Manage your account, admins, branding, MoU, billing and integrations.</div>
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                {["Account", "Admins", "Branding", "MoU", "Billing", "Integrations", "Data"].map((tab) => (
                  <button key={tab} onClick={() => setSettingsSubTab(tab)} style={{ padding: "6px 16px", borderRadius: 999, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: settingsSubTab === tab ? "#06152A" : "#E2E8F0", color: settingsSubTab === tab ? "#fff" : "#475569" }}>
                    {tab}
                  </button>
                ))}
              </div>

              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#06152A" }}>Account details</h4>
                    <div style={{ fontSize: 12, color: "#64748B" }}>Your academy's primary information</div>
                  </div>
                  <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => setShowEditSettingsModal(true)}>Edit</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, fontSize: 12 }}>
                  <div><span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, display: "block" }}>ACADEMY NAME</span><strong style={{ color: "#06152A" }}>{academy.name || "sdfds"}</strong></div>
                  <div><span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, display: "block" }}>PRIMARY ADMIN</span><strong style={{ color: "#06152A" }}>{academy.primaryAdmin || "sdfd"}</strong></div>
                  <div><span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, display: "block" }}>EMAIL</span><strong style={{ color: "#06152A" }}>{academy.email || "aaaa@gmail.com"}</strong></div>
                  <div><span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, display: "block" }}>MOBILE</span><strong style={{ color: "#06152A" }}>{academy.phone || "+91 9765435676"}</strong></div>

                  <div><span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, display: "block" }}>SPECIALTY</span><strong style={{ color: "#06152A" }}>{academy.specialty || "Medical Coding"}</strong></div>
                  <div><span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, display: "block" }}>HEADQUARTERS</span><strong style={{ color: "#06152A" }}>{academy.headquarters || "Coimbatore"}</strong></div>
                  <div><span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, display: "block" }}>BRANCHES</span><strong style={{ color: "#06152A" }}>{(academy.branches || ["Coimbatore", "Chennai"]).join(", ")}</strong></div>
                  <div><span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, display: "block" }}>MEMBER SINCE</span><strong style={{ color: "#06152A" }}>{academy.partnerSince || "Jan 2025"}</strong></div>

                  <div><span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, display: "block" }}>TIER</span><strong style={{ color: "#15803D" }}>{academy.tier || "Verified Partner"}</strong></div>
                  <div><span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, display: "block" }}>TOTAL ALUMNI</span><strong style={{ color: "#06152A" }}>{academy.totalAlumni || "35,000+"}</strong></div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ====== MODALS ====== */}

      {/* 1. CREATE NEW BATCH WITH DUAL ENROLLMENT MODE (INDIVIDUAL OR BULK CSV UPLOAD) */}
      {showCreateBatchModal && (
        <Modal title="Create New Batch & Enroll Students" onClose={() => setShowCreateBatchModal(false)} maxWidth={600}>
          <form onSubmit={handleCreateBatchSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div className="wiz-field">
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>BATCH CODE *</label>
                <input type="text" value={newBatchCode} onChange={(e) => setNewBatchCode(e.target.value)} placeholder="e.g. JAN-HCC-02" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} required />
              </div>
              <div className="wiz-field">
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>BRANCH LOCATION</label>
                <select value={newBatchBranch} onChange={(e) => setNewBatchBranch(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }}>
                  <option>Coimbatore</option>
                  <option>Chennai</option>
                  <option>Hyderabad</option>
                  <option>Vizag</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div className="wiz-field">
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>COURSE SPECIALTY *</label>
                <select value={newBatchCourse} onChange={(e) => setNewBatchCourse(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }}>
                  <option>HCC Coding Specialization</option>
                  <option>ED Coding Foundation</option>
                  <option>AR Calling Bootcamp</option>
                  <option>Surgery Coding Mastery</option>
                  <option>OP / E&M Specialization</option>
                  <option>IP DRG Specialization</option>
                </select>
              </div>
              <div className="wiz-field">
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>ASSESSMENT PATH</label>
                <select value={newBatchPath} onChange={(e) => setNewBatchPath(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }}>
                  <option>Path B ✓ (Talentera-validated)</option>
                  <option>Path A (Trust-based)</option>
                </select>
              </div>
            </div>

            {/* ENROLLMENT MODE SELECTION (INDIVIDUAL VS BULK CSV UPLOAD) */}
            <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <strong style={{ fontSize: 12, color: "#06152A" }}>🎓 Enroll Batch Students Option</strong>
                <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 3, borderRadius: 8 }}>
                  <button
                    type="button"
                    onClick={() => setBatchEnrollmentMode("individual")}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                      background: batchEnrollmentMode === "individual" ? "#06152A" : "transparent",
                      color: batchEnrollmentMode === "individual" ? "#fff" : "#475569",
                    }}
                  >
                    👥 Add Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchEnrollmentMode("bulk")}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                      background: batchEnrollmentMode === "bulk" ? "#06152A" : "transparent",
                      color: batchEnrollmentMode === "bulk" ? "#fff" : "#475569",
                    }}
                  >
                    📁 Bulk Upload (CSV)
                  </button>
                </div>
              </div>

              {batchEnrollmentMode === "individual" ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "#64748B" }}>Enter student details for this batch:</span>
                    <button type="button" className="btn btn-outline" style={{ fontSize: 10, padding: "3px 8px" }} onClick={handleAddBatchStudentRow}>
                      + Add Row
                    </button>
                  </div>

                  {batchStudentsList.map((stRow, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr 1fr 24px", gap: 6, marginBottom: 6, alignItems: "center" }}>
                      <input
                        type="text"
                        value={stRow.fullName}
                        onChange={(e) => handleBatchStudentChange(idx, "fullName", e.target.value)}
                        placeholder="Full Name"
                        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 11 }}
                      />
                      <input
                        type="email"
                        value={stRow.email}
                        onChange={(e) => handleBatchStudentChange(idx, "email", e.target.value)}
                        placeholder="Email Address"
                        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 11 }}
                      />
                      <input
                        type="tel"
                        value={stRow.mobile}
                        onChange={(e) => handleBatchStudentChange(idx, "mobile", e.target.value)}
                        placeholder="Mobile"
                        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 11 }}
                      />
                      {batchStudentsList.length > 1 && (
                        <button type="button" onClick={() => handleRemoveBatchStudentRow(idx)} style={{ background: "none", border: "none", color: "#DC2626", fontWeight: 800, cursor: "pointer" }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>Upload CSV file containing batch student roster:</div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBatchCsvFile(e.target.files?.[0])}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#fff", border: "1px dashed #94A3B8", fontSize: 11 }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: "#64748B" }}>Headers: FullName, Email, Mobile, Course, BatchName</span>
                    <button
                      type="button"
                      onClick={downloadSampleCsv}
                      style={{ background: "none", border: "none", color: "#2563EB", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Download Sample CSV
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-navy" style={{ width: "100%", justifyContent: "center" }} disabled={saving}>
              {saving ? "Creating Batch..." : "Create Batch & Enroll Roster →"}
            </button>
          </form>
        </Modal>
      )}

      {/* BATCH ENROLLED STUDENTS ROSTER MODAL */}
      {selectedBatchRoster && (
        <Modal
          title={`Enrolled Students Roster · ${selectedBatchRoster.code}`}
          onClose={() => setSelectedBatchRoster(null)}
          maxWidth={640}
        >
          <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: 14, color: "#06152A", display: "block" }}>{selectedBatchRoster.course}</strong>
              <span style={{ fontSize: 11, color: "#64748B" }}>Path B Validated Assessment Batch</span>
            </div>
            <button
              className="btn btn-navy"
              style={{ fontSize: 11 }}
              onClick={() => {
                setIndivBatchCode(selectedBatchRoster.code);
                setIndivCourse(selectedBatchRoster.course);
                setSelectedBatchRoster(null);
                setShowAddIndividualStudentModal(true);
              }}
            >
              + Enroll Student to {selectedBatchRoster.code}
            </button>
          </div>

          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden", maxHeight: 360, overflowY: "auto" }}>
            {students.filter((s) => s.month === selectedBatchRoster.code || (s.month && s.month.includes(selectedBatchRoster.code))).length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#64748B", fontSize: 12 }}>
                No students enrolled in batch {selectedBatchRoster.code} yet. Click "+ Enroll Student to {selectedBatchRoster.code}" above!
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase", fontSize: 10, color: "#64748B", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>STUDENT</th>
                    <th style={{ padding: "8px 12px" }}>EMAIL</th>
                    <th style={{ padding: "8px 12px" }}>BRANCH</th>
                    <th style={{ padding: "8px 12px" }}>PROGRESS</th>
                    <th style={{ padding: "8px 12px" }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter((s) => s.month === selectedBatchRoster.code || (s.month && s.month.includes(selectedBatchRoster.code)))
                    .map((st, idx) => (
                      <tr key={st.id || idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#06152A" }}>{st.name}</td>
                        <td style={{ padding: "8px 12px", color: "#475569" }}>{st.email}</td>
                        <td style={{ padding: "8px 12px" }}>{st.branch || "Coimbatore"}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: st.completion === "0%" ? "#DC2626" : "#15803D" }}>{st.completion}</td>
                        <td style={{ padding: "8px 12px" }}><StatusBadge status={st.status} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}

      {/* 2. REGISTER INDIVIDUAL STUDENT TO BRANCH MODAL */}
      {showAddIndividualStudentModal && (
        <Modal title="Register Individual Student to Branch" onClose={() => setShowAddIndividualStudentModal(false)}>
          <form onSubmit={handleAddIndividualStudentSubmit}>
            <div className="wiz-field" style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>FULL LEGAL NAME *</label>
              <input type="text" value={indivName} onChange={(e) => setIndivName(e.target.value)} placeholder="e.g. Ananya Sharma" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} required />
            </div>

            <div className="wiz-field-row" style={{ marginBottom: 10 }}>
              <div className="wiz-field">
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>WORK EMAIL *</label>
                <input type="email" value={indivEmail} onChange={(e) => setIndivEmail(e.target.value)} placeholder="ananya@example.com" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} required />
              </div>
              <div className="wiz-field">
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>MOBILE NUMBER</label>
                <input type="tel" value={indivMobile} onChange={(e) => setIndivMobile(e.target.value)} placeholder="9876543210" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} />
              </div>
            </div>

            <div className="wiz-field-row" style={{ marginBottom: 16 }}>
              <div className="wiz-field">
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>BRANCH LOCATION</label>
                <select value={indivBranch} onChange={(e) => setIndivBranch(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }}>
                  <option>Coimbatore</option>
                  <option>Chennai</option>
                  <option>Hyderabad</option>
                  <option>Vizag</option>
                </select>
              </div>
              <div className="wiz-field">
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>BATCH CODE</label>
                <input type="text" value={indivBatchCode} onChange={(e) => setIndivBatchCode(e.target.value)} placeholder="JAN-HCC-01" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} />
              </div>
            </div>

            <button type="submit" className="btn btn-navy" style={{ width: "100%", justifyContent: "center" }} disabled={saving}>
              {saving ? "Registering Student..." : "Register Student →"}
            </button>
          </form>
        </Modal>
      )}

      {/* 3. ADD COURSE MODAL */}
      {showAddCourseModal && (
        <Modal title="Add New Course" onClose={() => setShowAddCourseModal(false)}>
          <form onSubmit={handleCreateCourseSubmit}>
            <div className="wiz-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>COURSE TITLE</label>
              <input type="text" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} placeholder="e.g. IP DRG Specialization" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} required />
            </div>
            <div className="wiz-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>CATEGORY</label>
              <input type="text" value={newCourseCategory} onChange={(e) => setNewCourseCategory(e.target.value)} placeholder="e.g. Medical Coding" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} />
            </div>
            <div className="wiz-field" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>SYLLABUS TOPICS (COMMA SEPARATED)</label>
              <input type="text" value={newCourseSyllabus} onChange={(e) => setNewCourseSyllabus(e.target.value)} placeholder="ICD-10, CPT, Capstone" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} />
            </div>
            <button type="submit" className="btn btn-navy" style={{ width: "100%", justifyContent: "center" }} disabled={saving}>
              {saving ? "Creating..." : "Save Course →"}
            </button>
          </form>
        </Modal>
      )}

      {/* 4. ADD QUESTION MODAL */}
      {showAddQuestionModal && (
        <Modal title="Add Question to Path B Bank" onClose={() => setShowAddQuestionModal(false)}>
          <form onSubmit={handleAddQuestionSubmit}>
            <div className="wiz-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>QUESTION TEXT</label>
              <textarea rows={3} value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} placeholder="Enter question..." style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} required />
            </div>
            <div className="wiz-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>TOPIC</label>
              <input type="text" value={newQuestionTopic} onChange={(e) => setNewQuestionTopic(e.target.value)} placeholder="HCC / ICD-10" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>TYPE</label>
                <select value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }}>
                  <option>MCQ</option>
                  <option>Scenario</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>DIFFICULTY</label>
                <select value={newQuestionDiff} onChange={(e) => setNewQuestionDiff(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }}>
                  <option>Entry</option>
                  <option>Mid</option>
                  <option>Senior</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-navy" style={{ width: "100%", justifyContent: "center" }} disabled={saving}>
              {saving ? "Saving..." : "Add Question →"}
            </button>
          </form>
        </Modal>
      )}

      {/* 5. ADD PLACEMENT MODAL */}
      {showAddPlacementModal && (
        <Modal title="Add Student Placement Record" onClose={() => setShowAddPlacementModal(false)}>
          <form onSubmit={handleAddPlacementSubmit}>
            <div className="wiz-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>STUDENT NAME</label>
              <input type="text" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="e.g. Priya Subramanian" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} required />
            </div>
            <div className="wiz-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>COMPANY</label>
              <input type="text" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="e.g. Optum" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>CITY</label>
                <input type="text" value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Chennai" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>CTC</label>
                <input type="text" value={newCtc} onChange={(e) => setNewCtc(e.target.value)} placeholder="₹5.5 LPA" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} />
              </div>
            </div>
            <button type="submit" className="btn btn-navy" style={{ width: "100%", justifyContent: "center" }} disabled={saving}>
              {saving ? "Saving..." : "Add Placement →"}
            </button>
          </form>
        </Modal>
      )}

      {/* 6. UPLOAD STUDENTS MODAL */}
      {showUploadStudentsModal && (
        <Modal title="Upload / Import Students Roster" onClose={() => setShowUploadStudentsModal(false)}>
          <form onSubmit={handleUploadStudentsSubmit}>
            <div className="wiz-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>TARGET BATCH</label>
              <input type="text" value={uploadBatchName} onChange={(e) => setUploadBatchName(e.target.value)} placeholder="JAN-HCC-01" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} />
            </div>
            <div className="wiz-field" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>UPLOAD CSV ROSTER FILE</label>
              <input type="file" accept=".csv" onChange={(e) => setUploadFile(e.target.files?.[0])} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px dashed #CBD5E1" }} />
              <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>CSV Headers: FullName, Email, Mobile, Course, BatchName</div>
            </div>
            <button type="submit" className="btn btn-navy" style={{ width: "100%", justifyContent: "center" }} disabled={saving}>
              {saving ? "Uploading..." : "Import Roster to Backend →"}
            </button>
          </form>
        </Modal>
      )}

      {/* 7. EDIT SETTINGS MODAL */}
      {showEditSettingsModal && (
        <Modal title="Edit Academy Information" onClose={() => setShowEditSettingsModal(false)}>
          <form onSubmit={handleSaveSettingsSubmit}>
            <div className="wiz-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>ACADEMY NAME</label>
              <input type="text" value={setAcademyName} onChange={(e) => setSetAcademyName(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} required />
            </div>
            <div className="wiz-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>PRIMARY ADMIN</label>
              <input type="text" value={setAdminName} onChange={(e) => setSetAdminName(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} required />
            </div>
            <div className="wiz-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>WORK EMAIL</label>
              <input type="email" value={setEmailAddr} onChange={(e) => setSetEmailAddr(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} required />
            </div>
            <div className="wiz-field" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>PHONE NUMBER</label>
              <input type="text" value={setPhoneNum} onChange={(e) => setSetPhoneNum(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1" }} />
            </div>
            <button type="submit" className="btn btn-navy" style={{ width: "100%", justifyContent: "center" }} disabled={saving}>
              {saving ? "Updating..." : "Save Settings →"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// --- HELPER COMPONENTS ---

function SidebarItem({ id, label, icon, activeMod, setActiveMod, badge, badgeColor }) {
  const active = activeMod === id;
  return (
    <div
      onClick={() => setActiveMod(id)}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 3,
        background: active ? "rgba(229,168,46,0.15)" : "transparent",
        color: active ? "#E5A82E" : "rgba(255,255,255,0.7)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <i className={`fa-solid ${icon}`} style={{ width: 16, color: active ? "#E5A82E" : "rgba(255,255,255,0.5)" }}></i>
        <span>{label}</span>
      </div>
      {badge && <span style={{ background: badgeColor || "#06152A", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 999 }}>{badge}</span>}
    </div>
  );
}

function MetricCard({ title, val, sub, icon, color = "#06152A" }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #E2E8F0" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.06em", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
      <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function AttentionCard({ bg, border, icon, iconColor, title, sub, btnText, btnAction }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <i className={`fa-solid ${icon}`} style={{ color: iconColor, fontSize: 16 }}></i>
        <div>
          <strong style={{ fontSize: 12, color: "#06152A", display: "block" }}>{title}</strong>
          <span style={{ fontSize: 11, color: "#64748B" }}>{sub}</span>
        </div>
      </div>
      <button className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px", background: "#fff" }} onClick={btnAction}>{btnText}</button>
    </div>
  );
}

function ActivityItem({ color, text, sub }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 4, flexShrink: 0 }} />
      <div>
        <div style={{ color: "#06152A", fontWeight: 600 }}>{text}</div>
        <div style={{ color: "#94A3B8" }}>{sub}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    verified: { bg: "#DBEAFE", color: "#1E40AF" },
    shortlisted: { bg: "#F3E8FF", color: "#6B21A8" },
    placed: { bg: "#DCFCE7", color: "#15803D" },
    verifying: { bg: "#FEF3C7", color: "#B45309" },
    interviewing: { bg: "#FFEDD5", color: "#C2410C" },
    uploaded: { bg: "#F1F5F9", color: "#475569" },
  };
  const st = styles[status] || styles.uploaded;
  return <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>{status}</span>;
}

function CityProgressBar({ city, count, pct, color }) {
  return (
    <div style={{ marginBottom: 10, fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <strong>{city}</strong>
        <span>{count}</span>
      </div>
      <div style={{ height: 6, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function RankBar({ label, pct, color, isUser }) {
  return (
    <div style={{ marginBottom: 10, fontSize: 11, background: isUser ? "#FEFCE8" : "transparent", padding: isUser ? "6px 8px" : 0, borderRadius: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <strong>{label}</strong>
        <strong>{pct}%</strong>
      </div>
      <div style={{ height: 8, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function ImproveItem({ title, tip, stat }) {
  return (
    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <strong style={{ color: "#DC2626", display: "block" }}>{title}</strong>
        <span style={{ fontSize: 11, color: "#64748B" }}>💡 {tip}</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626" }}>{stat}</span>
    </div>
  );
}

function Modal({ title, onClose, children, maxWidth = 460 }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div className="modal-content" style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#06152A" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
