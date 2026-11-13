process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
const { isHeadOnly } = require("../middleware/academyHeadOnly");

describe("academy head-only guard", () => {
  test("blocks head-only sections for coordinators", () => {
    expect(isHeadOnly("GET", "/kyc/status")).toBe(true);
    expect(isHeadOnly("GET", "/payments")).toBe(true);
    expect(isHeadOnly("PUT", "/settings")).toBe(true);
    expect(isHeadOnly("POST", "/branches")).toBe(true);
    expect(isHeadOnly("DELETE", "/batch/ABC")).toBe(true);
  });
  test("allows branch work", () => {
    expect(isHeadOnly("GET", "/candidates")).toBe(false);
    expect(isHeadOnly("GET", "/branches")).toBe(false);
    expect(isHeadOnly("GET", "/invites")).toBe(false);
    expect(isHeadOnly("GET", "/uploads")).toBe(false);
  });
});
