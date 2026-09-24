import React, { useRef } from "react";
import {
  Award,
  Download,
  Printer,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  X,
  Share2,
} from "lucide-react";
import "../../styles/academyOS.css";

export default function PlacementCertModal({ certData, onClose }) {
  const certRef = useRef(null);

  if (!certData) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Placement Certificate - ${certData.studentName}`,
        text: `Official Talentera Verified Placement Certificate for ${certData.studentName} at ${certData.companyName}.`,
        url: certData.qrVerificationUrl || window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(certData.qrVerificationUrl || window.location.href);
      alert("Certificate verification link copied to clipboard!");
    }
  };

  return (
    <div className="aos-modal-backdrop" onClick={onClose}>
      <div
        className="aos-modal-box"
        style={{ maxWidth: 780, maxHeight: "92vh", display: "flex", flexDirection: "column", background: "#06152A" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "#06152A" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#E5A82E", fontWeight: 800, fontSize: 13 }}>
            <Award style={{ width: 18, height: 18 }} />
            <span>Official Co-Branded Placement Certificate</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleShare}
              style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "#FFFFFF", fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              <Share2 style={{ width: 13, height: 13 }} />
              Share
            </button>
            <button
              onClick={handlePrint}
              style={{ padding: "6px 14px", borderRadius: 6, background: "#10B981", color: "#FFFFFF", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              <Printer style={{ width: 13, height: 13 }} />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 22, cursor: "pointer", padding: "0 6px" }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Certificate View */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", justifyContent: "center", background: "#040D1A" }}>
          <div
            ref={certRef}
            style={{
              background: "#FFFFFF",
              color: "#0F172A",
              width: "100%",
              maxWidth: 680,
              borderRadius: 16,
              padding: "40px 48px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              border: "8px double #E5A82E",
              position: "relative",
              textAlign: "center",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {/* Watermark */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-30deg)",
                fontSize: 42,
                fontWeight: 900,
                color: "rgba(229, 168, 46, 0.05)",
                letterSpacing: "0.2em",
                pointerEvents: "none",
                userSelect: "none",
                whiteSpace: "nowrap",
              }}
            >
              TALENTERA VERIFIED
            </div>

            {/* Certificate Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #E2E8F0", paddingBottom: 16, marginBottom: 24 }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#06152A" }}>TALENTERA</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#E5A82E", letterSpacing: "0.08em" }}>HEALTHCARE TALENT OS</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#06152A" }}>{certData.academyName || "Healthcare Academy"}</div>
                <div style={{ fontSize: 10, color: "#64748B" }}>Authorized Training Partner</div>
              </div>
            </div>

            {/* Title */}
            <div style={{ fontSize: 11, fontWeight: 800, color: "#E5A82E", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Certificate of Verified Placement
            </div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Certificate ID: {certData.certificateId || "TAL-CERT-9823A"}</div>

            {/* Main Statement */}
            <div style={{ margin: "24px 0 16px", fontSize: 14, color: "#475569" }}>
              This is to certify that
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#06152A", letterSpacing: "-0.02em" }}>
              {certData.studentName}
            </div>
            <div style={{ fontSize: 13, color: "#475569", margin: "16px auto 0", maxWidth: 520, lineHeight: 1.6 }}>
              has successfully completed 8-stage verification and has been officially recruited as
            </div>

            {/* Role & Company Highlight */}
            <div style={{ margin: "16px auto", padding: "12px 24px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0", display: "inline-block" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#06152A" }}>{certData.role || "Sr Medical Coder"}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#10B981", marginTop: 2 }}>
                at {certData.companyName} · {certData.ctc || "₹5.5 LPA"}
              </div>
            </div>

            {/* QR & Verification Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 32, paddingTop: 16, borderTop: "1px solid #E2E8F0" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 11, color: "#64748B" }}>Verification Date</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#06152A", marginTop: 2 }}>{certData.verificationDate || "January 2026"}</div>
              </div>

              {/* QR Code Placeholder */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: 64, height: 64, background: "#06152A", color: "#E5A82E", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <QrCode style={{ width: 44, height: 44 }} />
                </div>
                <span style={{ fontSize: 9, color: "#64748B" }}>Scan to Verify</span>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#64748B" }}>Verified by</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#06152A", marginTop: 2 }}>Talentera Placement Engine</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
