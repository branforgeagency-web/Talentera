import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { safeJson } from "../utils/safeJson.js";
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, ArrowRight, Building2, User } from "lucide-react";

export default function AcademyCoordinatorActivate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(true);
  const [valid, setValid] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [coordinatorInfo, setCoordinatorInfo] = useState(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = "Activate Placement Coordinator Account | Talentera";
    if (!token) {
      setVerifying(false);
      setValid(false);
      setErrorMsg("Activation token is missing. Please check the link from your invitation email.");
      return;
    }

    const checkToken = async () => {
      try {
        const res = await fetch(`/api/academy/coordinator/verify-token?token=${encodeURIComponent(token)}`);
        const data = await safeJson(res);
        if (res.ok && data.valid) {
          setValid(true);
          setCoordinatorInfo(data.coordinator);
        } else {
          setValid(false);
          setErrorMsg(data.message || "Invitation link has expired or is invalid. Please request a new invite from your Academy Head.");
        }
      } catch (err) {
        setValid(false);
        setErrorMsg("Network error verifying activation link. Please try again.");
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!password || password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/academy/coordinator/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await safeJson(res);
      if (res.ok && data.success && data.token) {
        localStorage.setItem("talentera_academy_token", data.token);
        if (data.academy) localStorage.setItem("talentera_academy_info", JSON.stringify(data.academy));
        if (data.coordinator) localStorage.setItem("talentera_coordinator_info", JSON.stringify(data.coordinator));

        setSuccess(true);
        setTimeout(() => {
          navigate("/academy/dashboard");
        }, 1500);
      } else {
        setFormError(data.message || "Failed to activate account. Please try again.");
      }
    } catch (err) {
      setFormError(err.message || "Server error activating account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #06152A 0%, #0A1F3D 60%, #152A4A 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
          width: "100%",
          maxWidth: 480,
          padding: "36px 32px",
          position: "relative",
        }}
      >
        {/* Header Icon */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#EEF2FF",
              color: "#1E40AF",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <ShieldCheck size={30} />
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>
            Branch Coordinator Activation
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
            Set your password to activate your Talentera branch portal
          </p>
        </div>

        {verifying && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#64748B" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Verifying invitation token…</div>
          </div>
        )}

        {!verifying && !valid && (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FCA5A5",
                borderRadius: 12,
                padding: "16px 20px",
                color: "#991B1B",
                fontSize: 13,
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              <AlertCircle size={24} style={{ margin: "0 auto 8px", display: "block" }} />
              {errorMsg}
            </div>
            <Link
              to="/academy/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#1E40AF",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Go to Academy Login →
            </Link>
          </div>
        )}

        {!verifying && valid && coordinatorInfo && (
          <div>
            {/* Coordinator & Branch Metadata Card */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: "14px 18px",
                marginBottom: 22,
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Building2 size={16} color="#0F172A" />
                <span style={{ fontWeight: 800, color: "#0F172A" }}>{coordinatorInfo.academyName}</span>
              </div>
              <div style={{ color: "#475569", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: "#E2E8F0", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                  📍 {coordinatorInfo.branchName}
                </span>
                {coordinatorInfo.branchCity && <span style={{ fontSize: 12, color: "#64748B" }}>({coordinatorInfo.branchCity})</span>}
              </div>
              <div style={{ color: "#64748B", fontSize: 12, marginTop: 6 }}>
                <span>Coordinator: <strong>{coordinatorInfo.name}</strong> ({coordinatorInfo.designation})</span>
                <br />
                <span>Email: <code style={{ color: "#0F172A" }}>{coordinatorInfo.email}</code></span>
              </div>
            </div>

            {formError && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#991B1B",
                  fontSize: 12.5,
                  marginBottom: 16,
                }}
              >
                {formError}
              </div>
            )}

            {success ? (
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #86EFAC",
                  borderRadius: 12,
                  padding: "24px 20px",
                  textAlign: "center",
                  color: "#166534",
                }}
              >
                <CheckCircle2 size={36} color="#16A34A" style={{ margin: "0 auto 8px" }} />
                <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>Account Activated!</h4>
                <p style={{ margin: 0, fontSize: 13 }}>Opening your Branch Placement Dashboard…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                    SET ACCOUNT PASSWORD
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        fontSize: 13,
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                    CONFIRM PASSWORD
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: 13,
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "#0A1F3D",
                    color: "#FFFFFF",
                    padding: "12px 20px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    border: "none",
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 8,
                    transition: "background 0.2s ease",
                  }}
                >
                  {submitting ? "Activating Account…" : "Activate Account & Enter Dashboard"}
                  {!submitting && <ArrowRight size={16} />}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
