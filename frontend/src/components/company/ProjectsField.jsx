import React, { useState } from "react";

/**
 * Projects: pick a domain, then tick any number of its projects (or "Select all"); add custom projects with the Other box.
 * Stored as one text value (one "Domain - Project" line per project) so everything that already reads it keeps working.
 */
export const PROJECT_DOMAINS = {
  "AR Caller": [
    "Insurance AR Follow-up",
    "Denial Follow-up & Resolution",
    "Underpayment Follow-up",
    "Claim Status Follow-up",
    "Insurance Payer Calling",
    "Provider Services Calling",
    "Patient AR / Patient Collections",
    "High-Dollar AR Follow-up",
    "Aged AR (30/60/90/120+ Days)",
    "No Response / No Action Claims",
    "Rejected Claims Follow-up",
    "Appeals & Reconsideration Follow-up",
    "Authorization-Related AR",
    "Medical Necessity Denials",
    "Coordination of Benefits (COB) Follow-up",
    "Secondary Insurance Follow-up",
    "Credit Balance Resolution",
    "Refund Follow-up",
    "Payment Variance Follow-up",
    "Workers' Compensation AR",
    "MVA / Auto Insurance AR",
    "Medicare AR",
    "Medicaid AR",
    "Commercial Payer AR",
    "Hospital AR",
    "Physician / Professional AR",
    "Dental AR",
    "DME AR",
    "Home Health & Hospice AR",
    "AR Analysis & Reporting",
    "Root Cause Analysis for Denials",
  ],
  "Medical Coding": [
    "ICD-10-CM Diagnosis Coding",
    "ICD-10-PCS Inpatient Procedure Coding",
    "CPT Procedure Coding",
    "HCPCS Level II Coding",
    "Outpatient Facility Coding",
    "Inpatient Facility Coding",
    "Professional Fee Coding",
    "Emergency Department Coding",
    "Evaluation & Management (E/M) Coding",
    "Surgery Coding",
    "Anesthesia Coding",
    "Radiology Coding",
    "Pathology & Laboratory Coding",
    "Cardiology Coding",
    "Orthopedic Coding",
    "Neurology Coding",
    "Oncology Coding",
    "Gastroenterology Coding",
    "Obstetrics & Gynecology Coding",
    "Pediatrics Coding",
    "Urology Coding",
    "Ophthalmology Coding",
    "Pulmonology Coding",
    "Nephrology Coding",
    "Wound Care Coding",
    "Pain Management Coding",
    "Behavioral Health Coding",
    "Denial-Related Coding Review",
    "HCC / Risk Adjustment Coding",
    "Hierarchical Condition Category (HCC) Validation",
    "Clinical Documentation Improvement (CDI)",
    "Retrospective Chart Review",
    "Prospective Chart Review",
    "Audit & Quality Review",
    "Medical Record Abstraction",
    "Surgical / Specialty Coding",
  ],
  "Medical Billing": [
    "End-to-End Revenue Cycle Management (RCM)",
    "Patient Registration & Demographics",
    "Insurance Eligibility & Benefits Verification",
    "Prior Authorization & Referral Management",
    "Charge Entry",
    "Payment Posting",
    "Electronic Remittance Advice (ERA) Posting",
    "Patient Billing & Statements",
    "Patient Collections",
    "Credit Balance & Refunds",
    "Denial Management",
    "Accounts Receivable (AR) Follow-up",
    "Medical Claims Submission",
    "Claims Scrubbing & Editing",
    "Secondary/Tertiary Claims Billing",
    "Workers' Compensation Billing",
    "Motor Vehicle Accident (MVA) Billing",
    "Medicare Billing",
    "Medicaid Billing",
    "Commercial Insurance Billing",
    "Hospital/Inpatient Billing",
    "Physician/Professional Billing",
    "Emergency Department Billing",
    "Laboratory Billing",
    "Radiology Billing",
    "Surgery Billing",
    "DME Billing",
    "Home Health & Hospice Billing",
    "Behavioral Health Billing",
    "Dental Billing",
    "Out-of-Network Billing",
    "Value-Based Care / Risk Adjustment Support",
  ],
};
const SEP = " - ";
const MAX_ROWS = 10;
const MAX_LEN = 6000;

const sel = { padding: "9px 10px", border: "1.5px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", boxSizing: "border-box", width: "100%" };
const blankRow = () => ({ domain: "", projects: [], others: [], draft: "" });

