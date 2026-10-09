// Shared helpers for "Other" options that reveal a manual text field.
// Single values:  "Other" (no text yet) or "Other: <text>".
// Multi values:   the array holds "Other" / "Other: <text>" in place of the plain chip.
export const OTHER = "Other";
const PREFIX = "Other: ";

export const isOtherVal = (v) => v === OTHER || (typeof v === "string" && v.startsWith(PREFIX));
export const otherTextOf = (v) => (typeof v === "string" && v.startsWith(PREFIX) ? v.slice(PREFIX.length) : "");
export const otherValue = (text) => (text ? `${PREFIX}${text}` : OTHER);

export const multiHasOther = (arr) => Array.isArray(arr) && arr.some(isOtherVal);
export const multiOtherText = (arr) => otherTextOf((Array.isArray(arr) ? arr : []).find(isOtherVal));
export const multiToggleOther = (arr) => {
  const list = Array.isArray(arr) ? arr : [];
  return multiHasOther(list) ? list.filter((v) => !isOtherVal(v)) : [...list, OTHER];
};
export const multiSetOther = (arr, text) => [...(Array.isArray(arr) ? arr : []).filter((v) => !isOtherVal(v)), otherValue(text)];
