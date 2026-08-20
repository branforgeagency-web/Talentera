import React, { useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";

const PRESET_SLOTS = [
  { id: 1, label: "Tomorrow, 10:00 AM IST" },
  { id: 2, label: "Tomorrow, 3:00 PM IST" },
  { id: 3, label: "Friday, 11:00 AM IST" },
  { id: 4, label: "Saturday, 4:00 PM IST" },
];

const TIME_OPTIONS = [
  "09:00 AM IST",
  "10:00 AM IST",
  "11:00 AM IST",
  "12:00 PM IST",
  "01:00 PM IST",
  "02:00 PM IST",
  "03:00 PM IST",
  "04:00 PM IST",
  "05:00 PM IST",
  "06:00 PM IST",
  "07:00 PM IST",
  "08:00 PM IST",
];

export default function Stage8Track({ stage, existingData, onSaved }) {
  const toast = useToast();
  const [consent, setConsent] = useState(existingData?.consent ?? true);

  // Slot States
  const [slotType, setSlotType] = useState(existingData?.scheduledSlot?.includes("Custom:") ? "custom" : "preset");
  const [selectedSlot, setSelectedSlot] = useState(existingData?.scheduledSlot || "Tomorrow, 10:00 AM IST");
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("10:00 AM IST");

  const [scheduledConfirmed, setScheduledConfirmed] = useState(Boolean(existingData?.scheduledSlot));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  function handleSelectPresetSlot(label) {
    setSlotType("preset");
    setSelectedSlot(label);
  }

  function handleSelectCustomMode() {
    setSlotType("custom");
    if (customDate) {
      setSelectedSlot(`Custom: ${customDate} at ${customTime}`);
    }
  }

  function handleCustomDateChange(d) {
    setCustomDate(d);
    setSelectedSlot(`Custom: ${d} at ${customTime}`);
  }

  function handleCustomTimeChange(t) {
    setCustomTime(t);
    if (customDate) {
      setSelectedSlot(`Custom: ${customDate} at ${t}`);
    }
  }

  function handleScheduleSlot() {
    if (slotType === "custom" && !customDate) {
      toast("Please select a custom date for your mock interview.", "!");
      return;
    }
    const finalSlot = slotType === "custom" ? `Custom Date: ${customDate} at ${customTime}` : selectedSlot;
    setSelectedSlot(finalSlot);
    setScheduledConfirmed(true);
    toast(`✓ Mock Interview Scheduled for ${finalSlot}!`, "✓");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!consent) {
      setError("You must consent to interview-track auto-capture before submitting Stage 8.");
      toast("Consent is required to submit Stage 8.", "!");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put(`/candidate/stage/${stage.num}`, {
        consent,
        scheduledSlot: selectedSlot,
        mockInterviewScheduled: scheduledConfirmed,
      });
      toast("Stage 8 submitted & verification complete!", "✓");
      if (onSaved) onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this stage.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="wiz-form" onSubmit={handleSubmit}>
      <div className="wiz-option-list">
        <button type="button" className={`wiz-option ${consent ? "active" : ""}`} onClick={() => setConsent(true)}>
          <div className="wiz-option-radio">{consent ? "●" : "○"}</div>
          <div className="wiz-option-body">
            <div className="wiz-option-title">I consent to interview-track auto-capture</div>
            <div className="wiz-option-sub">
              Required for the Verified Pool. Companies see anonymized summaries only — never company names or
              feedback. Data deletion on request.
            </div>
          </div>
          <div className="wiz-option-pts">+{stage.pts} pts</div>
        </button>
      </div>

      {/* MOCK INTERVIEW SCHEDULING CARD - HIGH VISIBILITY UI WITH CUSTOM TIME SELECTOR */}
      <div style={{ background: "#FAF7F0", border: "2px solid var(--navy)", borderRadius: 16, padding: 24, boxShadow: "0 10px 24px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <span style={{ background: "var(--navy)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 999 }}>
            <i className="fa-solid fa-calendar-check" style={{ color: "var(--gold)", marginRight: 6 }}></i>
            OPTIONAL MOCK INTERVIEW
          </span>
          <span style={{ fontSize: 11, color: "#15803D", fontWeight: 700 }}>
            <i className="fa-solid fa-bolt" style={{ marginRight: 4 }}></i> AI Readiness Booster
          </span>
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: "0 0 6px" }}>
          Schedule Your Talentera AI Mock Interview
        </h3>

        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
          Free, AI-driven, specialty-tuned interview session. Select a quick preset slot or choose your own custom date &amp; time.
        </p>

        {/* Preset & Custom Slot Options */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--navy)", marginBottom: 8 }}>
            Choose Date &amp; Time Slot:
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {PRESET_SLOTS.map((s) => {
              const isSelected = slotType === "preset" && selectedSlot === s.label;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectPresetSlot(s.label)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: isSelected ? "2px solid var(--navy)" : "1px solid #CBD5E1",
                    background: isSelected ? "var(--navy)" : "#ffffff",
                    color: isSelected ? "#ffffff" : "var(--navy)",
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                    boxShadow: isSelected ? "0 4px 12px rgba(10,31,61,0.2)" : "none",
                  }}
                >
                  <i className="fa-regular fa-clock" style={{ marginRight: 6, color: isSelected ? "var(--gold)" : "#64748B" }}></i>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date & Time Option Button */}
          <button
            type="button"
            onClick={handleSelectCustomMode}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: slotType === "custom" ? "2px solid var(--navy)" : "1px solid #CBD5E1",
              background: slotType === "custom" ? "rgba(10,31,61,0.06)" : "#ffffff",
              color: "var(--navy)",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <i className="fa-solid fa-calendar-days" style={{ color: "var(--gold)" }}></i>
            📅 Select Custom Date &amp; Time Slot
          </button>

          {/* Custom Date & Time Form Box */}
          {slotType === "custom" && (
            <div style={{ background: "#ffffff", border: "1.5px solid var(--navy)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", marginBottom: 10 }}>
                Pick Custom Date &amp; Time:
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="wiz-mini-label" style={{ marginTop: 0 }}>Custom Date</label>
                  <input
                    type="date"
                    min={todayStr}
                    value={customDate}
                    onChange={(e) => handleCustomDateChange(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="wiz-mini-label" style={{ marginTop: 0 }}>Custom Time</label>
                  <select
                    value={customTime}
                    onChange={(e) => handleCustomTimeChange(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, fontWeight: 700 }}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {customDate && (
                <div style={{ fontSize: 11, fontWeight: 700, color: "#15803D", marginTop: 8 }}>
                  ✓ Selected Custom Slot: {customDate} at {customTime}
                </div>
              )}
            </div>
          )}
        </div>

        {/* High Contrast Schedule Action Button */}
        {scheduledConfirmed ? (
          <div style={{ background: "#F0FDF4", border: "2px solid #22C55E", color: "#15803D", padding: "14px 18px", borderRadius: 10, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: 20 }}></i>
            <div>
              <div>Mock Interview Scheduled &amp; Confirmed!</div>
              <div style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>Slot: {selectedSlot}</div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-navy"
            style={{ width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 14 }}
            onClick={handleScheduleSlot}
          >
            <i className="fa-solid fa-calendar-plus" style={{ marginRight: 8, color: "var(--gold)" }}></i>
            Schedule Mock Interview Slot →
          </button>
        )}
      </div>

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="btn btn-gold" style={{ padding: "14px 28px", fontSize: 15 }} disabled={saving || !consent}>
          {saving ? "Submitting…" : "Submit for Verification →"}
        </button>
      </div>
    </form>
  );
}
