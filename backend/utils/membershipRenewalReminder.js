const Candidate = require("../models/Candidate");
const Notification = require("../models/Notification");
const { sendTransactionalEmail, wrapEmailTemplate } = require("./email");
const { sendWhatsAppMessage } = require("./whatsapp");
const logger = require("./logger");

const MONTH_NAMES = {
  1: "January", 2: "February", 3: "March", 4: "April",
  5: "May", 6: "June", 7: "July", 8: "August",
  9: "September", 10: "October", 11: "November", 12: "December",
  "01": "January", "02": "February", "03": "March", "04": "April",
  "05": "May", "06": "June", "07": "July", "08": "August",
  "09": "September",
};

/**
 * Check if the given expiry month and year fall exactly in the 1-month-prior reminder window.
 * e.g., if now is Oct 2026, a cert expiring in Nov 2026 is exactly 1 month away.
 */
function isExpiringInOneMonth(expiryMonth, expiryYear, refDate = new Date()) {
  const expM = Number(expiryMonth);
  const expY = Number(expiryYear);
  if (!expM || !expY || isNaN(expM) || isNaN(expY) || expM < 1 || expM > 12) {
    return false;
  }

  const nowY = refDate.getFullYear();
  const nowM = refDate.getMonth() + 1; // 1-12

  // Month difference calculation
  const monthDiff = (expY - nowY) * 12 + (expM - nowM);

  // Exact 1 month prior: monthDiff === 1
  if (monthDiff === 1) {
    return true;
  }

  // Also check day difference (20 to 35 days remaining before the 1st of the expiry month)
  const expiryDateObj = new Date(Date.UTC(expY, expM - 1, 1));
  const diffDays = Math.ceil((expiryDateObj.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= 15 && diffDays <= 35) {
    return true;
  }

  return false;
}

/**
 * Dispatch multi-channel renewal reminder (Email + WhatsApp + In-App notification) to candidate.
 */
async function dispatchRenewalReminder(candidate, certInfo) {
  const candidateName = candidate.stage1?.fullName || candidate.fullName || (candidate.email ? candidate.email.split("@")[0] : "Candidate");
  const email = candidate.email;
  const mobile = candidate.stage1?.mobile || candidate.mobile || "";

  const certName = certInfo.certName || certInfo.name || "AAPC Certified Professional Coder";
  const certCode = certInfo.certCode || certInfo.code || "CPC";
  const memberId = certInfo.memberId || "";
  const expiryMonth = certInfo.expiryMonth || "";
  const expiryYear = certInfo.expiryYear || "";
  const monthName = MONTH_NAMES[expiryMonth] || `Month ${expiryMonth}`;
  const renewalUrl = "https://www.aapc.com/membership/renew.aspx";

  logger.info(`[RENEWAL REMINDER] Dispatching 1-month renewal alert to ${candidateName} (${email}, ${mobile}) for ${certCode} expiring ${monthName} ${expiryYear}`);

  // 1. Transactional Email via Brevo
  const emailHtml = wrapEmailTemplate(
    `Action Required: Your AAPC Membership & Credential Renews in 1 Month`,
    `
      <p style="color: #475569; font-size: 15px; line-height: 1.5; margin-top: 0;">
        Dear <strong>${candidateName}</strong>,
      </p>
      <p style="color: #475569; font-size: 14.5px; line-height: 1.5;">
        This is an official reminder that your <strong>AAPC Membership &amp; Credential</strong> is due for renewal in <strong>1 month (${monthName} ${expiryYear})</strong>.
      </p>
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px; margin: 18px 0;">
        <p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>Certification:</strong> ${certName} (${certCode})</p>
        ${memberId ? `<p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>Member / License ID:</strong> <code style="background:#E2E8F0;padding:2px 6px;border-radius:4px;">${memberId}</code></p>` : ""}
        <p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>Issuing Authority:</strong> AAPC (American Academy of Professional Coders)</p>
        <p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>Expiry Window:</strong> <span style="color: #B91C1C; font-weight: 700;">${monthName} ${expiryYear} (1 Month Remaining)</span></p>
        <p style="margin: 0; font-size: 13.5px; color: #0F172A;"><strong>Official Renewal Portal:</strong> <a href="${renewalUrl}" target="_blank" style="color: #1D4ED8; font-weight: 700;">${renewalUrl}</a></p>
      </div>
      <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 13px; color: #1E40AF; line-height: 1.5;">
          💡 <strong>Why timely renewal matters:</strong> Keeping your AAPC membership active preserves your verified credential badge on Talentera, maintains your active standing in employer searches, and safeguards your CEU compliance.
        </p>
      </div>
      <p style="margin: 24px 0 16px; text-align: center;">
        <a href="${renewalUrl}" target="_blank" style="display: inline-block; background-color: #0A1F3D; color: #ffffff; padding: 12px 26px; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 8px;">
          Renew Membership on Official AAPC Portal &rarr;
        </a>
      </p>
      <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
        Once renewed with AAPC, log in to your Talentera dashboard and update your expiry year in <strong>Stage 03 (Certification)</strong> to maintain your continuous verified status.
      </p>
    `
  );

  let emailSent = false;
  try {
    const res = await sendTransactionalEmail({
      to: email,
      toName: candidateName,
      subject: `Action Required: Your AAPC Membership & Credential (${certCode}) Renews in 1 Month`,
      html: emailHtml,
    });
    emailSent = res.sent;
  } catch (err) {
    logger.warn(`Renewal reminder email failed for ${email}: ${err.message}`);
  }

  // 2. WhatsApp Notification (with automatic SMS fallback)
  let whatsappSent = false;
  if (mobile) {
    const whatsappMessage = `Dear ${candidateName},\n\n🔔 *AAPC Membership Renewal Reminder*\nYour AAPC membership & certification (*${certCode}*${memberId ? ` · ID: ${memberId}` : ""}) is due for renewal in *1 month (${monthName} ${expiryYear})*.\n\nTo keep your credential active and maintain your verified badge on Talentera, please renew your membership on the official AAPC portal:\nhttps://www.aapc.com/membership/renew.aspx\n\nAfter renewing, update your certification expiry date in your Talentera dashboard.\n- Talentera Credential Verification Team`;

    try {
      const waRes = await sendWhatsAppMessage({
        mobile,
        message: whatsappMessage,
        candidateName,
      });
      whatsappSent = waRes.sent;
    } catch (err) {
      logger.warn(`Renewal reminder WhatsApp failed for ${mobile}: ${err.message}`);
    }
  }

  // 3. In-App Notification (Candidate Notification Bell)
  const mongoose = require("mongoose");
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await Notification.create({
        recipientType: "candidate",
        recipientId: String(candidate._id),
        title: `AAPC Renewal Reminder 🔔 (${certCode})`,
        message: `Your ${certName} (${certCode}) is expiring in 1 month (${monthName} ${expiryYear}). Please renew your membership with AAPC to maintain your active verified standing.`,
        type: "certification_renewal_due",
        meta: {
          source: "system_scheduler",
          certCode,
          certName,
          expiryMonth,
          expiryYear,
          actionUrl: "/wizard?stage=3",
          actionLabel: "View Certification",
        },
      });
    } catch (err) {
      logger.warn(`Renewal in-app notification create failed: ${err.message}`);
    }
  }

  return { emailSent, whatsappSent };
}

