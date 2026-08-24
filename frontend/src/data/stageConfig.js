/**
 * Field definitions per stage. Field `name`s here are the source of truth
 * that both the stage forms AND the resume generator must agree on.
 *
 * The original handoff doc flags stage2/stage3 fields as "TBD - align with
 * resume reader" (see DEVELOPER_HANDOFF.md section 5, "Field-mapping
 * cleanup"). The set below is a reasonable, resume-ready starting point —
 * confirm final field names with the founder before shipping.
 */
export const STAGES = [
  {
    id: 1,
    key: "stage1",
    title: "Basic Info",
    subtitle: "Your identity, verified.",
    mandatory: true,
    skippable: false,
    fields: [
      { name: "fullName", label: "Full Name", type: "text", required: true },
      { name: "mobile", label: "Mobile Number", type: "tel", required: true },
      { name: "city", label: "City", type: "text", required: true },
      { name: "experience", label: "Years of Experience", type: "number", required: true },
      { name: "currentRole", label: "Current / Most Recent Role", type: "text", required: true },
    ],
  },
  {
    id: 2,
    key: "stage2",
    title: "Training",
    subtitle: "Academy training, confirmed by the academy.",
    mandatory: false,
    skippable: true,
    fields: [
      { name: "academyName", label: "Academy Name", type: "text", required: true },
      { name: "courseName", label: "Course / Program", type: "text", required: true },
      { name: "completionDate", label: "Completion Date", type: "date", required: true },
      { name: "durationWeeks", label: "Duration (weeks)", type: "number", required: false },
    ],
  },
  {
    id: 3,
    key: "stage3",
    title: "Certification",
    subtitle: "Industry certifications (e.g. CPC, CCS).",
    mandatory: false,
    skippable: true,
    fields: [
      { name: "certificationName", label: "Certification Name", type: "text", required: true },
      { name: "issuingBody", label: "Issuing Body", type: "text", required: true },
      { name: "certificationId", label: "Certification ID / Number", type: "text", required: false },
      { name: "issueDate", label: "Issue Date", type: "date", required: true },
    ],
  },
  {
    id: 4,
    key: "stage4",
    title: "Assessment",
    subtitle: "The key verification gate — mandatory.",
    mandatory: true,
    skippable: false,
    fields: [
      { name: "assessmentType", label: "Assessment Type", type: "text", required: true },
      { name: "score", label: "Score (%)", type: "number", required: true },
      { name: "attemptDate", label: "Attempt Date", type: "date", required: true },
    ],
    note: "UI mockup in the prototype — real proctored assessment engine is a roadmap item (handoff doc section 5).",
  },
  {
    id: 5,
    key: "stage5",
    title: "Communication + Video Interview",
    subtitle: "Live AI verbal communication & video interview — mandatory.",
    mandatory: true,
    skippable: false,
    isVideoUpload: true,
  },
  {
    id: 6,
    key: "stage6",
    title: "Live Charts",
    subtitle: "Practical charting exercise — mandatory.",
    mandatory: true,
    skippable: false,
    fields: [
      { name: "chartType", label: "Chart Type Practiced", type: "text", required: true },
      { name: "accuracyPercent", label: "Accuracy (%)", type: "number", required: true },
      { name: "completedDate", label: "Completed Date", type: "date", required: true },
    ],
    note: "UI mockup in the prototype — real live-chart practice mechanics are a roadmap item.",
  },
  {
    id: 7,
    key: "stage7",
    title: "Build Resume",
    subtitle: "Talentera generates your resume from verified data — no uploads.",
    mandatory: false,
    skippable: true,
    isResumeStage: true,
  },
  {
    id: 8,
    key: "stage8",
    title: "Track",
    subtitle: "Your employment / placement status.",
    mandatory: true,
    skippable: false,
    fields: [
      {
        name: "status",
        label: "Current Status",
        type: "select",
        required: true,
        options: ["Actively Looking", "Interviewing", "Offer Received", "Placed"],
      },
      { name: "notes", label: "Notes", type: "textarea", required: false },
    ],
  },
];

export const STAGE_POINTS = { 1: 5, 2: 15, 3: 20, 4: 25, 5: 10, 6: 10, 7: 10, 8: 5 };
