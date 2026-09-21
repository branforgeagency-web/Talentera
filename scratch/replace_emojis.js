const fs = require('fs');
const path = require('path');

const staffHubPath = path.resolve('frontend/src/pages/StaffHub.jsx');
let content = fs.readFileSync(staffHubPath, 'utf8');

// Replacements in StaffHub.jsx
const replacements = [
  // Departments object
  {
    from: 'icon: "👥", title: "Candidate Acquisition"',
    to: 'icon: <i className="fa-solid fa-users"></i>, title: "Candidate Acquisition"'
  },
  {
    from: 'icon: "🏢", title: "Company Relations"',
    to: 'icon: <i className="fa-solid fa-building"></i>, title: "Company Relations"'
  },
  {
    from: 'icon: "🔄", title: "Mapping Engine"',
    to: 'icon: <i className="fa-solid fa-arrows-rotate"></i>, title: "Mapping Engine"'
  },
  {
    from: 'icon: "🎥", title: "Assessment + Video"',
    to: 'icon: <i className="fa-solid fa-video"></i>, title: "Assessment + Video"'
  },
  {
    from: 'icon: "📈", title: "CRM + Data"',
    to: 'icon: <i className="fa-solid fa-chart-line"></i>, title: "CRM + Data"'
  },
  {
    from: 'icon: "💰", title: "Success + Revenue"',
    to: 'icon: <i className="fa-solid fa-sack-dollar"></i>, title: "Success + Revenue"'
  },

  // Audit modal
  {
    from: '📁 1. Uploaded Certificate Document',
    to: '<i className="fa-solid fa-folder-open" style={{ marginRight: 8, color: "#3B82F6" }}></i> 1. Uploaded Certificate Document'
  },
  {
    from: '📄 View / Download Certificate PDF',
    to: '<><i className="fa-solid fa-file-pdf" style={{ marginRight: 8 }}></i> View / Download Certificate PDF</>'
  },
  {
    from: '⚠️ No certificate document file attached to this claim.',
    to: '<><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i> No certificate document file attached to this claim.</>'
  },
  {
    from: '🌐 2. Issuing Body Official Registry Lookup',
    to: '<i className="fa-solid fa-globe" style={{ marginRight: 8, color: "#2563EB" }}></i> 2. Issuing Body Official Registry Lookup'
  },
  {
    from: '<span>✓ Evidence captured</span>',
    to: '<span><i className="fa-solid fa-check" style={{ marginRight: 4 }}></i> Evidence captured</span>'
  },
  {
    from: '🖼️ View captured registry screenshot ↗',
    to: '<><i className="fa-solid fa-image" style={{ marginRight: 6 }}></i> View captured registry screenshot ↗</>'
  },
  {
    from: '🎥 Start Live Remote Verification',
    to: '<><i className="fa-solid fa-video" style={{ marginRight: 8 }}></i> Start Live Remote Verification</>'
  },
  {
    from: '🔗 Open {officialMeta.name} Portal in New Tab ↗',
    to: '<><i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: 6 }}></i> Open {officialMeta.name} Portal in New Tab ↗</>'
  },
  {
    from: '<span>✅</span> Verification Quality Checklist',
    to: '<span><i className="fa-solid fa-circle-check" style={{ color: "#16A34A", marginRight: 8 }}></i></span> Verification Quality Checklist'
  },
  {
    from: '{idFormatValid ? "✓" : "!"}',
    to: '{idFormatValid ? <i className="fa-solid fa-check" style={{ color: "#16A34A" }}></i> : "!"}'
  },
  {
    from: '✓ ID &quot;',
    to: '<i className="fa-solid fa-check" style={{ color: "#16A34A", marginRight: 4 }}></i> ID &quot;'
  },
  {
    from: '⚠️ ID &quot;',
    to: '<i className="fa-solid fa-triangle-exclamation" style={{ color: "#DC2626", marginRight: 4 }}></i> ID &quot;'
  },
  {
    from: '{hasLiveCapture ? "✓ Evidence captured via Live Remote Browser Session." :',
    to: '{hasLiveCapture ? <><i className="fa-solid fa-check" style={{ color: "#16A34A", marginRight: 4 }}></i> Evidence captured via Live Remote Browser Session.</> :'
  },
  {
    from: '{processingId === selectedCert.id ? "Processing…" : "✓ Approve & Verify Certification"}',
    to: '{processingId === selectedCert.id ? "Processing…" : <><i className="fa-solid fa-check" style={{ marginRight: 6 }}></i> Approve & Verify Certification</>}'
  },
  {
    from: '✕ Reject Certification Claim',
    to: '<><i className="fa-solid fa-xmark" style={{ marginRight: 6 }}></i> Reject Certification Claim</>'
  },
  {
    from: '✓ Currently marked verified in database',
    to: '<><i className="fa-solid fa-circle-check" style={{ marginRight: 6 }}></i> Currently marked verified in database</>'
  },
  {
    from: '✕ Currently rejected in database',
    to: '<><i className="fa-solid fa-circle-xmark" style={{ marginRight: 6 }}></i> Currently rejected in database</>'
  },
  {
    from: 'showToast(`Copied ${label || text} to clipboard! 📋`);',
    to: 'showToast(`Copied ${label || text} to clipboard!`);'
  },
  {
    from: 'showToast("Candidate roster exported successfully! 📥");',
    to: 'showToast("Candidate roster exported successfully!");'
  },
  {
    from: 'showToast("Company directory exported successfully! 📥");',
    to: 'showToast("Company directory exported successfully!");'
  },
  {
    from: 'showToast("Question removed from bank. 🗑️");',
    to: 'showToast("Question removed from bank.");'
  },
  {
    from: 'showToast("Interview question removed from bank. 🗑️");',
    to: 'showToast("Interview question removed from bank.");'
  },

  // Directory buttons & headers
  {
    from: '{candidatesLoading ? "Refreshing..." : "🔄 Refresh Directory"}',
    to: '{candidatesLoading ? "Refreshing..." : <><i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }}></i> Refresh Directory</>}'
  },
  {
    from: '<span className="sf-hero-pill-val" style={{ color: "#22C55E" }}>🎉 {totalHiredSum}</span>',
    to: '<span className="sf-hero-pill-val" style={{ color: "#22C55E" }}><i className="fa-solid fa-award" style={{ marginRight: 4 }}></i> {totalHiredSum}</span>'
  },
  {
    from: '✓ Verified (Gold) ({verifiedTotal})',
    to: '<><i className="fa-solid fa-circle-check" style={{ color: "#16A34A", marginRight: 5 }}></i> Verified (Gold) ({verifiedTotal})</>'
  },
  {
    from: '📊 In Assessment ({inAssessmentTotal})',
    to: '<><i className="fa-solid fa-chart-simple" style={{ color: "#2563EB", marginRight: 5 }}></i> In Assessment ({inAssessmentTotal})</>'
  },
  {
    from: '🛡️ Aadhaar Verified ({aadhaarTotal})',
    to: '<><i className="fa-solid fa-shield-halved" style={{ color: "#059669", marginRight: 5 }}></i> Aadhaar Verified ({aadhaarTotal})</>'
  },
  {
    from: '🎉 Placed ({totalHiredSum})',
    to: '<><i className="fa-solid fa-award" style={{ color: "#22C55E", marginRight: 5 }}></i> Placed ({totalHiredSum})</>'
  },
  {
    from: '<span>📞 {c.mobile}</span>',
    to: '<span><i className="fa-solid fa-phone" style={{ marginRight: 5, color: "#64748B" }}></i> {c.mobile}</span>'
  },
  {
    from: '{isAadhaarDone ? "✓ Aadhaar Verified" : "⏳ Aadhaar Pending"}',
    to: '{isAadhaarDone ? <><i className="fa-solid fa-shield-halved" style={{ color: "#16A34A", marginRight: 4 }}></i> Aadhaar Verified</> : <><i className="fa-solid fa-clock" style={{ color: "#F59E0B", marginRight: 4 }}></i> Aadhaar Pending</>}'
  },
  {
    from: '📍 {c.city || c.stage1?.city || "India"}',
    to: '<><i className="fa-solid fa-location-dot" style={{ marginRight: 4, color: "#64748B" }}></i> {c.city || c.stage1?.city || "India"}</>'
  },
  {
    from: '🎉 {m.hired} Hired',
    to: '<><i className="fa-solid fa-award" style={{ color: "#16A34A", marginRight: 4 }}></i> {m.hired} Hired</>'
  },
  {
    from: '📜 {m.offered} Offered',
    to: '<><i className="fa-solid fa-scroll" style={{ color: "#B45309", marginRight: 4 }}></i> {m.offered} Offered</>'
  },
  {
    from: '{c.isVerified ? "VERIFIED ✓" : stages.length >= 4 ? "IN ASSESSMENT" : "PENDING"}',
    to: '{c.isVerified ? <><i className="fa-solid fa-circle-check" style={{ marginRight: 4 }}></i> VERIFIED</> : stages.length >= 4 ? "IN ASSESSMENT" : "PENDING"}'
  },
  {
    from: '🎯 Jobs ({m.total})',
    to: '<><i className="fa-solid fa-bullseye" style={{ color: "#2563EB", marginRight: 5 }}></i> Jobs ({m.total})</>'
  },
  {
    from: '✓ Verified',
    to: '<><i className="fa-solid fa-check" style={{ marginRight: 4 }}></i> Verified</>'
  },
  {
    from: '✓ Verify',
    to: '<><i className="fa-solid fa-check" style={{ marginRight: 4 }}></i> Verify</>'
  },
  {
    from: '🔑 Reset PW',
    to: '<><i className="fa-solid fa-key" style={{ marginRight: 4 }}></i> Reset PW</>'
  },
  {
    from: '<div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>',
    to: '<div style={{ fontSize: 28, marginBottom: 8, color: "#94A3B8" }}><i className="fa-solid fa-magnifying-glass"></i></div>'
  },
  {
    from: '{c.aadhaarVerified ? "✓ Aadhaar" : "⏳ Aadhaar Pending"}',
    to: '{c.aadhaarVerified ? <><i className="fa-solid fa-shield-halved" style={{ color: "#16A34A", marginRight: 4 }}></i> Aadhaar</> : <><i className="fa-solid fa-clock" style={{ color: "#F59E0B", marginRight: 4 }}></i> Aadhaar Pending</>}'
  },
  {
    from: '{c.isVerified ? "VERIFIED GOLD ✓" : "PENDING AUDIT"}',
    to: '{c.isVerified ? <><i className="fa-solid fa-circle-check" style={{ marginRight: 4 }}></i> VERIFIED GOLD</> : "PENDING AUDIT"}'
  },

  // Question bank dual tabs
  {
    from: '<span>🎯 Stage 4: Proctored Assessment MCQs ({assessmentQuestions.length})</span>',
    to: '<span><i className="fa-solid fa-bullseye" style={{ marginRight: 8, color: questionBankTab === "stage4" ? "#FFFFFF" : "#059669" }}></i>Stage 4: Proctored Assessment MCQs ({assessmentQuestions.length})</span>'
  },
  {
    from: '<span>🎤 Stage 5 & 8: AI Spoken & Mock Interview ({interviewQuestions.length})</span>',
    to: '<span><i className="fa-solid fa-microphone" style={{ marginRight: 8, color: questionBankTab === "stage5" ? "#FFFFFF" : "#2563EB" }}></i>Stage 5 & 8: AI Spoken & Mock Interview ({interviewQuestions.length})</span>'
  },
  {
    from: '<span>{dom === "Medical Coding" ? "🩺" : dom === "Medical Billing" ? "💳" : dom === "Accounts Receivable" ? "📈" : "🏢"}</span>',
    to: '<span>{dom === "Medical Coding" ? <i className="fa-solid fa-stethoscope" style={{ marginRight: 6 }}></i> : dom === "Medical Billing" ? <i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: 6 }}></i> : dom === "Accounts Receivable" ? <i className="fa-solid fa-chart-line" style={{ marginRight: 6 }}></i> : <i className="fa-solid fa-hospital-user" style={{ marginRight: 6 }}></i>}</span>'
  },
  {
    from: '<div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>',
    to: '<div style={{ fontSize: 32, marginBottom: 12, color: "#64748B" }}><i className="fa-solid fa-bullseye"></i></div>'
  },
  {
    from: '{q.sectionIcon || "🎯"} {q.sectionName || "Section"}',
    to: '<><i className="fa-solid fa-layer-group" style={{ marginRight: 6, color: "#059669" }}></i>{q.sectionName || "Section"}</>'
  },
  {
    from: '✏️ Edit',
    to: '<><i className="fa-solid fa-pen-to-square" style={{ marginRight: 5 }}></i>Edit</>'
  },
  {
    from: '🗑️ Delete',
    to: '<><i className="fa-solid fa-trash-can" style={{ marginRight: 5 }}></i>Delete</>'
  },
  {
    from: '✓ Correct',
    to: '<><i className="fa-solid fa-check" style={{ marginRight: 4 }}></i>Correct</>'
  },
  {
    from: '<strong style={{ color: "#1E293B" }}>💡 Explanation: </strong>',
    to: '<strong style={{ color: "#1E293B" }}><i className="fa-solid fa-lightbulb" style={{ color: "#D97706", marginRight: 5 }}></i>Explanation: </strong>'
  },
  {
    from: '<div style={{ fontSize: 32, marginBottom: 12 }}>🎤</div>',
    to: '<div style={{ fontSize: 32, marginBottom: 12, color: "#64748B" }}><i className="fa-solid fa-microphone"></i></div>'
  },
  {
    from: '🎥 Video & 🎙️ Audio',
    to: '<><i className="fa-solid fa-video" style={{ marginRight: 4 }}></i> Video & <i className="fa-solid fa-microphone" style={{ margin: "0 4px" }}></i> Audio</>'
  },
  {
    from: '🎥 Video Assessment Only',
    to: '<><i className="fa-solid fa-video" style={{ marginRight: 6 }}></i> Video Assessment Only</>'
  },
  {
    from: '🎙️ Audio Interview Only',
    to: '<><i className="fa-solid fa-microphone" style={{ marginRight: 6 }}></i> Audio Interview Only</>'
  },
  {
    from: '📋 Copy',
    to: '<><i className="fa-solid fa-copy" style={{ marginRight: 5 }}></i>Copy</>'
  },
  {
    from: '⚠️ {questionError}',
    to: '<><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>{questionError}</>'
  },
  {
    from: '⚠️ {assessmentError}',
    to: '<><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>{assessmentError}</>'
  },
  {
    from: 'Correct ✓',
    to: '<><i className="fa-solid fa-check" style={{ marginRight: 4 }}></i>Correct</>'
  },

  // Quick modals
  {
    from: '{activeModal === "upload" && "📤 Upload New Candidate"}',
    to: '{activeModal === "upload" && (<><i className="fa-solid fa-upload" style={{ marginRight: 8 }}></i>Upload New Candidate</>)}'
  },
  {
    from: '{activeModal === "lead" && "💼 Add Company Lead"}',
    to: '{activeModal === "lead" && (<><i className="fa-solid fa-briefcase" style={{ marginRight: 8 }}></i>Add Company Lead</>)}'
  },
  {
    from: '{activeModal === "verify" && "⚡ Send for Verification"}',
    to: '{activeModal === "verify" && (<><i className="fa-solid fa-bolt" style={{ marginRight: 8 }}></i>Send for Verification</>)}'
  },
  {
    from: '{activeModal === "visit" && "📍 Log Site Visit"}',
    to: '{activeModal === "visit" && (<><i className="fa-solid fa-location-dot" style={{ marginRight: 8 }}></i>Log Site Visit</>)}'
  },
  {
    from: '{activeModal === "quick_add" && "➕ Quick Add Candidate / Lead"}',
    to: '{activeModal === "quick_add" && (<><i className="fa-solid fa-plus" style={{ marginRight: 8 }}></i>Quick Add Candidate / Lead</>)}'
  },
  {
    from: '{activeModal === "kanban" && "📋 Core Verification Pipeline Kanban"}',
    to: '{activeModal === "kanban" && (<><i className="fa-solid fa-clipboard-list" style={{ marginRight: 8 }}></i>Core Verification Pipeline Kanban</>)}'
  },
  {
    from: '{activeModal === "create_employee" && "🛡️ Create New Employee Account"}',
    to: '{activeModal === "create_employee" && (<><i className="fa-solid fa-shield-halved" style={{ marginRight: 8 }}></i>Create New Employee Account</>)}'
  },
  {
    from: '{activeModal === "reset_employee_password" && "🔑 Reset Employee Password"}',
    to: '{activeModal === "reset_employee_password" && (<><i className="fa-solid fa-key" style={{ marginRight: 8 }}></i>Reset Employee Password</>)}'
  },
  {
    from: '{activeModal === "reset_company_password" && "🔑 Reset Company Account Password"}',
    to: '{activeModal === "reset_company_password" && (<><i className="fa-solid fa-key" style={{ marginRight: 8 }}></i>Reset Company Account Password</>)}'
  },
  {
    from: '{activeModal === "reset_candidate_password" && "🔑 Reset Candidate Account Password"}',
    to: '{activeModal === "reset_candidate_password" && (<><i className="fa-solid fa-key" style={{ marginRight: 8 }}></i>Reset Candidate Account Password</>)}'
  },
  {
    from: '{activeModal === "search" && "⌘ Quick Global Search"}',
    to: '{activeModal === "search" && (<><i className="fa-solid fa-magnifying-glass" style={{ marginRight: 8 }}></i>Quick Global Search</>)}'
  },
  {
    from: '👥 Candidates ({matchedCandidates.length})',
    to: '<><i className="fa-solid fa-users" style={{ marginRight: 6 }}></i> Candidates ({matchedCandidates.length})</>'
  },
  {
    from: '🏢 Companies ({matchedCompanies.length})',
    to: '<><i className="fa-solid fa-building" style={{ marginRight: 6 }}></i> Companies ({matchedCompanies.length})</>'
  },
  {
    from: '🎓 Academies ({matchedAcademies.length})',
    to: '<><i className="fa-solid fa-graduation-cap" style={{ marginRight: 6 }}></i> Academies ({matchedAcademies.length})</>'
  },
  {
    from: '⚡ Push All Pending Candidates Now',
    to: '<><i className="fa-solid fa-bolt" style={{ marginRight: 6 }}></i> Push All Pending Candidates Now</>'
  },
  {
    from: '<span>⚠️</span>',
    to: '<span><i className="fa-solid fa-triangle-exclamation" style={{ color: "#EF4444" }}></i></span>'
  },
  {
    from: '🎲 Auto-Generate',
    to: '<><i className="fa-solid fa-dice" style={{ marginRight: 6 }}></i> Auto-Generate</>'
  },
  {
    from: '{showEmployeePassword ? "🙈" : "👁️"}',
    to: '{showEmployeePassword ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}'
  },
  {
    from: '{showCompanyPassword ? "🙈" : "👁️"}',
    to: '{showCompanyPassword ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}'
  },
  {
    from: '{showCandidatePassword ? "🙈" : "👁️"}',
    to: '{showCandidatePassword ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}'
  },
  {
    from: '<span>✉️ {resetPasswordCompany.email}</span>',
    to: '<span><i className="fa-solid fa-envelope" style={{ marginRight: 5, color: "#64748B" }}></i> {resetPasswordCompany.email}</span>'
  },
  {
    from: '{resetPasswordCompany.mobile && <span>📞 {resetPasswordCompany.mobile}</span>}',
    to: '{resetPasswordCompany.mobile && <span><i className="fa-solid fa-phone" style={{ marginRight: 5, color: "#64748B" }}></i> {resetPasswordCompany.mobile}</span>}'
  },
  {
    from: '<span>✉️ {resetPasswordCandidate.email}</span>',
    to: '<span><i className="fa-solid fa-envelope" style={{ marginRight: 5, color: "#64748B" }}></i> {resetPasswordCandidate.email}</span>'
  },
  {
    from: '{resetPasswordCandidate.mobile && <span>📞 {resetPasswordCandidate.mobile}</span>}',
    to: '{resetPasswordCandidate.mobile && <span><i className="fa-solid fa-phone" style={{ marginRight: 5, color: "#64748B" }}></i> {resetPasswordCandidate.mobile}</span>}'
  },
  {
    from: '<span>📍 {resetPasswordCandidate.city || resetPasswordCandidate.stage1?.city}</span>',
    to: '<span><i className="fa-solid fa-location-dot" style={{ marginRight: 5, color: "#64748B" }}></i> {resetPasswordCandidate.city || resetPasswordCandidate.stage1?.city}</span>'
  },
  {
    from: '<span>✉️ {selectedCandidate.email}</span>',
    to: '<span><i className="fa-solid fa-envelope" style={{ marginRight: 5, color: "#64748B" }}></i> {selectedCandidate.email}</span>'
  },
  {
    from: '{selectedCandidate.mobile && <span>📞 {selectedCandidate.mobile}</span>}',
    to: '{selectedCandidate.mobile && <span><i className="fa-solid fa-phone" style={{ marginRight: 5, color: "#64748B" }}></i> {selectedCandidate.mobile}</span>}'
  },
  {
    from: '<span>📍 {selectedCandidate.city || "India"}</span>',
    to: '<span><i className="fa-solid fa-location-dot" style={{ marginRight: 5, color: "#64748B" }}></i> {selectedCandidate.city || "India"}</span>'
  },
  {
    from: '<span style={{ color: "#15803D", fontWeight: 800 }}>✓ Aadhaar Verified (Official UIDAI)</span>',
    to: '<span style={{ color: "#15803D", fontWeight: 800 }}><i className="fa-solid fa-shield-halved" style={{ marginRight: 5 }}></i> Aadhaar Verified (Official UIDAI)</span>'
  },
  {
    from: '{s2.verified ? "✓ Verified Partner Academy Student" : "Pending Academy Confirmation"}',
    to: '{s2.verified ? <><i className="fa-solid fa-circle-check" style={{ marginRight: 5 }}></i> Verified Partner Academy Student</> : "Pending Academy Confirmation"}'
  },
  {
    from: '🟢 REAL · VERIFIED',
    to: '<><i className="fa-solid fa-circle-check" style={{ color: "#16A34A", marginRight: 5 }}></i> REAL · VERIFIED</>'
  },
  {
    from: '🔴 FAKE / SUSPICIOUS (Flagged)',
    to: '<><i className="fa-solid fa-triangle-exclamation" style={{ color: "#DC2626", marginRight: 5 }}></i> FAKE / SUSPICIOUS (Flagged)</>'
  },
  {
    from: '🔗 View Credential Link ↗',
    to: '<><i className="fa-solid fa-link" style={{ marginRight: 5 }}></i> View Credential Link ↗</>'
  },
  {
    from: '<span style={{ fontSize: 24 }}>📄</span>',
    to: '<span style={{ fontSize: 24, color: "#3B82F6" }}><i className="fa-solid fa-file-lines"></i></span>'
  },
  {
    from: '✓ Approve Certificate',
    to: '<><i className="fa-solid fa-check" style={{ marginRight: 5 }}></i> Approve Certificate</>'
  },
  {
    from: '✕ Reject Certificate',
    to: '<><i className="fa-solid fa-xmark" style={{ marginRight: 5 }}></i> Reject Certificate</>'
  },
  {
    from: 'Status: {ans.isCorrect ? "✓ Correct" : "✕ Incorrect"}',
    to: 'Status: {ans.isCorrect ? <span style={{ color: "#16A34A" }}><i className="fa-solid fa-check"></i> Correct</span> : <span style={{ color: "#DC2626" }}><i className="fa-solid fa-xmark"></i> Incorrect</span>}'
  },
  {
    from: '🚨 Tab Switch Auto-Terminated',
    to: '<><i className="fa-solid fa-triangle-exclamation" style={{ color: "#DC2626", marginRight: 5 }}></i> Tab Switch Auto-Terminated</>'
  },
  {
    from: '✓ Passed Anti-Cheat Checks',
    to: '<><i className="fa-solid fa-circle-check" style={{ color: "#16A34A", marginRight: 5 }}></i> Passed Anti-Cheat Checks</>'
  },
  {
    from: '<span>📹 AI Mock Interview Proctored Recording</span>',
    to: '<span><i className="fa-solid fa-video" style={{ color: "#2563EB", marginRight: 6 }}></i> AI Mock Interview Proctored Recording</span>'
  },
  {
    from: '✓ Verify Video Introduction',
    to: '<><i className="fa-solid fa-check" style={{ marginRight: 5 }}></i> Verify Video Introduction</>'
  },
  {
    from: 'interviewing: { bg: "#F0FDFA", color: "#0F766E", border: "#99F6E4", label: "INTERVIEWING 🎙️" }',
    to: 'interviewing: { bg: "#F0FDFA", color: "#0F766E", border: "#99F6E4", label: "INTERVIEWING" }'
  },
  {
    from: 'offered: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A", label: "OFFER EXTENDED 📜" }',
    to: 'offered: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A", label: "OFFER EXTENDED" }'
  },
  {
    from: 'hired: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0", label: "HIRED 🎉" }',
    to: 'hired: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0", label: "HIRED" }'
  },
  {
    from: '🗄️ Candidate Document Vault',
    to: '<><i className="fa-solid fa-box-archive" style={{ marginRight: 8, color: "#2563EB" }}></i> Candidate Document Vault</>'
  },
  {
    from: '<div style={{ fontSize: 32, marginBottom: 8 }}>🗄️</div>',
    to: '<div style={{ fontSize: 32, marginBottom: 8, color: "#94A3B8" }}><i className="fa-solid fa-box-archive"></i></div>'
  },
  {
    from: '<div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>',
    to: '<div style={{ fontSize: 28, marginBottom: 8, color: "#94A3B8" }}><i className="fa-solid fa-inbox"></i></div>'
  },
  {
    from: '<div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>',
    to: '<div style={{ fontSize: 28, marginBottom: 8, color: "#94A3B8" }}><i className="fa-solid fa-users"></i></div>'
  },
  {
    from: '📎 {doc.docName}',
    to: '<><i className="fa-solid fa-paperclip" style={{ marginRight: 5, color: "#64748B" }}></i> {doc.docName}</>'
  },
  {
    from: '{issueDate && <span>📅 Issue: {issueDate}</span>}',
    to: '{issueDate && <span><i className="fa-solid fa-calendar-days" style={{ marginRight: 4, color: "#64748B" }}></i> Issue: {issueDate}</span>}'
  },
  {
    from: '{uploadedDate && <span>🕒 Uploaded: {uploadedDate}</span>}',
    to: '{uploadedDate && <span><i className="fa-solid fa-clock" style={{ marginRight: 4, color: "#64748B" }}></i> Uploaded: {uploadedDate}</span>}'
  },
  {
    from: '<span>👁️</span>',
    to: '<span><i className="fa-solid fa-eye"></i></span>'
  },
  {
    from: '✓ Verify & Gold-Badge Entire Profile',
    to: '<><i className="fa-solid fa-award" style={{ marginRight: 6 }}></i> Verify & Gold-Badge Entire Profile</>'
  },
  {
    from: '🔑 Reset Password',
    to: '<><i className="fa-solid fa-key" style={{ marginRight: 5 }}></i> Reset Password</>'
  },
  {
    from: '<span>✉️ {selectedCompany.email}</span>',
    to: '<span><i className="fa-solid fa-envelope" style={{ marginRight: 5, color: "#64748B" }}></i> {selectedCompany.email}</span>'
  },
  {
    from: '{selectedCompany.mobile && <span>📞 {selectedCompany.mobile}</span>}',
    to: '{selectedCompany.mobile && <span><i className="fa-solid fa-phone" style={{ marginRight: 5, color: "#64748B" }}></i> {selectedCompany.mobile}</span>}'
  },
  {
    from: '📄 Download Resume ↗',
    to: '<><i className="fa-solid fa-file-arrow-down" style={{ marginRight: 5 }}></i> Download Resume ↗</>'
  },
  {
    from: '👁️ Inspect Candidate Dossier',
    to: '<><i className="fa-solid fa-eye" style={{ marginRight: 6 }}></i> Inspect Candidate Dossier</>'
  },
  {
    from: '<span>✉️ {selectedAcademy.email}</span>',
    to: '<span><i className="fa-solid fa-envelope" style={{ marginRight: 5, color: "#64748B" }}></i> {selectedAcademy.email}</span>'
  },
  {
    from: '{selectedAcademy.phone && <span>📞 {selectedAcademy.phone}</span>}',
    to: '{selectedAcademy.phone && <span><i className="fa-solid fa-phone" style={{ marginRight: 5, color: "#64748B" }}></i> {selectedAcademy.phone}</span>}'
  },
  {
    from: '🎥 Live Verification',
    to: '<><i className="fa-solid fa-video" style={{ marginRight: 8 }}></i> Live Verification</>'
  },
  {
    from: '{liveVerifyModal.capturing ? "Capturing…" : "📸 Capture Result"}',
    to: '{liveVerifyModal.capturing ? "Capturing…" : <><i className="fa-solid fa-camera" style={{ marginRight: 6 }}></i> Capture Result</>}'
  },
  {
    from: '✓ Captured — saved to this candidate\'s record as evidence',
    to: '<><i className="fa-solid fa-check" style={{ marginRight: 6 }}></i> Captured — saved to this candidate\'s record as evidence</>'
  },
  {
    from: '<span style={{ fontSize: 22 }}>⚡</span>',
    to: '<span style={{ fontSize: 22, color: "#EAB308" }}><i className="fa-solid fa-bolt"></i></span>'
  },
  {
    from: '📞 {selectedRetakeModal.candidateMobile}',
    to: '<><i className="fa-solid fa-phone" style={{ marginRight: 5, color: "#64748B" }}></i> {selectedRetakeModal.candidateMobile}</>'
  },
  {
    from: '<span style={{ fontSize: 16 }}>⚠️</span>',
    to: '<span style={{ fontSize: 16, color: "#F59E0B" }}><i className="fa-solid fa-triangle-exclamation"></i></span>'
  },
  {
    from: '<strong>⚡ Automated Action on Approval:</strong>',
    to: '<strong><i className="fa-solid fa-bolt" style={{ color: "#EAB308", marginRight: 5 }}></i> Automated Action on Approval:</strong>'
  },
  {
    from: '<strong>⚠️ Rejecting Retake Request:</strong>',
    to: '<strong><i className="fa-solid fa-triangle-exclamation" style={{ color: "#EF4444", marginRight: 5 }}></i> Rejecting Retake Request:</strong>'
  },
  {
    from: '⚡ EXPRESS AUDIT',
    to: '<><i className="fa-solid fa-bolt" style={{ marginRight: 4 }}></i> EXPRESS AUDIT</>'
  },
  {
    from: '⚡ PRIORITY',
    to: '<><i className="fa-solid fa-bolt" style={{ marginRight: 4 }}></i> PRIORITY</>'
  },
  {
    from: '⚡ (Express Audit)',
    to: '(Express Audit)'
  },
  {
    from: '⚡ (Priority Audit)',
    to: '(Priority Audit)'
  },
  {
    from: '✓ GOLD BADGE VERIFIED',
    to: '<><i className="fa-solid fa-award" style={{ marginRight: 4, color: "#EAB308" }}></i> GOLD BADGE VERIFIED</>'
  },
  {
    from: '✕ REVISION REQUESTED',
    to: '<><i className="fa-solid fa-xmark" style={{ marginRight: 4 }}></i> REVISION REQUESTED</>'
  },
  {
    from: '✓ UPLOADED',
    to: '<><i className="fa-solid fa-check" style={{ marginRight: 4 }}></i> UPLOADED</>'
  },
  {
    from: '📄 View PDF / File',
    to: '<><i className="fa-solid fa-file-lines" style={{ marginRight: 5 }}></i> View PDF / File</>'
  },
  {
    from: 'Valid ✓',
    to: '<><i className="fa-solid fa-check" style={{ marginRight: 4, color: "#16A34A" }}></i> Valid</>'
  },
  {
    from: 'Invalid ✕',
    to: '<><i className="fa-solid fa-xmark" style={{ marginRight: 4, color: "#DC2626" }}></i> Invalid</>'
  },
  {
    from: '✓ Approve KYC & Activate Gold Badge',
    to: '<><i className="fa-solid fa-award" style={{ marginRight: 6 }}></i> Approve KYC & Activate Gold Badge</>'
  },
  {
    from: '✕ Reject & Request Revision',
    to: '<><i className="fa-solid fa-xmark" style={{ marginRight: 6 }}></i> Reject & Request Revision</>'
  },
  {
    from: 'icon="🎓"',
    to: 'icon="graduation"'
  },
  {
    from: 'icon="⚡"',
    to: 'icon="zap"'
  },
  {
    from: 'icon="📚"',
    to: 'icon="doc"'
  },
  {
    from: 'icon="📊"',
    to: 'icon="chartBar"'
  },
  {
    from: 'icon="🗒️"',
    to: 'icon="doc"'
  },
  {
    from: '✓ VERIFIED ON PROFILE',
    to: '<><i className="fa-solid fa-circle-check" style={{ marginRight: 4, color: "#16A34A" }}></i> VERIFIED ON PROFILE</>'
  },
  {
    from: '✕ REJECTED',
    to: '<><i className="fa-solid fa-circle-xmark" style={{ marginRight: 4, color: "#DC2626" }}></i> REJECTED</>'
  },
  {
    from: '<div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>',
    to: '<div style={{ fontSize: 36, marginBottom: 10, color: "#94A3B8" }}><i className="fa-solid fa-clipboard-list"></i></div>'
  },
  {
    from: '📞 {req.candidateMobile}',
    to: '<><i className="fa-solid fa-phone" style={{ marginRight: 5, color: "#64748B" }}></i> {req.candidateMobile}</>'
  },
  {
    from: '⚠️ Tab Switch ({req.proctorLogs.tabSwitches})',
    to: '<><i className="fa-solid fa-triangle-exclamation" style={{ color: "#EF4444", marginRight: 4 }}></i> Tab Switch ({req.proctorLogs.tabSwitches})</>'
  },
  {
    from: '{vState?.isValid ? "✓ Validated" : vState?.isValid === false ? "✕ Invalid" : "Pending Audit"}',
    to: '{vState?.isValid ? <span style={{ color: "#16A34A" }}><i className="fa-solid fa-check" style={{ marginRight: 4 }}></i> Validated</span> : vState?.isValid === false ? <span style={{ color: "#DC2626" }}><i className="fa-solid fa-xmark" style={{ marginRight: 4 }}></i> Invalid</span> : "Pending Audit"}'
  },
  {
    from: '✓ Approve KYC & Activate Gold Trust Badge',
    to: '<><i className="fa-solid fa-award" style={{ marginRight: 6 }}></i> Approve KYC & Activate Gold Trust Badge</>'
  },
  {
    from: '✕ Request Revision / Reject',
    to: '<><i className="fa-solid fa-xmark" style={{ marginRight: 6 }}></i> Request Revision / Reject</>'
  },
  {
    from: '🏢 {compName}',
    to: '<><i className="fa-solid fa-building" style={{ marginRight: 6, color: "#64748B" }}></i> {compName}</>'
  },
  {
    from: '· ✉️ ${app.companyEmail}',
    to: '· <i className="fa-solid fa-envelope" style={{ margin: "0 4px", color: "#64748B" }}></i> ${app.companyEmail}'
  },
  {
    from: '📅 Applied on:',
    to: '<><i className="fa-solid fa-calendar-days" style={{ marginRight: 5, color: "#64748B" }}></i> Applied on:</>'
  },
  {
    from: '{doc.verified ? "✓ Verified" : "• Attached"}',
    to: '{doc.verified ? <><i className="fa-solid fa-check" style={{ marginRight: 4, color: "#16A34A" }}></i> Verified</> : "• Attached"}'
  },
  {
    from: '✓ GOLD VERIFIED (8/8)',
    to: '<><i className="fa-solid fa-award" style={{ color: "#EAB308", marginRight: 5 }}></i> GOLD VERIFIED (8/8)</>'
  },
  {
    from: '<span>🎯 {app.jobTitle || "Job Requisition"}</span>',
    to: '<span><i className="fa-solid fa-bullseye" style={{ color: "#2563EB", marginRight: 5 }}></i> {app.jobTitle || "Job Requisition"}</span>'
  }
];

let replacedCount = 0;
for (const r of replacements) {
  if (content.includes(r.from)) {
    content = content.replace(r.from, r.to);
    replacedCount++;
  } else {
    // console.warn('Could not find exact match for:', r.from.slice(0, 40));
  }
}

console.log(`Successfully replaced ${replacedCount} patterns in StaffHub.jsx`);
fs.writeFileSync(staffHubPath, content, 'utf8');
