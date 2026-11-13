jest.mock("../models/PlacementConfirmation", () => ({ find: jest.fn() }));
const PlacementConfirmation = require("../models/PlacementConfirmation");
const { fillExperiencedMock } = require("../utils/mockExperienced");
const { typesOf, activeType } = require("../utils/fresherToExperienced");

test("demo fill completes all 8 stages on an existing fresher account and keeps the fresher profile", async () => {
  PlacementConfirmation.find.mockReturnValue({ sort: () => ({ lean: async () => [] }) });
  const c = {
    email: "d@x.com", isNew: false, candidateType: "fresher", candidateTypes: [], completedStages: [1, 2, 3], documentVault: [],
    stage1: { fullName: "Dharsini K", mobile: "9876543210", email: "d@x.com", gender: "Female" },
    markModified() {}, toJSON() { return { candidateType: c.candidateType }; },
  };
  const score = await fillExperiencedMock(c, "d@x.com");
  expect(activeType(c)).toBe("experienced");
  expect(typesOf(c).sort()).toEqual(["experienced", "fresher"]);
  expect(c.profiles.fresher.stage1.fullName).toBe("Dharsini K");
  expect(c.experienced.completed).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(c.experienced.published).toBe(true);
  expect(c.experienced.stages[1]["personal-contact"].fullName).toBe("Dharsini K");
  expect(score.score).toBeGreaterThanOrEqual(75);
});
