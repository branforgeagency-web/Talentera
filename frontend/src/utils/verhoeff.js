/**
 * Verhoeff checksum algorithm — the UIDAI checksum used in every Aadhaar number.
 * The 12th digit is mathematically derived from the first 11. We validate
 * mathematically — the same algorithm UIDAI uses internally.
 *
 * Ported verbatim from the Talentera candidate-flow prototype (real math,
 * not mocked): dihedral multiplication table (D), permutation table (P),
 * and the standard Verhoeff checksum loop.
 */

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
 * Validates a 12-digit Aadhaar number via the Verhoeff checksum.
 * Confirms the number is well-formed (correct check digit) — NOT that it
 * belongs to a real, living person. Only an actual Aadhaar document /
 * DigiLocker / UIDAI verification proves ownership.
 */
export function verhoeffValidate(num) {
  const digits = String(num).replace(/\D/g, "");
  if (digits.length !== 12) return false;
  // UIDAI rule: first digit cannot be 0 or 1
  if (digits[0] === "0" || digits[0] === "1") return false;

  let c = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][parseInt(reversed[i], 10)]];
  }
  return c === 0;
}

/** Formats a raw digit string as "XXXX XXXX XXXX" while typing. */
export function formatAadhaar(raw) {
  const digits = String(raw).replace(/\D/g, "").slice(0, 12);
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return digits.slice(0, 4) + " " + digits.slice(4);
  return digits.slice(0, 4) + " " + digits.slice(4, 8) + " " + digits.slice(8, 12);
}

/** Formats a raw digit string as "98765 43210" (Indian mobile style). */
export function formatMobile(raw) {
  const digits = String(raw).replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 5) return digits;
  return digits.slice(0, 5) + " " + digits.slice(5, 10);
}

/** Real Indian mobile number rule: 10 digits, starts with 6/7/8/9. */
export function isValidIndianMobile(raw) {
  const digits = String(raw).replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(digits);
}
