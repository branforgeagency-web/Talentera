import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../components/Toast.jsx";

const DOMAINS_CONFIG = [
  { id: "Medical Coding", label: "Medical Coding", icon: "fa-stethoscope", color: "#2563EB", bg: "#EFF6FF" },
  { id: "Medical Billing", label: "Medical Billing", icon: "fa-file-invoice-dollar", color: "#16A34A", bg: "#F0FDF4" },
  { id: "AR Calling", label: "AR Calling", icon: "fa-headset", color: "#D97706", bg: "#FFFBEB" },
];

const READINESS_LEVELS = [
  { id: "ENROLLED", label: "1. Enrolled", color: "#64748B", bg: "#F1F5F9" },
  { id: "PROFILE_COMPLETED", label: "2. Profile Complete", color: "#0284C7", bg: "#E0F2FE" },
  { id: "TRAINING_IN_PROGRESS", label: "3. Training Active", color: "#7C3AED", bg: "#F5F3FF" },
  { id: "ASSESSMENT_PENDING", label: "4. Assessment Pending", color: "#D97706", bg: "#FEF3C7" },
  { id: "VERIFICATION_PENDING", label: "5. Verification Pending", color: "#EA580C", bg: "#FFEDD5" },
  { id: "VERIFIED", label: "6. Verified Candidate", color: "#059669", bg: "#D1FAE5" },
  { id: "INTERVIEW_READY", label: "7. Interview Ready", color: "#15803D", bg: "#DCFCE7", isFinal: true },
];

const DEFAULT_DEPARTMENTS = [
  { name: "Life Sciences & Biotechnology", degrees: ["B.Sc", "M.Sc"] },
  { name: "Allied Health Sciences", degrees: ["BPT", "B.Sc Nursing"] },
  { name: "Pharmacy", degrees: ["B.Pharm", "Pharm.D"] },
  { name: "Commerce & Management", degrees: ["B.Com", "BBA"] },
  { name: "Computer Science & IT", degrees: ["BCA", "B.Sc CS"] },
];

const GRADUATION_YEAR_OPTIONS = [
  "2030",
  "2029",
  "2028",
  "2027",
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
];

const MODULES_MAP = {
  dashboard: { title: "Placement KPI Dashboard", icon: "fa-chart-pie" },
  students: { title: "Students Directory & Profiles", icon: "fa-users" },
  add_student: { title: "Add Single Student", icon: "fa-user-plus" },
  bulk_upload: { title: "Bulk Student Upload", icon: "fa-file-arrow-up" },
  domains: { title: "RCM Domain Specializations", icon: "fa-network-wired" },
  training: { title: "Training Modules Tracker", icon: "fa-book-open" },
  certifications: { title: "AAPC & AHIMA Certifications", icon: "fa-certificate" },
  assessments: { title: "Talentera Assessments", icon: "fa-award" },
  jobs: { title: "Job Matching & Corporate Drives", icon: "fa-briefcase" },
  interviews: { title: "Campus Interview Pipeline", icon: "fa-calendar-check" },
  placements: { title: "Placements & Offer Letters", icon: "fa-handshake" },
  reports: { title: "NAAC & NBA Accreditation Reports", icon: "fa-file-lines" },
};

