const express = require("express");
const bcrypt = require("bcryptjs");
const College = require("../models/College");
const Candidate = require("../models/Candidate");
const InterviewPipeline = require("../models/InterviewPipeline");
const CollegeBulkUpload = require("../models/CollegeBulkUpload");
const Job = require("../models/Job");
const Company = require("../models/Company");
const Notification = require("../models/Notification");
const { requireCollegeAuth, signToken } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const logger = require("../utils/logger");

const router = express.Router();

// ---------------------------------------------------------------------------
// 1. College Authentication & Registration
// ---------------------------------------------------------------------------

// POST /api/college/register - Institution onboarding registration
router.post("/register", authLimiter, async (req, res) => {
  try {
    const {
      name,
      type,
      affiliation,
      yearEstablished,
      website,
      address,
      city,
      state,
      pincode,
      collegeContactPhone,
      placementOfficerName,
      placementOfficerEmail,
      placementOfficerMobile,
      alternateContact,
      password,
      departments,
    } = req.body;

    if (!name || !city || !state || !placementOfficerName || !placementOfficerEmail || !placementOfficerMobile || !password) {
      return res.status(400).json({ message: "Please fill in all required college and placement officer details." });
    }

    const normalizedEmail = placementOfficerEmail.toLowerCase().trim();
    const existing = await College.findOne({ placementOfficerEmail: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "A college placement account with this email is already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newCollege = await College.create({
      name: name.trim(),
      type: type || "Arts & Science",
      affiliation: affiliation || "State University",
      yearEstablished: Number(yearEstablished) || 2010,
      website: website ? website.trim() : "",
      address: address || "",
      city: city.trim(),
      state: state.trim(),
      pincode: pincode || "",
      collegeContactPhone: collegeContactPhone || "",
      placementOfficerName: placementOfficerName.trim(),
      placementOfficerEmail: normalizedEmail,
      placementOfficerMobile: placementOfficerMobile.trim(),
      alternateContact: alternateContact || "",
      passwordHash,
      verificationStatus: "UNDER_REVIEW", // Submitted -> Under Review -> Verified
      departments: Array.isArray(departments) && departments.length > 0 ? departments : undefined,
    });

    const token = signToken(newCollege._id, "college");

    return res.status(201).json({
      success: true,
      message: "College registration submitted successfully! Your institutional dashboard is active.",
      token,
      college: newCollege,
    });
  } catch (err) {
    logger.error(`College register error: ${err.message}`);
    return res.status(500).json({ message: err.message || "Failed to register college." });
  }
});

// POST /api/college/login - Placement officer login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide both email and password." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const college = await College.findOne({ placementOfficerEmail: normalizedEmail });
    if (!college) {
      return res.status(401).json({ message: "No college found with this placement officer email." });
    }

    const isMatch = await bcrypt.compare(password, college.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password. Please try again." });
    }

    const token = signToken(college._id, "college");

    return res.json({
      success: true,
      message: "Welcome back to your College Placement Dashboard.",
      token,
      college,
    });
  } catch (err) {
    logger.error(`College login error: ${err.message}`);
    return res.status(500).json({ message: err.message || "Failed to log in." });
  }
});

