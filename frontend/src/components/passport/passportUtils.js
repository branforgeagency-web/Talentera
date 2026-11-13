// Keep in sync with calculatePassportScore() in backend/utils/experiencedPassport.js
export const PASSPORT_MAX_POINTS = { 1: 15, 2: 10, 3: 25, 4: 10, 5: 10, 6: 15, 7: 10, 8: 5 };

export const isPassportCandidate = (c) => Boolean(c && c.candidateType === "experienced");
