const mongoose = require("mongoose");

const CollegeBulkUploadSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
      index: true,
    },
    batchName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: String,
      default: "Placement Officer",
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    validRows: {
      type: Number,
      default: 0,
    },
    duplicateRows: {
      type: Number,
      default: 0,
    },
    errorRows: {
      type: Number,
      default: 0,
    },
    errorsSummary: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    status: {
      type: String,
      enum: ["PROCESSING", "COMPLETED", "FAILED"],
      default: "PROCESSING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CollegeBulkUpload", CollegeBulkUploadSchema);