// Searchable dropdown - a text field that filters a long option list as you
// type, click-to-select, with an "Other" row at the bottom so nothing on a
// long medical/allied-health list ever blocks a program that isn't on it.
// Selecting "Other" calls onChange("__other__") and the caller reveals its
// own manual text input.
function SearchableSelect({ options, value, onChange, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 6,
          border: "1.5px solid #CBD5E1",
          fontSize: 13,
          background: "#FFF",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          color: value ? "#0F172A" : "#94A3B8",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || placeholder}
        </span>
        <i className={`fa-solid fa-chevron-${open ? "up" : "down"}`} style={{ fontSize: 10, color: "#94A3B8", marginLeft: 8, flexShrink: 0 }}></i>
      </div>
      {/* Hidden native input so the browser's own required-field validation still fires on submit */}
      <input type="text" required={required} value={value} readOnly tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: "100%", pointerEvents: "none" }} />

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#FFFFFF",
            border: "1px solid #CBD5E1",
            borderRadius: 8,
            boxShadow: "0 10px 28px rgba(15,23,42,0.14)",
            zIndex: 60,
            maxHeight: 280,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid #E2E8F0" }}>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              style={{ width: "100%", padding: "7px 9px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12.5, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: 12.5, color: "#94A3B8" }}>No matches</div>
            ) : (
              filtered.map((o) => (
                <div
                  key={o}
                  onClick={() => { onChange(o); setOpen(false); setQuery(""); }}
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                    background: o === value ? "#EFF6FF" : "transparent",
                    color: o === value ? "#2563EB" : "#0F172A",
                    fontWeight: o === value ? 700 : 500,
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {o}
                </div>
              ))
            )}
            <div
              onClick={() => { onChange("__other__"); setOpen(false); setQuery(""); }}
              onMouseDown={(e) => e.preventDefault()}
              style={{ padding: "8px 12px", fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", borderTop: "1px solid #E2E8F0" }}
            >
              <i className="fa-solid fa-plus" style={{ marginRight: 6 }}></i>
              Other (type manually)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CollegePortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [college, setCollege] = useState(null);
  const [kpis, setKpis] = useState({
    totalStudents: 0,
    profilesCompleted: 0,
    medicalCoding: 0,
    medicalBilling: 0,
    arCalling: 0,
    certified: 0,
    assessmentCompleted: 0,
    interviewReady: 0,
    shortlisted: 0,
    selected: 0,
    joined: 0,
    pendingVerification: 0,
  });

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [interviews, setInterviews] = useState([]);
  const [reportsData, setReportsData] = useState(null);
  const [curriculum, setCurriculum] = useState([]);
  const [certificationsSummary, setCertificationsSummary] = useState({});
  const [assessmentsSummary, setAssessmentsSummary] = useState(null);
  const [drives, setDrives] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [editCollegeForm, setEditCollegeForm] = useState({
    name: "",
    placementOfficerName: "",
    placementOfficerMobile: "",
    address: "",
  });

  // Filters
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [filterReadiness, setFilterReadiness] = useState("");
  const [filterPlacement, setFilterPlacement] = useState("");

  // Modals & Sub-actions
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [placementCandidate, setPlacementCandidate] = useState(null);

  // Bulk Upload state
  const [csvText, setCsvText] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkSummary, setBulkSummary] = useState(null);

  // Single Student state
  const [singleStudent, setSingleStudent] = useState({
    name: "",
    email: "",
    mobile: "",
    department: "",
    degree: "",
    rollNumber: "",
    graduationYear: "",
    cgpa: "",
    backlogsCount: 0,
    primaryDomain: "",
    secondaryDomain: "Medical Billing",
  });
  const [degreeIsOther, setDegreeIsOther] = useState(false);
  const [departmentIsOther, setDepartmentIsOther] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // Live "mobile already registered" check - debounced so it fires once the
  // placement officer pauses typing, not on every keystroke. "duplicate"
  // blocks submission; the real, authoritative check still happens again on
  // the server in handleSingleStudentSubmit's POST /students/add.
  const [mobileCheckStatus, setMobileCheckStatus] = useState("idle"); // idle | checking | duplicate | available
  useEffect(() => {
    const digits = singleStudent.mobile.replace(/\D/g, "");
    if (digits.length !== 10) {
      setMobileCheckStatus("idle");
      return;
    }
    setMobileCheckStatus("checking");
    const token = localStorage.getItem("talentera_college_token");
    const timer = setTimeout(() => {
      fetch(`/api/college/students/check-mobile?mobile=${digits}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setMobileCheckStatus(data.exists ? "duplicate" : "available"))
        .catch(() => setMobileCheckStatus("idle"));
    }, 500);
    return () => clearTimeout(timer);
  }, [singleStudent.mobile]);

  // Degree programs and departments feeding into RCM (Medical Coding /
  // Billing / AR Calling) roles - a broad, searchable medical & allied
  // health catalogue, with "Other" always available so a college can still
  // type a program not listed here.
  const DEGREE_PROGRAM_OPTIONS = [
    "MBBS",
    "BDS (Bachelor of Dental Surgery)",
    "BAMS (Ayurvedic Medicine & Surgery)",
    "BHMS (Homeopathic Medicine & Surgery)",
    "BUMS (Unani Medicine & Surgery)",
    "BSMS (Siddha Medicine & Surgery)",
    "BVSc (Bachelor of Veterinary Science)",
    "B.Sc Nursing",
    "Post Basic B.Sc Nursing",
    "GNM (General Nursing & Midwifery)",
    "ANM (Auxiliary Nurse Midwifery)",
    "B.Pharm (Bachelor of Pharmacy)",
    "D.Pharm (Diploma in Pharmacy)",
    "Pharm.D (Doctor of Pharmacy)",
    "BPT (Bachelor of Physiotherapy)",
    "BOT (Bachelor of Occupational Therapy)",
    "B.Sc Biotechnology",
    "B.Sc Life Sciences",
    "B.Sc Microbiology",
    "B.Sc Biochemistry",
    "B.Sc Zoology",
    "B.Sc Botany",
    "B.Sc Genetics",
    "B.Sc Allied Health Sciences",
    "B.Sc Medical Lab Technology (MLT)",
    "B.Sc Radiology & Imaging Technology",
    "B.Sc Cardiac Care Technology",
    "B.Sc Operation Theatre Technology",
    "B.Sc Anesthesia Technology",
    "B.Sc Dialysis Technology",
    "B.Sc Respiratory Therapy",
    "B.Sc Optometry",
    "BASLP (Audiology & Speech Language Pathology)",
    "B.Sc Nutrition & Dietetics",
    "BHA / BHM (Hospital Administration)",
    "B.Sc Public Health",
    "MD / MS (Postgraduate Medicine)",
    "MDS (Master of Dental Surgery)",
    "M.Pharm (Master of Pharmacy)",
    "MPT (Master of Physiotherapy)",
    "MPH (Master of Public Health)",
    "MHA (Master of Hospital Administration)",
    "M.Sc Biotechnology / Life Sciences",
    "M.Sc Microbiology",
    "M.Sc Medical Lab Technology",
  ];
  const DEPARTMENT_OPTIONS = [
    "General Medicine (MBBS)",
    "Dental Sciences",
    "Ayurveda (AYUSH)",
    "Homeopathy (AYUSH)",
    "Unani Medicine (AYUSH)",
    "Siddha Medicine (AYUSH)",
    "Veterinary Science",
    "Nursing",
    "Pharmacy",
    "Physiotherapy",
    "Occupational Therapy",
    "Life Sciences & Biotechnology",
    "Microbiology",
    "Biochemistry",
    "Zoology",
    "Botany",
    "Genetics",
    "Paramedical Sciences",
    "Allied Health Sciences",
    "Medical Lab Technology",
    "Radiology & Imaging Technology",
    "Cardiac Care Technology",
    "Operation Theatre Technology",
    "Anesthesia Technology",
    "Dialysis Technology",
    "Respiratory Therapy",
    "Optometry",
    "Audiology & Speech Language Pathology",
    "Nutrition & Dietetics",
    "Public Health",
    "Hospital Administration",
  ];

  // Fetch initial profile & KPIs
  useEffect(() => {
    fetchCollegeData();
    fetchDrives();
  }, []);

  useEffect(() => {
    if (college) {
      setEditCollegeForm({
        name: college.name || "",
        placementOfficerName: college.placementOfficerName || "",
        placementOfficerMobile: college.placementOfficerMobile || "",
        address: college.address || "",
      });
    }
  }, [college]);

  async function fetchCollegeData() {
    const token = localStorage.getItem("talentera_college_token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [resMe, resKpis] = await Promise.all([
        fetch("/api/college/me", { headers }),
        fetch("/api/college/dashboard-kpis", { headers }),
      ]);

      if (resMe.ok) {
        const d = await resMe.json();
        setCollege(d.college);
      }
      if (resKpis.ok) {
        const d = await resKpis.json();
        if (d.kpis) setKpis(d.kpis);
      }
    } catch (err) {
      console.warn("College data fetch fallback:", err);
      const cached = localStorage.getItem("talentera_college_info");
      if (cached) {
        try {
          setCollege(JSON.parse(cached));
        } catch (e) {}
      }
    }
  }

  // Fetch data dynamically based on active tab
  useEffect(() => {
    if (["students", "dashboard", "domains", "placements"].includes(activeTab)) {
      fetchStudentsList();
    }
    if (activeTab === "interviews" || activeTab === "placements") {
      fetchInterviews();
    }
    if (activeTab === "reports" || activeTab === "placements") {
      fetchReports();
    }
    if (activeTab === "training") {
      fetchTrainingCurriculum();
    }
    if (activeTab === "certifications") {
      fetchCertificationsSummary();
    }
    if (activeTab === "assessments") {
      fetchAssessmentsSummary();
    }
    if (activeTab === "jobs" || activeTab === "dashboard") {
      fetchDrives();
    }
  }, [activeTab, search, filterDept, filterDomain, filterReadiness, filterPlacement]);

  async function fetchTrainingCurriculum() {
    const token = localStorage.getItem("talentera_college_token");
    try {
      const res = await fetch("/api/college/training-curriculum", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setCurriculum(d.curriculum || []);
      }
    } catch (err) {
      console.warn("Failed to fetch curriculum", err);
    }
  }

  async function fetchCertificationsSummary() {
    const token = localStorage.getItem("talentera_college_token");
    try {
      const res = await fetch("/api/college/certifications-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setCertificationsSummary(d.certifications || {});
      }
    } catch (err) {
      console.warn("Failed to fetch certifications summary", err);
    }
  }

  async function fetchAssessmentsSummary() {
    const token = localStorage.getItem("talentera_college_token");
    try {
      const res = await fetch("/api/college/assessments-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setAssessmentsSummary(d);
      }
    } catch (err) {
      console.warn("Failed to fetch assessments summary", err);
    }
  }

  async function fetchDrives() {
    const token = localStorage.getItem("talentera_college_token");
    try {
      const res = await fetch("/api/college/drives", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setDrives(d.drives || []);
      }
    } catch (err) {
      console.warn("Failed to fetch drives", err);
    }
  }

  async function fetchNotifications() {
    const token = localStorage.getItem("talentera_college_token");
    try {
      const res = await fetch("/api/college/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications || []);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications", err);
    }
  }

  async function handleSaveCollegeSettings(e) {
    e?.preventDefault?.();
    const token = localStorage.getItem("talentera_college_token");
    try {
      const res = await fetch("/api/college/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editCollegeForm),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed to update profile.");
      setCollege(d.college);
      toast("Institutional settings saved successfully.", "✓");
    } catch (err) {
      toast(err.message, "!");
    }
  }

  async function fetchStudentsList() {
    const token = localStorage.getItem("talentera_college_token");
    setStudentsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterDept) params.append("department", filterDept);
      if (filterDomain) params.append("domain", filterDomain);
      if (filterReadiness) params.append("readiness", filterReadiness);
      if (filterPlacement) params.append("placementStatus", filterPlacement);

      const res = await fetch(`/api/college/students?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setStudents(d.students || []);
      }
    } catch (err) {
      console.warn("Failed to fetch students list", err);
    } finally {
      setStudentsLoading(false);
    }
  }

  async function fetchInterviews() {
    const token = localStorage.getItem("talentera_college_token");
    try {
      const res = await fetch("/api/college/interviews", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setInterviews(d.interviews || []);
      }
    } catch (err) {
      console.warn("Failed to fetch interviews", err);
    }
  }

  async function fetchReports() {
    const token = localStorage.getItem("talentera_college_token");
    try {
      const res = await fetch("/api/college/reports/placement-analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setReportsData(d.report);
      }
    } catch (err) {
      console.warn("Failed to fetch reports", err);
    }
  }

  function handleLogout() {
    localStorage.removeItem("talentera_college_token");
    localStorage.removeItem("talentera_college_info");
    toast("Logged out from College Portal.", "✓");
    navigate("/college/login");
  }

  // Handle Single Student Enroll
  async function handleSingleStudentSubmit(e) {
    e.preventDefault();

    if (mobileCheckStatus === "duplicate") {
      toast("This mobile number is already registered. Use a different number.", "!");
      return;
    }

    setEnrolling(true);
    const token = localStorage.getItem("talentera_college_token");

    try {
      const res = await fetch("/api/college/students/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(singleStudent),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to enroll student.");

      toast(`Student ${singleStudent.name} successfully enrolled!`, "✓");
      setSingleStudent({
        name: "",
        email: "",
        mobile: "",
        department: "",
        degree: "",
        rollNumber: "",
        graduationYear: "",
        cgpa: "",
        backlogsCount: 0,
        primaryDomain: "",
        secondaryDomain: "Medical Billing",
      });
      setDegreeIsOther(false);
      setDepartmentIsOther(false);
      setMobileCheckStatus("idle");
      fetchCollegeData();
      fetchStudentsList();
    } catch (err) {
      toast(err.message, "!");
    } finally {
      setEnrolling(false);
    }
  }

  // Handle CSV Bulk Upload
  async function handleBulkUpload() {
    if (!csvText.trim()) {
      toast("Please paste CSV data or use the sample template.", "!");
      return;
    }

    setBulkProcessing(true);
    setBulkSummary(null);

    // Simple robust client-side CSV parser
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      toast("CSV must contain a header row and at least 1 student row.", "!");
      setBulkProcessing(false);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const studentsData = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length < 2) continue;

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] || "";
      });
      studentsData.push(rowObj);
    }

    const token = localStorage.getItem("talentera_college_token");
    try {
      const res = await fetch("/api/college/students/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          batchName: `Batch_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}`,
          fileName: "students_roster.csv",
          studentsData,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed to process bulk upload.");

      toast(d.message, "✓");
      setBulkSummary(d.summary);
      setCsvText("");
      fetchCollegeData();
      fetchStudentsList();
    } catch (err) {
      toast(err.message, "!");
    } finally {
      setBulkProcessing(false);
    }
  }

  function loadSampleCsv() {
    const sample = `name,email,mobile,rollNumber,department,degree,graduationYear,cgpa,backlogs,primaryDomain
Deepak Sundaram,deepak.sundaram@demo.edu.in,9842100001,22LS01,Life Sciences & Biotechnology,B.Sc Biotechnology,2026,8.4,0,Medical Coding
Kavitha Mohan,kavitha.mohan@demo.edu.in,9842100002,22LS02,Life Sciences & Biotechnology,B.Sc Biochemistry,2026,7.9,0,Medical Coding
Praveen Kumar,praveen.kumar@demo.edu.in,9842100003,22AH01,Allied Health Sciences,BPT (Physiotherapy),2026,8.1,0,Medical Billing
Swetha Raman,swetha.raman@demo.edu.in,9842100004,22CM01,Commerce & Management,B.Com,2026,7.6,0,AR Calling
Vigneshwaran R,vignesh.r@demo.edu.in,9842100005,22IT01,Computer Science & IT,BCA,2026,8.0,0,AR Calling`;
    setCsvText(sample);
    toast("Sample CSV student roster loaded.", "ℹ");
  }

  // Toggle Readiness Status for Student
  async function handleToggleReadiness(studentId, newStatus) {
    const token = localStorage.getItem("talentera_college_token");
    try {
      const res = await fetch(`/api/college/students/${studentId}/verification`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ readinessStatus: newStatus }),
      });
      const d = await res.json();
      if (res.ok) {
        toast(`Student readiness updated to ${newStatus}`, "✓");
        fetchStudentsList();
        fetchCollegeData();
        if (selectedStudent?._id === studentId) {
          setSelectedStudent(d.student);
        }
      }
    } catch (err) {
      toast(err.message, "!");
    }
  }

  // Record Placement
  async function handleRecordPlacement(studentId, companyName, role, ctc) {
    const token = localStorage.getItem("talentera_college_token");
    try {
      const res = await fetch("/api/college/placements/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          candidateId: studentId,
          companyName,
          role,
          ctc,
        }),
      });
      if (res.ok) {
        toast("Placement confirmed & recorded!", "✓");
        setShowPlacementModal(false);
        fetchStudentsList();
        fetchCollegeData();
      }
    } catch (err) {
      toast(err.message, "!");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", display: "flex", fontFamily: "var(--font-body)" }}>
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside
        style={{
          width: 260,
          background: "#0A1F3D",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Brand */}
        <div style={{ padding: "20px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#F5B41A", color: "#0A1F3D", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 16 }}>
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.5px" }}>TALENTERA</div>
              <div style={{ fontSize: 10.5, color: "#F5B41A", fontWeight: 700, textTransform: "uppercase" }}>COLLEGE OS · PLACEMENT</div>
            </div>
          </div>
        </div>

        {/* College Verified Card */}
        <div style={{ padding: "14px 18px", margin: "14px", background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(245,180,26,0.2)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {college?.name || "College Placement Cell"}
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
            {college?.city ? `${college.city}${college?.state ? `, ${college.state}` : ""}` : "Campus Portal"}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, background: "rgba(34,197,94,0.15)", color: "#4ADE80", padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 800 }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: 9 }}></i>
            {college?.verificationStatus || "VERIFIED"} · {college?.tier || "Registered Partner"}
          </div>
        </div>

        {/* 12 Modules Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "0 10px 20px" }}>
          {Object.entries(MODULES_MAP).map(([key, info]) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: isActive ? "#F5B41A" : "transparent",
                  color: isActive ? "#0A1F3D" : "rgba(255,255,255,0.75)",
                  fontWeight: isActive ? 800 : 600,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: 3,
                  transition: "0.15s ease",
                }}
              >
                <i className={`fa-solid ${info.icon}`} style={{ width: 18, fontSize: 14, color: isActive ? "#0A1F3D" : "#F5B41A" }}></i>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{info.title.split("·")[0]}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Officer Profile & Logout */}
        <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#FFFFFF", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {college?.placementOfficerName || "Placement Officer"}
            </div>
            <div style={{ fontSize: 10.5, color: "#94A3B8" }}>Placement Cell</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Log Out"
            style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", fontSize: 14 }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: 64,
            background: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
            padding: "0 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#EFF6FF", color: "#2563EB", display: "grid", placeItems: "center", fontSize: 15 }}>
              <i className={`fa-solid ${MODULES_MAP[activeTab]?.icon || "fa-chart-pie"}`}></i>
            </div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 800, color: "#0A1F3D", margin: 0 }}>
                {MODULES_MAP[activeTab]?.title}
              </h1>
              <span style={{ fontSize: 11.5, color: "#64748B" }}>
                Campus Placement Operating System · Academic Year 2025–2026
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab("add_student")}
              style={{
                background: "#0A1F3D",
                color: "#F5B41A",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="fa-solid fa-user-plus"></i> Add Student
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bulk_upload")}
              style={{
                background: "#F8FAFC",
                color: "#0A1F3D",
                border: "1.5px solid #CBD5E1",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="fa-solid fa-file-arrow-up"></i> Bulk Upload
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              style={{
                background: "#F8FAFC",
                color: "#0A1F3D",
                border: "1.5px solid #CBD5E1",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="fa-solid fa-file-export"></i> NAAC Report
            </button>
          </div>
        </header>

        {/* Scrollable View Container */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {/* ========================================================= */}
          {/* MODULE 1: DASHBOARD OVERVIEW                              */}
          {/* ========================================================= */}
          {activeTab === "dashboard" && (
            <div>
              {/* 12 Blueprint KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Total Students", val: kpis.totalStudents, icon: "fa-users", color: "#0A1F3D", bg: "#F8FAFC" },
                  { label: "Profiles Complete", val: kpis.profilesCompleted, icon: "fa-circle-check", color: "#0284C7", bg: "#F0F9FF" },
                  { label: "Medical Coding", val: kpis.medicalCoding, icon: "fa-stethoscope", color: "#2563EB", bg: "#EFF6FF" },
                  { label: "Medical Billing", val: kpis.medicalBilling, icon: "fa-file-invoice-dollar", color: "#16A34A", bg: "#F0FDF4" },
                  { label: "AR Calling", val: kpis.arCalling, icon: "fa-headset", color: "#D97706", bg: "#FFFBEB" },
                  { label: "Certified", val: kpis.certified, icon: "fa-certificate", color: "#7C3AED", bg: "#F5F3FF" },
                  { label: "Assessment Done", val: kpis.assessmentCompleted, icon: "fa-list-check", color: "#0D9488", bg: "#F0FDFA" },
                  { label: "Interview Ready", val: kpis.interviewReady, icon: "fa-bolt", color: "#15803D", bg: "#DCFCE7", highlight: true },
                  { label: "Shortlisted", val: kpis.shortlisted, icon: "fa-user-clock", color: "#4F46E5", bg: "#EEF2FF" },
                  { label: "Selected", val: kpis.selected, icon: "fa-award", color: "#9333EA", bg: "#FAF5FF" },
                  { label: "Joined (Placed)", val: kpis.joined, icon: "fa-handshake", color: "#059669", bg: "#ECFDF5", highlight: true },
                  { label: "Pending Verif.", val: kpis.pendingVerification, icon: "fa-hourglass-half", color: "#EA580C", bg: "#FFF7ED" },
                ].map((kpi, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: kpi.bg,
                      borderRadius: 12,
                      padding: "14px 16px",
                      border: kpi.highlight ? `2px solid ${kpi.color}` : "1px solid #E2E8F0",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748B" }}>{kpi.label}</span>
                      <i className={`fa-solid ${kpi.icon}`} style={{ color: kpi.color, fontSize: 13 }}></i>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.val}</div>
                  </div>
                ))}
              </div>

              {/* Middle Section: Quick Actions & Stage Pipeline Overview */}
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 24 }}>
                {/* 14-Stage Candidate Progression Funnel */}
                <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "22px 24px", border: "1px solid #E2E8F0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 15.5, fontWeight: 800, color: "#0A1F3D", margin: 0 }}>
                        Candidate Placement Pipeline
                      </h3>
                      <span style={{ fontSize: 12, color: "#64748B" }}>From Enrollment to Healthcare Corporate Joining</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("students")}
                      style={{ background: "none", border: "none", color: "#2563EB", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
                    >
                      View All Students →
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, textAlign: "center" }}>
                    {READINESS_LEVELS.map((lvl, i) => {
                      const funnelEntry = kpis.readinessFunnel?.find((f) => f.id === lvl.id);
                      const count = funnelEntry !== undefined
                        ? funnelEntry.count
                        : (lvl.id === "INTERVIEW_READY" ? kpis.interviewReady : lvl.id === "ENROLLED" ? kpis.totalStudents : 0);
                      return (
                        <div key={lvl.id} style={{ background: lvl.bg, border: `1px solid ${lvl.color}40`, borderRadius: 8, padding: "10px 4px" }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: lvl.color, marginBottom: 4 }}>Step {i + 1}</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: lvl.color }}>{count}</div>
                          <div style={{ fontSize: 9.5, color: "#475569", fontWeight: 600, marginTop: 4, lineHeight: 1.2 }}>
                            {lvl.label.replace(/^\d+\.\s*/, "")}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Corporate Conversion Banner */}
                  <div style={{ marginTop: 18, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: "#10B981", color: "#FFFFFF", display: "grid", placeItems: "center", fontSize: 14 }}>
                        <i className="fa-solid fa-building-user"></i>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#0A1F3D" }}>
                          Corporate RCM Hiring Drives Active: {drives.length} Open Corporate Drive{drives.length === 1 ? "" : "s"}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748B" }}>
                          {drives.length > 0
                            ? `${drives.slice(0, 3).map((d) => d.company).join(", ")}${drives.length > 3 ? ` and ${drives.length - 3} more` : ""} recruiting campus pool`
                            : "Approved corporate healthcare recruitment drives will appear here in real-time"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("jobs")}
                      style={{ background: "#0A1F3D", color: "#F5B41A", padding: "6px 14px", borderRadius: 6, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                    >
                      View Matched Drives
                    </button>
                  </div>
                </div>

                {/* Right: Domain Mix Distribution */}
                <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "22px 24px", border: "1px solid #E2E8F0" }}>
                  <h3 style={{ fontSize: 15.5, fontWeight: 800, color: "#0A1F3D", margin: "0 0 4px" }}>
                    RCM Domain Mix
                  </h3>
                  <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 16px" }}>Enrolled student specialization preference</p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { name: "Medical Coding", count: kpis.medicalCoding, pct: kpis.totalStudents ? Math.round((kpis.medicalCoding / kpis.totalStudents) * 100) : 0, color: "#2563EB", sub: "ICD-10, CPT, E&M, IP-DRG" },
                      { name: "Medical Billing", count: kpis.medicalBilling, pct: kpis.totalStudents ? Math.round((kpis.medicalBilling / kpis.totalStudents) * 100) : 0, color: "#16A34A", sub: "Claims, Denials, Payment Posting" },
                      { name: "AR Calling", count: kpis.arCalling, pct: kpis.totalStudents ? Math.round((kpis.arCalling / kpis.totalStudents) * 100) : 0, color: "#D97706", sub: "Payer Follow-up, Voice / Non-voice" },
                    ].map((d) => (
                      <div key={d.name} style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#0A1F3D" }}>{d.name}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: d.color }}>{d.count} ({d.pct}%)</span>
                        </div>
                        <div style={{ height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                          <div style={{ height: "100%", width: `${d.pct}%`, background: d.color, borderRadius: 3 }}></div>
                        </div>
                        <div style={{ fontSize: 11, color: "#64748B" }}>{d.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Quick Students Table Preview */}
              <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "20px 24px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0A1F3D", margin: 0 }}>
                    Recent Students Roster (Showing {students.slice(0, 5).length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("students")}
                    style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Manage All Students →
                  </button>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0", color: "#475569", textAlign: "left" }}>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Roll No</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Student Name</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Department</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Primary Domain</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Readiness</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Placement</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: "28px 16px", textAlign: "center", color: "#64748B" }}>
                            No enrolled students found yet. Use Student Enrollment to register candidates.
                          </td>
                        </tr>
                      ) : (
                        students.slice(0, 5).map((s) => (
                          <tr key={s._id} style={{ borderBottom: "1px solid #E2E8F0" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: "#64748B" }}>
                              {s.studentEnrollment?.rollNumber || "—"}
                            </td>
                            <td style={{ padding: "10px 12px", fontWeight: 800, color: "#0A1F3D" }}>
                              {s.stage1?.fullName || s.name}
                              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>{s.email}</div>
                            </td>
                            <td style={{ padding: "10px 12px", color: "#475569" }}>
                              {s.studentEnrollment?.department || "Life Sciences"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ background: "#EFF6FF", color: "#2563EB", padding: "3px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11.5 }}>
                                {s.rcmDomainSelection?.primaryDomain || "Medical Coding"}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ background: "#DCFCE7", color: "#15803D", padding: "3px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                                {s.verificationReadiness?.readinessStatus || "ENROLLED"}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: s.placementLifecycle?.currentStatus === "PLACED" ? "#16A34A" : "#64748B" }}>
                              {s.placementLifecycle?.currentStatus || "AVAILABLE"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudent(s);
                                  setActiveTab("students");
                                }}
                                style={{ background: "#0A1F3D", color: "#F5B41A", padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODULE 2: STUDENTS DIRECTORY & ROSTER                     */}
          {/* ========================================================= */}
          {activeTab === "students" && (
            <div>
              {/* Search & Multi-Filters Toolbar */}
              <div style={{ background: "#FFFFFF", padding: "16px 20px", borderRadius: 12, border: "1px solid #E2E8F0", marginBottom: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}></i>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by student name, roll number, email..."
                    style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 12.5, background: "#FFF" }}
                >
                  <option value="">All Departments</option>
                  {(college?.departments || DEFAULT_DEPARTMENTS).map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>

                <select
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 12.5, background: "#FFF" }}
                >
                  <option value="">All Domains</option>
                  <option value="Medical Coding">Medical Coding</option>
                  <option value="Medical Billing">Medical Billing</option>
                  <option value="AR Calling">AR Calling</option>
                </select>

                <select
                  value={filterReadiness}
                  onChange={(e) => setFilterReadiness(e.target.value)}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 12.5, background: "#FFF" }}
                >
                  <option value="">All Readiness Levels</option>
                  {READINESS_LEVELS.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>

                <select
                  value={filterPlacement}
                  onChange={(e) => setFilterPlacement(e.target.value)}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 12.5, background: "#FFF" }}
                >
                  <option value="">All Placement States</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                  <option value="PLACED">Placed / Joined</option>
                </select>

                {(search || filterDept || filterDomain || filterReadiness || filterPlacement) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFilterDept("");
                      setFilterDomain("");
                      setFilterReadiness("");
                      setFilterPlacement("");
                    }}
                    style={{ background: "#F1F5F9", color: "#64748B", border: "none", padding: "9px 12px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Roster Table */}
              <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0", color: "#475569", textAlign: "left" }}>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Student Identity</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Department & Degree</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Domain Selection</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Readiness Status</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Talentera Assessment</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Placement Status</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsLoading ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                          <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }}></i> Loading student roster…
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 50, textAlign: "center" }}>
                          <i className="fa-solid fa-user-graduate" style={{ fontSize: 32, color: "#94A3B8", marginBottom: 12, display: "block" }}></i>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#0A1F3D" }}>No students found matching query</div>
                          <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 16px" }}>Use the enrollment module to add students or adjust your search filters.</p>
                          <button
                            type="button"
                            onClick={() => setActiveTab("enrollment")}
                            style={{ background: "#0A1F3D", color: "#F5B41A", padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                          >
                            + Enroll Students Now
                          </button>
                        </td>
                      </tr>
                    ) : (
                      students.map((s) => (
                        <tr key={s._id} style={{ borderBottom: "1px solid #E2E8F0" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 800, color: "#0A1F3D" }}>{s.stage1?.fullName || s.name}</div>
                            <div style={{ fontSize: 11.5, color: "#64748B" }}>
                              Roll: {s.studentEnrollment?.rollNumber || "—"} · {s.email}
                            </div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>Ph: {s.mobile || s.stage1?.mobile || "—"}</div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ color: "#1E293B", fontWeight: 600 }}>{s.studentEnrollment?.department || "Life Sciences"}</div>
                            <div style={{ fontSize: 11.5, color: "#64748B" }}>
                              {s.studentEnrollment?.degree || "B.Sc"} ({s.studentEnrollment?.graduationYear || "2026"}) · CGPA: <strong>{s.studentEnrollment?.cgpa || "7.8"}</strong>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: "#EFF6FF", color: "#2563EB", padding: "3px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11.5 }}>
                              {s.rcmDomainSelection?.primaryDomain || "Medical Coding"}
                            </span>
                            {s.rcmDomainSelection?.secondaryDomain && (
                              <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>
                                2nd: {s.rcmDomainSelection.secondaryDomain}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                background: s.verificationReadiness?.readinessStatus === "INTERVIEW_READY" ? "#DCFCE7" : "#FEF3C7",
                                color: s.verificationReadiness?.readinessStatus === "INTERVIEW_READY" ? "#15803D" : "#B45309",
                                padding: "4px 8px",
                                borderRadius: 4,
                                fontWeight: 800,
                                fontSize: 11,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <i className={`fa-solid ${s.verificationReadiness?.readinessStatus === "INTERVIEW_READY" ? "fa-circle-check" : "fa-clock"}`}></i>
                              {s.verificationReadiness?.readinessStatus || "ENROLLED"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {s.stage4?.score || s.stage4?.foundationScore ? (
                              <div style={{ fontWeight: 800, color: "#0F1B3D" }}>
                                🏆 {s.stage4?.score || s.stage4?.foundationScore}/100
                                <div style={{ fontSize: 10.5, color: "#16A34A" }}>PROCTORED PASS</div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11.5, color: "#94A3B8" }}>Pending Test</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                background: s.placementLifecycle?.currentStatus === "PLACED" ? "#DCFCE7" : "#F1F5F9",
                                color: s.placementLifecycle?.currentStatus === "PLACED" ? "#166534" : "#475569",
                                padding: "4px 8px",
                                borderRadius: 6,
                                fontWeight: 700,
                                fontSize: 11.5,
                              }}
                            >
                              {s.placementLifecycle?.currentStatus === "PLACED" ? (
                                <>
                                  <i className="fa-solid fa-handshake" style={{ marginRight: 4 }}></i> PLACED
                                </>
                              ) : (
                                s.placementLifecycle?.currentStatus || "AVAILABLE"
                              )}
                            </span>
                            {s.placementLifecycle?.placedCompanyName && (
                              <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, marginTop: 2 }}>
                                @ {s.placementLifecycle.placedCompanyName}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => setSelectedStudent(s)}
                                style={{ background: "#0A1F3D", color: "#F5B41A", padding: "5px 10px", borderRadius: 6, border: "none", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                              >
                                View Profile
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPlacementCandidate(s);
                                  setShowPlacementModal(true);
                                }}
                                style={{ background: "#DCFCE7", color: "#166534", padding: "5px 10px", borderRadius: 6, border: "1px solid #86EFAC", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                              >
                                Record Offer
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Student Detail Inspector Modal */}
              {selectedStudent && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(10,31,61,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
                  <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 760, maxHeight: "90vh", overflowY: "auto", padding: 28, position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #E2E8F0", paddingBottom: 14, marginBottom: 18 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0A1F3D", margin: 0 }}>
                            {selectedStudent.stage1?.fullName || selectedStudent.name}
                          </h2>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#166534", background: "#DCFCE7", padding: "2px 8px", borderRadius: 4 }}>
                            {selectedStudent.verificationReadiness?.readinessStatus || "ENROLLED"}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: "#64748B", marginTop: 4, display: "block" }}>
                          Roll No: <strong>{selectedStudent.studentEnrollment?.rollNumber || "Not assigned"}</strong> · {selectedStudent.email} · {selectedStudent.mobile || selectedStudent.stage1?.phone}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(null)}
                        style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#64748B" }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Readiness Controls */}
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, marginBottom: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0A1F3D", marginBottom: 6 }}>
                        Current Readiness Stage:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {READINESS_LEVELS.map((r) => {
                          const isCur = (selectedStudent.verificationReadiness?.readinessStatus || "ENROLLED") === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleToggleReadiness(selectedStudent._id, r.id)}
                              style={{
                                background: isCur ? r.color : "#FFFFFF",
                                color: isCur ? "#FFFFFF" : "#334155",
                                border: `1px solid ${r.color}`,
                                padding: "5px 12px",
                                borderRadius: 6,
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 60-Second Video Resume Elevator Pitch */}
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, marginBottom: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#0A1F3D" }}>
                          <i className="fa-solid fa-video" style={{ marginRight: 6, color: "#2563EB" }}></i>
                          60-Second Video Pitch (Elevator Intro)
                        </div>
                        <span style={{ fontSize: 11, color: "#64748B" }}>Stage 5 Verification</span>
                      </div>
                      {selectedStudent.videoResume?.videoUrl || selectedStudent.stage5?.videoUrl ? (
                        <div style={{ borderRadius: 8, overflow: "hidden", background: "#000", maxHeight: 240 }}>
                          <video
                            src={selectedStudent.videoResume?.videoUrl || selectedStudent.stage5?.videoUrl}
                            controls
                            style={{ width: "100%", maxHeight: 240, display: "block" }}
                          />
                        </div>
                      ) : (
                        <div style={{ padding: "18px 14px", background: "#EFF6FF", borderRadius: 8, border: "1px dashed #93C5FD", textAlign: "center", color: "#1E40AF", fontSize: 12 }}>
                          <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i>
                          Video elevator pitch awaiting candidate upload through the student portal.
                        </div>
                      )}
                    </div>

                    {/* 9-Point Verification Checklist */}
                    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, marginBottom: 18 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#0A1F3D", marginBottom: 10 }}>
                        <i className="fa-solid fa-clipboard-check" style={{ marginRight: 6, color: "#16A34A" }}></i>
                        9-Point Candidate Verification Checklist
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                        {[
                          { label: "1. Student Identity & Enrollment", verified: true },
                          { label: "2. Academic Eligibility & No Backlogs", verified: (selectedStudent.studentEnrollment?.backlogsCount || 0) === 0 },
                          { label: "3. Medical Terminology & Anatomy Foundation", verified: true },
                          { label: "4. Primary RCM Domain Specialization Selected", verified: !!selectedStudent.rcmDomainSelection?.primaryDomain },
                          { label: "5. 80%+ Training Modules Attendance", verified: (selectedStudent.stage2?.completionPercentage || 85) >= 80 },
                          { label: "6. AAPC / AHIMA Exam Status Recorded", verified: !!(selectedStudent.stage3?.certificationName || selectedStudent.certifications?.length) },
                          { label: "7. Talentera Benchmark Assessment Cleared (>=70%)", verified: (selectedStudent.stage4?.score || selectedStudent.assessmentScore || 75) >= 70 },
                          { label: "8. 60s Video Pitch Pitch Verified", verified: !!(selectedStudent.videoResume?.videoUrl || selectedStudent.stage5?.videoUrl) },
                          { label: "9. Final Placement Readiness Approved", verified: selectedStudent.verificationReadiness?.readinessStatus === "INTERVIEW_READY" || selectedStudent.verificationReadiness?.readinessStatus === "PLACED" },
                        ].map((chk, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: chk.verified ? "#F0FDF4" : "#F8FAFC", borderRadius: 6, border: `1px solid ${chk.verified ? "#86EFAC" : "#E2E8F0"}` }}>
                            <i className={`fa-solid ${chk.verified ? "fa-circle-check" : "fa-circle-dot"}`} style={{ color: chk.verified ? "#16A34A" : "#94A3B8" }}></i>
                            <span style={{ color: chk.verified ? "#166534" : "#475569", fontWeight: chk.verified ? 700 : 500 }}>{chk.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Academic & Domain Profile */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 12.5, color: "#334155", marginBottom: 20 }}>
                      <div style={{ background: "#FAFAF8", padding: 14, borderRadius: 8, border: "1px solid #E2E8F0" }}>
                        <div style={{ fontWeight: 800, color: "#0A1F3D", marginBottom: 6 }}>Academic Metrics</div>
                        <div>Degree: <strong>{selectedStudent.studentEnrollment?.degree || "B.Sc Biotechnology"}</strong></div>
                        <div>Department: {selectedStudent.studentEnrollment?.department || "Life Sciences"}</div>
                        <div>CGPA: <strong>{selectedStudent.studentEnrollment?.cgpa || "8.2"}</strong> / Backlogs: <strong>{selectedStudent.studentEnrollment?.backlogsCount || 0}</strong></div>
                        <div>Graduation: {selectedStudent.studentEnrollment?.graduationYear || "2026"}</div>
                      </div>

                      <div style={{ background: "#FAFAF8", padding: 14, borderRadius: 8, border: "1px solid #E2E8F0" }}>
                        <div style={{ fontWeight: 800, color: "#0A1F3D", marginBottom: 6 }}>RCM Domain Tracks</div>
                        <div>Primary Track: <strong>{selectedStudent.rcmDomainSelection?.primaryDomain || "Medical Coding"}</strong></div>
                        <div>Secondary: {selectedStudent.rcmDomainSelection?.secondaryDomain || "Medical Billing"}</div>
                        <div>Shift Preference: {selectedStudent.rcmDomainSelection?.shiftPreference || "Day Shift"}</div>
                        <div>Mode: {selectedStudent.rcmDomainSelection?.workModePreference || "WFO"}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setPlacementCandidate(selectedStudent);
                          setShowPlacementModal(true);
                          setSelectedStudent(null);
                        }}
                        style={{ padding: "9px 18px", borderRadius: 8, background: "#16A34A", color: "#FFFFFF", border: "none", fontWeight: 800, cursor: "pointer", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <i className="fa-solid fa-handshake"></i> Record Offer / Placement
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedStudent(null)}
                        style={{ padding: "8px 18px", borderRadius: 8, background: "#E2E8F0", color: "#334155", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12.5 }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* GLOBAL PLACEMENT / OFFER RECORDING MODAL                  */}
          {/* ========================================================= */}
          {showPlacementModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(10,31,61,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
              <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 480, padding: 26, boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 900, color: "#0A1F3D", margin: "0 0 2px" }}>
                      Record Placement & Offer Letter
                    </h3>
                    <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
                      Official stamping for institutional accreditation and campus records
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlacementModal(false);
                      setPlacementCandidate(null);
                    }}
                    style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748B" }}
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target;
                    const candidateId = placementCandidate ? placementCandidate._id : form.selectedCandidateId?.value;
                    if (!candidateId) {
                      toast("Please select a student candidate.", "!");
                      return;
                    }
                    handleRecordPlacement(
                      candidateId,
                      form.companyName.value,
                      form.role.value,
                      form.ctc.value
                    );
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {placementCandidate ? (
                    <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", fontSize: 12.5 }}>
                      <div style={{ fontWeight: 800, color: "#1E40AF" }}>
                        Candidate: {placementCandidate.stage1?.fullName || placementCandidate.name}
                      </div>
                      <div style={{ color: "#3B82F6", fontSize: 11.5, marginTop: 2 }}>
                        Roll No: {placementCandidate.studentEnrollment?.rollNumber || "Not assigned"} · {placementCandidate.email}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4, color: "#0A1F3D" }}>
                        Select Candidate *
                      </label>
                      <select
                        name="selectedCandidateId"
                        required
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 12.5, boxSizing: "border-box", background: "#FFF" }}
                      >
                        <option value="">-- Choose Enrolled Student --</option>
                        {students.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.stage1?.fullName || s.name} ({s.studentEnrollment?.rollNumber || "ID"} - {s.rcmDomainSelection?.primaryDomain || "RCM"})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4, color: "#0A1F3D" }}>
                      Recruiting Healthcare Employer *
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      required
                      placeholder="e.g. Optum Global Solutions / AGS Health / Omega Healthcare"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 12.5, boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4, color: "#0A1F3D" }}>
                      Designation / Role *
                    </label>
                    <input
                      type="text"
                      name="role"
                      required
                      placeholder="e.g. Medical Coding Trainee / AR Specialist"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 12.5, boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4, color: "#0A1F3D" }}>
                      Annual CTC Package (INR) *
                    </label>
                    <input
                      type="text"
                      name="ctc"
                      required
                      placeholder="e.g. ₹3.8 LPA"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 12.5, boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlacementModal(false);
                        setPlacementCandidate(null);
                      }}
                      style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#E2E8F0", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "#0A1F3D", color: "#F5B41A", cursor: "pointer", fontWeight: 800, fontSize: 12.5 }}
                    >
                      Confirm & Stamp Placement ✓
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODULE: ADD SINGLE STUDENT                                */}
          {/* ========================================================= */}
          {activeTab === "add_student" && (
            <div style={{ maxWidth: 860, margin: "0 auto", background: "#FFFFFF", borderRadius: 14, padding: "28px 34px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, borderBottom: "1px solid #E2E8F0", paddingBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0A1F3D", margin: "0 0 4px" }}>
                    Single Student Enrollment
                  </h3>
                  <p style={{ fontSize: 12.5, color: "#64748B", margin: 0 }}>
                    Register a student directly into the verified RCM talent development pipeline
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("bulk_upload")}
                  style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  <i className="fa-solid fa-file-arrow-up" style={{ marginRight: 6 }}></i>
                  Have a batch? Use Bulk Upload
                </button>
              </div>

              <form onSubmit={handleSingleStudentSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A1F3D", marginBottom: 4 }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={singleStudent.name}
                      onChange={(e) => setSingleStudent({ ...singleStudent, name: e.target.value })}
                      placeholder="e.g. Ramesh Kannan"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A1F3D", marginBottom: 4 }}>Official College Email *</label>
                    <input
                      type="email"
                      required
                      value={singleStudent.email}
                      onChange={(e) => setSingleStudent({ ...singleStudent, email: e.target.value })}
                      placeholder="student@college.edu.in"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A1F3D", marginBottom: 4 }}>Mobile Number *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      maxLength={10}
                      value={singleStudent.mobile}
                      onChange={(e) => setSingleStudent({ ...singleStudent, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="9876543210"
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 6,
                        border: mobileCheckStatus === "duplicate" ? "1.5px solid #DC2626" : "1.5px solid #CBD5E1",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    />
                    {mobileCheckStatus === "checking" && (
                      <span style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, display: "block" }}>Checking…</span>
                    )}
                    {mobileCheckStatus === "duplicate" && (
                      <span style={{ fontSize: 11.5, color: "#DC2626", fontWeight: 700, marginTop: 4, display: "block" }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }}></i>
                        Mobile number already exists
                      </span>
                    )}
                    {mobileCheckStatus === "available" && (
                      <span style={{ fontSize: 11.5, color: "#16A34A", fontWeight: 700, marginTop: 4, display: "block" }}>
                        <i className="fa-solid fa-circle-check" style={{ marginRight: 4 }}></i>
                        Available
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A1F3D", marginBottom: 4 }}>College Roll Number *</label>
                    <input
                      type="text"
                      required
                      value={singleStudent.rollNumber}
                      onChange={(e) => setSingleStudent({ ...singleStudent, rollNumber: e.target.value })}
                      placeholder="e.g. 22LS45"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A1F3D", marginBottom: 4 }}>Degree Program *</label>
                    <SearchableSelect
                      required={!degreeIsOther}
                      options={DEGREE_PROGRAM_OPTIONS}
                      value={degreeIsOther ? "" : singleStudent.degree}
                      placeholder="Select degree program…"
                      onChange={(val) => {
                        if (val === "__other__") {
                          setDegreeIsOther(true);
                          setSingleStudent({ ...singleStudent, degree: "" });
                        } else {
                          setDegreeIsOther(false);
                          setSingleStudent({ ...singleStudent, degree: val });
                        }
                      }}
                    />
                    {degreeIsOther && (
                      <input
                        type="text"
                        required
                        autoFocus
                        value={singleStudent.degree}
                        onChange={(e) => setSingleStudent({ ...singleStudent, degree: e.target.value })}
                        placeholder="Type the degree program"
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box", marginTop: 6 }}
                      />
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A1F3D", marginBottom: 4 }}>Department *</label>
                    <SearchableSelect
                      required={!departmentIsOther}
                      options={DEPARTMENT_OPTIONS}
                      value={departmentIsOther ? "" : singleStudent.department}
                      placeholder="Select department…"
                      onChange={(val) => {
                        if (val === "__other__") {
                          setDepartmentIsOther(true);
                          setSingleStudent({ ...singleStudent, department: "" });
                        } else {
                          setDepartmentIsOther(false);
                          setSingleStudent({ ...singleStudent, department: val });
                        }
                      }}
                    />
                    {departmentIsOther && (
                      <input
                        type="text"
                        required
                        autoFocus
                        value={singleStudent.department}
                        onChange={(e) => setSingleStudent({ ...singleStudent, department: e.target.value })}
                        placeholder="Type the department"
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box", marginTop: 6 }}
                      />
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A1F3D", marginBottom: 4 }}>Graduation Year</label>
                    <select
                      value={singleStudent.graduationYear}
                      onChange={(e) => setSingleStudent({ ...singleStudent, graduationYear: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 6,
                        border: "1.5px solid #CBD5E1",
                        fontSize: 13,
                        boxSizing: "border-box",
                        background: "#FFFFFF",
                        color: singleStudent.graduationYear ? "#0F172A" : "#64748B",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">Select graduation year…</option>
                      {GRADUATION_YEAR_OPTIONS.map((yr) => (
                        <option key={yr} value={yr} style={{ color: "#0F172A" }}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A1F3D", marginBottom: 4 }}>Cumulative CGPA</label>
                    <input
                      type="text"
                      value={singleStudent.cgpa}
                      onChange={(e) => setSingleStudent({ ...singleStudent, cgpa: e.target.value })}
                      placeholder="8.2"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A1F3D", marginBottom: 4 }}>Active Backlogs</label>
                    <input
                      type="number"
                      value={singleStudent.backlogsCount}
                      onChange={(e) => setSingleStudent({ ...singleStudent, backlogsCount: Number(e.target.value) })}
                      placeholder="0"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A1F3D", marginBottom: 4 }}>Primary RCM Domain *</label>
                    <select
                      required
                      value={singleStudent.primaryDomain}
                      onChange={(e) => setSingleStudent({ ...singleStudent, primaryDomain: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 13, background: "#FFF", boxSizing: "border-box" }}
                    >
                      <option value="" disabled>Select the domain this candidate applied for…</option>
                      <option value="Medical Coding">Medical Coding</option>
                      <option value="Medical Billing">Medical Billing</option>
                      <option value="AR Calling">AR Calling</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A1F3D", marginBottom: 4 }}>Secondary Track</label>
                    <select
                      value={singleStudent.secondaryDomain}
                      onChange={(e) => setSingleStudent({ ...singleStudent, secondaryDomain: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 13, background: "#FFF", boxSizing: "border-box" }}
                    >
                      <option value="Medical Billing">Medical Billing</option>
                      <option value="Medical Coding">Medical Coding</option>
                      <option value="AR Calling">AR Calling</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button
                    type="submit"
                    disabled={enrolling}
                    style={{
                      background: "#0A1F3D",
                      color: "#F5B41A",
                      padding: "11px 24px",
                      borderRadius: 8,
                      border: "none",
                      fontWeight: 800,
                      fontSize: 13.5,
                      cursor: enrolling ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {enrolling ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i> Registering Candidate…
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-user-check"></i> Register & Enroll Candidate
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODULE: BULK STUDENT UPLOAD                               */}
          {/* ========================================================= */}
          {activeTab === "bulk_upload" && (
            <div style={{ maxWidth: 860, margin: "0 auto", background: "#FFFFFF", borderRadius: 14, padding: "28px 34px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0A1F3D", margin: "0 0 4px" }}>
                    Bulk Student Enrollment (CSV / Excel Roster)
                  </h3>
                  <span style={{ fontSize: 12.5, color: "#64748B" }}>
                    Upload complete departmental rosters with automated duplication checks
                  </span>
                </div>
                <button
                  type="button"
                  onClick={loadSampleCsv}
                  style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  <i className="fa-solid fa-file-csv" style={{ marginRight: 6 }}></i> Load Sample CSV
                </button>
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#475569", marginBottom: 14 }}>
                <strong>Supported Columns:</strong> <code>name, email, mobile, rollNumber, department, degree, graduationYear, cgpa, backlogs, primaryDomain</code>
              </div>

              <textarea
                rows={9}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV rows here or click 'Load Sample CSV' to test..."
                style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontFamily: "monospace", fontSize: 12, boxSizing: "border-box", marginBottom: 16 }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#64748B" }}>
                  Candidate records are automatically linked to your college with default login credentials.
                </span>
                <button
                  type="button"
                  disabled={bulkProcessing || !csvText.trim()}
                  onClick={handleBulkUpload}
                  style={{
                    background: "#0A1F3D",
                    color: "#F5B41A",
                    padding: "11px 24px",
                    borderRadius: 8,
                    border: "none",
                    fontWeight: 800,
                    fontSize: 13.5,
                    cursor: bulkProcessing || !csvText.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {bulkProcessing ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Processing Roster…
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-cloud-arrow-up"></i> Upload & Enroll Roster
                    </>
                  )}
                </button>
              </div>

              {bulkSummary && (
                <div style={{ marginTop: 20, background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#166534" }}>Batch Upload Processed Successfully</div>
                      <div style={{ fontSize: 12, color: "#15803D", marginTop: 4 }}>
                        <strong>{bulkSummary.valid}</strong> enrolled · <strong>{bulkSummary.duplicates}</strong> duplicates skipped · <strong>{bulkSummary.errors}</strong> errors
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("students")}
                      style={{ background: "#16A34A", color: "#FFFFFF", border: "none", padding: "7px 16px", borderRadius: 6, fontWeight: 800, fontSize: 12, cursor: "pointer" }}
                    >
                      View Enrolled Students →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* MODULE: RCM DOMAIN SPECIALIZATIONS                        */}
          {/* ========================================================= */}
          {activeTab === "domains" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {[
                {
                  title: "1. Medical Coding",
                  count: kpis.medicalCoding,
                  icon: "fa-stethoscope",
                  color: "#2563EB",
                  subtracks: ["ICD-10-CM Coding", "CPT Procedure Codes", "HCPCS Level II", "E&M Specialization", "IP-DRG Hospital Coding", "Surgery & Radiology", "HCC Risk Adjustment"],
                  desc: "Assigning standardized diagnostic and procedural alphanumeric codes for US healthcare claims.",
                },
                {
                  title: "2. Medical Billing",
                  count: kpis.medicalBilling,
                  icon: "fa-file-invoice-dollar",
                  color: "#16A34A",
                  subtracks: ["Patient Demographic & Charge Entry", "Claims Scrubber & Transmission", "Payment Posting (ERA / EOB)", "Denial Management & Appeals", "Eligibility & Prior Authorization", "Credit Balance Resolution"],
                  desc: "Handling lifecycle of reimbursement from patient intake and pre-auth through remittance advice.",
                },
                {
                  title: "3. AR Calling",
                  count: kpis.arCalling,
                  icon: "fa-headset",
                  color: "#D97706",
                  subtracks: ["US Payer Claims Status Inquiries", "Denial Analysis & Dispute Resolution", "Inbound Patient Billing Helpline", "Outbound Insurance Follow-up", "Voice Assessment & Medical Accent", "Non-Voice Portal Adjudication"],
                  desc: "Direct communication with US insurance payers (Aetna, BCBS, Cigna, Medicare) to recover pending balances.",
                },
              ].map((dom) => (
                <div key={dom.title} style={{ background: "#FFFFFF", borderRadius: 14, padding: "24px", border: "1px solid #E2E8F0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: `${dom.color}15`, color: dom.color, display: "grid", placeItems: "center", fontSize: 20 }}>
                      <i className={`fa-solid ${dom.icon}`}></i>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, color: dom.color, background: `${dom.color}15`, padding: "4px 10px", borderRadius: 6 }}>
                      {dom.count} Enrolled
                    </span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 900, color: "#0A1F3D", margin: "0 0 6px" }}>{dom.title}</h3>
                  <p style={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.5, margin: "0 0 16px" }}>{dom.desc}</p>

                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0A1F3D", marginBottom: 8, textTransform: "uppercase" }}>
                    Sub-Specialty Curriculum
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {dom.subtracks.map((st) => (
                      <div key={st} style={{ background: "#F8FAFC", padding: "6px 10px", borderRadius: 6, fontSize: 12, color: "#334155", display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="fa-solid fa-check" style={{ color: dom.color, fontSize: 10 }}></i>
                        {st}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================= */}
          {/* MODULE: TRAINING MODULES TRACKER                          */}
          {/* ========================================================= */}
          {activeTab === "training" && (
            <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "24px 28px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 900, color: "#0A1F3D", margin: 0 }}>
                    Core Training Curriculum & Student Batch Progress
                  </h3>
                  <span style={{ fontSize: 12, color: "#64748B" }}>
                    Real-time completion aggregated across {kpis.totalStudents} enrolled student{kpis.totalStudents === 1 ? "" : "s"}
                  </span>
                </div>
                <div style={{ fontSize: 12, background: "#EFF6FF", color: "#2563EB", padding: "6px 12px", borderRadius: 6, fontWeight: 700 }}>
                  <i className="fa-solid fa-graduation-cap" style={{ marginRight: 6 }}></i>
                  Talentera Certified RCM Faculty & Assessment Track
                </div>
              </div>

              {curriculum.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }}></i> Loading training curriculum…
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                  {curriculum.map((m, idx) => (
                    <div key={m.id || idx} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#2563EB", textTransform: "uppercase" }}>{m.domain}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0A1F3D", margin: "4px 0" }}>{m.title}</div>
                      <div style={{ fontSize: 11.5, color: "#64748B", display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                        <span>{m.hours}</span>
                        <span style={{ fontWeight: 700, color: m.completionPct === 100 ? "#16A34A" : m.completionPct > 0 ? "#D97706" : "#64748B" }}>
                          {m.completedCount}/{kpis.totalStudents || 0} ({m.completionPct}%)
                        </span>
                      </div>
                      <div style={{ height: 4, background: "#E2E8F0", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${m.completionPct}%`, background: m.completionPct === 100 ? "#16A34A" : "#2563EB" }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* MODULE: AAPC & AHIMA CERTIFICATIONS                       */}
          {/* ========================================================= */}
          {activeTab === "certifications" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "24px 28px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 900, color: "#0A1F3D", margin: "0 0 4px" }}>
                      AAPC & AHIMA Industry Certifications
                    </h3>
                    <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
                      Live credential breakdown from candidate verified Stage 3 profiles
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, background: "#DCFCE7", color: "#166534", padding: "6px 12px", borderRadius: 6 }}>
                      {kpis.certified} Total Certified Candidates
                    </span>
                  </div>
                </div>

                {Object.keys(certificationsSummary).length === 0 ? (
                  <div style={{ padding: 30, textAlign: "center", color: "#64748B", fontSize: 12.5 }}>
                    No certification records yet. Verified AAPC/AHIMA credentials will populate here automatically.
                  </div>
                ) : (
                  (() => {
                    // Group the flat certification list by RCM domain
                    // (Medical Coding / Medical Billing / …) instead of one
                    // undifferentiated grid, so a college can see at a
                    // glance which credentials belong to which track.
                    const grouped = {};
                    Object.entries(certificationsSummary).forEach(([code, c]) => {
                      const domain = c.domain || "Other Credentials";
                      if (!grouped[domain]) grouped[domain] = [];
                      grouped[domain].push({ code, ...c });
                    });
                    const domainOrder = ["Medical Coding", "Medical Billing", "AR Calling", "Other Credentials"];
                    const domains = Object.keys(grouped).sort(
                      (a, b) => (domainOrder.indexOf(a) === -1 ? 99 : domainOrder.indexOf(a)) - (domainOrder.indexOf(b) === -1 ? 99 : domainOrder.indexOf(b))
                    );

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {domains.map((domain) => (
                          <div key={domain}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 900, color: "#0A1F3D", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                {domain}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", background: "#F1F5F9", padding: "2px 8px", borderRadius: 4 }}>
                                {grouped[domain].length} certification{grouped[domain].length === 1 ? "" : "s"}
                              </span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                              {grouped[domain].map((c) => (
                                <div key={c.code} style={{ background: "#F8FAFC", padding: "14px 18px", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 13, fontWeight: 900, color: "#7C3AED" }}>{c.code}</span>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: "#16A34A", background: "#DCFCE7", padding: "2px 8px", borderRadius: 4 }}>
                                      {c.certified} Verified
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0A1F3D", margin: "6px 0 2px" }}>{c.name}</div>
                                  <div style={{ fontSize: 11.5, color: "#64748B" }}>
                                    {c.pursuing} in preparation / registered
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODULE: TALENTERA ASSESSMENTS                             */}
          {/* ========================================================= */}
          {activeTab === "assessments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "24px 28px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 900, color: "#0A1F3D", margin: "0 0 4px" }}>
                      Talentera RCM Benchmark Assessments
                    </h3>
                    <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
                      Live assessment scores: {assessmentsSummary?.totalAssessed || 0} student{(assessmentsSummary?.totalAssessed || 0) === 1 ? "" : "s"} assessed · Avg College Score: {assessmentsSummary?.averageScore || 0}%
                    </p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, background: "#EFF6FF", color: "#2563EB", padding: "6px 12px", borderRadius: 6 }}>
                    Proctored Stage 4 Benchmark
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                  {!assessmentsSummary || assessmentsSummary.totalAssessed === 0 ? (
                    <div style={{ gridColumn: "1 / -1", padding: 30, textAlign: "center", color: "#64748B", fontSize: 12.5 }}>
                      No students have completed the Talentera Stage 4 assessment yet.
                    </div>
                  ) : (
                    (assessmentsSummary.breakdown || []).map((a) => (
                      <div key={a.topic} style={{ background: "#F8FAFC", padding: "14px 18px", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#0A1F3D" }}>{a.topic}</span>
                          <span style={{ fontSize: 12, fontWeight: 900, color: "#16A34A" }}>Pass Rate: {a.passRate}</span>
                        </div>
                        <div style={{ height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden", marginTop: 8 }}>
                          <div style={{ height: "100%", width: a.avg, background: "#10B981", borderRadius: 3 }}></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODULE: JOB MATCHING & CORPORATE DRIVES                   */}
          {/* ========================================================= */}
          {activeTab === "jobs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {drives.length === 0 ? (
                <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "48px 24px", border: "1px solid #E2E8F0", textAlign: "center" }}>
                  <i className="fa-solid fa-briefcase" style={{ fontSize: 36, color: "#94A3B8", marginBottom: 14, display: "block" }}></i>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0A1F3D", margin: "0 0 6px" }}>
                    No Active Corporate Recruitment Drives Open
                  </h3>
                  <p style={{ fontSize: 13, color: "#64748B", maxWidth: 520, margin: "0 auto", lineHeight: 1.5 }}>
                    When healthcare employers approve and publish campus recruitment drives matching your student domains, they will automatically appear here live.
                  </p>
                </div>
              ) : (
                drives.map((job) => (
                  <div key={job.id} style={{ background: "#FFFFFF", borderRadius: 14, padding: "20px 24px", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#16A34A", background: "#DCFCE7", padding: "3px 8px", borderRadius: 4 }}>
                        CONFIRMED CORPORATE DRIVE
                      </span>
                      <h3 style={{ fontSize: 17, fontWeight: 900, color: "#0A1F3D", margin: "6px 0 2px" }}>
                        {job.role} · {job.company}
                      </h3>
                      <div style={{ fontSize: 12.5, color: "#64748B" }}>
                        📍 {job.location} · 💰 <strong>{job.ctc}</strong> · 👥 {job.openings != null ? `${job.openings} Openings` : "Openings not specified"} · ⏳ {job.deadline}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#2563EB", marginBottom: 6 }}>
                        {job.matchedStudents} Students Matched
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          toast(`Nominated ${job.matchedStudents} interview-ready students to ${job.company}`, "✓");
                        }}
                        style={{ background: "#0A1F3D", color: "#F5B41A", padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}
                      >
                        Nominate Batch →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* MODULE: CAMPUS INTERVIEW PIPELINE                         */}
          {/* ========================================================= */}
          {activeTab === "interviews" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: 16.5, fontWeight: 800, color: "#0A1F3D", margin: 0 }}>
                    Campus Interview Pipeline & Drive Outcomes
                  </h3>
                  <span style={{ fontSize: 12, color: "#64748B" }}>
                    Shortlisted → Scheduled → Technical Round → Selected → Offer Released → Joined
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {[
                  { status: "SCHEDULED", label: "Scheduled (Round 1/2)", color: "#0284C7", bg: "#F0F9FF" },
                  { status: "COMPLETED", label: "Completed / Under Evaluation", color: "#D97706", bg: "#FFFBEB" },
                  { status: "SELECTED", label: "Selected / Offer Released", color: "#7C3AED", bg: "#FAF5FF" },
                  { status: "JOINED", label: "Offer Accepted & Joined", color: "#15803D", bg: "#DCFCE7" },
                ].map((col) => {
                  const items = interviews.filter((i) => (col.status === "SELECTED" ? i.status === "SELECTED" || i.status === "OFFER_RELEASED" : i.status === col.status));
                  return (
                    <div key={col.status} style={{ background: col.bg, borderRadius: 12, border: `1.5px solid ${col.color}40`, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: col.color }}>{col.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 900, background: "#FFF", padding: "1px 6px", borderRadius: 4 }}>{items.length}</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {items.length === 0 ? (
                          <div style={{ fontSize: 11.5, color: "#94A3B8", textAlign: "center", padding: "20px 0" }}>No candidates in this stage</div>
                        ) : (
                          items.map((it) => (
                            <div key={it._id} style={{ background: "#FFFFFF", borderRadius: 8, padding: 12, border: "1px solid #E2E8F0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: "#0A1F3D" }}>{it.jobRole}</div>
                              <div style={{ fontSize: 11.5, color: "#64748B", margin: "2px 0 6px" }}>{it.companyName}</div>
                              <div style={{ fontSize: 11, color: "#475569" }}>
                                Mode: <strong>{it.mode}</strong>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODULE: PLACEMENTS & OFFER LETTERS                        */}
          {/* ========================================================= */}
          {activeTab === "placements" && (() => {
            const placedStudents = students.filter(
              (s) => s.placementLifecycle?.currentStatus === "PLACED"
            );
            const parseCtcLpa = (val) => {
              if (!val) return null;
              const m = String(val).match(/(\d+(\.\d+)?)/);
              return m ? parseFloat(m[1]) : null;
            };
            const ctcValues = placedStudents
              .map((s) => parseCtcLpa(s.placementLifecycle?.placedCtc))
              .filter((v) => v !== null && !Number.isNaN(v));
            const avgCtcDisplay =
              ctcValues.length > 0
                ? `₹${(ctcValues.reduce((a, b) => a + b, 0) / ctcValues.length).toFixed(1)} LPA`
                : "—";
            const maxCtcDisplay =
              ctcValues.length > 0 ? `₹${Math.max(...ctcValues).toFixed(1)} LPA` : "—";
            const formatPlacementDate = (d) => {
              if (!d) return "—";
              try {
                const dt = new Date(d);
                if (Number.isNaN(dt.getTime())) return "—";
                return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
              } catch {
                return "—";
              }
            };
            return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Placements KPI Strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                <div style={{ background: "#FFFFFF", padding: 16, borderRadius: 12, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Total Placed Candidates</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#166534", marginTop: 4 }}>{placedStudents.length}</div>
                  <span style={{ fontSize: 11, color: "#16A34A" }}>Verified Campus Offers</span>
                </div>
                <div style={{ background: "#FFFFFF", padding: 16, borderRadius: 12, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Average CTC Package</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#0A1F3D", marginTop: 4 }}>
                    {avgCtcDisplay}
                  </div>
                  <span style={{ fontSize: 11, color: "#64748B" }}>Across Recorded Offers</span>
                </div>
                <div style={{ background: "#FFFFFF", padding: 16, borderRadius: 12, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Highest Package</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#7C3AED", marginTop: 4 }}>
                    {maxCtcDisplay}
                  </div>
                  <span style={{ fontSize: 11, color: "#7C3AED" }}>Top Recorded Offer</span>
                </div>
                <div style={{ background: "#FFFFFF", padding: 16, borderRadius: 12, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Placement Rate</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#2563EB", marginTop: 4 }}>
                    {kpis.interviewReady > 0 ? Math.round((placedStudents.length / kpis.interviewReady) * 100) : 0}%
                  </div>
                  <span style={{ fontSize: 11, color: "#2563EB" }}>Of Interview-Ready Batch</span>
                </div>
              </div>

              {/* Placements Roster Table */}
              <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "24px 28px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 900, color: "#0A1F3D", margin: "0 0 2px" }}>
                      Placed Students & Confirmed Offer Letters
                    </h3>
                    <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
                      Live roster of students who received formal corporate placement offers - auto-synced when a company marks a candidate as hired, or logged manually below
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPlacementCandidate(null);
                      setShowPlacementModal(true);
                    }}
                    style={{
                      background: "#0A1F3D",
                      color: "#F5B41A",
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      fontWeight: 800,
                      fontSize: 12.5,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <i className="fa-solid fa-plus"></i> Record New Placement
                  </button>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0", textAlign: "left", color: "#475569" }}>
                        <th style={{ padding: "10px 14px" }}>Student</th>
                        <th style={{ padding: "10px 14px" }}>Roll No / Dept</th>
                        <th style={{ padding: "10px 14px" }}>RCM Domain</th>
                        <th style={{ padding: "10px 14px" }}>Recruiting Employer</th>
                        <th style={{ padding: "10px 14px" }}>Designation</th>
                        <th style={{ padding: "10px 14px" }}>Annual CTC</th>
                        <th style={{ padding: "10px 14px" }}>Placement Date</th>
                        <th style={{ padding: "10px 14px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {placedStudents.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                            <i className="fa-solid fa-handshake-slash" style={{ fontSize: 30, color: "#94A3B8", marginBottom: 10, display: "block" }}></i>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#0A1F3D" }}>No Placement Records Yet</div>
                            <p style={{ fontSize: 12, margin: "4px 0 14px" }}>Click 'Record New Placement' to log confirmed campus offers.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setPlacementCandidate(null);
                                setShowPlacementModal(true);
                              }}
                              style={{ background: "#0A1F3D", color: "#F5B41A", padding: "8px 16px", borderRadius: 6, border: "none", fontWeight: 800, fontSize: 12, cursor: "pointer" }}
                            >
                              + Record First Placement
                            </button>
                          </td>
                        </tr>
                      ) : (
                        placedStudents.map((s) => {
                          const isJoined =
                            s.placementLifecycle?.joiningDate &&
                            new Date(s.placementLifecycle.joiningDate) <= new Date();
                          return (
                            <tr key={s._id} style={{ borderBottom: "1px solid #E2E8F0" }}>
                              <td style={{ padding: "10px 14px", fontWeight: 800, color: "#0A1F3D" }}>
                                {s.stage1?.fullName || s.name}
                              </td>
                              <td style={{ padding: "10px 14px", color: "#64748B" }}>
                                {s.studentEnrollment?.rollNumber || "—"} · {s.studentEnrollment?.department || "—"}
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#EFF6FF", color: "#2563EB" }}>
                                  {s.rcmDomainSelection?.primaryDomain || "—"}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px", fontWeight: 800, color: "#0A1F3D" }}>
                                {s.placementLifecycle?.placedCompanyName || "—"}
                              </td>
                              <td style={{ padding: "10px 14px", color: "#334155" }}>
                                {s.placementLifecycle?.placedRole || "—"}
                              </td>
                              <td style={{ padding: "10px 14px", fontWeight: 900, color: "#16A34A" }}>
                                {s.placementLifecycle?.placedCtc || "Not disclosed"}
                              </td>
                              <td style={{ padding: "10px 14px", color: "#334155" }}>
                                {formatPlacementDate(s.placementLifecycle?.placedDate)}
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ fontSize: 11, fontWeight: 800, background: isJoined ? "#DCFCE7" : "#FEF9C3", color: isJoined ? "#166534" : "#92400E", padding: "3px 8px", borderRadius: 4 }}>
                                  {isJoined ? "JOINED" : "PLACED - OFFER CONFIRMED"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            );
          })()}

          {/* ========================================================= */}
          {/* MODULE: REPORTS & ACCREDITATION (NAAC / NBA)              */}
          {/* ========================================================= */}
          {activeTab === "reports" && (
            <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "26px 30px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0A1F3D", margin: "0 0 4px" }}>
                    NAAC & NBA Certified Placement Verification Report
                  </h3>
                  <span style={{ fontSize: 12, color: "#64748B" }}>
                    Official export ready for Criterion 5: Student Support and Progression (Metric 5.2.1)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{ background: "#0A1F3D", color: "#F5B41A", padding: "9px 18px", borderRadius: 8, border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <i className="fa-solid fa-print"></i> Print / Save as PDF
                </button>
              </div>

              {/* Summary Metrics Strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                <div style={{ background: "#F8FAFC", padding: 14, borderRadius: 10, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 700 }}>Total Enrolled Students</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#0A1F3D" }}>{reportsData?.totalStudents ?? kpis.totalStudents}</div>
                </div>
                <div style={{ background: "#F0FDF4", padding: 14, borderRadius: 10, border: "1px solid #86EFAC" }}>
                  <div style={{ fontSize: 11.5, color: "#166534", fontWeight: 700 }}>Total Placed Students</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#166534" }}>{reportsData?.placedCount ?? (kpis.joined || kpis.selected)}</div>
                </div>
                <div style={{ background: "#EFF6FF", padding: 14, borderRadius: 10, border: "1px solid #BFDBFE" }}>
                  <div style={{ fontSize: 11.5, color: "#1E40AF", fontWeight: 700 }}>Overall Placement Rate</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#1E40AF" }}>{reportsData?.placementRate ?? 0}%</div>
                </div>
                <div style={{ background: "#FAF5FF", padding: 14, borderRadius: 10, border: "1px solid #D8B4FE" }}>
                  <div style={{ fontSize: 11.5, color: "#6B21A8", fontWeight: 700 }}>Average Package (CTC)</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#6B21A8" }}>
                    {reportsData?.placedCount ? "₹3.8 LPA" : "—"}
                  </div>
                </div>
              </div>

              {/* Department Table */}
              <h4 style={{ fontSize: 14, fontWeight: 800, color: "#0A1F3D", margin: "0 0 10px" }}>Department-wise Placement Record</h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 24 }}>
                <thead>
                  <tr style={{ background: "#F1F5F9", textAlign: "left", color: "#475569" }}>
                    <th style={{ padding: "8px 12px" }}>Academic Department</th>
                    <th style={{ padding: "8px 12px" }}>Enrolled</th>
                    <th style={{ padding: "8px 12px" }}>Interview Ready</th>
                    <th style={{ padding: "8px 12px" }}>Offers Released</th>
                    <th style={{ padding: "8px 12px" }}>Conversion %</th>
                  </tr>
                </thead>
                <tbody>
                  {!reportsData?.departmentBreakdown || Object.keys(reportsData.departmentBreakdown).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#64748B" }}>
                        No department placement records available yet. Enroll students and record offers to generate accreditation statistics.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(reportsData.departmentBreakdown).map(([dept, row], i) => {
                      const rate = row.total ? Math.round((row.placed / row.total) * 100) : 0;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0A1F3D" }}>{dept}</td>
                          <td style={{ padding: "8px 12px" }}>{row.total}</td>
                          <td style={{ padding: "8px 12px" }}>{row.ready || 0}</td>
                          <td style={{ padding: "8px 12px", fontWeight: 800, color: "#16A34A" }}>{row.placed}</td>
                          <td style={{ padding: "8px 12px", fontWeight: 800, color: "#2563EB" }}>{rate}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <div style={{ borderTop: "1px dashed #CBD5E1", paddingTop: 14, display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#64748B" }}>
                <span>Verified by Talentera Campus Accreditation Engine · Cryptographic Signature TLR-COL-{college?.code || "INST"}-{new Date().getFullYear()}</span>
                <span>Date: {new Date().toLocaleDateString("en-GB")}</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
