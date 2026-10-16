import React, { useState } from "react";

const card = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 };
const inputStyle = { width: "100%", padding: "9px 11px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff" };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };

const blank = { title: "", duration: "", totalHrs: "", fees: "", syllabus: "", startDate: "", endDate: "", trainingMode: "" };
const toInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const MODE_COLORS = { Online: ["#DBEAFE", "#1D4ED8"], Offline: ["#FEF3C7", "#92400E"], Hybrid: ["#EDE9FE", "#6D28D9"] };
const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

export default function AcademyCourses({ getAuthHeader, courses = [], onChanged }) {
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [openId, setOpenId] = useState(null);

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const reset = () => {
    setForm(blank);
    setEditingId(null);
  };

  const submit = async () => {
    if (!form.title.trim()) return flash("Enter the course name.", "error");
    if (!form.duration.trim()) return flash("Enter the course duration.", "error");
    if (form.startDate && form.endDate && form.endDate < form.startDate) return flash("End date cannot be before the start date.", "error");
    setBusy(true);
    try {
      const body = {
        title: form.title.trim(),
        duration: form.duration.trim(),
        totalHrs: form.totalHrs,
        fees: form.fees === "" ? null : form.fees,
        syllabus: form.syllabus.split("\n").map((x) => x.trim()).filter(Boolean),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        trainingMode: form.trainingMode,
      };
      const res = await fetch(editingId ? `/api/academy/courses/${editingId}` : "/api/academy/create-course", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not save the course.");
      flash(editingId ? "Course updated." : "Course added.");
      reset();
      onChanged && onChanged();
    } catch (e) {
      flash(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const edit = (c) => {
    setEditingId(c._id);
    setForm({
      title: c.title || "",
      duration: c.duration || "",
      totalHrs: c.totalHrs || "",
      fees: c.fees === null || c.fees === undefined ? "" : c.fees,
      syllabus: (c.syllabus || []).join("\n"),
      startDate: toInput(c.startDate),
      endDate: toInput(c.endDate),
      trainingMode: c.trainingMode || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleTopic = async (c, topic, done) => {
    try {
      const res = await fetch(`/api/academy/courses/${c._id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ topic, done }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not update progress.");
      onChanged && onChanged();
    } catch (e) {
      flash(e.message, "error");
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Remove the course "${c.title}"?`)) return;
    try {
      const res = await fetch(`/api/academy/courses/${c._id}`, { method: "DELETE", headers: { ...getAuthHeader() } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not remove.");
      if (editingId === c._id) reset();
      onChanged && onChanged();
    } catch (e) {
      flash(e.message, "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Academy Courses</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>Add the courses your academy offers: name, duration, dates, training mode, syllabus and (optionally) fees.</p>
      </div>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: msg.type === "error" ? "#FEE2E2" : "#DCFCE7", color: msg.type === "error" ? "#B91C1C" : "#15803D" }}>{msg.text}</div>
      )}

      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#06152A", marginBottom: 12 }}>{editingId ? "Edit course" : "Add a course"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div><label style={labelStyle}>Course name *</label><input style={inputStyle} value={form.title} onChange={set("title")} maxLength={120} placeholder="e.g. HCC Coding Specialization" /></div>
          <div><label style={labelStyle}>Duration *</label><input style={inputStyle} value={form.duration} onChange={set("duration")} maxLength={40} placeholder="e.g. 3 months" /></div>
          <div><label style={labelStyle}>Total hours</label><input style={inputStyle} type="number" min="0" value={form.totalHrs} onChange={set("totalHrs")} /></div>
          <div><label style={labelStyle}>Fees (₹) - optional</label><input style={inputStyle} type="number" min="0" value={form.fees} onChange={set("fees")} placeholder="Leave blank if not to be shown" /></div>
          <div><label style={labelStyle}>Start date</label><input style={inputStyle} type="date" value={form.startDate} onChange={set("startDate")} /></div>
          <div><label style={labelStyle}>End date (expected)</label><input style={inputStyle} type="date" value={form.endDate} min={form.startDate || undefined} onChange={set("endDate")} /></div>
          <div>
            <label style={labelStyle}>Training mode</label>
            <select style={inputStyle} value={form.trainingMode} onChange={set("trainingMode")}>
              <option value="">Select mode</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Syllabus (one topic per line)</label>
          <textarea style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} value={form.syllabus} onChange={set("syllabus")} placeholder={"ICD-10-CM Basics\nCPT Modifiers\nDocumentation Review"} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn btn-navy" style={{ fontSize: 13 }} onClick={submit} disabled={busy}>{busy ? "Saving..." : editingId ? "Update Course" : "Add Course"}</button>
          {editingId && <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={reset}>Cancel</button>}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#06152A", marginBottom: 10 }}>Your courses ({courses.length})</div>
        {courses.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94A3B8", padding: "14px 0" }}>No courses added yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {courses.map((c) => (
              <div key={c._id} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#06152A" }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                      {c.duration}{c.totalHrs ? ` · ${c.totalHrs} hrs` : ""}{" · "}
                      {c.fees !== null && c.fees !== undefined ? <strong style={{ color: "#06152A" }}>{inr(c.fees)}</strong> : "Fees not listed"}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 8, fontSize: 12, color: "#334155" }}>
                      {c.trainingMode && (
                        <span style={{ background: (MODE_COLORS[c.trainingMode] || ["#F1F5F9", "#475569"])[0], color: (MODE_COLORS[c.trainingMode] || ["#F1F5F9", "#475569"])[1], padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11 }}>{c.trainingMode}</span>
                      )}
                      <span>{c.startDate || c.endDate ? `${fmtDate(c.startDate) || "TBD"} → ${fmtDate(c.endDate) || "TBD"}` : "Dates not set"}</span>
                      <span style={{ fontWeight: 700 }}>{c.enrolledCount ?? 0} student{(c.enrolledCount ?? 0) === 1 ? "" : "s"} enrolled</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, maxWidth: 320 }}>
                      <div style={{ flex: 1, height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${c.syllabusCompletionPct || 0}%`, height: "100%", background: (c.syllabusCompletionPct || 0) >= 100 ? "#16A34A" : "#4F46E5" }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>
                        {(c.syllabus || []).length === 0 ? "No syllabus" : `Syllabus ${c.syllabusCompletionPct || 0}% · ${(c.completedTopics || []).length}/${c.syllabus.length} topics`}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <button className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setOpenId(openId === c._id ? null : c._id)}>{openId === c._id ? "Hide syllabus" : "Syllabus"}</button>
                    <button className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => edit(c)}>Edit</button>
                    <button className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => remove(c)}>Remove</button>
                  </div>
                </div>
                {openId === c._id && (
                  <div style={{ margin: "10px 0 0", fontSize: 12, color: "#334155", lineHeight: 1.9 }}>
                    {(c.syllabus || []).length === 0 ? <div style={{ color: "#94A3B8" }}>No syllabus added.</div> : (
                      <>
                        <div style={{ fontSize: 11, color: "#64748B", marginBottom: 2 }}>Tick each topic once it has been taught.</div>
                        {c.syllabus.map((t, i) => {
                          const done = (c.completedTopics || []).includes(t);
                          return (
                            <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textDecoration: done ? "line-through" : "none", color: done ? "#94A3B8" : "#334155" }}>
                              <input type="checkbox" checked={done} onChange={(e) => toggleTopic(c, t, e.target.checked)} />
                              {t}
                            </label>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
