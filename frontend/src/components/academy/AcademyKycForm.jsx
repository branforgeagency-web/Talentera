import React, { useState, useEffect } from "react";
import { safeJson } from "../../utils/safeJson.js";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Building2,
  FileText,
  UserCheck,
  MapPin,
  Award,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  Save,
  RotateCcw,
} from "lucide-react";

export default function AcademyKycForm({ academy, onKycUpdated, showToast }) {
  const [formData, setFormData] = useState({
    legalEntityName: "",
    registrationType: "Private Limited",
    cinOrRegistrationNumber: "",
    yearEstablished: "",
    website: "",
    panNumber: "",
    gstin: "",
    signatoryName: "",
    signatoryDesignation: "Director",
    signatoryEmail: "",
    signatoryMobile: "",
    registeredAddress: "",
    city: "",
    state: "Tamil Nadu",
    pincode: "",
    primarySpecialty: "Medical Coding",
    accreditations: ["AAPC Approved Education Partner"],
    certifiedTrainedCount: "2500+",
    activeBatchesPerYear: "12",
    regCertificateUrl: "",
    gstCertificateUrl: "",
    panDocumentUrl: "",
    accreditationDocumentUrl: "",
    declarationAccepted: false,
    submittedByName: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [serverKycStatus, setServerKycStatus] = useState("pending");
  const [serverKycNotes, setServerKycNotes] = useState("");
  const [serverKycRejectionReason, setServerKycRejectionReason] = useState("");
  const [serverSubmittedAt, setServerSubmittedAt] = useState(null);
  const [serverVerifiedAt, setServerVerifiedAt] = useState(null);
  const [docNames, setDocNames] = useState({});
  const [uploadingField, setUploadingField] = useState(null);

  const getAuthHeader = () => {
    // NOTE: fixed to read the same key AcademyLogin.jsx actually sets on
    // login ("talentera_academy_token") - this previously read a key that
    // was never written anywhere, so every KYC fetch/submit/upload call was
    // silently going out with no Authorization header and failing auth.
    const token = localStorage.getItem("talentera_academy_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getAssetUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
    const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "");
    return `${base}${url.startsWith("/") ? url : "/" + url}`;
  };

  const getDocDisplayName = (field) => {
    if (docNames[field]) return docNames[field];
    const url = formData[field];
    if (!url) return "";
    try {
      const last = decodeURIComponent(url.split("/").pop().split("?")[0]);
      return last.replace(/^\d+-/, "");
    } catch {
      return "Document Attached";
    }
  };

  // Pre-fill form from backend KYC endpoint or passed academy prop
  useEffect(() => {
    const fetchKycData = async () => {
      setFetching(true);
      try {
        const res = await fetch("/api/academy/kyc", {
          headers: { ...getAuthHeader() },
        });
        const data = await safeJson(res);
        if (res.ok && data) {
          setServerKycStatus(data.kycStatus || "pending");
          setServerKycNotes(data.kycNotes || "");
          setServerKycRejectionReason(data.kycRejectionReason || "");
          setServerSubmittedAt(data.kycSubmittedAt);
          setServerVerifiedAt(data.kycVerifiedAt);

          const kd = data.kycData || {};
          const ac = data.academy || academy || {};

          setFormData((prev) => ({
            ...prev,
            legalEntityName: kd.legalEntityName || ac.name || "",
            registrationType: kd.registrationType || "Private Limited",
            cinOrRegistrationNumber: kd.cinOrRegistrationNumber || "",
            yearEstablished: kd.yearEstablished || "2020",
            website: kd.website || "",
            panNumber: kd.panNumber || "",
            gstin: kd.gstin || "",
            signatoryName: kd.signatoryName || ac.contactName || ac.primaryAdmin || "",
            signatoryDesignation: kd.signatoryDesignation || "Director / Principal",
            signatoryEmail: kd.signatoryEmail || ac.email || "",
            signatoryMobile: kd.signatoryMobile || ac.phone || "",
            registeredAddress: kd.registeredAddress || "",
            city: kd.city || ac.headquarters || "",
            state: kd.state || "Tamil Nadu",
            pincode: kd.pincode || "",
            primarySpecialty: kd.primarySpecialty || ac.specialty || "Medical Coding",
            accreditations: Array.isArray(kd.accreditations) && kd.accreditations.length > 0
              ? kd.accreditations
              : ["AAPC Approved Education Partner"],
            certifiedTrainedCount: kd.certifiedTrainedCount || ac.totalAlumni || "2,500+",
            activeBatchesPerYear: kd.activeBatchesPerYear || "12",
            regCertificateUrl: kd.regCertificateUrl || "",
            gstCertificateUrl: kd.gstCertificateUrl || "",
            panDocumentUrl: kd.panDocumentUrl || "",
            accreditationDocumentUrl: kd.accreditationDocumentUrl || "",
            declarationAccepted: Boolean(kd.declarationAccepted),
            submittedByName: kd.submittedByName || ac.contactName || ac.primaryAdmin || "",
          }));
        }
      } catch (err) {
        console.error("Error fetching academy KYC:", err);
      } finally {
        setFetching(false);
      }
    };

    fetchKycData();
  }, [academy]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAccreditationToggle = (item) => {
    setFormData((prev) => {
      const exists = prev.accreditations.includes(item);
      const updated = exists
        ? prev.accreditations.filter((x) => x !== item)
        : [...prev.accreditations, item];
      return { ...prev, accreditations: updated };
    });
  };

  const ALLOWED_DOC_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
  const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10MB

  const handleDocUpload = async (field, file) => {
    if (!file) return;
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      if (showToast) showToast("Please upload a PDF or image file (JPG, PNG, WEBP).", "error");
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      if (showToast) showToast("File is too large. Maximum size is 10MB.", "error");
      return;
    }

    setUploadingField(field);
    try {
      const body = new FormData();
      body.append("doc", file);
      const res = await fetch("/api/academy/kyc/upload-doc", {
        method: "POST",
        headers: { ...getAuthHeader() },
        body,
      });
      const data = await safeJson(res);
      if (res.ok && data.docUrl) {
        handleInputChange(field, data.docUrl);
        setDocNames((prev) => ({ ...prev, [field]: data.docName || file.name }));
        if (showToast) showToast("Document uploaded successfully!", "success");
      } else {
        if (showToast) showToast(data.message || "Upload failed. Please try again.", "error");
      }
    } catch (err) {
      console.error("KYC doc upload error:", err);
      if (showToast) showToast("Server error uploading document. Please try again.", "error");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmitKyc = async (e) => {
    e.preventDefault();

    if (!formData.legalEntityName.trim()) {
      if (showToast) showToast("Please enter your registered Legal Entity Name.", "error");
      return;
    }
    if (!formData.panNumber.trim() || formData.panNumber.length < 10) {
      if (showToast) showToast("Please provide a valid 10-character PAN number.", "error");
      return;
    }
    if (!formData.signatoryName.trim() || !formData.signatoryMobile.trim()) {
      if (showToast) showToast("Authorized signatory name and mobile are required.", "error");
      return;
    }
    if (!formData.declarationAccepted) {
      if (showToast) showToast("Please confirm the authorization declaration before submitting.", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/academy/kyc/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(formData),
      });

      const data = await safeJson(res);
      if (res.ok) {
        setServerKycStatus("under_review");
        setServerSubmittedAt(new Date().toISOString());
        setServerKycRejectionReason("");
        if (showToast) {
          showToast(data.message || "Institutional KYC submitted for Staff audit!", "success");
        }
        if (onKycUpdated) onKycUpdated();
      } else {
        if (showToast) {
          showToast(data.message || "Failed to submit KYC form.", "error");
        }
      }
    } catch (err) {
      console.error("KYC submit error:", err);
      if (showToast) showToast("Server error submitting KYC. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const availableAccreditations = [
    "AAPC Approved Education Partner",
    "AHIMA Approved Partner",
    "NSDC / Skill India Certified",
    "ISO 9001:2015 Quality Certified",
    "NAAC Accredited Institution",
    "Healthcare Sector Skill Council (HSSC)",
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>
      {/* HEADER SECTION */}
      <div
        style={{
          background: "linear-gradient(135deg, #06152A 0%, #0A2540 100%)",
          borderRadius: 16,
          padding: "26px 30px",
          color: "#fff",
          marginBottom: 24,
          border: "1px solid rgba(229,168,46,0.3)",
          boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(229,168,46,0.2)",
                color: "#E5A82E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: "var(--font-heading)" }}>
              Academy Institutional KYC Verification
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.75)", maxWidth: 680 }}>
            Complete your institutional registration, regulatory tax identifiers (PAN/GSTIN), and authorized leadership sign-off.
            Once audited and approved by Talentera Staff Compliance, student batches are fully activated for employer placement.
          </p>
        </div>

        {/* STATUS PILL */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 4 }}>
            Current Status
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              background:
                serverKycStatus === "verified"
                  ? "#DCFCE7"
                  : serverKycStatus === "under_review"
                  ? "#DBEAFE"
                  : serverKycStatus === "rejected"
                  ? "#FEE2E2"
                  : "#FEF3C7",
              color:
                serverKycStatus === "verified"
                  ? "#15803D"
                  : serverKycStatus === "under_review"
                  ? "#1E40AF"
                  : serverKycStatus === "rejected"
                  ? "#B91C1C"
                  : "#B45309",
              border:
                serverKycStatus === "verified"
                  ? "1px solid #86EFAC"
                  : serverKycStatus === "under_review"
                  ? "1px solid #93C5FD"
                  : serverKycStatus === "rejected"
                  ? "1px solid #FCA5A5"
                  : "1px solid #FCD34D",
            }}
          >
            {serverKycStatus === "verified" && <ShieldCheck size={16} />}
            {serverKycStatus === "under_review" && <Clock size={16} />}
            {serverKycStatus === "rejected" && <AlertTriangle size={16} />}
            {serverKycStatus === "pending" && <ShieldAlert size={16} />}
            {serverKycStatus === "verified"
              ? "Verified Partner"
              : serverKycStatus === "under_review"
              ? "Under Staff Review"
              : serverKycStatus === "rejected"
              ? "Revision Required"
              : "KYC Pending"}
          </div>
        </div>
      </div>

      {/* DYNAMIC ALERT BANNER BASED ON KYC STATUS */}
      {serverKycStatus === "verified" && (
        <div
          style={{
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 14,
            padding: "18px 22px",
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <div style={{ color: "#16A34A", marginTop: 2 }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#166534" }}>
              Institutional KYC Verified &amp; Active
            </div>
            <div style={{ fontSize: 13, color: "#15803D", marginTop: 4 }}>
              Your academy profile and accreditation documents have been audited and approved by Talentera Staff Compliance.
              {serverVerifiedAt && <span> Verified on {new Date(serverVerifiedAt).toLocaleDateString()}.</span>}
              {" "}You have unrestricted access to upload student batches, confirm placement track records, and dispatch candidate profiles to top healthcare recruiters.
            </div>
            {serverKycNotes && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#14532D", background: "rgba(22,101,52,0.08)", padding: "6px 12px", borderRadius: 6 }}>
                <strong>Staff Auditor Note:</strong> {serverKycNotes}
              </div>
            )}
          </div>
        </div>
      )}

      {serverKycStatus === "under_review" && (
        <div
          style={{
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: 14,
            padding: "18px 22px",
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <div style={{ color: "#2563EB", marginTop: 2 }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1E40AF" }}>
              KYC Documents Under Review by Compliance Staff
            </div>
            <div style={{ fontSize: 13, color: "#1D4ED8", marginTop: 4 }}>
              Your institutional KYC verification was submitted
              {serverSubmittedAt ? ` on ${new Date(serverSubmittedAt).toLocaleDateString()} at ${new Date(serverSubmittedAt).toLocaleTimeString()}` : ""}
              {" "}and is currently queued for manual audit by our Staff Verification Team. Turnaround time is typically within 24-48 business hours. You can update your submission below at any time.
            </div>
          </div>
        </div>
      )}

      {serverKycStatus === "rejected" && (
        <div
          style={{
            background: "#FEF2F2",
            border: "2px solid #F87171",
            borderRadius: 14,
            padding: "18px 22px",
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <div style={{ color: "#DC2626", marginTop: 2 }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#991B1B" }}>
              Action Required: Institutional KYC Revision Requested
            </div>
            <div style={{ fontSize: 13, color: "#B91C1C", marginTop: 4 }}>
              Staff Compliance reviewed your institutional submission and requested revisions before activation:
            </div>
            <div
              style={{
                marginTop: 8,
                background: "#FFF",
                border: "1px solid #FCA5A5",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 700,
                color: "#991B1B",
              }}
            >
              {serverKycRejectionReason || "Please verify official PAN/GSTIN registration certificate details."}
            </div>
            <div style={{ fontSize: 12, color: "#7F1D1D", marginTop: 8 }}>
              Please correct the fields below and click <strong>"Update &amp; Re-Submit KYC"</strong>.
            </div>
          </div>
        </div>
      )}

      {serverKycStatus === "pending" && (
        <div
          style={{
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: 14,
            padding: "18px 22px",
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <div style={{ color: "#D97706", marginTop: 2 }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#92400E" }}>
              KYC Verification Required to Add Students
            </div>
            <div style={{ fontSize: 13, color: "#B45309", marginTop: 4 }}>
              To ensure compliance and secure candidate placements with partner hospitals and RCM companies, please complete and submit the institutional verification details below. Once approved by our team, student batch onboarding and candidate invitations will be fully unlocked.
            </div>
          </div>
        </div>
      )}

      {/* FORM BODY */}
      <form onSubmit={handleSubmitKyc}>
        {/* SECTION 1: LEGAL & ENTITY DETAILS */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, borderBottom: "1px solid #F1F5F9", paddingBottom: 12 }}>
            <Building2 size={20} color="#0A1F3D" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0A1F3D" }}>
              1. Legal Organization &amp; Registration
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Registered Legal Entity Name <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.legalEntityName}
                onChange={(e) => handleInputChange("legalEntityName", e.target.value)}
                placeholder="e.g. Apex Health Sciences Pvt Ltd"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Organization Type <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <select
                value={formData.registrationType}
                onChange={(e) => handleInputChange("registrationType", e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  background: "#FFF",
                  outline: "none",
                }}
              >
                <option value="Private Limited">Private Limited Company (Pvt Ltd)</option>
                <option value="Limited Liability Partnership">Limited Liability Partnership (LLP)</option>
                <option value="Registered Trust / Society">Registered Trust / Society</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Affiliated College / Institute">Affiliated College / Institute</option>
                <option value="Public Limited">Public Limited Company</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                CIN / Registration Number <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.cinOrRegistrationNumber}
                onChange={(e) => handleInputChange("cinOrRegistrationNumber", e.target.value)}
                placeholder="e.g. U72900TN2020PTC135790"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Year Established
              </label>
              <input
                type="text"
                value={formData.yearEstablished}
                onChange={(e) => handleInputChange("yearEstablished", e.target.value)}
                placeholder="e.g. 2019"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Official Institute Website URL
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                placeholder="e.g. https://apexhealthcare.edu.in"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: TAX & REGULATORY IDENTIFIERS */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, borderBottom: "1px solid #F1F5F9", paddingBottom: 12 }}>
            <FileText size={20} color="#0A1F3D" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0A1F3D" }}>
              2. Tax &amp; Regulatory Identification (PAN &amp; GSTIN)
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Permanent Account Number (PAN) <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                maxLength={10}
                value={formData.panNumber}
                onChange={(e) => handleInputChange("panNumber", e.target.value.toUpperCase())}
                placeholder="e.g. AABCA1234F"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 11, color: "#64748B", marginTop: 4, display: "block" }}>
                10-character alphanumeric PAN of the registered entity or managing trustee.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                GSTIN (Goods &amp; Services Tax ID)
              </label>
              <input
                type="text"
                maxLength={15}
                value={formData.gstin}
                onChange={(e) => handleInputChange("gstin", e.target.value.toUpperCase())}
                placeholder="e.g. 33AAAAA0000A1Z5"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 11, color: "#64748B", marginTop: 4, display: "block" }}>
                15-digit GSTIN if registered under GST.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: AUTHORIZED SIGNATORY / PRINCIPAL DETAILS */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, borderBottom: "1px solid #F1F5F9", paddingBottom: 12 }}>
            <UserCheck size={20} color="#0A1F3D" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0A1F3D" }}>
              3. Authorized Signatory / Principal / Director
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Signatory Full Name <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.signatoryName}
                onChange={(e) => handleInputChange("signatoryName", e.target.value)}
                placeholder="e.g. Dr. Rajesh Kumar"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Official Designation <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.signatoryDesignation}
                onChange={(e) => handleInputChange("signatoryDesignation", e.target.value)}
                placeholder="e.g. Director &amp; Head of Training"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Official Email Address <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="email"
                value={formData.signatoryEmail}
                onChange={(e) => handleInputChange("signatoryEmail", e.target.value)}
                placeholder="e.g. director@apexhealthcare.edu.in"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Contact Mobile Number <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="tel"
                value={formData.signatoryMobile}
                onChange={(e) => handleInputChange("signatoryMobile", e.target.value)}
                placeholder="e.g. +91 98765 43210"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: REGISTERED PHYSICAL ADDRESS */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, borderBottom: "1px solid #F1F5F9", paddingBottom: 12 }}>
            <MapPin size={20} color="#0A1F3D" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0A1F3D" }}>
              4. Registered Campus &amp; Physical Address
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Registered Building / Campus Address
              </label>
              <input
                type="text"
                value={formData.registeredAddress}
                onChange={(e) => handleInputChange("registeredAddress", e.target.value)}
                placeholder="e.g. 104, Avinashi Road, Peelamedu, Tech Park Complex"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                City / Headquarters
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                placeholder="e.g. Coimbatore"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleInputChange("state", e.target.value)}
                placeholder="e.g. Tamil Nadu"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Postal Code (PIN)
              </label>
              <input
                type="text"
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => handleInputChange("pincode", e.target.value)}
                placeholder="e.g. 641004"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: ACADEMIC CREDENTIALS & SPECIALTY */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, borderBottom: "1px solid #F1F5F9", paddingBottom: 12 }}>
            <Award size={20} color="#0A1F3D" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0A1F3D" }}>
              5. Academic Specialty &amp; Training Capacity
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Primary Training Specialty
              </label>
              <select
                value={formData.primarySpecialty}
                onChange={(e) => handleInputChange("primarySpecialty", e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  background: "#FFF",
                  outline: "none",
                }}
              >
                <option value="Medical Coding">Medical Coding (CPC, CCS, CIC)</option>
                <option value="Medical Billing">Medical Billing &amp; Claims Management</option>
                <option value="AR Calling">AR Calling &amp; Denial Management</option>
                <option value="RCM Comprehensive">RCM Comprehensive Suite</option>
                <option value="Clinical Documentation">Clinical Documentation Improvement (CDI)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Total Certified Trainees (Alumni Base)
              </label>
              <input
                type="text"
                value={formData.certifiedTrainedCount}
                onChange={(e) => handleInputChange("certifiedTrainedCount", e.target.value)}
                placeholder="e.g. 5,000+"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Average Batches Per Year
              </label>
              <input
                type="text"
                value={formData.activeBatchesPerYear}
                onChange={(e) => handleInputChange("activeBatchesPerYear", e.target.value)}
                placeholder="e.g. 12"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 10 }}>
              Recognized Accreditations &amp; Affiliations (Select all that apply)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {availableAccreditations.map((acc, idx) => {
                const checked = formData.accreditations.includes(acc);
                return (
                  <label
                    key={idx}
                    onClick={() => handleAccreditationToggle(acc)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: checked ? "1px solid #0A1F3D" : "1px solid #E2E8F0",
                      background: checked ? "#F8FAFC" : "#FFF",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: checked ? 700 : 500,
                      color: checked ? "#0A1F3D" : "#475569",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      style={{ cursor: "pointer", accentColor: "#0A1F3D" }}
                    />
                    {acc}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 6: DOCUMENT PROOFS */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, borderBottom: "1px solid #F1F5F9", paddingBottom: 12 }}>
            <UploadCloud size={20} color="#0A1F3D" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0A1F3D" }}>
              6. Institutional Document Proofs &amp; Attachments
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              { label: "Certificate of Incorporation / Registration", field: "regCertificateUrl", desc: "COI, Society certificate, or Trust deed" },
              { label: "Entity PAN Card Copy", field: "panDocumentUrl", desc: "Clear scan of organization PAN card" },
              { label: "GST Registration Certificate", field: "gstCertificateUrl", desc: "GST REG-06 or equivalent if applicable" },
              { label: "Accreditation / Affiliation Letter", field: "accreditationDocumentUrl", desc: "AAPC/AHIMA partner certificate or MoUs" },
            ].map((doc, idx) => {
              const hasFile = Boolean(formData[doc.field]);
              const isUploading = uploadingField === doc.field;
              const inputId = `kyc-doc-upload-${doc.field}`;
              return (
                <div
                  key={idx}
                  style={{
                    border: "1px dashed #CBD5E1",
                    borderRadius: 12,
                    padding: 16,
                    background: hasFile ? "#F0FDF4" : "#F8FAFC",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
                      {doc.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>
                      {doc.desc}
                    </div>
                  </div>

                  {/* Real file input (PDF / image) - visually hidden, driven by the
                      label/button below so it still looks like the original design. */}
                  <input
                    id={inputId}
                    type="file"
                    accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                    style={{ display: "none" }}
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files && e.target.files[0];
                      if (file) handleDocUpload(doc.field, file);
                      e.target.value = "";
                    }}
                  />

                  <div>
                    {hasFile ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "#DCFCE7", padding: "8px 12px", borderRadius: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#15803D", display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {getDocDisplayName(doc.field) || "Attached"}
                          </span>
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                          <a
                            href={getAssetUrl(formData[doc.field])}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#0369A1", fontSize: 11, fontWeight: 700, textDecoration: "underline" }}
                          >
                            View
                          </a>
                          <label
                            htmlFor={inputId}
                            style={{ color: "#15803D", fontSize: 11, fontWeight: 700, cursor: isUploading ? "default" : "pointer", textDecoration: "underline", opacity: isUploading ? 0.6 : 1 }}
                          >
                            {isUploading ? "Uploading…" : "Replace"}
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor={inputId}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #CBD5E1",
                          borderRadius: 6,
                          background: isUploading ? "#F1F5F9" : "#FFF",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#334155",
                          cursor: isUploading ? "default" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <UploadCloud size={14} /> {isUploading ? "Uploading…" : "Attach Proof Document (PDF/Image)"}
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 7: DECLARATION & SUBMISSION */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 24,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={formData.declarationAccepted}
              onChange={(e) => handleInputChange("declarationAccepted", e.target.checked)}
              required
              style={{ marginTop: 3, cursor: "pointer", accentColor: "#0A1F3D", width: 16, height: 16 }}
            />
            <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
              I hereby declare that all information, institutional credentials, and representative details provided in this Institutional KYC application are accurate, valid, and fully authorized by the governing leadership of the applicant institution.
            </div>
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, paddingTop: 16, borderTop: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Authorized Signatory: <strong>{formData.signatoryName || "Authorized Representative"}</strong> ({formData.signatoryDesignation || "Director"})
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #0A1F3D 0%, #0F325E 100%)",
                color: "#E5A82E",
                border: "1px solid rgba(229,168,46,0.5)",
                padding: "12px 28px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 12px rgba(10,31,61,0.25)",
              }}
            >
              {loading ? (
                <>Saving &amp; Submitting...</>
              ) : serverKycStatus === "rejected" ? (
                <>
                  <RotateCcw size={16} /> Update &amp; Re-Submit Institutional KYC
                </>
              ) : (
                <>
                  <Save size={16} /> Submit Institutional KYC for Staff Verification
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
