import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { joinUnique } from "./resumeSubtitle.js";
import { getMedalTier, medalBadgeHtml } from "./medalBadge.js";
import { buildResumeSkills, buildDeclarationText } from "./resumeSkills.js";

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

  // Capture element using html2canvas. While the clone is laid out we also record every
  // "do not cut here" region (text lines, images, table rows, small cards) so page breaks
  // can be placed between blocks instead of slicing through a line of text.
  const pageAspect = 297 / 210; // A4 height / width
  let blockers = [];
  let cloneHeight = 0;
  element.setAttribute("data-pdf-root", "1");
  let canvas;
  try {
    canvas = await html2canvas(element, {
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
        const root = clonedDoc.querySelector("[data-pdf-root]");
        if (root) {
          const out = collectBreakBlockers(clonedDoc, root, pageAspect);
          blockers = out.blockers;
          cloneHeight = out.height;
        }
      },
    });
  } finally {
    element.removeAttribute("data-pdf-root");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Convert blocker regions (CSS px) to canvas px and work out the page slices.
  const k = cloneHeight > 0 ? canvas.height / cloneHeight : 1;
  const regions = blockers.map(([t, b]) => [t * k, b * k]);
  const mmToPx = canvas.width / pdfWidth;
  const topMarginMm = 14;    // breathing room above the content on page 2 onwards
  const bottomMarginMm = 8;  // and below the content on every page
  const firstCap = Math.floor((pdfHeight - bottomMarginMm) * mmToPx);
  const nextCap = Math.floor((pdfHeight - topMarginMm - bottomMarginMm) * mmToPx);
  const slices = computePageSlices(canvas.height, firstCap, nextCap, regions);

  slices.forEach(([y0, y1], i) => {
    const h = Math.max(1, Math.round(y1 - y0));
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = h;
    const ctx = slice.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, Math.round(y0), canvas.width, h, 0, 0, canvas.width, h);
    if (i > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/jpeg", 0.98), "JPEG", 0, i > 0 ? topMarginMm : 0, pdfWidth, (h * pdfWidth) / canvas.width, undefined, "FAST");
  });

  pdf.save(filename);
  return { success: true, filename };
}

/**
 * Collect vertical regions [top, bottom] (CSS px, relative to root) that a page break must not cut through:
 * text line boxes, images/svg, table rows, and small bordered/filled cards.
 */
function collectBreakBlockers(doc, root, pageAspect) {
  const rootRect = root.getBoundingClientRect();
  const blockers = [];
  const add = (r) => {
    if (r.height > 1 && r.width > 1) blockers.push([r.top - rootRect.top, r.bottom - rootRect.top]);
  };

  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const range = doc.createRange();
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (!n.nodeValue || !n.nodeValue.trim()) continue;
    range.selectNodeContents(n);
    Array.from(range.getClientRects()).forEach(add);
  }

  const maxCard = rootRect.width * pageAspect * 0.4; // cards taller than 40% of a page may be split
  const view = doc.defaultView;
  root.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName;
    const r = el.getBoundingClientRect();
    if (tag === "IMG" || tag === "SVG" || tag === "CANVAS" || tag === "TR") return add(r);
    if (r.height < 16 || r.height > maxCard) return;
    const cs = view.getComputedStyle(el);
    const hasBorder = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none";
    const hasFill = cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent";
    if (hasBorder || hasFill) add(r);
  });

  return { blockers, height: rootRect.height };
}

/**
 * Decide where each PDF page starts/ends (canvas px). A page ends at the last position that
 * does not cut through a blocker; falls back to a hard cut if that would leave a page under 60% full.
 */
