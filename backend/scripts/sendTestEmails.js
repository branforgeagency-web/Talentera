/**
 * DEV ONLY: sends one sample of every hiring email format to a test address and writes an HTML preview file for each.
 *   node scripts/sendTestEmails.js dharsin0201@gmail.com
 * Uses BREVO_API_KEY / BREVO_SENDER_EMAIL from backend/.env. Previews are saved to backend/tmp-email-previews/.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");

const to = String(process.argv[2] || "dharsin0201@gmail.com").trim();
const app = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const name = "Dharshini";
const co = "MedAxis Healthcare Solutions";
const p = (t) => `<p style="margin:0 0 12px;">${t}</p>`;
const rows = (list) => `<table style="border-collapse:collapse;margin:8px 0 14px;">${list.map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#64748B;font-size:13px;vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:6px 0;color:#0F172A;font-size:14px;font-weight:600;">${v}</td></tr>`).join("")}</table>`;
const cta = (label, url = `${app}/login`) => ({ label, url });
const hello = p(`Dear ${name},`);

const MAILS = [
  ["Exam allocated", `Exam from ${co}`, hello + p(`You have been invited to take <b>Medical Coding - Talentera Library</b>.`) + rows([["Duration", "30 minutes"], ["Deadline", "25 Nov 2026, 8:00 pm"], ["Proctoring", "Webcam on"]]) + p("You can take the exam once, so please attempt it in a quiet place with a stable connection."), cta("Open Hiring Rounds")],
  ["Cleared Round 1", `You cleared Round 1 at ${co}`, hello + p("Congratulations. You scored above the pass mark in the Round 1 assessment and move to the technical interview. The company will share the schedule shortly."), cta("View my progress")],
  ["Round 1 - not selected", `Your application update from ${co}`, hello + p("Thank you for taking the assessment. On this occasion your score was below the pass mark for this role, so we will not be moving ahead with your application. Your profile stays in the company's talent pool for future openings."), cta("Browse other jobs")],
  ["Technical interview - virtual", `Technical interview scheduled - ${co}`, hello + p(`Your technical interview with <b>${co}</b> is scheduled.`) + rows([["Interview", "Technical round - Coding Panel"], ["Date and time", "Friday, 28 November 2026, 11:00 am"], ["Mode", "Virtual (video)"], ["Meeting link", `<a href="https://zoom.us/j/0000000000" style="color:#1D4ED8;">https://zoom.us/j/0000000000</a>`], ["Instructions", "Join five minutes early with your camera on."]]), cta("Open Hiring Rounds")],
  ["Technical interview - in person", `Technical interview scheduled - ${co}`, hello + p(`Please walk in for your technical interview with <b>${co}</b>.`) + rows([["Date and time", "Friday, 28 November 2026, 11:00 am"], ["Venue", "3rd Floor, Tidel Park, Avinashi Road, Coimbatore"], ["Check-in code", "<b style='letter-spacing:2px;'>A1B2C3</b>"], ["Documents to carry", "Resume, ID proof, certificates"]]), cta("Open Hiring Rounds")],
  ["HR interview scheduled", `HR interview scheduled - ${co}`, hello + p(`You cleared the technical round. Your HR discussion is scheduled.`) + rows([["Date and time", "Monday, 1 December 2026, 3:00 pm"], ["Mode", "Virtual (video)"], ["HR contact", "Meena R"], ["Meeting link", `<a href="https://zoom.us/j/1111111111" style="color:#1D4ED8;">https://zoom.us/j/1111111111</a>`]]), cta("Open Hiring Rounds")],
  ["Technical - not selected", `Your application update from ${co}`, hello + p("Thank you for interviewing with us. After review, we will not be moving ahead with your application for this role. We appreciate your time and wish you the best."), cta("Browse other jobs")],
  ["Job offer", `Job offer from ${co}`, hello + p(`Congratulations. <b>${co}</b> is pleased to offer you the position of <b>Medical Coder</b>.`) + rows([["Annual CTC", "4.2 LPA"], ["Joining date", "15 December 2026"], ["Location", "Coimbatore"], ["Probation", "3 months"]]) + p("Please accept or decline the offer from your dashboard."), cta("View and respond to offer")],
  ["Offer accepted - company copy", `${name} accepted your offer`, p("Hello,") + p(`<b>${name}</b> has accepted the offer for <b>Medical Coder</b>. Joining date: 15 December 2026.`), cta("Open Hiring Flow", `${app}/company/hiring`)],
  ["General notice", "Account notification", hello + p("This is a sample of a general Talentera notification, using the same layout as every other email."), cta("Open Talentera")],
];

(async () => {
  const dir = path.join(__dirname, "..", "tmp-email-previews");
  fs.mkdirSync(dir, { recursive: true });
  let sent = 0, failed = 0;
  for (const [label, title, body, button] of MAILS) {
    const html = wrapEmailTemplate(title, body, { cta: button, preheader: title });
    fs.writeFileSync(path.join(dir, label.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".html"), html);
    const r = await sendTransactionalEmail({ to, toName: name, subject: `[TEST] ${title}`, html });
    console.log(`${r.sent ? "SENT   " : "FAILED "} ${label}${r.sent ? "" : " (" + r.reason + ")"}`);
    r.sent ? sent++ : failed++;
  }
  console.log(`\n${sent} sent, ${failed} failed. HTML previews: ${dir}`);
})();
