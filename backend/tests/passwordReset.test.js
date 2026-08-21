const { generateResetOtp, verifyAndConsumeResetOtp } = require("../utils/passwordReset");

describe("passwordReset", () => {
  test("a freshly generated OTP verifies successfully", () => {
    const otp = generateResetOtp("candidate", "person@example.com");
    const result = verifyAndConsumeResetOtp("candidate", "person@example.com", otp);
    expect(result.ok).toBe(true);
  });

  test("the same OTP cannot be used twice (one-time use)", () => {
    const otp = generateResetOtp("candidate", "reuse@example.com");
    const first = verifyAndConsumeResetOtp("candidate", "reuse@example.com", otp);
    const second = verifyAndConsumeResetOtp("candidate", "reuse@example.com", otp);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });

  test("an incorrect code is rejected", () => {
    generateResetOtp("candidate", "wrongcode@example.com");
    const result = verifyAndConsumeResetOtp("candidate", "wrongcode@example.com", "000000");
    expect(result.ok).toBe(false);
  });

  test("candidate and company OTPs for the same email are independent", () => {
    const candidateOtp = generateResetOtp("candidate", "shared@example.com");
    generateResetOtp("company", "shared@example.com");

    // The candidate OTP must not verify against the company namespace -
    // this is the fix for the account-takeover bug described in
    // backend/routes/companyAuth.js's forgot-password comment.
    const crossAccountResult = verifyAndConsumeResetOtp("company", "shared@example.com", candidateOtp);
    expect(crossAccountResult.ok).toBe(false);
  });

  test("verifying with no prior request fails with a clear message", () => {
    const result = verifyAndConsumeResetOtp("candidate", "never-requested@example.com", "123456");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/no password reset/i);
  });
});
