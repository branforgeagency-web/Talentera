import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { ClassicTemplate, ModernTemplate, MinimalTemplate } from "../components/ResumeTemplates.jsx";

const TEMPLATES = {
  classic: { label: "Classic", Component: ClassicTemplate },
  modern: { label: "Modern", Component: ModernTemplate },
  minimal: { label: "Minimal", Component: MinimalTemplate },
};

export default function ResumeBuilder() {
  const [data, setData] = useState(null);
  const [template, setTemplate] = useState("classic");

  useEffect(() => {
    api.get("/candidate/resume-data").then((res) => {
      setData(res.data);
      setTemplate(res.data.template || "classic");
    });
  }, []);

  async function selectTemplate(key) {
    setTemplate(key);
    await api.put("/candidate/resume-template", { template: key });
  }

  function handlePrint() {
    window.print();
  }

  if (!data) return <div style={{ padding: 40, textAlign: "center" }}>Loading your verified data…</div>;

  const { Component } = TEMPLATES[template];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <header className="no-print" style={{ background: "var(--navy)", padding: "16px 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/dashboard" style={{ color: "var(--white)", textDecoration: "none" }}>← Back to Dashboard</Link>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <button
                key={key}
                className={template === key ? "btn btn-gold" : "btn btn-ghost"}
                style={template !== key ? { color: "var(--white)", borderColor: "rgba(255,255,255,0.3)" } : {}}
                onClick={() => selectTemplate(key)}
              >
                {t.label}
              </button>
            ))}
            <button className="btn btn-gold" onClick={handlePrint}>Download PDF</button>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: "32px 24px" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <Component data={data} />
        </div>
      </div>

      <style>{`@media print { .no-print { display: none; } body { background: #fff; } }`}</style>
    </div>
  );
}
