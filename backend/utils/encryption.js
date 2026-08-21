const crypto = require("crypto");

/**
 * AES-256-GCM helpers, ready to use for any field that needs encryption at
 * rest (e.g. a future dedicated Aadhaar-number field, if one is ever added -
 * see the note in models/Candidate.js and IMPROVEMENT_ROADMAP.md).
 *
 * Deliberately NOT wired into the Candidate schema yet: candidate.stage1 is
 * a loosely-typed Mixed blob read and destructured directly by many routes
 * (candidate.js, aadhaar.js, staff.js, academy.js, public.js), and the raw
 * 12-digit Aadhaar number is in fact never persisted there today - only
 * `maskedAadhaar` ("XXXX XXXX 1234") is saved; the real number lives only
 * transiently in aadhaarService.js's in-memory transaction map for the
 * duration of the OTP flow. Encrypting an existing Mixed field blind, with
 * no migration and no test coverage on every call site that reads it,
 * risks silently corrupting real candidate data - that needs a deliberate
 * pass, not a rushed one. This module exists so that pass doesn't also have
 * to invent the crypto primitives from scratch.
 *
 * Usage:
 *   const { encrypt, decrypt } = require("./encryption");
 *   const blob = encrypt("123456789012"); // -> "iv:authTag:ciphertext" (base64 parts)
 *   const plain = decrypt(blob);
 *
 * Requires ENCRYPTION_KEY in .env: a 32-byte key, base64 or hex encoded.
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required to use backend/utils/encryption.js. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(raw, raw.length === 64 ? "hex" : "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256). Generate a fresh one - see this file's header comment.");
  }
  return key;
}

function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV, standard for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

function decrypt(blob) {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = String(blob || "").split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted value - expected 'iv:authTag:ciphertext'.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}

module.exports = { encrypt, decrypt };
