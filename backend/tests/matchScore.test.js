const { scoreMatch } = require("../utils/matchScore");

const jd = { level: "Fresher only", certs: ["CPC"], location: "Coimbatore", specialties: ["Medical Coding"], workmode: "Onsite" };
const strong = { stage1: { city: "Coimbatore" }, stage3: { certName: "AAPC CPC" }, stage4: { foundationScore: 92 }, rcmDomainSelection: { primaryDomain: "Medical Coding" } };
const weak = { stage1: { city: "Chennai" }, stage3: { skipped: true }, stage4: { foundationScore: 40 }, stage2: { domain: "Pharmacy" } };

test("strong candidate scores much higher than a weak one, with a full breakdown", () => {
  const a = scoreMatch({ jd, candidate: strong, verificationScore: 90 });
  const b = scoreMatch({ jd, candidate: weak, verificationScore: 30 });
  expect(a.score).toBeGreaterThan(85);
  expect(b.score).toBeLessThan(35);
  expect(a.breakdown.map((x) => x.key)).toEqual(["cert", "specialty", "assessment", "location", "verification", "level"]);
  expect(a.breakdown.reduce((n, x) => n + x.max, 0)).toBe(100);
  expect(a.score).toBeLessThanOrEqual(99);
});

test("remote jobs ignore location; missing JD fields are neutral not punishing", () => {
  const r = scoreMatch({ jd: { ...jd, workmode: "Remote" }, candidate: weak, verificationScore: 0 });
  expect(r.breakdown.find((x) => x.key === "location").points).toBe(15);
  const open = scoreMatch({ jd: {}, candidate: strong, verificationScore: 0 });
  expect(open.breakdown.find((x) => x.key === "specialty").points).toBe(10);
});

test("experienced candidates are scored on certification verification instead of assessment", () => {
  const r = scoreMatch({ jd: { level: "Experienced only" }, candidate: { stage1: {}, stage3: { certName: "CPC", certStatus: "verified" } }, verificationScore: 50, experiencedCandidate: true });
  expect(r.breakdown.find((x) => x.key === "assessment").points).toBe(20);
});
