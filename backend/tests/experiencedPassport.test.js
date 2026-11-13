const P = require("../utils/experiencedPassport");
const { calculateVerificationScore } = require("../utils/verificationScore");

const DOCS = { aadhaarCard: { url: "u1", name: "a" }, panCard: { url: "u1", name: "p" }, updatedResume: { url: "u1", name: "resume.pdf" }, provisionalCertificate: { url: "u1", name: "c" }, currentOfferLetter: { url: "u1", name: "o" }, previousRelievingLetter: { url: "u1", name: "r" } };
const s1 = () => P.normalizeStage(1, {
  "upload-your-documents": { aadhaarNumber: "234567890009", panNumber: "abcde1234f", documents: DOCS },
  "personal-contact": { fullName: "A B", dateOfBirth: "1995-01-01", gender: "Female", mobileNumber: "9876543210", email: "a@b.com", governmentIdType: "Aadhaar", isGovtIdVerified: "Yes" },
  "current-career-status": { currentEmploymentStatus: "Currently Employed", currentCompany: "X", currentDesignation: "Coder", primaryCareerCategory: "Medical Coding", careerAvailability: "Actively Looking", noticePeriod: "Yes", noticePeriodDays: "30", preferredWorkLocation: "Chennai, Pune", preferredWorkMode: "Hybrid" },
}, [{ url: "u1" }]);
const emp = (list) => P.normalizeStage(3, { "current-previous-employment-entry": list });

