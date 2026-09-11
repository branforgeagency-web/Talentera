const axios = require("axios");
const logger = require("./logger");

/**
 * Dispatches an email via Brevo REST API, with fallback console logger for dev environments.
 */
async function sendEmail({ to, subject, htmlContent, textContent }) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "support@talentera.in";
  const senderName = process.env.BREVO_SENDER_NAME || "Talentera Assessment Team";

  const isPlaceholderKey = !brevoApiKey || brevoApiKey.includes("your_brevo_api_key");

  if (!isPlaceholderKey) {
    try {
      logger.info(`Dispatching Brevo email to ${to}: ${subject}`);
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent,
          textContent: textContent || "",
        },
        {
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      return { success: true };
    } catch (err) {
      logger.warn(`Brevo email dispatch failed (${to}): ${err.response?.data?.message || err.message}`);
    }
  }

  // Development fallback log
  logger.info(`[DEV EMAIL DISPATCH] To: ${to} | Subject: "${subject}"`);
  return { success: true, devMode: true };
}

/**
 * Sends an assessment retake approval email to the candidate with direct login & retake link.
 */
async function sendRetakeApprovedEmail({ toEmail, candidateName, retakeUrl, employeeNotes, assessmentType }) {
  const cleanName = candidateName || "Candidate";
  const assessmentTitle = assessmentType || "Talentera AAPC / RCM Proctored Assessment";
  const subject = `Your ${assessmentTitle} Retake Request has been Approved! 🎯`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; }
          .email-container { max-width: 600px; margin: 30px auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); }
          .header { background: #0A1F3D; padding: 32px 28px; text-align: center; }
          .header h1 { color: #FAB12F; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.02em; }
          .header p { color: #E2E8F0; font-size: 13px; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 0.05em; }
          .content { padding: 32px 28px; color: #1E293B; line-height: 1.6; }
          .greeting { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 12px; }
          .badge { display: inline-block; background: #DCFCE7; color: #15803D; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; border: 1px solid #86EFAC; }
          .note-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 14px 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #92400E; }
          .btn-container { text-align: center; margin: 32px 0; }
          .retake-btn { display: inline-block; background: #FAB12F; color: #0A1F3D; text-decoration: none; padding: 15px 36px; border-radius: 12px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 14px rgba(250, 177, 47, 0.35); text-transform: uppercase; letter-spacing: 0.04em; }
          .footer { background: #F1F5F9; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>TALENTERA</h1>
            <p>Healthcare Medical Coding &amp; RCM Career Network</p>
          </div>
          <div class="content">
            <div class="greeting">Hello ${cleanName},</div>
            <div class="badge">✓ RETAKE REQUEST APPROVED</div>
            <p style="font-size: 14px; color: #334155;">
              Good news! Your request to retake the <strong>${assessmentTitle}</strong> has been reviewed and approved by our team.
            </p>
            ${
              employeeNotes
                ? `<div class="note-box"><strong>Employee Review Note:</strong> ${employeeNotes}</div>`
                : ""
            }
            <p style="font-size: 14px; color: #334155;">
              Your assessment stage has been unlocked. Click the button below to log in and proceed directly to your assessment section.
            </p>
            <div class="btn-container">
              <a href="${retakeUrl}" class="retake-btn">Login &amp; Retake Assessment →</a>
            </div>
            <p style="font-size: 12px; color: #64748B; line-height: 1.5;">
              <strong>Note:</strong> Ensure you are in a quiet environment with camera permissions enabled and avoid switching browser tabs during your test.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Talentera Healthcare RCM Network. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `Hello ${cleanName},\n\nYour request to retake the ${assessmentTitle} has been APPROVED.\n\nLogin and retake your test here: ${retakeUrl}\n\n${
    employeeNotes ? `Review Note: ${employeeNotes}\n\n` : ""
  }Best regards,\nTalentera Assessment Team`;

  return sendEmail({ to: toEmail, subject, htmlContent, textContent });
}

/**
 * Sends a notification email when a retake request is rejected.
 */
async function sendRetakeRejectedEmail({ toEmail, candidateName, employeeNotes }) {
  const cleanName = candidateName || "Candidate";
  const subject = "Update regarding your Talentera Assessment Retake Request";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; }
          .email-container { max-width: 600px; margin: 30px auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); }
          .header { background: #0A1F3D; padding: 28px; text-align: center; }
          .header h1 { color: #FAB12F; font-size: 24px; margin: 0; font-weight: 800; }
          .content { padding: 32px 28px; color: #1E293B; line-height: 1.6; }
          .badge { display: inline-block; background: #FEF2F2; color: #DC2626; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; border: 1px solid #FECACA; }
          .note-box { background: #F8FAFC; border-left: 4px solid #94A3B8; padding: 14px 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #334155; }
          .footer { background: #F1F5F9; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>TALENTERA</h1>
          </div>
          <div class="content">
            <div style="font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 12px;">Hello ${cleanName},</div>
            <div class="badge">RETAKE REQUEST REVIEWED</div>
            <p style="font-size: 14px; color: #334155;">
              Your request to retake the Talentera Assessment was reviewed by our evaluation committee. At this time, the retake request could not be approved.
            </p>
            ${
              employeeNotes
                ? `<div class="note-box"><strong>Review Details:</strong> ${employeeNotes}</div>`
                : ""
            }
            <p style="font-size: 13px; color: #64748B;">
              Your existing score remains active on your profile for employer matching. If you have questions, please reach out to our support team.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Talentera Healthcare RCM Network.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    htmlContent,
    textContent: `Hello ${cleanName},\n\nYour retake request was reviewed. Details: ${
      employeeNotes || "Request declined"
    }\n\nTalentera Team`,
  });
}

module.exports = {
  sendEmail,
  sendRetakeApprovedEmail,
  sendRetakeRejectedEmail,
};
