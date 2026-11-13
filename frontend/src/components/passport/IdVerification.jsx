import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api/client";

/**
 * Aadhaar verification through DigiLocker (Message Central eKYCNow) - the same backend flow the Fresher
 * dashboard uses (/api/aadhaar/messagecentral/start + /fetch-document). The candidate enters the Aadhaar number
 * and the OTP sent to the mobile registered with it on the official UIDAI page that opens in a popup.
 */

const SESSION_KEY = "talentera_mc_session_exp";

/** Mount once at the top of the wizard: the DigiLocker popup lands back on this app, so it must tell the opener and close. */
export function useDigilockerPopupBridge() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const vId = params.get("verification_id") || params.get("verificationId") || params.get("request_id");
      const refId = params.get("reference_id") || params.get("referenceId");
      const done = params.get("mc_done") || params.get("mc") || vId;
      if (window.opener && !window.opener.closed && done) {
        window.opener.postMessage({ type: "TALENTERA_MC_DIGILOCKER_DONE", verificationId: vId, referenceId: refId }, window.location.origin);
        setTimeout(() => { try { window.close(); } catch (e) { /* ignore */ } }, 800);
      }
    } catch (e) { /* ignore */ }
  }, []);
}

export default function IdVerification({ idType, verified, maskedId, onVerified, invalid = false }) {
  const [starting, setStarting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch (e) { return null; }
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const popupRef = useRef(null);
  const pollRef = useRef(null);
  const doneRef = useRef(false);

  const stopPolling = useCallback(() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }, []);

  const finish = useCallback((data) => {
    stopPolling();
    doneRef.current = true;
    try { if (popupRef.current && !popupRef.current.closed) popupRef.current.close(); } catch (e) { /* ignore */ }
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    setSession(null); setError(""); setMessage("");
    onVerified?.(data);
  }, [onVerified, stopPolling]);

  const fetchDoc = useCallback(async (vId, refId, manual) => {
    if (doneRef.current) return;
    if (manual) setFetching(true);
    try {
      const res = await api.post("/aadhaar/messagecentral/fetch-document", { referenceId: refId || "", verificationId: vId || "" });
      if (res.data?.verified) finish(res.data);
      else if (manual) setMessage(res.data?.message || "Verification is still in progress. Finish the OTP step in the popup, then try again.");
    } catch (err) {
      const d = err?.response?.data;
      if (err?.response?.status === 202 || d?.pending) { if (manual) setMessage(d?.message || "Verification is still in progress."); }
      else if (manual || err?.response?.status === 409) { stopPolling(); setError(d?.message || "Could not complete the verification. Please try again."); }
    } finally {
      if (manual) setFetching(false);
    }
  }, [finish, stopPolling]);

  const startPolling = useCallback((vId, refId) => {
    stopPolling();
    let attempts = 0;
    let inFlight = false;
    pollRef.current = setInterval(async () => {
      if (inFlight || doneRef.current) return;
      attempts += 1;
      if (attempts > 120) { stopPolling(); return; }
      inFlight = true;
      try { await fetchDoc(vId, refId, false); } finally { inFlight = false; }
    }, 3000);
  }, [fetchDoc, stopPolling]);

  // the popup tells us when DigiLocker redirected back
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "TALENTERA_MC_DIGILOCKER_DONE") fetchDoc(e.data.verificationId || session?.verificationId, e.data.referenceId || session?.referenceId, false);
    };
    window.addEventListener("message", onMsg);
    return () => { window.removeEventListener("message", onMsg); stopPolling(); };
  }, [fetchDoc, session, stopPolling]);

  async function start() {
    setStarting(true); setError(""); setMessage(""); doneRef.current = false;
    try {
      const res = await api.post("/aadhaar/messagecentral/start", {
        redirectionUrl: `${window.location.origin}/dashboard/experienced?stage=1&mc_done=1`,
        userFlow: "signup",
      });
      if (!res.data?.url) throw new Error("No verification link returned.");
      const s = { url: res.data.url, verificationId: res.data.verificationId, referenceId: res.data.referenceId };
      setSession(s);
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
      const w = 620, h = 750;
      popupRef.current = window.open(s.url, "MessageCentralDigiLocker", `width=${w},height=${h},top=${(window.innerHeight - h) / 2},left=${(window.innerWidth - w) / 2},scrollbars=yes`);
      if (!popupRef.current) setMessage("Your browser blocked the popup. Allow popups for this site, or use the link below.");
      startPolling(s.verificationId, s.referenceId);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Could not start the verification. Please try again.");
    }
    setStarting(false);
  }

  const box = { borderRadius: 14, padding: "14px 16px", marginTop: 14, border: "1px solid #E2E8F0", background: "#F8FAFC" };

  if (idType !== "Aadhaar") {
    return (
      <div style={box}>
        <b style={{ color: "#0A2540" }}>{idType ? `${idType} details` : "Government ID"}</b>
        <div className="xp-note">
          {idType
            ? "Automatic OTP verification is available for Aadhaar only. For this ID, enter the ID number and the mobile number registered with it; it is saved as declared."
            : "Select your Government ID Type. Choose Aadhaar to verify instantly with an OTP through DigiLocker."}
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div style={{ ...box, background: "#F0FDF4", borderColor: "#BBF7D0" }}>
        <b style={{ color: "#166534" }}>✓ Aadhaar verified via DigiLocker</b>
        <div className="xp-note" style={{ color: "#166534" }}>
          {maskedId ? `Aadhaar ${maskedId}. ` : ""}Your name, date of birth and gender were taken from UIDAI and are locked.
        </div>
      </div>
    );
  }

  return (
    <div className={"xp-idbox" + (invalid ? " err" : "")} style={{ ...box, background: invalid ? "#FEF2F2" : "#FFF8E7", borderColor: invalid ? "#DC2626" : "#FDE68A", borderWidth: invalid ? 2 : 1 }}>
      <b style={{ color: "#0A2540" }}>Verify your Aadhaar with an OTP</b>
      {invalid && <div className="xp-err-msg">Aadhaar verification is required to continue</div>}
      <div className="xp-note" style={{ color: "#78350F" }}>
        A secure DigiLocker window will open. Enter your Aadhaar number and the OTP sent to your registered mobile there. Your details are filled in automatically once it completes.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
        <button type="button" className="xp-btn xp-primary" onClick={start} disabled={starting}>
          {starting ? "Opening DigiLocker…" : session ? "Restart verification" : "Verify with Aadhaar DigiLocker →"}
        </button>
        {session && (
          <>
            <button type="button" className="xp-btn xp-ghost" onClick={() => fetchDoc(session.verificationId, session.referenceId, true)} disabled={fetching}>
              {fetching ? "Checking…" : "I've completed the OTP — Fetch details"}
            </button>
            <a href={session.url} target="_blank" rel="noreferrer" className="xp-sum-link">Reopen verification window</a>
          </>
        )}
      </div>
      {session && !message && !error && <div className="xp-note">Waiting for you to finish the OTP step. This page updates automatically.</div>}
      {message && <div className="xp-note" style={{ color: "#92400E" }}>{message}</div>}
      {error && <div className="xp-note" style={{ color: "#B91C1C", fontWeight: 700 }}>{error}</div>}
    </div>
  );
}
