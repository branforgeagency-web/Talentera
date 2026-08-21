import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { safeJson } from "../utils/safeJson.js";

export default function AcademyPortal() {
  const navigate = useNavigate();
  const [activeMod, setActiveMod] = useState("home");
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  // Upload Form State
  const [uploadMode, setUploadMode] = useState("count"); // "csv" | "count"
  const [uploadBatch, setUploadBatch] = useState("Batch 2026-A");
  const [uploadCount, setUploadCount] = useState("10");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recommendingId, setRecommendingId] = useState(null);
  const [copiedBadge, setCopiedBadge] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem("talentera_academy_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/academy/dashboard", {
        headers: { ...getAuthHeader() },
      });
      const data = await safeJson(res);
      if (res.status === 401) {
        navigate("/academy/login");
        return;
      }
      setDashData(data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let res;
      if (uploadMode === "csv" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("batchName", uploadBatch);

        res = await fetch("/api/academy/upload-students", {
          method: "POST",
          headers: { ...getAuthHeader() },
          body: formData,
        });
      } else {
        res = await fetch("/api/academy/upload-students", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify({ batchName: uploadBatch, count: Number(uploadCount) }),
        });
      }

      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || "Students uploaded successfully!");
        setShowUploadModal(false);
        setSelectedFile(null);
        fetchDashboard();
      } else {
        alert(data.message || "Failed to upload students.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading student roster.");
    } finally {
      setUploading(false);
    }
  };

  const handleRecommendStudent = async (candidateId) => {
    setRecommendingId(candidateId);
    try {
      const res = await fetch("/api/academy/recommend-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ candidateId }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || "Candidate recommended to employers!");
        fetchDashboard();
      } else {
        alert(data.message || "Failed to recommend candidate.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecommendingId(null);
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(
      "FullName,Email,Mobile,Course,BatchName\n" +
      "Karthik Subramanian,karthik.s@example.com,+91 9876543210,CPC Certified Medical Coding,Batch 2025-C\n" +
      "Ananya Roy,ananya.roy@example.com,+91 9812345678,Healthcare RCM Executive,Batch 2025-C\n"
    );
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "talentera_student_roster_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>Loading Academy Dashboard...</div>;

  const { academy, kpis, students, batches, placements } = dashData || {};
  const academyName = academy?.name || "Apex Medical Coding Institute";
  const badgeToken = academy?.badgeToken || "demo_badge_token";

  const badgeEmbedCode = `<div class="talentera-academy-badge" data-token="${badgeToken}">\n  <script src="https://talentera.in/widgets/badge.js" async></script>\n</div>`;

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA" }}>
      {/* Top Bar */}
      <nav style={{ background: "var(--navy)", padding: "14px 24px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/logo.png" alt="Talentera" style={{ height: 26, width: "auto" }} />
          <span style={{ background: "rgba(229,168,46,0.15)", color: "var(--gold)", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
            ACADEMY PARTNER PORTAL
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "var(--text-light)" }}>{academyName}</span>
          <button style={{ background: "rgba(255,255,255,0.1)", color: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 12, border: "none", cursor: "pointer" }} onClick={() => {
            localStorage.removeItem("talentera_academy_token");
            localStorage.removeItem("talentera_academy_info");
            navigate("/academy/login");
          }}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Shell */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "calc(100vh - 56px)" }}>
        {/* Sidebar */}
        <aside style={{ background: "#06152A", color: "#fff", padding: "20px 14px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", padding: "0 10px 10px", textTransform: "uppercase" }}>
            MODULES
          </div>

          {[
            { id: "home", label: "Dashboard Home", icon: <i className="fa-solid fa-chart-pie"></i> },
            { id: "candidates", label: "Students Directory", icon: <i className="fa-solid fa-graduation-cap"></i> },
            { id: "batches", label: "Batches", icon: <i className="fa-solid fa-book-bookmark"></i> },
            { id: "placements", label: "Placement Records", icon: <i className="fa-solid fa-briefcase"></i> },
            { id: "insights", label: "Insights & Funnel", icon: <i className="fa-solid fa-chart-line"></i> }
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveMod(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 4,
                background: activeMod === item.id ? "rgba(229,168,46,0.15)" : "transparent",
                color: activeMod === item.id ? "var(--gold)" : "rgba(255,255,255,0.7)"
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </aside>

        {/* Content Area */}
        <main style={{ padding: 28 }}>
          {/* Welcome Hero */}
          <div style={{ background: "linear-gradient(135deg, #0A1F3D 0%, #1A3358 100%)", color: "#fff", borderRadius: 16, padding: 24, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 6 }}>
                PLATINUM PARTNER INSTITUTE
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, margin: 0 }}>
                {academyName}
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                Active Batches: {batches ? batches.length : 3} • Verified Placement Rate: {kpis?.placementRate || "88%"}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                onClick={() => setShowBadgeModal(true)}
              >
                🏅 Embed Verified Badge
              </button>

              <button className="btn-gold" style={{ padding: "12px 20px" }} onClick={() => setShowUploadModal(true)}>
                + Bulk Upload Batch Students
              </button>
            </div>
          </div>

          {/* KPI Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
            {[
              { label: "TOTAL STUDENTS", val: kpis?.totalStudents || 0, icon: "🎓", color: "#3B82F6" },
              { label: "VERIFIED CANDIDATES", val: kpis?.verifiedStudents || 0, icon: "✅", color: "#22C55E" },
              { label: "PLACED STUDENTS", val: kpis?.placedStudents || 0, icon: "🏆", color: "var(--gold)" },
              { label: "AVG ASSESSMENT", val: `${kpis?.avgScore || 90}%`, icon: "⭐", color: "#A855F7" },
              { label: "PLACEMENT RATE", val: kpis?.placementRate || "88%", icon: "📈", color: "#15803D" }
            ].map((kpi, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid var(--border-light)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>{kpi.val}</div>
              </div>
            ))}
          </div>

          {/* Dynamic Module View */}
          {activeMod === "home" || activeMod === "candidates" ? (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--border-light)", overflow: "hidden" }}>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, margin: 0 }}>Student Roster & Verification Status</h3>
                <span style={{ fontSize: 12, color: "#64748B" }}>Total: {students ? students.length : 0} Students</span>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#FAFBFC", borderBottom: "1px solid #E5E7EB", textTransform: "uppercase", fontSize: 10, color: "#94A3B8", fontWeight: 700, textAlign: "left" }}>
                    <th style={{ padding: "12px 18px" }}>Student Name</th>
                    <th style={{ padding: "12px 18px" }}>Course / Role</th>
                    <th style={{ padding: "12px 18px" }}>Batch</th>
                    <th style={{ padding: "12px 18px" }}>Status</th>
                    <th style={{ padding: "12px 18px" }}>Score</th>
                    <th style={{ padding: "12px 18px" }}>Placement Status</th>
                    <th style={{ padding: "12px 18px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students && students.map((stu) => (
                    <tr key={stu.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px 18px", fontWeight: 700, color: "var(--navy)" }}>
                        {stu.name}
                        {stu.recommended && (
                          <span style={{ marginLeft: 6, background: "#FEF3C7", color: "#B45309", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                            ★ Recommended
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 18px", color: "#475569" }}>{stu.course}</td>
                      <td style={{ padding: "12px 18px", color: "#64748B" }}>{stu.batch}</td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: stu.status === "Rejected" ? "#FEE2E2" : stu.status === "Placed" || stu.status === "Verified" ? "#DCFCE7" : stu.status === "Interviewing" ? "#FEF3C7" : stu.status === "Shortlisted" ? "#DBEAFE" : "#F1F5F9",
                          color: stu.status === "Rejected" ? "#B91C1C" : stu.status === "Placed" || stu.status === "Verified" ? "#166534" : stu.status === "Interviewing" ? "#B45309" : stu.status === "Shortlisted" ? "#1D4ED8" : "#475569"
                        }}>
                          {stu.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--navy)" }}>{stu.score}%</td>
                      <td style={{ padding: "12px 18px", fontSize: 12, color: stu.status === "Rejected" ? "#B91C1C" : "#15803D", fontWeight: 600 }}>{stu.placementStatus}</td>
                      <td style={{ padding: "12px 18px", textAlign: "right" }}>
                        <button
                          style={{
                            background: stu.recommended ? "#E2E8F0" : "var(--navy)",
                            color: stu.recommended ? "#64748B" : "#fff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: stu.recommended ? "default" : "pointer"
                          }}
                          disabled={stu.recommended || recommendingId === stu.id}
                          onClick={() => handleRecommendStudent(stu.id)}
                        >
                          {stu.recommended ? "Recommended" : recommendingId === stu.id ? "Saving..." : "⚡ Feature to Employers"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeMod === "batches" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {batches && batches.map((b) => (
                <div key={b.code} style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid var(--border-light)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)", fontWeight: 700 }}>{b.code}</div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, margin: "6px 0 12px" }}>{b.course}</h3>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748B", marginBottom: 8 }}>
                    <span>Students: {b.studentsCount}</span>
                    <span>Completion: {b.completionPct}%</span>
                  </div>
                  <div style={{ height: 6, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${b.completionPct}%`, background: "var(--gold)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid var(--border-light)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Placement Records & Funnel</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {placements && placements.map((p, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, background: "#F8FAFC", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--navy)" }}>{p.studentName} → {p.company}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{p.role}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ background: "#DCFCE7", color: "#15803D", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{p.salary}</span>
                      <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{p.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* BULK UPLOAD MODAL */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleBulkUpload} style={{ padding: 32 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                Bulk Upload Student Batch
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
                Upload your real student CSV roster file to register candidates and trigger automated verification.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>BATCH NAME</label>
                <input
                  type="text"
                  value={uploadBatch}
                  onChange={(e) => setUploadBatch(e.target.value)}
                  placeholder="e.g. Batch 2026-A"
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1" }}
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>UPLOAD CSV ROSTER FILE</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={{ width: "100%", padding: 8, background: "#F8FAFC", borderRadius: 8, border: "1px dashed #94A3B8" }}
                  required
                />
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>Headers: FullName, Email, Mobile, Course, BatchName</span>
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    style={{ background: "none", border: "none", color: "#2563EB", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Download Sample CSV Template
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #E5E7EB", cursor: "pointer" }} onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-gold" style={{ flex: 1, justifyContent: "center" }} disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload Batch →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMBEDDABLE BADGE MODAL */}
      {showBadgeModal && (
        <div className="modal-overlay" onClick={() => setShowBadgeModal(false)}>
          <div className="modal-content" style={{ maxWidth: 520, background: "#0A1F3D", color: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 32 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, margin: "0 0 6px 0", color: "#fff" }}>
                Verified Academy Badge
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 20 }}>
                Embed this verified badge seal on your academy website to showcase your placement outcomes to prospective students & employers.
              </p>

              {/* Badge Card Preview */}
              <div style={{ background: "linear-gradient(135deg, #152A4A 0%, #06152A 100%)", border: "1px solid rgba(229,168,46,0.4)", borderRadius: 14, padding: 20, marginBottom: 20, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 4 }}>🛡️</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>
                  {academyName}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: "4px 0 10px" }}>
                  Talentera Verified Platinum Academy Partner
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 12 }}>
                  <span>Verified Placement Rate: <strong style={{ color: "#22C55E" }}>{kpis?.placementRate || "88%"}</strong></span>
                  <span>Avg Score: <strong style={{ color: "#A855F7" }}>{kpis?.avgScore || 91}%</strong></span>
                </div>
              </div>

              {/* Embed Code snippet */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
                  COPY EMBED HTML CODE
                </label>
                <textarea
                  readOnly
                  rows={3}
                  value={badgeEmbedCode}
                  style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: 10, color: "#93C5FD", fontFamily: "monospace", fontSize: 12 }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  style={{ flex: 1, padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", cursor: "pointer" }}
                  onClick={() => setShowBadgeModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-gold"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    navigator.clipboard.writeText(badgeEmbedCode);
                    setCopiedBadge(true);
                    setTimeout(() => setCopiedBadge(false), 2000);
                  }}
                >
                  {copiedBadge ? "Copied!" : "📋 Copy Code"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
