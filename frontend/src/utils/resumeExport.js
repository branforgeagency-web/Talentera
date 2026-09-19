import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { joinUnique } from "./resumeSubtitle.js";

/**
 * Export a DOM element directly to a high-resolution A4 PDF document.
 * Avoids browser print fallback and directly saves the .pdf file.
 *
 * @param {HTMLElement} element - The DOM element containing the rendered resume
 * @param {string} candidateName - Name of the candidate for the filename
 * @returns {Promise<{ success: boolean, filename: string }>}
 */
export async function exportResumePdf(element, candidateName = "Candidate") {
  if (!element) {
    throw new Error("Resume container element not found for PDF export.");
  }

  const cleanName = (candidateName || "Candidate")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");
  const filename = `${cleanName}_Talentera_Verified_Resume.pdf`;

  // Capture element using html2canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#FFFFFF",
    windowWidth: element.scrollWidth || 1024,
    onclone: (clonedDoc) => {
      // Ensure the cloned resume paper has full opacity and visible content
      const clonedEl = clonedDoc.querySelector(".s7-resume-preview, .resume-sheet-paper");
      if (clonedEl) {
        clonedEl.style.boxShadow = "none";
        clonedEl.style.margin = "0";
      }
    },
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.98);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Add first page
  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
  heightLeft -= pdfHeight;

  // Handle multi-page resumes if height exceeds 1 A4 page
  while (heightLeft > 2) {
    position = -(imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;
  }

  pdf.save(filename);
  return { success: true, filename };
}

/**
 * Generate a beautifully formatted Microsoft Word (.doc) resume document with Word XML styling.
 *
 * @param {Object} data - Candidate details, scores, certifications, and template theme settings
 * @returns {{ success: boolean, filename: string }}
 */
