import React from "react";
import SCHEMA from "../../data/experiencedSchema.json";
import { PASSPORT_MAX_POINTS } from "./passportUtils.js";
import "./ExperiencedPassport.css";

const fileLike = (v) => v && typeof v === "object" && v.url;

function show(v) {
  if (fileLike(v)) return <a href={v.url} target="_blank" rel="noreferrer">{v.name || "View file"}</a>;
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function Values({ fields, obj }) {
  const rows = fields.filter((f) => obj && obj[f.key] !== "" && obj[f.key] != null && !(Array.isArray(obj[f.key]) && !obj[f.key].length));
  if (!rows.length) return <div className="xp-note">Nothing added yet.</div>;
  return (
    <div className="xp-metrics">
      {rows.map((f) => (
        <div className="xp-metric" key={f.key}><div className="k">{f.label}</div><div className="v" style={{ fontSize: 14, wordBreak: "break-word" }}>{show(obj[f.key])}</div></div>
      ))}
    </div>
  );
}

/**
 * px = payload from GET /candidate/passport (stages, completed, stageScores).
 * compact: one status row per stage (used on the review stage).  Otherwise full detail cards (dashboard profile tab).
 */
/** Every document the candidate has uploaded, grouped by where it was collected. */
export function collectDocuments(stages = {}) {
  const out = [];
  const s1 = stages[1] || {};
  const sec1 = SCHEMA[0].sections.find((x) => x.kind === "docslots");
  const docs1 = (s1[sec1.id] || {}).documents || {};
  sec1.slots.forEach((sl) => out.push({ label: sl.label, stage: 1, required: sl.required, file: docs1[sl.key] || null, na: sl.naKey && (s1[sec1.id] || {})[sl.naKey] === "Yes" }));
  const p = (stages[1]?.["personal-contact"] || {}).profilePhoto;
  if (p) out.push({ label: "Profile Photo", stage: 1, file: p });
  (stages[3]?.docs || []).forEach((d) => out.push({ label: "Employment Proof", stage: 3, file: d }));
  ((stages[6] || {})["add-certification"] || []).forEach((c) => c.certificateUpload && out.push({ label: `Certificate — ${c.certificationName || "Certification"}`, stage: 6, file: c.certificateUpload }));
  const cd = (stages[7] || {})["career-documents"] || {};
  SCHEMA[6].sections[0].fields.forEach((f) => cd[f.key] && out.push({ label: f.label, stage: 7, file: cd[f.key] }));
  return out;
}

export function PassportDocuments({ px, onEdit }) {
  const docs = collectDocuments(px?.stages || {});
  return (
    <div className="xp-docs">
      {docs.map((d, i) => (
        <div className="xp-doc" key={d.label + i}>
          <span><b>{d.label}</b> <span className="xp-note">· Stage {d.stage}</span></span>
          <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {d.file ? <a href={d.file.url} target="_blank" rel="noreferrer">{d.file.name || "View"}</a>
              : <span className={"xp-pill " + (d.na ? "ok" : d.required ? "pending" : "ok")}>{d.na ? "Not applicable" : d.required ? "Missing" : "Optional"}</span>}
            {onEdit && !d.file && !d.na && <button type="button" className="xp-sum-link" onClick={() => onEdit(d.stage)}>Upload</button>}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PassportSummary({ px, onEdit, compact = false }) {
  const stages = px?.stages || {};
  const done = px?.completed || [];
  return (
    <div>
      {SCHEMA.map((st) => {
        const ok = done.includes(st.num);
        const pts = px?.stageScores?.[st.num] || 0;
        if (compact) {
          if (st.num === 8) return null;
          return (
            <div key={st.num} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #E2E8F0" }}>
              <span style={{ fontWeight: 700 }}>{st.num}. {st.name}</span>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className={"xp-pill " + (ok ? "ok" : "pending")}>{ok ? "Complete" : "Pending"}</span>
                {onEdit && <button type="button" className="xp-sum-link" onClick={() => onEdit(st.num)}>{ok ? "Edit" : "Fill in"}</button>}
              </span>
            </div>
          );
        }
        const data = stages[st.num] || {};
        return (
          <div className="xp-card" key={st.num}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <h4 style={{ margin: 0 }}>{String(st.num).padStart(2, "0")} · {st.name}</h4>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={"xp-pill " + (ok ? "ok" : "pending")}>{ok ? "Complete" : "Pending"}</span>
                <span className="xp-note" style={{ margin: 0 }}>{pts}/{PASSPORT_MAX_POINTS[st.num]} pts</span>
                {onEdit && <button type="button" className="xp-btn xp-ghost" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => onEdit(st.num)}>Edit</button>}
              </span>
            </div>
            {st.sections.map((sec) => {
              if (sec.kind === "fields" && sec.repeatable) {
                const list = data[sec.id] || [];
                return (
                  <div key={sec.id}>
                    <div className="xp-note" style={{ fontWeight: 800 }}>{sec.title}</div>
                    {list.length ? list.map((e, i) => <div className="xp-entry" key={e.id || i}><Values fields={sec.fields} obj={e} /></div>) : <div className="xp-note">None added.</div>}
                  </div>
                );
              }
              if (sec.kind === "docslots") {
                const d = data[sec.id] || {};
                return <div key={sec.id} style={{ marginBottom: 10 }}><div className="xp-note" style={{ fontWeight: 800 }}>{sec.title}</div>
                  <div className="xp-metrics">{sec.numbers.filter((n) => d[n.key]).map((n) => <div className="xp-metric" key={n.key}><div className="k">{n.label}</div><div className="v">{d[n.key]}</div></div>)}</div>
                  <PassportDocuments px={{ stages: { 1: stages[1] } }} /></div>;
              }
              if (sec.kind === "fields") return <div key={sec.id} style={{ marginBottom: 10 }}><div className="xp-note" style={{ fontWeight: 800 }}>{sec.title}</div><Values fields={sec.fields} obj={data[sec.id]} /></div>;
              if (sec.kind === "chips") return <div key={sec.id} style={{ marginBottom: 10 }}><div className="xp-note" style={{ fontWeight: 800 }}>{sec.title}</div><div className="xp-chips">{(data[sec.key] || []).map((c) => <span key={c} className="xp-chip on">{c}</span>)}{!(data[sec.key] || []).length && <span className="xp-note">None selected.</span>}</div></div>;
              if (sec.kind === "docs" && (data.docs || []).length) return <div key={sec.id} className="xp-docs">{data.docs.map((d, i) => <div key={i} className="xp-doc"><a href={d.url} target="_blank" rel="noreferrer">{d.name}</a></div>)}</div>;
              return null;
            })}
          </div>
        );
      })}
    </div>
  );
}
