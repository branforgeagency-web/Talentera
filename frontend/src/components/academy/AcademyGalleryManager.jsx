import React, { useState, useEffect, useCallback } from "react";

const card = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 };
const btn = (kind) => ({
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  border: kind === "primary" ? "none" : "1px solid #CBD5E1",
  background: kind === "primary" ? "#06152A" : kind === "danger" ? "#FEF2F2" : "#fff",
  color: kind === "primary" ? "#E5A82E" : kind === "danger" ? "#B91C1C" : "#0F172A",
});

function Media({ item, style }) {
  return item.type === "video" ? (
    <video src={item.url} controls preload="metadata" style={style} />
  ) : (
    <img src={item.url} alt={item.caption || "Academy"} style={style} />
  );
}

export default function AcademyGalleryManager({ getAuthHeader }) {
  const [gallery, setGallery] = useState([]);
  const [max, setMax] = useState(24);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null); // { url, type, name, caption, replaceId }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4500);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/academy/gallery", { headers: { ...getAuthHeader() } });
      const data = await res.json();
      if (res.ok) {
        setGallery(data.gallery || []);
        setMax(data.max || 24);
      }
    } catch (e) {
      flash("Could not load the gallery.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Step 1 - upload -> Step 2 - preview
  const pickFile = async (file, replaceId = null, caption = "") => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("media", file);
      const res = await fetch("/api/academy/gallery/upload", { method: "POST", headers: { ...getAuthHeader() }, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload failed.");
      setPending({ url: data.url, type: data.type, name: data.name, caption, replaceId });
    } catch (e) {
      flash(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  // Step 3 - save
  const savePending = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const body = { url: pending.url, type: pending.type, caption: pending.caption };
      const res = await fetch(pending.replaceId ? `/api/academy/gallery/${pending.replaceId}` : "/api/academy/gallery", {
        method: pending.replaceId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not save.");
      setGallery(data.gallery || []);
      setPending(null);
      flash(pending.replaceId ? "Replaced. Candidates and companies now see the new file." : "Saved. It now shows on your academy profile.");
    } catch (e) {
      flash(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const saveCaption = async (item, caption) => {
    if (caption === item.caption) return;
    try {
      const res = await fetch(`/api/academy/gallery/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ caption }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not update.");
      setGallery(data.gallery || []);
    } catch (e) {
      flash(e.message, "error");
    }
  };

  const remove = async (item) => {
    if (!window.confirm("Delete this from your academy profile?")) return;
    try {
      const res = await fetch(`/api/academy/gallery/${item._id}`, { method: "DELETE", headers: { ...getAuthHeader() } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not delete.");
      setGallery(data.gallery || []);
    } catch (e) {
      flash(e.message, "error");
    }
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#06152A" }}>Academy Pictures &amp; Videos ({gallery.length}/{max})</h4>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, maxWidth: 560 }}>
            Show your campus, classrooms, labs and success stories. Candidates and companies see these when they open your academy profile on Talentera.
          </div>
        </div>
        {!pending && (
          <label style={{ ...btn("primary"), display: "inline-block", opacity: busy || gallery.length >= max ? 0.5 : 1 }}>
            {busy ? "Uploading..." : "+ Upload picture / video"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              style={{ display: "none" }}
              disabled={busy || gallery.length >= max}
              onChange={(e) => { pickFile(e.target.files[0]); e.target.value = ""; }}
            />
          </label>
        )}
      </div>

      {msg && (
        <div style={{ padding: "9px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 12, background: msg.type === "error" ? "#FEF2F2" : "#F0FDF4", color: msg.type === "error" ? "#B91C1C" : "#15803D" }}>
          {msg.text}
        </div>
      )}

      {/* Preview before saving */}
      {pending && (
        <div style={{ border: "2px dashed #E5A82E", borderRadius: 12, padding: 14, marginBottom: 16, background: "#FFFBEB" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#92400E", marginBottom: 8 }}>
            Preview - {pending.replaceId ? "this will replace the current file" : "not saved yet"}
          </div>
          <Media item={pending} style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 8, display: "block", marginBottom: 10 }} />
          <input
            value={pending.caption}
            onChange={(e) => setPending({ ...pending, caption: e.target.value })}
            placeholder="Caption (optional) - e.g. Coding lab, Coimbatore campus"
            maxLength={160}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box", marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn("primary")} disabled={busy} onClick={savePending}>{busy ? "Saving..." : "Save"}</button>
            <button style={btn("ghost")} disabled={busy} onClick={() => setPending(null)}>Discard</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12, color: "#64748B" }}>Loading...</div>
      ) : gallery.length === 0 && !pending ? (
        <div style={{ padding: 28, textAlign: "center", color: "#64748B", fontSize: 12 }}>
          Nothing here yet. Upload your first picture or video to present your academy professionally.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
          {gallery.map((g) => (
            <div key={g._id} style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              <Media item={g} style={{ width: "100%", height: 150, objectFit: "cover", display: "block", background: "#0F172A" }} />
              <div style={{ padding: 10 }}>
                <input
                  defaultValue={g.caption}
                  maxLength={160}
                  placeholder="Add a caption"
                  onBlur={(e) => saveCaption(g, e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, boxSizing: "border-box", marginBottom: 8 }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <label style={{ ...btn("ghost"), display: "inline-block", padding: "5px 10px" }}>
                    Replace
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                      style={{ display: "none" }}
                      onChange={(e) => { pickFile(e.target.files[0], g._id, g.caption); e.target.value = ""; }}
                    />
                  </label>
                  <button style={{ ...btn("danger"), padding: "5px 10px" }} onClick={() => remove(g)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
