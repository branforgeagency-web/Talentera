import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function StaffHub() {
  const navigate = useNavigate();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/staff/dashboard");
      const data = await res.json();
      setDashData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCandidate = async (candidateId, action) => {
    setProcessingId(candidateId);
    try {
      const res = await fetch("/api/staff/verify-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, action })
      });
      const data = await res.json();
      alert(data.message);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading Staff Operations Hub...</div>;

  const { stats, pipeline, incomingBucket, tasks, leaderboard, liveQueueCount } = dashData || {};

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA" }}>
      {/* Shell */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
        {/* Dark Navy Sidebar */}
        <aside style={{ background: "linear-gradient(180deg, #06152A 0%, #0A1F3D 100%)", color: "#fff", padding: 20, borderRight: "1px solid rgba(229,168,46,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--gold)", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, fontFamily: "var(--font-display)" }}>
              TS
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>
                TALENT<span style={{ color: "var(--gold)" }}>ERA</span>
              </div>
              <div style={{ fontSize: 9, color: "var(--gold-light)", letterSpacing: "0.14em", fontWeight: 700 }}>
                OPERATIONS HUB
              </div>
            </div>
          </div>

          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E" }} />
              <span>LIVE QUEUE</span>
            </div>
            <strong style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}>{liveQueueCount}</strong>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(229,168,46,0.7)", letterSpacing: "0.14em", marginBottom: 8, textTransform: "uppercase" }}>
            NAVIGATION
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(229,168,46,0.15)", color: "#fff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <span>⚡</span> Overview & Bucket
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🔍</span> Audit Queue
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📹</span> Video Introductions
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📊</span> Reports & Metrics
            </div>
          </div>

          <button style={{ marginTop: 40, width: "100%", padding: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer" }} onClick={() => navigate("/staff/login")}>
            Logout Staff Session
          </button>
        </aside>

        {/* Main Hub Area */}
        <main style={{ padding: 28 }}>
          {/* Welcome Banner */}
          <div style={{ background: "linear-gradient(135deg, #06152A 0%, #0A1F3D 50%, #1A3358 100%)", color: "#fff", borderRadius: 16, padding: 24, marginBottom: 24, border: "1px solid rgba(229,168,46,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-block", background: "rgba(229,168,46,0.15)", color: "var(--gold)", padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
                STAFF VERIFICATION CONSOLE
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, margin: 0 }}>
                Welcome back, Vikram Malhotra
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                Lead Verification Officer • 24 Verifications Approved Today
              </p>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 16px", borderRadius: 10, textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--gold)" }}>{stats.pendingVerifications}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>PENDING QUEUE</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 16px", borderRadius: 10, textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#22C55E" }}>{stats.verifiedToday}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>VERIFIED TODAY</div>
              </div>
            </div>
          </div>

          {/* Core Pipeline Visualization */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid var(--border-light)", borderTop: "3px solid var(--gold)", marginBottom: 24 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              Core Verification Pipeline Stages
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {pipeline.map((p, idx) => (
                <div key={idx} style={{ background: p.isPlaced ? "#F0FDF4" : "#FAFBFC", border: "1px solid #F1F5F9", borderRadius: 8, padding: 12, textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: p.isPlaced ? "#15803D" : "var(--navy)" }}>{p.count}</div>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 700, textTransform: "uppercase", marginTop: 4 }}>{p.stage}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid: Incoming Academy Bucket & Staff Tasks */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
            {/* Incoming Bucket */}
            <div style={{ background: "linear-gradient(135deg, #FFF8E7 0%, #FFFCF5 100%)", border: "2px solid var(--gold)", borderRadius: 14, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
                  Incoming Academy Uploads Bucket
                </h3>
                <span style={{ background: "var(--gold)", color: "var(--navy)", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>
                  ACTION REQUIRED ({incomingBucket.length})
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {incomingBucket.map((item) => (
                  <div key={item.id} style={{ background: "#fff", border: "1px solid rgba(229,168,46,0.3)", borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 14 }}>{item.studentName}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{item.academy} • {item.course}</div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginRight: 8 }}>{item.score}%</span>
                      <button
                        className="btn-gold"
                        style={{ padding: "6px 12px", fontSize: 11 }}
                        disabled={processingId === item.id}
                        onClick={() => handleVerifyCandidate(item.id, "verify")}
                      >
                        Approve & Verify →
                      </button>
                      <button
                        style={{ padding: "6px 10px", fontSize: 11, borderRadius: 6, border: "1px solid #E5E7EB", color: "#64748B" }}
                        disabled={processingId === item.id}
                        onClick={() => handleVerifyCandidate(item.id, "skip")}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff Tasks & Leaderboard */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid var(--border-light)" }}>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                  Today's Task Queue
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {tasks.map((t) => (
                    <div key={t.id} style={{ fontSize: 12, paddingBottom: 8, borderBottom: "1px solid #F1F5F9" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--gold)" }}>{t.time}</span>
                        <span style={{ background: t.priority === "P1" ? "#FEE2E2" : "#DBEAFE", color: t.priority === "P1" ? "#DC2626" : "#1E40AF", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>
                          {t.priority}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, color: "var(--navy)", marginTop: 2 }}>{t.title}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid var(--border-light)" }}>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                  Verification Leaderboard
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {leaderboard.map((lb) => (
                    <div key={lb.rank} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", background: lb.rank === 1 ? "var(--gold)" : "#F1F5F9", color: lb.rank === 1 ? "var(--navy)" : "#64748B", display: "flex", alignItems: "center", justifyCenter: "center", fontWeight: 800, fontSize: 11, textAlign: "center", lineHeight: "22px" }}>
                          {lb.rank}
                        </span>
                        <span style={{ fontWeight: 700, color: "var(--navy)" }}>{lb.name}</span>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{lb.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
