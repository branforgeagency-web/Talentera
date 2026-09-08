const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/**
 * Validates a 12-digit Aadhaar number via UIDAI standards:
 *  1. Exactly 12 numeric digits.
 *  2. First digit cannot be '0' or '1'.
 *  3. Cannot be all identical repeating digits (e.g. 111111111111 or 999999999999).
 *  4. Satisfies UIDAI's Verhoeff checksum algorithm.
 *
 * @param {string|number} num
 * @returns {boolean}
 */
function verhoeffValidate(num) {
  const digits = String(num || "").replace(/\D/g, "");
  if (digits.length !== 12) return false;

  // UIDAI rule: first digit cannot be 0 or 1
  if (digits[0] === "0" || digits[0] === "1") return false;

  // UIDAI rule: cannot be all identical digits
  if (/^(\d)\1{11}$/.test(digits)) return false;

  let c = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][parseInt(reversed[i], 10)]];
  }
  return c === 0;
}

/**
 * Detailed validator that returns error reasons for feedback.
 * @param {string|number} num
 * @returns {{ valid: boolean, error?: string, cleanDigits: string }}
 */
function validateAadhaarNumber(num) {
  const cleanDigits = String(num || "").replace(/\D/g, "");
  if (!cleanDigits) {
    return { valid: false, error: "Aadhaar number is required.", cleanDigits };
  }
  if (cleanDigits.length !== 12) {
    return { valid: false, error: "Aadhaar number must contain exactly 12 digits.", cleanDigits };
  }
  if (cleanDigits[0] === "0" || cleanDigits[0] === "1") {
    return { valid: false, error: "Aadhaar number cannot start with 0 or 1 according to UIDAI specifications.", cleanDigits };
  }
  if (/^(\d)\1{11}$/.test(cleanDigits)) {
    return { valid: false, error: "Invalid Aadhaar number: Repeating digits are not permitted.", cleanDigits };
  }
  if (!verhoeffValidate(cleanDigits)) {
    return { valid: false, error: "Invalid Aadhaar number: Failed UIDAI Verhoeff checksum. Please provide a genuine Aadhaar number.", cleanDigits };
  }
  return { valid: true, cleanDigits };
}

module.exports = {
  verhoeffValidate,
  validateAadhaarNumber,
};