export function exportResumeWord(data) {
  const {
    fullName = "Candidate",
    currentRoleTitle = "Healthcare Professional",
    expLabel = "Fresher",
    locality = "India",
    mobile = "",
    email = "",
    verificationId = "TLR-2026-VERIFIED",
    liveResumeUrl = "https://talentera.io/candidate",
    careerObjective = "",
    totalPoints = 85,
    assessmentScore = null,
    assessmentMedal = "Verified",
    videoScore = null,
    videoMedal = "Verified",
    clarityScore = 80,
    fluencyScore = 75,
    confidenceScore = 75,
    totalCharts = 0,
    overallAccuracy = 85,
    chartTier = "Bronze",
    certificationsList = [],
    academyName = "Talentera Partner Academy",
    academyLocality = "India",
    domainName = "Medical Coding",
    trainingLevel = "Professional Level",
    trainingSpecialties = "Medical Coding",
    trainingDuration = "Course Completed",
    trainingAssessmentScore = null,
    specialtyCharts = [],
    selectedPlatforms = ["Practicode", "Codivia", "3M 360 Encompass"],
    degree = "Bachelor's Degree",
    collegeName = "University",
    graduationYear = "",
    cgpa = "",
    twelfthSchool = "",
    twelfthYear = "",
    twelfthScore = "",
    preferredCities = "Bengaluru · Hyderabad · Chennai",
    relocationPref = "Preferred Locality",
    shiftPreference = "Day + US Night",
    templateId = "fresher_modern",
    headerBg = "#0F1B3D",
    accentColor = "#F5B41A",
  } = data;

  const cleanName = (fullName || "Candidate")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");
  const filename = `${cleanName}_Talentera_Resume.doc`;

  const isBw = templateId === "plain_bw";
  const primaryColor = isBw ? "#000000" : headerBg || "#0F1B3D";
  const secAccentColor = isBw ? "#333333" : accentColor || "#F5B41A";
  const lightBg = isBw ? "#F9FAFB" : "#F8FAFC";
  const borderColor = isBw ? "#111111" : "#CBD5E1";

  // Build Certifications section
  let certHtml = "";
  if (certificationsList && certificationsList.length > 0) {
    certHtml = `
      <div style="margin-top: 14pt;">
        <table style="width:100%; border-bottom: 2pt solid ${secAccentColor}; margin-bottom: 6pt;">
          <tr>
            <td style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; padding-bottom: 3pt;">
              📜 CORE CERTIFICATIONS
            </td>
          </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: 4pt;">
          ${certificationsList
            .map(
              (c) => `
            <tr>
              <td style="padding: 6pt 8pt; background-color: ${lightBg}; border: 1pt solid ${borderColor}; margin-bottom: 4pt;">
                <div style="font-size: 11pt; font-weight: bold; color: ${primaryColor};">
                  ${c.body || "AAPC"} · ${c.name || c.code || "Certified Coder"}
                </div>
                <div style="font-size: 9.5pt; color: #475569; margin-top: 2pt;">
                  Member ID: <b>${c.memberId ? `****${String(c.memberId).slice(-4)}` : "Verified Credential"}</b>
                  ${c.issueDate ? ` · Issued: ${c.issueDate}` : ""}
                  ${c.expiryDate ? ` · Valid until: ${c.expiryDate}` : ""}
                  · <span style="color: #166534; font-weight: bold;">[API-Verified]</span>
                </div>
              </td>
            </tr>
          `
            )
            .join("")}
        </table>
      </div>
    `;
  }

  // Build Live Charts table
  let chartsHtml = "";
  if (specialtyCharts && specialtyCharts.length > 0) {
    chartsHtml = `
      <div style="margin-top: 14pt;">
        <table style="width:100%; border-bottom: 2pt solid ${secAccentColor}; margin-bottom: 6pt;">
          <tr>
            <td style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; padding-bottom: 3pt;">
              💻 LIVE CHART AUDIT PRACTICE · DEPARTMENT METRICS
            </td>
          </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: 4pt; font-size: 10pt;">
          <thead>
            <tr style="background-color: ${primaryColor}; color: #FFFFFF;">
              <th style="padding: 6pt 8pt; text-align: left; border: 1pt solid ${borderColor};">Specialty</th>
              <th style="padding: 6pt 8pt; text-align: center; border: 1pt solid ${borderColor};">Charts Audited</th>
              <th style="padding: 6pt 8pt; text-align: center; border: 1pt solid ${borderColor};">Accuracy</th>
              <th style="padding: 6pt 8pt; text-align: center; border: 1pt solid ${borderColor};">Time / Chart</th>
              <th style="padding: 6pt 8pt; text-align: center; border: 1pt solid ${borderColor};">Status</th>
            </tr>
          </thead>
          <tbody>
            ${specialtyCharts
              .map(
                (sc) => `
              <tr>
                <td style="padding: 5pt 8pt; border: 1pt solid ${borderColor}; color: #1E293B;"><b>${sc.name}</b></td>
                <td style="padding: 5pt 8pt; border: 1pt solid ${borderColor}; text-align: center; color: #1E293B;">${sc.count}</td>
                <td style="padding: 5pt 8pt; border: 1pt solid ${borderColor}; text-align: center; color: #1E293B;">${sc.accuracy}%</td>
                <td style="padding: 5pt 8pt; border: 1pt solid ${borderColor}; text-align: center; color: #1E293B;">${sc.timePerChart}</td>
                <td style="padding: 5pt 8pt; border: 1pt solid ${borderColor}; text-align: center; color: #166534; font-weight: bold;">Verified</td>
              </tr>
            `
              )
              .join("")}
            <tr style="background-color: ${lightBg}; font-weight: bold;">
              <td style="padding: 6pt 8pt; border: 1pt solid ${borderColor}; color: ${primaryColor};">TOTAL PRODUCTION</td>
              <td style="padding: 6pt 8pt; border: 1pt solid ${borderColor}; text-align: center; color: ${primaryColor};">${totalCharts || specialtyCharts.reduce((a, b) => a + (b.count || 0), 0)}</td>
              <td style="padding: 6pt 8pt; border: 1pt solid ${borderColor}; text-align: center; color: ${primaryColor};">${overallAccuracy || 85}%</td>
              <td style="padding: 6pt 8pt; border: 1pt solid ${borderColor}; text-align: center; color: ${primaryColor};">5.5 min avg</td>
              <td style="padding: 6pt 8pt; border: 1pt solid ${borderColor}; text-align: center; color: #166534;">Active Log</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size: 9pt; color: #64748B; margin-top: 4pt;">
          Platforms Verified: ${Array.isArray(selectedPlatforms) ? selectedPlatforms.join(" · ") : selectedPlatforms}
        </div>
      </div>
    `;
  }

  const wordDocumentHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${fullName} - Talentera Verified Resume</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page WordSection1 {
      size: 595.3pt 841.9pt; /* A4 */
      margin: 36.0pt 45.0pt 36.0pt 45.0pt;
      mso-header-margin: 36.0pt;
      mso-footer-margin: 36.0pt;
    }
    div.WordSection1 {
      page: WordSection1;
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 10.5pt;
      color: #1E293B;
      line-height: 1.4;
    }
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div class="WordSection1">
    
    <!-- HEADER BLOCK -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 12pt; ${isBw ? `border-bottom: 2pt solid #000; padding-bottom: 8pt;` : `background-color: ${primaryColor}; border-radius: 6pt;`}">
      <tr>
        <td style="padding: ${isBw ? "4pt 0" : "14pt 16pt"}; vertical-align: middle;">
          <div style="font-size: 22pt; font-weight: bold; color: ${isBw ? "#000000" : "#FFFFFF"}; letter-spacing: -0.5pt; line-height: 1.1;">
            ${fullName.toUpperCase()}
          </div>
          <div style="font-size: 12pt; font-weight: bold; color: ${isBw ? "#333333" : secAccentColor}; margin-top: 4pt;">
            ${joinUnique(currentRoleTitle, expLabel)}
          </div>
          <div style="font-size: 9.5pt; color: ${isBw ? "#475569" : "#E2E8F0"}; margin-top: 6pt;">
            ${mobile ? `📞 ${mobile} &nbsp;|&nbsp; ` : ""}${email ? `✉ ${email} &nbsp;|&nbsp; ` : ""}📍 ${locality}
          </div>
          <div style="font-size: 9.5pt; color: ${isBw ? "#000000" : secAccentColor}; margin-top: 4pt; font-weight: bold;">
            🔗 Live Profile: <a href="${liveResumeUrl}" style="color: ${isBw ? "#000000" : "#93C5FD"};">${liveResumeUrl.replace("https://", "")}</a>
          </div>
        </td>
        <td style="padding: ${isBw ? "4pt 0" : "14pt 16pt"}; text-align: right; vertical-align: middle; width: 170pt;">
          <table style="border: 1.5pt solid ${isBw ? "#000000" : secAccentColor}; background-color: ${isBw ? "#FFFFFF" : "#FFFFFF"}; border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 6pt 10pt; text-align: center;">
                <div style="font-size: 9pt; font-weight: bold; color: ${primaryColor}; letter-spacing: 0.5pt;">
                  🛡 TALENTERA VERIFIED
                </div>
                <div style="font-size: 8.5pt; color: #475569; margin-top: 2pt; font-family: monospace;">
                  ID: ${verificationId}
                </div>
                <div style="font-size: 8pt; color: #166534; font-weight: bold; margin-top: 3pt;">
                  Score: ${totalPoints}/100 [PASSED]
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CAREER OBJECTIVE -->
    <div style="margin-top: 10pt;">
      <table style="width:100%; border-bottom: 2pt solid ${secAccentColor}; margin-bottom: 6pt;">
        <tr>
          <td style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; padding-bottom: 3pt;">
            🎯 CAREER OBJECTIVE
          </td>
        </tr>
      </table>
      <div style="padding: 8pt 10pt; background-color: ${lightBg}; border-left: 3.5pt solid ${secAccentColor}; border: 1pt solid ${borderColor}; border-left-width: 3.5pt; font-style: italic; color: #1E293B; font-size: 10pt; line-height: 1.5;">
        "${careerObjective}"
      </div>
    </div>

    <!-- TALENTERA VERIFIED SCORECARD -->
    <div style="margin-top: 14pt;">
      <table style="width:100%; border-bottom: 2pt solid ${secAccentColor}; margin-bottom: 6pt;">
        <tr>
          <td style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; padding-bottom: 3pt;">
            🏆 TALENTERA VERIFIED SCORECARD
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
        <tr>
          <td style="padding: 6pt 8pt; border: 1pt solid ${borderColor}; background-color: ${lightBg}; width: 25%;">
            <div style="color: #64748B; font-size: 8pt; text-transform: uppercase; font-weight: bold;">Foundation Assessment</div>
            <div style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; margin-top: 2pt;">
              ${assessmentMedal} Tier ${assessmentScore !== null ? `(${assessmentScore}/100)` : ""}
            </div>
            <div style="color: #166534; font-size: 8pt; font-weight: bold;">🟢 API Proctored</div>
          </td>
          <td style="padding: 6pt 8pt; border: 1pt solid ${borderColor}; background-color: ${lightBg}; width: 25%;">
            <div style="color: #64748B; font-size: 8pt; text-transform: uppercase; font-weight: bold;">AI Video Pitch</div>
            <div style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; margin-top: 2pt;">
              ${videoScore !== null ? `Video Pitch Score · ${videoScore}/100` : `${videoMedal} Tier`}
            </div>
            <div style="color: #475569; font-size: 8pt;">Clarity ${clarityScore} · Fluency ${fluencyScore} · Confidence ${confidenceScore}</div>
          </td>
          <td style="padding: 6pt 8pt; border: 1pt solid ${borderColor}; background-color: ${lightBg}; width: 25%;">
            <div style="color: #64748B; font-size: 8pt; text-transform: uppercase; font-weight: bold;">Live Chart Audit</div>
            <div style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; margin-top: 2pt;">
              ${chartTier} Tier (${totalCharts} charts)
            </div>
            <div style="color: #475569; font-size: 8pt;">${overallAccuracy}% Accuracy Verified</div>
          </td>
          <td style="padding: 6pt 8pt; border: 1.5pt solid ${secAccentColor}; background-color: ${isBw ? "#FFFFFF" : "#FFFBEB"}; width: 25%; text-align: center;">
            <div style="color: ${primaryColor}; font-size: 8.5pt; text-transform: uppercase; font-weight: bold;">Total Verification</div>
            <div style="font-size: 15pt; font-weight: bold; color: ${primaryColor}; margin-top: 2pt;">
              ${totalPoints}/100
            </div>
            <div style="color: #166534; font-size: 8pt; font-weight: bold;">100% Genuine Profile</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- CERTIFICATIONS -->
    ${certHtml}

    <!-- TRAINING FOUNDATION -->
    <div style="margin-top: 14pt;">
      <table style="width:100%; border-bottom: 2pt solid ${secAccentColor}; margin-bottom: 6pt;">
        <tr>
          <td style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; padding-bottom: 3pt;">
            🎓 TRAINING FOUNDATION
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6pt 8pt; background-color: ${lightBg}; border: 1pt solid ${borderColor};">
            <div style="font-size: 11pt; font-weight: bold; color: ${primaryColor};">
              ${academyName} (${academyLocality})
            </div>
            <div style="font-size: 10pt; color: #334155; margin-top: 2pt;">
              ${domainName} · ${trainingLevel} · ${trainingSpecialties}
            </div>
            <div style="font-size: 9pt; color: #64748B; margin-top: 2pt;">
              Duration: <b>${trainingDuration}</b>
              ${trainingAssessmentScore ? ` · Academy Score: <b>${trainingAssessmentScore}/100</b>` : ""}
              · <span style="color: #166534; font-weight: bold;">[Academy Verified]</span>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- LIVE CHARTS AUDIT -->
    ${chartsHtml}

    <!-- ACADEMIC EDUCATION -->
    <div style="margin-top: 14pt;">
      <table style="width:100%; border-bottom: 2pt solid ${secAccentColor}; margin-bottom: 6pt;">
        <tr>
          <td style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; padding-bottom: 3pt;">
            🎓 ACADEMIC EDUCATION
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
        <tr>
          <td style="padding: 6pt 8pt; background-color: ${lightBg}; border: 1pt solid ${borderColor}; width: ${twelfthSchool ? "50%" : "100%"};">
            <div style="font-size: 10.5pt; font-weight: bold; color: ${primaryColor};">
              ${degree} ${graduationYear ? `(${graduationYear})` : ""}
            </div>
            <div style="color: #334155; margin-top: 2pt;">${collegeName}</div>
            ${cgpa ? `<div style="font-size: 9pt; color: #64748B; margin-top: 2pt;">Score: <b>${cgpa}</b></div>` : ""}
          </td>
          ${
            twelfthSchool
              ? `
            <td style="padding: 6pt 8pt; background-color: ${lightBg}; border: 1pt solid ${borderColor}; width: 50%;">
              <div style="font-size: 10.5pt; font-weight: bold; color: ${primaryColor};">
                Higher Secondary (Class XII) ${twelfthYear ? `(${twelfthYear})` : ""}
              </div>
              <div style="color: #334155; margin-top: 2pt;">${twelfthSchool}</div>
              ${twelfthScore ? `<div style="font-size: 9pt; color: #64748B; margin-top: 2pt;">Score: <b>${twelfthScore}</b></div>` : ""}
            </td>
          `
              : ""
          }
        </tr>
      </table>
    </div>

    <!-- WORK PREFERENCES -->
    <div style="margin-top: 14pt;">
      <table style="width:100%; border-bottom: 2pt solid ${secAccentColor}; margin-bottom: 6pt;">
        <tr>
          <td style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; padding-bottom: 3pt;">
            📍 WORK PREFERENCES & MOBILITY
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
        <tr>
          <td style="padding: 6pt 8pt; background-color: ${lightBg}; border: 1pt solid ${borderColor};">
            <b>Target Locations:</b> ${preferredCities}<br/>
            <b>Relocation Flexibility:</b> ${relocationPref} &nbsp;|&nbsp; <b>Availability:</b> Immediate &nbsp;|&nbsp; <b>Shift Preference:</b> ${shiftPreference}
          </td>
        </tr>
      </table>
    </div>

    <!-- FOOTER / AUDIT TRAIL -->
    <div style="border-top: 1pt solid ${borderColor}; margin-top: 20pt; padding-top: 8pt; text-align: center; font-size: 8.5pt; color: #64748B;">
      <div>
        🛡 Verified Talentera Credential · Cryptographic Verification ID: <b>${verificationId}</b>
      </div>
      <div style="margin-top: 3pt;">
        Live Verification & Audit Trail: <a href="${liveResumeUrl}" style="color: #2563EB;">${liveResumeUrl}</a>
      </div>
    </div>

  </div>
</body>
</html>
  `;

  const blob = new Blob(["\ufeff", wordDocumentHtml], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, filename };
}
