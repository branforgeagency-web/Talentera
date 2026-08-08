import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function AcademyPortal() {
  const navigate = useNavigate();
  const [activeMod, setActiveMod] = useState("home");
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadBatch, setUploadBatch] = useState("Batch 2025-C");
  const [uploadCount, setUploadCount] = useState(10);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/academy/dashboard");
      const data = await res.json();
      setDashData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const res = await fetch("/api/academy/upload-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchName: uploadBatch, count: Number(uploadCount) })
      });
      const data = await res.json();
      alert(data.message);
      setShowUploadModal(false);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading Academy Dashboard...</div>;

  const { kpis, students, batches, placements } = dashData || {};

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA" }}>
      {/* Top Bar */}
      <nav style={{ background: "var(--navy)", padding: "14px 24px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20 }}>
            TALENT<span style={{ color: "var(--gold)" }}>ERA</span>
          </div>
          <span style={{ background: "rgba(229,168,46,0.15)", color: "var(--gold)", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
            ACADEMY PARTNER PORTAL
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "var(--text-light)" }}>Apex Medical Coding Institute</span>
          <button style={{ background: "rgba(255,255,255,0.1)", color: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 12, border: "none" }} onClick={() => navigate("/academy/login")}>
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
            { id: "home", label: "Dashboard Home", icon: "📊" },
            { id: "candidates", label: "Students Directory", icon: "🎓" },
            { id: "batches", label: "Batches", icon: "📚" },
            { id: "placements", label: "Placement Records", icon: "💼" },
            { id: "insights", label: "Insights & Funnel", icon: "📈" }
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
                Apex Medical Coding Institute
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                Active Batches: 3 • Verified Placement Rate: 88%
              </p>
            </div>

            <button className="btn-gold" style={{ padding: "12px 20px" }} onClick={() => setShowUploadModal(true)}>
              + Bulk Upload Batch Students
            </button>
          </div>

          {/* KPI Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
            {[
              { label: "TOTAL STUDENTS", val: kpis.totalStudents, icon: "🎓", color: "#3B82F6" },
              { label: "VERIFIED CANDIDATES", val: kpis.verifiedStudents, icon: "✅", color: "#22C55E" },
              { label: "PLACED STUDENTS", val: kpis.placedStudents, icon: "🏆", color: "var(--gold)" },
              { label: "AVG ASSESSMENT", val: `${kpis.avgScore}%`, icon: "⭐", color: "#A855F7" },
              { label: "PLACEMENT RATE", val: kpis.placementRate, icon: "📈", color: "#15803D" }
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
                <span style={{ fontSize: 12, color: "#64748B" }}>Total: {students.length} Students</span>
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
                  </tr>
                </thead>
                <tbody>
                  {students.map((stu) => (
                    <tr key={stu.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px 18px", fontWeight: 700, color: "var(--navy)" }}>{stu.name}</td>
                      <td style={{ padding: "12px 18px", color: "#475569" }}>{stu.course}</td>
                      <td style={{ padding: "12px 18px", color: "#64748B" }}>{stu.batch}</td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{
                          padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: stu.status === "Verified" ? "#DCFCE7" : stu.status === "Interviewing" ? "#FFF8E7" : "#F1F5F9",
                          color: stu.status === "Verified" ? "#15803D" : stu.status === "Interviewing" ? "#92400E" : "#475569"
                        }}>
                          {stu.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--navy)" }}>{stu.score}%</td>
                      <td style={{ padding: "12px 18px", fontSize: 12, color: "#15803D", fontWeight: 600 }}>{stu.placementStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeMod === "batches" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {batches.map((b) => (
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
                {placements.map((p, idx) => (
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
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleBulkUpload} style={{ padding: 32 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                Bulk Upload Student Batch
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
                Upload batch roster directly to trigger automated Stage 1-3 verification.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>BATCH NAME</label>
                <input
                  type="text"
                  value={uploadBatch}
                  onChange={(e) => setUploadBatch(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>NUMBER OF STUDENTS</label>
                <input
                  type="number"
                  value={uploadCount}
                  onChange={(e) => setUploadCount(e.target.value)}
                  min="1"
                  max="100"
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} onClick={() => setShowUploadModal(false)}>
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
    </div>
  );
}
