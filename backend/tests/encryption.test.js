const crypto = require("crypto");

describe("encryption", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  test("decrypt(encrypt(x)) === x", () => {
    const { encrypt, decrypt } = require("../utils/encryption");
    const plaintext = "123456789012";
    const blob = encrypt(plaintext);

    expect(blob).not.toContain(plaintext); // never store the plaintext accidentally
    expect(decrypt(blob)).toBe(plaintext);
  });

  test("throws a clear error when ENCRYPTION_KEY is missing", () => {
    jest.resetModules();
    const previous = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;

    const { encrypt } = require("../utils/encryption");
    expect(() => encrypt("test")).toThrow(/ENCRYPTION_KEY/);

    process.env.ENCRYPTION_KEY = previous;
  });

  test("a malformed blob fails to decrypt rather than silently returning garbage", () => {
    jest.resetModules();
    const { decrypt } = require("../utils/encryption");
    expect(() => decrypt("not-a-valid-blob")).toThrow();
  });
});
