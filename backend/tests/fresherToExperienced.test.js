jest.mock("../models/PlacementConfirmation", () => ({ find: jest.fn() }));
const { buildPrefill, applyFresherPrefill, toIsoDate, addProfile, switchProfile, typesOf } = require("../utils/fresherToExperienced");
const PlacementConfirmation = require("../models/PlacementConfirmation");

const fresher = () => ({
  email: "a@b.com", mobile: "9876543210",
  stage1: { fullName: "Ananya Sharma", dob: "15/08/1998", gender: "Female", mobile: "+91 98765 43210", email: "a@b.com", isWhatsAppSame: true,
    preferredCities: ["Chennai", "Bengaluru"], qualification: "B.Sc Nursing", degree: "B.Sc", educationStream: "Nursing", collegeName: "SRM", graduationYear: "2020", cgpa: "8.1" },
  stage2: { academyName: "ThoughtFlows", academyLocation: "Chennai", course: "Medical Coding", courseName: "Medical Coding - E/M", modeOfTraining: "Classroom", startMonth: "01", startYear: "2023", endMonth: "06", endYear: "2023", totalHours: "240 hrs" },
  stage3: { certifications: [{ code: "CPC", name: "Certified Professional Coder", body: "AAPC", memberId: "884920", issueMonth: "03", issueYear: "2024", issueDate: "03/2024" }] },
  markModified() {},
});
const placed = [{ status: "confirmed", companyName: "Omega Healthcare", role: "Medical Coder", city: "Chennai", placedDate: "2025-02-10T00:00:00Z" }];

describe("fresher -> experienced prefill", () => {
  test("date helpers", () => {
    expect(toIsoDate("15/08/1998")).toBe("1998-08-15");
    expect(toIsoDate("03/2024")).toBe("2024-03-01");
  });
  test("maps identity, education, training, certs, placement", () => {
    const p = buildPrefill(fresher(), placed);
    expect(p[1]["personal-contact"]).toMatchObject({ fullName: "Ananya Sharma", dateOfBirth: "1998-08-15", gender: "Female", mobileNumber: "9876543210", email: "a@b.com" });
    expect(p[1]["current-career-status"]).toMatchObject({ currentEmploymentStatus: "Currently Employed", currentCompany: "Omega Healthcare", primaryCareerCategory: "Medical Coding", preferredWorkLocation: "Chennai, Bengaluru" });
    expect(p[2].education).toMatchObject({ highestQualification: "UG", yearOfPassing: "2020", percentageCgpa: "8.1" });
    expect(p[2]["training-applicability"].attendedAcademyTraining).toBe("Yes");
    expect(p[2]["training-academy-history"][0]).toMatchObject({ academyTrainingProvider: "ThoughtFlows", trainingMode: "Classroom", courseStartDate: "2023-01-01", courseCompletionDate: "2023-06-01" });
    expect(p[3]["current-previous-employment-entry"][0]).toMatchObject({ companyName: "Omega Healthcare", currentlyWorkingHere: "Yes", dateOfJoining: "2025-02-10" });
    expect(p[6]["add-certification"][0]).toMatchObject({ certificationCode: "CPC", issuingOrganization: "AAPC", issueDate: "2024-03-01", certificationStatus: "Active" });
  });
  test("never overwrites existing experienced answers and never marks stages complete", () => {
    const c = fresher();
    c.experienced = { stages: { 1: { "personal-contact": { fullName: "Typed Already" } } }, completed: [], uploads: [] };
    const n = applyFresherPrefill(c, placed);
    expect(n).toBeGreaterThan(5);
    expect(c.experienced.stages[1]["personal-contact"].fullName).toBe("Typed Already");
    expect(c.experienced.stages[1]["personal-contact"].mobileNumber).toBe("9876543210");
    expect(c.experienced.completed).toEqual([]);
    expect(c.experienced.prefilledFromFresher).toBe(true);
  });
  test("no fresher data -> nothing invented", () => {
    const p = buildPrefill({ email: "x@y.com", markModified() {} }, []);
    expect(p[2]["training-academy-history"]).toBeUndefined();
    expect(p[6]["add-certification"]).toBeUndefined();
  });
});

describe("two profiles on one account", () => {
  const mk = () => {
    const c = { ...fresher(), candidateType: "fresher", candidateTypes: [], completedStages: [1, 2, 3], documentVault: [{ n: 1 }], stage4: { score: 90 } };
    c.toJSON = () => ({ candidateType: c.candidateType });
    return c;
  };
  beforeEach(() => { PlacementConfirmation.find.mockReturnValue({ sort: () => ({ lean: async () => placed }) }); });

  test("adding Experienced stashes the fresher data and activates an empty, pre-filled experienced profile", async () => {
    const c = mk();
    const r = await addProfile(c, "experienced");
    expect(r.added).toBe(true);
    expect(r.prefilledFields).toBeGreaterThan(5);
    expect(c.candidateType).toBe("experienced");
    expect(typesOf(c).sort()).toEqual(["experienced", "fresher"]);
    expect(c.profiles.fresher.stage1.fullName).toBe("Ananya Sharma");
    expect(c.profiles.fresher.stage4.score).toBe(90);
    expect(c.profiles.fresher.completedStages).toEqual([1, 2, 3]);
    expect(c.stage4).toBeNull();            // fresher-only data is not visible on the experienced profile
    expect(c.completedStages).toEqual([]);
    expect(c.stage1.experience).toBe("Experienced"); // live fields mirror the pre-filled passport
    expect(c.experienced.stages[1]["personal-contact"].fullName).toBe("Ananya Sharma");
  });

  test("switching back and forth keeps both profiles intact", async () => {
    const c = mk();
    await addProfile(c, "experienced");
    c.stage1 = { ...c.stage1, currentRole: "Edited as experienced" };
    expect(switchProfile(c, "fresher")).toBe(true);
    expect(c.candidateType).toBe("fresher");
    expect(c.stage1.fullName).toBe("Ananya Sharma");
    expect(c.stage1.currentRole).not.toBe("Edited as experienced");
    expect(c.stage4.score).toBe(90);
    expect(c.completedStages).toEqual([1, 2, 3]);
    switchProfile(c, "experienced");
    expect(c.stage1.currentRole).toBe("Edited as experienced");
    expect(c.stage4).toBeNull();
  });

  test("cannot add a profile twice or switch to one that does not exist", async () => {
    const c = mk();
    expect((await addProfile(c, "fresher")).added).toBe(false);
    expect(() => switchProfile(c, "experienced")).toThrow();
  });
});
