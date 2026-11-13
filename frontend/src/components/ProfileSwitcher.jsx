import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCandidateType } from "../utils/candidateType";

/**
 * One login, two profiles. With both profiles it shows a Fresher | Experienced switch; a Fresher-only account gets
 * a "+ Add Experienced profile" button (pre-filled from the fresher data). Switching reopens the matching dashboard.
 */
export default function ProfileSwitcher() {
  const { candidate, switchProfile, addProfile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (!candidate) return null;

  const active = getCandidateType(candidate);
  const types = Array.isArray(candidate.candidateTypes) ? candidate.candidateTypes : [];
  const hasBoth = types.includes("fresher") && types.includes("experienced");

  async function go(fn, type) {
    setBusy(true);
    setMsg("");
    try {
      await fn(type);
      navigate(`/dashboard/${type}`);
    } catch (err) {
      setMsg(err.response?.data?.message || "Couldn't switch profile.");
    } finally {
      setBusy(false);
    }
  }

  const pill = (type, label) => (
    <button
      key={type}
      type="button"
      disabled={busy}
      onClick={() => active !== type && go(switchProfile, type)}
      style={{
        border: "none", cursor: active === type ? "default" : "pointer", padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
        background: active === type ? "#D4A24C" : "transparent", color: active === type ? "#0B1B33" : "rgba(255,255,255,0.75)",
      }}
    >
      {label}
    </button>
  );

  if (hasBoth) {
    return (
      <div title={msg || "Switch between your Fresher and Experienced profiles"} style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.12)", borderRadius: 999, padding: 3, marginRight: 10 }}>
        {pill("fresher", "Fresher")}
        {pill("experienced", "Experienced")}
      </div>
    );
  }
  if (active === "fresher") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => go(addProfile, "experienced")}
        title={msg || "Create an Experienced profile with the same login. Your details are filled in from your Fresher profile."}
        style={{ marginRight: 10, border: "1px dashed rgba(255,255,255,0.45)", background: "transparent", color: "#fff", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
      >
        {busy ? "Adding…" : "+ Add Experienced profile"}
      </button>
    );
  }
  return null;
}