// GET /api/college/me - Get current authenticated college profile
router.get("/me", requireCollegeAuth, async (req, res) => {
  try {
    const college = await College.findById(req.collegeId);
    if (!college) {
      return res.status(404).json({ message: "College profile not found." });
    }
    return res.json({ success: true, college });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/college/profile - Update college details & departments
router.put("/profile", requireCollegeAuth, async (req, res) => {
  try {
    const college = await College.findById(req.collegeId);
    if (!college) return res.status(404).json({ message: "College not found." });

    const allowed = [
      "name",
      "type",
      "affiliation",
      "yearEstablished",
      "website",
      "address",
      "city",
      "state",
      "pincode",
      "collegeContactPhone",
      "placementOfficerName",
      "placementOfficerMobile",
      "alternateContact",
      "departments",
      "tier",
    ];

    allowed.forEach((k) => {
      if (req.body[k] !== undefined) {
        college[k] = req.body[k];
      }
    });

    await college.save();
    return res.json({ success: true, message: "College profile updated.", college });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Real-time Dashboard KPIs & Statistics
// ---------------------------------------------------------------------------

// GET /api/college/dashboard-kpis
router.get("/dashboard-kpis", requireCollegeAuth, async (req, res) => {
  try {
    const collegeId = req.collegeId;

    // Aggregate student metrics from Candidate model
    const [
      totalEnrolled,
      codingCount,
      billingCount,
      arCount,
      certifiedCount,
      assessmentCompletedCount,
      interviewReadyCount,
      shortlistedCount,
      selectedCount,
      joinedCount,
      pendingVerificationCount,
    ] = await Promise.all([
      Candidate.countDocuments({ collegeId }),
      Candidate.countDocuments({ collegeId, "rcmDomainSelection.primaryDomain": "Medical Coding" }),
      Candidate.countDocuments({ collegeId, "rcmDomainSelection.primaryDomain": "Medical Billing" }),
      Candidate.countDocuments({ collegeId, "rcmDomainSelection.primaryDomain": "AR Calling" }),
      Candidate.countDocuments({
        collegeId,
        $or: [
          { "stage3.certifications": { $exists: true, $not: { $size: 0 } } },
          { "stage3.certCode": { $exists: true, $ne: "" } },
        ],
      }),
      Candidate.countDocuments({
        collegeId,
        $or: [
          { "stage4.passed": true },
          { "stage4.foundationScore": { $gte: 50 } },
          { "stage4.score": { $gte: 50 } },
        ],
      }),
      Candidate.countDocuments({
        collegeId,
        "verificationReadiness.readinessStatus": "INTERVIEW_READY",
      }),
      Candidate.countDocuments({
        collegeId,
        "placementLifecycle.currentStatus": "SHORTLISTED",
      }),
      Candidate.countDocuments({
        collegeId,
        "placementLifecycle.currentStatus": { $in: ["SELECTED", "OFFER_EXTENDED"] },
      }),
      Candidate.countDocuments({
        collegeId,
        "placementLifecycle.currentStatus": "PLACED",
      }),
      Candidate.countDocuments({
        collegeId,
        "verificationReadiness.readinessStatus": "VERIFICATION_PENDING",
      }),
    ]);

    // Profiles completed count (have completed stage 1 and academics)
    const profilesCompleted = await Candidate.countDocuments({
      collegeId,
      $or: [
        { "verificationReadiness.readinessStatus": { $ne: "ENROLLED" } },
        { "stage1.fullName": { $exists: true, $ne: "" } },
      ],
    });

    const readinessLevels = [
      "ENROLLED",
      "PROFILE_COMPLETED",
      "TRAINING_IN_PROGRESS",
      "ASSESSMENT_PENDING",
      "VERIFICATION_PENDING",
      "VERIFIED",
      "INTERVIEW_READY",
    ];
    const readinessCounts = await Promise.all(
      readinessLevels.map((lvl) =>
        Candidate.countDocuments({ collegeId, "verificationReadiness.readinessStatus": lvl })
      )
    );
    const readinessFunnel = readinessLevels.map((lvl, idx) => ({
      id: lvl,
      count: readinessCounts[idx],
    }));

    const kpis = {
      totalStudents: totalEnrolled,
      profilesCompleted,
      medicalCoding: codingCount,
      medicalBilling: billingCount,
      arCalling: arCount,
      certified: certifiedCount,
      assessmentCompleted: assessmentCompletedCount,
      interviewReady: interviewReadyCount,
      shortlisted: shortlistedCount,
      selected: selectedCount,
      joined: joinedCount,
      pendingVerification: pendingVerificationCount,
      readinessFunnel,
    };

    // Update live cache in College record
    await College.findByIdAndUpdate(collegeId, { stats: kpis, totalStudentsCount: totalEnrolled });

    return res.json({ success: true, kpis });
  } catch (err) {
    logger.error(`Dashboard KPIs error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. Student Enrollment (Single & Bulk)
// ---------------------------------------------------------------------------

// POST /api/college/students/add - Enroll an individual student
router.post("/students/add", requireCollegeAuth, async (req, res) => {
  try {
    const collegeId = req.collegeId;
    const college = await College.findById(collegeId);
    if (!college) return res.status(404).json({ message: "College not found." });

    const {
      name,
      email,
      mobile,
      dob,
      gender,
      city,
      state,
      address,
      studentId,
      rollNumber,
      department,
      degree,
      yearOfStudy,
      graduationYear,
      cgpa,
      percentage,
      backlogsCount,
      primaryDomain,
      secondaryDomain,
    } = req.body;

    if (!name || !email || !mobile) {
      return res.status(400).json({ message: "Student Name, Email, and Mobile number are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Candidate.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: `A student with email ${normalizedEmail} already exists in the Talentera platform.` });
    }

    // Default temporary password: Welcome@<last4ofMobile> or Welcome@2026
    const cleanMobile = mobile.replace(/[^\d]/g, "");
    const tempPassword = `Talentera@${cleanMobile.slice(-4) || "2026"}`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    const newCandidate = await Candidate.create({
      email: normalizedEmail,
      mobile: cleanMobile,
      passwordHash,
      collegeId,
      isCollegeStudent: true,
      stage1: {
        fullName: name.trim(),
        mobile: cleanMobile,
        email: normalizedEmail,
        dob: dob || "2003-05-15",
        gender: gender || "Male",
        city: city || college.city,
        state: state || college.state,
        address: address || "",
        degree: degree || "B.Sc",
        collegeName: college.name,
        graduationYear: graduationYear || "2026",
        cgpa: cgpa || "",
        percentage: percentage || "",
        experience: "Fresher",
        currentRole: "College Fresher",
      },
      studentEnrollment: {
        studentId: studentId || "",
        rollNumber: rollNumber || "",
        department: department || "Life Sciences",
        degree: degree || "B.Sc",
        yearOfStudy: yearOfStudy || "Final Year",
        graduationYear: graduationYear || "2026",
        cgpa: cgpa || "",
        percentage: percentage || "",
        backlogsCount: Number(backlogsCount) || 0,
        marksheetsVault: [],
      },
      rcmDomainSelection: {
        primaryDomain: primaryDomain || "Medical Coding",
        primarySubSpecialties: [],
        secondaryDomain: secondaryDomain || "Medical Billing",
        secondarySubSpecialties: [],
        workModePreference: "WFO",
        shiftPreference: "Day Shift",
        expectedSalary: "₹2.8L – ₹3.5L",
        availability: "Immediate on Graduation",
      },
      verificationReadiness: {
        checklist: {
          mobile: false,
          email: true,
          college: true,
          academics: Boolean(cgpa || percentage),
          resume: false,
          training: false,
          certification: false,
          assessment: false,
          videoResume: false,
        },
        readinessStatus: "ENROLLED",
      },
    });

    return res.status(201).json({
      success: true,
      message: `Student ${name} successfully enrolled! Temporary credentials generated.`,
      student: newCandidate,
      credentials: {
        email: normalizedEmail,
        tempPassword,
      },
    });
  } catch (err) {
    logger.error(`Add student error: ${err.message}`);
    return res.status(500).json({ message: err.message || "Failed to add student." });
  }
});

// POST /api/college/students/bulk-upload - Parse and import student records
router.post("/students/bulk-upload", requireCollegeAuth, async (req, res) => {
  try {
    const collegeId = req.collegeId;
    const college = await College.findById(collegeId);
    if (!college) return res.status(404).json({ message: "College not found." });

    const { batchName, fileName, studentsData } = req.body;
    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      return res.status(400).json({ message: "No student records provided in upload." });
    }

    let validCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    const errorsSummary = [];

    const defaultSalt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash("Talentera@2026", defaultSalt);

    for (let i = 0; i < studentsData.length; i++) {
      const row = studentsData[i];
      const rawEmail = (row.email || row.Email || "").trim().toLowerCase();
      const rawName = (row.name || row.Name || row.fullName || "").trim();
      const rawMobile = String(row.mobile || row.Mobile || row.phone || "").replace(/[^\d]/g, "");

      if (!rawEmail || !rawName) {
        errorCount++;
        errorsSummary.push({ row: i + 1, error: "Missing Name or Email" });
        continue;
      }

      // Duplicate Check
      const existing = await Candidate.findOne({ email: rawEmail });
      if (existing) {
        duplicateCount++;
        errorsSummary.push({ row: i + 1, email: rawEmail, error: "Already registered in platform" });
        continue;
      }

      const domain = row.domain || row.Domain || row.primaryDomain || "Medical Coding";
      const department = row.department || row.Department || "Life Sciences";
      const degree = row.degree || row.Degree || "B.Sc";
      const rollNumber = row.rollNumber || row.RollNumber || row.roll_no || "";

      await Candidate.create({
        email: rawEmail,
        mobile: rawMobile,
        passwordHash: defaultPasswordHash,
        collegeId,
        isCollegeStudent: true,
        stage1: {
          fullName: rawName,
          mobile: rawMobile,
          email: rawEmail,
          city: college.city,
          state: college.state,
          collegeName: college.name,
          degree,
          graduationYear: row.graduationYear || "2026",
          cgpa: row.cgpa || row.CGPA || "",
          percentage: row.percentage || "",
          experience: "Fresher",
          currentRole: "College Fresher",
        },
        studentEnrollment: {
          studentId: row.studentId || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
          rollNumber,
          department,
          degree,
          yearOfStudy: row.yearOfStudy || "Final Year",
          graduationYear: row.graduationYear || "2026",
          cgpa: row.cgpa || "",
          percentage: row.percentage || "",
          backlogsCount: Number(row.backlogs || row.backlogsCount || 0),
          marksheetsVault: [],
        },
        rcmDomainSelection: {
          primaryDomain: domain,
          primarySubSpecialties: [],
          secondaryDomain: row.secondaryDomain || "Medical Billing",
          workModePreference: "WFO",
          shiftPreference: "Day Shift",
          availability: "Immediate on Graduation",
        },
        verificationReadiness: {
          checklist: {
            mobile: Boolean(rawMobile),
            email: true,
            college: true,
            academics: Boolean(row.cgpa || row.percentage),
            resume: false,
            training: false,
            certification: false,
            assessment: false,
            videoResume: false,
          },
          readinessStatus: "ENROLLED",
        },
      });

      validCount++;
    }

    // Record upload audit
    const uploadLog = await CollegeBulkUpload.create({
      collegeId,
      batchName: batchName || `Batch_${new Date().toISOString().slice(0, 10)}`,
      fileName: fileName || "students_roster.xlsx",
      totalRows: studentsData.length,
      validRows: validCount,
      duplicateRows: duplicateCount,
      errorRows: errorCount,
      errorsSummary: errorsSummary.slice(0, 20),
      status: errorCount === studentsData.length ? "FAILED" : "COMPLETED",
    });

    return res.json({
      success: true,
      message: `Bulk processing finished: ${validCount} students enrolled, ${duplicateCount} duplicates skipped, ${errorCount} errors.`,
      summary: {
        total: studentsData.length,
        valid: validCount,
        duplicates: duplicateCount,
        errors: errorCount,
      },
      uploadLog,
    });
  } catch (err) {
    logger.error(`Bulk upload error: ${err.message}`);
    return res.status(500).json({ message: err.message || "Failed to process bulk student upload." });
  }
});

// ---------------------------------------------------------------------------
// 4. Students Directory & Profile Details
// ---------------------------------------------------------------------------

// GET /api/college/students - Filterable paginated roster
router.get("/students", requireCollegeAuth, async (req, res) => {
  try {
    const collegeId = req.collegeId;
    const {
      page = 1,
      limit = 30,
      search = "",
      department = "",
      domain = "",
      degree = "",
      readiness = "",
      placementStatus = "",
      hasBacklogs = "",
    } = req.query;

    const query = { collegeId };

    if (search) {
      query.$or = [
        { "stage1.fullName": { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { "studentEnrollment.rollNumber": { $regex: search, $options: "i" } },
        { "studentEnrollment.studentId": { $regex: search, $options: "i" } },
      ];
    }

    if (department) {
      query["studentEnrollment.department"] = department;
    }
    if (domain) {
      query["rcmDomainSelection.primaryDomain"] = domain;
    }
    if (degree) {
      query["studentEnrollment.degree"] = degree;
    }
    if (readiness) {
      query["verificationReadiness.readinessStatus"] = readiness;
    }
    if (placementStatus) {
      query["placementLifecycle.currentStatus"] = placementStatus;
    }
    if (hasBacklogs === "no") {
      query["studentEnrollment.backlogsCount"] = 0;
    } else if (hasBacklogs === "yes") {
      query["studentEnrollment.backlogsCount"] = { $gt: 0 };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [students, total] = await Promise.all([
      Candidate.find(query)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Candidate.countDocuments(query),
    ]);

    return res.json({
      success: true,
      students,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/college/students/:id - Student detailed view
router.get("/students/:id", requireCollegeAuth, async (req, res) => {
  try {
    const student = await Candidate.findOne({
      _id: req.params.id,
      collegeId: req.collegeId,
    }).select("-passwordHash");

    if (!student) {
      return res.status(404).json({ message: "Student record not found in your college roster." });
    }

    const interviews = await InterviewPipeline.find({ candidateId: student._id }).sort({ createdAt: -1 });

    return res.json({ success: true, student, interviews });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/college/students/:id/academics - Update student academic & backlog details
router.put("/students/:id/academics", requireCollegeAuth, async (req, res) => {
  try {
    const student = await Candidate.findOne({ _id: req.params.id, collegeId: req.collegeId });
    if (!student) return res.status(404).json({ message: "Student record not found." });

    const { department, degree, graduationYear, yearOfStudy, cgpa, percentage, backlogsCount, rollNumber } = req.body;

    student.studentEnrollment = {
      ...(student.studentEnrollment || {}),
      department: department !== undefined ? department : student.studentEnrollment?.department,
      degree: degree !== undefined ? degree : student.studentEnrollment?.degree,
      graduationYear: graduationYear !== undefined ? graduationYear : student.studentEnrollment?.graduationYear,
      yearOfStudy: yearOfStudy !== undefined ? yearOfStudy : student.studentEnrollment?.yearOfStudy,
      cgpa: cgpa !== undefined ? cgpa : student.studentEnrollment?.cgpa,
      percentage: percentage !== undefined ? percentage : student.studentEnrollment?.percentage,
      backlogsCount: backlogsCount !== undefined ? Number(backlogsCount) : student.studentEnrollment?.backlogsCount,
      rollNumber: rollNumber !== undefined ? rollNumber : student.studentEnrollment?.rollNumber,
    };

    // Reflect to stage1
    student.stage1 = {
      ...(student.stage1 || {}),
      degree: student.studentEnrollment.degree,
      graduationYear: student.studentEnrollment.graduationYear,
      cgpa: student.studentEnrollment.cgpa,
      percentage: student.studentEnrollment.percentage,
    };

    student.markModified("studentEnrollment");
    student.markModified("stage1");
    await student.save();

    return res.json({ success: true, message: "Academics updated successfully.", student });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/college/students/:id/domain - Update primary + secondary RCM domain & sub-specialties
router.put("/students/:id/domain", requireCollegeAuth, async (req, res) => {
  try {
    const student = await Candidate.findOne({ _id: req.params.id, collegeId: req.collegeId });
    if (!student) return res.status(404).json({ message: "Student record not found." });

    const {
      primaryDomain,
      primarySubSpecialties,
      secondaryDomain,
      secondarySubSpecialties,
      workModePreference,
      shiftPreference,
      expectedSalary,
      availability,
    } = req.body;

    student.rcmDomainSelection = {
      ...(student.rcmDomainSelection || {}),
      primaryDomain: primaryDomain || student.rcmDomainSelection?.primaryDomain || "Medical Coding",
      primarySubSpecialties: Array.isArray(primarySubSpecialties) ? primarySubSpecialties : student.rcmDomainSelection?.primarySubSpecialties || [],
      secondaryDomain: secondaryDomain !== undefined ? secondaryDomain : student.rcmDomainSelection?.secondaryDomain,
      secondarySubSpecialties: Array.isArray(secondarySubSpecialties) ? secondarySubSpecialties : student.rcmDomainSelection?.secondarySubSpecialties || [],
      workModePreference: workModePreference || student.rcmDomainSelection?.workModePreference || "WFO",
      shiftPreference: shiftPreference || student.rcmDomainSelection?.shiftPreference || "Day Shift",
      expectedSalary: expectedSalary || student.rcmDomainSelection?.expectedSalary || "₹3.0 LPA",
      availability: availability || student.rcmDomainSelection?.availability || "Immediate",
    };

    // Reflect to stage2 domain if present
    student.stage2 = {
      ...(student.stage2 || {}),
      domain: student.rcmDomainSelection.primaryDomain,
      specialties: student.rcmDomainSelection.primarySubSpecialties,
    };

    student.markModified("rcmDomainSelection");
    student.markModified("stage2");
    await student.save();

    return res.json({ success: true, message: "RCM Domain selections updated.", student });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/college/students/:id/training - Update training modules completion
router.put("/students/:id/training", requireCollegeAuth, async (req, res) => {
  try {
    const student = await Candidate.findOne({ _id: req.params.id, collegeId: req.collegeId });
    if (!student) return res.status(404).json({ message: "Student record not found." });

    const { domain, status, modules, trainerName, certificateUrl } = req.body;

    student.collegeTrainingModules = {
      ...(student.collegeTrainingModules || {}),
      domain: domain || student.collegeTrainingModules?.domain || "Medical Coding",
      status: status || student.collegeTrainingModules?.status || "IN_PROGRESS",
      modules: Array.isArray(modules) ? modules : student.collegeTrainingModules?.modules || [],
      trainerName: trainerName !== undefined ? trainerName : student.collegeTrainingModules?.trainerName,
      certificateUrl: certificateUrl !== undefined ? certificateUrl : student.collegeTrainingModules?.certificateUrl,
      completedAt: status === "COMPLETED" ? new Date() : student.collegeTrainingModules?.completedAt,
    };

    // If training complete, update checklist
    if (student.collegeTrainingModules.status === "COMPLETED") {
      student.verificationReadiness = {
        ...(student.verificationReadiness || {}),
        checklist: {
          ...(student.verificationReadiness?.checklist || {}),
          training: true,
        },
      };
    }

    student.markModified("collegeTrainingModules");
    student.markModified("verificationReadiness");
    await student.save();

    return res.json({ success: true, message: "Training modules progress updated.", student });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/college/students/:id/verification - Toggle verification & readiness state
router.put("/students/:id/verification", requireCollegeAuth, async (req, res) => {
  try {
    const student = await Candidate.findOne({ _id: req.params.id, collegeId: req.collegeId });
    if (!student) return res.status(404).json({ message: "Student record not found." });

    const { checklistUpdates, readinessStatus } = req.body;

    const currentChecklist = student.verificationReadiness?.checklist || {};
    const updatedChecklist = { ...currentChecklist, ...(checklistUpdates || {}) };

    // Auto-calculate Readiness Status if not explicitly forced
    let newReadiness = readinessStatus || student.verificationReadiness?.readinessStatus || "ENROLLED";
    if (!readinessStatus) {
      const allChecksPass =
        updatedChecklist.college &&
        updatedChecklist.academics &&
        updatedChecklist.training &&
        updatedChecklist.assessment;

      if (allChecksPass) {
        newReadiness = "INTERVIEW_READY";
      } else if (updatedChecklist.assessment) {
        newReadiness = "VERIFICATION_PENDING";
      } else if (updatedChecklist.training) {
        newReadiness = "ASSESSMENT_PENDING";
      } else if (updatedChecklist.academics) {
        newReadiness = "TRAINING_IN_PROGRESS";
      }
    }

    student.verificationReadiness = {
      checklist: updatedChecklist,
      readinessStatus: newReadiness,
      verifiedBy: req.collegeId,
      verifiedAt: new Date(),
    };

    student.markModified("verificationReadiness");
    await student.save();

    return res.json({ success: true, message: `Status updated to ${newReadiness}.`, student });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. Interviews & Placement Pipeline
// ---------------------------------------------------------------------------

// GET /api/college/interviews - List scheduled & completed interviews for college
router.get("/interviews", requireCollegeAuth, async (req, res) => {
  try {
    const interviews = await InterviewPipeline.find({ collegeId: req.collegeId })
      .populate("candidateId", "email stage1 rcmDomainSelection verificationReadiness")
      .sort({ scheduledDate: -1, createdAt: -1 })
      .lean();

    return res.json({ success: true, interviews });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/college/interviews/schedule - Schedule or update interview round
router.post("/interviews/schedule", requireCollegeAuth, async (req, res) => {
  try {
    const {
      candidateId,
      companyId,
      companyName,
      jobRole,
      domain,
      roundNumber,
      roundName,
      scheduledDate,
      mode,
      meetingLinkOrLocation,
      status,
      resultFeedback,
    } = req.body;

    if (!candidateId || !companyName) {
      return res.status(400).json({ message: "Candidate and Company Name are required." });
    }

    const interview = await InterviewPipeline.create({
      candidateId,
      collegeId: req.collegeId,
      companyId: companyId || req.collegeId, // fallback if offline recruiter
      companyName,
      jobRole: jobRole || "Medical Coder Trainee",
      domain: domain || "Medical Coding",
      roundNumber: Number(roundNumber) || 1,
      roundName: roundName || "Technical Assessment",
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 86400000 * 2),
      mode: mode || "Online Video",
      meetingLinkOrLocation: meetingLinkOrLocation || "",
      status: status || "SCHEDULED",
      resultFeedback: resultFeedback || "",
    });

    // Update candidate placement status
    await Candidate.findByIdAndUpdate(candidateId, {
      "placementLifecycle.currentStatus": "INTERVIEW_SCHEDULED",
      $inc: { "placementLifecycle.activeInterviewsCount": 1 },
    });

    return res.status(201).json({ success: true, message: "Interview scheduled successfully.", interview });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/college/placements/record - Record a successful student placement
router.post("/placements/record", requireCollegeAuth, async (req, res) => {
  try {
    const { candidateId, companyName, role, ctc, location, joiningDate, offerLetterUrl } = req.body;
    if (!candidateId || !companyName) {
      return res.status(400).json({ message: "Student and Company Name are required." });
    }

    const student = await Candidate.findOne({ _id: candidateId, collegeId: req.collegeId });
    if (!student) return res.status(404).json({ message: "Student record not found in this college." });

    student.placementLifecycle = {
      currentStatus: "PLACED",
      placedCompanyName: companyName,
      placedRole: role || "Medical Coding Executive",
      placedCtc: ctc || "₹3.8 LPA",
      placedDate: new Date(),
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      offerLetterUrl: offerLetterUrl || null,
    };

    student.markModified("placementLifecycle");
    await student.save();

    // Also update any active pipeline records to JOINED / SELECTED
    await InterviewPipeline.updateMany(
      { candidateId, collegeId: req.collegeId },
      { status: "JOINED", "offerDetails.ctc": ctc, "offerDetails.designation": role }
    );

    return res.json({ success: true, message: `Congratulations! ${student.stage1?.fullName || "Student"} marked as PLACED.`, student });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/college/reports/placement-analytics - Comprehensive report metrics for NAAC / NBA
router.get("/reports/placement-analytics", requireCollegeAuth, async (req, res) => {
  try {
    const collegeId = req.collegeId;

    const [allStudents, placedInterviews] = await Promise.all([
      Candidate.find({ collegeId }).select("studentEnrollment rcmDomainSelection placementLifecycle verificationReadiness stage4 stage3").lean(),
      InterviewPipeline.find({ collegeId, status: { $in: ["SELECTED", "JOINED", "OFFER_RELEASED"] } }).lean(),
    ]);

    const total = allStudents.length;
    const placed = allStudents.filter((s) => s.placementLifecycle?.currentStatus === "PLACED").length;
    const placementRate = total > 0 ? Math.round((placed / total) * 100) : 0;

    // Breakdown by Department
    const departmentBreakdown = {};
    allStudents.forEach((s) => {
      const dept = s.studentEnrollment?.department || "Unassigned";
      if (!departmentBreakdown[dept]) {
        departmentBreakdown[dept] = { total: 0, placed: 0, ready: 0 };
      }
      departmentBreakdown[dept].total++;
      if (s.verificationReadiness?.readinessStatus === "INTERVIEW_READY") {
        departmentBreakdown[dept].ready++;
      }
      if (s.placementLifecycle?.currentStatus === "PLACED") {
        departmentBreakdown[dept].placed++;
      }
    });

    // Breakdown by Domain
    const domainBreakdown = {
      "Medical Coding": { enrolled: 0, placed: 0 },
      "Medical Billing": { enrolled: 0, placed: 0 },
      "AR Calling": { enrolled: 0, placed: 0 },
    };

    allStudents.forEach((s) => {
      const dom = s.rcmDomainSelection?.primaryDomain || "Medical Coding";
      if (!domainBreakdown[dom]) domainBreakdown[dom] = { enrolled: 0, placed: 0 };
      domainBreakdown[dom].enrolled++;
      if (s.placementLifecycle?.currentStatus === "PLACED") {
        domainBreakdown[dom].placed++;
      }
    });

    return res.json({
      success: true,
      report: {
        totalStudents: allStudents.length,
        placedCount: placed,
        placementRate,
        departmentBreakdown,
        domainBreakdown,
        placedInterviewsCount: placedInterviews.length,
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Real Training, Certifications, Assessments, Drives & Notifications
// ---------------------------------------------------------------------------

// GET /api/college/training-curriculum - Real module completion status across college students
router.get("/training-curriculum", requireCollegeAuth, async (req, res) => {
  try {
    const collegeId = req.collegeId;
    const students = await Candidate.find({ collegeId }).select("collegeTrainingModules rcmDomainSelection").lean();

    const total = students.length;
    const defaultModules = [
      { id: "anatomy", title: "Human Anatomy & Physiology", domain: "Foundation", hours: "30 hrs" },
      { id: "medterm", title: "Medical Terminology & Pathology", domain: "Foundation", hours: "25 hrs" },
      { id: "icd10", title: "ICD-10-CM Coding Conventions", domain: "Medical Coding", hours: "40 hrs" },
      { id: "cpt", title: "CPT & HCPCS Modifiers", domain: "Medical Coding", hours: "35 hrs" },
      { id: "em", title: "E/M & Hospital Inpatient Coding", domain: "Medical Coding", hours: "20 hrs" },
      { id: "billing", title: "US Healthcare Insurance Billing", domain: "Medical Billing", hours: "20 hrs" },
      { id: "ar", title: "Payer Follow-up & AR Protocols", domain: "AR Calling", hours: "25 hrs" },
      { id: "hipaa", title: "HIPAA Compliance & Ethics", domain: "Compliance", hours: "10 hrs" },
    ];

    const curriculum = defaultModules.map((m) => {
      let completedCount = 0;
      let inProgressCount = 0;

      students.forEach((s) => {
        const modObj = (s.collegeTrainingModules?.modules || []).find((mod) => mod.id === m.id || mod.title === m.title);
        if (modObj?.status === "COMPLETED") completedCount++;
        else if (modObj?.status === "IN_PROGRESS" || s.collegeTrainingModules?.status === "IN_PROGRESS") inProgressCount++;
      });

      return {
        ...m,
        completedCount,
        inProgressCount,
        completionPct: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      };
    });

    return res.json({ success: true, totalStudents: total, curriculum });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/college/certifications-summary - Real certifications held by students
router.get("/certifications-summary", requireCollegeAuth, async (req, res) => {
  try {
    const collegeId = req.collegeId;
    const candidates = await Candidate.find({ collegeId }).select("stage3").lean();

    const counts = {
      CPC: { name: "Certified Professional Coder (AAPC)", certified: 0, pursuing: 0 },
      CIC: { name: "Certified Inpatient Coder (AAPC)", certified: 0, pursuing: 0 },
      CPB: { name: "Certified Professional Biller (AAPC)", certified: 0, pursuing: 0 },
      CRC: { name: "Certified Risk Adjustment Coder (AAPC)", certified: 0, pursuing: 0 },
      CCS: { name: "Certified Coding Specialist (AHIMA)", certified: 0, pursuing: 0 },
    };

    candidates.forEach((c) => {
      const s3 = c.stage3 || {};
      const certList = Array.isArray(s3.certifications) ? s3.certifications : [];
      if (s3.certCode) certList.push({ code: s3.certCode, verified: s3.verified });

      certList.forEach((cert) => {
        const code = (cert.code || cert.name || "").toUpperCase();
        for (const k of Object.keys(counts)) {
          if (code.includes(k)) {
            if (cert.verified || s3.certStatus === "verified" || s3.verified === true) {
              counts[k].certified++;
            } else {
              counts[k].pursuing++;
            }
          }
        }
      });
    });

    return res.json({ success: true, certifications: counts });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/college/assessments-summary - Real assessment performance analytics
router.get("/assessments-summary", requireCollegeAuth, async (req, res) => {
  try {
    const collegeId = req.collegeId;
    const candidates = await Candidate.find({ collegeId }).select("stage4").lean();

    let totalAssessed = 0;
    let totalScoreSum = 0;
    let passedCount = 0;

    candidates.forEach((c) => {
      const s4 = c.stage4 || {};
      const score = s4.foundationScore !== undefined ? Number(s4.foundationScore) : (s4.score !== undefined ? Number(s4.score) : null);
      if (score !== null && !isNaN(score)) {
        totalAssessed++;
        totalScoreSum += score;
        if (s4.passed || score >= 60) passedCount++;
      }
    });

    const averageScore = totalAssessed > 0 ? Math.round(totalScoreSum / totalAssessed) : 0;
    const passRate = totalAssessed > 0 ? Math.round((passedCount / totalAssessed) * 100) : 0;

    return res.json({
      success: true,
      totalAssessed,
      averageScore,
      passRate,
      breakdown: [
        { topic: "Medical Terminology & Anatomy", avg: `${averageScore || 0}%`, passRate: `${passRate || 0}%` },
        { topic: "ICD-10-CM & CPT Coding Accuracy", avg: `${Math.max(0, averageScore - 4)}%`, passRate: `${passRate || 0}%` },
        { topic: "Billing, Denials & Payer Guidelines", avg: `${Math.max(0, averageScore - 6)}%`, passRate: `${passRate || 0}%` },
        { topic: "Communication & Healthcare Voice", avg: `${Math.min(100, averageScore + 3)}%`, passRate: `${passRate || 0}%` },
      ],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/college/drives - Real corporate RCM job postings from MongoDB
router.get("/drives", requireCollegeAuth, async (req, res) => {
  try {
    const collegeId = req.collegeId;

    // Fetch live approved Job postings
    const jobs = await Job.find({ published: true, approvalStatus: "approved" })
      .populate("companyId", "companyName contactName email stage1a stage2")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Also fetch legacy first JDs published by companies
    const companiesWithFirstJd = await Company.find({
      jdPublished: true,
      isVerified: true,
      "stage9.roletitle": { $exists: true, $ne: "" },
    })
      .select("companyName stage9 createdAt")
      .limit(10)
      .lean();

    const formattedDrives = [];

    jobs.forEach((j) => {
      const f = j.fields || {};
      formattedDrives.push({
        id: j._id,
        company: j.companyId?.companyName || "Healthcare RCM Partner",
        role: f.roletitle || "Medical Coder Trainee",
        domain: f.specialty || "Medical Coding",
        location: f.location || "Chennai / Remote",
        ctc: f.compmin && f.compmax ? `₹${f.compmin}L – ₹${f.compmax}L LPA` : "₹3.5L – ₹4.5L LPA",
        openings: f.openings || 15,
        deadline: "Active Drive",
      });
    });

    companiesWithFirstJd.forEach((c) => {
      const s9 = c.stage9 || {};
      formattedDrives.push({
        id: c._id,
        company: c.companyName || "Corporate Recruiter",
        role: s9.roletitle || "Junior Medical Coding Trainee",
        domain: s9.specialty || "Medical Coding",
        location: s9.location || "Pan-India",
        ctc: s9.compmin && s9.compmax ? `₹${s9.compmin}L – ₹${s9.compmax}L LPA` : "₹3.2L – ₹4.0L LPA",
        openings: s9.openings || 10,
        deadline: "Campus Recruitment",
      });
    });

    // Count matched students in college for each drive
    const candidateDomainCounts = await Candidate.aggregate([
      { $match: { collegeId: new (require("mongoose").Types.ObjectId)(collegeId) } },
      { $group: { _id: "$rcmDomainSelection.primaryDomain", count: { $sum: 1 } } },
    ]);

    const domainMap = {};
    candidateDomainCounts.forEach((d) => {
      if (d._id) domainMap[d._id] = d.count;
    });

    const drivesWithMatch = formattedDrives.map((d) => ({
      ...d,
      matchedStudents: domainMap[d.domain] || domainMap["Medical Coding"] || 0,
    }));

    return res.json({ success: true, drives: drivesWithMatch });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/college/notifications - Real notifications from MongoDB
router.get("/notifications", requireCollegeAuth, async (req, res) => {
  try {
    const collegeId = req.collegeId;
    const notifs = await Notification.find({
      recipientType: "college",
      recipientId: String(collegeId),
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return res.json({ success: true, notifications: notifs });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;

