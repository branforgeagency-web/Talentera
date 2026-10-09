import React, { useState, useEffect } from "react";

// Public academy profile shown to candidates and companies. Fetches /api/public/academy/:id/profile.
export default function AcademyProfileModal({ academyId, onClose }) {
  const [academy, setAcademy] = useState(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/public/academy/${academyId}/profile`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.message || "Profile not available.");
        if (alive) setAcademy(d.academy);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [academyId]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(6,21,42,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 760, maxHeight: "90vh", overflowY: "auto", padding: 22 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>{academy?.name || "Academy profile"}</h3>
            {academy && (
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                {academy.specialty}
                {academy.headquarters ? ` · HQ ${academy.headquarters}` : ""}
                {academy.partnerSince ? ` · Talentera partner since ${academy.partnerSince}` : ""}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700 }}>Close</button>
        </div>

        {error && <div style={{ color: "#B91C1C", fontSize: 13 }}>{error}</div>}
        {!academy && !error && <div style={{ color: "#64748B", fontSize: 13 }}>Loading...</div>}

        {academy && (
          <>
            {academy.branches.length > 0 && (
              <div style={{ marginBottom: 14, fontSize: 13 }}>
                <strong>Branches: </strong>
                {academy.branches.join(" · ")}
              </div>
            )}
            {academy.courses.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <strong style={{ fontSize: 13 }}>Courses</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {academy.courses.map((c, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 700, background: "#F1F5F9", padding: "4px 10px", borderRadius: 6 }}>
                      {c.title}{c.duration ? ` · ${c.duration}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {academy.website && (
              <div style={{ marginBottom: 14, fontSize: 13 }}>
                <a href={/^https?:\/\//i.test(academy.website) ? academy.website : `https://${academy.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", fontWeight: 700 }}>
                  {academy.website}
                </a>
              </div>
            )}
            <strong style={{ fontSize: 13 }}>Pictures &amp; videos</strong>
            {academy.gallery.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>This academy has not added any pictures or videos yet.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12, marginTop: 8 }}>
                {academy.gallery.map((g) => (
                  <figure key={g._id} style={{ margin: 0 }}>
                    {g.type === "video" ? (
                      <video src={g.url} controls preload="metadata" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8, background: "#0F172A" }} />
                    ) : (
                      <img src={g.url} alt={g.caption || academy.name} onClick={() => setZoom(g)} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8, cursor: "zoom-in" }} />
                    )}
                    {g.caption && <figcaption style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{g.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {zoom && (
        <div onClick={(e) => { e.stopPropagation(); setZoom(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={zoom.url} alt={zoom.caption || ""} style={{ maxWidth: "92vw", maxHeight: "90vh", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