/**
 * Scan all candidates and dispatch renewal reminders to any whose AAPC certification expires in 1 month.
 */
async function checkAndSendRenewalReminders(refDate = new Date()) {
  try {
    logger.info(`[RENEWAL SCAN] Checking candidate certifications expiring in 1 month (Reference date: ${refDate.toISOString().slice(0, 10)})...`);

    // Find candidates who have filled Stage 3 with active certifications
    const candidates = await Candidate.find({
      "stage3.certStatus": { $ne: "non-certified" },
      $or: [
        { "stage3.expiryMonth": { $exists: true, $ne: "" } },
        { "stage3.expiryDate": { $exists: true, $ne: "" } },
        { "stage3.certifications.0": { $exists: true } },
      ],
    });

    let checked = 0;
    let sentCount = 0;

    for (const candidate of candidates) {
      const s3 = candidate.stage3 || {};
      if (s3.nonCertified === true) continue;

      const certs = Array.isArray(s3.certifications) && s3.certifications.length > 0
        ? s3.certifications
        : [s3];

      for (const cert of certs) {
        checked++;
        let expMonth = cert.expiryMonth || s3.expiryMonth || "";
        let expYear = cert.expiryYear || s3.expiryYear || "";

        // If formatted as MM/YYYY in expiryDate
        if ((!expMonth || !expYear) && (cert.expiryDate || s3.expiryDate)) {
          const raw = String(cert.expiryDate || s3.expiryDate).trim();
          if (raw.includes("/")) {
            const parts = raw.split("/");
            expMonth = parts[0];
            expYear = parts[1];
          } else if (raw.includes("-")) {
            const parts = raw.split("-");
            expYear = parts[0];
            expMonth = parts[1];
          }
        }

        if (!expMonth || !expYear) continue;

        // Check if expiring in 1 month
        if (isExpiringInOneMonth(expMonth, expYear, refDate)) {
          const cycleKey = `${String(cert.code || cert.certCode || "CPC").toUpperCase()}_${String(expMonth).padStart(2, "0")}_${expYear}`;

          // Don't duplicate if already sent for this certificate and renewal cycle
          const sentCycles = s3.renewalReminderSentCycles || [];
          if (sentCycles.includes(cycleKey)) {
            continue;
          }

          const certInfo = {
            certName: cert.name || cert.certName || s3.certName || "Certified Professional Coder",
            certCode: (cert.code || cert.certCode || s3.certCode || "CPC").toUpperCase(),
            memberId: cert.memberId || s3.memberId || "",
            expiryMonth: String(expMonth).padStart(2, "0"),
            expiryYear: String(expYear),
          };

          await dispatchRenewalReminder(candidate, certInfo);
          sentCount++;

          // Record cycle on candidate record so it's not repeatedly dispatched
          s3.renewalReminderSentCycles = [...sentCycles, cycleKey];
          s3.renewalReminderSentAt = new Date();
          candidate.markModified("stage3");
          await candidate.save();
        }
      }
    }

    logger.info(`[RENEWAL SCAN COMPLETED] Checked ${checked} certifications, dispatched ${sentCount} 1-month renewal reminders.`);
    return { checked, sent: sentCount };
  } catch (err) {
    logger.error(`Error in checkAndSendRenewalReminders: ${err.message}`);
    return { error: err.message };
  }
}

/**
 * Initialize daily recurring scheduler for membership renewal alerts.
 */
function initMembershipRenewalScheduler() {
  // Run once shortly after server startup (10 seconds delay)
  setTimeout(() => {
    checkAndSendRenewalReminders().catch((err) => {
      logger.warn(`Startup renewal check failed: ${err.message}`);
    });
  }, 10000);

  // Run daily every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    checkAndSendRenewalReminders().catch((err) => {
      logger.warn(`Daily renewal check failed: ${err.message}`);
    });
  }, TWENTY_FOUR_HOURS).unref();

  logger.info("[RENEWAL SCHEDULER] Daily AAPC membership 1-month renewal reminder service initialized.");
}

module.exports = {
  isExpiringInOneMonth,
  dispatchRenewalReminder,
  checkAndSendRenewalReminders,
  initMembershipRenewalScheduler,
};
