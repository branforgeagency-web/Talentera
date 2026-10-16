const mongoose = require("mongoose");

// Per-company hiring-flow setup: Round-2 specialty panels, HR round owners and cutoffs.
const HiringSetupSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, unique: true },
    panels: [
      {
        name: { type: String, required: true },
        specialty: { type: String, default: "" },
        keywords: { type: String, default: "" }, // comma separated: "hcc, risk adjustment"
        isFloater: { type: Boolean, default: false }, // catches multi-skill / unmatched candidates
        members: [{ name: String, email: String }],
      },
    ],
    hrs: [
      {
        name: { type: String, required: true },
        role: { type: String, default: "" },
        city: { type: String, default: "" },
        specialty: { type: String, default: "" },
        email: { type: String, default: "" },
      },
    ],
    examCutoffPct: { type: Number, default: 65 },
    technicalCutoffPct: { type: Number, default: 60 },
    scorecardCriteria: { type: [String], default: () => ["Technical knowledge", "Coding accuracy", "Problem solving", "Communication"] },
    integrationKey: { type: String, default: "" },
    officeAddress: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HiringSetup", HiringSetupSchema);
