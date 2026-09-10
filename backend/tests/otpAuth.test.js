const request = require("supertest");
const express = require("express");
const otpRoutes = require("../routes/otp");
const { verifyWidgetAccessToken } = require("../utils/msg91Widget");

const app = express();
app.use(express.json());
app.use("/api/otp", otpRoutes);

describe("OTP Send and Verify Flow", () => {
  test("sends and verifies Email OTP successfully", async () => {
    const sendRes = await request(app)
      .post("/api/otp/send")
      .send({ email: "student.test@example.com" });

    expect(sendRes.status).toBe(200);
    expect(sendRes.body.success).toBe(true);
    expect(sendRes.body.otpCode).toBeDefined();

    const otpCode = sendRes.body.otpCode;

    const verifyRes = await request(app)
      .post("/api/otp/verify")
      .send({ email: "student.test@example.com", otp: otpCode });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.accessToken).toMatch(/^otp_token_/);

    // Verify token with verifyWidgetAccessToken
    const tokenCheck = await verifyWidgetAccessToken(verifyRes.body.accessToken);
    expect(tokenCheck.success).toBe(true);
  });

  test("rejects invalid OTP code", async () => {
    await request(app)
      .post("/api/otp/send")
      .send({ email: "wrong@example.com" });

    const verifyRes = await request(app)
      .post("/api/otp/verify")
      .send({ email: "wrong@example.com", otp: "000000" });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.message).toMatch(/Invalid OTP/i);
  });

  test("rejects send request without valid email", async () => {
    const sendRes = await request(app)
      .post("/api/otp/send")
      .send({ email: "not-an-email" });

    expect(sendRes.status).toBe(400);
    expect(sendRes.body.message).toMatch(/valid email address/i);
  });
});