function computePageSlices(totalHeight, firstCap, nextCap, regions) {
  const tol = 2;
  const slices = [];
  let y = 0;
  let cap = firstCap;
  while (totalHeight - y > cap + tol) {
    const minFill = cap * 0.6;
    const limit = y + cap;
    let cut = limit;
    for (let guard = 0; guard < 200; guard++) {
      const hit = regions.find(([t, bt]) => t + tol < cut && cut < bt - tol);
      if (!hit) break;
      cut = hit[0];
      if (cut - y < minFill) {
        cut = limit; // nothing sensible to break on - hard cut
        break;
      }
    }
    slices.push([y, cut]);
    y = cut;
    cap = nextCap;
  }
  slices.push([y, totalHeight]);
  return slices;
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
    specialties = [],
    isNonCertified = false,
    city = "",
    isExperienced = false,
    workCompany = "",
    workProjectDetails = "",
    workTotalExperience = "",
    workNoticePeriod = "",
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

  // Star ratings shown on the scorecard in place of raw /100 numbers
  const starsFor = (score) => {
    const n = Math.max(0, Math.min(5, Math.round((Number(score) || 0) / 100 * 5)));
    return { count: n, display: "★".repeat(n) + "☆".repeat(5 - n) };
  };
  const assessmentStars = assessmentScore !== null ? starsFor(assessmentScore) : null;
  const chartStars = starsFor(overallAccuracy);
  const totalStars = starsFor(totalPoints).count;
  const totalStarsDisplay = starsFor(totalPoints).display;

  // Skills chips + declaration paragraph - generated from the candidate's own domain,
  // specialties and certification status (see utils/resumeSkills.js), not hand-typed.
  const resumeSkills = buildResumeSkills({ domain: domainName, specialties, certified: !isNonCertified });
  const declarationText = buildDeclarationText({ fullName, city });
  const declarationDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const skillsHtml = resumeSkills.length
    ? `
    <div style="margin-top: 14pt;">
      <table style="width:100%; border-bottom: 2pt solid ${secAccentColor}; margin-bottom: 6pt;">
        <tr>
          <td style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; padding-bottom: 3pt;">
            🛠 SKILLS
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
        <tr>
          <td style="padding: 6pt 8pt; background-color: ${lightBg}; border: 1pt solid ${borderColor};">
            ${resumeSkills.join(' &nbsp;&bull;&nbsp; ')}
          </td>
        </tr>
      </table>
    </div>`
    : "";
  const declarationHtml = `
    <div style="margin-top: 14pt;">
      <table style="width:100%; border-bottom: 2pt solid ${secAccentColor}; margin-bottom: 6pt;">
        <tr>
          <td style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; padding-bottom: 3pt;">
            🖊 DECLARATION
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
        <tr>
          <td style="padding: 6pt 8pt; background-color: ${lightBg}; border: 1pt solid ${borderColor};">
            <div style="color: #334155;">${declarationText}</div>
            <table style="width: 100%; margin-top: 10pt;">
              <tr>
                <td style="color: #64748B;">Place: ${city || locality}</td>
                <td style="text-align: right; color: #64748B;">Date: ${declarationDate}</td>
              </tr>
            </table>
            <div style="text-align: right; margin-top: 8pt; font-weight: bold; color: ${primaryColor};">${fullName}</div>
          </td>
        </tr>
      </table>
    </div>`;


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

  // Build Live Charts table (Fresher only - Experienced gets a Tools Used list instead, built below)
  let chartsHtml = "";
  if (!isExperienced && specialtyCharts && specialtyCharts.length > 0) {
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

  // Work Experience (Experienced only) - replaces Training Foundation
  let workExperienceHtml = "";
  if (isExperienced && (workCompany || workProjectDetails || workTotalExperience)) {
    workExperienceHtml = `
    <div style="margin-top: 14pt;">
      <table style="width:100%; border-bottom: 2pt solid ${secAccentColor}; margin-bottom: 6pt;">
        <tr>
          <td style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; padding-bottom: 3pt;">
            💼 WORK EXPERIENCE
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6pt 8pt; background-color: ${lightBg}; border: 1pt solid ${borderColor};">
            <div style="font-size: 11pt; font-weight: bold; color: ${primaryColor};">
              ${currentRoleTitle}${workCompany ? ` · ${workCompany}` : ""}
              ${workTotalExperience ? ` <span style="font-weight: normal; font-size: 9pt; color: #64748B;">(${workTotalExperience})</span>` : ""}
            </div>
            <div style="font-size: 9pt; color: #64748B; margin-top: 2pt;">
              ${domainName}${workNoticePeriod ? ` · Notice period: ${workNoticePeriod}` : ""}
            </div>
            ${workProjectDetails ? `<div style="font-size: 10pt; color: #334155; margin-top: 4pt;">${workProjectDetails}</div>` : ""}
          </td>
        </tr>
      </table>
    </div>`;
  }

  // Tools Used (Experienced only) - replaces the Live Chart Practice table
  let toolsUsedHtml = "";
  const toolsList = Array.isArray(selectedPlatforms) ? selectedPlatforms : (selectedPlatforms ? [selectedPlatforms] : []);
  if (isExperienced && toolsList.length > 0) {
    toolsUsedHtml = `
    <div style="margin-top: 14pt;">
      <table style="width:100%; border-bottom: 2pt solid ${secAccentColor}; margin-bottom: 6pt;">
        <tr>
          <td style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; padding-bottom: 3pt;">
            🧰 TOOLS USED
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
        <tr>
          <td style="padding: 6pt 8pt; background-color: ${lightBg}; border: 1pt solid ${borderColor};">
            ${toolsList.join(' &nbsp;&bull;&nbsp; ')}
          </td>
        </tr>
      </table>
    </div>`;
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
            🎯 ${isExperienced ? "PROFESSIONAL SUMMARY" : "CAREER OBJECTIVE"}
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
              ${["Gold", "Silver", "Bronze"].includes(assessmentMedal) ? `${assessmentMedal} Tier` : "Assessment Score"} ${assessmentStars ? `(${assessmentStars.display} ${assessmentStars.count}/5)` : ""}
            </div>
            <div style="color: #166534; font-size: 8pt; font-weight: bold;">🟢 API Proctored</div>
          </td>
          <td style="padding: 6pt 8pt; border: 1pt solid ${borderColor}; background-color: ${lightBg}; width: 25%;">
            <div style="color: #64748B; font-size: 8pt; text-transform: uppercase; font-weight: bold;">AI Video Pitch</div>
            <div style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; margin-top: 2pt;">
              ${medalBadgeHtml(getMedalTier(videoScore, videoMedal))}
            </div>
            <div style="color: #475569; font-size: 8pt;">Clarity ${clarityScore} · Fluency ${fluencyScore} · Confidence ${confidenceScore}</div>
          </td>
          <td style="padding: 6pt 8pt; border: 1pt solid ${borderColor}; background-color: ${lightBg}; width: 25%;">
            <div style="color: #64748B; font-size: 8pt; text-transform: uppercase; font-weight: bold;">Live Chart Audit</div>
            <div style="font-size: 11pt; font-weight: bold; color: ${primaryColor}; margin-top: 2pt;">
              ${chartTier} Tier (${totalCharts} charts)
            </div>
            <div style="color: #475569; font-size: 8pt;">${chartStars.display} ${chartStars.count}/5 Accuracy Verified</div>
          </td>
          <td style="padding: 6pt 8pt; border: 1.5pt solid ${secAccentColor}; background-color: ${isBw ? "#FFFFFF" : "#FFFBEB"}; width: 25%; text-align: center;">
            <div style="color: ${primaryColor}; font-size: 8.5pt; text-transform: uppercase; font-weight: bold;">Total Verification</div>
            <div style="font-size: 15pt; font-weight: bold; color: ${primaryColor}; margin-top: 2pt;">
              ${totalStarsDisplay} ${totalStars}/5
            </div>
            <div style="color: #166534; font-size: 8pt; font-weight: bold;">100% Genuine Profile</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- CERTIFICATIONS -->
    ${certHtml}

    <!-- TRAINING FOUNDATION (Fresher) / WORK EXPERIENCE (Experienced) -->
    ${isExperienced ? workExperienceHtml : `
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
              ${["Accounts Receivable", "Eligibility & Verification"].includes(domainName) ? `${domainName}${trainingLevel ? ` · Training level: ${trainingLevel}` : ""}` : `${domainName} · ${trainingLevel} · ${trainingSpecialties}`}
            </div>
            <div style="font-size: 9pt; color: #64748B; margin-top: 2pt;">
              Duration: <b>${trainingDuration}</b>
              ${trainingAssessmentScore ? ` · Academy Score: <b>${trainingAssessmentScore}/100</b>` : ""}
              · <span style="color: #166534; font-weight: bold;">[Academy Verified]</span>
            </div>
          </td>
        </tr>
      </table>
    </div>`}

    <!-- LIVE CHARTS AUDIT (Fresher) / TOOLS USED (Experienced) -->
    ${isExperienced ? toolsUsedHtml : chartsHtml}

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

    ${skillsHtml}

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

    ${declarationHtml}

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
