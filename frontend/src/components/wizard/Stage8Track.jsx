import React, { useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";

export default function Stage8Track({ stage, existingData, onSaved }) {
  const toast = useToast();
  const [consent, setConsent] = useState(existingData?.consent ?? true);
  const [scheduledSlot, setScheduledSlot] = useState(existingData?.scheduledSlot || existingData?.stage8?.scheduledSlot || null);
  const [reservation, setReservation] = useState(existingData?.slotReservation || existingData?.stage8?.slotReservation || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [submittingSlot, setSubmittingSlot] = useState(false);

  // Form states
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [preferredDate, setPreferredDate] = useState(tomorrowStr);
  const [preferredTimeSlot, setPreferredTimeSlot] = useState("10:00 AM – 11:00 AM IST (Morning)");
  const [notes, setNotes] = useState("");

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
        slotReservation: reservation,
      });
      toast("Stage 8 submitted & verification complete!", "✓");
      if (onSaved) onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this stage.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSlotReservationSubmit(e) {
    if (e) e.preventDefault();
    setSubmittingSlot(true);
    try {
      const res = await api.post("/candidate/stage8/book-slot", {
        preferredDate,
        preferredTimeSlot,
        notes,
      });
      const formatted = `${preferredDate}, ${preferredTimeSlot}`;
      setScheduledSlot(formatted);
      setReservation(res.data.slotReservation);
      setShowBookingModal(false);
      setShowSuccessPopup(true);
      toast("Slot reservation request sent!", "✓");
    } catch (err) {
      console.error("Slot booking error:", err);
      toast(err.response?.data?.message || "Could not send slot reservation request.", "!");
    } finally {
      setSubmittingSlot(false);
    }
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

      {/* Item 2: Schedule Live Interview Slot */}
      <div className="stage8-slot-card">
        <div className="stage8-card-left">
          <div className="stage8-slot-icon" style={scheduledSlot ? { background: "#DCFCE7", color: "#16A34A", borderColor: "#BBF7D0" } : {}}>
            {scheduledSlot ? (
              <i className="fa-solid fa-check" style={{ fontSize: 16 }}></i>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            )}
          </div>
          <div className="stage8-card-body">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h4 className="stage8-slot-title" style={{ margin: 0 }}>
                Live Interview Track: Reserve a Slot
              </h4>
              {scheduledSlot && (
                <span
                  style={{
                    background: "#DCFCE7",
                    color: "#15803D",
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: "1px solid #86EFAC",
                  }}
                >
                  ✓ REQUEST SENT
                </span>
              )}
            </div>
            <p className="stage8-slot-sub">
              {scheduledSlot ? (
                <>
                  Requested: <strong>{scheduledSlot}</strong> (Pending manual confirmation email from operations team)
                </>
              ) : (
                "Book your preferred interview date and time slot. Our recruitment operations team will review availability and send you a confirmation email manually."
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="stage8-slot-btn"
          onClick={() => setShowBookingModal(true)}
          style={scheduledSlot ? { background: "#059669" } : {}}
        >
          {scheduledSlot ? "MODIFY SLOT" : "BOOK A SLOT"}
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

      {/* Modal 1: Book Slot Modal */}
      {showBookingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !submittingSlot && setShowBookingModal(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              maxWidth: 480,
              width: "100%",
              padding: "24px 28px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              border: "1px solid #E2E8F0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#FAF5FF",
                    color: "#A855F7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  <i className="fa-solid fa-calendar-check"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0F172A" }}>
                  Book Interview Slot
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 18,
                  color: "#94A3B8",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
              Select your preferred date and time for the Live Interview. A slot reservation request will be sent to the operations team, who will send you a confirmation email manually.
            </p>

            <form onSubmit={handleSlotReservationSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  Preferred Date *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: 14,
                    color: "#0F172A",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  Preferred Time Slot *
                </label>
                <select
                  value={preferredTimeSlot}
                  onChange={(e) => setPreferredTimeSlot(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: 14,
                    color: "#0F172A",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="10:00 AM – 11:00 AM IST (Morning)">10:00 AM – 11:00 AM IST (Morning)</option>
                  <option value="11:30 AM – 12:30 PM IST (Morning)">11:30 AM – 12:30 PM IST (Morning)</option>
                  <option value="02:00 PM – 03:00 PM IST (Afternoon)">02:00 PM – 03:00 PM IST (Afternoon)</option>
                  <option value="03:30 PM – 04:30 PM IST (Afternoon)">03:30 PM – 04:30 PM IST (Afternoon)</option>
                  <option value="05:00 PM – 06:00 PM IST (Evening)">05:00 PM – 06:00 PM IST (Evening)</option>
                  <option value="06:30 PM – 07:30 PM IST (Evening)">06:30 PM – 07:30 PM IST (Evening)</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  Notes / Focus Area (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Prefer ED/Inpatient coding focus, or preferred video platform"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: 13,
                    color: "#0F172A",
                    boxSizing: "border-box",
                    resize: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  disabled={submittingSlot}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSlot}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 8,
                    border: "none",
                    background: "linear-gradient(90deg, #A855F7 0%, #9333EA 100%)",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#FFFFFF",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(168, 85, 247, 0.35)",
                  }}
                >
                  {submittingSlot ? "Sending Request…" : "Send Reservation Request →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Success Confirmation Popup */}
      {showSuccessPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => setShowSuccessPopup(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              maxWidth: 440,
              width: "100%",
              padding: "32px 28px",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
              textAlign: "center",
              border: "1px solid #E2E8F0",
              animation: "fadeInScale 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#DCFCE7",
                color: "#16A34A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                margin: "0 auto 16px",
                border: "2px solid #86EFAC",
              }}
            >
              <i className="fa-solid fa-check"></i>
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#0F172A" }}>
              Slot Reservation Request Sent!
            </h3>

            <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#475569", lineHeight: 1.6 }}>
              Your interview slot request has been sent to our recruitment operations team. Our employee will review your details and send you a confirmation email with the meeting link manually.
            </p>

            <div
              style={{
                background: "#FAF5FF",
                border: "1px solid #E9D5FF",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: 13,
                color: "#6B21A8",
                fontWeight: 700,
              }}
            >
              📅 {scheduledSlot}
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessPopup(false)}
              style={{
                width: "100%",
                padding: "12px 24px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(90deg, #A855F7 0%, #9333EA 100%)",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(168, 85, 247, 0.35)",
              }}
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