describe("experienced passport", () => {
  test("stage 1 requires fields, accepts a complete form", () => {
    expect(P.validateStage(1, P.normalizeStage(1, {})).length).toBeGreaterThan(5);
    expect(P.validateStage(1, s1())).toEqual([]);
  });
  test("Aadhaar / PAN are validated, then stored masked; missing docs are reported", () => {
    const d = s1();
    d["upload-your-documents"].aadhaarNumber = "123456789012";
    expect(P.validateStage(1, d).join(" ")).toMatch(/Aadhaar/);
    const ok = s1();
    expect(P.validateStage(1, ok)).toEqual([]);
    P.maskSensitive(1, ok);
    expect(ok["upload-your-documents"].aadhaarNumber).toBe("XXXX XXXX 0009");
    expect(ok["upload-your-documents"].panNumber).toBe("XXXXX1234F");
    expect(P.validateStage(1, ok)).toEqual([]); // masked values re-save cleanly
    const none = s1();
    none["upload-your-documents"].documents = {};
    expect(P.validateStage(1, none).join(" ")).toMatch(/Upload your Aadhaar Card/);
    none["upload-your-documents"].noPreviousCompany = "Yes";
    expect(P.validateStage(1, none).join(" ")).not.toMatch(/Relieving/);
  });
  test("Aadhaar needs DigiLocker verification; the client cannot fake or change it", () => {
    const d = s1();
    d["personal-contact"].governmentIdType = "Passport"; // anything else is forced to Aadhaar
    d["personal-contact"].isGovtIdVerified = "Yes"; // spoof attempt
    P.enforceIdLock(1, d, undefined);
    expect(d["personal-contact"].isGovtIdVerified).toBe("");
    expect(d["personal-contact"].governmentIdType).toBe("Aadhaar");
    expect(P.validateStage(1, d).join(" ")).toMatch(/DigiLocker/);
    const stored = { "personal-contact": { fullName: "Real Name", dateOfBirth: "1990-02-02", gender: "Male", governmentIdType: "Aadhaar", governmentIdNumber: "XXXX XXXX 0009", isGovtIdVerified: "Yes", maskedGovtId: "XXXX XXXX 0009" }, "upload-your-documents": { aadhaarNumber: "XXXX XXXX 0009" } };
    const e = s1();
    e["personal-contact"].fullName = "Someone Else";
    P.enforceIdLock(1, e, stored);
    expect(e["personal-contact"].fullName).toBe("Real Name");
    expect(e["personal-contact"].isGovtIdVerified).toBe("Yes");
    expect(P.validateStage(1, e).join(" ")).not.toMatch(/DigiLocker/);
  });
  test("notice period: Yes/No, and Yes needs a number of days", () => {
    const d = s1();
    d["current-career-status"].noticePeriod = "";
    expect(P.validateStage(1, d).join(" ")).toMatch(/notice period/i);
    d["current-career-status"].noticePeriod = "Yes";
    d["current-career-status"].noticePeriodDays = "";
    expect(P.validateStage(1, d).join(" ")).toMatch(/how many days/i);
    d["current-career-status"].noticePeriodDays = "400";
    expect(P.validateStage(1, d).join(" ")).toMatch(/1 and 365/);
    d["current-career-status"].noticePeriodDays = "45";
    expect(P.validateStage(1, d)).toEqual([]);
    d["current-career-status"].noticePeriod = "No";
    d["current-career-status"].noticePeriodDays = "";
    expect(P.validateStage(1, d)).toEqual([]);
  });
  test("academy training is optional / Not Applicable", () => {
    const edu = { education: { highestQualification: "UG", degreeCourse: "B.Com", collegeName: "X College", yearOfPassing: "2016" } };
    expect(P.validateStage(2, P.normalizeStage(2, edu))).toEqual([]); // no training at all is fine
    const na = P.normalizeStage(2, { ...edu, "training-applicability": { attendedAcademyTraining: "Not Applicable" }, "training-academy-history": [{ courseName: "ignored" }] });
    expect(na["training-academy-history"]).toEqual([]);
    expect(P.validateStage(2, na)).toEqual([]);
    const yes = P.normalizeStage(2, { ...edu, "training-applicability": { attendedAcademyTraining: "Yes" } });
    expect(P.validateStage(2, yes).join(" ")).toMatch(/Not Applicable/);
  });
  test("rejects underage and bad mobile", () => {
    const d = s1();
    d["personal-contact"].dateOfBirth = "2015-01-01";
    d["personal-contact"].mobileNumber = "12345";
    expect(P.validateStage(1, d).join(" ")).toMatch(/18 years/);
    expect(P.validateStage(1, d).join(" ")).toMatch(/mobile/i);
  });
  test("employment: needs an entry, date order, single current job", () => {
    expect(P.validateStage(3, emp([]))[0]).toMatch(/at least one/);
    const bad = emp([{ companyName: "A", designation: "x", employmentType: "Full-time", dateOfJoining: "2022-01-01", lastWorkingDate: "2020-01-01", currentlyWorkingHere: "No" }]);
    expect(P.validateStage(3, bad)[0]).toMatch(/before the Date of Joining/);
    const two = emp([1, 2].map((i) => ({ companyName: "C" + i, designation: "x", employmentType: "Full-time", dateOfJoining: "2020-01-01", currentlyWorkingHere: "Yes" })));
    expect(P.validateStage(3, two).join(" ")).toMatch(/Only one/);
  });
  test("experience merges overlapping jobs once", () => {
    const x = P.calcExperience([
      { dateOfJoining: "2018-01-01", lastWorkingDate: "2020-01-01", currentlyWorkingHere: "No", designation: "Medical Coder" },
      { dateOfJoining: "2019-01-01", lastWorkingDate: "2021-01-01", currentlyWorkingHere: "No", designation: "Medical Coder" },
    ]);
    expect(x.totalMonths).toBe(36);
  });
  test("file refs not issued by the server are dropped", () => {
    const d = P.normalizeStage(7, { "career-documents": { latestResume: { url: "http://evil", name: "x" } } }, []);
    expect(d["career-documents"].latestResume).toBeUndefined();
    const ok = P.normalizeStage(7, { "career-documents": { latestResume: { url: "u1", name: "x" } } }, [{ url: "u1" }]);
    expect(ok["career-documents"].latestResume.url).toBe("u1");
  });
  test("score comes from the passport and never exceeds 100", () => {
    const cand = { candidateType: "experienced", stage1: {}, experienced: { stages: { 1: s1() }, completed: [1], uploads: [] }, completedStages: [1] };
    const r = calculateVerificationScore([1], cand);
    expect(r.score).toBe(15);
    expect(r.score).toBeLessThanOrEqual(100);
  });
  test("stage 2 accepts training duration", () => {
    const withTraining = P.normalizeStage(2, {
      education: { highestQualification: "UG", degreeCourse: "B.Sc", collegeName: "College", yearOfPassing: "2020" },
      "training-academy-history": [{ academyTrainingProvider: "Apex", courseName: "Coding", trainingDuration: "6 months" }],
    });
    expect(withTraining["training-academy-history"][0].trainingDuration).toBe("6 months");
    expect(P.validateStage(2, withTraining)).toEqual([]);
  });
  test("stage 3 employment career gap requires duration and reason when Yes, clears when No", () => {
    const valid = emp([{
      companyName: "A", designation: "x", employmentType: "Full-time", dateOfJoining: "2020-01-01", currentlyWorkingHere: "Yes",
      hasCareerGap: "Yes", careerGapDuration: "6 months", careerGapReason: "Higher studies",
    }]);
    expect(P.validateStage(3, valid)).toEqual([]);

    const missing = emp([{
      companyName: "A", designation: "x", employmentType: "Full-time", dateOfJoining: "2020-01-01", currentlyWorkingHere: "Yes",
      hasCareerGap: "Yes", careerGapDuration: "", careerGapReason: "",
    }]);
    expect(P.validateStage(3, missing).join(" ")).toMatch(/Exact Gap Duration is required/);
    expect(P.validateStage(3, missing).join(" ")).toMatch(/Reason for Career Gap is required/);

    const noGap = emp([{
      companyName: "A", designation: "x", employmentType: "Full-time", dateOfJoining: "2020-01-01", currentlyWorkingHere: "Yes",
      hasCareerGap: "No", careerGapDuration: "6 months", careerGapReason: "Higher studies",
    }]);
    expect(noGap["current-previous-employment-entry"][0].careerGapDuration).toBe("");
    expect(noGap["current-previous-employment-entry"][0].careerGapReason).toBe("");
    expect(P.validateStage(3, noGap)).toEqual([]);
  });
  test("stage 4 accepts previous/current domain", () => {
    const s4 = P.normalizeStage(4, {
      domains: ["Medical Coding"],
      "technical-expertise": {
        primaryDomain: "Medical Coding",
        usHealthcareExperience: "Yes",
        previousCurrentDomain: "Current: Medical Coding · Previous: AR Calling",
      },
    });
    expect(s4["technical-expertise"].previousCurrentDomain).toBe("Current: Medical Coding · Previous: AR Calling");
    expect(P.validateStage(4, s4)).toEqual([]);
  });
});
