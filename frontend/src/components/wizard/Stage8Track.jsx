import React, { useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";

export default function Stage8Track({ stage, existingData, onSaved }) {
  const toast = useToast();
  const [consent, setConsent] = useState(existingData?.consent ?? true);
  const [scheduledSlot, setScheduledSlot] = useState(existingData?.scheduledSlot || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        scheduledSlot,
      });
      toast("Stage 8 submitted & verification complete!", "✓");
      if (onSaved) onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this stage.");
    } finally {
      setSaving(false);
    }
  }

  function handlePickSlot() {
    const nextSlot = "Tomorrow, 3:00 PM IST";
    setScheduledSlot(nextSlot);
    toast("✓ Slot reserved: Tomorrow at 3:00 PM IST", "✓");
  }

  return (
    <form className="wiz-form" onSubmit={handleSubmit}>
      <style>{`
        .stage8-consent-card {
          background: linear-gradient(90deg, #A855F7 0%, #C084FC 100%);
          border-radius: 14px;
          padding: 20px 24px;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(168, 85, 247, 0.25);
          transition: transform 0.15s ease;
          border: none;
          width: 100%;
          text-align: left;
          margin-bottom: 14px;
        }

        .stage8-consent-card:hover {
          transform: translateY(-1px);
        }

        .stage8-card-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }

        .stage8-icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .stage8-card-body {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .stage8-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }

        .stage8-card-sub {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.4;
          margin: 0;
        }

        .stage8-pts-tag {
          background: rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .stage8-slot-card {
          background: #FFFFFF;
          border: 1px solid #E9D5FF;
          border-radius: 14px;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(168, 85, 247, 0.04);
          margin-bottom: 20px;
        }

        .stage8-slot-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #FAF5FF;
          color: #A855F7;
          border: 1px solid #F3E8FF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .stage8-slot-title {
          font-size: 15.5px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 2px 0;
        }

        .stage8-slot-sub {
          font-size: 13px;
          color: #64748B;
          margin: 0;
        }

        .stage8-slot-btn {
          background: #A855F7;
          color: #FFFFFF;
          font-size: 12.5px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 10px 22px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
          white-space: nowrap;
          flex-shrink: 0;
          transition: background 0.15s ease, transform 0.15s ease;
        }

        .stage8-slot-btn:hover {
          background: #9333EA;
          transform: translateY(-1px);
        }

        .stage8-submit-btn {
          background: linear-gradient(90deg, #A855F7 0%, #D946EF 100%);
          color: #FFFFFF;
          font-size: 15px;
          font-weight: 800;
          padding: 14px 34px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(168, 85, 247, 0.35);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .stage8-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.45);
        }
      `}</style>

      {/* Item 1: Consent Card */}
      <button
        type="button"
        className="stage8-consent-card"
        onClick={() => setConsent(!consent)}
      >
        <div className="stage8-card-left">
          <div className="stage8-icon-circle">
            {consent ? "✓" : "○"}
          </div>
          <div className="stage8-card-body">
            <h3 className="stage8-card-title">I consent to interview-track auto-capture</h3>
            <p className="stage8-card-sub">
              Required for the Verified Pool. Companies see anonymized summaries only — never company names or feedback. Data deletion on request.
            </p>
          </div>
        </div>
        <div className="stage8-pts-tag">+5 pts</div>
      </button>

      {/* Item 2: Schedule Mock Interview Slot */}
      <div className="stage8-slot-card">
        <div className="stage8-card-left">
          <div className="stage8-slot-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="stage8-card-body">
            <h4 className="stage8-slot-title">Optional: schedule your first Talentera Mock Interview</h4>
            <p className="stage8-slot-sub">
              {scheduledSlot ? `Reserved slot: ${scheduledSlot}` : "Free, AI-driven, specialty-tuned. Gets the first interview on your track and boosts your readiness signal."}
            </p>
          </div>
        </div>
        <button type="button" className="stage8-slot-btn" onClick={handlePickSlot}>
          {scheduledSlot ? "SLOT RESERVED" : "PICK A SLOT"}
        </button>
      </div>

      {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button type="submit" className="stage8-submit-btn" disabled={saving || !consent}>
          <span>{saving ? "Submitting…" : "Submit for verification"}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>
    </form>
  );
}
