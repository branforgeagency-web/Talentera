import React, { useState } from "react";

/**
 * Projects: pick a domain, then a project from that domain's list, or "Other" to type the project name by hand.
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
const OTHER = "Other";
const SEP = " - ";
const MAX_ROWS = 10;

const sel = { padding: "9px 10px", border: "1.5px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", boxSizing: "border-box", width: "100%" };

function parse(value) {
  const norm = (s) => String(s || "").replace(/[’‘]/g, "'").trim().toLowerCase();
  const lines = String(value || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const rows = lines.map((line) => {
    const i = line.indexOf(SEP);
    const domain = i > 0 ? line.slice(0, i) : "";
    const project = i > 0 ? line.slice(i + SEP.length) : line;
    if (PROJECT_DOMAINS[domain]) {
      const match = PROJECT_DOMAINS[domain].find((p) => norm(p) === norm(project));
      return match ? { domain, project: match, custom: "" } : { domain, project: OTHER, custom: project };
    }
    return { domain: "", project: OTHER, custom: line }; // older free-text entry
  });
  return rows.length ? rows : [{ domain: "", project: "", custom: "" }];
}

function serialize(rows) {
  return rows
    .map((r) => {
      const name = r.project === OTHER ? r.custom.trim() : r.project;
      if (!name) return "";
      return r.domain ? `${r.domain}${SEP}${name}` : name;
    })
    .filter(Boolean)
    .join("\n")
    .slice(0, 1000);
}

export default function ProjectsField({ value, onCommit }) {
  const [rows, setRows] = useState(() => parse(value));

  const update = (next, commitNow = true) => {
    setRows(next);
    if (commitNow) onCommit(serialize(next));
  };
  const patch = (i, p, commitNow = true) => update(rows.map((r, j) => (j === i ? { ...r, ...p } : r)), commitNow);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr auto", gap: 8, alignItems: "start" }}>
          <select value={r.domain} onChange={(e) => patch(i, { domain: e.target.value, project: "", custom: "" })} style={sel}>
            <option value="">Select domain</option>
            {Object.keys(PROJECT_DOMAINS).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <div>
            <select
              value={r.project}
              disabled={!r.domain && r.project !== OTHER}
              onChange={(e) => patch(i, { project: e.target.value, custom: e.target.value === OTHER ? r.custom : "" })}
              style={{ ...sel, opacity: !r.domain && r.project !== OTHER ? 0.6 : 1 }}
            >
              <option value="">{r.domain ? "Select project" : "Select a domain first"}</option>
              {(PROJECT_DOMAINS[r.domain] || []).map((p) => <option key={p} value={p}>{p}</option>)}
              <option value={OTHER}>Other (type project name)</option>
            </select>
            {r.project === OTHER && (
              <input
                type="text"
                value={r.custom}
                maxLength={120}
                placeholder="Enter project name"
                onChange={(e) => patch(i, { custom: e.target.value }, false)}
                onBlur={() => onCommit(serialize(rows))}
                style={{ ...sel, marginTop: 6 }}
              />
            )}
          </div>
          <button
            type="button"
            title="Remove project"
            onClick={() => update(rows.length > 1 ? rows.filter((_, j) => j !== i) : [{ domain: "", project: "", custom: "" }])}
            style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: "#B91C1C", fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      ))}
      {rows.length < MAX_ROWS && (
        <button
          type="button"
          onClick={() => setRows([...rows, { domain: "", project: "", custom: "" }])}
          style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#B45309", fontWeight: 800, fontSize: 13, cursor: "pointer", padding: 0 }}
        >
          + Add another project
        </button>
      )}
    </div>
  );
}
