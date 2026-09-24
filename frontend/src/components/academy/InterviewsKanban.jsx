import React, { useState, useEffect } from "react";
import { safeJson } from "../../utils/safeJson.js";

export default function InterviewsKanban({ getAuthHeader, token, onSelectStudent, onSelectCandidate }) {
  const [kanban, setKanban] = useState({ applied: [], shortlisted: [], interview: [], offer: [], joined: [], rejected: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("All");

  const selectHandler = onSelectStudent || onSelectCandidate;

  const authHeaders = getAuthHeader
    ? getAuthHeader()
    : token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const fetchKanbanData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/academy/interviews/kanban", { headers: { ...authHeaders } });
      const data = await safeJson(res);
      if (data && data.kanban) {
        setKanban(data.kanban);
      }
    } catch (err) {
      console.error("Fetch kanban error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanbanData();
  }, []);

  const columns = [
    { id: "applied", label: "Applied & Matching", color: "#64748B", bg: "#F8FAFC", badgeBg: "#E2E8F0", icon: "fa-paper-plane" },
    { id: "shortlisted", label: "Shortlisted", color: "#7E22CE", bg: "#FAF5FF", badgeBg: "#F3E8FF", icon: "fa-star" },
    { id: "interview", label: "Interview Scheduled", color: "#B45309", bg: "#FFFBEB", badgeBg: "#FEF3C7", icon: "fa-calendar-check" },
    { id: "offer", label: "Offer Extended", color: "#C2410C", bg: "#FFF7ED", badgeBg: "#FFEDD5", icon: "fa-file-signature" },
    { id: "joined", label: "Joined & Placed", color: "#15803D", bg: "#F0FDF4", badgeBg: "#DCFCE7", icon: "fa-circle-check" },
    { id: "rejected", label: "Rejected", color: "#DC2626", bg: "#FEF2F2", badgeBg: "#FEE2E2", icon: "fa-circle-xmark" },
  ];

  const allCards = [
    ...kanban.applied,
    ...kanban.shortlisted,
    ...kanban.interview,
    ...kanban.offer,
    ...kanban.joined,
    ...(kanban.rejected || []),
  ];

  const uniqueCompanies = Array.from(new Set(allCards.map((c) => c.company).filter(Boolean)));

  const filterCards = (cards) => {
    return cards.filter((c) => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.company && c.company.toLowerCase().includes(search.toLowerCase()));
      const matchComp = companyFilter === "All" || c.company === companyFilter;
      return matchSearch && matchComp;
    });
  };

  return (
    <div>
      {/* Top Header & Search Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Interviews Pipeline</h2>
          <div style={{ fontSize: 12, color: "#64748B" }}>
            Real-time status board tracking every candidate × hiring company pairing across recruitment stages.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Search candidate or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, width: 220 }}
          />

          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, background: "#fff" }}
          >
            <option value="All">All Companies ({uniqueCompanies.length})</option>
            {uniqueCompanies.map((comp) => (
              <option key={comp} value={comp}>{comp}</option>
            ))}
          </select>

          <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={fetchKanbanData}>
            <i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }}></i> Refresh
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(200px, 1fr))",
          overflowX: "auto",
          gap: 12,
          minHeight: 520,
          alignItems: "start",
          paddingBottom: 14,
        }}
      >
        {columns.map((col) => {
          const colCards = filterCards(kanban[col.id] || []);
          return (
            <div
              key={col.id}
              style={{
                background: col.bg,
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                minHeight: 480,
              }}
            >
              {/* Column Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <i className={`fa-solid ${col.icon}`} style={{ color: col.color, fontSize: 12 }}></i>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#06152A" }}>{col.label}</span>
                </div>
                <span
                  style={{
                    background: col.badgeBg,
                    color: col.color,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
                  {colCards.length}
                </span>
              </div>

              {/* Cards List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {colCards.length === 0 ? (
                  <div style={{ padding: "24px 8px", textAlign: "center", color: "#94A3B8", fontSize: 11, fontStyle: "italic" }}>
                    No candidates in this stage
                  </div>
                ) : (
                  colCards.map((card) => (
                    <div
                      key={card.id || card.candidateId}
                      onClick={() => selectHandler && selectHandler(card)}
                      style={{
                        background: "#fff",
                        borderRadius: 10,
                        padding: 12,
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        cursor: "pointer",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                      }}
                    >
                      {/* Candidate Avatar & Name */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              background: "#FEF08A",
                              color: "#854D0E",
                              fontWeight: 800,
                              fontSize: 10,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {card.avatar || "ST"}
                          </span>
                          <div>
                            <strong style={{ fontSize: 12, color: "#06152A", display: "block", lineHeight: 1.2 }}>
                              {card.name}
                            </strong>
                            <span style={{ fontSize: 10, color: "#64748B" }}>{card.batch}</span>
                          </div>
                        </div>

                        <span style={{ background: "#F1F5F9", color: "#475569", fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 4 }}>
                          Score: {card.score}
                        </span>
                      </div>

                      {/* Company & Role Details */}
                      <div style={{ background: "#F8FAFC", borderRadius: 6, padding: "6px 8px", marginBottom: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB" }}>
                          🏢 {card.company || "Employer"}
                        </div>
                        <div style={{ fontSize: 10, color: "#475569" }}>
                          {card.role || "Medical Coder"}
                        </div>
                      </div>

                      {/* Meta information (Interview slot / CTC / Notes) */}
                      {card.interviewSlot && (
                        <div style={{ fontSize: 10, color: "#B45309", fontWeight: 700, marginBottom: 4 }}>
                          📅 {card.interviewSlot}
                        </div>
                      )}
                      {card.ctc && (
                        <div style={{ fontSize: 10, color: "#15803D", fontWeight: 800, marginBottom: 4 }}>
                          💰 CTC: {card.ctc}
                        </div>
                      )}

                      {/* Rejection Details Callout (Reason & Details) */}
                      {(col.id === "rejected" || card.rejectionReason) && (
                        <div
                          style={{
                            background: "#FEF2F2",
                            border: "1px solid #FECACA",
                            borderRadius: 6,
                            padding: "6px 8px",
                            marginBottom: 6,
                            marginTop: 4,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 800, color: "#991B1B" }}>
                            <i className="fa-solid fa-circle-xmark" style={{ fontSize: 10 }}></i>
                            <span>Rejection Reason:</span>
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#B91C1C", marginTop: 2, lineHeight: 1.35 }}>
                            {card.rejectionReason || "Candidate profile / criteria mismatch"}
                          </div>
                          {card.rejectionDetails && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#7F1D1D",
                                marginTop: 4,
                                background: "#FFFFFF",
                                padding: "4px 6px",
                                borderRadius: 4,
                                border: "1px dashed #FCA5A5",
                                lineHeight: 1.3,
                              }}
                            >
                              <strong>Notes:</strong> {card.rejectionDetails}
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 6, borderTop: "1px dashed #F1F5F9" }}>
                        <span style={{ fontSize: 9, color: "#94A3B8" }}>Read-only tracking</span>
                        <span style={{ fontSize: 10, color: "#2563EB", fontWeight: 700 }}>Activity →</span>
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
  );
}