function parse(value) {
  const norm = (s) => String(s || "").replace(/[’‘]/g, "'").trim().toLowerCase();
  const lines = String(value || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const byDomain = new Map();
  const get = (d) => {
    if (!byDomain.has(d)) byDomain.set(d, { ...blankRow(), domain: d });
    return byDomain.get(d);
  };
  lines.forEach((line) => {
    const i = line.indexOf(SEP);
    const domain = i > 0 ? line.slice(0, i) : "";
    const project = i > 0 ? line.slice(i + SEP.length) : line;
    if (PROJECT_DOMAINS[domain]) {
      const match = PROJECT_DOMAINS[domain].find((p) => norm(p) === norm(project));
      const row = get(domain);
      if (match) { if (!row.projects.includes(match)) row.projects.push(match); }
      else row.others.push(project);
    } else {
      get("").others.push(line); // older free-text entry
    }
  });
  const rows = [...byDomain.values()];
  return rows.length ? rows : [blankRow()];
}

function serialize(rows) {
  const out = [];
  rows.forEach((r) => {
    const names = [...r.projects, ...r.others.map((o) => o.trim()).filter(Boolean)];
    names.forEach((n) => out.push(r.domain ? `${r.domain}${SEP}${n}` : n));
  });
  return out.join("\n").slice(0, MAX_LEN);
}

function ProjectPicker({ domain, selected, onChange }) {
  const [q, setQ] = useState("");
  const all = PROJECT_DOMAINS[domain] || [];
  const allSelected = all.length > 0 && all.every((p) => selected.includes(p));
  const shown = all.filter((p) => p.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (p) => onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);

  if (!domain) {
    return <div style={{ ...sel, color: "#94A3B8", background: "#F8FAFC" }}>Select a domain first</div>;
  }
  return (
    <div style={{ border: "1.5px solid #CBD5E1", borderRadius: 8, background: "#fff", overflow: "hidden" }}>
      <input
        type="text"
        value={q}
        placeholder={`Search ${all.length} projects`}
        onChange={(e) => setQ(e.target.value)}
        style={{ ...sel, border: "none", borderBottom: "1px solid #E2E8F0", borderRadius: 0 }}
      />
      <label style={{ display: "flex", gap: 8, alignItems: "center", padding: "9px 10px", fontSize: 13, fontWeight: 800, borderBottom: "1px solid #E2E8F0", cursor: "pointer", background: "#F8FAFC" }}>
        <input type="checkbox" checked={allSelected} onChange={() => onChange(allSelected ? [] : [...all])} />
        Select all ({all.length})
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "#64748B" }}>{selected.length} selected</span>
      </label>
      <div style={{ maxHeight: 240, overflowY: "auto" }}>
        {shown.map((p) => (
          <label key={p} style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 10px", fontSize: 13, cursor: "pointer", background: selected.includes(p) ? "#FDF6E4" : "transparent" }}>
            <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)} />
            {p}
          </label>
        ))}
        {!shown.length && <div style={{ padding: 10, fontSize: 12, color: "#64748B" }}>No matching projects</div>}
      </div>
    </div>
  );
}

const linkBtn = { background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#B45309", textDecoration: "underline" };
const chip = { display: "inline-flex", alignItems: "center", gap: 6, background: "#FEF3C7", color: "#78350F", border: "1px solid #FCD34D", borderRadius: 999, padding: "3px 6px 3px 10px", fontSize: 12, fontWeight: 600 };
const chipX = { border: "none", background: "transparent", cursor: "pointer", color: "#92400E", fontWeight: 800, padding: 0, lineHeight: 1 };

export default function ProjectsField({ value, onCommit }) {
  const [rows, setRows] = useState(() => parse(value));

  const update = (next) => {
    setRows(next);
    onCommit(serialize(next));
  };
  const patch = (i, p) => update(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const usedDomains = rows.map((r) => r.domain).filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r, i) => {
        const addOther = () => {
          const t = r.draft.trim();
          if (!t) return;
          patch(i, { others: [...r.others, t], draft: "" });
        };
        return (
          <div key={i} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr auto", gap: 8, alignItems: "start" }}>
              <select
                value={r.domain}
                onChange={(e) => patch(i, { domain: e.target.value, projects: [], others: r.others })}
                style={sel}
              >
                <option value="">Select domain</option>
                {Object.keys(PROJECT_DOMAINS).filter((d) => d === r.domain || !usedDomains.includes(d)).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <ProjectPicker domain={r.domain} selected={r.projects} onChange={(projects) => patch(i, { projects })} />
              <button
                type="button"
                title="Remove domain"
                onClick={() => update(rows.length > 1 ? rows.filter((_, j) => j !== i) : [blankRow()])}
                style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: "#B91C1C", fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            {(r.projects.length > 0 || r.others.length > 0) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {r.projects.map((p) => (
                  <span key={p} style={chip}>
                    {p}
                    <button type="button" aria-label={`Remove ${p}`} style={chipX} onClick={() => patch(i, { projects: r.projects.filter((x) => x !== p) })}>✕</button>
                  </span>
                ))}
                {r.others.map((p, k) => (
                  <span key={`o${k}`} style={{ ...chip, background: "#E0E7FF", color: "#312E81", border: "1px solid #A5B4FC" }}>
                    {p}
                    <button type="button" aria-label={`Remove ${p}`} style={{ ...chipX, color: "#3730A3" }} onClick={() => patch(i, { others: r.others.filter((_, x) => x !== k) })}>✕</button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                value={r.draft}
                maxLength={120}
                placeholder="Other project – type a name and press Add"
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, draft: e.target.value } : x)))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOther(); } }}
                style={sel}
              />
              <button type="button" onClick={addOther} style={{ border: "1px solid #CBD5E1", background: "#fff", borderRadius: 8, padding: "0 14px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Add</button>
            </div>
          </div>
        );
      })}
      {rows.length < MAX_ROWS && rows.length < Object.keys(PROJECT_DOMAINS).length + 1 && (
        <button
          type="button"
          onClick={() => setRows([...rows, blankRow()])}
          style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#B45309", fontWeight: 800, fontSize: 13, cursor: "pointer", padding: 0 }}
        >
          + Add another domain
        </button>
      )}
    </div>
  );
}
