import React, { useState } from "react";

const card = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 };
const inputStyle = { width: "100%", padding: "9px 11px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff" };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };

const blank = { title: "", duration: "", totalHrs: "", fees: "", syllabus: "" };
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
    setBusy(true);
    try {
      const body = {
        title: form.title.trim(),
        duration: form.duration.trim(),
        totalHrs: form.totalHrs,
        fees: form.fees === "" ? null : form.fees,
        syllabus: form.syllabus.split("\n").map((x) => x.trim()).filter(Boolean),
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
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>Add the courses your academy offers: name, duration, syllabus and (optionally) fees.</p>
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
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <button className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setOpenId(openId === c._id ? null : c._id)}>{openId === c._id ? "Hide syllabus" : "Syllabus"}</button>
                    <button className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => edit(c)}>Edit</button>
                    <button className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => remove(c)}>Remove</button>
                  </div>
                </div>
                {openId === c._id && (
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12, color: "#334155", lineHeight: 1.7 }}>
                    {(c.syllabus || []).length === 0 ? <li style={{ color: "#94A3B8" }}>No syllabus added.</li> : c.syllabus.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
