const mongoose = require("mongoose");

const StudentUploadSchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: String,
      default: "Academy Admin",
    },
    filename: {
      type: String,
      required: true,
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    acceptedRows: {
      type: Number,
      default: 0,
    },
    rejectedRows: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "completed",
    },
    batchCode: {
      type: String,
      default: "",
    },
    validationErrors: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentUpload", StudentUploadSchema);
